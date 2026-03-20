
import React from 'react';
import { Flag, Calendar, MoreHorizontal, ChevronRight, CheckCircle2, Circle, Map } from 'lucide-react';
import { RoadmapGoal } from '../../types';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { useApp } from '../contexts/AppContext';
import { PageLayout } from '../ui/PageLayout';

export const RoadmapView: React.FC = () => {
  const { roadmapGoals } = useApp();
  const quarters = ['T1', 'T2', 'T3', 'T4'];

  return (
    <PageLayout
      header={{
        icon: Map,
        iconBgColor: "bg-teal-100 dark:bg-teal-900/20",
        iconColor: "text-teal-600 dark:text-teal-400",
        title: "Feuille de Route Stratégique",
        description: "Objectifs et jalons pour l'année.",
        rightActions: [
          {
            element: (
              <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                2023
              </span>
            )
          }
        ]
      }}
    >

      <div className="flex-1 overflow-x-auto pb-4">
         <div className="flex gap-6 min-w-[1000px] h-full">
            {quarters.map((q) => (
               <div key={q} className="flex-1 flex flex-col">
                  {/* Quarter Header */}
                  <div className="flex items-center gap-3 mb-4 p-2">
                     <h2 className="text-xl font-bold text-slate-300">{q}</h2>
                     <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  {/* Goal Cards */}
                  <div className="space-y-4">
                     {roadmapGoals.filter(g => g.quarter === q).map((goal) => (
                        <RoadmapCard key={goal.id} goal={goal} />
                     ))}
                     
                     {/* Empty State / Add Button */}
                     <Button variant="ghost" className="w-full border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-sm font-medium hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-400 transition-all duration-500 flex items-center justify-center gap-2" icon={Flag}>
                        Ajouter Objectif
                     </Button>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </PageLayout>
  );
};

interface RoadmapCardProps {
  goal: RoadmapGoal;
}

const RoadmapCard: React.FC<RoadmapCardProps> = ({ goal }) => {
   const getStatusColor = (status: string) => {
      if (status === 'Terminé') return 'bg-emerald-500';
      if (status === 'En cours') return 'bg-indigo-500';
      return 'bg-slate-300';
   };

   return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-500 relative group">
         <div className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-500">
            <MoreHorizontal size={16} />
         </div>
         
         <div className="mb-3">
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${
               goal.department === 'R&D & Tech' ? 'bg-blue-50 text-blue-600' :
               goal.department === 'Marketing & RP' ? 'bg-pink-50 text-pink-600' :
               goal.department === 'Stratégie' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
            }`}>
               {goal.department}
            </span>
            <h3 className="font-bold text-slate-800 leading-tight">{goal.title}</h3>
         </div>
         
         <p className="text-xs text-slate-500 mb-4 line-clamp-2">{goal.description}</p>
         
         <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                  className={`h-full rounded-full ${getStatusColor(goal.status)} transition-all duration-500`} 
                  style={{ width: `${goal.progress}%` }}
               ></div>
            </div>
            <span className="text-xs font-medium text-slate-500 w-8 text-right">{goal.progress}%</span>
         </div>
      </div>
   );
};
