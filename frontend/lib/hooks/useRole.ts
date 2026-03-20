import { useMemo } from 'react';
import { useAuth } from '../../components/contexts/AuthContext';
import { useApp } from '../../components/contexts/AppContext';
import {
  isSuperAdmin,
  hasRolePermission,
  canManageRoles,
  canModifyRole,
  ROLE_HIERARCHY,
} from '../config/roles';
import { Role } from '../../types';

/**
 * Hook pour gérer les rôles et permissions de l'utilisateur connecté
 */
export const useRole = () => {
  const { user } = useAuth();
  const { users } = useApp();

  // Récupérer le rôle de l'utilisateur depuis la table users
  const currentUserRole = useMemo(() => {
    if (!user) return null;
    
    const dbUser = users.find(u => u.id === user.id);
    return dbUser?.role || null;
  }, [user, users]);

  // Vérifier si l'utilisateur est superadmin
  const isUserSuperAdmin = useMemo(() => {
    return isSuperAdmin(user?.id);
  }, [user?.id]);

  // Rôle effectif (SuperAdmin si UUID correspond, sinon le rôle de la DB)
  const effectiveRole = useMemo(() => {
    if (isUserSuperAdmin) return 'SuperAdmin' as Role;
    return currentUserRole as Role | null;
  }, [isUserSuperAdmin, currentUserRole]);

  return {
    // Rôle de l'utilisateur
    role: effectiveRole,
    isSuperAdmin: isUserSuperAdmin,
    
    // Vérifications de permissions
    hasPermission: (requiredRole: Role) => {
      if (!effectiveRole) return false;
      return hasRolePermission(effectiveRole, requiredRole);
    },
    
    canManageRoles: () => {
      if (!user?.id || !effectiveRole) return false;
      return canManageRoles(user.id, effectiveRole);
    },
    
    canModifyUserRole: (targetUserId: string, targetRole: Role) => {
      if (!user?.id || !effectiveRole) return false;
      return canModifyRole(user.id, effectiveRole, targetUserId, targetRole);
    },
    
    // Utilitaires
    isRoleHigherOrEqual: (role: Role) => {
      if (!effectiveRole) return false;
      const userLevel = ROLE_HIERARCHY[effectiveRole] || 0;
      const targetLevel = ROLE_HIERARCHY[role] || 0;
      return userLevel >= targetLevel;
    },
    
    // Rôles disponibles selon les permissions
    getAvailableRoles: (): Role[] => {
      if (!effectiveRole) return [];
      
      const userLevel = ROLE_HIERARCHY[effectiveRole] || 0;
      const availableRoles: Role[] = [];
      
      // Un utilisateur ne peut assigner que des rôles inférieurs ou égaux au sien
      Object.entries(ROLE_HIERARCHY).forEach(([role, level]) => {
        if (level <= userLevel && role !== 'SuperAdmin') {
          // Seul le superadmin peut créer d'autres superadmins (mais on ne le permet pas)
          availableRoles.push(role as Role);
        }
      });
      
      return availableRoles;
    },
  };
};

