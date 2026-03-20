import { supabase } from '../supabase';
import { Role } from '../../types';

export interface Organization2FAPolicy {
  id: string;
  organizationId?: string;
  requiredForRoles: Role[];
  enforcementDate?: string;
  gracePeriodDays: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Récupère les politiques 2FA actives
 */
export const getActive2FAPolicies = async (): Promise<Organization2FAPolicy[]> => {
  try {
    const { data, error } = await supabase
      .from('organization_2fa_policies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((policy) => ({
      id: policy.id,
      organizationId: policy.organization_id,
      requiredForRoles: (policy.required_for_roles || []) as Role[],
      enforcementDate: policy.enforcement_date,
      gracePeriodDays: policy.grace_period_days || 30,
      isActive: policy.is_active,
      createdBy: policy.created_by,
      createdAt: policy.created_at,
      updatedAt: policy.updated_at,
    })) as Organization2FAPolicy[];
  } catch (error) {
    console.error('Error fetching 2FA policies:', error);
    throw error;
  }
};

/**
 * Vérifie si un utilisateur doit activer 2FA selon les politiques
 */
export const check2FARequirement = async (userId: string, userRole: Role): Promise<{
  required: boolean;
  policyId?: string;
  gracePeriodEnds?: string;
  message?: string;
}> => {
  try {
    const policies = await getActive2FAPolicies();
    
    for (const policy of policies) {
      if (policy.requiredForRoles.includes(userRole)) {
        const enforcementDate = policy.enforcementDate 
          ? new Date(policy.enforcementDate)
          : new Date();
        
        const now = new Date();
        if (now >= enforcementDate) {
          const gracePeriodEnds = new Date(enforcementDate);
          gracePeriodEnds.setDate(gracePeriodEnds.getDate() + policy.gracePeriodDays);
          
          return {
            required: true,
            policyId: policy.id,
            gracePeriodEnds: gracePeriodEnds.toISOString(),
            message: `L'authentification à deux facteurs est requise pour votre rôle (${userRole}). Période de grâce jusqu'au ${gracePeriodEnds.toLocaleDateString('fr-FR')}.`,
          };
        }
      }
    }
    
    return { required: false };
  } catch (error) {
    console.error('Error checking 2FA requirement:', error);
    return { required: false };
  }
};

/**
 * Crée une politique 2FA
 */
export const create2FAPolicy = async (
  requiredForRoles: Role[],
  enforcementDate?: string,
  gracePeriodDays: number = 30,
  organizationId?: string
): Promise<Organization2FAPolicy> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('organization_2fa_policies')
      .insert({
        organization_id: organizationId || null,
        required_for_roles: requiredForRoles,
        enforcement_date: enforcementDate || null,
        grace_period_days: gracePeriodDays,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      organizationId: data.organization_id,
      requiredForRoles: data.required_for_roles as Role[],
      enforcementDate: data.enforcement_date,
      gracePeriodDays: data.grace_period_days,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Organization2FAPolicy;
  } catch (error) {
    console.error('Error creating 2FA policy:', error);
    throw error;
  }
};

/**
 * Met à jour une politique 2FA
 */
export const update2FAPolicy = async (
  policyId: string,
  updates: Partial<Pick<Organization2FAPolicy, 'requiredForRoles' | 'enforcementDate' | 'gracePeriodDays' | 'isActive'>>
): Promise<Organization2FAPolicy> => {
  try {
    const updateData: any = {};
    if (updates.requiredForRoles !== undefined) updateData.required_for_roles = updates.requiredForRoles;
    if (updates.enforcementDate !== undefined) updateData.enforcement_date = updates.enforcementDate;
    if (updates.gracePeriodDays !== undefined) updateData.grace_period_days = updates.gracePeriodDays;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('organization_2fa_policies')
      .update(updateData)
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      organizationId: data.organization_id,
      requiredForRoles: data.required_for_roles as Role[],
      enforcementDate: data.enforcement_date,
      gracePeriodDays: data.grace_period_days,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Organization2FAPolicy;
  } catch (error) {
    console.error('Error updating 2FA policy:', error);
    throw error;
  }
};

/**
 * Supprime une politique 2FA
 */
export const delete2FAPolicy = async (policyId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('organization_2fa_policies')
      .delete()
      .eq('id', policyId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting 2FA policy:', error);
    throw error;
  }
};

