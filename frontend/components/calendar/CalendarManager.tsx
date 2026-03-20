import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Calendar, NonWorkingDay, WorkingHours } from '../../types';
import { useCalendars } from '../../lib/supabase/hooks/useCalendars';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';

interface CalendarManagerProps {
  onSelectCalendar?: (calendar: Calendar) => void;
}

export const CalendarManager: React.FC<CalendarManagerProps> = ({ onSelectCalendar }) => {
  const { calendars, addCalendar, updateCalendar, deleteCalendar, addNonWorkingDay, deleteNonWorkingDay, addWorkingHours, updateWorkingHours } = useCalendars();
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Partial<Calendar>>({});
  const [editingDay, setEditingDay] = useState<Partial<NonWorkingDay & { calendarId: string }>>({});
  const [editingHours, setEditingHours] = useState<Partial<WorkingHours & { calendarId: string }>>({});
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);

  const daysOfWeek = [
    { value: 0, label: 'Dimanche' },
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' },
  ];

  const handleOpenCreateCalendar = () => {
    setEditingCalendar({ name: '', isDefault: false });
    setIsCalendarModalOpen(true);
  };

  const handleOpenEditCalendar = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setIsCalendarModalOpen(true);
  };

  const handleOpenAddDay = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setEditingDay({ calendarId: calendar.id, date: new Date().toISOString().split('T')[0], isRecurring: false });
    setIsDayModalOpen(true);
  };

  const handleOpenAddHours = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setEditingHours({ calendarId: calendar.id, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorkingDay: true });
    setIsHoursModalOpen(true);
  };

  const handleSaveCalendar = async () => {
    if (!editingCalendar.name) return;

    try {
      if (editingCalendar.id) {
        await updateCalendar(editingCalendar.id, editingCalendar);
      } else {
        await addCalendar({
          name: editingCalendar.name,
          description: editingCalendar.description,
          isDefault: editingCalendar.isDefault || false,
        });
      }
      setIsCalendarModalOpen(false);
      setEditingCalendar({});
    } catch (error) {
      console.error('Error saving calendar:', error);
    }
  };

  const handleSaveDay = async () => {
    if (!editingDay.calendarId || !editingDay.date) return;

    try {
      await addNonWorkingDay({
        calendarId: editingDay.calendarId,
        date: editingDay.date,
        name: editingDay.name,
        isRecurring: editingDay.isRecurring || false,
      });
      setIsDayModalOpen(false);
      setEditingDay({});
    } catch (error) {
      console.error('Error saving non-working day:', error);
    }
  };

  const handleSaveHours = async () => {
    if (!editingHours.calendarId || editingHours.dayOfWeek === undefined) return;

    try {
      if (editingHours.id) {
        await updateWorkingHours(editingHours.id, editingHours);
      } else {
        await addWorkingHours({
          calendarId: editingHours.calendarId,
          dayOfWeek: editingHours.dayOfWeek,
          startTime: editingHours.startTime || '09:00',
          endTime: editingHours.endTime || '18:00',
          isWorkingDay: editingHours.isWorkingDay !== undefined ? editingHours.isWorkingDay : true,
        });
      }
      setIsHoursModalOpen(false);
      setEditingHours({});
    } catch (error) {
      console.error('Error saving working hours:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <CalendarIcon size={20} />
          Calendriers de travail
        </h3>
        <Button size="sm" icon={Plus} onClick={handleOpenCreateCalendar}>
          Nouveau calendrier
        </Button>
      </div>

      <div className="space-y-4">
        {calendars.map(calendar => (
          <div key={calendar.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    {calendar.name}
                  </h4>
                  {calendar.isDefault && (
                    <Badge variant="indigo" className="text-xs">Par défaut</Badge>
                  )}
                </div>
                {calendar.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {calendar.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEditCalendar(calendar)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteCalendar(calendar.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Non-working days */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Jours non ouvrés ({calendar.nonWorkingDays?.length || 0})
                </span>
                <Button size="sm" variant="secondary" onClick={() => handleOpenAddDay(calendar)}>
                  <Plus size={12} />
                </Button>
              </div>
              {calendar.nonWorkingDays && calendar.nonWorkingDays.length > 0 && (
                <div className="space-y-1">
                  {calendar.nonWorkingDays.map(day => (
                    <div key={day.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-700 rounded p-2">
                      <span>{new Date(day.date).toLocaleDateString('fr-FR')} - {day.name || 'Jour férié'}</span>
                      {day.isRecurring && <span className="text-slate-400">Récurrent</span>}
                      <button
                        onClick={() => deleteNonWorkingDay(day.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Working hours */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Heures de travail
                </span>
                <Button size="sm" variant="secondary" onClick={() => handleOpenAddHours(calendar)}>
                  <Plus size={12} />
                </Button>
              </div>
              {calendar.workingHours && calendar.workingHours.length > 0 && (
                <div className="space-y-1">
                  {calendar.workingHours
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map(hours => {
                      const day = daysOfWeek.find(d => d.value === hours.dayOfWeek);
                      return (
                        <div key={hours.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-700 rounded p-2">
                          <div className="flex items-center gap-2">
                            {hours.isWorkingDay ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <X size={12} className="text-slate-400" />
                            )}
                            <span>{day?.label}: {hours.startTime} - {hours.endTime}</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingHours({ ...hours, calendarId: calendar.id });
                              setIsHoursModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-indigo-500"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title={editingCalendar.id ? "Modifier le calendrier" : "Nouveau calendrier"}
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={editingCalendar.name || ''}
            onChange={(e) => setEditingCalendar({ ...editingCalendar, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={editingCalendar.description || ''}
            onChange={(e) => setEditingCalendar({ ...editingCalendar, description: e.target.value })}
          />
          <Checkbox
            label="Calendrier par défaut"
            checked={editingCalendar.isDefault || false}
            onChange={(checked) => setEditingCalendar({ ...editingCalendar, isDefault: checked })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCalendarModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveCalendar}>
              {editingCalendar.id ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Non-working day Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title="Ajouter un jour non ouvré"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={editingDay.date || ''}
            onChange={(e) => setEditingDay({ ...editingDay, date: e.target.value })}
            required
          />
          <Input
            label="Nom (optionnel)"
            value={editingDay.name || ''}
            onChange={(e) => setEditingDay({ ...editingDay, name: e.target.value })}
            placeholder="Ex: Jour férié, Noël..."
          />
          <Checkbox
            label="Récurrent (annuel)"
            checked={editingDay.isRecurring || false}
            onChange={(checked) => setEditingDay({ ...editingDay, isRecurring: checked })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDayModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveDay}>
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Working hours Modal */}
      <Modal
        isOpen={isHoursModalOpen}
        onClose={() => setIsHoursModalOpen(false)}
        title={editingHours.id ? "Modifier les heures" : "Ajouter des heures de travail"}
      >
        <div className="space-y-4">
          <Dropdown
            label="Jour de la semaine"
            value={editingHours.dayOfWeek?.toString() || ''}
            onChange={(value) => setEditingHours({ ...editingHours, dayOfWeek: parseInt(value) })}
            options={daysOfWeek.map(d => ({ label: d.label, value: d.value.toString() }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Heure de début"
              type="time"
              value={editingHours.startTime || '09:00'}
              onChange={(e) => setEditingHours({ ...editingHours, startTime: e.target.value })}
              required
            />
            <Input
              label="Heure de fin"
              type="time"
              value={editingHours.endTime || '18:00'}
              onChange={(e) => setEditingHours({ ...editingHours, endTime: e.target.value })}
              required
            />
          </div>
          <Checkbox
            label="Jour ouvré"
            checked={editingHours.isWorkingDay !== false}
            onChange={(checked) => setEditingHours({ ...editingHours, isWorkingDay: checked })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsHoursModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveHours}>
              {editingHours.id ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

