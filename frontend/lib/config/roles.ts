/**
 * Configuration des rôles et permissions
 * L'UUID du superadmin est stocké de manière sécurisée via une variable d'environnement
 * 
 * Pour configurer votre UUID SuperAdmin :
 * 1. Créez un fichier .env à la racine de frontend/
 * 2. Ajoutez : VITE_SUPERADMIN_UUID=0a2085ff-e614-4c96-a65d-597e008750da
 * 3. Ne commitez jamais le fichier .env avec la valeur réelle
 */

// UUID du superadmin par défaut (à configurer via variable d'environnement)
const DEFAULT_SUPERADMIN_UUID = '0a2085ff-e614-4c96-a65d-597e008750da';

// Récupération sécurisée de l'UUID du superadmin
// Priorité : Variable d'environnement > localStorage (pour développement) > valeur par défaut
const getSuperAdminUuid = (): string | null => {
  // Variable d'environnement (recommandé pour la production)
  const envUuid = (import.meta as any).env?.VITE_SUPERADMIN_UUID;
  if (envUuid && typeof envUuid === 'string' && envUuid.trim()) {
    return envUuid.trim();
  }

  // Fallback pour développement (peut être stocké dans localStorage)
  if (typeof window !== 'undefined') {
    const localUuid = localStorage.getItem('agencyos_superadmin_uuid');
    if (localUuid && localUuid.trim()) return localUuid.trim();
  }

  // Valeur par défaut (pour développement uniquement)
  // En production, utilisez toujours une variable d'environnement
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return DEFAULT_SUPERADMIN_UUID;
  }

  return null;
};

// UUID du superadmin (non exposé directement dans le code)
export const SUPERADMIN_UUID = getSuperAdminUuid();

/**
 * Vérifie si un utilisateur est le superadmin
 */
export const isSuperAdmin = (userId: string | null | undefined): boolean => {
  if (!userId || !SUPERADMIN_UUID) return false;
  return userId.toLowerCase() === SUPERADMIN_UUID.toLowerCase();
};

/**
 * Hiérarchie des rôles (du plus élevé au plus bas)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  'SuperAdmin': 5,
  'Admin': 4,
  'Manager': 3,
  'Éditeur': 2,
  'Lecteur': 1,
};

/**
 * Vérifie si un rôle a les permissions d'un autre rôle
 */
export const hasRolePermission = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Vérifie si un utilisateur peut modifier les rôles
 */
export const canManageRoles = (userId: string | null | undefined, userRole: string): boolean => {
  return isSuperAdmin(userId) || userRole === 'Admin';
};

/**
 * Vérifie si un utilisateur peut modifier un rôle spécifique
 */
export const canModifyRole = (
  userId: string | null | undefined,
  userRole: string,
  targetUserId: string,
  targetRole: string
): boolean => {
  // Seul le superadmin peut modifier le rôle SuperAdmin
  if (targetRole === 'SuperAdmin' && !isSuperAdmin(userId)) {
    return false;
  }

  // Seul le superadmin peut modifier son propre rôle
  if (isSuperAdmin(targetUserId) && !isSuperAdmin(userId)) {
    return false;
  }

  // Un utilisateur ne peut pas modifier son propre rôle (sauf superadmin)
  if (userId === targetUserId && !isSuperAdmin(userId)) {
    return false;
  }

  // Vérifier la hiérarchie des rôles
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  // Un utilisateur ne peut pas donner un rôle supérieur au sien
  if (targetLevel > userLevel) {
    return false;
  }

  return canManageRoles(userId, userRole);
};

