
import React, { useState } from 'react';
import { 
  Radio, TrendingUp, Globe, AlertCircle, MessageSquare, 
  Share2, ThumbsUp, ThumbsDown, Filter, Download, Sparkles, RefreshCw
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { CustomPieChart } from '../charts/CustomPieChart';
import { useApp } from '../contexts/AppContext';
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from '../../lib/api-keys';
import { PageLayout } from '../ui/PageLayout';

export const ListeningView: React.FC = () => {
  const { showToast, listeningAlerts } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sentimentData, setSentimentData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [mentionsFeed, setMentionsFeed] = useState<any[]>([]); 
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  const handleAnalyzeSentiment = async () => {
     setIsAnalyzing(true);
     showToast('Analyse IA des mentions en cours...', 'info');

     try {
        const apiKey = getApiKey('google');
        if (!apiKey) {
          showToast('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.', 'error');
          return;
        }
        const ai = new GoogleGenAI({ apiKey });
        const mentionsText = mentionsFeed.map(m => m.content).join('\n');
        
        const systemInstruction = `You are a Sentiment Analysis Engine. Analyze the following social media mentions. 
        1. Classify sentiment as Positive, Neutral, or Negative for the batch.
        2. Provide a JSON object with percentages for each sentiment.
        3. Identify any PR crisis risks.`;

        const response = await ai.models.generateContent({
           model: 'gemini-3-pro-preview',
           contents: `Analyze these mentions:\n${mentionsText || "No mentions found."}`,
           config: { systemInstruction, responseMimeType: 'application/json' }
        });

        if (response.text) {
           const result = JSON.parse(response.text);
           if (result.percentages && (result.percentages.positive || result.percentages.neutral || result.percentages.negative)) {
              setSentimentData([
                 { name: 'Positif', value: result.percentages.positive || 0, color: '#10b981' },
                 { name: 'Neutre', value: result.percentages.neutral || 0, color: '#94a3b8' },
                 { name: 'Négatif', value: result.percentages.negative || 0, color: '#f43f5e' }
              ]);
           }
           setAiAnalysisResult(result.risk_analysis || null);
           showToast('Analyse de sentiment mise à jour', 'success');
        }
     } catch (error) {
        console.error(error);
        showToast('Erreur lors de l\'analyse IA', 'error');
     } finally {
        setIsAnalyzing(false);
     }
  };

  return (
    <PageLayout
      header={{
        icon: Radio,
        iconBgColor: "bg-orange-100 dark:bg-orange-900/20",
        iconColor: "text-orange-600 dark:text-orange-400",
        title: "Veille & E-Réputation",
        description: "Surveillez votre image de marque en temps réel.",
        rightActions: [
          {
            label: isAnalyzing ? 'Analyse...' : 'Rafraîchir IA',
            icon: RefreshCw,
            onClick: handleAnalyzeSentiment,
            variant: 'outline',
            disabled: isAnalyzing
          },
          {
            label: "Rapport",
            icon: Download,
            onClick: () => {},
            variant: 'outline'
          }
        ]
      }}
      contentClassName="h-full flex flex-col min-h-0"
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
        {/* Recherche */}
        <div className="shrink-0">
           <SearchBar placeholder="Ajouter mot-clé..." containerClassName="w-64" />
      </div>

      {/* Keywords Tracked */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
         {listeningAlerts.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-[25px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-500">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <h3 className="font-bold text-slate-800 dark:text-white">{item.keyword}</h3>
                     {item.trend === 'up' && <TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{item.mentions.toLocaleString()}</span>
                     <Badge variant={item.sentiment === 'positive' ? 'success' : item.sentiment === 'negative' ? 'danger' : 'default'}>
                        {item.sentiment}
                     </Badge>
                  </div>
               </div>
               <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                  <Radio size={24} />
               </div>
            </div>
         ))}
         {listeningAlerts.length === 0 && (
            <div className="col-span-3 text-center text-slate-400 dark:text-slate-500 py-4">Aucun mot-clé surveillé.</div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
         {/* Mentions Feed */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquare size={18} /> Flux de Mentions</h3>
               <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 h-auto" icon={Filter} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {mentionsFeed.map(mention => (
                  <div key={mention.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all duration-500">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                           <span className={`p-1.5 rounded-lg text-white ${
                              mention.source === 'twitter' ? 'bg-sky-500' : 
                              mention.source === 'facebook' ? 'bg-blue-600' :
                              mention.source === 'linkedin' ? 'bg-blue-700' : 'bg-rose-500'
                           }`}>
                              {mention.source === 'twitter' ? <Share2 size={12} /> : <Globe size={12} />}
                           </span>
                           <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{mention.author}</span>
                           <span className="text-[10px] text-slate-400 dark:text-slate-500">{mention.date}</span>
                        </div>
                        <Badge variant={mention.sentiment === 'positive' ? 'success' : 'danger'}>{mention.sentiment}</Badge>
                     </div>
                     <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{mention.content}</p>
                     <div className="flex gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500 font-bold">
                        <span className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"><ThumbsUp size={12} /> Like</span>
                        <span className="flex items-center gap-1 cursor-pointer hover:text-rose-600 dark:hover:text-rose-400"><ThumbsDown size={12} /> Dislike</span>
                        <span className="flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"><Share2 size={12} /> Share</span>
                     </div>
                  </div>
               ))}
               {mentionsFeed.length === 0 && (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">Aucune mention récente détectée.</div>
               )}
            </div>
         </div>

         {/* Sentiment Chart */}
         <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Sentiment Global</h3>
            <div className="flex-1 flex items-center justify-center relative">
               {sentimentData.length > 0 ? (
                  <>
                     <div className="w-full h-48">
                        <CustomPieChart data={sentimentData} innerRadius={50} outerRadius={70} />
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                           <span className="text-2xl font-bold text-slate-800 dark:text-white">
                              {sentimentData.find(s => s.name === 'Positif')?.value || 0}%
                           </span>
                           <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Positif</p>
                        </div>
                     </div>
                  </>
               ) : (
                  <div className="text-center text-slate-400 dark:text-slate-500">
                     <p className="text-sm">Aucune donnée de sentiment</p>
                     <p className="text-xs mt-1">Lancez une analyse pour voir les résultats</p>
                  </div>
               )}
            </div>
            {aiAnalysisResult && (
               <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 mb-2"><Sparkles size={12} /> Analyse IA</h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">{aiAnalysisResult}</p>
               </div>
            )}
         </div>
      </div>
        </div>
      </div>
    </PageLayout>
  );
};
