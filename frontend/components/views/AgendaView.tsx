
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, RefreshCw, MoreVertical, MapPin, Users, AlignLeft, Trash2, Edit3, FileText
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PageLayout } from '../ui/PageLayout';
import { CalendarEvent } from '../../types';
import { supabase } from '../../lib/supabase';
import { MeetingNotesEditor } from '../meeting/MeetingNotesEditor';
import { getMeetingNotes } from '../../lib/services/meetingNotesService';

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  meeting_type?: string;
  location?: string;
}

export const AgendaView: React.FC = () => {
  const { showToast, calendarEvents, users } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsWithNotes, setAppointmentsWithNotes] = useState<Set<string>>(new Set());
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesAppointmentId, setNotesAppointmentId] = useState<string | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => {
     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSync = (provider: string) => {
     setIsSyncModalOpen(false);
     showToast(`Synchronisé avec ${provider}`, 'success');
  };

  const formatEventTime = (dateStr: Date | string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Charger les appointments avec notes
  useEffect(() => {
    const loadAppointmentsWithNotes = async () => {
      try {
        // Récupérer tous les appointments du mois en cours
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const { data: appointmentsData, error } = await supabase
          .from('appointments')
          .select('id, title, start_time, end_time, description, meeting_type, location')
          .gte('start_time', monthStart.toISOString())
          .lte('start_time', monthEnd.toISOString())
          .order('start_time', { ascending: true });

        if (error) throw error;

        if (appointmentsData && appointmentsData.length > 0) {
          setAppointments(appointmentsData);

          // Vérifier quels appointments ont des notes
          const appointmentIds = appointmentsData.map(a => a.id);
          const { data: notes, error: notesError } = await supabase
            .from('meeting_notes')
            .select('appointment_id')
            .in('appointment_id', appointmentIds);

          if (notesError) throw notesError;

          const withNotes = new Set(notes?.map(n => n.appointment_id) || []);
          setAppointmentsWithNotes(withNotes);

          // Créer un mapping titre+date -> appointment_id pour faciliter la recherche
          const appointmentMap = new Map<string, string>();
          appointmentsData.forEach(apt => {
            const dateKey = new Date(apt.start_time).toISOString().split('T')[0];
            const key = `${apt.title}-${dateKey}`;
            appointmentMap.set(key, apt.id);
            // Aussi par ID direct pour les calendarEvents qui pourraient avoir l'ID
            appointmentMap.set(apt.id, apt.id);
          });
          // Stocker le mapping pour utilisation dans handleOpenNotes
          (window as any).__appointmentMap = appointmentMap;
        } else {
          setAppointments([]);
          setAppointmentsWithNotes(new Set());
        }
      } catch (error: any) {
        console.error('Error loading appointments with notes:', error);
      }
    };

    loadAppointmentsWithNotes();
  }, [currentDate]);

  const handleOpenNotes = async (eventId: string) => {
    if (!selectedEvent) return;

    try {
      // Si l'ID de l'événement correspond directement à un appointment
      const directAppointment = appointments.find(apt => apt.id === selectedEvent.id);
      if (directAppointment) {
        setNotesAppointmentId(directAppointment.id);
        setIsNotesModalOpen(true);
        return;
      }

      // Sinon, chercher par titre et date
      const eventDate = new Date(selectedEvent.start);
      const dateKey = eventDate.toISOString().split('T')[0];
      const appointmentMap = (window as any).__appointmentMap as Map<string, string> | undefined;
      
      let appointmentId: string | null = null;

      if (appointmentMap) {
        const key = `${selectedEvent.title}-${dateKey}`;
        appointmentId = appointmentMap.get(key) || null;
      }

      // Si pas trouvé dans le mapping, chercher dans la liste des appointments chargés
      if (!appointmentId) {
        const matchingAppointment = appointments.find(apt => 
          apt.title === selectedEvent.title &&
          new Date(apt.start_time).toISOString().split('T')[0] === dateKey
        );
        if (matchingAppointment) {
          appointmentId = matchingAppointment.id;
        }
      }

      // Si toujours pas trouvé, chercher dans la base de données
      if (!appointmentId) {
        const { data: appointmentData, error } = await supabase
          .from('appointments')
          .select('id, title, description')
          .eq('title', selectedEvent.title)
          .gte('start_time', new Date(eventDate.getTime() - 3600000).toISOString())
          .lte('start_time', new Date(eventDate.getTime() + 3600000).toISOString())
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error finding appointment:', error);
          showToast('Rendez-vous non trouvé. Utilisez le planificateur de rendez-vous pour prendre des notes.', 'info');
          return;
        }

        if (!appointmentData) {
          showToast('Rendez-vous non trouvé. Utilisez le planificateur de rendez-vous pour prendre des notes.', 'info');
          return;
        }

        appointmentId = appointmentData.id;
      }

      if (appointmentId) {
        setNotesAppointmentId(appointmentId);
        setIsNotesModalOpen(true);
      } else {
        showToast('Rendez-vous non trouvé. Utilisez le planificateur de rendez-vous pour prendre des notes.', 'info');
      }
    } catch (error: any) {
      console.error('Error opening notes:', error);
      showToast('Impossible d\'ouvrir les notes. Utilisez le planificateur de rendez-vous.', 'error');
    }
  };

  return (
    <PageLayout
      header={{
        icon: CalendarIcon,
        iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        title: "Calendrier",
        description: "Gérez votre emploi du temps et vos réunions",
        rightActions: [
          {
            icon: RefreshCw,
            label: "Synchroniser",
            variant: "outline",
            onClick: () => setIsSyncModalOpen(true),
            title: "Synchroniser avec un calendrier externe"
          },
          {
            icon: Plus,
            label: "Nouvel événement",
            variant: "primary",
            onClick: () => showToast('Création d\'événement (fonctionnalité à venir)', 'info'),
            title: "Créer un nouvel événement"
          }
        ]
      }}
    >
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
         {/* Calendar Header */}
         <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold text-slate-800 dark:text-white w-40 capitalize">{monthName} {year}</h2>
               <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded shadow-sm text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all duration-500"><ChevronLeft size={20} /></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">Aujourd'hui</button>
                  <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded shadow-sm text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all duration-500"><ChevronRight size={20} /></button>
               </div>
            </div>
            <div className="flex gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
               <button className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md">Mois</button>
               <button className="px-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md">Semaine</button>
               <button className="px-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md">Jour</button>
            </div>
         </div>

         {/* Calendar Grid */}
         <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] h-full overflow-hidden">
            {/* Weekday Headers */}
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
               <div key={day} className="py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  {day}
               </div>
            ))}

            {/* Days Grid */}
            <div className="col-span-7 grid grid-cols-7 auto-rows-fr h-full overflow-y-auto">
               {emptyDays.map(i => <div key={`empty-${i}`} className="bg-slate-50/30 dark:bg-slate-800/50 border-b border-r border-slate-100 dark:border-slate-700 min-h-[120px]"></div>)}
               
               {days.map(day => {
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                  // In a real app, compare dates properly
                  const dayEvents = calendarEvents.filter(e => new Date(e.start).getDate() === day && new Date(e.start).getMonth() === currentDate.getMonth());

                  return (
                     <div key={day} className={`border-b border-r border-slate-100 dark:border-slate-700 p-2 min-h-[120px] transition-all duration-500 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 group relative`}>
                        <div className="flex justify-between items-start mb-2">
                           <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                              {day}
                           </span>
                           <button className="text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-500"><Plus size={16} /></button>
                        </div>
                        
                        <div className="space-y-1">
                           {/* Afficher les appointments du jour */}
                           {appointments
                              .filter(apt => {
                                 const aptDate = new Date(apt.start_time);
                                 return aptDate.getDate() === day && aptDate.getMonth() === currentDate.getMonth();
                              })
                              .map(apt => {
                                 const hasNotes = appointmentsWithNotes.has(apt.id);
                                 return (
                                    <div 
                                       key={apt.id}
                                       onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setSelectedEvent({
                                             id: apt.id,
                                             title: apt.title,
                                             start: new Date(apt.start_time),
                                             end: new Date(apt.end_time),
                                             type: 'meeting' as const
                                          });
                                       }}
                                       className="px-2 py-1.5 rounded-md text-xs font-medium truncate cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all duration-500 shadow-sm flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                    >
                                       <span className="opacity-75 mr-1 font-bold">{new Date(apt.start_time).getHours()}:{String(new Date(apt.start_time).getMinutes()).padStart(2, '0')}</span>
                                       <span className="flex-1 truncate">{apt.title}</span>
                                       {hasNotes && (
                                          <FileText size={12} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" title="Notes disponibles" />
                                       )}
                                    </div>
                                 );
                              })}
                           {/* Afficher les autres événements du calendrier */}
                           {dayEvents
                              .filter(evt => {
                                 // Exclure les events qui sont déjà des appointments
                                 return !appointments.some(apt => apt.id === evt.id);
                              })
                              .map(evt => {
                                 return (
                                    <div 
                                       key={evt.id} 
                                       onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                                       className={`px-2 py-1.5 rounded-md text-xs font-medium truncate cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all duration-500 shadow-sm flex items-center gap-1 ${
                                          evt.type === 'meeting' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' :
                                          evt.type === 'task' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                                          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                       }`}>
                                          <span className="opacity-75 mr-1 font-bold">{new Date(evt.start).getHours()}:00</span>
                                          <span className="flex-1 truncate">{evt.title}</span>
                                    </div>
                                 );
                              })}
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* Sync Modal */}
      <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Synchroniser le calendrier" size="md">
         <div className="space-y-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Connectez vos calendriers externes pour tout voir au même endroit</p>
            
            <button onClick={() => handleSync('Google Calendar')} className="w-full flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all duration-500 group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                     <span className="text-lg font-bold text-slate-700 dark:text-white">G</span>
                  </div>
                  <div className="text-left">
                     <h4 className="font-bold text-slate-800 dark:text-white">Google Calendar</h4>
                     <p className="text-xs text-slate-500 dark:text-slate-400">Connectez votre compte Google</p>
                  </div>
               </div>
               <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">Connecter</span>
            </button>

            <button onClick={() => handleSync('Outlook Calendar')} className="w-full flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all duration-500 group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                     <span className="text-lg font-bold text-white">O</span>
                  </div>
                  <div className="text-left">
                     <h4 className="font-bold text-slate-800 dark:text-white">Outlook Calendar</h4>
                     <p className="text-xs text-slate-500 dark:text-slate-400">Connectez votre compte Microsoft</p>
                  </div>
               </div>
               <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">Connecter</span>
            </button>
         </div>
      </Modal>

      {/* Event Details Modal (Popup) */}
      <Modal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        title="Détails de l'événement"
        size="md"
      >
         {selectedEvent && (() => {
            const appointment = appointments.find(apt => apt.id === selectedEvent.id);
            const hasNotes = appointment ? appointmentsWithNotes.has(appointment.id) : false;
            
            return (
               <div className="space-y-6">
                  <div className="flex items-start justify-between">
                     <div>
                        <Badge variant={selectedEvent.type === 'meeting' ? 'info' : selectedEvent.type === 'task' ? 'success' : 'warning'} className="mb-2">
                           {selectedEvent.type === 'meeting' ? 'Réunion' : selectedEvent.type === 'task' ? 'Tâche' : 'Rappel'}
                        </Badge>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                        {hasNotes && (
                           <div className="flex items-center gap-1 mt-2 text-sm text-indigo-600 dark:text-indigo-400">
                              <FileText size={14} />
                              <span>Notes disponibles</span>
                           </div>
                        )}
                     </div>
                     <div className="flex gap-2">
                        <Button variant="ghost" className="p-2 h-auto text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" icon={Edit3} />
                        <Button variant="ghost" className="p-2 h-auto text-slate-400 hover:text-rose-600" icon={Trash2} />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                           <Clock size={18} />
                        </div>
                        <div>
                           <p className="text-sm font-bold">
                              {formatEventTime(selectedEvent.start)} - {formatEventTime(selectedEvent.end)}
                           </p>
                           <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                              {new Date(selectedEvent.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                           </p>
                        </div>
                     </div>

                     {appointment?.location && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                              <MapPin size={18} />
                           </div>
                           <div>
                              <p className="text-sm font-bold">{appointment.location}</p>
                           </div>
                        </div>
                     )}

                     {(appointment?.description || selectedEvent.type === 'meeting') && (
                        <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mt-1">
                              <AlignLeft size={18} />
                           </div>
                           <div className="flex-1">
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                 {appointment?.description || 'Aucune description disponible.'}
                              </p>
                           </div>
                        </div>
                     )}

                     {appointment?.meeting_type && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                           <Badge variant="outline">{appointment.meeting_type}</Badge>
                        </div>
                     )}

                     {selectedEvent.type === 'meeting' && users.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                           <div className="flex items-center gap-3 mb-3">
                              <Users size={16} className="text-slate-400" />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Participants ({users.length})</span>
                           </div>
                           <div className="flex items-center gap-2 flex-wrap">
                              {users.slice(0, 6).map(user => (
                                 <div key={user.id} className="relative group cursor-pointer">
                                    <img src={user.avatar} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-600 shadow-sm" alt={user.name} />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap pointer-events-none z-10">
                                       {user.name}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                     {selectedEvent.type === 'meeting' && (
                        <Button 
                           fullWidth 
                           variant={hasNotes ? "primary" : "outline"}
                           icon={FileText}
                           onClick={() => handleOpenNotes(selectedEvent.id)}
                        >
                           {hasNotes ? 'Voir les notes' : 'Prendre des notes'}
                        </Button>
                     )}
                     {selectedEvent.type === 'meeting' && (
                        <Button fullWidth variant="primary">Rejoindre visio</Button>
                     )}
                     <Button fullWidth variant="secondary">Reprogrammer</Button>
                  </div>
               </div>
            );
         })()}
      </Modal>

      {/* Modal Prise de Notes */}
      {notesAppointmentId && (
         <MeetingNotesEditor
            appointmentId={notesAppointmentId}
            appointmentTitle={selectedEvent?.title}
            appointmentDescription={appointments.find(apt => apt.id === notesAppointmentId)?.description}
            isOpen={isNotesModalOpen}
            onClose={() => {
               setIsNotesModalOpen(false);
               setNotesAppointmentId(null);
            }}
            onSave={() => {
               // Recharger les appointments avec notes
               const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
               const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
               supabase
                  .from('appointments')
                  .select('id')
                  .gte('start_time', monthStart.toISOString())
                  .lte('start_time', monthEnd.toISOString())
                  .then(({ data: appointmentsData }) => {
                     if (appointmentsData && appointmentsData.length > 0) {
                        const appointmentIds = appointmentsData.map(a => a.id);
                        supabase
                           .from('meeting_notes')
                           .select('appointment_id')
                           .in('appointment_id', appointmentIds)
                           .then(({ data: notes }) => {
                              const withNotes = new Set(notes?.map(n => n.appointment_id) || []);
                              setAppointmentsWithNotes(withNotes);
                           });
                     }
                  });
            }}
         />
      )}
    </PageLayout>
  );
};
