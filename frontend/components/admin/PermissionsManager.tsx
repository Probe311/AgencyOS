import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Users, Folder, FileText, Layers, Briefcase, Eye, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { usePermissions } from '../../lib/supabase/hooks/usePermissions';
import { useApp } from '../contexts/AppContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Input } from '../ui/Input';
import { Permission, RolePermission, ResourcePermission, Role, ResourceType, PermissionCategory } from '../../types';

export const PermissionsManager: React.FC = () => {
  const { permissions, loading, error, getRolePermissions, updateRolePermission, getResourcePermissions, setResourcePermission, removeResourcePermission, refresh } = usePermissions();
  const { showToast, users } = useApp();
  const [activeTab, setActiveTab] = useState<'roles' | 'resources'>('roles');
  const [selectedRole, setSelectedRole] = useState<Role>('Lecteur');
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType>('project');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [resourcePermissions, setResourcePermissions] = useState<ResourcePermission[]>([]);
  const [loadingResourcePermissions, setLoadingResourcePermissions] = useState(false);

  const roles: Role[] = ['Admin', 'Manager', 'Éditeur', 'Lecteur'];
  const resourceTypes: ResourceType[] = ['project', 'document', 'publication', 'task', 'lead'];

  // Charger les permissions par rôle
  useEffect(() => {
    if (activeTab === 'roles' && selectedRole) {
      loadRolePermissions();
    }
  }, [activeTab, selectedRole]);

  // Charger les permissions par ressource
  useEffect(() => {
    if (activeTab === 'resources' && selectedResourceType && selectedResourceId) {
      loadResourcePermissions();
    }
  }, [activeTab, selectedResourceType, selectedResourceId]);

  const loadRolePermissions = async () => {
    try {
      setLoadingRolePermissions(true);
      const perms = await getRolePermissions(selectedRole);
      setRolePermissions(perms);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      showToast('Erreur lors du chargement des permissions', 'error');
    } finally {
      setLoadingRolePermissions(false);
    }
  };

  const loadResourcePermissions = async () => {
    if (!selectedResourceId) return;
    try {
      setLoadingResourcePermissions(true);
      const perms = await getResourcePermissions(selectedResourceType, selectedResourceId);
      setResourcePermissions(perms);
    } catch (error) {
      console.error('Error loading resource permissions:', error);
      showToast('Erreur lors du chargement des permissions', 'error');
    } finally {
      setLoadingResourcePermissions(false);
    }
  };

  const handleToggleRolePermission = async (permissionId: string, currentGranted: boolean) => {
    try {
      await updateRolePermission(selectedRole, permissionId, !currentGranted);
      showToast('Permission mise à jour', 'success');
      await loadRolePermissions();
    } catch (error) {
      console.error('Error updating role permission:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleToggleResourcePermission = async (permissionId: string, currentGranted: boolean) => {
    if (!selectedUserId || !selectedResourceId) {
      showToast('Veuillez sélectionner un utilisateur et une ressource', 'error');
      return;
    }

    try {
      if (currentGranted) {
        await removeResourcePermission(selectedUserId, selectedResourceType, selectedResourceId, permissionId);
      } else {
        await setResourcePermission(selectedUserId, selectedResourceType, selectedResourceId, permissionId, true);
      }
      showToast('Permission mise à jour', 'success');
      await loadResourcePermissions();
    } catch (error) {
      console.error('Error updating resource permission:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  // Grouper les permissions par catégorie
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels: Record<PermissionCategory, string> = {
    project: 'Projets',
    document: 'Documents',
    publication: 'Publications',
    task: 'Tâches',
    lead: 'Leads',
    finance: 'Finance',
    admin: 'Administration',
  };

  const categoryIcons: Record<PermissionCategory, typeof Layers> = {
    project: Layers,
    document: FileText,
    publication: FileText,
    task: Briefcase,
    lead: Users,
    finance: Briefcase,
    admin: Shield,
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
        <p className="text-center text-slate-500">Chargement des permissions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-indigo-600 dark:text-indigo-400" size={24} />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Permissions Granulaires</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gérez les permissions par rôle et par ressource
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'roles'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Par Rôle
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'resources'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Par Ressource
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'roles' ? (
          <div className="space-y-6">
            {/* Sélection du rôle */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Rôle
              </label>
              <Dropdown
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as Role)}
                options={roles.map(r => ({ label: r, value: r }))}
              />
            </div>

            {loadingRolePermissions ? (
              <p className="text-center text-slate-500 py-8">Chargement...</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, perms]) => {
                  const CategoryIcon = categoryIcons[category as PermissionCategory];
                  return (
                    <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CategoryIcon size={18} className="text-slate-600 dark:text-slate-400" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {categoryLabels[category as PermissionCategory]}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {perms.map((perm) => {
                          const rolePerm = rolePermissions.find(rp => rp.permissionId === perm.id);
                          const granted = rolePerm?.granted || false;

                          return (
                            <div
                              key={perm.id}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-slate-900 dark:text-white">
                                    {perm.name}
                                  </span>
                                  <Badge variant={granted ? 'success' : 'default'} className="text-xs">
                                    {perm.action}
                                  </Badge>
                                </div>
                                {perm.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleToggleRolePermission(perm.id, granted)}
                                className={`ml-4 p-2 rounded-lg transition-all ${
                                  granted
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500'
                                }`}
                                title={granted ? 'Révoquer' : 'Accorder'}
                              >
                                {granted ? <Check size={18} /> : <X size={18} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sélection ressource */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Type de ressource
                </label>
                <Dropdown
                  value={selectedResourceType}
                  onChange={(value) => setSelectedResourceType(value as ResourceType)}
                  options={resourceTypes.map(rt => ({ 
                    label: rt.charAt(0).toUpperCase() + rt.slice(1), 
                    value: rt 
                  }))}
                />
              </div>
              <div>
                <Input
                  label="ID Ressource"
                  type="text"
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  placeholder="Entrez l'ID de la ressource"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Utilisateur
                </label>
                <Dropdown
                  value={selectedUserId}
                  onChange={(value) => setSelectedUserId(value)}
                  options={users.map(u => ({ 
                    label: u.name || u.email, 
                    value: u.id 
                  }))}
                  placeholder="Sélectionner un utilisateur"
                />
              </div>
            </div>

            {selectedResourceId && (
              <>
                <Button onClick={loadResourcePermissions} disabled={loadingResourcePermissions}>
                  Charger les permissions
                </Button>

                {loadingResourcePermissions ? (
                  <p className="text-center text-slate-500 py-8">Chargement...</p>
                ) : (
                  <div className="space-y-4">
                    {permissions
                      .filter(p => p.resourceType === selectedResourceType)
                      .map((perm) => {
                        const resourcePerm = resourcePermissions.find(
                          rp => rp.permissionId === perm.id && rp.userId === selectedUserId
                        );
                        const granted = resourcePerm?.granted || false;

                        return (
                          <div
                            key={perm.id}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-900 dark:text-white">
                                  {perm.name}
                                </span>
                                <Badge variant={granted ? 'success' : 'default'} className="text-xs">
                                  {perm.action}
                                </Badge>
                              </div>
                              {perm.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleToggleResourcePermission(perm.id, granted)}
                              className={`ml-4 p-2 rounded-lg transition-all ${
                                granted
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500'
                              }`}
                              title={granted ? 'Révoquer' : 'Accorder'}
                            >
                              {granted ? <Check size={18} /> : <X size={18} />}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            Erreur : {error.message}
          </p>
        </div>
      )}
    </div>
  );
};

