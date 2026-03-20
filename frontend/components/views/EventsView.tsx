
import React from 'react';
import { 
  Calendar, MapPin, Users, DollarSign, Clock, 
  MoreHorizontal, Plus, Ticket, CheckSquare, Video
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { AgencyEvent } from '../../types';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { SearchBar } from '../ui/SearchBar';
import { useApp } from '../contexts/AppContext';
import { PageLayout } from '../ui/PageLayout';

const EventCard: React.FC<{ event: AgencyEvent }> = ({ event }) => (
  <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-indigo-900/5 rounded-3xl overflow-hidden flex flex-col md:flex-row group hover:shadow-2xl transition-all duration-500">
     {/* Image Side */}
     <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden">
        <img src={event.image || 'https://via.placeholder.com/300'} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" alt={event.name} />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-xl px-3 py-1 text-center shadow-lg">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{new Date(event.date).toLocaleString('default', { month: 'short' })}</p>
           <p className="text-xl font-bold text-slate-800 leading-none">{new Date(event.date).getDate()}</p>
        </div>
        <div className="absolute bottom-4 left-4">
           <Badge variant={event.status === 'Confirmé' ? 'success' : event.status === 'Planification' ? 'warning' : 'default'} className="shadow-lg backdrop-blur-md bg-white/80">
              {event.status}
           </Badge>
        </div>
     </div>
     
     {/* Content Side */}
     <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
           <div className="flex justify-between items-start mb-2">
              <div>
                 <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">{event.client}</p>
                 <h3 className="text-xl font-bold text-slate-900">{event.name}</h3>
              </div>
              <button className="text-slate-400 hover:text-indigo-600 transition-all duration-500">
                 <MoreHorizontal size={20} />
              </button>
           </div>
           
           <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                 <MapPin size={16} className="text-slate-400" />
                 {event.venue}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                 <Users size={16} className="text-slate-400" />
                 {event.guests} Invités
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                 <Clock size={16} className="text-slate-400" />
                 -
              </div>
           </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">Budget:</span>
              <span className="text-slate-800 font-bold">${event.budget.toLocaleString()}</span>
           </div>
           <div className="flex -space-x-2">
              {/* Placeholders for staff */}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">Staff</div>
           </div>
        </div>
     </div>
  </div>
);

export const EventsView: React.FC = () => {
  const { agencyEvents } = useApp();

  return (
    <PageLayout
      header={{
        icon: Video,
        iconBgColor: "bg-purple-100 dark:bg-purple-900/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        title: "Gestion Événements",
        description: "Organisez et gérez vos événements.",
        rightActions: [
          {
            label: "Créer",
            icon: Plus,
            onClick: () => {},
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="h-full flex flex-col">
        {/* Recherche */}
        <div className="mb-6 shrink-0">
          <SearchBar placeholder="Rechercher événement..." containerClassName="w-48" />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Column */}
            <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">À venir</span>
                <div className="h-px bg-slate-200 flex-1"></div>
             </div>

             {agencyEvents.map((event) => (
                <EventCard key={event.id} event={event} />
             ))}
             {agencyEvents.length === 0 && (
                <div className="text-center py-8 text-slate-400">Aucun événement planifié.</div>
             )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
             {/* Quick Stats */}
             <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-indigo-900/5 rounded-3xl p-6">
                <h3 className="font-bold text-slate-800 mb-4">Stats Événements</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/40">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Calendar size={18} /></div>
                         <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Événements</p>
                            <p className="font-bold text-slate-800">{agencyEvents.length}</p>
                         </div>
                      </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/40">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Ticket size={18} /></div>
                         <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Billets Vendus</p>
                            <p className="font-bold text-slate-800">0</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Task List */}
             <div className="bg-indigo-900 text-white rounded-3xl p-6 shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-40"></div>
                <h3 className="font-bold text-lg mb-1 relative z-10">Checklist Production</h3>
                
                <div className="space-y-3 relative z-10">
                   {/* Checklist vide par défaut */}
             </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageLayout>
  );
};
