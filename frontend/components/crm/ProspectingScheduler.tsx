import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Building, X, Save, Trash2, Play, Pause } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { useScheduledProspecting, ScheduledProspectingSearch } from '../../lib/supabase/hooks/useScheduledProspecting';

interface ProspectingSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  initialZone?: string;
  initialActivity?: string;
}

const SECTORS = [
  'Agences Marketing & Com',
  'Startups Tech / SaaS',
  'Commerce de détail / Retail',
  'Immobilier',
  'Santé & Bien-être',
  'BTP & Construction',
  'Restauration & Hôtellerie',
  'Services Juridiques',
  'Consulting & Audit',
  'Éducation & Formation',
  'Artisans & Services Locaux'
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export const ProspectingScheduler: React.FC<ProspectingSchedulerProps> = ({
  isOpen,
  onClose,
  initialZone = '',
  initialActivity = SECTORS[0],
}) => {
  const { scheduledSearches, createScheduledSearch, updateScheduledSearch, deleteScheduledSearch } = useScheduledProspecting();
  const [editingSearch, setEditingSearch] = useState<ScheduledProspectingSearch | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    zone: initialZone,
    activity: initialActivity,
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    day_of_week: null as number | null,
    day_of_month: null as number | null,
    time_of_day: '09:00',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSearch) {
        await updateScheduledSearch(editingSearch.id, {
          ...formData,
          time_of_day: `${formData.time_of_day}:00`,
        });
      } else {
        await createScheduledSearch({
          ...formData,
          time_of_day: `${formData.time_of_day}:00`,
        });
      }
      
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Erreur sauvegarde planification:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      zone: initialZone,
      activity: initialActivity,
      frequency: 'daily',
      day_of_week: null,
      day_of_month: null,
      time_of_day: '09:00',
      is_active: true,
    });
    setEditingSearch(null);
  };

  const handleEdit = (search: ScheduledProspectingSearch) => {
    setEditingSearch(search);
    setFormData({
      name: search.name,
      zone: search.zone,
      activity: search.activity,
      frequency: search.frequency,
      day_of_week: search.day_of_week || null,
      day_of_month: search.day_of_month || null,
      time_of_day: search.time_of_day.substring(0, 5),
      is_active: search.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette planification ?')) {
      return;
    }
    
    try {
      await deleteScheduledSearch(id);
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleToggleActive = async (search: ScheduledProspectingSearch) => {
    try {
      await updateScheduledSearch(search.id, { is_active: !search.is_active });
    } catch (error: any) {
      console.error('Erreur activation:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const formatNextRun = (dateString: string | null | undefined) => {
    if (!dateString) return 'Non planifié';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title={editingSearch ? 'Modifier la planification' : 'Planifier une recherche récurrente'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nom de la planification *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ex: Prospection Paris - Agences Marketing"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Zone géographique *"
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              placeholder="ex: Paris, Lyon"
              icon={MapPin}
              required
            />
            <Dropdown
              label="Secteur d'activité *"
              value={formData.activity}
              onChange={(value) => setFormData({ ...formData, activity: value })}
              options={SECTORS.map(s => ({ value: s, label: s }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Fréquence *"
              value={formData.frequency}
              onChange={(value) => {
                const freq = value as 'daily' | 'weekly' | 'monthly';
                setFormData({
                  ...formData,
                  frequency: freq,
                  day_of_week: freq === 'weekly' ? 1 : null,
                  day_of_month: freq === 'monthly' ? 1 : null,
                });
              }}
              options={[
                { value: 'daily', label: 'Quotidien' },
                { value: 'weekly', label: 'Hebdomadaire' },
                { value: 'monthly', label: 'Mensuel' },
              ]}
            />
            <Input
              label="Heure d'exécution *"
              type="time"
              value={formData.time_of_day}
              onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
              icon={Clock}
              required
            />
          </div>

          {formData.frequency === 'weekly' && (
            <Dropdown
              label="Jour de la semaine *"
              value={formData.day_of_week?.toString() || ''}
              onChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
              options={DAYS_OF_WEEK.map(d => ({ value: d.value.toString(), label: d.label }))}
            />
          )}

          {formData.frequency === 'monthly' && (
            <Input
              label="Jour du mois (1-31) *"
              type="number"
              min="1"
              max="31"
              value={formData.day_of_month || ''}
              onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || null })}
              required
            />
          )}

          <Checkbox
            id="is_active"
            label="Activer immédiatement"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Annuler
            </Button>
            <Button type="submit" icon={Save}>
              {editingSearch ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Liste des planifications */}
      {scheduledSearches.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Planifications actives</h3>
          {scheduledSearches.map((search) => (
            <div
              key={search.id}
              className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">{search.name}</h4>
                  <Badge variant={search.is_active ? 'success' : 'default'}>
                    {search.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} /> {search.zone} - <Building size={12} /> {search.activity}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    {search.frequency === 'daily' && 'Quotidien'}
                    {search.frequency === 'weekly' && `Hebdomadaire (${DAYS_OF_WEEK.find(d => d.value === search.day_of_week)?.label || 'N/A'})`}
                    {search.frequency === 'monthly' && `Mensuel (jour ${search.day_of_month})`}
                    {' à '}
                    <Clock size={12} />
                    {search.time_of_day.substring(0, 5)}
                  </div>
                  <div className="text-xs">
                    Prochaine exécution: {formatNextRun(search.next_run_at)}
                  </div>
                  <div className="text-xs">
                    {search.total_runs} exécution(s) - {search.total_leads_found} lead(s) trouvé(s)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(search)}
                  icon={search.is_active ? Pause : Play}
                >
                  {search.is_active ? 'Pause' : 'Activer'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(search)}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(search.id)}
                  icon={Trash2}
                  className="text-red-600 hover:text-red-700"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

