import React, { useState } from 'react';
import { 
  Instagram, Linkedin, Youtube, X as TwitterIcon, X, ExternalLink, 
  MessageCircle, BarChart2, DollarSign, CheckCircle2, UserPlus, 
  Briefcase, Users, MoreHorizontal, Calendar, PieChart, Plus, Star, Globe, Edit2, Trash2, Tag
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Influencer } from '../../types';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { useApp } from '../contexts/AppContext';
import { PageLayout } from '../ui/PageLayout';
import { generateUniqueId } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface InfluencerCampaign {
  id: string;
  name: string;
  description?: string;
  platform: Influencer['platform'];
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  budget: number;
  startDate: string;
  endDate?: string;
  influencerIds: string[];
  createdAt: string;
  updatedAt: string;
}

const PLATFORM_OPTIONS = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Snapchat', label: 'Snapchat' },
  { value: 'Twitter', label: 'Twitter (X)' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Autre', label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: 'Contact', label: 'Contact' },
  { value: 'Négociation', label: 'Négociation' },
  { value: 'Contrat', label: 'Contrat' },
  { value: 'Terminé', label: 'Terminé' },
];

const CAMPAIGN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'scheduled', label: 'Planifiée' },
  { value: 'running', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
];

export const InfluenceView: React.FC = () => {
  const { influencers, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'network'>('network');
  const [isInfluencerModalOpen, setIsInfluencerModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Partial<Influencer> | null>(null);
  const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<Partial<InfluencerCampaign> | null>(null);
  const [influencerFormData, setInfluencerFormData] = useState({
    name: '',
    handle: '',
    platform: 'Instagram' as Influencer['platform'],
    followers: '',
    engagementRate: 0,
    niche: [] as string[],
    status: 'Contact' as Influencer['status'],
    costPerPost: 0,
    avatar: 'https://i.pravatar.cc/150?u=' + generateUniqueId(),
  });
  const [nicheInput, setNicheInput] = useState('');
  const [campaignFormData, setCampaignFormData] = useState({
    name: '',
    description: '',
    platform: 'Instagram' as Influencer['platform'],
    status: 'draft' as InfluencerCampaign['status'],
    budget: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    influencerIds: [] as string[],
  });

  const handleOpenCreateInfluencer = () => {
    setEditingInfluencer(null);
    setInfluencerFormData({
      name: '',
      handle: '',
      platform: 'Instagram',
      followers: '',
      engagementRate: 0,
      niche: [],
      status: 'Contact',
      costPerPost: 0,
      avatar: 'https://i.pravatar.cc/150?u=' + generateUniqueId(),
    });
    setNicheInput('');
    setIsInfluencerModalOpen(true);
  };

  const handleOpenEditInfluencer = (influencer: Influencer) => {
    setEditingInfluencer(influencer);
    setInfluencerFormData({
      name: influencer.name,
      handle: influencer.handle,
      platform: influencer.platform,
      followers: influencer.followers,
      engagementRate: influencer.engagementRate,
      niche: influencer.niche || [],
      status: influencer.status,
      costPerPost: influencer.costPerPost,
      avatar: influencer.avatar,
    });
    setNicheInput('');
    setIsInfluencerModalOpen(true);
  };

  const handleOpenCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignFormData({
      name: '',
      description: '',
      platform: 'Instagram',
      status: 'draft',
      budget: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      influencerIds: [],
    });
    setIsCampaignModalOpen(true);
  };

  const handleSaveInfluencer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const influencerData = {
        name: influencerFormData.name,
        handle: influencerFormData.handle,
        platform: influencerFormData.platform,
        followers: influencerFormData.followers,
        engagement_rate: influencerFormData.engagementRate,
        niche: influencerFormData.niche,
        status: influencerFormData.status,
        cost_per_post: influencerFormData.costPerPost,
        avatar: influencerFormData.avatar,
      };

      if (editingInfluencer?.id) {
        const { error } = await supabase
          .from('influencers')
          .update(influencerData)
          .eq('id', editingInfluencer.id);
        
        if (error) throw error;
        showToast('Influenceur mis à jour', 'success');
      } else {
        const { error } = await supabase
          .from('influencers')
          .insert([influencerData]);
        
        if (error) throw error;
        showToast('Influenceur créé', 'success');
      }
      
      setIsInfluencerModalOpen(false);
      window.location.reload(); // Simple reload for now
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampaign?.id) {
        const updated = campaigns.map(c => 
          c.id === editingCampaign.id 
            ? { ...c, ...campaignFormData, updatedAt: new Date().toISOString() }
            : c
        );
        setCampaigns(updated);
        showToast('Campagne mise à jour', 'success');
      } else {
        const newCampaign: InfluencerCampaign = {
          id: generateUniqueId(),
          ...campaignFormData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCampaigns([...campaigns, newCampaign]);
        showToast('Campagne créée', 'success');
      }
      setIsCampaignModalOpen(false);
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleDeleteInfluencer = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet influenceur ?')) return;
    try {
      const { error } = await supabase
        .from('influencers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast('Influenceur supprimé', 'success');
      window.location.reload();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const addNicheTag = () => {
    if (nicheInput.trim() && !influencerFormData.niche.includes(nicheInput.trim())) {
      setInfluencerFormData(prev => ({
        ...prev,
        niche: [...prev.niche, nicheInput.trim()]
      }));
      setNicheInput('');
    }
  };

  const removeNicheTag = (tag: string) => {
    setInfluencerFormData(prev => ({
      ...prev,
      niche: prev.niche.filter(t => t !== tag)
    }));
  };

  const toggleInfluencerInCampaign = (influencerId: string) => {
    setCampaignFormData(prev => ({
      ...prev,
      influencerIds: prev.influencerIds.includes(influencerId)
        ? prev.influencerIds.filter(id => id !== influencerId)
        : [...prev.influencerIds, influencerId]
    }));
  };

  return (
    <PageLayout
      header={{
        icon: Star,
        iconBgColor: "bg-amber-100 dark:bg-amber-900/20",
        iconColor: "text-amber-600 dark:text-amber-400",
        title: "Relations Influenceurs",
        description: "Gérez les partenariats, contrats et performances.",
        rightActions: [
          {
            label: `Ajouter ${activeTab === 'network' ? 'Influenceur' : 'Campagne'}`,
            icon: UserPlus,
            onClick: activeTab === 'network' ? handleOpenCreateInfluencer : handleOpenCreateCampaign,
            variant: 'primary'
          }
        ]
      }}
      contentClassName="h-full flex flex-col min-h-0"
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Tabs */}
        <div className="flex gap-3 shrink-0 mb-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex">
             <button 
               onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-500 ${activeTab === 'campaigns' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <Briefcase size={16} /> Campagnes
             </button>
             <button 
               onClick={() => setActiveTab('network')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-500 ${activeTab === 'network' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <Users size={16} /> Réseau
             </button>
        </div>
      </div>

      {activeTab === 'network' ? (
         <div className="flex-1 min-h-0 overflow-y-auto pb-4">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {influencers.map((influencer) => (
             <InfluencerCard 
               key={influencer.id} 
               influencer={influencer}
               onEdit={() => handleOpenEditInfluencer(influencer)}
               onDelete={() => handleDeleteInfluencer(influencer.id)}
             />
           ))}
           {influencers.length === 0 && (
              <div className="col-span-full text-center text-slate-400 dark:text-slate-500 py-8">Aucun influenceur dans le réseau.</div>
           )}
           
           {/* Discovery Card */}
           <div 
             onClick={handleOpenCreateInfluencer}
             className="border-2 border-dashed border-slate-300/60 dark:border-slate-700 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:bg-white/40 dark:hover:bg-slate-700/40 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-500 cursor-pointer min-h-[300px] backdrop-blur-sm">
              <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm mb-4">
                 <UserPlus className="text-slate-400 dark:text-slate-500" size={32} />
              </div>
              <h3 className="font-bold text-slate-700 dark:text-slate-300">Découvrir Talents</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-[200px]">Trouvez de nouveaux créateurs correspondant à votre niche.</p>
           </div>
         </div>
           </div>
      ) : (
         <div className="flex-1 min-h-0 overflow-y-auto pb-6">
           <div className="space-y-6">
            {campaigns.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700">
                <Briefcase className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={48} />
                <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">Aucune campagne</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                  Créez votre première campagne d'influenceurs
                </p>
                <Button onClick={handleOpenCreateCampaign} variant="primary">
                  <Plus size={16} className="mr-2" />
                  Créer une campagne
                </Button>
              </div>
            )}
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} influencers={influencers} />
            ))}
           </div>
         </div>
      )}
      </div>

    {/* Modale Influenceur */}
    <Modal
      isOpen={isInfluencerModalOpen}
      onClose={() => setIsInfluencerModalOpen(false)}
      title={editingInfluencer?.id ? 'Modifier l\'influenceur' : 'Nouvel influenceur'}
      size="lg"
    >
      <form onSubmit={handleSaveInfluencer} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nom *"
            value={influencerFormData.name}
            onChange={(e) => setInfluencerFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            placeholder="Nom de l'influenceur"
          />
          <Input
            label="Handle / Pseudo *"
            value={influencerFormData.handle}
            onChange={(e) => setInfluencerFormData(prev => ({ ...prev, handle: e.target.value }))}
            required
            placeholder="@handle"
          />
        </div>

        <Dropdown
          label="Plateforme *"
          value={influencerFormData.platform}
          onChange={(value) => setInfluencerFormData(prev => ({ ...prev, platform: value as Influencer['platform'] }))}
          options={PLATFORM_OPTIONS}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre d'abonnés *"
            value={influencerFormData.followers}
            onChange={(e) => setInfluencerFormData(prev => ({ ...prev, followers: e.target.value }))}
            required
            placeholder="100K"
          />
          <Input
            label="Taux d'engagement (%) *"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={influencerFormData.engagementRate}
            onChange={(e) => setInfluencerFormData(prev => ({ ...prev, engagementRate: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Coût par post (€) *"
            type="number"
            min="0"
            step="0.01"
            value={influencerFormData.costPerPost}
            onChange={(e) => setInfluencerFormData(prev => ({ ...prev, costPerPost: parseFloat(e.target.value) || 0 }))}
            required
          />
          <Dropdown
            label="Statut *"
            value={influencerFormData.status}
            onChange={(value) => setInfluencerFormData(prev => ({ ...prev, status: value as Influencer['status'] }))}
            options={STATUS_OPTIONS}
            required
          />
        </div>

        <Input
          label="Avatar URL"
          value={influencerFormData.avatar}
          onChange={(e) => setInfluencerFormData(prev => ({ ...prev, avatar: e.target.value }))}
          placeholder="https://..."
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Niches / Domaines
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={nicheInput}
              onChange={(e) => setNicheInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNicheTag())}
              placeholder="Ajouter une niche (ex: Tech, Lifestyle...)"
              containerClassName="flex-1"
            />
            <Button type="button" onClick={addNicheTag} variant="secondary">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {influencerFormData.niche.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm"
              >
                <Tag size={12} />
                {tag}
                <button
                  type="button"
                  onClick={() => removeNicheTag(tag)}
                  className="hover:text-red-600 dark:hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsInfluencerModalOpen(false)}
          >
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            {editingInfluencer?.id ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>

    {/* Modale Campagne */}
    <Modal
      isOpen={isCampaignModalOpen}
      onClose={() => setIsCampaignModalOpen(false)}
      title={editingCampaign?.id ? 'Modifier la campagne' : 'Nouvelle campagne'}
      size="xl"
    >
      <form onSubmit={handleSaveCampaign} className="space-y-6">
        <Input
          label="Nom de la campagne *"
          value={campaignFormData.name}
          onChange={(e) => setCampaignFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="Ex: Lancement produit été 2024"
        />

        <Textarea
          label="Description"
          value={campaignFormData.description}
          onChange={(e) => setCampaignFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Objectifs, contexte, brief..."
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <Dropdown
            label="Plateforme *"
            value={campaignFormData.platform}
            onChange={(value) => setCampaignFormData(prev => ({ ...prev, platform: value as Influencer['platform'] }))}
            options={PLATFORM_OPTIONS}
            required
          />
          <Dropdown
            label="Statut *"
            value={campaignFormData.status}
            onChange={(value) => setCampaignFormData(prev => ({ ...prev, status: value as InfluencerCampaign['status'] }))}
            options={CAMPAIGN_STATUS_OPTIONS}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Budget (€) *"
            type="number"
            min="0"
            step="0.01"
            value={campaignFormData.budget}
            onChange={(e) => setCampaignFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
            required
          />
          <Input
            label="Date de début *"
            type="date"
            value={campaignFormData.startDate}
            onChange={(e) => setCampaignFormData(prev => ({ ...prev, startDate: e.target.value }))}
            required
          />
        </div>

        <Input
          label="Date de fin"
          type="date"
          value={campaignFormData.endDate}
          onChange={(e) => setCampaignFormData(prev => ({ ...prev, endDate: e.target.value }))}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Influenceurs sélectionnés ({campaignFormData.influencerIds.length})
          </label>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 max-h-64 overflow-y-auto space-y-2">
            {influencers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun influenceur disponible</p>
            ) : (
              influencers.map((inf) => (
                <label
                  key={inf.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={campaignFormData.influencerIds.includes(inf.id)}
                    onChange={() => toggleInfluencerInCampaign(inf.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <img src={inf.avatar} alt={inf.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{inf.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">@{inf.handle}</p>
                  </div>
                  <Badge variant="default" className="text-xs">{inf.followers}</Badge>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsCampaignModalOpen(false)}
          >
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            {editingCampaign?.id ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
    </PageLayout>
  );
};

interface InfluencerCardProps {
  influencer: Influencer;
  onEdit: () => void;
  onDelete: () => void;
}

const InfluencerCard: React.FC<InfluencerCardProps> = ({ influencer, onEdit, onDelete }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Instagram':
        return Instagram;
      case 'YouTube':
        return Youtube;
      case 'LinkedIn':
        return Linkedin;
      case 'Twitter':
        return TwitterIcon;
      case 'TikTok':
      case 'Snapchat':
      case 'Autre':
      default:
        return Globe;
    }
  };
  
  const PlatformIcon = getPlatformIcon(influencer.platform);
  
  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 shadow-xl shadow-indigo-900/5 dark:shadow-indigo-900/20 rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-500">
      {/* Header / Cover */}
      <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative">
         <div className="absolute top-3 right-3">
            <Badge variant={influencer.status === 'Contrat' ? 'success' : influencer.status === 'Négociation' ? 'warning' : 'default'} className="shadow-sm">
               {influencer.status}
            </Badge>
         </div>
         <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
            >
              <Trash2 size={14} />
            </button>
         </div>
      </div>
      
      {/* Profile Info */}
      <div className="px-6 pb-6 -mt-10 relative">
         <div className="flex justify-between items-end mb-3">
            <img src={influencer.avatar} className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover" alt={influencer.name} />
            <div className="flex gap-2 mb-1">
               <button className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500">
                  <MessageCircle size={18} />
               </button>
               <button className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500">
                  <BarChart2 size={18} />
               </button>
            </div>
         </div>
         
         <div className="mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
               {influencer.name} 
               <CheckCircle2 size={16} className="text-blue-500 dark:text-blue-400 fill-blue-50 dark:fill-blue-900/30" />
            </h3>
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
               <PlatformIcon size={14} />
               <span>{influencer.handle}</span>
            </div>
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-2xl border border-white/40 dark:border-slate-600/40">
               <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Abonnés</p>
               <p className="font-bold text-slate-800 dark:text-white">{influencer.followers}</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-2xl border border-white/40 dark:border-slate-600/40">
               <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Taux Eng.</p>
               <p className="font-bold text-slate-800 dark:text-white">{influencer.engagementRate}%</p>
            </div>
         </div>
         
         {/* Niche Tags */}
         <div className="flex flex-wrap gap-1.5 mb-4">
            {influencer.niche.map((tag: string) => (
               <span key={tag} className="text-[10px] px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/30 font-medium">
                  #{tag}
               </span>
            ))}
         </div>

         {/* Footer */}
         <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
               <DollarSign size={14} /> {influencer.costPerPost}€ / post
            </span>
            <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 text-xs font-bold">
               Voir Kit <ExternalLink size={10} />
            </a>
         </div>
      </div>
    </div>
  );
};

interface CampaignCardProps {
  campaign: InfluencerCampaign;
  influencers: Influencer[];
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, influencers }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Instagram':
        return Instagram;
      case 'YouTube':
        return Youtube;
      case 'LinkedIn':
        return Linkedin;
      case 'Twitter':
        return TwitterIcon;
      default:
        return Globe;
    }
  };

  const PlatformIcon = getPlatformIcon(campaign.platform);
  const campaignInfluencers = influencers.filter(inf => campaign.influencerIds.includes(inf.id));
  const statusColors = {
    draft: 'default',
    scheduled: 'info',
    running: 'success',
    completed: 'success',
    cancelled: 'danger',
  } as const;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 shadow-sm p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center shadow-inner">
            <PlatformIcon size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{campaign.name}</h3>
              <Badge variant={statusColors[campaign.status]}>{CAMPAIGN_STATUS_OPTIONS.find(s => s.value === campaign.status)?.label}</Badge>
            </div>
            {campaign.description && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{campaign.budget}€</p>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Budget</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Date de début</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-800 dark:text-white">
              {new Date(campaign.startDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Influenceurs</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-800 dark:text-white">
              {campaign.influencerIds.length}
            </span>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Plateforme</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-800 dark:text-white">{campaign.platform}</span>
          </div>
        </div>
      </div>

      {campaignInfluencers.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Influenceurs</h4>
          <div className="flex gap-4 flex-wrap">
            {campaignInfluencers.map(inf => (
              <div key={inf.id} className="flex items-center gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-700 shadow-sm">
                <img src={inf.avatar} className="w-10 h-10 rounded-full" alt={inf.name} />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{inf.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">@{inf.handle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
