import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, Video, Phone, MapPin, User, Plus, X, CheckCircle2, XCircle, 
  AlertCircle, ChevronLeft, ChevronRight, Edit2, Trash2, Repeat, Bell, 
  Settings, LayoutGrid, List, CalendarDays, CalendarClock, Users as UsersIcon,
  ExternalLink
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { sendEmail } from '../../lib/services/emailService';
import { Lead } from '../../types';
import { CalendarIntegrations } from '../integrations/CalendarIntegrations';
import { MeetingNotesEditor } from '../meeting/MeetingNotesEditor';
import { FileText } from 'lucide-react';
import { TimezoneService, COMMON_TIMEZONES } from '../../lib/services/timezoneService';

interface Appointment {
  id: string;
  lead_id?: string;
  user_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  meeting_type: 'call' | 'video' | 'in_person' | 'other';
  meeting_url?: string;
  location?: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  notes?: string;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_end_date?: string;
  created_at: string;
  updated_at?: string;
  leads?: Lead;
  users?: { id: string; name?: string; email?: string };
}

interface Availability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

type ViewMode = 'month' | 'week' | 'day';

export const AppointmentScheduler: React.FC = () => {
  const { showToast, user } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [notesAppointmentId, setNotesAppointmentId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_time: '',
    meeting_type: 'call' as const,
    meeting_url: '',
    location: '',
    lead_id: '',
    notes: '',
    recurrence_type: 'none' as const,
    recurrence_end_date: '',
    timezone: TimezoneService.detectBrowserTimezone()
  });

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          leads:lead_id (*),
          users:user_id (id, name, email)
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des rendez-vous', 'error');
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company')
        .order('name', { ascending: true })
        .limit(1000);

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error loading leads:', error);
    }
  };

  const loadAvailabilities = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('appointment_availability')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_available', true);

      if (error) throw error;
      setAvailabilities(data || []);
    } catch (error: any) {
      console.error('Error loading availabilities:', error);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadLeads();
    loadAvailabilities();
  }, [user?.id]);

  // Vérifier et envoyer les rappels
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
      const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
      const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const apt of appointments) {
        if (apt.reminder_sent || apt.status === 'cancelled' || apt.status === 'completed') continue;

        const startTime = new Date(apt.start_time);
        const shouldSend15Min = startTime >= now && startTime <= in15Minutes;
        const shouldSend1Hour = startTime >= in15Minutes && startTime <= in1Hour;
        const shouldSend1Day = startTime >= in1Hour && startTime <= in1Day;

        if (shouldSend15Min || shouldSend1Hour || shouldSend1Day) {
          await sendReminder(apt, shouldSend15Min ? '15min' : shouldSend1Hour ? '1hour' : '1day');
        }
      }
    };

    const interval = setInterval(checkReminders, 60000); // Vérifier toutes les minutes
    return () => clearInterval(interval);
  }, [appointments]);

  const sendReminder = async (appointment: Appointment, timing: '15min' | '1hour' | '1day') => {
    try {
      const timingText = {
        '15min': 'dans 15 minutes',
        '1hour': 'dans 1 heure',
        '1day': 'demain'
      }[timing];

      const emailContent = `
        <h2>Rappel de rendez-vous</h2>
        <p>Bonjour,</p>
        <p>Vous avez un rendez-vous ${timingText} :</p>
        <ul>
          <li><strong>Titre :</strong> ${appointment.title}</li>
          <li><strong>Date :</strong> ${new Date(appointment.start_time).toLocaleString('fr-FR')}</li>
          <li><strong>Type :</strong> ${appointment.meeting_type === 'call' ? 'Appel' : appointment.meeting_type === 'video' ? 'Visioconférence' : 'En personne'}</li>
          ${appointment.location ? `<li><strong>Lieu :</strong> ${appointment.location}</li>` : ''}
          ${appointment.meeting_url ? `<li><strong>Lien :</strong> <a href="${appointment.meeting_url}">${appointment.meeting_url}</a></li>` : ''}
        </ul>
      `;

      // Envoyer email au commercial
      if (appointment.users?.email) {
        await sendEmail({
          to: appointment.users.email,
          from: 'noreply@agencyos.com',
          subject: `Rappel : ${appointment.title} ${timingText}`,
          html: emailContent
        });
      }

      // Envoyer notification in-app
      await supabase.from('notifications').insert({
        user_id: appointment.user_id,
        type: 'appointment_reminder',
        title: `Rappel : ${appointment.title}`,
        message: `Rendez-vous ${timingText}`,
        metadata: { appointment_id: appointment.id }
      });

      // Marquer le rappel comme envoyé
      await supabase
        .from('appointments')
        .update({ 
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      loadAppointments();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.start_date || !formData.start_time || !formData.end_time) {
        showToast('Veuillez remplir tous les champs requis', 'error');
        return;
      }

      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}`);

      if (endDateTime <= startDateTime) {
        showToast('L\'heure de fin doit être après l\'heure de début', 'error');
        return;
      }

      const appointmentsToCreate: any[] = [];

      // Créer le rendez-vous principal
      const baseAppointment = {
        title: formData.title,
        description: formData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        meeting_type: formData.meeting_type,
        meeting_url: formData.meeting_url || null,
        location: formData.location || null,
        lead_id: formData.lead_id || null,
        user_id: user?.id,
        status: 'scheduled' as const,
        timezone: formData.timezone || TimezoneService.detectBrowserTimezone(),
        notes: formData.notes,
        reminder_sent: false
      };

      appointmentsToCreate.push(baseAppointment);

      // Gérer les récurrences
      if (formData.recurrence_type !== 'none' && formData.recurrence_end_date) {
        const endDate = new Date(formData.recurrence_end_date);
        let currentDate = new Date(startDateTime);
        currentDate.setDate(currentDate.getDate() + 1); // Commencer au jour suivant

        while (currentDate <= endDate) {
          const shouldCreate = 
            (formData.recurrence_type === 'daily') ||
            (formData.recurrence_type === 'weekly' && currentDate.getDay() === startDateTime.getDay()) ||
            (formData.recurrence_type === 'monthly' && currentDate.getDate() === startDateTime.getDate());

          if (shouldCreate) {
            const recurringStart = new Date(currentDate);
            recurringStart.setHours(startDateTime.getHours(), startDateTime.getMinutes());
            const recurringEnd = new Date(currentDate);
            recurringEnd.setHours(endDateTime.getHours(), endDateTime.getMinutes());

            appointmentsToCreate.push({
              ...baseAppointment,
              start_time: recurringStart.toISOString(),
              end_time: recurringEnd.toISOString(),
              recurrence_type: formData.recurrence_type,
              recurrence_end_date: formData.recurrence_end_date
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      const { error } = await supabase
        .from('appointments')
        .insert(appointmentsToCreate);

      if (error) throw error;

      showToast(`${appointmentsToCreate.length} rendez-vous créé(s) avec succès`, 'success');
      setIsModalOpen(false);
      resetForm();
      loadAppointments();
    } catch (error: any) {
      showToast('Erreur lors de la création du rendez-vous', 'error');
      console.error(error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAppointment) return;

    try {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}`);

      const { error } = await supabase
        .from('appointments')
        .update({
          title: formData.title,
          description: formData.description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          meeting_type: formData.meeting_type,
          meeting_url: formData.meeting_url || null,
          location: formData.location || null,
          lead_id: formData.lead_id || null,
          notes: formData.notes,
          recurrence_type: formData.recurrence_type,
          recurrence_end_date: formData.recurrence_end_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      showToast('Rendez-vous modifié avec succès', 'success');
      setIsEditModalOpen(false);
      setSelectedAppointment(null);
      resetForm();
      loadAppointments();
    } catch (error: any) {
      showToast('Erreur lors de la modification du rendez-vous', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Rendez-vous supprimé avec succès', 'success');
      loadAppointments();
    } catch (error: any) {
      showToast('Erreur lors de la suppression du rendez-vous', 'error');
    }
  };

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showToast('Statut mis à jour', 'success');
      loadAppointments();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour du statut', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      start_time: '',
      end_time: '',
      meeting_type: 'call',
      meeting_url: '',
      location: '',
      lead_id: '',
      notes: '',
      recurrence_type: 'none',
      recurrence_end_date: ''
    });
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const startDate = new Date(appointment.start_time);
    setFormData({
      title: appointment.title,
      description: appointment.description || '',
      start_date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_time: new Date(appointment.end_time).toTimeString().slice(0, 5),
      meeting_type: appointment.meeting_type,
      meeting_url: appointment.meeting_url || '',
      location: appointment.location || '',
      lead_id: appointment.lead_id || '',
      notes: appointment.notes || '',
      recurrence_type: appointment.recurrence_type || 'none',
      recurrence_end_date: appointment.recurrence_end_date || '',
      timezone: appointment.timezone || TimezoneService.detectBrowserTimezone()
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      scheduled: { label: 'Planifié', color: 'blue', icon: Clock },
      confirmed: { label: 'Confirmé', color: 'green', icon: CheckCircle2 },
      cancelled: { label: 'Annulé', color: 'red', icon: XCircle },
      completed: { label: 'Terminé', color: 'emerald', icon: CheckCircle2 },
      no_show: { label: 'Absent', color: 'orange', icon: AlertCircle }
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const getMeetingTypeIcon = (type: Appointment['meeting_type']) => {
    const icons = {
      call: Phone,
      video: Video,
      in_person: MapPin,
      other: Calendar
    };
    const Icon = icons[type];
    return <Icon size={16} />;
  };

  // Calculer les dates pour la vue mois
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Commencer au dimanche
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // Terminer au samedi

  const daysInMonth = useMemo(() => {
    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  // Calculer les dates pour la vue semaine
  const weekStart = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day;
    return new Date(start.setDate(diff));
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  // Filtrer les rendez-vous par date
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  // Rendre la vue mois
  const renderMonthView = () => {
    const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {daysInMonth.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const dayAppointments = getAppointmentsForDate(date);

            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 border-r border-b border-slate-200 dark:border-slate-700 ${
                  !isCurrentMonth ? 'bg-slate-50 dark:bg-slate-900/50 opacity-50' : 'bg-white dark:bg-slate-800'
                } hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => openEditModal(apt)}
                      className="text-xs p-1.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:opacity-80 truncate"
                      title={apt.title}
                    >
                      {new Date(apt.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} {apt.title}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      +{dayAppointments.length - 3} autre(s)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Rendre la vue semaine
  const renderWeekView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-700">
          <div className="p-3 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900"></div>
          {weekDays.map((date, idx) => {
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div
                key={idx}
                className={`p-3 text-center text-sm font-semibold ${
                  isToday ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900'
                }`}
              >
                <div>{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div className={`text-lg ${isToday ? 'font-bold' : ''}`}>{date.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="overflow-y-auto max-h-[600px]">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-100 dark:border-slate-700">
              <div className="p-2 text-xs text-slate-500 dark:text-slate-400 text-right pr-4">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((date, dayIdx) => {
                const hourAppointments = appointments.filter(apt => {
                  const aptDate = new Date(apt.start_time);
                  return aptDate.toDateString() === date.toDateString() && aptDate.getHours() === hour;
                });

                return (
                  <div
                    key={dayIdx}
                    className="p-1 border-r border-slate-100 dark:border-slate-700 min-h-[60px]"
                  >
                    {hourAppointments.map(apt => (
                      <div
                        key={apt.id}
                        onClick={() => openEditModal(apt)}
                        className="text-xs p-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:opacity-80 mb-1"
                        title={apt.title}
                      >
                        {apt.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendre la vue jour
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayAppointments = getAppointmentsForDate(currentDate);

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {currentDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
        </div>
        <div className="grid grid-cols-2 overflow-y-auto max-h-[600px]">
          <div className="border-r border-slate-200 dark:border-slate-700">
            {hours.map(hour => (
              <div key={hour} className="p-2 border-b border-slate-100 dark:border-slate-700 min-h-[60px]">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              </div>
            ))}
          </div>
          <div>
            {hours.map(hour => {
              const hourAppointments = dayAppointments.filter(apt => {
                const aptDate = new Date(apt.start_time);
                return aptDate.getHours() === hour;
              });

              return (
                <div key={hour} className="p-2 border-b border-slate-100 dark:border-slate-700 min-h-[60px]">
                  {hourAppointments.map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => openEditModal(apt)}
                      className="text-xs p-2 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:opacity-80 mb-1"
                    >
                      <div className="font-semibold">{apt.title}</div>
                      <div className="text-xs opacity-75">
                        {new Date(apt.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(apt.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
    } else if (direction === 'next') {
      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else {
      setCurrentDate(new Date());
      return;
    }
    setCurrentDate(newDate);
  };

  return (
    <PageLayout
      header={{
        icon: Calendar,
        title: "Planificateur de rendez-vous",
        description: "Gérez vos rendez-vous avec les leads et clients",
        rightActions: [
          {
            label: "Intégrations",
            icon: ExternalLink,
            onClick: () => setIsIntegrationsOpen(true),
            variant: 'outline'
          },
          {
            label: "Disponibilités",
            icon: Settings,
            onClick: () => setIsAvailabilityModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Nouveau rendez-vous",
            icon: Plus,
            onClick: () => {
              resetForm();
              setFormData(prev => ({
                ...prev,
                start_date: currentDate.toISOString().split('T')[0]
              }));
              setIsModalOpen(true);
            },
            variant: 'primary'
          }
        ],
        viewToggle: {
          value: viewMode,
          onChange: (value) => setViewMode(value as ViewMode),
          options: [
            { value: 'month', icon: LayoutGrid, title: 'Vue mois' },
            { value: 'week', icon: CalendarDays, title: 'Vue semaine' },
            { value: 'day', icon: CalendarClock, title: 'Vue jour' }
          ]
        }
      }}
    >
      <div className="space-y-6">
        {/* Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigateDate('prev')}>
                <ChevronLeft size={16} />
              </Button>
              <Button variant="outline" onClick={() => navigateDate('today')}>
                Aujourd'hui
              </Button>
              <Button variant="outline" onClick={() => navigateDate('next')}>
                <ChevronRight size={16} />
              </Button>
              <div className="ml-4 text-lg font-semibold text-slate-900 dark:text-white">
                {viewMode === 'month' && currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                {viewMode === 'week' && `Semaine du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                {viewMode === 'day' && currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Vue calendrier */}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouveau rendez-vous"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Titre"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Appel découverte avec..."
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Détails du rendez-vous..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Heure de début"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
              <Input
                label="Heure de fin"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>
          <Dropdown
            label="Type de rendez-vous"
            value={formData.meeting_type}
            onChange={(value) => setFormData({ ...formData, meeting_type: value as any })}
            options={[
              { value: 'call', label: 'Appel téléphonique' },
              { value: 'video', label: 'Visioconférence' },
              { value: 'in_person', label: 'En personne' },
              { value: 'other', label: 'Autre' }
            ]}
          />
          {formData.meeting_type === 'video' && (
            <Input
              label="Lien de visioconférence"
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
              placeholder="https://..."
            />
          )}
          {formData.meeting_type === 'in_person' && (
            <Input
              label="Lieu"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Adresse du rendez-vous"
            />
          )}
          <Dropdown
            label="Lead (optionnel)"
            value={formData.lead_id}
            onChange={(value) => setFormData({ ...formData, lead_id: value })}
            options={[
              { value: '', label: 'Aucun' },
              ...leads.map(lead => ({
                value: lead.id,
                label: `${lead.name || 'Sans nom'}${lead.company ? ` - ${lead.company}` : ''}`
              }))
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Récurrence"
              value={formData.recurrence_type}
              onChange={(value) => setFormData({ ...formData, recurrence_type: value as any })}
              options={[
                { value: 'none', label: 'Aucune' },
                { value: 'daily', label: 'Quotidien' },
                { value: 'weekly', label: 'Hebdomadaire' },
                { value: 'monthly', label: 'Mensuel' }
              ]}
            />
            {formData.recurrence_type !== 'none' && (
              <Input
                label="Date de fin de récurrence"
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                required={formData.recurrence_type !== 'none'}
              />
            )}
          </div>
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notes privées..."
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Créer le rendez-vous
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAppointment(null);
        }}
        title="Modifier le rendez-vous"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Titre"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Heure de début"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
              <Input
                label="Heure de fin"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>
          <Dropdown
            label="Type de rendez-vous"
            value={formData.meeting_type}
            onChange={(value) => setFormData({ ...formData, meeting_type: value as any })}
            options={[
              { value: 'call', label: 'Appel téléphonique' },
              { value: 'video', label: 'Visioconférence' },
              { value: 'in_person', label: 'En personne' },
              { value: 'other', label: 'Autre' }
            ]}
          />
          {formData.meeting_type === 'video' && (
            <Input
              label="Lien de visioconférence"
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
            />
          )}
          {formData.meeting_type === 'in_person' && (
            <Input
              label="Lieu"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          )}
          <Dropdown
            label="Statut"
            value={selectedAppointment?.status || 'scheduled'}
            onChange={(value) => selectedAppointment && handleStatusChange(selectedAppointment.id, value as Appointment['status'])}
            options={[
              { value: 'scheduled', label: 'Planifié' },
              { value: 'confirmed', label: 'Confirmé' },
              { value: 'cancelled', label: 'Annulé' },
              { value: 'completed', label: 'Terminé' },
              { value: 'no_show', label: 'Absent' }
            ]}
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
          <div className="flex justify-between pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedAppointment) {
                    setNotesAppointmentId(selectedAppointment.id);
                    setIsNotesModalOpen(true);
                  }
                }}
                icon={FileText}
              >
                Prendre des notes
              </Button>
              <Button
                variant="danger"
                onClick={() => selectedAppointment && handleDelete(selectedAppointment.id)}
              >
                <Trash2 size={16} className="mr-2" />
                Supprimer
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {
                setIsEditModalOpen(false);
                setSelectedAppointment(null);
              }}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleUpdate}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de disponibilités */}
      <Modal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        title="Gérer mes disponibilités"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Définissez vos créneaux de disponibilité pour chaque jour de la semaine.
          </p>
          <div className="space-y-3">
            {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, idx) => {
              const dayAvailability = availabilities.find(a => a.day_of_week === idx);
              return (
                <div key={idx} className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300">{day}</div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      value={dayAvailability?.start_time || '09:00'}
                      onChange={async (e) => {
                        if (dayAvailability) {
                          await supabase
                            .from('appointment_availability')
                            .update({ start_time: e.target.value })
                            .eq('id', dayAvailability.id);
                        } else {
                          await supabase
                            .from('appointment_availability')
                            .insert({
                              user_id: user?.id,
                              day_of_week: idx,
                              start_time: e.target.value,
                              end_time: '18:00',
                              is_available: true
                            });
                        }
                        loadAvailabilities();
                      }}
                    />
                    <Input
                      type="time"
                      value={dayAvailability?.end_time || '18:00'}
                      onChange={async (e) => {
                        if (dayAvailability) {
                          await supabase
                            .from('appointment_availability')
                            .update({ end_time: e.target.value })
                            .eq('id', dayAvailability.id);
                        }
                        loadAvailabilities();
                      }}
                    />
                  </div>
                  <Button
                    variant={dayAvailability?.is_available ? "primary" : "outline"}
                    onClick={async () => {
                      if (dayAvailability) {
                        await supabase
                          .from('appointment_availability')
                          .update({ is_available: !dayAvailability.is_available })
                          .eq('id', dayAvailability.id);
                      } else {
                        await supabase
                          .from('appointment_availability')
                          .insert({
                            user_id: user?.id,
                            day_of_week: idx,
                            start_time: '09:00',
                            end_time: '18:00',
                            is_available: true
                          });
                      }
                      loadAvailabilities();
                    }}
                  >
                    {dayAvailability?.is_available ? 'Disponible' : 'Indisponible'}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={() => setIsAvailabilityModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Intégrations Calendrier */}
      <Modal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        title="Intégrations Calendriers"
        size="xl"
      >
        <CalendarIntegrations />
      </Modal>

      {/* Modal Prise de Notes */}
      {notesAppointmentId && (
        <MeetingNotesEditor
          appointmentId={notesAppointmentId}
          appointmentTitle={selectedAppointment?.title}
          appointmentDescription={selectedAppointment?.description}
          isOpen={isNotesModalOpen}
          onClose={() => {
            setIsNotesModalOpen(false);
            setNotesAppointmentId(null);
          }}
          onSave={() => {
            loadAppointments();
          }}
        />
      )}
    </PageLayout>
  );
};
