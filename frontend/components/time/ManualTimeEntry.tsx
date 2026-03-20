import React, { useState } from 'react';
import { Clock, Calendar, FileText, DollarSign, Save, X } from 'lucide-react';
import { TimeEntry, Task } from '../../types';
import { useTimeEntries } from '../../lib/supabase/hooks/useTimeEntries';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';

interface ManualTimeEntryProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  projectId?: string;
  userId?: string;
  onSave?: (entry: TimeEntry) => void;
}

export const ManualTimeEntry: React.FC<ManualTimeEntryProps> = ({
  isOpen,
  onClose,
  task,
  projectId,
  userId,
  onSave,
}) => {
  const { addTimeEntry } = useTimeEntries();
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0) {
      return;
    }

    if (!task?.id && !projectId) {
      return;
    }

    setSaving(true);
    try {
      const entry = await addTimeEntry({
        taskId: task?.id || '',
        projectId: projectId,
        userId: userId || '',
        duration: totalMinutes,
        date,
        description: description || undefined,
        billable,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      });

      if (entry && onSave) {
        onSave(entry);
      }

      // Reset form
      setHours('');
      setMinutes('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setBillable(true);
      setHourlyRate('');
      onClose();
    } catch (error) {
      console.error('Error saving time entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
  const totalHours = (totalMinutes / 60).toFixed(2);
  const estimatedCost = billable && hourlyRate 
    ? (parseFloat(totalHours) * parseFloat(hourlyRate)).toFixed(2)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Saisie manuelle du temps"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {task && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tâche: {task.title}
            </p>
            {task.client && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Client: {task.client}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              Heures
            </label>
            <Input
              type="number"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              Minutes
            </label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              required
            />
          </div>
        </div>

        {totalMinutes > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-500/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-500/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Total:
              </span>
              <span className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                {totalHours} h
              </span>
            </div>
            {estimatedCost && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-500/30">
                <span className="text-sm text-indigo-600 dark:text-indigo-400">
                  Coût estimé:
                </span>
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  {estimatedCost} €
                </span>
              </div>
            )}
          </div>
        )}

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          icon={Calendar}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description du travail effectué..."
          icon={FileText}
        />

        <div className="space-y-3">
          <Checkbox
            label="Facturable"
            checked={billable}
            onChange={(checked) => setBillable(checked)}
          />

          {billable && (
            <Input
              label="Taux horaire (€)"
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="0.00"
              icon={DollarSign}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" icon={Save} disabled={saving || totalMinutes <= 0}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

