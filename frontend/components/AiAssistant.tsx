
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Zap, FileText, Database, BrainCircuit } from 'lucide-react';
import { AIChatMessage, ViewState } from '../types';
import { useApp } from './contexts/AppContext';
import { Button } from './ui/Button';
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from '../lib/api-keys';
import { generateUniqueId } from '../lib/utils';

export const AiAssistant: React.FC = () => {
  const { navigate, showToast, openGlobalCreate, tasks, leads, documents, employees, campaigns } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Je suis JARVIS (Connecté au Neural Cloud). Je peux analyser vos projets, générer du contenu ou résumer des documents. Que puis-je faire pour vous ?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- RAG LOGIC: Retrieval Augmented Generation ---
  const retrieveContext = (query: string) => {
    const lowerQuery = query.toLowerCase();
    let contextData = [];

    // Simple keyword matching for RAG
    if (lowerQuery.includes('projet') || lowerQuery.includes('tâche')) {
        contextData.push(`Projects & Tasks Context: ${JSON.stringify(tasks)}`);
    }
    if (lowerQuery.includes('lead') || lowerQuery.includes('vente') || lowerQuery.includes('crm')) {
        contextData.push(`CRM Leads Context: ${JSON.stringify(leads)}`);
    }
    if (lowerQuery.includes('doc') || lowerQuery.includes('fichier') || lowerQuery.includes('brief')) {
        contextData.push(`Documents Context: ${JSON.stringify(documents)}`);
    }
    if (lowerQuery.includes('équipe') || lowerQuery.includes('rh') || lowerQuery.includes('salarié')) {
        contextData.push(`Employees Context: ${JSON.stringify(employees)}`);
    }
    if (lowerQuery.includes('pub') || lowerQuery.includes('campagne') || lowerQuery.includes('ads')) {
        contextData.push(`Ads Campaigns Context: ${JSON.stringify(campaigns)}`);
    }

    return contextData.join('\n\n');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: AIChatMessage = {
      id: generateUniqueId(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // 1. Check for navigation commands (Client-side actions)
      const actionResult = processClientActions(userMsg.content);
      if (actionResult) {
         setTimeout(() => {
            setMessages(prev => [...prev, {
               id: generateUniqueId(),
               role: 'assistant',
               content: actionResult,
               timestamp: new Date()
            }]);
            setIsProcessing(false);
         }, 800);
         return;
      }

      // 2. AI Processing with RAG
      const context = retrieveContext(userMsg.content);
      const systemInstruction = `You are JARVIS, an advanced AI Operating System for a digital agency.
      
      Your goal is to assist the agency manager (Tony) with operations, finance, and project management.
      You have access to the agency's database. Use the provided JSON context to answer questions specifically and accurately.
      
      Tone: Professional, efficient, slightly witty (like JARVIS from Iron Man).
      Format: Use Markdown for lists or emphasis. Keep responses concise.
      
      Current Context Data:
      ${context || "No specific database context found for this query, use general knowledge."}
      `;

      const apiKey = getApiKey('google');
      if (!apiKey) {
         throw new Error('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userMsg.content,
        config: { systemInstruction }
      });

      const aiContent = response.text || "Je n'ai pas pu traiter cette demande.";

      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        role: 'assistant',
        content: "Erreur de connexion au Cerveau Central. Veuillez vérifier votre clé API.",
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processClientActions = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('stats') || lowerText.includes('revenu')) {
       navigate(ViewState.DASHBOARD);
       return "J'ai ouvert votre Tableau de bord. Les dernières statistiques financières sont affichées.";
    }
    if (lowerText.includes('créer') && lowerText.includes('projet')) {
       openGlobalCreate();
       return "Initialisation du protocole de création de projet.";
    }
    // Add more client-side routers here if needed
    return null;
  };

  const suggestions = [
    "Résume les projets en cours",
    "Quel est le lead le plus chaud ?",
    "État des campagnes marketing",
    "Liste les tâches urgentes"
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 z-[60] p-4 !rounded-full shadow-2xl transition-all duration-500 hover:scale-105 flex items-center justify-center h-16 w-16 ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}
      >
        {isOpen ? <X className="text-white" /> : <BrainCircuit className="text-white animate-pulse" />}
      </Button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-8 z-[60] w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-2xl backdrop-blur-sm">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center relative">
            <Bot className="text-indigo-600 w-6 h-6" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">JARVIS <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 rounded border border-indigo-100">PRO</span></h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
               <Database size={10} /> RAG System: <span className="text-emerald-600 font-medium">Online</span>
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200' : 'bg-indigo-600'}`}>
                {msg.role === 'user' ? <User size={16} className="text-slate-600" /> : <Sparkles size={16} className="text-white" />}
              </div>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-none'
              }`}>
                {msg.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                        {line}
                        {i !== msg.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {isProcessing && (
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Sparkles size={16} className="text-white animate-spin" />
               </div>
               <div className="bg-white border border-slate-100 shadow-sm p-3 rounded-2xl rounded-tl-none text-sm text-slate-500 italic flex items-center gap-2">
                  <BrainCircuit size={14} className="animate-pulse text-indigo-500" />
                  Analyse des données en cours...
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
          {/* Action Chips */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
             {suggestions.map(s => (
               <Button 
                 key={s} 
                 onClick={() => { setInput(s); }} 
                 variant="ghost"
                 className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all duration-500 flex items-center gap-1 h-auto"
               >
                 <Zap size={12} className="fill-indigo-700" /> {s}
               </Button>
             ))}
          </div>
          
          <div className="relative flex items-center gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Interrogez le cerveau de l'agence..." 
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
            <Button 
              onClick={handleSend}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-500 disabled:opacity-50 h-auto"
              disabled={!input.trim() || isProcessing}
              icon={Send}
            />
          </div>
        </div>
      </div>
    </>
  );
};
