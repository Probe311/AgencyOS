import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, UserPlus, Settings, BarChart3, Shield, Crown, UserCheck, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { TeamService, Team, TeamMember, TeamMemberRole, TeamPermission, PermissionType, ResourceType } from '../../lib/services/teamService';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

export const TeamsManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast, users } = useApp();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamPermissions, setTeamPermissions] = useState<TeamPermission[]>([]);

  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'Users',
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await TeamService.getTeams();
      setTeams(data);
    } catch (error: any) {
      showToast(`Erreur lors du chargement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.name || !user?.id) return;

    try {
      await TeamService.createTeam({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        created_by: user.id,
        is_active: true,
      });
      showToast('Équipe créée avec succès', 'success');
      setIsCreateModalOpen(false);
      setFormData({ name: '', description: '', color: '#3b82f6', icon: 'Users' });
      await loadTeams();
    } catch (error: any) {
      showToast(`Erreur lors de la création: ${error.message}`, 'error');
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam) return;

    try {
      await TeamService.updateTeam(selectedTeam.id, formData);
      showToast('Équipe mise à jour', 'success');
      setIsEditModalOpen(false);
      setSelectedTeam(null);
      await loadTeams();
    } catch (error: any) {
      showToast(`Erreur lors de la mise à jour: ${error.message}`, 'error');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;

    try {
      await TeamService.deleteTeam(teamId);
      showToast('Équipe supprimée', 'success');
      await loadTeams();
    } catch (error: any) {
      showToast(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
  };

  const handleOpenMembers = async (team: Team) => {
    setSelectedTeam(team);
    try {
      const members = await TeamService.getTeamMembers(team.id);
      setTeamMembers(members);
      setIsMembersModalOpen(true);
    } catch (error: any) {
      showToast(`Erreur lors du chargement des membres: ${error.message}`, 'error');
    }
  };

  const handleOpenPermissions = async (team: Team) => {
    setSelectedTeam(team);
    try {
      const permissions = await TeamService.getTeamPermissions(team.id);
      setTeamPermissions(permissions);
      setIsPermissionsModalOpen(true);
    } catch (error: any) {
      showToast(`Erreur lors du chargement des permissions: ${error.message}`, 'error');
    }
  };

  const handleOpenStats = async (team: Team) => {
    setSelectedTeam(team);
    setIsStatsModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color || '#3b82f6',
      icon: team.icon || 'Users',
    });
    setIsEditModalOpen(true);
  };

  const getRoleIcon = (role: TeamMemberRole) => {
    switch (role) {
      case 'owner':
        return Crown;
      case 'admin':
        return Shield;
      default:
        return User;
    }
  };

  const getRoleColor = (role: TeamMemberRole) => {
    switch (role) {
      case 'owner':
        return 'amber';
      case 'admin':
        return 'blue';
      default:
        return 'slate';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Équipes</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Gérez les équipes et leurs membres
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Nouvelle équipe
        </Button>
      </div>

      {/* Liste des équipes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: team.color || '#3b82f6' }}
                >
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{team.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {team.member_count || 0} membre{team.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit2}
                  onClick={() => handleOpenEdit(team)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDeleteTeam(team.id)}
                />
              </div>
            </div>

            {team.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {team.description}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={UserPlus}
                onClick={() => handleOpenMembers(team)}
                className="flex-1"
              >
                Membres
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Shield}
                onClick={() => handleOpenPermissions(team)}
              />
              <Button
                variant="outline"
                size="sm"
                icon={BarChart3}
                onClick={() => handleOpenStats(team)}
              />
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
            <Users className="mx-auto mb-4" size={48} />
            <p>Aucune équipe créée</p>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouvelle équipe"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom de l'équipe *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Équipe Commerciale"
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de l'équipe..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Couleur
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700"
              />
            </div>
            <Input
              label="Icône"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Users"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreateTeam}>
              Créer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTeam(null);
        }}
        title="Modifier l'équipe"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom de l'équipe *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Couleur
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700"
              />
            </div>
            <Input
              label="Icône"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleUpdateTeam}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal des membres */}
      {selectedTeam && (
        <TeamMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => {
            setIsMembersModalOpen(false);
            setSelectedTeam(null);
          }}
          team={selectedTeam}
          members={teamMembers}
          onMembersChange={loadTeams}
        />
      )}

      {/* Modal des permissions */}
      {selectedTeam && (
        <TeamPermissionsModal
          isOpen={isPermissionsModalOpen}
          onClose={() => {
            setIsPermissionsModalOpen(false);
            setSelectedTeam(null);
          }}
          team={selectedTeam}
          permissions={teamPermissions}
          onPermissionsChange={() => handleOpenPermissions(selectedTeam)}
        />
      )}

      {/* Modal des statistiques */}
      {selectedTeam && (
        <TeamStatisticsModal
          isOpen={isStatsModalOpen}
          onClose={() => {
            setIsStatsModalOpen(false);
            setSelectedTeam(null);
          }}
          team={selectedTeam}
        />
      )}
    </div>
  );
};

// Composant pour gérer les membres d'équipe
const TeamMembersModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  members: TeamMember[];
  onMembersChange: () => void;
}> = ({ isOpen, onClose, team, members, onMembersChange }) => {
  const { showToast, users } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<TeamMemberRole>('member');
  const [memberStats, setMemberStats] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

  const availableUsers = users.filter(
    u => !members.some(m => m.user_id === u.id)
  );

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      await TeamService.addTeamMember(team.id, selectedUserId, selectedRole);
      showToast('Membre ajouté', 'success');
      setSelectedUserId('');
      setSelectedRole('member');
      setIsAdding(false);
      onMembersChange();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleUpdateRole = async (userId: string, role: TeamMemberRole) => {
    try {
      await TeamService.updateTeamMemberRole(team.id, userId, role);
      showToast('Rôle mis à jour', 'success');
      onMembersChange();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Retirer ce membre de l\'équipe ?')) return;

    try {
      await TeamService.removeTeamMember(team.id, userId);
      showToast('Membre retiré', 'success');
      onMembersChange();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) {
      showToast('Veuillez entrer une adresse email', 'error');
      return;
    }

    try {
      await TeamService.inviteMemberByEmail(team.id, inviteEmail, selectedRole);
      showToast('Invitation envoyée', 'success');
      setInviteEmail('');
      setIsInviting(false);
      onMembersChange();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const loadMemberStats = async (userId: string) => {
    if (memberStats[userId]) return; // Déjà chargé

    setLoadingStats({ ...loadingStats, [userId]: true });
    try {
      const stats = await TeamService.getMemberStatistics(team.id, userId);
      setMemberStats({ ...memberStats, [userId]: stats });
    } catch (error: any) {
      console.error('Error loading member stats:', error);
    } finally {
      setLoadingStats({ ...loadingStats, [userId]: false });
    }
  };

  const getRoleIcon = (role: TeamMemberRole) => {
    switch (role) {
      case 'owner':
        return Crown;
      case 'admin':
        return Shield;
      default:
        return User;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Membres - ${team.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setIsAdding(true)}
            disabled={availableUsers.length === 0}
          >
            Ajouter un membre
          </Button>
        </div>

        {isAdding && (
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="space-y-3">
              <Dropdown
                label="Utilisateur"
                value={selectedUserId}
                onChange={(value) => setSelectedUserId(value)}
                options={availableUsers.map(u => ({
                  value: u.id,
                  label: u.name || u.email,
                }))}
              />
              <Dropdown
                label="Rôle"
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as TeamMemberRole)}
                options={[
                  { value: 'member', label: 'Membre' },
                  { value: 'admin', label: 'Administrateur' },
                  { value: 'owner', label: 'Propriétaire' },
                ]}
              />
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleAddMember}>
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {members.map((member) => {
            const user = users.find(u => u.id === member.user_id);
            const RoleIcon = getRoleIcon(member.role);
            
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <RoleIcon className="text-slate-400" size={20} />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {user?.name || user?.email || 'Utilisateur inconnu'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {member.role === 'owner' ? 'Propriétaire' : member.role === 'admin' ? 'Administrateur' : 'Membre'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={BarChart3}
                    onClick={() => loadMemberStats(member.user_id)}
                    title="Voir les statistiques"
                  />
                  <Dropdown
                    value={member.role}
                    onChange={(value) => handleUpdateRole(member.user_id, value as TeamMemberRole)}
                    options={[
                      { value: 'member', label: 'Membre' },
                      { value: 'admin', label: 'Admin' },
                      { value: 'owner', label: 'Owner' },
                    ]}
                    size="sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleRemoveMember(member.user_id)}
                  />
                </div>
              </div>
              {memberStats[member.user_id] && (
                <div className="ml-8 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Tâches</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {memberStats[member.user_id].tasksCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Complétées</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {memberStats[member.user_id].completedTasksCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Leads</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {memberStats[member.user_id].leadsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Actifs</p>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {memberStats[member.user_id].activeLeadsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Projets</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {memberStats[member.user_id].projectsCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

// Composant pour gérer les permissions
const TeamPermissionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  permissions: TeamPermission[];
  onPermissionsChange: () => void;
}> = ({ isOpen, onClose, team, permissions, onPermissionsChange }) => {
  const { showToast } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [newPermission, setNewPermission] = useState({
    resource_type: 'all' as ResourceType,
    resource_id: '',
    permission_type: 'read' as PermissionType,
    granted_to_role: 'member' as TeamMemberRole,
  });

  const handleAddPermission = async () => {
    try {
      await TeamService.addTeamPermission({
        team_id: team.id,
        ...newPermission,
        resource_id: newPermission.resource_id || undefined,
      });
      showToast('Permission ajoutée', 'success');
      setIsAdding(false);
      setNewPermission({
        resource_type: 'all',
        resource_id: '',
        permission_type: 'read',
        granted_to_role: 'member',
      });
      onPermissionsChange();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      await TeamService.removeTeamPermission(permissionId);
      showToast('Permission supprimée', 'success');
      onPermissionsChange();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Permissions - ${team.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="primary" icon={Plus} onClick={() => setIsAdding(true)}>
            Ajouter une permission
          </Button>
        </div>

        {isAdding && (
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="space-y-3">
              <Dropdown
                label="Type de ressource"
                value={newPermission.resource_type}
                onChange={(value) => setNewPermission({ ...newPermission, resource_type: value as ResourceType })}
                options={[
                  { value: 'all', label: 'Toutes' },
                  { value: 'project', label: 'Projets' },
                  { value: 'lead', label: 'Leads' },
                  { value: 'document', label: 'Documents' },
                  { value: 'campaign', label: 'Campagnes' },
                  { value: 'task', label: 'Tâches' },
                ]}
              />
              <Input
                label="ID de ressource (optionnel)"
                value={newPermission.resource_id}
                onChange={(e) => setNewPermission({ ...newPermission, resource_id: e.target.value })}
                placeholder="Laisser vide pour permissions globales"
              />
              <Dropdown
                label="Type de permission"
                value={newPermission.permission_type}
                onChange={(value) => setNewPermission({ ...newPermission, permission_type: value as PermissionType })}
                options={[
                  { value: 'read', label: 'Lecture' },
                  { value: 'write', label: 'Écriture' },
                  { value: 'delete', label: 'Suppression' },
                  { value: 'admin', label: 'Administration' },
                ]}
              />
              <Dropdown
                label="Rôle requis"
                value={newPermission.granted_to_role}
                onChange={(value) => setNewPermission({ ...newPermission, granted_to_role: value as TeamMemberRole })}
                options={[
                  { value: 'member', label: 'Membre' },
                  { value: 'admin', label: 'Administrateur' },
                  { value: 'owner', label: 'Propriétaire' },
                ]}
              />
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleAddPermission}>
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {permissions.map((permission) => (
            <div
              key={permission.id}
              className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {permission.resource_type} - {permission.permission_type}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Rôle requis: {permission.granted_to_role}
                  {permission.resource_id && ` • ID: ${permission.resource_id}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => handleRemovePermission(permission.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// Composant pour afficher les statistiques
const TeamStatisticsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  team: Team;
}> = ({ isOpen, onClose, team }) => {
  const [statistics, setStatistics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStatistics();
    }
  }, [isOpen, team.id]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const stats = await TeamService.getTeamStatistics(
        team.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Statistiques - ${team.name}`} size="lg">
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {statistics.map((stat) => (
              <div
                key={stat.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {stat.metric_type === 'leads_created' ? 'Leads créés' :
                   stat.metric_type === 'tasks_completed' ? 'Tâches complétées' :
                   stat.metric_type === 'revenue' ? 'Revenu' : stat.metric_type}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.metric_type === 'revenue' 
                    ? `${stat.metric_value.toLocaleString('fr-FR')} €`
                    : stat.metric_value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

