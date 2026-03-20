import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Play, Pause, Calendar, Clock, Mail, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAutomatedReports, AutomatedReport, AutomatedReportExecution, ReportType, ScheduleType, ExportFormat } from '../../lib/supabase/hooks/useAutomatedReports';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Checkbox } from '../ui/Checkbox';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../../lib/supabase';

const REPORT_TYPES: { value: ReportType; label: string; icon: any }[] = [
  { value: 'overview', label: 'Vue d\'ensemble', icon: FileText },
  { value: 'time', label: 'Temps', icon: Clock },
  { value: 'crm', label: 'CRM', icon: FileText },
  { value: 'marketing', label: 'Marketing', icon: FileText },
  { value: 'finance', label: 'Finance', icon: FileText },
  { value: 'custom', label: 'Personnalisé', icon: FileText },
];

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'custom', label: 'Personnalisé' },
];

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export const AutomatedReportsManager: React.FC = () => {
  const { reports, executions, loading, fetchReports, fetchExecutions, createReport, updateReport, deleteReport, toggleReport, executeReport } = useAutomatedReports();
  const { showToast } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecutionsModalOpen, setIsExecutionsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<AutomatedReport | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<Array<{ id: string; name: string }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reportType: 'overview' as ReportType,
    scheduleType: 'daily' as ScheduleType,
    scheduleConfig: {
      dayOfWeek: 1,
      dayOfMonth: 1,
      time: '09:00',
      timezone: 'Europe/Paris',
    },
    recipients: [] as string[],
    recipientsEmails: [] as string[],
    exportFormat: ['pdf'] as ExportFormat[],
    reportConfig: {
      metrics: [] as string[],
      dateRange: {
        type: 'last_30_days' as const,
      },
    },
    isActive: true,
    templateId: undefined as string | undefined,
  });

  useEffect(() => {
    fetchReports();
    fetchExecutions();
    loadEmailTemplates();
  }, [fetchReports, fetchExecutions]);

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  };

  const selectedReportExecutions = selectedReportId 
    ? executions.filter(e => e.reportId === selectedReportId)
    : [];

  const handleCreateNew = () => {
    setEditingReport(null);
    setFormData({
      name: '',
      description: '',
      reportType: 'overview',
      scheduleType: 'daily',
      scheduleConfig: {
        dayOfWeek: 1,
        dayOfMonth: 1,
        time: '09:00',
        timezone: 'Europe/Paris',
      },
      recipients: [],
      recipientsEmails: [],
      exportFormat: ['pdf'],
      reportConfig: {
        metrics: [],
        dateRange: {
          type: 'last_30_days',
        },
      },
      isActive: true,
      templateId: undefined,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (report: AutomatedReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      description: report.description || '',
      reportType: report.reportType,
      scheduleType: report.scheduleType,
      scheduleConfig: report.scheduleConfig,
      recipients: report.recipients || [],
      recipientsEmails: report.recipientsEmails || [],
      exportFormat: report.exportFormat || ['pdf'],
      reportConfig: report.reportConfig || {
        metrics: [],
        dateRange: { type: 'last_30_days' },
      },
      isActive: report.isActive,
      templateId: report.templateId,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Le nom du rapport est requis', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingReport) {
        await updateReport(editingReport.id, formData);
        showToast('Rapport mis à jour', 'success');
      } else {
        await createReport(formData);
        showToast('Rapport créé', 'success');
      }
      setIsModalOpen(false);
      await fetchReports();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (report: AutomatedReport) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le rapport "${report.name}" ?`)) {
      return;
    }

    try {
      await deleteReport(report.id);
      showToast('Rapport supprimé', 'success');
      await fetchReports();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleToggle = async (report: AutomatedReport) => {
    try {
      await toggleReport(report.id, !report.isActive);
      showToast(`Rapport ${!report.isActive ? 'activé' : 'désactivé'}`, 'success');
      await fetchReports();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleExecute = async (reportId: string) => {
    try {
      setExecuting(reportId);
      await executeReport(reportId);
      showToast('Exécution du rapport démarrée', 'success');
      await fetchExecutions(reportId);
      await fetchReports();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setExecuting(null);
    }
  };

  const handleViewExecutions = (reportId: string) => {
    setSelectedReportId(reportId);
    fetchExecutions(reportId);
    setIsExecutionsModalOpen(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="text-xs"><CheckCircle size={12} className="mr-1" />Terminé</Badge>;
      case 'failed':
        return <Badge variant="danger" className="text-xs"><XCircle size={12} className="mr-1" />Échoué</Badge>;
      case 'running':
        return <Badge variant="info" className="text-xs"><Loader size={12} variant="minimal" className="mr-1" />En cours</Badge>;
      default:
        return <Badge variant="default" className="text-xs"><AlertCircle size={12} className="mr-1" />En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Rapports automatisés</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Créez et planifiez des rapports automatiques à envoyer par email
          </p>
        </div>
        <Button onClick={handleCreateNew} icon={Plus}>
          Nouveau rapport
        </Button>
      </div>

      {loading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={32} />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <FileText size={48} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">Aucun rapport automatisé</p>
          <Button onClick={handleCreateNew} icon={Plus} variant="primary">
            Créer un rapport
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">{report.name}</h3>
                  {report.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
                  )}
                </div>
                <Badge variant={report.isActive ? 'success' : 'default'} className="text-xs">
                  {report.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <FileText size={14} />
                <span>{REPORT_TYPES.find(t => t.value === report.reportType)?.label}</span>
                <span className="mx-1">•</span>
                <Calendar size={14} />
                <span>{SCHEDULE_TYPES.find(t => t.value === report.scheduleType)?.label}</span>
              </div>

              {report.nextRunAt && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <Clock size={12} className="inline mr-1" />
                  Prochaine exécution: {formatDate(report.nextRunAt)}
                </div>
              )}

              {report.lastRunAt && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Dernière exécution: {formatDate(report.lastRunAt)} ({report.runCount} exécutions)
                </div>
              )}

              <div className="flex items-center gap-1 flex-wrap">
                {report.exportFormat.map(format => (
                  <Badge key={format} variant="outline" className="text-xs">
                    {format.toUpperCase()}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={report.isActive ? Pause : Play}
                  onClick={() => handleToggle(report)}
                  className="flex-1"
                >
                  {report.isActive ? 'Désactiver' : 'Activer'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Play}
                  onClick={() => handleExecute(report.id)}
                  disabled={executing === report.id}
                >
                  {executing === report.id ? <Loader size={14} variant="minimal" /> : 'Exécuter'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Edit2}
                  onClick={() => handleEdit(report)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Calendar}
                  onClick={() => handleViewExecutions(report.id)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => handleDelete(report)}
                  className="text-rose-600 hover:text-rose-700"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReport ? 'Modifier le rapport' : 'Nouveau rapport automatisé'}
        size="large"
      >
        <div className="space-y-4">
          <Input
            label="Nom du rapport"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Rapport hebdomadaire CRM"
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description du rapport..."
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Type de rapport"
              value={formData.reportType}
              onChange={(value) => setFormData({ ...formData, reportType: value as ReportType })}
              options={REPORT_TYPES.map(t => ({ value: t.value, label: t.label }))}
            />

            <Dropdown
              label="Fréquence"
              value={formData.scheduleType}
              onChange={(value) => setFormData({ ...formData, scheduleType: value as ScheduleType })}
              options={SCHEDULE_TYPES.map(t => ({ value: t.value, label: t.label }))}
            />
          </div>

          {formData.scheduleType === 'weekly' && (
            <Dropdown
              label="Jour de la semaine"
              value={formData.scheduleConfig.dayOfWeek?.toString() || '1'}
              onChange={(value) => setFormData({
                ...formData,
                scheduleConfig: { ...formData.scheduleConfig, dayOfWeek: parseInt(value) }
              })}
              options={DAYS_OF_WEEK.map(d => ({ value: d.value.toString(), label: d.label }))}
            />
          )}

          {formData.scheduleType === 'monthly' && (
            <Input
              label="Jour du mois (1-31)"
              type="number"
              min="1"
              max="31"
              value={formData.scheduleConfig.dayOfMonth?.toString() || '1'}
              onChange={(e) => setFormData({
                ...formData,
                scheduleConfig: { ...formData.scheduleConfig, dayOfMonth: parseInt(e.target.value) || 1 }
              })}
            />
          )}

          <Input
            label="Heure d'envoi"
            type="time"
            value={formData.scheduleConfig.time}
            onChange={(e) => setFormData({
              ...formData,
              scheduleConfig: { ...formData.scheduleConfig, time: e.target.value }
            })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Formats d'export
            </label>
            <div className="flex gap-3">
              {EXPORT_FORMATS.map(format => (
                <Checkbox
                  key={format.value}
                  label={format.label}
                  checked={formData.exportFormat.includes(format.value)}
                  onChange={(checked) => {
                    if (checked) {
                      setFormData({
                        ...formData,
                        exportFormat: [...formData.exportFormat, format.value]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        exportFormat: formData.exportFormat.filter(f => f !== format.value)
                      });
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Destinataires (emails externes)
            </label>
            <Textarea
              value={formData.recipientsEmails.join(', ')}
              onChange={(e) => setFormData({
                ...formData,
                recipientsEmails: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
              })}
              placeholder="email1@example.com, email2@example.com"
              rows={2}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Séparez les emails par des virgules
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Template d'email (optionnel)
            </label>
            <Dropdown
              value={formData.templateId || ''}
              onChange={(value) => setFormData({ ...formData, templateId: value || undefined })}
              options={[
                { value: '', label: 'Template par défaut' },
                ...emailTemplates.map(t => ({ value: t.id, label: t.name })),
              ]}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choisissez un template personnalisé pour l'email de rapport
            </p>
          </div>

          <Checkbox
            label="Activer le rapport"
            checked={formData.isActive}
            onChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} icon={saving ? Loader : undefined}>
              {saving ? 'Enregistrement...' : editingReport ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'historique des exécutions */}
      <Modal
        isOpen={isExecutionsModalOpen}
        onClose={() => setIsExecutionsModalOpen(false)}
        title="Historique des exécutions"
        size="large"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {selectedReportExecutions.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Aucune exécution pour ce rapport
            </p>
          ) : (
            selectedReportExecutions.map((execution) => (
              <div
                key={execution.id}
                className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(execution.executionStatus)}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(execution.executionStartedAt)}
                  </span>
                </div>
                {execution.executionCompletedAt && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Terminé: {formatDate(execution.executionCompletedAt)}
                  </div>
                )}
                {execution.exportFiles && execution.exportFiles.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Download size={14} className="text-slate-400" />
                    <div className="flex gap-2">
                      {execution.exportFiles.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {file.format.toUpperCase()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {execution.errorMessage && (
                  <div className="text-xs text-rose-600 mt-2">
                    Erreur: {execution.errorMessage}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

