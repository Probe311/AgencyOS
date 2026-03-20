import { supabase } from '../supabase';

export type TeamMemberRole = 'owner' | 'admin' | 'member';
export type PermissionType = 'read' | 'write' | 'delete' | 'admin';
export type ResourceType = 'project' | 'lead' | 'document' | 'campaign' | 'task' | 'all';

export interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  member_count?: number;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  joined_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface TeamPermission {
  id: string;
  team_id: string;
  resource_type: ResourceType;
  resource_id?: string;
  permission_type: PermissionType;
  granted_to_role: TeamMemberRole;
  created_at: string;
}

export interface TeamStatistics {
  id: string;
  team_id: string;
  period_start: string;
  period_end: string;
  metric_type: string;
  metric_value: number;
  metadata?: Record<string, any>;
  calculated_at: string;
}

/**
 * Service pour gérer les équipes
 */
export class TeamService {
  /**
   * Récupère toutes les équipes de l'utilisateur
   */
  static async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(count),
        created_by_user:users!teams_created_by_fkey(id, name, email)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(team => ({
      ...team,
      member_count: (team.team_members as any[])?.[0]?.count || 0,
      owner: team.created_by_user ? {
        id: team.created_by_user.id,
        name: team.created_by_user.name,
        email: team.created_by_user.email,
      } : undefined,
    }));
  }

  /**
   * Récupère une équipe par ID
   */
  static async getTeam(teamId: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(count),
        created_by_user:users!teams_created_by_fkey(id, name, email)
      `)
      .eq('id', teamId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      member_count: (data.team_members as any[])?.[0]?.count || 0,
      owner: data.created_by_user ? {
        id: data.created_by_user.id,
        name: data.created_by_user.name,
        email: data.created_by_user.email,
      } : undefined,
    };
  }

  /**
   * Crée une nouvelle équipe
   */
  static async createTeam(team: Omit<Team, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'owner'>): Promise<Team> {
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert([{
        name: team.name,
        description: team.description,
        color: team.color,
        icon: team.icon,
        created_by: team.created_by,
        is_active: true,
      }])
      .select()
      .single();

    if (teamError) throw teamError;

    // Ajouter le créateur comme owner
    await supabase
      .from('team_members')
      .insert([{
        team_id: teamData.id,
        user_id: team.created_by,
        role: 'owner',
      }]);

    return {
      ...teamData,
      member_count: 1,
    };
  }

  /**
   * Met à jour une équipe
   */
  static async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .update({
        name: updates.name,
        description: updates.description,
        color: updates.color,
        icon: updates.icon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Supprime une équipe
   */
  static async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) throw error;
  }

  /**
   * Récupère les membres d'une équipe
   */
  static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users!team_members_user_id_fkey(id, name, email, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(member => ({
      ...member,
      user: member.user ? {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar_url: member.user.avatar_url,
      } : undefined,
    }));
  }

  /**
   * Envoie une invitation par email à un utilisateur
   */
  static async inviteMemberByEmail(teamId: string, email: string, role: TeamMemberRole = 'member'): Promise<void> {
    // Vérifier si l'utilisateur existe
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      // Si l'utilisateur n'existe pas, créer une invitation en attente
      // Pour l'instant, on lance une erreur - à améliorer avec un système d'invitations
      throw new Error('L\'utilisateur n\'existe pas. Un système d\'invitations sera implémenté prochainement.');
    }

    // Ajouter le membre directement
    await this.addTeamMember(teamId, userData.id, role);
  }

  /**
   * Récupère les statistiques d'un membre d'équipe
   */
  static async getMemberStatistics(teamId: string, userId: string): Promise<{
    tasksCount: number;
    leadsCount: number;
    projectsCount: number;
    completedTasksCount: number;
    activeLeadsCount: number;
  }> {
    // Compter les tâches
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId);

    // Compter les leads
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId);

    // Compter les projets (via team_members)
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .contains('team_members', [userId]);

    // Compter les tâches complétées
    const { count: completedTasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'Terminé');

    // Compter les leads actifs
    const { count: activeLeadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('stage', ['Nouveau', 'En contact', 'Qualifié', 'Proposition']);

    return {
      tasksCount: tasksCount || 0,
      leadsCount: leadsCount || 0,
      projectsCount: projectsCount || 0,
      completedTasksCount: completedTasksCount || 0,
      activeLeadsCount: activeLeadsCount || 0,
    };
  }

  /**
   * Ajoute un membre à une équipe
   */
  static async addTeamMember(teamId: string, userId: string, role: TeamMemberRole = 'member'): Promise<TeamMember> {
    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        team_id: teamId,
        user_id: userId,
        role,
      }])
      .select(`
        *,
        user:users!team_members_user_id_fkey(id, name, email, avatar_url)
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
   * Met à jour le rôle d'un membre
   */
  static async updateTeamMemberRole(teamId: string, userId: string, role: TeamMemberRole): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Retire un membre d'une équipe
   */
  static async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Récupère les permissions d'une équipe
   */
  static async getTeamPermissions(teamId: string): Promise<TeamPermission[]> {
    const { data, error } = await supabase
      .from('team_permissions')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Ajoute une permission à une équipe
   */
  static async addTeamPermission(permission: Omit<TeamPermission, 'id' | 'created_at'>): Promise<TeamPermission> {
    const { data, error } = await supabase
      .from('team_permissions')
      .insert([permission])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Supprime une permission
   */
  static async removeTeamPermission(permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('team_permissions')
      .delete()
      .eq('id', permissionId);

    if (error) throw error;
  }

  /**
   * Vérifie si un utilisateur a une permission sur une ressource
   */
  static async checkPermission(
    teamId: string,
    userId: string,
    resourceType: ResourceType,
    resourceId: string | null,
    permissionType: PermissionType
  ): Promise<boolean> {
    // Récupérer le rôle de l'utilisateur dans l'équipe
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (!member) return false;

    // Vérifier les permissions
    const { data: permissions } = await supabase
      .from('team_permissions')
      .select('*')
      .eq('team_id', teamId)
      .eq('resource_type', resourceType)
      .or(`resource_id.is.null,resource_id.eq.${resourceId}`)
      .eq('permission_type', permissionType);

    if (!permissions || permissions.length === 0) {
      // Pas de permissions spécifiques, vérifier selon le rôle
      if (permissionType === 'read') return true; // Tous les membres peuvent lire
      if (permissionType === 'write' && ['owner', 'admin'].includes(member.role)) return true;
      if (permissionType === 'delete' && member.role === 'owner') return true;
      if (permissionType === 'admin' && member.role === 'owner') return true;
      return false;
    }

    // Vérifier si le rôle de l'utilisateur correspond
    return permissions.some(p => {
      if (p.granted_to_role === 'member') return true;
      if (p.granted_to_role === 'admin' && ['owner', 'admin'].includes(member.role)) return true;
      if (p.granted_to_role === 'owner' && member.role === 'owner') return true;
      return false;
    });
  }

  /**
   * Récupère les statistiques d'une équipe
   */
  static async getTeamStatistics(
    teamId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TeamStatistics[]> {
    let query = supabase
      .from('team_statistics')
      .select('*')
      .eq('team_id', teamId)
      .order('period_start', { ascending: false });

    if (startDate) {
      query = query.gte('period_start', startDate);
    }
    if (endDate) {
      query = query.lte('period_end', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Calcule et enregistre les statistiques d'une équipe
   */
  static async calculateTeamStatistics(teamId: string, periodStart: string, periodEnd: string): Promise<void> {
    // Récupérer les membres de l'équipe
    const members = await this.getTeamMembers(teamId);
    const memberIds = members.map(m => m.user_id);

    // Calculer les métriques
    const metrics = [
      { type: 'leads_created', value: 0 },
      { type: 'tasks_completed', value: 0 },
      { type: 'revenue', value: 0 },
    ];

    // Compter les leads créés
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('assigned_to', memberIds)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    metrics[0].value = leadsCount || 0;

    // Compter les tâches complétées
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('assigned_to', memberIds)
      .eq('status', 'completed')
      .gte('updated_at', periodStart)
      .lte('updated_at', periodEnd);

    metrics[1].value = tasksCount || 0;

    // Calculer le revenu (somme des valeurs des leads convertis)
    const { data: convertedLeads } = await supabase
      .from('leads')
      .select('value')
      .in('assigned_to', memberIds)
      .not('converted_at', 'is', null)
      .gte('converted_at', periodStart)
      .lte('converted_at', periodEnd);

    metrics[2].value = (convertedLeads || []).reduce((sum, lead) => sum + (lead.value || 0), 0);

    // Enregistrer les statistiques
    for (const metric of metrics) {
      await supabase
        .from('team_statistics')
        .upsert([{
          team_id: teamId,
          period_start: periodStart,
          period_end: periodEnd,
          metric_type: metric.type,
          metric_value: metric.value,
        }], {
          onConflict: 'team_id,period_start,period_end,metric_type',
        });
    }
  }
}

