import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Save, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { ApprovalWorkflowConfig, ApprovalStep, ApprovalRole } from './ApprovalWorkflow';
import { useApp } from '../contexts/AppContext';

interface ApprovalWorkflowConfiguratorProps {
  workflow?: ApprovalWorkflowConfig;
  onSave: (workflow: ApprovalWorkflowConfig) => void;
  onClose: () => void;
}

const ROLES: { value: ApprovalRole; label: string }[] = [
  { value: 'rédacteur', label: 'Rédacteur' },
  { value: 'éditeur', label: 'Éditeur' },
  { value: 'approbateur', label: 'Approbateur' },
  { value: 'client', label: 'Client' },
];

export const ApprovalWorkflowConfigurator: React.FC<ApprovalWorkflowConfiguratorProps> = ({
  workflow,
  onSave,
  onClose,
}) => {
  const { showToast, users } = useApp();
  const [name, setName] = useState(workflow?.name || 'Workflow d\'approbation');
  const [steps, setSteps] = useState<ApprovalStep[]>(
    workflow?.steps || [
      {
        id: `step-${Date.now()}`,
        name: 'Révision éditoriale',
        role: 'éditeur',
        status: 'pending',
        order: 1,
      },
    ]
  );

  const addStep = () => {
    const newStep: ApprovalStep = {
      id: `step-${Date.now()}-${Math.random()}`,
      name: 'Nouvelle étape',
      role: 'approbateur',
      status: 'pending',
      order: steps.length + 1,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    const updatedSteps = steps
      .filter(s => s.id !== stepId)
      .map((s, index) => ({ ...s, order: index + 1 }));
    setSteps(updatedSteps);
  };

  const updateStep = (stepId: string, updates: Partial<ApprovalStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(reorderedSteps);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast('Veuillez entrer un nom pour le workflow', 'error');
      return;
    }

    if (steps.length === 0) {
      showToast('Veuillez ajouter au moins une étape', 'error');
      return;
    }

    const config: ApprovalWorkflowConfig = {
      id: workflow?.id || `workflow-${Date.now()}`,
      name: name.trim(),
      steps,
      isActive: workflow?.isActive ?? true,
    };

    onSave(config);
    showToast('Workflow enregistré avec succès', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <Input
          label="Nom du workflow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Workflow standard"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Étapes d'approbation</h3>
          <Button size="sm" icon={Plus} onClick={addStep}>
            Ajouter une étape
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <GripVertical size={16} className="text-slate-400 cursor-move" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Étape {step.order}
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => removeStep(step.id)}
                  className="text-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nom de l'étape"
                  value={step.name}
                  onChange={(e) => updateStep(step.id, { name: e.target.value })}
                  placeholder="ex: Révision éditoriale"
                />
                <Dropdown
                  label="Rôle"
                  value={step.role}
                  onChange={(value) => updateStep(step.id, { role: value as ApprovalRole })}
                  options={ROLES.map(r => ({ label: r.label, value: r.value }))}
                />
              </div>

              {step.userId && (
                <div className="mt-3">
                  <Dropdown
                    label="Utilisateur assigné"
                    value={step.userId}
                    onChange={(value) => updateStep(step.id, { userId: value })}
                    options={users.map(u => ({ label: u.name, value: u.id }))}
                  />
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveStep(step.id, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveStep(step.id, 'down')}
                  disabled={index === steps.length - 1}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>

        {steps.length === 0 && (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="mb-2">Aucune étape configurée</p>
            <Button size="sm" icon={Plus} onClick={addStep}>
              Ajouter la première étape
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button icon={Save} onClick={handleSave}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
};

