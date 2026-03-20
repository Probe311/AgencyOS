import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Checkbox } from '../ui/Checkbox';
import { Loader } from '../ui/Loader';
import { SAMLService, SAMLIdPConfiguration } from '../../lib/services/samlService';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../../lib/supabase';

export const SAMLConfiguration: React.FC = () => {
  const { showToast, users, teams } = useApp();
  const [configurations, setConfigurations] = useState<SAMLIdPConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SAMLIdPConfiguration | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entity_id: '',
    sso_url: '',
    slo_url: '',
    certificate: '',
    signature_algorithm: 'RSA-SHA256',
    digest_algorithm: 'SHA256',
    name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    attribute_mapping: {
      email: 'email',
      name: 'name',
      first_name: 'firstName',
      last_name: 'lastName',
      role: 'role',
    } as Record<string, string>,
    jit_enabled: true,
    jit_default_role: 'user',
    jit_default_team_id: '',
    is_active: true,
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const configs = await SAMLService.getActiveIdPConfigurations();
      // Charger aussi les inactives pour l'admin
      const { data: allConfigs } = await supabase
        .from('saml_idp_configurations')
        .select('*')
        .order('name');
      setConfigurations(allConfigs || []);
    } catch (error: any) {
      showToast(`Erreur lors du chargement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      description: '',
      entity_id: '',
      sso_url: '',
      slo_url: '',
      certificate: '',
      signature_algorithm: 'RSA-SHA256',
      digest_algorithm: 'SHA256',
      name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attribute_mapping: {
        email: 'email',
        name: 'name',
        first_name: 'firstName',
        last_name: 'lastName',
        role: 'role',
      },
      jit_enabled: true,
      jit_default_role: 'user',
      jit_default_team_id: '',
      is_active: true,
    });
    setValidationErrors([]);
    setIsModalOpen(true);
  };

  const handleEdit = (config: SAMLIdPConfiguration) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      entity_id: config.entity_id,
      sso_url: config.sso_url,
      slo_url: config.slo_url || '',
      certificate: config.certificate,
      signature_algorithm: config.signature_algorithm,
      digest_algorithm: config.digest_algorithm,
      name_id_format: config.name_id_format,
      attribute_mapping: config.attribute_mapping,
      jit_enabled: config.jit_enabled,
      jit_default_role: config.jit_default_role,
      jit_default_team_id: config.jit_default_team_id || '',
      is_active: config.is_active,
    });
    setValidationErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Valider la configuration
    const validation = SAMLService.validateIdPConfiguration(formData);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      const configData = {
        ...formData,
        jit_default_team_id: formData.jit_default_team_id || undefined,
      };

      if (editingConfig) {
        await SAMLService.updateIdPConfiguration(editingConfig.id, configData);
        showToast('Configuration mise à jour', 'success');
      } else {
        await SAMLService.createIdPConfiguration(configData);
        showToast('Configuration créée', 'success');
      }

      setIsModalOpen(false);
      loadConfigurations();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      return;
    }

    try {
      await SAMLService.deleteIdPConfiguration(id);
      showToast('Configuration supprimée', 'success');
      loadConfigurations();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleTestSSO = async (configId: string) => {
    try {
      const result = await SAMLService.initiateSSO(configId);
      // Rediriger vers l'IdP
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      showToast(`Erreur lors du test SSO: ${error.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configuration SSO SAML</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configurez les Identity Providers (IdP) pour l'authentification unique
          </p>
        </div>
        <Button onClick={handleCreateNew} icon={Plus}>
          Nouvelle configuration
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} />
            <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
          </div>
        </div>
      ) : configurations.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Shield size={48} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">Aucune configuration SAML</p>
          <Button onClick={handleCreateNew} icon={Plus} variant="primary">
            Créer une configuration
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configurations.map((config) => (
            <div
              key={config.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">{config.name}</h3>
                  {config.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {config.description}
                    </p>
                  )}
                </div>
                <Badge variant={config.is_active ? 'success' : 'default'} className="text-xs">
                  {config.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div><strong>Entity ID:</strong> {config.entity_id}</div>
                <div><strong>SSO URL:</strong> {config.sso_url}</div>
                <div><strong>JIT:</strong> {config.jit_enabled ? 'Activé' : 'Désactivé'}</div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit2}
                  onClick={() => handleEdit(config)}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Shield}
                  onClick={() => handleTestSSO(config.id)}
                >
                  Tester SSO
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDelete(config.id)}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingConfig ? 'Modifier la configuration SAML' : 'Nouvelle configuration SAML'}
        size="large"
      >
        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    Erreurs de validation
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Nom de la configuration"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />

          <Input
            label="Entity ID (IdP)"
            value={formData.entity_id}
            onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
            placeholder="https://idp.example.com/saml/metadata"
            required
          />

          <Input
            label="SSO URL"
            value={formData.sso_url}
            onChange={(e) => setFormData({ ...formData, sso_url: e.target.value })}
            placeholder="https://idp.example.com/sso"
            required
          />

          <Input
            label="SLO URL (optionnel)"
            value={formData.slo_url}
            onChange={(e) => setFormData({ ...formData, slo_url: e.target.value })}
            placeholder="https://idp.example.com/slo"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Certificat X.509 (PEM)
            </label>
            <Textarea
              value={formData.certificate}
              onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Algorithme de signature"
              value={formData.signature_algorithm}
              onChange={(value) => setFormData({ ...formData, signature_algorithm: value })}
              options={[
                { value: 'RSA-SHA1', label: 'RSA-SHA1' },
                { value: 'RSA-SHA256', label: 'RSA-SHA256' },
                { value: 'RSA-SHA512', label: 'RSA-SHA512' },
              ]}
            />

            <Dropdown
              label="Algorithme de digest"
              value={formData.digest_algorithm}
              onChange={(value) => setFormData({ ...formData, digest_algorithm: value })}
              options={[
                { value: 'SHA1', label: 'SHA1' },
                { value: 'SHA256', label: 'SHA256' },
                { value: 'SHA512', label: 'SHA512' },
              ]}
            />
          </div>

          <Dropdown
            label="Format Name ID"
            value={formData.name_id_format}
            onChange={(value) => setFormData({ ...formData, name_id_format: value })}
            options={[
              { value: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress', label: 'Email Address' },
              { value: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent', label: 'Persistent' },
              { value: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient', label: 'Transient' },
            ]}
          />

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
              Mapping des attributs SAML
            </h4>
            <div className="space-y-2">
              {['email', 'name', 'first_name', 'last_name', 'role'].map((field) => (
                <Input
                  key={field}
                  label={field === 'email' ? 'Email' : field === 'first_name' ? 'Prénom' : field === 'last_name' ? 'Nom' : field === 'name' ? 'Nom complet' : 'Rôle'}
                  value={formData.attribute_mapping[field] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    attribute_mapping: {
                      ...formData.attribute_mapping,
                      [field]: e.target.value,
                    },
                  })}
                  placeholder={`Attribut SAML pour ${field}`}
                />
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
              JIT Provisioning (Just-In-Time)
            </h4>
            <Checkbox
              label="Activer le JIT Provisioning"
              checked={formData.jit_enabled}
              onChange={(checked) => setFormData({ ...formData, jit_enabled: checked })}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
              Si activé, les utilisateurs seront créés automatiquement lors de leur première connexion SSO
            </p>

            {formData.jit_enabled && (
              <>
                <Dropdown
                  label="Rôle par défaut"
                  value={formData.jit_default_role}
                  onChange={(value) => setFormData({ ...formData, jit_default_role: value })}
                  options={[
                    { value: 'user', label: 'Utilisateur' },
                    { value: 'admin', label: 'Administrateur' },
                    { value: 'manager', label: 'Manager' },
                  ]}
                />

                <Dropdown
                  label="Équipe par défaut (optionnel)"
                  value={formData.jit_default_team_id}
                  onChange={(value) => setFormData({ ...formData, jit_default_team_id: value })}
                  options={[
                    { value: '', label: 'Aucune' },
                    ...(teams || []).map(t => ({ value: t.id, label: t.name })),
                  ]}
                />
              </>
            )}
          </div>

          <Checkbox
            label="Activer cette configuration"
            checked={formData.is_active}
            onChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} icon={saving ? undefined : Save}>
              {saving ? 'Enregistrement...' : editingConfig ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

