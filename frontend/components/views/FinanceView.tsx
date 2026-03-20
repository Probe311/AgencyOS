
import React, { useState } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, FileText, Download, Plus, ShoppingBag, FilePlus, 
  MoreHorizontal, Check, RefreshCcw, Package, Printer, X, Wallet
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useApp } from '../contexts/AppContext';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';
import { QuotesList } from '../quotes/QuotesList';
import { InvoicesList } from '../invoices/InvoicesList';
import { PageLayout } from '../ui/PageLayout';

export const FinanceView: React.FC = () => {
  const { showToast, financeStats } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'invoices' | 'products'>('overview');
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Dynamic Chart Data - Empty if no data
  const pieData: Array<{ name: string; value: number }> = [];
    
  const COLORS = ['#6366f1', '#f43f5e', '#fbbf24', '#cbd5e1'];

  const handleGeneratePdf = () => {
     setIsPdfPreviewOpen(true);
  };

  return (
    <PageLayout
      header={{
        icon: Wallet,
        iconBgColor: "bg-emerald-100 dark:bg-emerald-900/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        title: "Finance & Comptabilité",
        description: "Gestion commerciale, facturation et trésorerie.",
        rightActions: [
          ...(activeTab === 'invoices' ? [{
            label: "Export Comptable",
            icon: Download,
            onClick: handleGeneratePdf,
            variant: 'outline' as const
          }] : []),
          ...(activeTab === 'products' ? [{
            label: "Ajouter Produit",
            icon: Plus,
            onClick: () => console.log('Ajouter produit'),
            variant: 'primary' as const
          }] : [])
        ]
      }}
    >
      <div className="space-y-6 flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'overview' ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Vue d'ensemble</button>
            <button onClick={() => setActiveTab('quotes')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'quotes' ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Devis</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'invoices' ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Factures</button>
            <button onClick={() => setActiveTab('products')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'products' ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Produits</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
         {activeTab === 'overview' && (
            <div className="space-y-6">
               {/* Summary Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FinanceCard 
                     title="Profit Net (YTD)" 
                     amount={`$${financeStats.reduce((a,b)=>a+b.profit,0).toLocaleString()}`}
                  />
                  <FinanceCard 
                     title="Dépenses Totales" 
                     amount={`$${financeStats.reduce((a,b)=>a+b.expenses,0).toLocaleString()}`}
                  />
                  <FinanceCard title="Factures en Attente" amount="$0" subtext="0 Factures" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Profitability Chart */}
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-500">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Profit vs Dépenses</h3>
                    <div className="h-80">
                      <CustomBarChart
                        data={financeStats}
                        xAxisKey="month"
                        bars={[
                          { key: 'profit', name: 'Profit Net', color: '#6366f1', stackId: 'a' },
                          { key: 'expenses', name: 'Dépenses', color: '#e2e8f0', stackId: 'a' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col hover:shadow-md transition-all duration-500">
                     <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">Répartition des Dépenses</h3>
                     {pieData.length > 0 ? (
                        <div className="flex-1 flex items-center justify-center relative">
                           <div className="w-full h-64">
                              <CustomPieChart
                                 data={pieData}
                                 colors={COLORS}
                                 innerRadius={70}
                                 outerRadius={90}
                              />
                           </div>
                           <div className="absolute bottom-0 w-full flex justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {pieData.map((item, idx) => (
                                <div key={item.name} className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx]}}></div>
                                  {item.name}
                                </div>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">Pas de données</div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'products' && <ProductCatalog />}
         {activeTab === 'quotes' && <QuotesList />}
         {activeTab === 'invoices' && <InvoicesList onGeneratePdf={handleGeneratePdf} />}
        </div>
      </div>


      {/* PDF Preview Modal */}
      {isPdfPreviewOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
               <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><FileText size={18} /> Prévisualisation PDF</h3>
                  <div className="flex gap-2">
                     <Button variant="secondary" icon={Printer} onClick={() => { window.print(); }}>Imprimer</Button>
                     <Button variant="primary" icon={Download} onClick={() => { setIsPdfPreviewOpen(false); showToast('PDF Téléchargé', 'success'); }}>Télécharger</Button>
                     <button onClick={() => setIsPdfPreviewOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all duration-500"><X size={20} className="text-slate-700 dark:text-slate-300" /></button>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-8 flex justify-center">
                  <div className="w-[210mm] min-h-[297mm] bg-white dark:bg-slate-800 shadow-lg p-16 flex flex-col text-slate-800 dark:text-slate-200">
                     {/* PDF Content */}
                     <div className="flex justify-between mb-12">
                        <div>
                           <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">AgencyOS</div>
                           <p className="text-sm text-slate-500 dark:text-slate-400">123 Silicon Valley Blvd</p>
                           <p className="text-sm text-slate-500 dark:text-slate-400">San Francisco, CA 94107</p>
                        </div>
                        <div className="text-right">
                           <h1 className="text-4xl font-bold text-slate-200 dark:text-slate-300 uppercase mb-2">Facture</h1>
                           <p className="font-bold">-</p>
                           <p className="text-sm text-slate-500 dark:text-slate-400">Date: {new Date().toLocaleDateString()}</p>
                        </div>
                     </div>

                     <div className="mb-12">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Facturé à</h3>
                        <p className="font-bold text-lg">-</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">-</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">-</p>
                     </div>

                     <table className="w-full mb-8">
                        <thead>
                           <tr className="border-b-2 border-slate-100 dark:border-slate-700">
                              <th className="text-left py-3 font-bold text-sm text-slate-800 dark:text-slate-200">Description</th>
                              <th className="text-right py-3 font-bold text-sm w-24 text-slate-800 dark:text-slate-200">Qté</th>
                              <th className="text-right py-3 font-bold text-sm w-32 text-slate-800 dark:text-slate-200">Prix U.</th>
                              <th className="text-right py-3 font-bold text-sm w-32 text-slate-800 dark:text-slate-200">Total</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr className="border-b border-slate-50 dark:border-slate-800">
                              <td className="py-4 text-sm">-</td>
                              <td className="py-4 text-right text-sm">-</td>
                              <td className="py-4 text-right text-sm">-</td>
                              <td className="py-4 text-right text-sm font-medium">-</td>
                           </tr>
                        </tbody>
                     </table>

                     <div className="mt-auto pt-12 text-center text-xs text-slate-400 dark:text-slate-500">
                        <p>Merci de votre confiance. Paiement dû sous 30 jours.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </PageLayout>
  );
};

const FinanceCard = ({ title, amount, subtext }: any) => (
  <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-500 group">
     <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide">{title}</p>
     <div className="mt-4 flex items-baseline gap-3">
        <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{amount}</h3>
     </div>
     <div className="mt-4 flex items-center text-sm">
        {subtext && <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">{subtext}</span>}
     </div>
  </div>
);

// Empty State Lists for now - would need DB tables 'products', 'quotes', 'invoices'
const ProductCatalog = () => (
   <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm p-8 text-center text-slate-400 dark:text-slate-500">
      <Package size={48} className="mx-auto mb-4 opacity-20" />
      <p>Aucun produit dans le catalogue.</p>
   </div>
);
