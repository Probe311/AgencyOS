import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Quote, QuoteItem } from '../../types';
import { useQuotes } from '../../lib/supabase/hooks/useQuotes';
import { useLeads } from '../../lib/supabase/hooks/useLeads';
import { useProjects } from '../../lib/supabase/hooks/useProjects';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { validateInvoiceForEInvoicing } from '../../lib/utils/invoiceValidation';
import { useApp } from '../contexts/AppContext';

interface QuoteFormProps {
  quote?: Quote | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ quote, onSuccess, onCancel }) => {
  const { createQuote, updateQuote } = useQuotes();
  const { leads } = useLeads();
  const { projects } = useProjects();
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    leadId: quote?.leadId || '',
    projectId: quote?.projectId || '',
    clientName: quote?.clientName || '',
    clientEmail: quote?.clientEmail || '',
    clientAddress: quote?.clientAddress || '',
    clientAddressLine1: quote?.clientAddressLine1 || '',
    clientAddressLine2: quote?.clientAddressLine2 || '',
    clientPostalCode: quote?.clientPostalCode || '',
    clientCity: quote?.clientCity || '',
    clientCountry: quote?.clientCountry || 'France',
    clientCompany: quote?.clientCompany || '',
    clientSiret: quote?.clientSiret || '',
    clientSiren: quote?.clientSiren || '',
    clientVatNumber: quote?.clientVatNumber || '',
    title: quote?.title || '',
    description: quote?.description || '',
    taxRate: quote?.taxRate || 20,
    currency: quote?.currency || 'EUR',
    validUntil: quote?.validUntil || '',
    orderReference: quote?.orderReference || '',
    paymentTerms: quote?.paymentTerms || '',
    notes: quote?.notes || '',
    terms: quote?.terms || '',
  });
  const [items, setItems] = useState<Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt'>[]>(
    quote?.items?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      total: item.total,
      position: item.position,
    })) || [{ description: '', quantity: 1, unitPrice: 0, taxRate: undefined, total: 0, position: 0 }]
  );

  useEffect(() => {
    if (quote?.leadId) {
      const lead = leads.find(l => l.id === quote.leadId);
      if (lead) {
        setFormData(prev => ({
          ...prev,
          clientName: lead.name || prev.clientName,
          clientEmail: lead.email || prev.clientEmail,
          clientCompany: lead.company || prev.clientCompany,
        }));
      }
    }
  }, [quote?.leadId, leads]);

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0, position: items.length }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (formData.taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    // Validation pour la facturation électronique
    const validation = validateInvoiceForEInvoicing({
      clientName: formData.clientName,
      clientAddressLine1: formData.clientAddressLine1,
      clientPostalCode: formData.clientPostalCode,
      clientCity: formData.clientCity,
      clientSiret: formData.clientSiret,
      clientSiren: formData.clientSiren,
      clientVatNumber: formData.clientVatNumber,
      clientCountry: formData.clientCountry || 'France',
      isCompany: !!formData.clientCompany || !!formData.clientSiret || !!formData.clientSiren,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast('Veuillez corriger les erreurs de validation', 'error');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const quoteData: Partial<Quote> = {
        ...formData,
        subtotal,
        taxAmount,
        total,
        status: quote?.status || 'draft',
      };

      if (quote) {
        await updateQuote(quote.id, quoteData, items);
      } else {
        await createQuote(quoteData, items);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving quote:', error);
      showToast('Erreur lors de l\'enregistrement du devis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <h3 className="font-bold text-red-900 dark:text-red-300 text-sm mb-2">Erreurs de validation</h3>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Dropdown
          label="Lead"
          value={formData.leadId}
          onChange={(value) => setFormData({ ...formData, leadId: value })}
          options={[
            { label: 'Aucun', value: '' },
            ...leads.map(lead => ({ label: `${lead.name} - ${lead.company}`, value: lead.id }))
          ]}
        />
        <Dropdown
          label="Projet"
          value={formData.projectId}
          onChange={(value) => setFormData({ ...formData, projectId: value })}
          options={[
            { label: 'Aucun', value: '' },
            ...projects.map(project => ({ label: project.name, value: project.id }))
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nom du client"
          value={formData.clientName}
          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.clientEmail}
          onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Entreprise"
          value={formData.clientCompany}
          onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
        />
        <Input
          label="Date d'expiration"
          type="date"
          value={formData.validUntil}
          onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
        />
      </div>

      {/* Adresse complète du client pour conformité facturation électronique */}
      <div className="border-t border-slate-200 pt-4 mt-4">
        <h4 className="font-semibold text-slate-700 mb-3 text-sm">Adresse du client (conformité facturation électronique)</h4>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Adresse (ligne 1)"
            value={formData.clientAddressLine1}
            onChange={(e) => setFormData({ ...formData, clientAddressLine1: e.target.value })}
            placeholder="Numéro et nom de rue"
          />
          <Input
            label="Adresse (ligne 2)"
            value={formData.clientAddressLine2}
            onChange={(e) => setFormData({ ...formData, clientAddressLine2: e.target.value })}
            placeholder="Complément d'adresse (optionnel)"
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Input
            label="Code postal"
            value={formData.clientPostalCode}
            onChange={(e) => setFormData({ ...formData, clientPostalCode: e.target.value })}
          />
          <Input
            label="Ville"
            value={formData.clientCity}
            onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
          />
          <Input
            label="Pays"
            value={formData.clientCountry}
            onChange={(e) => setFormData({ ...formData, clientCountry: e.target.value })}
          />
        </div>
      </div>

      {/* Informations légales du client */}
      <div className="border-t border-slate-200 pt-4 mt-4">
        <h4 className="font-semibold text-slate-700 mb-3 text-sm">Informations légales du client</h4>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="SIRET (14 chiffres)"
            value={formData.clientSiret}
            onChange={(e) => setFormData({ ...formData, clientSiret: e.target.value })}
            placeholder="12345678901234"
            maxLength={14}
          />
          <Input
            label="SIREN (9 chiffres)"
            value={formData.clientSiren}
            onChange={(e) => setFormData({ ...formData, clientSiren: e.target.value })}
            placeholder="123456789"
            maxLength={9}
          />
          <Input
            label="N° TVA intracommunautaire"
            value={formData.clientVatNumber}
            onChange={(e) => setFormData({ ...formData, clientVatNumber: e.target.value })}
            placeholder="FR12345678901"
          />
        </div>
      </div>

      {/* Adresse complète (legacy - gardée pour compatibilité) */}
      <Input
        label="Adresse (format libre - optionnel)"
        value={formData.clientAddress}
        onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
        placeholder="Si les champs détaillés ci-dessus ne sont pas remplis"
      />

      <Input
        label="Titre du devis"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        rows={3}
      />

      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-sm text-slate-700">Lignes de devis</h4>
          <Button type="button" size="sm" variant="ghost" icon={Plus} onClick={addItem}>
            Ajouter une ligne
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                placeholder="Description"
                containerClassName="flex-1"
                required
              />
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                placeholder="Qté"
                containerClassName="w-24"
                min="0"
                step="0.01"
                required
              />
              <Input
                type="number"
                value={item.unitPrice}
                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="Prix U. HT"
                containerClassName="w-32"
                min="0"
                step="0.01"
                required
              />
              <Input
                type="number"
                value={item.taxRate ?? formData.taxRate}
                onChange={(e) => handleItemChange(index, 'taxRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="TVA %"
                containerClassName="w-20"
                min="0"
                max="100"
                step="0.01"
                title="Taux de TVA spécifique pour cette ligne (laisser vide pour utiliser le taux global)"
              />
              <div className="w-32 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                {item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency} HT
              </div>
              {items.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => removeItem(index)}
                  className="text-red-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Taux de TVA (%)"
          type="number"
          value={formData.taxRate}
          onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
          min="0"
          max="100"
          step="0.01"
        />
        <Input
          label="Devise"
          value={formData.currency}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
        />
        <Input
          label="Conditions de paiement"
          value={formData.paymentTerms}
          onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
          placeholder="Ex: 30 jours net"
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="flex justify-end space-x-4 text-right">
          <div>
            <div className="text-sm text-slate-500 mb-1">Sous-total</div>
            <div className="text-lg font-bold text-slate-900">
              {subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1">TVA ({formData.taxRate}%)</div>
            <div className="text-lg font-bold text-slate-900">
              {taxAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1">Total</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency}
            </div>
          </div>
        </div>
      </div>

      <Textarea
        label="Notes internes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        rows={2}
      />

      <Textarea
        label="Conditions générales"
        value={formData.terms}
        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : quote ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

