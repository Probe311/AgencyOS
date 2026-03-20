import React, { useState, useEffect } from 'react';
import { Link, Plus, X, ArrowRight, Calendar } from 'lucide-react';
import { TaskDependency, Task } from '../../types';
import { useTaskDependencies } from '../../lib/supabase/hooks/useTaskDependencies';
import { Dropdown } from '../ui/Dropdown';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface TaskDependenciesProps {
  taskId: string;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export const TaskDependencies: React.FC<TaskDependenciesProps> = ({
  taskId,
  tasks,
  onTaskClick,
}) => {
  const { dependencies, getDependenciesByTask, addDependency, deleteDependency } = useTaskDependencies();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'>('finish_to_start');
  const [lagDays, setLagDays] = useState('0');

  const taskDependencies = getDependenciesByTask(taskId);
  const availableTasks = tasks.filter(t => t.id !== taskId);

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;

    try {
      await addDependency({
        taskId,
        dependsOnTaskId: selectedTaskId,
        dependencyType,
        lagDays: parseInt(lagDays) || 0,
      });
      setIsModalOpen(false);
      setSelectedTaskId('');
      setLagDays('0');
    } catch (error) {
      console.error('Error adding dependency:', error);
    }
  };

  const getDependencyTypeLabel = (type: TaskDependency['dependencyType']) => {
    const labels = {
      'finish_to_start': 'Fin → Début',
      'start_to_start': 'Début → Début',
      'finish_to_finish': 'Fin → Fin',
      'start_to_finish': 'Début → Fin',
    };
    return labels[type];
  };

  const getDependentTask = (dependsOnTaskId: string) => {
    return tasks.find(t => t.id === dependsOnTaskId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link size={18} className="text-slate-600 dark:text-slate-400" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            Dépendances ({taskDependencies.length})
          </h4>
        </div>
        <Button
          size="sm"
          icon={Plus}
          onClick={() => setIsModalOpen(true)}
          disabled={availableTasks.length === 0}
        >
          Ajouter
        </Button>
      </div>

      {taskDependencies.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Aucune dépendance définie
        </p>
      ) : (
        <div className="space-y-2">
          {taskDependencies.map(dep => {
            const dependentTask = getDependentTask(dep.dependsOnTaskId);
            if (!dependentTask) return null;

            return (
              <div
                key={dep.id}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded">
                      <Link size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onTaskClick?.(dep.dependsOnTaskId)}
                        className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                      >
                        {dependentTask.title}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {getDependencyTypeLabel(dep.dependencyType)}
                        </span>
                        {dep.lagDays > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Calendar size={10} />
                              +{dep.lagDays} jour{dep.lagDays > 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteDependency(dep.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-500 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter une dépendance"
        size="md"
      >
        <div className="space-y-4">
          <Dropdown
            label="Tâche dépendante"
            value={selectedTaskId}
            onChange={(value) => setSelectedTaskId(value)}
            options={[
              { label: 'Sélectionner une tâche...', value: '' },
              ...availableTasks.map(t => ({ label: t.title, value: t.id }))
            ]}
          />

          <Dropdown
            label="Type de dépendance"
            value={dependencyType}
            onChange={(value) => setDependencyType(value as TaskDependency['dependencyType'])}
            options={[
              { label: 'Fin → Début (FS)', value: 'finish_to_start' },
              { label: 'Début → Début (SS)', value: 'start_to_start' },
              { label: 'Fin → Fin (FF)', value: 'finish_to_finish' },
              { label: 'Début → Fin (SF)', value: 'start_to_finish' },
            ]}
          />

          <Input
            label="Délai (jours)"
            type="number"
            min="0"
            value={lagDays}
            onChange={(e) => setLagDays(e.target.value)}
            placeholder="0"
            helpText="Délai en jours entre les deux tâches"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddDependency} disabled={!selectedTaskId}>
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

