import { supabase } from '../supabase';

export interface ReportWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'text' | 'metric';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  widgets: ReportWidget[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service de gestion des rapports personnalisés
 */
export class ReportBuilderService {
  /**
   * Récupère tous les rapports personnalisés
   */
  static async getReports(): Promise<CustomReport[]> {
    const { data, error } = await supabase
      .from('custom_reports')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(report => ({
      ...report,
      widgets: report.report_config?.widgets || [],
    }));
  }

  /**
   * Récupère un rapport par ID
   */
  static async getReport(reportId: string): Promise<CustomReport> {
    const { data, error } = await supabase
      .from('custom_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) throw error;
    return {
      ...data,
      widgets: data.report_config?.widgets || [],
    };
  }

  /**
   * Sauvegarde un rapport personnalisé
   */
  static async saveReport(
    name: string,
    widgets: ReportWidget[],
    options?: {
      description?: string;
      reportId?: string;
      userId?: string;
    }
  ): Promise<CustomReport> {
    const reportData: any = {
      name,
      description: options?.description,
      report_config: { widgets },
      user_id: options?.userId,
    };

    if (options?.reportId) {
      // Mise à jour
      const { data, error } = await supabase
        .from('custom_reports')
        .update(reportData)
        .eq('id', options.reportId)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        widgets: data.report_config?.widgets || [],
      };
    } else {
      // Création
      const { data, error } = await supabase
        .from('custom_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        widgets: data.report_config?.widgets || [],
      };
    }
  }

  /**
   * Supprime un rapport
   */
  static async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
  }
}

