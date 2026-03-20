import React, { useState } from 'react';
import { Flag, Plus, Edit2, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Milestone, Project } from '../../types';
import { useMilestones } from '../../lib/supabase/hooks/useMilestones';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';

interface MilestonesViewProps {
  projectId: string;
  project?: Project;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({ projectId, project }) => {
  const { milestones, getMilestonesByProject, addMilestone, updateMilestone, deleteMilestone } = useMilestones();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Partial<Milestone>>({});

  const projectMilestones = getMilestonesByProject(projectId);

  const handleOpenCreate = () => {
    setEditingMilestone({
      projectId,
      name: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'upcoming',
      color: '#6366f1',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone.name || !editingMilestone.dueDate) return;

    try {
      if (editingMilestone.id) {
        await updateMilestone(editingMilestone.id, editingMilestone);
      } else {
        await addMilestone({
          projectId: editingMilestone.projectId!,
          name: editingMilestone.name!,
          description: editingMilestone.description,
          dueDate: editingMilestone.dueDate!,
          status: editingMilestone.status || 'upcoming',
          color: editingMilestone.color || '#6366f1',
        });
      }
      setIsModalOpen(false);
      setEditingMilestone({});
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case 'in_progress':
        return <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />;
      case 'overdue':
        return <AlertCircle size={16} className="text-red-600 dark:text-red-400" />;
      default:
        return <Flag size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return 'emerald';
      case 'in_progress':
        return 'indigo';
      case 'overdue':
        return 'red';
      default:
        return 'slate';
    }
  };

  // Check if milestone is overdue
  const checkMilestoneStatus = (milestone: Milestone) => {
    const today = new Date();
    const dueDate = new Date(milestone.dueDate);
    
    if (milestone.status === 'completed') return milestone.status;
    if (dueDate < today && milestone.status !== 'completed') {
      return 'overdue';
    }
    if (dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return 'in_progress';
    }
    return milestone.status;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-slate-600 dark:text-slate-400" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            Jalons ({projectMilestones.length})
          </h4>
        </div>
        <Button size="sm" icon={Plus} onClick={handleOpenCreate}>
          Ajouter
        </Button>
      </div>

      {projectMilestones.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Aucun jalon défini
        </p>
      ) : (
        <div className="space-y-3">
          {projectMilestones.map(milestone => {
            const currentStatus = checkMilestoneStatus(milestone);
            if (currentStatus !== milestone.status) {
              updateMilestone(milestone.id, { status: currentStatus });
            }

            return (
              <div
                key={milestone.id}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 group"
                style={{ borderLeftColor: milestone.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(currentStatus)}
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">
                        {milestone.name}
                      </h5>
                      <Badge variant={getStatusColor(currentStatus)} className="text-xs">
                        {currentStatus === 'upcoming' && 'À venir'}
                        {currentStatus === 'in_progress' && 'En cours'}
                        {currentStatus === 'completed' && 'Terminé'}
                        {currentStatus === 'overdue' && 'En retard'}
                      </Badge>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {milestone.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                      <span>
                        Échéance: {new Date(milestone.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                      onClick={() => handleOpenEdit(milestone)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteMilestone(milestone.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMilestone.id ? "Modifier le jalon" : "Nouveau jalon"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom"
            value={editingMilestone.name || ''}
            onChange={(e) => setEditingMilestone({ ...editingMilestone, name: e.target.value })}
            placeholder="Nom du jalon"
            required
          />
          <Textarea
            label="Description"
            value={editingMilestone.description || ''}
            onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
            placeholder="Description (optionnel)"
          />
          <Input
            label="Date d'échéance"
            type="date"
            value={editingMilestone.dueDate || ''}
            onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })}
            required
          />
          <Dropdown
            label="Statut"
            value={editingMilestone.status || 'upcoming'}
            onChange={(value) => setEditingMilestone({ ...editingMilestone, status: value as Milestone['status'] })}
            options={[
              { label: 'À venir', value: 'upcoming' },
              { label: 'En cours', value: 'in_progress' },
              { label: 'Terminé', value: 'completed' },
              { label: 'En retard', value: 'overdue' },
            ]}
          />
          <Input
            label="Couleur"
            type="color"
            value={editingMilestone.color || '#6366f1'}
            onChange={(e) => setEditingMilestone({ ...editingMilestone, color: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingMilestone.id ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

