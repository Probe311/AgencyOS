import React, { useState, useMemo } from 'react';
import { Clock, User, Briefcase, Calendar, TrendingUp, DollarSign, Download } from 'lucide-react';
import { useTimeEntries } from '../../lib/supabase/hooks/useTimeEntries';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { useProjectsHierarchy } from '../../lib/supabase/hooks/useProjectsHierarchy';
import { TimeEntry, User as UserType } from '../../types';
import { Dropdown } from '../ui/Dropdown';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CustomBarChart } from '../charts/CustomBarChart';
import { exportToCSV } from '../../lib/utils/export';

interface TimeReportsProps {
  startDate?: string;
  endDate?: string;
  userId?: string;
  projectId?: string;
}

export const TimeReports: React.FC<TimeReportsProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  userId: initialUserId,
  projectId: initialProjectId,
}) => {
  const { timeEntries, getTimeEntriesByUser, getTimeEntriesByProject } = useTimeEntries();
  const { users } = useUsers();
  const { projects } = useProjectsHierarchy();
  
  const [startDate, setStartDate] = useState(initialStartDate || new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEndDate || new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(initialUserId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [viewMode, setViewMode] = useState<'user' | 'project' | 'overview'>('overview');

  // Filter time entries
  const filteredEntries = useMemo(() => {
    let filtered = [...timeEntries];
    
    // Filter by date range
    filtered = filtered.filter(e => e.date >= startDate && e.date <= endDate);
    
    // Filter by user
    if (selectedUserId) {
      filtered = filtered.filter(e => e.userId === selectedUserId);
    }
    
    // Filter by project
    if (selectedProjectId) {
      filtered = filtered.filter(e => e.projectId === selectedProjectId);
    }
    
    return filtered;
  }, [timeEntries, startDate, endDate, selectedUserId, selectedProjectId]);

  // Calculate totals
  const totalMinutes = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + e.duration, 0);
  }, [filteredEntries]);

  const totalHours = (totalMinutes / 60).toFixed(2);
  const totalBillableHours = useMemo(() => {
    const billable = filteredEntries.filter(e => e.billable);
    const minutes = billable.reduce((sum, e) => sum + e.duration, 0);
    return (minutes / 60).toFixed(2);
  }, [filteredEntries]);

  const totalRevenue = useMemo(() => {
    return filteredEntries
      .filter(e => e.billable && e.hourlyRate)
      .reduce((sum, e) => sum + (e.duration / 60) * (e.hourlyRate || 0), 0);
  }, [filteredEntries]);

  // Group by user
  const timeByUser = useMemo(() => {
    const grouped: Record<string, { user: UserType, minutes: number, entries: TimeEntry[] }> = {};
    
    filteredEntries.forEach(entry => {
      const user = users.find(u => u.id === entry.userId);
      if (user) {
        if (!grouped[entry.userId]) {
          grouped[entry.userId] = { user, minutes: 0, entries: [] };
        }
        grouped[entry.userId].minutes += entry.duration;
        grouped[entry.userId].entries.push(entry);
      }
    });
    
    return Object.values(grouped).sort((a, b) => b.minutes - a.minutes);
  }, [filteredEntries, users]);

  // Group by project
  const timeByProject = useMemo(() => {
    const grouped: Record<string, { projectName: string, minutes: number, entries: TimeEntry[] }> = {};
    
    filteredEntries.forEach(entry => {
      if (entry.projectId) {
        const project = projects.find(p => p.id === entry.projectId);
        const projectName = project?.name || 'Projet inconnu';
        
        if (!grouped[entry.projectId]) {
          grouped[entry.projectId] = { projectName, minutes: 0, entries: [] };
        }
        grouped[entry.projectId].minutes += entry.duration;
        grouped[entry.projectId].entries.push(entry);
      }
    });
    
    return Object.values(grouped).sort((a, b) => b.minutes - a.minutes);
  }, [filteredEntries, projects]);

  // Chart data for users
  const userChartData = useMemo(() => {
    return timeByUser.map(item => ({
      name: item.user.name,
      value: parseFloat((item.minutes / 60).toFixed(2)),
    }));
  }, [timeByUser]);

  // Chart data for projects
  const projectChartData = useMemo(() => {
    return timeByProject.map(item => ({
      name: item.projectName,
      value: parseFloat((item.minutes / 60).toFixed(2)),
    }));
  }, [timeByProject]);

  const handleExportCSV = async () => {
    const csvData = filteredEntries.map(e => {
      const user = users.find(u => u.id === e.userId);
      const project = projects.find(p => p.id === e.projectId);
      return {
        Date: e.date,
        Utilisateur: user?.name || 'Inconnu',
        Projet: project?.name || '-',
        Tâche: e.taskId || '-',
        'Durée (h)': (e.duration / 60).toFixed(2),
        Facturable: e.billable ? 'Oui' : 'Non',
        'Taux horaire': e.hourlyRate?.toFixed(2) || '-',
        Description: e.description || '',
      };
    });

    await exportToCSV(csvData, `rapport-temps-${startDate}-${endDate}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Date début"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            icon={Calendar}
          />
          <Input
            label="Date fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            icon={Calendar}
          />
          <Dropdown
            label="Utilisateur"
            value={selectedUserId || ''}
            onChange={(value) => setSelectedUserId(value || undefined)}
            options={[
              { label: 'Tous', value: '' },
              ...users.map(u => ({ label: u.name, value: u.id }))
            ]}
          />
          <Dropdown
            label="Projet"
            value={selectedProjectId || ''}
            onChange={(value) => setSelectedProjectId(value || undefined)}
            options={[
              { label: 'Tous', value: '' },
              ...projects.map(p => ({ label: p.name, value: p.id }))
            ]}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant={viewMode === 'overview' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            Vue d'ensemble
          </Button>
          <Button
            variant={viewMode === 'user' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('user')}
          >
            Par utilisateur
          </Button>
          <Button
            variant={viewMode === 'project' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('project')}
          >
            Par projet
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportCSV}
            className="ml-auto"
          >
            Exporter CSV
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
              <Clock className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total temps</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalHours} h</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
              <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Temps facturable</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalBillableHours} h</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
              <DollarSign className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Revenus estimés</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalRevenue.toFixed(2)} €</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <User className="text-slate-600 dark:text-slate-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Entrées</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{filteredEntries.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Details */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <User size={18} />
              Temps par utilisateur
            </h3>
            {userChartData.length > 0 ? (
              <CustomBarChart 
                data={userChartData} 
                bars={[{ key: 'value', color: '#6366f1', name: 'Heures' }]}
                height={300}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Aucune donnée</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Briefcase size={18} />
              Temps par projet
            </h3>
            {projectChartData.length > 0 ? (
              <CustomBarChart 
                data={projectChartData} 
                bars={[{ key: 'value', color: '#8b5cf6', name: 'Heures' }]}
                height={300}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Aucune donnée</p>
            )}
          </Card>
        </div>
      )}

      {viewMode === 'user' && (
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Détail par utilisateur</h3>
          <div className="space-y-4">
            {timeByUser.map(item => (
              <div key={item.user.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.user.avatar}
                      alt={item.user.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.user.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {(item.minutes / 60).toFixed(2)} h
                    </p>
                    <p className="text-xs text-slate-400">{item.entries.length} entrée(s)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {viewMode === 'project' && (
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Détail par projet</h3>
          <div className="space-y-4">
            {timeByProject.map((item, index) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.projectName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.entries.length} entrée(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {(item.minutes / 60).toFixed(2)} h
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

