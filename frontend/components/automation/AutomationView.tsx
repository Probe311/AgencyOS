import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trash2, Edit3, Zap, Copy, CheckCircle, Search, Filter, UserPlus, Mail, Phone, Calendar, Tag, TrendingUp, RefreshCw, Gift, MessageSquare, FileText, Target, Users, Award, Clock, ArrowRight, ShoppingCart, Eye } from 'lucide-react';
import { useAutomationWorkflows } from '../../lib/supabase/hooks/useAutomationWorkflows';
import { AutomationWorkflow, ScenarioType } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowPreview } from './WorkflowPreview';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { Input } from '../ui/Input';

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'nurturing' | 'relance' | 'conversion' | 'retention' | 'reactivation' | 'upsell';
  icon: React.ReactNode;
  workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>;
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'onboarding-new-lead',
    name: 'Onboarding Nouveau Lead',
    description: 'Séquence d\'accueil automatique pour les nouveaux leads avec email de bienvenue et ressources',
    category: 'onboarding',
    icon: <UserPlus size={20} />,
    workflow: {
      name: 'Onboarding Nouveau Lead',
      description: 'Séquence d\'accueil automatique pour les nouveaux leads',
      scenarioType: 'onboarding',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Nouveau lead créé', position: { x: 100, y: 100 }, data: { triggerType: 'lead_created' } },
          { id: 'action-1', type: 'action', label: 'Email de bienvenue', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 24h', position: { x: 700, y: 100 }, data: { delayMinutes: 1440 } },
          { id: 'action-2', type: 'action', label: 'Ajouter tag "Onboarding"', position: { x: 1000, y: 100 }, data: { actionType: 'add_tag' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'nurturing-cold-lead',
    name: 'Nurturing Lead Froid',
    description: 'Réchauffement progressif des leads froids avec contenu éducatif',
    category: 'nurturing',
    icon: <TrendingUp size={20} />,
    workflow: {
      name: 'Nurturing Lead Froid',
      description: 'Réchauffement progressif des leads froids',
      scenarioType: 'nurturing',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead avec température "Froid"', position: { x: 100, y: 100 }, data: { triggerType: 'tag_added' } },
          { id: 'action-1', type: 'action', label: 'Email contenu éducatif', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 3 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 4320 } },
          { id: 'action-2', type: 'action', label: 'Email témoignages', position: { x: 1000, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'relance-inactif',
    name: 'Relance Lead Inactif',
    description: 'Relance automatique des leads sans activité depuis 7 jours',
    category: 'relance',
    icon: <RefreshCw size={20} />,
    workflow: {
      name: 'Relance Lead Inactif',
      description: 'Relance automatique des leads inactifs',
      scenarioType: 'relance',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Aucune activité depuis 7 jours', position: { x: 100, y: 100 }, data: { triggerType: 'date' } },
          { id: 'action-1', type: 'action', label: 'Email de relance', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 3 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 4320 } },
          { id: 'condition-1', type: 'condition', label: 'Email ouvert ?', position: { x: 1000, y: 50 }, data: {} },
          { id: 'action-2', type: 'action', label: 'Ajouter tag "Relancé"', position: { x: 1300, y: 100 }, data: { actionType: 'add_tag' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'condition-1' },
          { id: 'e4', source: 'condition-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'conversion-opportunity',
    name: 'Conversion Opportunité',
    description: 'Workflow pour convertir les opportunités en clients avec suivi personnalisé',
    category: 'conversion',
    icon: <Target size={20} />,
    workflow: {
      name: 'Conversion Opportunité',
      description: 'Conversion des opportunités en clients',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead devient Opportunité', position: { x: 100, y: 100 }, data: { triggerType: 'status_changed' } },
          { id: 'action-1', type: 'action', label: 'Email proposition commerciale', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 2 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 2880 } },
          { id: 'action-2', type: 'action', label: 'Créer tâche suivi commercial', position: { x: 1000, y: 100 }, data: { actionType: 'create_task' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'retention-client',
    name: 'Rétention Client',
    description: 'Maintenir l\'engagement des clients existants avec contenu de valeur',
    category: 'retention',
    icon: <Users size={20} />,
    workflow: {
      name: 'Rétention Client',
      description: 'Maintenir l\'engagement des clients',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Client actif depuis 30 jours', position: { x: 100, y: 100 }, data: { triggerType: 'date' } },
          { id: 'action-1', type: 'action', label: 'Email contenu exclusif', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 7 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 10080 } },
          { id: 'action-2', type: 'action', label: 'Email demande feedback', position: { x: 1000, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'reactivation-client',
    name: 'Réactivation Client Inactif',
    description: 'Réactiver les clients inactifs avec offre spéciale',
    category: 'reactivation',
    icon: <RefreshCw size={20} />,
    workflow: {
      name: 'Réactivation Client Inactif',
      description: 'Réactiver les clients inactifs',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Client inactif depuis 90 jours', position: { x: 100, y: 100 }, data: { triggerType: 'date' } },
          { id: 'action-1', type: 'action', label: 'Email offre spéciale', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 5 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 7200 } },
          { id: 'action-2', type: 'action', label: 'SMS relance', position: { x: 1000, y: 100 }, data: { actionType: 'webhook' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'upsell-cross-sell',
    name: 'Upsell & Cross-sell',
    description: 'Proposer des produits complémentaires aux clients satisfaits',
    category: 'upsell',
    icon: <TrendingUp size={20} />,
    workflow: {
      name: 'Upsell & Cross-sell',
      description: 'Proposer des produits complémentaires',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Client satisfait (note > 4)', position: { x: 100, y: 100 }, data: { triggerType: 'condition' } },
          { id: 'action-1', type: 'action', label: 'Email produits complémentaires', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 14 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 20160 } },
          { id: 'action-2', type: 'action', label: 'Email offre promotionnelle', position: { x: 1000, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'lead-qualification',
    name: 'Qualification Lead',
    description: 'Qualifier automatiquement les leads avec scoring et tags',
    category: 'nurturing',
    icon: <Award size={20} />,
    workflow: {
      name: 'Qualification Lead',
      description: 'Qualification automatique des leads',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Nouveau lead créé', position: { x: 100, y: 100 }, data: { triggerType: 'lead_created' } },
          { id: 'action-1', type: 'action', label: 'Calculer score lead', position: { x: 400, y: 100 }, data: { actionType: 'update_field' } },
          { id: 'condition-1', type: 'condition', label: 'Score > 70 ?', position: { x: 700, y: 50 }, data: {} },
          { id: 'action-2', type: 'action', label: 'Ajouter tag "Qualifié"', position: { x: 1000, y: 100 }, data: { actionType: 'add_tag' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'condition-1' },
          { id: 'e3', source: 'condition-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'webinar-follow-up',
    name: 'Suivi Webinar',
    description: 'Suivi automatique après participation à un webinar',
    category: 'nurturing',
    icon: <Calendar size={20} />,
    workflow: {
      name: 'Suivi Webinar',
      description: 'Suivi après participation webinar',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Participation webinar', position: { x: 100, y: 100 }, data: { triggerType: 'event' } },
          { id: 'action-1', type: 'action', label: 'Email remerciement + replay', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 2 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 2880 } },
          { id: 'action-2', type: 'action', label: 'Email ressources complémentaires', position: { x: 1000, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'abandon-panier',
    name: 'Abandon de Panier',
    description: 'Récupérer les leads qui ont abandonné un devis ou une commande',
    category: 'conversion',
    icon: <ShoppingCart size={20} />,
    workflow: {
      name: 'Abandon de Panier',
      description: 'Récupération des abandons de panier',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Devis créé non envoyé', position: { x: 100, y: 100 }, data: { triggerType: 'event' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 24h', position: { x: 400, y: 100 }, data: { delayMinutes: 1440 } },
          { id: 'action-1', type: 'action', label: 'Email rappel devis', position: { x: 700, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-2', type: 'wait', label: 'Attendre 3 jours', position: { x: 1000, y: 100 }, data: { delayMinutes: 4320 } },
          { id: 'action-2', type: 'action', label: 'Email offre spéciale', position: { x: 1300, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'wait-1' },
          { id: 'e2', source: 'wait-1', target: 'action-1' },
          { id: 'e3', source: 'action-1', target: 'wait-2' },
          { id: 'e4', source: 'wait-2', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'anniversaire-client',
    name: 'Anniversaire Client',
    description: 'Célébrer l\'anniversaire d\'inscription avec message personnalisé',
    category: 'retention',
    icon: <Gift size={20} />,
    workflow: {
      name: 'Anniversaire Client',
      description: 'Célébration anniversaire client',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Anniversaire inscription', position: { x: 100, y: 100 }, data: { triggerType: 'date' } },
          { id: 'action-1', type: 'action', label: 'Email message personnalisé', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'action-2', type: 'action', label: 'Offre cadeau spéciale', position: { x: 700, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'lead-magnet-follow-up',
    name: 'Suivi Lead Magnet',
    description: 'Suivi après téléchargement d\'un lead magnet (ebook, guide, etc.)',
    category: 'nurturing',
    icon: <FileText size={20} />,
    workflow: {
      name: 'Suivi Lead Magnet',
      description: 'Suivi après téléchargement lead magnet',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead magnet téléchargé', position: { x: 100, y: 100 }, data: { triggerType: 'event' } },
          { id: 'action-1', type: 'action', label: 'Email confirmation + contenu', position: { x: 400, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 3 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 4320 } },
          { id: 'action-2', type: 'action', label: 'Email contenu complémentaire', position: { x: 1000, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'feedback-satisfaction',
    name: 'Feedback Satisfaction',
    description: 'Demander un feedback après une interaction ou une commande',
    category: 'retention',
    icon: <MessageSquare size={20} />,
    workflow: {
      name: 'Feedback Satisfaction',
      description: 'Collecte de feedback client',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Commande livrée', position: { x: 100, y: 100 }, data: { triggerType: 'status_changed' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 7 jours', position: { x: 400, y: 100 }, data: { delayMinutes: 10080 } },
          { id: 'action-1', type: 'action', label: 'Email demande avis', position: { x: 700, y: 100 }, data: { actionType: 'send_email' } },
          { id: 'condition-1', type: 'condition', label: 'Avis positif ?', position: { x: 1000, y: 50 }, data: {} },
          { id: 'action-2', type: 'action', label: 'Demander témoignage', position: { x: 1300, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'wait-1' },
          { id: 'e2', source: 'wait-1', target: 'action-1' },
          { id: 'e3', source: 'action-1', target: 'condition-1' },
          { id: 'e4', source: 'condition-1', target: 'action-2' },
        ],
      },
    },
  },
  {
    id: 'relance-email-ouvert',
    name: 'Relance Email Ouvert',
    description: 'Relancer les leads qui ont ouvert un email mais n\'ont pas cliqué',
    category: 'relance',
    icon: <Mail size={20} />,
    workflow: {
      name: 'Relance Email Ouvert',
      description: 'Relance des leads ayant ouvert un email',
      scenarioType: 'custom',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Email ouvert sans clic', position: { x: 100, y: 100 }, data: { triggerType: 'email_opened' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 2 jours', position: { x: 400, y: 100 }, data: { delayMinutes: 2880 } },
          { id: 'action-1', type: 'action', label: 'Email relance personnalisée', position: { x: 700, y: 100 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'wait-1' },
          { id: 'e2', source: 'wait-1', target: 'action-1' },
        ],
      },
    },
  },
  {
    id: 'onboarding-renforcement',
    name: 'Onboarding Renforcé',
    description: 'Séquence d\'onboarding complète avec plusieurs emails et ressources',
    category: 'onboarding',
    icon: <UserPlus size={20} />,
    workflow: {
      name: 'Onboarding Renforcé',
      description: 'Séquence d\'onboarding complète',
      scenarioType: 'onboarding',
      status: 'draft',
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Nouveau client', position: { x: 100, y: 100 }, data: { triggerType: 'lead_created' } },
          { id: 'action-1', type: 'action', label: 'Email bienvenue', position: { x: 400, y: 50 }, data: { actionType: 'send_email' } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 2 jours', position: { x: 700, y: 100 }, data: { delayMinutes: 2880 } },
          { id: 'action-2', type: 'action', label: 'Email guide démarrage', position: { x: 1000, y: 50 }, data: { actionType: 'send_email' } },
          { id: 'wait-2', type: 'wait', label: 'Attendre 5 jours', position: { x: 1300, y: 100 }, data: { delayMinutes: 7200 } },
          { id: 'action-3', type: 'action', label: 'Email ressources avancées', position: { x: 1600, y: 50 }, data: { actionType: 'send_email' } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
          { id: 'e4', source: 'action-2', target: 'wait-2' },
          { id: 'e5', source: 'wait-2', target: 'action-3' },
        ],
      },
    },
  },
];

const PREDEFINED_SCENARIOS: Record<ScenarioType, Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>> = {
  onboarding: SCENARIO_TEMPLATES.find(s => s.id === 'onboarding-new-lead')!.workflow,
  nurturing: SCENARIO_TEMPLATES.find(s => s.id === 'nurturing-cold-lead')!.workflow,
  relance: SCENARIO_TEMPLATES.find(s => s.id === 'relance-inactif')!.workflow,
  custom: {
    name: 'Workflow Personnalisé',
    description: 'Créez votre propre workflow',
    scenarioType: 'custom',
    status: 'draft',
    workflowData: {
      nodes: [],
      edges: [],
    },
  },
};

export const AutomationView: React.FC = () => {
  const { workflows, loading, createWorkflow, updateWorkflow, deleteWorkflow, activateWorkflow, pauseWorkflow } = useAutomationWorkflows();
  const { showToast } = useApp();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | undefined>();
  const [previewWorkflow, setPreviewWorkflow] = useState<AutomationWorkflow | undefined>();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCreateFromScenario = async (scenarioType: ScenarioType) => {
    try {
      const scenario = PREDEFINED_SCENARIOS[scenarioType];
      await createWorkflow(scenario);
      showToast(`Workflow "${scenario.name}" créé avec succès`, 'success');
      setSelectedScenario(null);
    } catch (error) {
      showToast('Erreur lors de la création du workflow', 'error');
    }
  };

  const handleCreateFromTemplate = async (template: ScenarioTemplate) => {
    try {
      await createWorkflow(template.workflow);
      showToast(`Workflow "${template.name}" créé avec succès`, 'success');
      setShowScenariosModal(false);
    } catch (error) {
      showToast('Erreur lors de la création du workflow', 'error');
    }
  };

  const filteredScenarios = SCENARIO_TEMPLATES.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || scenario.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Tous' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'relance', label: 'Relance' },
    { value: 'conversion', label: 'Conversion' },
    { value: 'retention', label: 'Rétention' },
    { value: 'reactivation', label: 'Réactivation' },
    { value: 'upsell', label: 'Upsell' },
  ];

  const handleCreateCustom = () => {
    setEditingWorkflow(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (workflow: AutomationWorkflow) => {
    setEditingWorkflow(workflow);
    setIsEditorOpen(true);
  };

  const handlePreview = (workflow: AutomationWorkflow) => {
    setPreviewWorkflow(workflow);
    setIsPreviewOpen(true);
  };

  const handleSave = async (workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingWorkflow) {
        await updateWorkflow(editingWorkflow.id, workflow);
        showToast('Workflow mis à jour avec succès', 'success');
      } else {
        await createWorkflow(workflow);
        showToast('Workflow créé avec succès', 'success');
      }
      setIsEditorOpen(false);
      setEditingWorkflow(undefined);
    } catch (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce workflow ?')) {
      try {
        await deleteWorkflow(id);
        showToast('Workflow supprimé', 'success');
      } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleToggleStatus = async (workflow: AutomationWorkflow) => {
    try {
      if (workflow.status === 'active') {
        await pauseWorkflow(workflow.id);
        showToast('Workflow mis en pause', 'success');
      } else {
        await activateWorkflow(workflow.id);
        showToast('Workflow activé', 'success');
      }
    } catch (error) {
      showToast('Erreur lors du changement de statut', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing Automation</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Créez et gérez vos workflows automatisés</p>
        </div>
        <Button icon={Plus} onClick={handleCreateCustom}>
          Nouveau Workflow
        </Button>
      </div>

      {/* Bloc Nouveau Lead */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Commencer avec un nouveau lead</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Créez rapidement un workflow pour un nouveau lead</p>
          </div>
          <Button 
            icon={Plus} 
            onClick={handleCreateCustom}
            variant="secondary"
          >
            Nouveau Workflow
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10"
            onClick={() => handleCreateFromScenario('onboarding')}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <UserPlus size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Onboarding</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Accueillir et guider un nouveau lead
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Utiliser ce scénario
            </Button>
          </div>

          <div
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10"
            onClick={() => handleCreateFromScenario('nurturing')}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Nurturing</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Réchauffer un lead froid ou tiède
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Utiliser ce scénario
            </Button>
          </div>

          <div
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10"
            onClick={() => setShowScenariosModal(true)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <Zap size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Plus de scénarios</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Découvrir {SCENARIO_TEMPLATES.length} scénarios pré-configurés
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Voir tous les scénarios
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des workflows */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[400px]">
        <div className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Mes Workflows</h3>
          {workflows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Zap size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Aucun workflow créé</p>
              <p className="text-sm">Créez votre premier workflow ou utilisez un scénario pré-configuré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">{workflow.name}</h4>
                        <Badge
                          className={
                            workflow.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : workflow.status === 'paused'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }
                        >
                          {workflow.status === 'active' ? 'Actif' : workflow.status === 'paused' ? 'En pause' : 'Brouillon'}
                        </Badge>
                        {workflow.scenarioType && workflow.scenarioType !== 'custom' && (
                          <Badge variant="outline">{workflow.scenarioType}</Badge>
                        )}
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{workflow.workflowData.nodes.length} nœuds</span>
                        <span>{workflow.workflowData.edges.length} connexions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => handlePreview(workflow)}
                        title="Prévisualiser"
                      >
                        Prévisualiser
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={workflow.status === 'active' ? Pause : Play}
                        onClick={() => handleToggleStatus(workflow)}
                      >
                        {workflow.status === 'active' ? 'Pause' : 'Activer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit3}
                        onClick={() => handleEdit(workflow)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => handleDelete(workflow.id)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingWorkflow(undefined);
        }}
        title={editingWorkflow ? 'Modifier le workflow' : 'Nouveau workflow'}
        size="2xl"
      >
        <div className="h-[80vh]">
          <WorkflowEditor
            workflow={editingWorkflow}
            onSave={handleSave}
            onCancel={() => {
              setIsEditorOpen(false);
              setEditingWorkflow(undefined);
            }}
          />
        </div>
      </Modal>

      {/* Preview Modal */}
      {previewWorkflow && (
        <WorkflowPreview
          workflow={previewWorkflow}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewWorkflow(undefined);
          }}
        />
      )}

      {/* Scénarios Modal */}
      <Modal
        isOpen={showScenariosModal}
        onClose={() => {
          setShowScenariosModal(false);
          setSearchQuery('');
          setSelectedCategory('all');
        }}
        title="Scénarios pré-configurés"
        size="2xl"
      >
        <div className="space-y-4">
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un scénario..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  size="sm"
                  variant={selectedCategory === cat.value ? 'secondary' : 'outline'}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="whitespace-nowrap"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Liste des scénarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {filteredScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer bg-white dark:bg-slate-800"
                onClick={() => handleCreateFromTemplate(scenario)}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg shrink-0">
                    {scenario.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">{scenario.name}</h4>
                    <Badge variant="outline" className="text-xs mb-2">
                      {categories.find(c => c.value === scenario.category)?.label || scenario.category}
                    </Badge>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {scenario.description}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-3">
                  Utiliser ce scénario
                </Button>
              </div>
            ))}
          </div>

          {filteredScenarios.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucun scénario trouvé</p>
              <p className="text-sm mt-2">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

