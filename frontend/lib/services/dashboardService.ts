import { supabase } from '../supabase';

export type DashboardWidgetType = 
  | 'welcome_card'
  | 'kpi_revenue' 
  | 'kpi_leads' 
  | 'kpi_tasks' 
  | 'kpi_conversion'
  | 'kpi_total_projects'
  | 'kpi_total_acquisition'
  | 'chart_revenue'
  | 'chart_leads'
  | 'chart_pie'
  | 'chart_bar'
  | 'chart_projects_data'
  | 'chart_acquisition_data'
  | 'task_list'
  | 'lead_list'
  | 'project_list'
  | 'activity_feed'
  | 'calendar'
  | 'notifications'
  | 'workload_status'
  | 'sales_by_category'
  | 'monthly_income'
  | 'project_progress';

export interface DashboardWidgetConfig {
  id: string;
  type: DashboardWidgetType;
  x: number; // Position X (colonne dans grille 8 colonnes)
  y: number; // Position Y (ligne)
  w: number; // Largeur (colonnes)
  h: number; // Hauteur (lignes)
  highlighted?: boolean; // Mise en avant avec background color
  config?: Record<string, any>; // Configuration spécifique du widget
}

export interface DashboardLayout {
  id: string;
  userId: string;
  layoutName: string;
  isDefault: boolean;
  widgetConfigs: DashboardWidgetConfig[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Récupère le layout par défaut de l'utilisateur
 */
export const getDefaultDashboardLayout = async (userId: string): Promise<DashboardLayout | null> => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:39',message:'getDefaultDashboardLayout called',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const { data, error } = await supabase
      .from('user_dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:47',message:'getDefaultDashboardLayout response',data:{hasData:!!data,error:error?{code:error.code,message:error.message}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error && error.code !== 'PGRST116') {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:50',message:'getDefaultDashboardLayout error',data:{errorCode:error.code,errorMessage:error.message,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw error;
    }
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      layoutName: data.layout_name,
      isDefault: data.is_default,
      widgetConfigs: data.widget_configs || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as DashboardLayout;
  } catch (error) {
    console.error('Error fetching default dashboard layout:', error);
    throw error;
  }
};

/**
 * Récupère tous les layouts de l'utilisateur
 */
export const getUserDashboardLayouts = async (userId: string): Promise<DashboardLayout[]> => {
  try {
    const { data, error } = await supabase
      .from('user_dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((layout) => ({
      id: layout.id,
      userId: layout.user_id,
      layoutName: layout.layout_name,
      isDefault: layout.is_default,
      widgetConfigs: layout.widget_configs || [],
      createdAt: layout.created_at,
      updatedAt: layout.updated_at,
    })) as DashboardLayout[];
  } catch (error) {
    console.error('Error fetching user dashboard layouts:', error);
    throw error;
  }
};

/**
 * Crée ou met à jour un layout de dashboard
 * IMPORTANT: Les layouts sont sauvegardés individuellement par utilisateur (user_id)
 * Chaque utilisateur a son propre layout et ses propres modifications
 */
export const saveDashboardLayout = async (
  userId: string,
  layoutName: string,
  widgetConfigs: DashboardWidgetConfig[],
  isDefault: boolean = false
): Promise<DashboardLayout> => {
  try {
    // Si c'est le layout par défaut, désactiver les autres layouts par défaut pour cet utilisateur uniquement
    if (isDefault) {
      await supabase
        .from('user_dashboard_layouts')
        .update({ is_default: false })
        .eq('user_id', userId) // Filtre par utilisateur
        .eq('is_default', true);
    }

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:114',message:'saveDashboardLayout checking existing',data:{userId,layoutName,isDefault},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Vérifier si le layout existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('user_dashboard_layouts')
      .select('id')
      .eq('user_id', userId)
      .eq('layout_name', layoutName)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:122',message:'saveDashboardLayout existing check result',data:{hasExisting:!!existing,existingId:existing?.id,checkError:checkError?{code:checkError.code,message:checkError.message}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    let result;
    if (existing) {
      // Mettre à jour
      const { data, error } = await supabase
        .from('user_dashboard_layouts')
        .update({
          widget_configs: widgetConfigs,
          is_default: isDefault,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Créer
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:138',message:'saveDashboardLayout creating new layout',data:{userId,layoutName,isDefault,widgetCount:widgetConfigs.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const { data, error } = await supabase
        .from('user_dashboard_layouts')
        .insert({
          user_id: userId,
          layout_name: layoutName,
          widget_configs: widgetConfigs,
          is_default: isDefault,
        })
        .select()
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/f09761ae-42a8-4db6-87fb-df8f0f98e10d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardService.ts:151',message:'saveDashboardLayout insert result',data:{hasData:!!data,error:error?{code:error.code,message:error.message,details:error}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (error) throw error;
      result = data;
    }

    return {
      id: result.id,
      userId: result.user_id,
      layoutName: result.layout_name,
      isDefault: result.is_default,
      widgetConfigs: result.widget_configs || [],
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    } as DashboardLayout;
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    throw error;
  }
};

/**
 * Supprime un layout
 */
export const deleteDashboardLayout = async (layoutId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_dashboard_layouts')
      .delete()
      .eq('id', layoutId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting dashboard layout:', error);
    throw error;
  }
};

/**
 * Crée un layout par défaut avec des widgets de base
 * Utilise une grille 8x8 avec des blocs de tailles définies
 */
/**
 * Crée un modèle de dashboard par défaut complet et structuré
 * Le layout est sauvegardé individuellement pour chaque utilisateur
 */
export const createDefaultDashboardLayout = async (userId: string): Promise<DashboardLayout> => {
  const defaultWidgets: DashboardWidgetConfig[] = [
    // Ligne 1 (y: 0) : Carte de bienvenue 6x4
    {
      id: 'w0',
      type: 'welcome_card',
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      highlighted: true, // Mise en avant avec gradient
    },
    // Ligne 2 (y: 4) : 4 KPI de taille 2x2 (tâche, lead, conversion, revenu)
    {
      id: 'w1',
      type: 'kpi_tasks',
      x: 0,
      y: 4,
      w: 2,
      h: 2,
    },
    {
      id: 'w2',
      type: 'kpi_leads',
      x: 2,
      y: 4,
      w: 2,
      h: 2,
    },
    {
      id: 'w3',
      type: 'kpi_conversion',
      x: 4,
      y: 4,
      w: 2,
      h: 2,
    },
    {
      id: 'w4',
      type: 'kpi_revenue',
      x: 6,
      y: 4,
      w: 2,
      h: 2,
    },
    // Ligne 3 (y: 6) : 2 graphiques en 4x3
    {
      id: 'w5',
      type: 'chart_revenue',
      x: 0,
      y: 6,
      w: 4,
      h: 3,
    },
    {
      id: 'w6',
      type: 'chart_leads',
      x: 4,
      y: 6,
      w: 4,
      h: 3,
    },
  ];

  // Le layout est sauvegardé avec le userId, donc chaque utilisateur a son propre layout
  return saveDashboardLayout(userId, 'Default', defaultWidgets, true);
};

