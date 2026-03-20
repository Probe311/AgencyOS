import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Search, Calendar, User, Activity, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ActivityLogService, ActivityLog, ActivityLogFilters, ActivityLogStats } from '../../lib/services/activityLogService';
import { useApp } from '../contexts/AppContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const ActivityLogsView: React.FC = () => {
  const { showToast, users } = useApp();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Filtres
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLogs();
    loadActionTypes();
    loadResourceTypes();
    loadStats();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await ActivityLogService.getLogs(
        filters,
        pageSize,
        (page - 1) * pageSize
      );
      setLogs(result.logs);
      setTotal(result.total);
    } catch (error: any) {
      showToast(`Erreur lors du chargement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadActionTypes = async () => {
    try {
      const types = await ActivityLogService.getActionTypes();
      setActionTypes(types);
    } catch (error) {
      console.error('Error loading action types:', error);
    }
  };

  const loadResourceTypes = async () => {
    try {
      const types = await ActivityLogService.getResourceTypes();
      setResourceTypes(types);
    } catch (error) {
      console.error('Error loading resource types:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await ActivityLogService.getStats(filters, 'month');
      setStats(statistics);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await ActivityLogService.exportToCSV(filters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Export CSV réussi', 'success');
    } catch (error: any) {
      showToast(`Erreur lors de l'export: ${error.message}`, 'error');
    }
  };

  const handleExportJSON = async () => {
    try {
      const json = await ActivityLogService.exportToJSON(filters);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Export JSON réussi', 'success');
    } catch (error: any) {
      showToast(`Erreur lors de l'export: ${error.message}`, 'error');
    }
  };

  const handleFilterChange = (key: keyof ActivityLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString));
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('create') || actionType.includes('add')) return 'green';
    if (actionType.includes('update') || actionType.includes('edit')) return 'blue';
    if (actionType.includes('delete') || actionType.includes('remove')) return 'red';
    if (actionType.includes('view') || actionType.includes('read')) return 'slate';
    return 'gray';
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Logs d'activité</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {total} log{total > 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={BarChart3}
            onClick={() => setIsStatsModalOpen(true)}
          >
            Statistiques
          </Button>
          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportJSON}
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={loadLogs}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recherche
              </label>
              <Input
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Rechercher..."
                icon={Search}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Utilisateur
              </label>
              <Dropdown
                value={filters.user_id || ''}
                onChange={(value) => handleFilterChange('user_id', value)}
                options={[
                  { value: '', label: 'Tous' },
                  ...users.map(u => ({ value: u.id, label: u.name || u.email })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type d'action
              </label>
              <Dropdown
                value={filters.action_type || ''}
                onChange={(value) => handleFilterChange('action_type', value)}
                options={[
                  { value: '', label: 'Tous' },
                  ...actionTypes.map(type => ({ value: type, label: type })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type de ressource
              </label>
              <Dropdown
                value={filters.resource_type || ''}
                onChange={(value) => handleFilterChange('resource_type', value)}
                options={[
                  { value: '', label: 'Tous' },
                  ...resourceTypes.map(type => ({ value: type, label: type })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date début
              </label>
              <Input
                type="datetime-local"
                value={filters.start_date ? new Date(filters.start_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date fin
              </label>
              <Input
                type="datetime-local"
                value={filters.end_date ? new Date(filters.end_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Réinitialiser
            </Button>
          </div>
        </div>
      )}

      {/* Liste des logs */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ressource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Détails
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Chargement...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Aucun log trouvé
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {log.user?.avatar_url ? (
                          <img
                            src={log.user.avatar_url}
                            alt={log.user_name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                            <User size={14} />
                          </div>
                        )}
                        <span className="text-slate-900 dark:text-white">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        variant={getActionColor(log.action_type) as any}
                        size="sm"
                      >
                        {log.action_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {log.resource_type}
                      {log.resource_id && (
                        <span className="ml-2 text-xs text-slate-400">
                          ({log.resource_id.slice(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {Object.keys(log.details || {}).length > 0 ? (
                        <span className="text-xs">
                          {Object.keys(log.details).length} champ{Object.keys(log.details).length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FileText}
                        onClick={() => setSelectedLog(log)}
                      >
                        Détails
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Page {page} sur {Math.ceil(total / pageSize)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Détails du log"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <p className="text-sm text-slate-900 dark:text-white">
                  {formatDate(selectedLog.timestamp)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Utilisateur
                </label>
                <p className="text-sm text-slate-900 dark:text-white">
                  {selectedLog.user_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Action
                </label>
                <Badge variant={getActionColor(selectedLog.action_type) as any}>
                  {selectedLog.action_type}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ressource
                </label>
                <p className="text-sm text-slate-900 dark:text-white">
                  {selectedLog.resource_type}
                </p>
              </div>
              {selectedLog.resource_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ID Ressource
                  </label>
                  <p className="text-sm text-slate-900 dark:text-white font-mono">
                    {selectedLog.resource_id}
                  </p>
                </div>
              )}
              {selectedLog.ip_address && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Adresse IP
                  </label>
                  <p className="text-sm text-slate-900 dark:text-white font-mono">
                    {selectedLog.ip_address}
                  </p>
                </div>
              )}
            </div>
            {Object.keys(selectedLog.details || {}).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Détails
                </label>
                <pre className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.user_agent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  User Agent
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal des statistiques */}
      {stats && (
        <Modal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          title="Statistiques des logs"
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total_logs}
                </p>
              </div>
            </div>

            {/* Graphique par action */}
            {Object.keys(stats.logs_by_action).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Répartition par action
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(stats.logs_by_action).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Graphique par ressource */}
            {Object.keys(stats.logs_by_resource).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Répartition par ressource
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.logs_by_resource).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(stats.logs_by_resource).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Graphique temporel */}
            {stats.logs_by_day.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Évolution dans le temps
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.logs_by_day}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

