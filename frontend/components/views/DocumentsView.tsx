
import React from 'react';
import { FileText, Folder, MoreVertical, Plus, Grid, List as ListIcon, Image, FileSpreadsheet, Presentation } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { useApp } from '../contexts/AppContext';
import { PageLayout } from '../ui/PageLayout';

export const DocumentsView: React.FC = () => {
  const { documents, assets } = useApp();
  return (
    <PageLayout
      header={{
        icon: FileText,
        iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        title: "Documents & Assets",
        description: "Base de connaissances et médiathèque centralisée.",
        rightActions: [
          {
            element: (
              <div className="flex gap-3">
                <SearchBar placeholder="Rechercher un fichier..." containerClassName="w-64" />
                <Button icon={Plus}>Nouveau Doc</Button>
              </div>
            )
          }
        ]
      }}
    >

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
         {/* Documents Section */}
         <div className="lg:col-span-2 bg-white rounded-[30px] border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
               <Folder className="text-indigo-500" size={20} /> Documents
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
               {documents.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-slate-400">
                     <p className="text-sm">Aucun document</p>
                  </div>
               ) : (
                  documents.map(doc => (
                  <div key={doc.id} className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-500 cursor-pointer group">
                     <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                           doc.type === 'folder' ? 'bg-amber-100 text-amber-600' :
                           doc.type === 'sheet' ? 'bg-emerald-100 text-emerald-600' :
                           doc.type === 'slide' ? 'bg-orange-100 text-orange-600' :
                           'bg-blue-100 text-blue-600'
                        }`}>
                           {doc.type === 'folder' ? <Folder size={20} /> : 
                            doc.type === 'sheet' ? <FileSpreadsheet size={20} /> :
                            doc.type === 'slide' ? <Presentation size={20} /> :
                            <FileText size={20} />}
                        </div>
                        <MoreVertical size={16} className="text-slate-300 group-hover:text-slate-600" />
                     </div>
                     <h3 className="font-bold text-slate-800 text-sm mb-1 truncate">{doc.title}</h3>
                     <p className="text-[10px] text-slate-400">Modifié {doc.lastModified}</p>
                  </div>
                  ))
               )}
               <div className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-all duration-500">
                  <Plus size={24} className="mb-2" />
                  <span className="text-xs font-bold">Upload</span>
               </div>
            </div>
         </div>

         {/* Assets / Media Section */}
         <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
               <Image className="text-pink-500" size={20} /> Récents Assets
            </h2>
            <div className="space-y-3 overflow-y-auto pr-2">
               {assets.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                     <p className="text-sm">Aucun asset</p>
                  </div>
               ) : (
                  assets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all duration-500 border border-transparent hover:border-slate-100">
                     <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        {asset.type === 'image' ? <img src={asset.url} className="w-full h-full object-cover" /> : 
                         <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">{asset.type}</div>}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-700 text-sm truncate">{asset.name}</h4>
                        <p className="text-[10px] text-slate-400">{asset.size} • {asset.uploadDate}</p>
                     </div>
                  </div>
                  ))
               )}
            </div>
            <Button variant="outline" size="sm" className="mt-4" fullWidth>Voir Médiathèque</Button>
         </div>
      </div>
    </PageLayout>
  );
};
