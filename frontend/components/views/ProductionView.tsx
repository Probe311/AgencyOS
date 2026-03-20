
import React, { useState } from 'react';
import { 
  Clock, TrendingUp, AlertTriangle, CheckCircle, 
  Users, DollarSign, Calendar, MoreHorizontal, ArrowRight, Plus, Timer, Factory
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { CustomPieChart } from '../charts/CustomPieChart';
import { PageLayout } from '../ui/PageLayout';

export const ProductionView: React.FC = () => {
  const { showToast, productionProjects, employees } = useApp();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

  // Stats Calculation
  const totalSold = productionProjects.reduce((acc, p) => acc + p.soldHours, 0);
  const totalSpent = productionProjects.reduce((acc, p) => acc + p.spentHours, 0);
  const avgMargin = productionProjects.length > 0 ? Math.round(
    productionProjects.reduce((acc, p) => acc + ((p.budget - p.cost) / p.budget) * 100, 0) / productionProjects.length
  ) : 0;
  
  // Dynamic Utilization based on Employee Status
  const activeEmployees = employees.filter(e => e.status === 'Actif').length;
  const missionEmployees = employees.filter(e => e.status === 'En mission').length;
  const totalEmployees = employees.length || 1; // Avoid divide by zero

  const utilizationData = employees.length > 0 ? [
    { name: 'En Mission', value: Math.round((missionEmployees / totalEmployees) * 100) },
    { name: 'Disponible', value: Math.round((activeEmployees / totalEmployees) * 100) },
    { name: 'Autre', value: Math.round(((totalEmployees - activeEmployees - missionEmployees) / totalEmployees) * 100) },
  ] : [
     { name: 'Disponible', value: 100 } // Default state
  ];

  const COLORS = ['#6366f1', '#10b981', '#cbd5e1'];

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProjectModalOpen(false);
    showToast('Projet créé avec succès', 'success');
  };

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTimeModalOpen(false);
    showToast('Temps enregistré', 'success');
  };

  return (
    <PageLayout
      header={{
        icon: Factory,
        iconBgColor: "bg-slate-100 dark:bg-slate-900/20",
        iconColor: "text-slate-600 dark:text-slate-400",
        title: "Production",
        description: "Efficacité opérationnelle & rentabilité.",
        rightActions: [
          {
            label: "Log Temps",
            icon: Timer,
            onClick: () => setIsTimeModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Nouveau Projet",
            icon: Plus,
            onClick: () => setIsProjectModalOpen(true),
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="space-y-6">

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* Card 1: Global Margin */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-500">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-10 -mt-10 blur-3xl group-hover:scale-110 transition-all duration-500"></div>
           <div>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                 Marge Moy.
              </p>
              <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-3">{avgMargin}%</h3>
           </div>
        </div>

        {/* Card 2: Time Efficiency */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-6 flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-all duration-500">
           <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-700">
              <div className="h-full bg-indigo-600 rounded-r-full" style={{ width: totalSold > 0 ? `${(totalSpent/totalSold)*100}%` : '0%' }}></div>
           </div>
           <div>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                 Ratio Temps
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
                {totalSpent} <span className="text-lg text-slate-400 font-bold">/ {totalSold} h</span>
              </h3>
           </div>
           <p className="text-xs text-slate-400 mt-2 font-medium">Heures dépensées vs vendues.</p>
        </div>

        {/* Card 3: Resource Utilization */}
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-6 flex items-center justify-between hover:shadow-md transition-all duration-500">
           <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Utilisation Ressources</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Répartition de la capacité.</p>
              <div className="space-y-3">
                 {utilizationData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-3 text-sm">
                       <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i] }}></div>
                       <span className="text-slate-600 dark:text-slate-300 font-bold w-20">{d.name}</span>
                       <span className="text-slate-900 dark:text-white font-extrabold">{d.value}%</span>
                    </div>
                 ))}
              </div>
           </div>
           <div className="h-40 w-40 relative">
             <CustomPieChart
                data={utilizationData}
                colors={COLORS}
                innerRadius={35}
                outerRadius={55}
                height="100%"
             />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Users size={24} className="text-slate-300 dark:text-slate-600" />
             </div>
           </div>
        </div>

        {/* Card 4: Project Profitability Table */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] overflow-hidden flex flex-col hover:shadow-md transition-all duration-500">
           <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Rentabilité Projet</h3>
              <button className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-all duration-500">
                 Rapport <ArrowRight size={14} />
              </button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">
                    <tr>
                       <th className="px-8 py-4">Projet</th>
                       <th className="px-6 py-4">Temps</th>
                       <th className="px-6 py-4">Budget</th>
                       <th className="px-6 py-4">Coût</th>
                       <th className="px-6 py-4 text-right">Marge</th>
                       <th className="px-6 py-4 text-right">Équipe</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100/50 dark:divide-slate-700/50">
                    {productionProjects.map(project => {
                       const margin = ((project.budget - project.cost) / project.budget) * 100;
                       const timePercent = (project.spentHours / project.soldHours) * 100;
                       
                       return (
                          <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-500">
                             <td className="px-8 py-5">
                                <div className="font-bold text-slate-900 dark:text-white">{project.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{project.client}</div>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex items-center gap-2 mb-1.5">
                                   <span className="font-bold text-slate-700 dark:text-slate-200">{project.spentHours}h</span>
                                   <span className="text-slate-400 font-medium text-xs">/ {project.soldHours}h</span>
                                </div>
                                <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                   <div className={`h-full rounded-full ${
                                      timePercent > 100 ? 'bg-rose-500' : timePercent > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                                   }`} style={{ width: `${Math.min(timePercent, 100)}%` }}></div>
                                </div>
                             </td>
                             <td className="px-6 py-5 font-medium text-slate-700 dark:text-slate-300">${project.budget.toLocaleString()}</td>
                             <td className="px-6 py-5 text-slate-500 dark:text-slate-400">${project.cost.toLocaleString()}</td>
                             <td className="px-6 py-5 text-right">
                                <Badge variant={margin < 20 ? 'danger' : margin < 40 ? 'warning' : 'success'} className="rounded-lg">
                                   {Math.round(margin)}%
                                </Badge>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex -space-x-2 justify-end">
                                   {project.team.map((avatar, i) => (
                                      <img key={i} src={avatar} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" alt="team" />
                                   ))}
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                    {productionProjects.length === 0 && (
                       <tr><td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500">Aucun projet.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Card 5: Team Availability */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-8 flex flex-col hover:shadow-md transition-all duration-500">
           <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Disponibilité</h3>
           <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[300px]">
              {employees.map(emp => (
                 <div key={emp.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-500">
                    <div className="flex items-center gap-3">
                       <div className="relative">
                          <img src={emp.avatar} className="w-10 h-10 rounded-full" alt={emp.name} />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${
                             emp.status === 'Actif' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}></div>
                       </div>
                       <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{emp.position}</div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">-</div>
                       <div className="text-[10px] text-slate-400 font-medium">Charge</div>
                    </div>
                 </div>
              ))}
              {employees.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm">Aucun employé.</p>}
           </div>
           <Button variant="outline" fullWidth className="mt-6">
              Voir Planning
           </Button>
        </div>

        {/* Card 6: Alerts & Insights */}
        <div className="col-span-12 bg-slate-900 text-white shadow-xl shadow-slate-900/10 rounded-[30px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
           
           <div className="flex items-start gap-5 z-10">
              <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md">
                 <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <div>
                 <h3 className="font-bold text-lg text-white">Alerte Production</h3>
                 <p className="text-slate-300 text-sm max-w-xl mt-1.5 font-medium leading-relaxed">
                    Aucune alerte majeure détectée. Les projets avancent selon le plan.
                 </p>
              </div>
           </div>
           
           <div className="flex gap-3 z-10 w-full md:w-auto">
              <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all duration-500 w-full md:w-auto">Ignorer</button>
              <button className="px-5 py-2.5 bg-white text-slate-900 hover:bg-indigo-50 rounded-xl text-sm font-bold transition-all duration-500 shadow-lg w-full md:w-auto">Revoir Projet</button>
           </div>
        </div>

      </div>

      {/* Create Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Créer Nouveau Projet">
         <form onSubmit={handleCreateProject} className="space-y-4">
            <Input label="Nom du Projet" required />
            <Input label="Client" required />
            <div className="grid grid-cols-2 gap-4">
               <Dropdown 
                  label="Département"
                  options={[
                     {value: 'R&D & Tech', label: 'R&D & Tech'},
                     {value: 'Design & Costumes', label: 'Design & Costumes'},
                     {value: 'Marketing & RP', label: 'Marketing & RP'}
                  ]}
               />
               <Input label="Budget Total" type="number" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <Input label="Date Début" type="date" required />
               <Input label="Heures Vendues" type="number" required />
            </div>
            <div className="flex justify-end pt-4">
               <Button type="submit">Créer Projet</Button>
            </div>
         </form>
      </Modal>

      {/* Log Time Modal */}
      <Modal isOpen={isTimeModalOpen} onClose={() => setIsTimeModalOpen(false)} title="Enregistrer Heures">
         <form onSubmit={handleLogTime} className="space-y-4">
            <Dropdown 
               label="Projet"
               options={productionProjects.map(p => ({value: p.id, label: p.name}))}
            />
            <div className="grid grid-cols-2 gap-4">
               <Input label="Date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
               <Input label="Heures" type="number" step="0.5" required />
            </div>
            <Textarea label="Description" placeholder="Qu'avez-vous fait ?" className="h-24" />
            <div className="flex justify-end pt-4">
               <Button type="submit" variant="secondary">Soumettre</Button>
            </div>
         </form>
      </Modal>
      </div>
    </PageLayout>
  );
};
