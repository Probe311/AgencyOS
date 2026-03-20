import React, { useState, useEffect } from 'react';
import { Webhook, Zap, Plus, Edit3, Trash2, Play, Pause, CheckCircle, XCircle, Clock, RefreshCw, Eye, Copy } from 'lucide-react';
import { useWebhooks } from '../../lib/supabase/hooks/useWebhooks';
import { WEBHOOK_EVENT_TYPES, WebhookDelivery } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { useApp } from '../contexts/AppContext';

export const WebhooksView: React.FC = () => {
  const { webhooks, loading, createWebhook, updateWebhook, deleteWebhook, toggleWebhook, getWebhookDeliveries, retryDelivery, testWebhook } = useWebhooks();
  const { showToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | undefined>();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[],
    active: true,
    description: '',
    headers: '',
  });

  useEffect(() => {
    if (editingWebhook) {
      setFormData({
        name: editingWebhook.name,
        url: editingWebhook.url,
        secret: editingWebhook.secret || '',
        events: editingWebhook.events,
        active: editingWebhook.active,
        description: editingWebhook.description || '',
        headers: editingWebhook.headers ? JSON.stringify(editingWebhook.headers, null, 2) : '',
      });
    }
  }, [editingWebhook]);

  const handleOpenModal = (webhook?: Webhook) => {
    setEditingWebhook(webhook);
    if (!webhook) {
      setFormData({
        name: '',
        url: '',
        secret: '',
        events: [],
        active: true,
        description: '',
        headers: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let headers: Record<string, string> | undefined;
      if (formData.headers) {
        try {
          headers = JSON.parse(formData.headers);
        } catch (err) {
          showToast('Format JSON invalide pour les headers', 'error');
          return;
        }
      }

      if (editingWebhook) {
        await updateWebhook(editingWebhook.id, {
          ...formData,
          headers,
        });
        showToast('Webhook mis à jour', 'success');
      } else {
        await createWebhook({
          ...formData,
          headers,
        });
        showToast('Webhook créé', 'success');
      }
      setIsModalOpen(false);
      setEditingWebhook(undefined);
    } catch (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce webhook ?')) {
      try {
        await deleteWebhook(id);
        showToast('Webhook supprimé', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleWebhook(id, active);
      showToast(`Webhook ${active ? 'activé' : 'désactivé'}`, 'success');
    } catch (error) {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const handleViewDeliveries = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    const deliveriesData = await getWebhookDeliveries(webhook.id);
    setDeliveries(deliveriesData);
    setIsDeliveriesModalOpen(true);
  };

  const handleTest = async (id: string) => {
    try {
      const success = await testWebhook(id);
      if (success) {
        showToast('Webhook de test envoyé', 'success');
      } else {
        showToast('Erreur lors du test', 'error');
      }
    } catch (error) {
      showToast('Erreur lors du test', 'error');
    }
  };

  const eventOptions = Object.entries(WEBHOOK_EVENT_TYPES).map(([value, label]) => ({
    label,
    value,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-400">Chargement des webhooks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Configurez des webhooks pour recevoir des notifications en temps réel
          </p>
        </div>
        <Button icon={Plus} onClick={() => handleOpenModal()}>
          Nouveau Webhook
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {webhooks.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center">
            <Zap size={48} className="mx-auto mb-4 text-slate-400 opacity-20" />
            <p className="text-slate-400 mb-2">Aucun webhook configuré</p>
            <p className="text-sm text-slate-500 mb-4">
              Créez votre premier webhook pour recevoir des notifications d'événements
            </p>
            <Button icon={Plus} onClick={() => handleOpenModal()}>
              Créer un webhook
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap size={20} className="text-indigo-600 dark:text-indigo-400" />
                      <h3 className="font-bold text-slate-900 dark:text-white">{webhook.name}</h3>
                      <Badge
                        className={
                          webhook.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {webhook.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      {webhook.url}
                    </p>
                    {webhook.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {webhook.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {WEBHOOK_EVENT_TYPES[event as keyof typeof WEBHOOK_EVENT_TYPES] || event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={webhook.active ? Pause : Play}
                      onClick={() => handleToggle(webhook.id, !webhook.active)}
                      title={webhook.active ? 'Désactiver' : 'Activer'}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Play}
                      onClick={() => handleTest(webhook.id)}
                      title="Tester"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Eye}
                      onClick={() => handleViewDeliveries(webhook)}
                      title="Voir les deliveries"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Edit3}
                      onClick={() => handleOpenModal(webhook)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => handleDelete(webhook.id)}
                      className="text-rose-600 hover:text-rose-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWebhook(undefined);
        }}
        title={editingWebhook ? 'Modifier le webhook' : 'Nouveau webhook'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Mon webhook"
          />
          <Input
            label="URL"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
            placeholder="https://example.com/webhook"
          />
          <Input
            label="Secret (optionnel)"
            type="password"
            value={formData.secret}
            onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
            placeholder="Secret pour signer les payloads"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Événements
            </label>
            <select
              multiple
              value={formData.events}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, events: selected });
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              size={Math.min(eventOptions.length, 8)}
            >
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Sélectionnez les événements à écouter (Ctrl/Cmd + clic pour plusieurs)
            </p>
          </div>
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Headers personnalisés (JSON)
            </label>
            <Textarea
              value={formData.headers}
              onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
              rows={3}
              placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
            />
            <p className="text-xs text-slate-500 mt-1">
              Headers HTTP personnalisés au format JSON
            </p>
          </div>
          <Checkbox
            id="active"
            label="Actif"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editingWebhook ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Deliveries Modal */}
      <Modal
        isOpen={isDeliveriesModalOpen}
        onClose={() => {
          setIsDeliveriesModalOpen(false);
          setSelectedWebhook(null);
        }}
        title={`Deliveries - ${selectedWebhook?.name || ''}`}
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Aucune delivery enregistrée
              </div>
            ) : (
              deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {delivery.status === 'success' && (
                        <CheckCircle size={16} className="text-emerald-600" />
                      )}
                      {delivery.status === 'failed' && (
                        <XCircle size={16} className="text-rose-600" />
                      )}
                      {(delivery.status === 'pending' || delivery.status === 'retrying') && (
                        <Clock size={16} className="text-amber-600" />
                      )}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {delivery.eventType}
                      </span>
                      <Badge
                        className={
                          delivery.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : delivery.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {delivery.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {delivery.responseStatus && (
                        <Badge variant="outline">{delivery.responseStatus}</Badge>
                      )}
                      {delivery.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={RefreshCw}
                          onClick={() => retryDelivery(delivery.id)}
                        >
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    {new Date(delivery.createdAt).toLocaleString('fr-FR')}
                    {delivery.attempts > 0 && ` • ${delivery.attempts} tentative(s)`}
                  </div>
                  {delivery.errorMessage && (
                    <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                      {delivery.errorMessage}
                    </div>
                  )}
                  {delivery.responseBody && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer">
                        Voir la réponse
                      </summary>
                      <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded mt-2 overflow-x-auto">
                        {delivery.responseBody}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

