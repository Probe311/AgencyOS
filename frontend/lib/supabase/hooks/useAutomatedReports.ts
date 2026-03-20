import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';

export type ReportType = 'overview' | 'time' | 'crm' | 'marketing' | 'finance' | 'custom';
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ExportFormat = 'pdf' | 'csv' | 'excel';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AutomatedReport {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  scheduleType: ScheduleType;
  scheduleConfig: {
    dayOfWeek?: number; // 0-6 (Sunday-Saturday) pour weekly
    dayOfMonth?: number; // 1-31 pour monthly
    time?: string; // Format HH:MM (ex: "09:00")
    timezone?: string; // Timezone (ex: "Europe/Paris")
  };
  recipients: string[]; // User IDs
  recipientsEmails: string[]; // External email addresses
  exportFormat: ExportFormat[];
  reportConfig: {
    metrics?: string[]; // Métriques à inclure
    dateRange?: {
      type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month' | 'this_year' | 'custom';
      startDate?: string;
      endDate?: string;
    };
    filters?: Record<string, any>; // Filtres personnalisés
  };
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  templateId?: string; // ID du template d'email
}

export interface AutomatedReportExecution {
  id: string;
  reportId: string;
  executionStatus: ExecutionStatus;
  executionStartedAt: string;
  executionCompletedAt?: string;
  exportFiles: Array<{
    format: ExportFormat;
    url: string;
    size: number;
  }>;
  recipientsSent: string[];
  recipientsFailed: string[];
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface UseAutomatedReportsReturn {
  reports: AutomatedReport[];
  executions: AutomatedReportExecution[];
  loading: boolean;
  error: Error | null;
  fetchReports: () => Promise<void>;
  fetchExecutions: (reportId?: string) => Promise<void>;
  createReport: (report: Omit<AutomatedReport, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'nextRunAt' | 'runCount'>) => Promise<AutomatedReport>;
  updateReport: (id: string, updates: Partial<AutomatedReport>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  toggleReport: (id: string, isActive: boolean) => Promise<void>;
  calculateNextRunAt: (scheduleType: ScheduleType, scheduleConfig: AutomatedReport['scheduleConfig']) => Date;
  executeReport: (reportId: string) => Promise<void>;
}

export const useAutomatedReports = (): UseAutomatedReportsReturn => {
  const [reports, setReports] = useState<AutomatedReport[]>([]);
  const [executions, setExecutions] = useState<AutomatedReportExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Mapper les données Supabase vers notre interface
  const mapSupabaseReport = (item: any): AutomatedReport => ({
    id: item.id,
    name: item.name,
    description: item.description,
    reportType: item.report_type,
    scheduleType: item.schedule_type,
    scheduleConfig: item.schedule_config || {},
    recipients: item.recipients || [],
    recipientsEmails: item.recipients_emails || [],
    exportFormat: item.export_format || ['pdf'],
    reportConfig: item.report_config || {},
    isActive: item.is_active,
    lastRunAt: item.last_run_at,
    nextRunAt: item.next_run_at,
    runCount: item.run_count || 0,
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    templateId: item.template_id,
  });

  const mapSupabaseExecution = (item: any): AutomatedReportExecution => ({
    id: item.id,
    reportId: item.report_id,
    executionStatus: item.execution_status,
    executionStartedAt: item.execution_started_at,
    executionCompletedAt: item.execution_completed_at,
    exportFiles: item.export_files || [],
    recipientsSent: item.recipients_sent || [],
    recipientsFailed: item.recipients_failed || [],
    errorMessage: item.error_message,
    metadata: item.metadata || {},
    createdAt: item.created_at,
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('automated_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setReports((data || []).map(mapSupabaseReport));
      setError(null);
    } catch (err: any) {
      setError(err);
      console.error('Error fetching automated reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async (reportId?: string) => {
    try {
      let query = supabase
        .from('automated_report_executions')
        .select('*')
        .order('execution_started_at', { ascending: false })
        .limit(100);

      if (reportId) {
        query = query.eq('report_id', reportId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setExecutions((data || []).map(mapSupabaseExecution));
    } catch (err: any) {
      console.error('Error fetching report executions:', err);
    }
  }, []);

  const calculateNextRunAt = useCallback((scheduleType: ScheduleType, scheduleConfig: AutomatedReport['scheduleConfig']): Date => {
    const now = new Date();
    const nextRun = new Date(now);
    const time = scheduleConfig.time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);

    // Définir l'heure cible
    nextRun.setHours(hours, minutes || 0, 0, 0);

    switch (scheduleType) {
      case 'daily':
        // Si l'heure est passée aujourd'hui, passer à demain
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const dayOfWeek = scheduleConfig.dayOfWeek !== undefined ? scheduleConfig.dayOfWeek : 1; // Lundi par défaut
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
        
        if (daysUntilTarget === 0 && nextRun <= now) {
          // Si c'est le jour cible mais l'heure est passée, passer à la semaine prochaine
          nextRun.setDate(nextRun.getDate() + 7);
        } else {
          nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        }
        break;

      case 'monthly':
        const dayOfMonth = scheduleConfig.dayOfMonth || 1;
        nextRun.setDate(dayOfMonth);
        
        // Si le jour est passé ce mois, passer au mois prochain
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;

      default:
        // Custom: utiliser nextRunAt depuis la config si disponible
        break;
    }

    return nextRun;
  }, []);

  const createReport = useCallback(async (
    report: Omit<AutomatedReport, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'nextRunAt' | 'runCount'>
  ): Promise<AutomatedReport> => {
    const nextRunAt = calculateNextRunAt(report.scheduleType, report.scheduleConfig);

    const { data, error: createError } = await supabase
      .from('automated_reports')
      .insert({
        name: report.name,
        description: report.description,
        report_type: report.reportType,
        schedule_type: report.scheduleType,
        schedule_config: report.scheduleConfig,
        recipients: report.recipients,
        recipients_emails: report.recipientsEmails,
        export_format: report.exportFormat,
        report_config: report.reportConfig,
        is_active: report.isActive,
        next_run_at: nextRunAt.toISOString(),
        template_id: (report as any).templateId || null,
      })
      .select()
      .single();

    if (createError) throw createError;

    const newReport = mapSupabaseReport(data);
    setReports(prev => [newReport, ...prev]);
    return newReport;
  }, [calculateNextRunAt]);

  const updateReport = useCallback(async (id: string, updates: Partial<AutomatedReport>) => {
    const report = reports.find(r => r.id === id);
    if (!report) throw new Error('Report not found');

    const updatedScheduleType = updates.scheduleType !== undefined ? updates.scheduleType : report.scheduleType;
    const updatedScheduleConfig = updates.scheduleConfig !== undefined ? updates.scheduleConfig : report.scheduleConfig;
    
    // Recalculer nextRunAt si la planification change
    const nextRunAt = (updates.scheduleType !== undefined || updates.scheduleConfig !== undefined)
      ? calculateNextRunAt(updatedScheduleType, updatedScheduleConfig)
      : undefined;

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.reportType !== undefined) updateData.report_type = updates.reportType;
    if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType;
    if (updates.scheduleConfig !== undefined) updateData.schedule_config = updates.scheduleConfig;
    if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
    if (updates.recipientsEmails !== undefined) updateData.recipients_emails = updates.recipientsEmails;
    if (updates.exportFormat !== undefined) updateData.export_format = updates.exportFormat;
    if (updates.reportConfig !== undefined) updateData.report_config = updates.reportConfig;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (nextRunAt !== undefined) updateData.next_run_at = nextRunAt.toISOString();
    if ((updates as any).templateId !== undefined) updateData.template_id = (updates as any).templateId;

    const { error: updateError } = await supabase
      .from('automated_reports')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    await fetchReports();
  }, [reports, calculateNextRunAt, fetchReports]);

  const deleteReport = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('automated_reports')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleReport = useCallback(async (id: string, isActive: boolean) => {
    await updateReport(id, { isActive });
  }, [updateReport]);

  const executeReport = useCallback(async (reportId: string) => {
    // Importer le service d'envoi d'email
    const { AutomatedReportEmailService } = await import('../../services/automatedReportEmailService');
    
    // Traiter le rapport (génération + envoi email)
    await AutomatedReportEmailService.processAutomatedReport(reportId);

    await fetchExecutions(reportId);
    await fetchReports();
  }, [fetchExecutions, fetchReports]);

  useEffect(() => {
    fetchReports();
    fetchExecutions();
  }, [fetchReports, fetchExecutions]);

  return {
    reports,
    executions,
    loading,
    error,
    fetchReports,
    fetchExecutions,
    createReport,
    updateReport,
    deleteReport,
    toggleReport,
    calculateNextRunAt,
    executeReport,
  };
};

