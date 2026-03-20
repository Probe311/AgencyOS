import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit3, Trash2, Users, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useClients } from '../../lib/supabase/hooks/useClients';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { Client, ClientUser } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { useApp } from '../contexts/AppContext';
import { getUserAvatar } from '../../lib/utils/avatar';

export const ClientsView: React.FC = () => {
  const { clients, loading, createClient, updateClient, deleteClient, getClientUsers, addUserToClient, removeUserFromClient, updateUserRole, switchClient } = useClients();
  const { users } = useUsers();
  const { showToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    domain: '',
    companyName: '',
    logoUrl: '',
    primaryColor: '#6366f1',
    status: 'active' as Client['status'],
    plan: 'basic' as Client['plan'],
    maxUsers: 10,
    maxProjects: 50,
    maxStorageGb: 10,
    billingEmail: '',
    billingAddress: '',
  });

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name,
        subdomain: editingClient.subdomain || '',
        domain: editingClient.domain || '',
        companyName: editingClient.companyName || '',
        logoUrl: editingClient.logoUrl || '',
        primaryColor: editingClient.primaryColor,
        status: editingClient.status,
        plan: editingClient.plan,
        maxUsers: editingClient.maxUsers,
        maxProjects: editingClient.maxProjects,
        maxStorageGb: editingClient.maxStorageGb,
        billingEmail: editingClient.billingEmail || '',
        billingAddress: editingClient.billingAddress || '',
      });
    }
  }, [editingClient]);

  const handleOpenModal = (client?: Client) => {
    setEditingClient(client);
    if (!client) {
      setFormData({
        name: '',
        subdomain: '',
        domain: '',
        companyName: '',
        logoUrl: '',
        primaryColor: '#6366f1',
        status: 'active',
        plan: 'basic',
        maxUsers: 10,
        maxProjects: 50,
        maxStorageGb: 10,
        billingEmail: '',
        billingAddress: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
        showToast('Client mis à jour avec succès', 'success');
      } else {
        await createClient(formData);
        showToast('Client créé avec succès', 'success');
      }
      setIsModalOpen(false);
      setEditingClient(undefined);
    } catch (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await deleteClient(id);
        showToast('Client supprimé', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleViewUsers = async (client: Client) => {
    setSelectedClient(client);
    const users = await getClientUsers(client.id);
    setClientUsers(users);
    setIsUsersModalOpen(true);
  };

  const handleAddUser = async (userId: string, role: ClientUser['role']) => {
    if (!selectedClient) return;
    try {
      await addUserToClient(selectedClient.id, userId, role);
      const users = await getClientUsers(selectedClient.id);
      setClientUsers(users);
      showToast('Utilisateur ajouté', 'success');
    } catch (error) {
      showToast('Erreur lors de l\'ajout', 'error');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedClient) return;
    try {
      await removeUserFromClient(selectedClient.id, userId);
      const users = await getClientUsers(selectedClient.id);
      setClientUsers(users);
      showToast('Utilisateur retiré', 'success');
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleSwitchClient = async (clientId: string) => {
    try {
      await switchClient(clientId);
      showToast('Client changé avec succès', 'success');
      window.location.reload(); // Reload to apply new client context
    } catch (error) {
      showToast('Erreur lors du changement de client', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-400">Chargement des clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Clients</h2>
          <p className="text-slate-500 dark:text-slate-400">Multi-tenant : gérez les clients et sous-comptes</p>
        </div>
        <Button icon={Plus} onClick={() => handleOpenModal()}>
          Nouveau Client
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center">
            <Building2 size={48} className="mx-auto mb-4 text-slate-400 opacity-20" />
            <p className="text-slate-400 mb-2">Aucun client créé</p>
            <p className="text-sm text-slate-500 mb-4">Créez votre premier client pour commencer</p>
            <Button icon={Plus} onClick={() => handleOpenModal()}>
              Créer un client
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {client.logoUrl ? (
                      <img src={client.logoUrl} alt={client.name} className="w-12 h-12 rounded-lg" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: client.primaryColor }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{client.name}</h3>
                      {client.companyName && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{client.companyName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Edit3}
                      onClick={() => handleOpenModal(client)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => handleDelete(client.id)}
                      className="text-rose-600 hover:text-rose-700"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Statut</span>
                    <Badge
                      className={
                        client.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : client.status === 'trial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      {client.status === 'active' ? 'Actif' : client.status === 'trial' ? 'Essai' : client.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Plan</span>
                    <Badge variant="outline">{client.plan}</Badge>
                  </div>
                  {client.subdomain && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Sous-domaine</span>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {client.subdomain}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Users}
                    onClick={() => handleViewUsers(client)}
                    className="flex-1"
                  >
                    Utilisateurs
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Settings}
                    onClick={() => handleSwitchClient(client.id)}
                    className="flex-1"
                  >
                    Activer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(undefined);
        }}
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Nom de l'entreprise"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sous-domaine"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              placeholder="client1"
            />
            <Input
              label="Domaine personnalisé"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="client1.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Statut"
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as Client['status'] })}
              options={[
                { label: 'Actif', value: 'active' },
                { label: 'Essai', value: 'trial' },
                { label: 'Suspendu', value: 'suspended' },
                { label: 'Annulé', value: 'cancelled' },
              ]}
            />
            <Dropdown
              label="Plan"
              value={formData.plan}
              onChange={(value) => setFormData({ ...formData, plan: value as Client['plan'] })}
              options={[
                { label: 'Basique', value: 'basic' },
                { label: 'Professionnel', value: 'professional' },
                { label: 'Enterprise', value: 'enterprise' },
                { label: 'Personnalisé', value: 'custom' },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Max utilisateurs"
              type="number"
              value={formData.maxUsers}
              onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
              min="1"
            />
            <Input
              label="Max projets"
              type="number"
              value={formData.maxProjects}
              onChange={(e) => setFormData({ ...formData, maxProjects: parseInt(e.target.value) || 0 })}
              min="1"
            />
            <Input
              label="Stockage (GB)"
              type="number"
              value={formData.maxStorageGb}
              onChange={(e) => setFormData({ ...formData, maxStorageGb: parseInt(e.target.value) || 0 })}
              min="1"
            />
          </div>
          <Input
            label="Email de facturation"
            type="email"
            value={formData.billingEmail}
            onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
          />
          <Textarea
            label="Adresse de facturation"
            value={formData.billingAddress}
            onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editingClient ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Client Users Modal */}
      <Modal
        isOpen={isUsersModalOpen}
        onClose={() => {
          setIsUsersModalOpen(false);
          setSelectedClient(null);
        }}
        title={`Utilisateurs - ${selectedClient?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Dropdown
              value=""
              onChange={(value) => {
                if (value) {
                  handleAddUser(value, 'Member');
                }
              }}
              options={[
                { label: 'Ajouter un utilisateur...', value: '' },
                ...users
                  .filter(u => !clientUsers.some(cu => cu.userId === u.id))
                  .map(u => ({ label: u.name, value: u.id })),
              ]}
              containerClassName="flex-1"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clientUsers.map((clientUser) => (
              <div
                key={clientUser.id}
                className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={clientUser.userAvatar || getUserAvatar(undefined, clientUser.userId)}
                    alt={clientUser.userName}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{clientUser.userName}</p>
                    <p className="text-xs text-slate-500">{clientUser.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dropdown
                    value={clientUser.role}
                    onChange={(value) => updateUserRole(clientUser.clientId, clientUser.userId, value as ClientUser['role'])}
                    options={[
                      { label: 'Owner', value: 'Owner' },
                      { label: 'Admin', value: 'Admin' },
                      { label: 'Manager', value: 'Manager' },
                      { label: 'Member', value: 'Member' },
                      { label: 'Viewer', value: 'Viewer' },
                    ]}
                    containerClassName="w-32"
                  />
                  {clientUser.isPrimary && (
                    <Badge className="bg-indigo-100 text-indigo-700">Principal</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => handleRemoveUser(clientUser.userId)}
                    className="text-rose-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

