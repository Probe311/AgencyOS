import React, { useState, useEffect } from 'react';
import { Building, Save, AlertCircle } from 'lucide-react';
import { CompanySettings } from '../../types';
import { useCompanySettings } from '../../lib/supabase/hooks/useCompanySettings';
import { useWorkspaces } from '../../lib/supabase/hooks/useWorkspaces';
import { validateCompanySettings } from '../../lib/utils/invoiceValidation';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';

export const CompanySettingsForm: React.FC = () => {
  const { showToast } = useApp();
  const { workspaces } = useWorkspaces();
  // Utiliser le premier workspace disponible ou undefined
  const currentWorkspaceId = workspaces && workspaces.length > 0 ? workspaces[0].id : undefined;
  const { companySettings, loading, createCompanySettings, updateCompanySettings } = useCompanySettings(currentWorkspaceId);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<CompanySettings>>({
    legalName: '',
    siren: '',
    siret: '',
    vatNumber: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    country: 'France',
    phone: '',
    email: '',
    website: '',
    capitalSocial: undefined,
    legalForm: '',
    rcs: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (companySettings) {
      setFormData({
        legalName: companySettings.legalName || '',
        siren: companySettings.siren || '',
        siret: companySettings.siret || '',
        vatNumber: companySettings.vatNumber || '',
        addressLine1: companySettings.addressLine1 || '',
        addressLine2: companySettings.addressLine2 || '',
        postalCode: companySettings.postalCode || '',
        city: companySettings.city || '',
        country: companySettings.country || 'France',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        website: companySettings.website || '',
        capitalSocial: companySettings.capitalSocial,
        legalForm: companySettings.legalForm || '',
        rcs: companySettings.rcs || '',
        logoUrl: companySettings.logoUrl || '',
      });
    }
  }, [companySettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validation
    const validation = validateCompanySettings(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      showToast('Veuillez corriger les erreurs de validation', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (companySettings) {
        await updateCompanySettings(companySettings.id, formData);
        showToast('Informations de l\'entreprise mises à jour avec succès', 'success');
      } else {
        // Inclure le workspaceId lors de la création
        await createCompanySettings({ ...formData, workspaceId: currentWorkspaceId });
        showToast('Informations de l\'entreprise enregistrées avec succès', 'success');
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader size={32} />
          <p className="ml-3 text-slate-500 dark:text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <Building size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informations de l'entreprise</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configurez les informations de votre entreprise pour la facturation électronique
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 dark:text-red-300 text-sm mb-2">Erreurs de validation</h3>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations légales */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
            Informations légales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Raison sociale *"
              value={formData.legalName || ''}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              required
            />
            <Input
              label="Forme juridique"
              value={formData.legalForm || ''}
              onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
              placeholder="SARL, SAS, SA, etc."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input
              label="SIREN (9 chiffres)"
              value={formData.siren || ''}
              onChange={(e) => setFormData({ ...formData, siren: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="123456789"
              maxLength={9}
            />
            <Input
              label="SIRET (14 chiffres)"
              value={formData.siret || ''}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value.replace(/\D/g, '').slice(0, 14) })}
              placeholder="12345678901234"
              maxLength={14}
            />
            <Input
              label="N° TVA intracommunautaire"
              value={formData.vatNumber || ''}
              onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.toUpperCase().replace(/\s/g, '') })}
              placeholder="FR12345678901"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="RCS"
              value={formData.rcs || ''}
              onChange={(e) => setFormData({ ...formData, rcs: e.target.value })}
              placeholder="RCS Paris B 123 456 789"
            />
            <Input
              label="Capital social (€)"
              type="number"
              value={formData.capitalSocial || ''}
              onChange={(e) => setFormData({ ...formData, capitalSocial: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="10000"
              step="0.01"
            />
          </div>
        </div>

        {/* Adresse */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
            Adresse
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Adresse (ligne 1) *"
              value={formData.addressLine1 || ''}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              required
            />
            <Input
              label="Adresse (ligne 2)"
              value={formData.addressLine2 || ''}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              placeholder="Complément d'adresse (optionnel)"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input
              label="Code postal *"
              value={formData.postalCode || ''}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              placeholder="75001"
              maxLength={5}
              required
            />
            <Input
              label="Ville *"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="Pays"
              value={formData.country || 'France'}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
            Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+33 1 23 45 67 89"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@entreprise.fr"
            />
            <Input
              label="Site web"
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.entreprise.fr"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
            Identité visuelle
          </h3>
          <div className="space-y-4">
            <Input
              label="URL du logo"
              type="url"
              value={formData.logoUrl || ''}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-1">
              URL du logo de votre agence (sera utilisé dans les emails)
            </p>
            {formData.logoUrl && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Aperçu du logo :</p>
                <img 
                  src={formData.logoUrl} 
                  alt="Logo de l'agence" 
                  className="max-h-20 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="submit"
            disabled={isSaving}
            icon={Save}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>

      {companySettings && (
        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-center gap-2">
            <Badge variant="success">Configuré</Badge>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Les informations de l'entreprise sont configurées et seront utilisées pour la facturation électronique.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

