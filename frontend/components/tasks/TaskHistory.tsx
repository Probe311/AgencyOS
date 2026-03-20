import React, { useState, useEffect } from 'react';
import { History, User } from 'lucide-react';
import { TaskHistory as TaskHistoryType } from '../../types';
import { useTaskHistory } from '../../lib/supabase/hooks/useTaskHistory';
import { getUserAvatar } from '../../lib/utils/avatar';
import { Loader } from '../ui/Loader';

interface TaskHistoryProps {
  taskId: string;
}

const ACTION_LABELS: Record<string, string> = {
  'created': 'Tâche créée',
  'updated': 'Tâche modifiée',
  'status_changed': 'Statut modifié',
  'priority_changed': 'Priorité modifiée',
  'title_changed': 'Titre modifié',
  'description_changed': 'Description modifiée',
  'assignee_changed': 'Assignation modifiée',
  'due_date_changed': 'Date d\'échéance modifiée',
  'start_date_changed': 'Date de début modifiée',
  'tag_added': 'Tag ajouté',
  'tag_removed': 'Tag retiré',
  'attachment_added': 'Pièce jointe ajoutée',
  'attachment_removed': 'Pièce jointe retirée',
  'deleted': 'Tâche supprimée',
};

const formatFieldValue = (field: string, value: string | undefined): string => {
  if (!value) return '-';
  
  // Format dates
  if (field.includes('date') || field.includes('Date')) {
    try {
      return new Date(value).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }
  
  return value;
};

export const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const { getTaskHistory } = useTaskHistory();
  const [history, setHistory] = useState<TaskHistoryType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [taskId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const taskHistory = await getTaskHistory(taskId);
      setHistory(taskHistory);
    } catch (error) {
      console.error('Error loading task history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size="sm" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Aucun historique disponible pour cette tâche
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {entry.userAvatar ? (
                <img
                  src={entry.userAvatar}
                  alt={entry.userName || 'User'}
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-600"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border-2 border-white dark:border-slate-600">
                  <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {entry.userName || 'Utilisateur inconnu'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                {ACTION_LABELS[entry.action] || entry.action}
              </p>
              {entry.fieldName && entry.oldValue !== undefined && entry.newValue !== undefined && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 line-through">
                      {formatFieldValue(entry.fieldName, entry.oldValue)}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {formatFieldValue(entry.fieldName, entry.newValue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

