import React, { useState } from 'react';
import { Briefcase, Flag, AlertTriangle, Clock, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Project } from '../../types';
import { MilestonesView } from './MilestonesView';
import { RisksView } from './RisksView';
import { TimeReports } from '../time/TimeReports';
import { useMilestones } from '../../lib/supabase/hooks/useMilestones';
import { useRisks } from '../../lib/supabase/hooks/useRisks';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ProjectDetailsViewProps {
  project: Project;
}

export const ProjectDetailsView: React.FC<ProjectDetailsViewProps> = ({ project }) => {
  const { getMilestonesByProject } = useMilestones();
  const { getRisksByProject } = useRisks();
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'risks' | 'time'>('overview');

  const milestones = getMilestonesByProject(project.id);
  const risks = getRisksByProject(project.id);
  const criticalRisks = risks.filter(r => r.impact === 'Critical' || r.impact === 'High');
  const upcomingMilestones = milestones.filter(m => m.status === 'upcoming' || m.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              {project.name}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Client: {project.client}
            </p>
            {project.description && (
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                {project.description}
              </p>
            )}
          </div>
          <Badge variant={project.status === 'active' ? 'success' : project.status === 'completed' ? 'info' : 'default'}>
            {project.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date de début</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date de fin</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Budget</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {project.budget ? `${project.budget.toLocaleString()} €` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Jalons</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {milestones.length} jalon{milestones.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
              <Flag className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Jalons à venir</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {upcomingMilestones.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Risques critiques</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {criticalRisks.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
              <Clock className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Temps total</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                - h
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'milestones'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Flag size={14} />
          Jalons
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'risks'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <AlertTriangle size={14} />
          Risques
        </button>
        <button
          onClick={() => setActiveTab('time')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'time'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={14} />
          Temps
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Flag size={18} />
                Jalons récents
              </h3>
              {upcomingMilestones.slice(0, 3).length > 0 ? (
                <div className="space-y-2">
                  {upcomingMilestones.slice(0, 3).map(milestone => (
                    <div key={milestone.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{milestone.name}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(milestone.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Aucun jalon à venir</p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                Risques critiques
              </h3>
              {criticalRisks.slice(0, 3).length > 0 ? (
                <div className="space-y-2">
                  {criticalRisks.slice(0, 3).map(risk => (
                    <div key={risk.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-500/10 rounded border border-red-200 dark:border-red-500/30">
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">{risk.title}</span>
                      <Badge variant="red" className="text-xs">{risk.impact}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Aucun risque critique</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'milestones' && (
          <MilestonesView projectId={project.id} project={project} />
        )}

        {activeTab === 'risks' && (
          <RisksView projectId={project.id} />
        )}

        {activeTab === 'time' && (
          <TimeReports projectId={project.id} />
        )}
      </div>
    </div>
  );
};

