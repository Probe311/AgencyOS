
import React, { useState } from 'react';
import { Target, Megaphone, Calendar as CalendarIcon, MoreHorizontal, Plus, Zap, Mail, GitBranch, ArrowRight, PlayCircle, Settings, Trash2, Edit3, Image, Type, Magnet, FileCheck, FileText, Download, Filter } from 'lucide-react';
import { ProjectStatus, Priority, Task } from '../../types';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { SearchBar } from '../ui/SearchBar';
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from '../../lib/api-keys';
import { AutomationView } from '../automation/AutomationView';
import { MarketingAnalyticsView } from '../marketing/MarketingAnalyticsView';
import { EmailTemplateManager } from '../marketing/EmailTemplateManager';
import { EmailCampaignsManager } from '../marketing/EmailCampaignsManager';
import { MarketingAutomationManager } from '../marketing/MarketingAutomationManager';
import { FormBuilder } from '../marketing/FormBuilder';
import { PageLayout } from '../ui/PageLayout';

export const MarketingView: React.FC = () => {
  const { showToast, tasks } = useApp();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'funnel' | 'automation' | 'email' | 'lead-magnet' | 'analytics' | 'forms'>('campaigns');
  
  // Lead Magnet State
  const [magnetTopic, setMagnetTopic] = useState('');
  const [magnetType, setMagnetType] = useState('Ebook');
  const [generatedMagnet, setGeneratedMagnet] = useState<{title: string, outline: string} | null>(null);
  const [isGeneratingMagnet, setIsGeneratingMagnet] = useState(false);

  // Reuse existing campaign logic for tab 1
  const marketingTasks = tasks.filter(t => t.department === 'Marketing & RP');

  const handleGenerateMagnet = async () => {
     if (!magnetTopic) return;
     setIsGeneratingMagnet(true);
     try {
        const apiKey = getApiKey('google');
        if (!apiKey) {
          showToast('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.', 'error');
          return;
        }
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Create a Lead Magnet idea for: "${magnetTopic}". Type: ${magnetType}.
        Return JSON with:
        - title (Catchy title)
        - outline (Markdown list of chapters or items)
        `;
        
        const response = await ai.models.generateContent({
           model: 'gemini-3-pro-preview',
           contents: prompt,
           config: { responseMimeType: 'application/json' }
        });

        if (response.text) {
           const data = JSON.parse(response.text);
           setGeneratedMagnet(data);
           showToast('Lead Magnet généré !', 'success');
        }
     } catch (e) {
        showToast('Erreur génération', 'error');
     } finally {
        setIsGeneratingMagnet(false);
     }
  };

  return (
    <PageLayout
      header={{
        icon: Target,
        iconBgColor: "bg-pink-100 dark:bg-pink-900/20",
        iconColor: "text-pink-600 dark:text-pink-400",
        title: "Marketing Suite",
        description: "Automation, Emailing et Campagnes.",
        leftActions: [
          {
            element: (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex gap-1">
           <Button onClick={() => setActiveTab('campaigns')} variant={activeTab === 'campaigns' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'campaigns' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Campagnes</Button>
           <Button onClick={() => setActiveTab('funnel')} variant={activeTab === 'funnel' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'funnel' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Funnel View</Button>
           <Button onClick={() => setActiveTab('automation')} variant={activeTab === 'automation' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'automation' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Automation</Button>
           <Button onClick={() => setActiveTab('email')} variant={activeTab === 'email' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'email' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Email</Button>
           <Button onClick={() => setActiveTab('lead-magnet')} variant={activeTab === 'lead-magnet' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'lead-magnet' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Lead Magnet</Button>
           <Button onClick={() => setActiveTab('forms')} variant={activeTab === 'forms' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'forms' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Formulaires</Button>
           <Button onClick={() => setActiveTab('analytics')} variant={activeTab === 'analytics' ? 'secondary' : 'ghost'} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'analytics' ? '' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Analytics</Button>
        </div>
            )
          }
        ]
      }}
      contentClassName="h-full flex flex-col min-h-0"
    >
      <div className="h-full flex flex-col min-h-0">

      {/* CAMPAIGNS TAB */}
      {activeTab === 'campaigns' && (
         <div className="flex-1 min-h-0 overflow-y-auto">
           <EmailCampaignsManager />
         </div>
      )}

      {/* FUNNEL VIEW TAB */}
      {activeTab === 'funnel' && (
         <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="bg-white dark:bg-slate-800 rounded-[30px] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                     <Filter className="text-indigo-500" size={20} /> Entonnoir de Conversion
                  </h3>
                  
                  <div className="space-y-4">
                     <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                        Aucune donnée de funnel disponible
                     </div>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-800 rounded-[30px] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Santé du Cycle de Vie</h3>
                  <div className="space-y-6">
                     <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                        Aucune donnée disponible
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* AUTOMATION TAB - Unified */}
      {activeTab === 'automation' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <MarketingAutomationManager />
        </div>
      )}

      {/* OLD AUTOMATION TAB - REMOVED */}
      {false && activeTab === 'automation_old' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 bg-slate-900 rounded-[30px] p-8 relative overflow-hidden flex flex-col relative">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               
               {/* Visual Builder */}
               <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                     {/* Trigger Node */}
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border-2 border-emerald-400 w-64 text-center relative z-10">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Trigger</span>
                        <Zap size={24} className="mx-auto text-emerald-500 mb-2" />
                        <p className="font-bold text-slate-800 dark:text-white text-sm">Nouveau Lead CRM</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Source: Site Web</p>
                     </div>
                     
                     <ArrowRight className="rotate-90 text-slate-600 dark:text-slate-400" size={24} />
                     
                     {/* Condition Node */}
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border-2 border-amber-400 w-64 text-center relative z-10">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Condition</span>
                        <GitBranch size={24} className="mx-auto text-amber-500 mb-2" />
                        <p className="font-bold text-slate-800 dark:text-white text-sm">Budget &gt; 10k€ ?</p>
                     </div>

                     <div className="grid grid-cols-2 gap-12 w-full">
                        <div className="flex flex-col items-center gap-4">
                           <div className="h-8 w-px bg-slate-600"></div>
                           <Badge variant="success">OUI</Badge>
                           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border-2 border-indigo-400 w-48 text-center relative z-10">
                              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Action</span>
                              <Mail size={24} className="mx-auto text-indigo-500 mb-2" />
                              <p className="font-bold text-slate-800 dark:text-white text-sm">Email VIP</p>
                           </div>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                           <div className="h-8 w-px bg-slate-600"></div>
                           <Badge variant="default">NON</Badge>
                           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border-2 border-indigo-400 w-48 text-center relative z-10 opacity-70">
                              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Action</span>
                              <Mail size={24} className="mx-auto text-indigo-500 mb-2" />
                              <p className="font-bold text-slate-800 dark:text-white text-sm">Email Standard</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <Button size="sm" icon={PlayCircle} variant="success" className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Activer</Button>
                  <Button size="sm" icon={Settings} variant="secondary">Config</Button>
               </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Scénarios</h3>
                  <Button size="sm" icon={Plus}>Créer</Button>
               </div>
               <div className="space-y-4 overflow-y-auto">
                  {[].length === 0 ? (
                     <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                        <p className="text-sm">Aucune automation configurée</p>
                     </div>
                  ) : null}
               </div>
            </div>
         </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MarketingAnalyticsView />
        </div>
      )}

      {/* LEAD MAGNET TAB */}
      {activeTab === 'lead-magnet' && (
         <div className="flex-1 min-h-0 overflow-y-auto">
           <div className="h-full flex gap-6">
            {/* Generator Form */}
            <div className="w-1/3 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
               <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Magnet className="text-pink-500" /> Générateur Magnet
               </h3>
               <div className="space-y-4 flex-1">
                  <Input 
                     label="Sujet / Niche" 
                     placeholder="ex: Guide SEO pour Dentistes"
                     value={magnetTopic}
                     onChange={(e) => setMagnetTopic(e.target.value)} 
                  />
                  <Dropdown 
                     label="Format" 
                     value={magnetType}
                     onChange={(value) => setMagnetType(value)}
                     options={[
                        {value: 'Ebook', label: 'E-book / Guide PDF'},
                        {value: 'Checklist', label: 'Checklist'},
                        {value: 'Webinar', label: 'Plan de Webinar'},
                        {value: 'EmailCourse', label: 'Cours par Email (5 jours)'}
                     ]}
                  />
                  
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/30 text-xs text-indigo-800 dark:text-indigo-300">
                     <p className="font-bold mb-1">Pourquoi l'IA ?</p>
                     <p>L'IA va générer un titre accrocheur et un plan détaillé pour convertir vos visiteurs en leads.</p>
                  </div>
               </div>
               <Button 
                  fullWidth 
                  icon={Zap} 
                  onClick={handleGenerateMagnet} 
                  isLoading={isGeneratingMagnet}
                  disabled={!magnetTopic}
               >
                  {isGeneratingMagnet ? 'Création...' : 'Générer le Magnet'}
               </Button>
            </div>

            {/* Result Preview */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 p-8 relative overflow-hidden">
               {!generatedMagnet ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                     <Magnet size={64} className="mb-4 opacity-20" />
                     <p>En attente de génération...</p>
                  </div>
               ) : (
                  <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
                     <div className="flex justify-between items-start mb-6">
                        <Badge variant="success" className="mb-2">Généré par IA</Badge>
                        <div className="flex gap-2">
                           <Button size="sm" variant="ghost" icon={Edit3}>Éditer</Button>
                           <Button size="sm" icon={Download}>Exporter PDF</Button>
                        </div>
                     </div>
                     
                     <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
                        {generatedMagnet.title}
                     </h2>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                        <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                           {generatedMagnet.outline}
                        </div>
                     </div>
                  </div>
               )}
            </div>
           </div>
         </div>
      )}

      {/* EMAIL TAB */}
      {activeTab === 'email' && (
         <div className="flex-1 min-h-0 overflow-y-auto">
           <EmailTemplateManager />
         </div>
      )}

      {/* FORMS TAB */}
      {activeTab === 'forms' && (
         <div className="flex-1 min-h-0 overflow-y-auto">
           <FormBuilder />
         </div>
      )}

    </div>
    </PageLayout>
  );
};
