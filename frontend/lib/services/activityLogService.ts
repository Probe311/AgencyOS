import { supabase } from '../supabase';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action_type: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ActivityLogFilters {
  user_id?: string;
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface ActivityLogStats {
  total_logs: number;
  logs_by_action: Record<string, number>;
  logs_by_resource: Record<string, number>;
  logs_by_user: Record<string, number>;
  logs_by_day: Array<{ date: string; count: number }>;
}

/**
 * Service pour gérer les logs d'activité
 */
export class ActivityLogService {
  /**
   * Récupère les logs d'activité avec filtres
   */
  static async getLogs(
    filters: ActivityLogFilters = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(id, name, email, avatar_url)
      `, { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Appliquer les filtres
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.action_type) {
      query = query.eq('action_type', filters.action_type);
    }
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters.resource_id) {
      query = query.eq('resource_id', filters.resource_id);
    }
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date);
    }
    if (filters.search) {
      query = query.or(`user_name.ilike.%${filters.search}%,action_type.ilike.%${filters.search}%,resource_type.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const logs = (data || []).map(log => ({
      ...log,
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
        avatar_url: log.user.avatar_url,
      } : undefined,
    }));

    return {
      logs,
      total: count || 0,
    };
  }

  /**
   * Récupère un log par ID
   */
  static async getLog(logId: string): Promise<ActivityLog | null> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(id, name, email, avatar_url)
      `)
      .eq('id', logId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      user: data.user ? {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar_url: data.user.avatar_url,
      } : undefined,
    };
  }

  /**
   * Récupère les statistiques des logs
   */
  static async getStats(
    filters: ActivityLogFilters = {},
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<ActivityLogStats> {
    let query = supabase
      .from('audit_logs')
      .select('*');

    // Appliquer les filtres
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.action_type) {
      query = query.eq('action_type', filters.action_type);
    }
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date);
    }

    const { data, error } = await query;
    if (error) throw error;

    const logs = data || [];

    // Calculer les statistiques
    const stats: ActivityLogStats = {
      total_logs: logs.length,
      logs_by_action: {},
      logs_by_resource: {},
      logs_by_user: {},
      logs_by_day: [],
    };

    // Par action
    logs.forEach(log => {
      stats.logs_by_action[log.action_type] = (stats.logs_by_action[log.action_type] || 0) + 1;
    });

    // Par ressource
    logs.forEach(log => {
      stats.logs_by_resource[log.resource_type] = (stats.logs_by_resource[log.resource_type] || 0) + 1;
    });

    // Par utilisateur
    logs.forEach(log => {
      const key = log.user_id || 'system';
      stats.logs_by_user[key] = (stats.logs_by_user[key] || 0) + 1;
    });

    // Par jour
    const logsByDate: Record<string, number> = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      logsByDate[date] = (logsByDate[date] || 0) + 1;
    });

    stats.logs_by_day = Object.entries(logsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }

  /**
   * Exporte les logs en CSV
   */
  static async exportToCSV(filters: ActivityLogFilters = {}): Promise<string> {
    const { logs } = await this.getLogs(filters, 10000, 0);

    const headers = ['Date', 'Utilisateur', 'Action', 'Ressource', 'ID Ressource', 'Détails', 'IP', 'User Agent'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString('fr-FR'),
      log.user_name,
      log.action_type,
      log.resource_type,
      log.resource_id || '',
      JSON.stringify(log.details),
      log.ip_address || '',
      log.user_agent || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Exporte les logs en JSON
   */
  static async exportToJSON(filters: ActivityLogFilters = {}): Promise<string> {
    const { logs } = await this.getLogs(filters, 10000, 0);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Crée un log d'activité
   */
  static async createLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: log.user_id,
        user_name: log.user_name,
        action_type: log.action_type,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id || '',
        details: log.details,
        reason: log.reason,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        metadata: log.metadata || {},
      }])
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      user: data.user ? {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar_url: data.user.avatar_url,
      } : undefined,
    };
  }

  /**
   * Récupère les types d'actions uniques
   */
  static async getActionTypes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action_type')
      .order('action_type');

    if (error) throw error;

    const uniqueTypes = [...new Set((data || []).map(log => log.action_type))];
    return uniqueTypes;
  }

  /**
   * Récupère les types de ressources uniques
   */
  static async getResourceTypes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('resource_type')
      .order('resource_type');

    if (error) throw error;

    const uniqueTypes = [...new Set((data || []).map(log => log.resource_type))];
    return uniqueTypes;
  }
}

