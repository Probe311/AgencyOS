import React, { useState } from 'react';
import { Mail, Plus, Send, Calendar, Users, Target, BarChart3, Filter, Play, Pause, Edit3, Trash2, Save, Clock } from 'lucide-react';
import { useEmailSegments } from '../../lib/supabase/hooks/useEmailSegments';
import { useEmailTemplates } from '../../lib/supabase/hooks/useEmailTemplates';
import { EmailCampaign, EmailSegment, EmailTemplate } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { EmailVariableHelper } from './EmailVariableHelper';

export const EmailCampaignsManager: React.FC = () => {
  const { segments, loading: segmentsLoading } = useEmailSegments();
  const { templates, loading: templatesLoading } = useEmailTemplates();
  const { showToast } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'scheduled' | 'sending' | 'sent'>('all');

  // Mock campaigns data - à remplacer par un hook réel
  const [campaigns] = useState<EmailCampaign[]>([]);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = () => {
    setIsEditorOpen(true);
  };

  if (segmentsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Campagnes Email</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Créez et gérez vos campagnes email marketing</p>
        </div>
        <div className="flex gap-2">
          <Button icon={Plus} onClick={handleCreateCampaign}>
            Nouvelle Campagne
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Mail size={20} className="text-slate-400" />
            <Badge className="bg-blue-100 text-blue-700">Total</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Campagnes</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{campaigns.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Send size={20} className="text-slate-400" />
            <Badge className="bg-emerald-100 text-emerald-700">Envoyées</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Envoyées</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {campaigns.filter(c => c.status === 'sent').length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={20} className="text-slate-400" />
            <Badge className="bg-amber-100 text-amber-700">Planifiées</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Planifiées</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {campaigns.filter(c => c.status === 'scheduled').length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} className="text-slate-400" />
            <Badge className="bg-indigo-100 text-indigo-700">Segments</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Segments</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{segments.length}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <SearchBar
          placeholder="Rechercher une campagne..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="flex-1"
        />
        <Dropdown
          value={selectedStatus}
          onChange={(value) => setSelectedStatus(value as any)}
          options={[
            { label: 'Statuts', value: 'all' },
            { label: 'Brouillon', value: 'draft' },
            { label: 'Planifiée', value: 'scheduled' },
            { label: 'En cours', value: 'sending' },
            { label: 'Envoyée', value: 'sent' },
          ]}
          containerClassName="w-48"
        />
      </div>

      {/* Campaigns List */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <Mail size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">Aucune campagne trouvée</p>
            <p className="text-sm">Créez votre première campagne pour commencer</p>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-slate-900 dark:text-white">{campaign.name}</h4>
                      <Badge
                        className={
                          campaign.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : campaign.status === 'scheduled'
                            ? 'bg-amber-100 text-amber-700'
                            : campaign.status === 'sending'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{campaign.totalRecipients} destinataires</span>
                      {campaign.scheduledAt && (
                        <span>Planifiée le {new Date(campaign.scheduledAt).toLocaleDateString('fr-FR')}</span>
                      )}
                      {campaign.sentAt && (
                        <span>Envoyée le {new Date(campaign.sentAt).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" icon={BarChart3}>
                      Analytics
                    </Button>
                    <Button size="sm" variant="ghost" icon={Edit3}>
                      Modifier
                    </Button>
                    <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600">
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="Nouvelle campagne email"
        className="max-w-5xl"
      >
        <div className="space-y-6">
          <Input label="Nom de la campagne *" placeholder="ex: Newsletter Janvier 2024" />
          <Textarea label="Description" placeholder="Description de la campagne..." rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Template *"
              options={templates.map(t => ({ label: t.name, value: t.id }))}
            />
            <Dropdown
              label="Segment *"
              options={segments.map(s => ({ label: `${s.name} (${s.leadCount} leads)`, value: s.id }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expéditeur (nom)" placeholder="ex: Agence Marketing" />
            <Input label="Expéditeur (email)" placeholder="ex: contact@agence.com" type="email" />
          </div>
          
          {/* Variables de personnalisation */}
          <div>
            <EmailVariableHelper compact />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              💡 Les variables seront automatiquement remplacées lors de l'envoi pour chaque destinataire
            </p>
          </div>

          {/* Planification */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Planification</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Date et heure d'envoi" 
                type="datetime-local"
                placeholder="Sélectionner une date"
              />
              <Dropdown
                label="Fuseau horaire"
                options={[
                  { label: 'Europe/Paris (UTC+1)', value: 'Europe/Paris' },
                  { label: 'UTC', value: 'UTC' },
                  { label: 'America/New_York (UTC-5)', value: 'America/New_York' },
                ]}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Laissez vide pour un envoi immédiat après création
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Annuler
            </Button>
            <Button icon={Save}>Créer la campagne</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

