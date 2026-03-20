import React, { useState, useMemo } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, User, Calendar, TrendingUp } from 'lucide-react';
import { Risk, Project, Task } from '../../types';
import { useRisks } from '../../lib/supabase/hooks/useRisks';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';

interface RisksViewProps {
  projectId: string;
  taskId?: string;
  tasks?: Task[];
}

export const RisksView: React.FC<RisksViewProps> = ({ projectId, taskId, tasks = [] }) => {
  const { risks, getRisksByProject, getRisksByTask, addRisk, updateRisk, deleteRisk } = useRisks();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Partial<Risk>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const projectRisks = taskId ? getRisksByTask(taskId) : getRisksByProject(projectId);
  
  const filteredRisks = useMemo(() => {
    if (filterStatus === 'all') return projectRisks;
    return projectRisks.filter(r => r.status === filterStatus);
  }, [projectRisks, filterStatus]);

  const handleOpenCreate = () => {
    setEditingRisk({
      projectId,
      taskId: taskId,
      title: '',
      probability: 50,
      impact: 'Medium',
      status: 'identified',
      identifiedDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRisk.title) return;

    try {
      if (editingRisk.id) {
        await updateRisk(editingRisk.id, editingRisk);
      } else {
        await addRisk({
          projectId: editingRisk.projectId!,
          taskId: editingRisk.taskId,
          title: editingRisk.title!,
          description: editingRisk.description,
          category: editingRisk.category,
          probability: editingRisk.probability || 50,
          impact: editingRisk.impact || 'Medium',
          status: editingRisk.status || 'identified',
          mitigationPlan: editingRisk.mitigationPlan,
          ownerId: editingRisk.ownerId,
          identifiedDate: editingRisk.identifiedDate || new Date().toISOString().split('T')[0],
          targetResolutionDate: editingRisk.targetResolutionDate,
        });
      }
      setIsModalOpen(false);
      setEditingRisk({});
    } catch (error) {
      console.error('Error saving risk:', error);
    }
  };

  const getImpactColor = (impact: Risk['impact']) => {
    switch (impact) {
      case 'Critical':
        return 'red';
      case 'High':
        return 'orange';
      case 'Medium':
        return 'yellow';
      default:
        return 'green';
    }
  };

  const getStatusColor = (status: Risk['status']) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'emerald';
      case 'mitigated':
        return 'indigo';
      case 'monitoring':
        return 'amber';
      default:
        return 'slate';
    }
  };

  const calculateRiskScore = (probability: number, impact: Risk['impact']) => {
    const impactMultiplier = {
      'Low': 1,
      'Medium': 2,
      'High': 3,
      'Critical': 4,
    };
    return (probability / 100) * impactMultiplier[impact] * 25; // Score 0-100
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-slate-600 dark:text-slate-400" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            Risques ({projectRisks.length})
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            value={filterStatus}
            onChange={(value) => setFilterStatus(value)}
            options={[
              { label: 'Tous', value: 'all' },
              { label: 'Identifié', value: 'identified' },
              { label: 'Surveillance', value: 'monitoring' },
              { label: 'Atténué', value: 'mitigated' },
              { label: 'Résolu', value: 'resolved' },
              { label: 'Fermé', value: 'closed' },
            ]}
            className="text-xs"
          />
          <Button size="sm" icon={Plus} onClick={handleOpenCreate}>
            Ajouter
          </Button>
        </div>
      </div>

      {filteredRisks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Aucun risque identifié
        </p>
      ) : (
        <div className="space-y-3">
          {filteredRisks.map(risk => {
            const riskScore = calculateRiskScore(risk.probability, risk.impact);
            const owner = risk.ownerId ? users.find(u => u.id === risk.ownerId) : null;

            return (
              <div
                key={risk.id}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle 
                        size={16} 
                        className={`${
                          riskScore > 60 ? 'text-red-600 dark:text-red-400' :
                          riskScore > 40 ? 'text-orange-600 dark:text-orange-400' :
                          riskScore > 20 ? 'text-amber-600 dark:text-amber-400' :
                          'text-slate-400'
                        }`}
                      />
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">
                        {risk.title}
                      </h5>
                      <Badge variant={getImpactColor(risk.impact)} className="text-xs">
                        {risk.impact}
                      </Badge>
                      <Badge variant={getStatusColor(risk.status)} className="text-xs">
                        {risk.status === 'identified' && 'Identifié'}
                        {risk.status === 'monitoring' && 'Surveillance'}
                        {risk.status === 'mitigated' && 'Atténué'}
                        {risk.status === 'resolved' && 'Résolu'}
                        {risk.status === 'closed' && 'Fermé'}
                      </Badge>
                    </div>
                    {risk.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {risk.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500 mb-2">
                      {risk.category && (
                        <span>Catégorie: {risk.category}</span>
                      )}
                      <span>Probabilité: {risk.probability}%</span>
                      <span className="font-bold">
                        Score: {riskScore.toFixed(0)}/100
                      </span>
                    </div>
                    {risk.mitigationPlan && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-500/10 rounded border border-amber-200 dark:border-amber-500/30">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                          Plan d'atténuation:
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {risk.mitigationPlan}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-500">
                      {owner && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span>{owner.name}</span>
                        </div>
                      )}
                      {risk.targetResolutionDate && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>Résolution: {new Date(risk.targetResolutionDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                      onClick={() => handleOpenEdit(risk)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteRisk(risk.id)}
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
        title={editingRisk.id ? "Modifier le risque" : "Nouveau risque"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Titre"
            value={editingRisk.title || ''}
            onChange={(e) => setEditingRisk({ ...editingRisk, title: e.target.value })}
            placeholder="Titre du risque"
            required
          />
          <Textarea
            label="Description"
            value={editingRisk.description || ''}
            onChange={(e) => setEditingRisk({ ...editingRisk, description: e.target.value })}
            placeholder="Description du risque..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Catégorie"
              value={editingRisk.category || ''}
              onChange={(value) => setEditingRisk({ ...editingRisk, category: value as Risk['category'] || undefined })}
              options={[
                { label: 'Sélectionner...', value: '' },
                { label: 'Technique', value: 'Technical' },
                { label: 'Planning', value: 'Schedule' },
                { label: 'Budget', value: 'Budget' },
                { label: 'Ressources', value: 'Resource' },
                { label: 'Qualité', value: 'Quality' },
                { label: 'Externe', value: 'External' },
                { label: 'Autre', value: 'Other' },
              ]}
            />
            <Dropdown
              label="Impact"
              value={editingRisk.impact || 'Medium'}
              onChange={(value) => setEditingRisk({ ...editingRisk, impact: value as Risk['impact'] })}
              options={[
                { label: 'Faible', value: 'Low' },
                { label: 'Moyen', value: 'Medium' },
                { label: 'Élevé', value: 'High' },
                { label: 'Critique', value: 'Critical' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Probabilité ({editingRisk.probability || 50}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={editingRisk.probability || 50}
                onChange={(e) => setEditingRisk({ ...editingRisk, probability: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            <Dropdown
              label="Statut"
              value={editingRisk.status || 'identified'}
              onChange={(value) => setEditingRisk({ ...editingRisk, status: value as Risk['status'] })}
              options={[
                { label: 'Identifié', value: 'identified' },
                { label: 'Surveillance', value: 'monitoring' },
                { label: 'Atténué', value: 'mitigated' },
                { label: 'Résolu', value: 'resolved' },
                { label: 'Fermé', value: 'closed' },
              ]}
            />
          </div>
          <Textarea
            label="Plan d'atténuation"
            value={editingRisk.mitigationPlan || ''}
            onChange={(e) => setEditingRisk({ ...editingRisk, mitigationPlan: e.target.value })}
            placeholder="Plan pour atténuer ou résoudre ce risque..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Propriétaire"
              value={editingRisk.ownerId || ''}
              onChange={(value) => setEditingRisk({ ...editingRisk, ownerId: value || undefined })}
              options={[
                { label: 'Non assigné', value: '' },
                ...users.map(u => ({ label: u.name, value: u.id }))
              ]}
            />
            <Input
              label="Date de résolution cible"
              type="date"
              value={editingRisk.targetResolutionDate || ''}
              onChange={(e) => setEditingRisk({ ...editingRisk, targetResolutionDate: e.target.value || undefined })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingRisk.id ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

