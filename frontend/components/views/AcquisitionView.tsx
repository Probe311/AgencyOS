
import React, { useState } from 'react';
import { 
  Target, MousePointer, DollarSign, TrendingUp, AlertCircle, 
  Play, Pause, RefreshCw, Layers, Megaphone
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { CustomLineChart } from '../charts/CustomLineChart';
import { PageLayout } from '../ui/PageLayout';

export const AcquisitionView: React.FC = () => {
  const { showToast, campaigns } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0);
  const avgRoas = campaigns.length > 0 ? (campaigns.reduce((acc, c) => acc + c.roas, 0) / campaigns.length).toFixed(1) : "0";
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);

  // Placeholder for time-series data if not in DB yet
  const performanceData = [];

  const handleSync = () => {
     setIsSyncing(true);
     setTimeout(() => {
        setIsSyncing(false);
        showToast('Données synchronisées avec les plateformes', 'success');
     }, 1500);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
     e.preventDefault();
     setIsModalOpen(false);
     showToast('Brouillon de campagne créé', 'success');
  };

  return (
    <PageLayout
      header={{
        icon: Megaphone,
        iconBgColor: "bg-purple-100 dark:bg-purple-900/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        title: "Acquisition & Publicités",
        description: "Gérez vos campagnes payantes sur tous les canaux.",
        rightActions: [
          {
            label: isSyncing ? 'Sync...' : 'Sync Données',
            icon: RefreshCw,
            onClick: handleSync,
            variant: 'outline',
            disabled: isSyncing
          },
          {
            label: "Nouvelle Campagne",
            icon: Layers,
            onClick: () => setIsModalOpen(true),
            variant: 'primary'
          }
        ]
      }}
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <AdsCard title="Dépense Totale" value={`$${totalSpent.toLocaleString()}`} icon={DollarSign} />
        <AdsCard title="ROAS Moyen" value={`${avgRoas}x`} icon={TrendingUp} />
        <AdsCard title="Conversions" value={totalConversions} icon={Target} />
        <AdsCard title="Impressions" value={(totalImpressions / 1000).toFixed(1) + 'k'} icon={MousePointer} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-500">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Dépense vs Conversions (7 Jours)</h3>
            <div className="h-80 flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
               {performanceData.length > 0 ? (
                  <CustomLineChart
                    data={performanceData}
                    xAxisKey="date"
                    lines={[
                      { key: 'spend', name: 'Dépense ($)', color: '#6366f1', yAxisId: 'left' },
                      { key: 'conversions', name: 'Conversions', color: '#10b981', yAxisId: 'right' }
                    ]}
                  />
               ) : (
                  <p>Pas assez de données pour afficher le graphique.</p>
               )}
            </div>
         </div>

         <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-500">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Répartition Budget</h3>
             <div className="space-y-6">
                {campaigns.map(c => (
                   <div key={c.id} className="group">
                      <div className="flex justify-between text-sm mb-2">
                         <span className="font-bold text-slate-700 dark:text-slate-300 capitalize flex items-center gap-2">
                            {c.platform === 'google' && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-200 dark:shadow-red-900/50"></span>}
                            {c.platform === 'meta' && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200 dark:shadow-blue-900/50"></span>}
                            {c.platform === 'linkedin' && <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shadow-sm shadow-blue-300 dark:shadow-blue-900/50"></span>}
                            {c.platform === 'tiktok' && <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white shadow-sm"></span>}
                            {c.platform}
                         </span>
                         <span className="text-slate-500 dark:text-slate-400 font-medium">{Math.round((c.budget / (campaigns.reduce((a,b)=>a+b.budget,0) || 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-500 ${
                             c.platform === 'google' ? 'bg-red-500' :
                               c.platform === 'meta' ? 'bg-blue-500' :
                               c.platform === 'linkedin' ? 'bg-blue-700' : 'bg-slate-800 dark:bg-slate-600'
                           }`} 
                           style={{ width: `${(c.budget / 10000) * 100}%` }} 
                         ></div>
                      </div>
                   </div>
                ))}
                {campaigns.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm">Aucune campagne active.</p>}
             </div>
             
             <div className="mt-8 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm shrink-0">
                   <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                   <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Recommandation IA</h4>
                   <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed font-medium">En attente de données suffisantes pour l'analyse.</p>
                </div>
             </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-500 mt-6">
         <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Campagnes Actives</h3>
            <div className="flex gap-2 w-64">
                <SearchBar placeholder="Filtrer..." />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                   <th className="px-6 py-4">Statut</th>
                   <th className="px-6 py-4">Campagne</th>
                   <th className="px-6 py-4">Plateforme</th>
                   <th className="px-6 py-4 text-right">Budget</th>
                   <th className="px-6 py-4 text-right">Dépensé</th>
                   <th className="px-6 py-4 text-right">CTR</th>
                   <th className="px-6 py-4 text-right">CPC</th>
                   <th className="px-6 py-4 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                 {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all duration-500">
                       <td className="px-6 py-4">
                          <button onClick={() => showToast(`Campagne ${c.status === 'Actif' ? 'mise en pause' : 'reprise'}`, 'info')} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-500">
                             {c.status === 'Actif' ? <Pause size={16} className="fill-emerald-500 text-emerald-500" /> : <Play size={16} className="fill-slate-400 dark:fill-slate-500 text-slate-400 dark:text-slate-500" />}
                          </button>
                       </td>
                       <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                       <td className="px-6 py-4 capitalize">
                          <Badge variant="outline" className="rounded-lg">{c.platform}</Badge>
                       </td>
                       <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">${c.budget.toLocaleString()}</td>
                       <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">${c.spent.toLocaleString()}</td>
                       <td className="px-6 py-4 text-right text-slate-900 dark:text-white">{c.ctr}%</td>
                       <td className="px-6 py-4 text-right text-slate-900 dark:text-white">${c.cpc.toFixed(2)}</td>
                       <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg px-2 inline-block">{c.roas}x</td>
                    </tr>
                 ))}
                 {campaigns.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400 dark:text-slate-500">Aucune campagne trouvée.</td></tr>
                 )}
              </tbody>
            </table>
         </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer Nouvelle Campagne">
         <form onSubmit={handleCreateCampaign} className="space-y-4">
            <Input label="Nom Campagne" required />
            <Dropdown 
               label="Plateforme"
               options={[
                  {value: 'google', label: 'Google Ads'},
                  {value: 'meta', label: 'Meta (FB/Insta)'},
                  {value: 'linkedin', label: 'LinkedIn'},
                  {value: 'tiktok', label: 'TikTok'}
               ]}
            />
            <div className="grid grid-cols-2 gap-4">
               <Input label="Budget" type="number" required />
               <Input label="Date Début" type="date" required />
            </div>
            <div className="flex justify-end pt-4">
               <Button type="submit">Lancer Brouillon</Button>
            </div>
         </form>
      </Modal>
    </PageLayout>
  );
};

const AdsCard = ({ title, value, icon: Icon }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-500 group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">{value}</h3>
      </div>
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-500">
        <Icon className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
      </div>
    </div>
  </div>
);
