
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import DiagnosisResult from './DiagnosisResult';
import { Phone, MapPin, User, Bot, Play, Building2, Navigation } from 'lucide-react';

interface Props {
  message: ChatMessageType;
  onViewReport: (diagnosis: any, image: string | undefined) => void;
  onLocationSubmit?: (location: string) => void;
}

const ChatMessage: React.FC<Props> = ({ message, onViewReport, onLocationSubmit }) => {
  const [locationText, setLocationText] = useState('');
  const isUser = message.role === 'user';
  
  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-fade-in">
        <div className="max-w-[85%] bg-green-100 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm border border-green-200">
           {message.content.imageUri && (
             <img src={message.content.imageUri} alt="User upload" className="w-full h-40 object-cover rounded-lg mb-2 border border-green-200" />
           )}
           {message.content.audioUri && (
             <div className="flex items-center gap-2 text-green-800 text-sm italic mb-1">
               <Play size={14} className="fill-green-800" /> Audio Message Sent
             </div>
           )}
           {message.content.text && (
             <p className="text-green-900 whitespace-pre-wrap">{message.content.text}</p>
           )}
        </div>
        <div className="w-8 h-8 ml-2 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-green-700" />
        </div>
      </div>
    );
  }

  const response = message.content.botResponse;
  if (!response) return null;

  const handleGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        onLocationSubmit?.(`${pos.coords.latitude}, ${pos.coords.longitude}`);
      }, () => {
        alert("Location permission denied. Please type your city.");
      });
    }
  };

  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="w-8 h-8 mr-2 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-slate-600" />
      </div>
      
      <div className="max-w-[90%] space-y-3">
        <div className="bg-white rounded-2xl rounded-tl-none px-5 py-4 shadow-sm border border-slate-100 text-slate-800 whitespace-pre-wrap">
          {response.text_response}
        </div>

        {response.type === 'ASK_LOCATION_FOR_EXPERTS' && (
          <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-lg space-y-4 animate-reveal">
            <div className="flex items-center gap-3 text-amber-600">
              <MapPin size={20} />
              <p className="text-sm font-black uppercase tracking-widest">Location Required</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleGpsLocation}
                className="flex items-center justify-center gap-2 bg-emerald-700 text-white py-3 rounded-xl font-black text-xs hover:bg-emerald-800 transition-all active:scale-95 shadow-md"
              >
                <Navigation size={16} /> USE MY GPS LOCATION
              </button>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="Or type city/village..."
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={() => locationText.trim() && onLocationSubmit?.(locationText)}
                  className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-xs hover:bg-black transition-all"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {response.type === 'DIAGNOSIS' && response.diagnosis_data && (
           <div className="w-full relative">
             <DiagnosisResult 
               data={response.diagnosis_data}
               onFindExperts={() => {}} 
               onViewReport={() => onViewReport(response.diagnosis_data, message.content.imageUri)} 
               onReset={() => {}} 
               isCompact={true}
             />
           </div>
        )}

        {response.type === 'EXPERT_LIST' && response.experts_data && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
             <div className="bg-emerald-700 p-5 text-white">
               <h4 className="font-black text-lg flex items-center gap-2 tracking-tight">
                 <Building2 size={20} className="text-lime-400" /> Local Help Centers
               </h4>
               <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100/60 mt-1">Verified Agricultural Hubs</p>
             </div>
             <div className="divide-y divide-slate-100">
               {response.experts_data.map((expert, idx) => (
                 <div key={idx} className="p-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                         <p className="font-black text-slate-900 text-lg leading-tight">{expert.name}</p>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded text-slate-500">{expert.type}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{expert.role}</span>
                         </div>
                      </div>
                      <a 
                        href={`tel:${expert.contact}`} 
                        className="bg-emerald-100 text-emerald-700 p-3 rounded-2xl hover:bg-emerald-700 hover:text-white transition-all shadow-sm active:scale-90"
                      >
                        <Phone size={20} />
                      </a>
                    </div>
                    
                    <div className="space-y-2">
                       <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                          <MapPin size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-bold leading-tight">{expert.address}</p>
                       </div>
                       <div className="flex items-center gap-2 text-emerald-700 px-3 font-black text-sm">
                          <Phone size={14} />
                          {expert.contact}
                       </div>
                    </div>
                 </div>
               ))}
             </div>
             <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Centers found for your area</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
