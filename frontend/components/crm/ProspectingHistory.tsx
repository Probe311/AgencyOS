import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Calendar, MapPin, Building, Download, Eye, X } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useScheduledProspecting, type ProspectingHistory as ProspectingHistoryType } from '../../lib/supabase/hooks/useScheduledProspecting';
import { exportLeads } from '../../lib/utils/exportLeads';

export const ProspectingHistory: React.FC = () => {
  const { history, loading } = useScheduledProspecting();
  const [selectedHistory, setSelectedHistory] = useState<ProspectingHistoryType | null>(null);
  const [exporting, setExporting] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-600" />;
      case 'failed':
        return <XCircle size={16} className="text-red-600" />;
      case 'running':
        return <Loader size={16} variant="minimal" className="text-blue-600" />;
      case 'cancelled':
        return <AlertCircle size={16} className="text-orange-600" />;
      default:
        return <Clock size={16} className="text-slate-400" />;
    }
  };

  const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'running':
        return 'info';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleExport = async (historyEntry: ProspectingHistoryType, format: 'csv' | 'json' | 'excel') => {
    setExporting(true);
    try {
      // Récupérer les leads de cette recherche depuis Supabase
      const { supabase } = await import('../../lib/supabase');
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('source', `Robot Prospection - ${historyEntry.zone} - ${historyEntry.activity}`)
        .gte('created_at', historyEntry.started_at)
        .lte('created_at', historyEntry.completed_at || new Date().toISOString());

      if (error) throw error;

      if (!leads || leads.length === 0) {
        alert('Aucun lead trouvé pour cette recherche');
        return;
      }

      await exportLeads(leads, {
        format,
        filename: `prospection_${historyEntry.zone}_${historyEntry.activity}_${historyEntry.started_at.split('T')[0]}.${format}`,
      });
    } catch (error: any) {
      console.error('Erreur export:', error);
      alert(`Erreur lors de l'export: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} />
          <div className="text-slate-400 dark:text-slate-500">Chargement de l'historique...</div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-400">
        <Calendar size={48} className="mb-4 opacity-50" />
        <p>Aucune recherche effectuée</p>
        <p className="text-sm mt-2">L'historique des recherches apparaîtra ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Historique des recherches</h3>
        <Badge variant="info">{history.length} recherche(s)</Badge>
      </div>

      <div className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-500"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(entry.status)}
                  <Badge variant={getStatusVariant(entry.status)}>
                    {entry.status === 'completed' && 'Terminé'}
                    {entry.status === 'failed' && 'Échoué'}
                    {entry.status === 'running' && 'En cours'}
                    {entry.status === 'cancelled' && 'Annulé'}
                  </Badge>
                  {entry.scheduled_search_id && (
                    <Badge variant="info">Planifié</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {entry.zone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building size={14} /> {entry.activity}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {formatDate(entry.started_at)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                  <span>{entry.leads_found} lead(s) trouvé(s)</span>
                  <span>{entry.leads_added} lead(s) ajouté(s)</span>
                  {entry.execution_time_seconds && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatDuration(entry.execution_time_seconds)}
                    </span>
                  )}
                </div>
                {entry.sources_used && entry.sources_used.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.sources_used.slice(0, 3).map((source, idx) => (
                      <Badge key={idx} variant="default" className="text-[10px]">
                        {source}
                      </Badge>
                    ))}
                    {entry.sources_used.length > 3 && (
                      <Badge variant="default" className="text-[10px]">
                        +{entry.sources_used.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {entry.error_message && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                    <strong>Erreur:</strong> {entry.error_message}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {entry.status === 'completed' && entry.leads_found > 0 && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(entry, 'csv')}
                      icon={Download}
                      disabled={exporting}
                      title="Exporter en CSV"
                    >
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(entry, 'json')}
                      icon={Download}
                      disabled={exporting}
                      title="Exporter en JSON"
                    >
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(entry, 'excel')}
                      icon={Download}
                      disabled={exporting}
                      title="Exporter en Excel"
                    >
                      Excel
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedHistory(entry)}
                  icon={Eye}
                >
                  Détails
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal détails */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedHistory(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Détails de la recherche</h3>
              <button
                onClick={() => setSelectedHistory(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Zone:</strong> {selectedHistory.zone}
              </div>
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Activité:</strong> {selectedHistory.activity}
              </div>
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Statut:</strong>{' '}
                <Badge variant={getStatusVariant(selectedHistory.status)}>{selectedHistory.status}</Badge>
              </div>
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Leads trouvés:</strong> {selectedHistory.leads_found}
              </div>
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Leads ajoutés:</strong> {selectedHistory.leads_added}
              </div>
              {selectedHistory.execution_time_seconds && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Durée:</strong> {formatDuration(selectedHistory.execution_time_seconds)}
                </div>
              )}
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Démarré le:</strong> {formatDate(selectedHistory.started_at)}
              </div>
              {selectedHistory.completed_at && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Terminé le:</strong> {formatDate(selectedHistory.completed_at)}
                </div>
              )}
              {selectedHistory.sources_used && selectedHistory.sources_used.length > 0 && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Sources utilisées:</strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedHistory.sources_used.map((source, idx) => (
                      <Badge key={idx} variant="default">{source}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedHistory.error_message && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <strong className="text-red-700 dark:text-red-300">Erreur:</strong>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{selectedHistory.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

