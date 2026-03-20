import React, { useState } from 'react';
import { useLeadEvents, LeadEvent } from '../../lib/supabase/hooks/useLeadEvents';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { Calendar, Plus, Edit2, Trash2, Bell, Repeat, AlertCircle } from 'lucide-react';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { getUserAvatar } from '../../lib/utils/avatar';

interface LeadEventsProps {
  leadId: string;
  onEventCreated?: () => void;
}

const EVENT_TYPE_OPTIONS = [
  { value: 'anniversaire', label: 'Anniversaire' },
  { value: 'evenement_entreprise', label: 'Événement entreprise' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'suivi', label: 'Suivi' },
  { value: 'autre', label: 'Autre' },
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  anniversaire: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400',
  evenement_entreprise: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  rappel: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  suivi: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  autre: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
};

const RECURRENCE_PATTERN_OPTIONS = [
  { value: 'yearly', label: 'Annuel' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'weekly', label: 'Hebdomadaire' },
];

export const LeadEvents: React.FC<LeadEventsProps> = ({ leadId, onEventCreated }) => {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useLeadEvents(leadId);
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LeadEvent | null>(null);
  const [formData, setFormData] = useState({
    eventType: 'rappel' as LeadEvent['eventType'],
    title: '',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurrencePattern: 'yearly' as string,
    reminderDays: [] as number[],
  });

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      eventType: 'rappel',
      title: '',
      description: '',
      eventDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrencePattern: 'yearly',
      reminderDays: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (event: LeadEvent) => {
    setEditingEvent(event);
    setFormData({
      eventType: event.eventType,
      title: event.title,
      description: event.description || '',
      eventDate: event.eventDate,
      isRecurring: event.isRecurring,
      recurrencePattern: event.recurrencePattern || 'yearly',
      reminderDays: event.reminderDays || [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, {
          leadId: editingEvent.leadId,
          eventType: formData.eventType,
          title: formData.title,
          description: formData.description || undefined,
          eventDate: formData.eventDate,
          isRecurring: formData.isRecurring,
          recurrencePattern: formData.isRecurring ? formData.recurrencePattern : undefined,
          reminderDays: formData.reminderDays,
        });
      } else {
        await createEvent({
          leadId,
          eventType: formData.eventType,
          title: formData.title,
          description: formData.description || undefined,
          eventDate: formData.eventDate,
          isRecurring: formData.isRecurring,
          recurrencePattern: formData.isRecurring ? formData.recurrencePattern : undefined,
          reminderDays: formData.reminderDays,
        });
      }
      setIsModalOpen(false);
      onEventCreated?.();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }
    try {
      await deleteEvent(eventId);
      onEventCreated?.();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const toggleReminderDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      reminderDays: prev.reminderDays.includes(day)
        ? prev.reminderDays.filter(d => d !== day)
        : [...prev.reminderDays, day].sort((a, b) => a - b),
    }));
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Système';
    const user = users.find(u => u.id === userId);
    return user?.name || 'Utilisateur inconnu';
  };

  const getUserAvatarUrl = (userId?: string) => {
    if (!userId) return getUserAvatar();
    const user = users.find(u => u.id === userId);
    return user?.avatar || getUserAvatar(user?.email, userId);
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter(e => {
      const eventDate = new Date(e.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
  };

  const getPastEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter(e => {
      const eventDate = new Date(e.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate < today;
    });
  };

  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Événements</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {events.length} événement{events.length > 1 ? 's' : ''} enregistré{events.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="sm">
          <Plus size={16} className="mr-2" />
          Ajouter un événement
        </Button>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            À venir
          </h4>
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={() => handleOpenEdit(event)}
                onDelete={() => handleDelete(event.id)}
                getUserName={getUserName}
                getUserAvatarUrl={getUserAvatarUrl}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Passés
          </h4>
          <div className="space-y-2">
            {pastEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={() => handleOpenEdit(event)}
                onDelete={() => handleDelete(event.id)}
                getUserName={getUserName}
                getUserAvatarUrl={getUserAvatarUrl}
                isPast
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={48} />
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">Aucun événement</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
            Ajoutez des événements, anniversaires ou rappels pour ce contact
          </p>
          <Button onClick={handleOpenCreate} variant="secondary" size="sm">
            <Plus size={16} className="mr-2" />
            Ajouter un événement
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Dropdown
            label="Type d'événement"
            value={formData.eventType}
            onChange={(value) => setFormData(prev => ({ ...prev, eventType: value as LeadEvent['eventType'] }))}
            options={EVENT_TYPE_OPTIONS}
            required
          />

          <Input
            label="Titre"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Anniversaire de l'entreprise"
            required
          />

          <Input
            label="Date"
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Notes et détails supplémentaires..."
            rows={4}
          />

          <Checkbox
            label="Événement récurrent"
            checked={formData.isRecurring}
            onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
          />

          {formData.isRecurring && (
            <Dropdown
              label="Fréquence"
              value={formData.recurrencePattern}
              onChange={(value) => setFormData(prev => ({ ...prev, recurrencePattern: value }))}
              options={RECURRENCE_PATTERN_OPTIONS}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Rappels (jours avant l'événement)
            </label>
            <div className="flex flex-wrap gap-2">
              {[30, 14, 7, 3, 1].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleReminderDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    formData.reminderDays.includes(day)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  J-{day}
                </button>
              ))}
            </div>
            {formData.reminderDays.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Rappels configurés : {formData.reminderDays.sort((a, b) => b - a).map(d => `J-${d}`).join(', ')}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              {editingEvent ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface EventCardProps {
  event: LeadEvent;
  onEdit: () => void;
  onDelete: () => void;
  getUserName: (userId?: string) => string;
  getUserAvatarUrl: (userId?: string) => string;
  isPast?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete, getUserName, getUserAvatarUrl, isPast }) => {
  const eventDate = new Date(event.eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = eventDate.toDateString() === today.toDateString();
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow ${
      isPast ? 'opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Badge
              className={EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.autre}
            >
              {EVENT_TYPE_OPTIONS.find(opt => opt.value === event.eventType)?.label || event.eventType}
            </Badge>
            {event.isRecurring && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Repeat size={12} />
                Récurrent
              </span>
            )}
          </div>

          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{event.title}</h4>

          {event.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{event.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar size={14} />
              {eventDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>

            {!isPast && (
              <span className={`font-medium flex items-center gap-1.5 ${
                isToday
                  ? 'text-amber-600 dark:text-amber-400'
                  : daysUntil <= 7
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {isToday ? (
                  <>
                    <AlertCircle size={14} />
                    Aujourd'hui
                  </>
                ) : daysUntil === 1 ? (
                  'Demain'
                ) : daysUntil > 0 ? (
                  `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`
                ) : (
                  `${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''} passé${Math.abs(daysUntil) > 1 ? 's' : ''}`
                )}
              </span>
            )}

            {event.reminderDays.length > 0 && (
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Bell size={14} />
                Rappels: {event.reminderDays.sort((a, b) => b - a).map(d => `J-${d}`).join(', ')}
              </span>
            )}
          </div>

          {event.createdBy && (
            <div className="flex items-center gap-2 mt-3">
              <img
                src={getUserAvatarUrl(event.createdBy)}
                alt={getUserName(event.createdBy)}
                className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Créé par {getUserName(event.createdBy)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

