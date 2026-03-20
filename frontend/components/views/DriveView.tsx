
import React, { useState } from 'react';
import { 
  FileText, Folder, MoreVertical, Plus, Grid, List as ListIcon, 
  Image, FileSpreadsheet, Presentation, HardDrive, Star, Clock, 
  Trash2, Search, Download, Share2, Sparkles, X, Tag
} from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { Document, Asset } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { useApp } from '../contexts/AppContext';
import { getApiKey } from '../../lib/api-keys';
import { PageLayout } from '../ui/PageLayout';
import { AssetTagsManager } from './AssetTagsManager';

export const DriveView: React.FC = () => {
  const { showToast, documents, assets, updateAssets } = useApp();
  const [activeCategory, setActiveCategory] = useState<'all' | 'starred' | 'recent' | 'trash'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'files' | 'tags'>('files');
  
  // AI Summary State
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Combine docs and assets for the demo logic
  const allFiles: Document[] = [
    ...documents,
    ...assets.map(a => ({
        id: a.id,
        title: a.name,
        type: a.type === 'image' ? 'image' : a.type === 'video' ? 'video' : 'pdf',
        lastModified: a.uploadDate,
        author: 'User',
        size: a.size
    } as Document))
  ];

  // Calculate storage usage
  const parseSize = (sizeStr: string | undefined): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/(\d+\.?\d*)\s*(MB|GB|KB|B)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    switch (unit) {
      case 'GB': return value;
      case 'MB': return value / 1024;
      case 'KB': return value / (1024 * 1024);
      case 'B': return value / (1024 * 1024 * 1024);
      default: return 0;
    }
  };

  const totalStorageGB = 20;
  const usedStorageGB = allFiles
    .filter(f => f.type !== 'folder')
    .reduce((total, file) => total + parseSize(file.size), 0);
  const storagePercentage = Math.min((usedStorageGB / totalStorageGB) * 100, 100);
  
  const formatStorage = (gb: number): string => {
    if (gb < 0.01) return '< 0.01 GB';
    if (gb < 1) return `${(gb * 1024).toFixed(0)} MB`;
    return `${gb.toFixed(2)} GB`;
  };

  const getFileIcon = (type: string) => {
     switch(type) {
        case 'folder': return <Folder className="text-amber-500 fill-amber-100" size={24} />;
        case 'sheet': return <FileSpreadsheet className="text-emerald-500" size={24} />;
        case 'slide': return <Presentation className="text-orange-500" size={24} />;
        case 'image': return <Image className="text-purple-500" size={24} />;
        case 'video': return <div className="bg-pink-500 text-white rounded p-0.5"><div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-0.5"></div></div>;
        default: return <FileText className="text-blue-500" size={24} />;
     }
  };

  const handleSummarize = async (doc: Document) => {
     setIsSummarizing(true);
     setSummary(null);
     showToast('Analyse du document en cours...', 'info');

     try {
        const apiKey = getApiKey('google');
        if (!apiKey) {
          showToast('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.', 'error');
          return;
        }
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Imagine you are analyzing a document named "${doc.title}" of type ${doc.type}. 
        Write a concise 3-bullet point summary of what this document likely contains in a professional context.`;

        const response = await ai.models.generateContent({
           model: 'gemini-3-pro-preview',
           contents: prompt
        });

        if (response.text) {
           setSummary(response.text);
        }
     } catch (e) {
        console.error(e);
        showToast("Impossible de résumer", 'error');
     } finally {
        setIsSummarizing(false);
     }
  };

  return (
    <PageLayout
      header={{
        icon: HardDrive,
        iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        title: "Drive",
        description: "Gestion de fichiers et stockage cloud"
      }}
      sidebar={
        <>
          <div className="flex flex-col gap-1">
            <DriveNavItem label="Mon Drive" icon={HardDrive} active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
            <DriveNavItem label="Récents" icon={Clock} active={activeCategory === 'recent'} onClick={() => setActiveCategory('recent')} />
            <DriveNavItem label="Favoris" icon={Star} active={activeCategory === 'starred'} onClick={() => setActiveCategory('starred')} />
            <DriveNavItem label="Corbeille" icon={Trash2} active={activeCategory === 'trash'} onClick={() => setActiveCategory('trash')} />
            <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
            <DriveNavItem label="Tags & Catégories" icon={Tag} active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} />
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mt-auto">
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
               <span>Stockage</span>
               <span>{storagePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
               <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercentage}%` }}
               ></div>
            </div>
            <p className="text-[10px] text-slate-400">
               {formatStorage(usedStorageGB)} utilisés sur {totalStorageGB} GB
            </p>
          </div>
        </>
      }
      sidebarProps={{
        width: 'w-64'
      }}
      sidebarPosition="left"
    >
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
         
         {/* Toolbar */}
         <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-700/20">
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                <Button 
                   onClick={() => setActiveTab('files')} 
                   variant="ghost" 
                   className={`p-1.5 rounded-md h-auto hover:bg-white dark:hover:bg-slate-600 ${activeTab === 'files' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400'}`}
                >
                  Fichiers
                </Button>
                <Button 
                   onClick={() => setActiveTab('tags')} 
                   variant="ghost" 
                   className={`p-1.5 rounded-md h-auto hover:bg-white dark:hover:bg-slate-600 ${activeTab === 'tags' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400'}`}
                >
                  Tags
                </Button>
              </div>
              {activeTab === 'files' && (
            <div className="w-96">
               <SearchBar placeholder="Rechercher dans Drive..." />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'files' && (
                <>
               <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                  <Button 
                     onClick={() => setViewMode('grid')} 
                     variant="ghost" 
                     className={`p-1.5 rounded-md h-auto hover:bg-white dark:hover:bg-slate-600 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400'}`} 
                     icon={Grid} 
                  />
                  <Button 
                     onClick={() => setViewMode('list')} 
                     variant="ghost" 
                     className={`p-1.5 rounded-md h-auto hover:bg-white dark:hover:bg-slate-600 ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400'}`} 
                     icon={ListIcon} 
                  />
               </div>
               <Button icon={Plus}>Nouveau</Button>
                </>
              )}
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           {activeTab === 'tags' ? (
             <AssetTagsManager
               assets={assets}
               onUpdateAssets={updateAssets}
             />
           ) : (
             <>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Dossiers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 mb-8">
               {allFiles.filter(f => f.type === 'folder').map(folder => (
                  <div key={folder.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all duration-500 cursor-pointer flex items-center gap-3 group">
                     <Folder className="text-amber-400 fill-amber-100" size={24} />
                     <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{folder.title}</span>
                  </div>
               ))}
               {allFiles.filter(f => f.type === 'folder').length === 0 && <p className="col-span-full text-slate-400 text-sm italic">Aucun dossier.</p>}
            </div>

            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Fichiers</h3>
            {viewMode === 'grid' ? (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
                  {allFiles.filter(f => f.type !== 'folder').map(file => (
                     <div key={file.id} className="group relative bg-white dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all duration-500 cursor-pointer flex flex-col aspect-[4/5]">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-500 flex gap-1">
                           <Button 
                              variant="ghost" 
                              onClick={(e) => { e.stopPropagation(); handleSummarize(file); }}
                              className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-full h-auto w-auto" 
                              title="Résumer avec IA"
                           >
                              <Sparkles size={16} />
                           </Button>
                           <Button variant="ghost" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full h-auto w-auto" icon={MoreVertical} />
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 rounded-xl mb-3 border border-slate-50 dark:border-slate-700">
                           {getFileIcon(file.type)}
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate mb-1" title={file.title}>{file.title}</h4>
                           <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>{file.type.toUpperCase()}</span>
                              <span>{file.size || '2 MB'}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium text-xs">
                        <tr>
                           <th className="px-6 py-3">Nom</th>
                           <th className="px-6 py-3">Propriétaire</th>
                           <th className="px-6 py-3">Dernière modif.</th>
                           <th className="px-6 py-3">Taille</th>
                           <th className="px-6 py-3"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {allFiles.filter(f => f.type !== 'folder').map(file => (
                           <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-500 cursor-pointer group">
                              <td className="px-6 py-3 flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center border border-slate-100 dark:border-slate-600">
                                    {getFileIcon(file.type)}
                                 </div>
                                 <span className="font-bold text-slate-700 dark:text-slate-200">{file.title}</span>
                              </td>
                              <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{file.author}</td>
                              <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{file.lastModified}</td>
                              <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{file.size || '2 MB'}</td>
                              <td className="px-6 py-3 text-right opacity-0 group-hover:opacity-100 transition-all duration-500">
                                 <div className="flex justify-end gap-2 text-slate-400">
                                    <Button 
                                       variant="ghost" 
                                       className="hover:text-indigo-600 dark:hover:text-indigo-400 p-1 h-auto" 
                                       icon={Sparkles} 
                                       title="Résumer"
                                       onClick={(e) => { e.stopPropagation(); handleSummarize(file); }}
                                    />
                                    <Button variant="ghost" className="hover:text-indigo-600 dark:hover:text-indigo-400 p-1 h-auto" icon={Download} />
                                    <Button variant="ghost" className="hover:text-indigo-600 dark:hover:text-indigo-400 p-1 h-auto" icon={Share2} />
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
             </>
            )}
         </div>

         {/* AI Summary Panel */}
         {summary && (
            <div className="absolute bottom-6 right-6 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-900 p-6 animate-in slide-in-from-bottom-5 fade-in z-20">
               <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                     <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" /> Résumé IA
                  </h4>
                  <button onClick={() => setSummary(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                     <X size={16} />
                  </button>
               </div>
               <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                  {summary.split('\n').map((line, i) => <p key={i}>{line}</p>)}
               </div>
            </div>
         )}
      </div>
    </PageLayout>
  );
};

const DriveNavItem = ({ label, icon: Icon, active, onClick }: any) => (
   <Button 
      onClick={onClick}
      variant="ghost"
      className={`w-full !justify-start gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-500 ${
         active 
         ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
         : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white'
      }`}
   >
      <Icon size={18} /> {label}
   </Button>
);
