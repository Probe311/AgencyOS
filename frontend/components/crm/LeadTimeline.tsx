import React from 'react';
import { useLeadActivities, ActivityType } from '../../lib/supabase/hooks/useLeadActivities';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Loader } from '../ui/Loader';

interface LeadTimelineProps {
  leadId: string;
  onActivityCreated?: () => void;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  email_sent: 'Email envoyé',
  email_received: 'Email reçu',
  email_opened: 'Email ouvert',
  email_clicked: 'Email cliqué',
  call_made: 'Appel effectué',
  call_received: 'Appel reçu',
  call_missed: 'Appel manqué',
  meeting_scheduled: 'Rendez-vous planifié',
  meeting_completed: 'Rendez-vous terminé',
  meeting_cancelled: 'Rendez-vous annulé',
  note_added: 'Note ajoutée',
  task_created: 'Tâche créée',
  task_completed: 'Tâche terminée',
  stage_changed: 'Étape changée',
  status_changed: 'Statut changé',
  value_updated: 'Valeur mise à jour',
  document_sent: 'Document envoyé',
  document_viewed: 'Document consulté',
  document_signed: 'Document signé',
  quote_sent: 'Devis envoyé',
  quote_viewed: 'Devis consulté',
  quote_accepted: 'Devis accepté',
  quote_rejected: 'Devis refusé',
  invoice_sent: 'Facture envoyée',
  invoice_paid: 'Facture payée',
  contact_created: 'Contact créé',
  contact_updated: 'Contact mis à jour',
  enrichment_updated: 'Enrichissement mis à jour',
  score_updated: 'Score mis à jour',
  custom: 'Activité personnalisée',
};

const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  email_sent: '📧',
  email_received: '📥',
  email_opened: '👁️',
  email_clicked: '🖱️',
  call_made: '📞',
  call_received: '📞',
  call_missed: '📞❌',
  meeting_scheduled: '📅',
  meeting_completed: '✅',
  meeting_cancelled: '❌',
  note_added: '📝',
  task_created: '➕',
  task_completed: '✅',
  stage_changed: '🔄',
  status_changed: '🔄',
  value_updated: '💰',
  document_sent: '📄',
  document_viewed: '👁️',
  document_signed: '✍️',
  quote_sent: '📋',
  quote_viewed: '👁️',
  quote_accepted: '✅',
  quote_rejected: '❌',
  invoice_sent: '🧾',
  invoice_paid: '💳',
  contact_created: '👤',
  contact_updated: '✏️',
  enrichment_updated: '🔍',
  score_updated: '⭐',
  custom: '📌',
};

export const LeadTimeline: React.FC<LeadTimelineProps> = ({ leadId, onActivityCreated }) => {
  const { activities, loading, createActivity } = useLeadActivities(leadId);
  const { users } = useUsers();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    activity_type: 'note_added' as ActivityType,
    title: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createActivity(
        leadId,
        formData.activity_type,
        formData.title,
        formData.description
      );
      setFormData({ activity_type: 'note_added', title: '', description: '' });
      setShowAddForm(false);
      onActivityCreated?.();
    } catch (error) {
      console.error('Erreur création activité:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserName = (userId?: string | null) => {
    if (!userId) return 'Système';
    const user = users.find(u => u.id === userId);
    return user?.name || 'Utilisateur inconnu';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Timeline des interactions</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Annuler' : '+ Ajouter une activité'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg space-y-3">
          <Dropdown
            label="Type d'activité"
            value={formData.activity_type}
            onChange={(value) => setFormData({ ...formData, activity_type: value as ActivityType })}
            options={Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
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
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm">
              Ajouter
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune activité enregistrée pour ce lead.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-500"
            >
              <div className="flex-shrink-0 text-2xl">
                {ACTIVITY_TYPE_ICONS[activity.activity_type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <Badge variant="secondary" size="sm">
                        {ACTIVITY_TYPE_LABELS[activity.activity_type]}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{getUserName(activity.user_id)}</span>
                      <span>•</span>
                      <span>{formatDate(activity.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

