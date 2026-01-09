
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { KISAN_SYSTEM_INSTRUCTION } from "../constants";
import { BotResponse, ChatMessage, WeatherData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const mainSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { 
      type: Type.STRING, 
      enum: ["CONVERSATION", "DIAGNOSIS", "WEATHER_DATA", "ASK_LOCATION_FOR_EXPERTS", "EXPERT_LIST"] 
    },
    text_response: { type: Type.STRING },
    diagnosis_data: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        disease_name: { type: Type.STRING },
        confidence: { type: Type.STRING, enum: ["HIGH", "LOW"] },
        crop_detected: { type: Type.STRING },
        explanation: { type: Type.STRING },
        treatment_steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must contain at least 3 distinct steps." },
        prevention_tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must contain at least 2 long-term prevention strategies. Cannot be empty." }
      },
      required: ["disease_name", "confidence", "crop_detected", "explanation", "treatment_steps", "prevention_tips"]
    },
    experts_data: {
      type: Type.ARRAY,
      nullable: true,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          contact: { type: Type.STRING },
          address: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["GOVT", "PRIVATE", "NGO"] }
        },
        required: ["name", "role", "contact", "address", "type"]
      }
    }
  },
  required: ["type", "text_response"]
};

export const sendChatMessage = async (
  history: ChatMessage[],
  image: string | null,
  audio: string | null,
  text: string,
  selectedLanguage: string
): Promise<BotResponse> => {
  try {
    const parts: any[] = [];
    let prompt = `System Mode: Expert Consultant.\nLanguage: ${selectedLanguage}.\nFarmer Input: ${text || "[Image Probe]"}`;

    if (image) {
      const base64Data = image.split(',')[1] || image;
      parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
      
      prompt += `\n\n[DIAGNOSIS PROTOCOL]:
      1. Identify the exact plant species and analyze strictly for any pathologies (disease, pests, deficiency).
      2. If the plant is healthy, state "Healthy [Plant Name]".
      3. Translate ALL fields (disease_name, explanation, treatment_steps, prevention_tips) into ${selectedLanguage}.
      4. MANDATORY: You MUST provide at least 2 practical prevention_tips for the farmer. DO NOT leave the prevention_tips array empty.`;
    } else {
      prompt += `\n\n[CONVERSATION PROTOCOL]: 
      - If user asks for local help/experts/centers AND hasn't specified a city/location, you MUST return type: "ASK_LOCATION_FOR_EXPERTS" and ask them where they are located in ${selectedLanguage}.
      - If user provides a location, return type: "EXPERT_LIST" with realistic centers in that area.
      - Otherwise, respond politely in ${selectedLanguage}.`;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: { parts },
      config: {
        systemInstruction: KISAN_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: mainSchema,
        temperature: 0.2, // Slightly increased for creative analysis of unknown plants
      }
    });

    const data = JSON.parse(response.text || "{}") as BotResponse;
    
    if (data.diagnosis_data?.disease_name) {
        data.diagnosis_data = {
            ...data.diagnosis_data,
            is_safe_organic: data.diagnosis_data.treatment_steps?.some(s => s.toLowerCase().includes('organic') || s.toLowerCase().includes('neem')) || false,
            model_engine: "GEMINI_VISION", // Updated to reflect general vision capability
            dataset_ref: "Global-Agri-Database-Live"
        };
        
        // Final fallback to ensure non-empty tips if AI hallucinated an empty array
        if (!data.diagnosis_data.prevention_tips || data.diagnosis_data.prevention_tips.length === 0) {
            data.diagnosis_data.prevention_tips = [
                "Use clean, certified seeds and tools.",
                "Maintain proper field hygiene and drainage."
            ];
        }
    }

    return data;
  } catch (error) {
    console.error("Diagnostic Algorithm Error:", error);
    return {
      type: "CONVERSATION",
      text_response: "System Timeout. Please check your connection."
    };
  }
};

export const getWeatherForecast = async (
  location: { lat?: number; lng?: number; query?: string },
  language: string
): Promise<WeatherData> => {
  try {
    const locStr = location.query || `${location.lat}, ${location.lng}`;
    const weatherAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await weatherAi.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Weather for ${locStr} in ${language}. Return JSON.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            location: { type: Type.STRING },
            current_temp: { type: Type.STRING },
            condition: { type: Type.STRING },
            humidity: { type: Type.STRING },
            wind_speed: { type: Type.STRING },
            precipitation: { type: Type.STRING },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  temp: { type: Type.STRING },
                  condition: { type: Type.STRING }
                },
                required: ["day", "temp", "condition"]
              }
            },
            agri_advice: { type: Type.STRING }
          },
          required: ["location", "current_temp", "condition", "humidity", "wind_speed", "precipitation", "forecast", "agri_advice"]
        }
      }
    });
    const data = JSON.parse(response.text || "{}") as WeatherData;
    data.map_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`;
    return data;
  } catch (error) {
    return {
      location: "Unknown", current_temp: "--", condition: "Error", humidity: "--", wind_speed: "--",
      precipitation: "--", forecast: [], agri_advice: "Check connection.", map_url: ""
    };
  }
};
