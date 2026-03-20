import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Play, Pause, Trash2, Edit3, Zap, Users, Target, Filter, CheckCircle, XCircle, AlertCircle, Eye, ArrowRight, Mail, Phone, Calendar, Tag, TrendingUp, RefreshCw, Gift, MessageSquare, FileText, Award, Clock, ShoppingCart, UserPlus, BookOpen, BarChart3 } from 'lucide-react';
import { useMarketingAutomations, MarketingAutomation, AutomationCategory } from '../../lib/supabase/hooks/useMarketingAutomations';
import { useLeadSegments, LeadSegment, SegmentCriteria } from '../../lib/supabase/hooks/useLeadSegments';
import { useEmailTemplates } from '../../lib/supabase/hooks/useEmailTemplates';
import { WorkflowNode, WorkflowEdge } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { WorkflowEditor } from '../automation/WorkflowEditor';
import { WorkflowPreview } from '../automation/WorkflowPreview';
import { useApp } from '../contexts/AppContext';

const CATEGORY_LABELS: Record<AutomationCategory, { label: string; icon: React.ReactNode; color: string }> = {
  onboarding: { label: 'Onboarding', icon: <UserPlus size={16} />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  nurturing: { label: 'Nurturing', icon: <TrendingUp size={16} />, color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  relance: { label: 'Relance', icon: <RefreshCw size={16} />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
  conversion: { label: 'Conversion', icon: <ShoppingCart size={16} />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
  retention: { label: 'Rétention', icon: <Award size={16} />, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
  reactivation: { label: 'Réactivation', icon: <Zap size={16} />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
  upsell: { label: 'Upsell', icon: <Gift size={16} />, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400' },
  qualification: { label: 'Qualification', icon: <Target size={16} />, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400' },
  escalade: { label: 'Escalade', icon: <AlertCircle size={16} />, color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  custom: { label: 'Personnalisé', icon: <FileText size={16} />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  active: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  paused: { label: 'En pause', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
  archived: { label: 'Archivé', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

interface ScenarioTemplate {
  id: string;
  category: AutomationCategory;
  name: string;
  description: string;
  useCase: string;
  steps: string[];
  estimatedLeads: string;
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  // ONBOARDING
  {
    id: 'onboarding-1',
    category: 'onboarding',
    name: 'Onboarding Nouveau Lead',
    description: 'Séquence d\'accueil complète pour les nouveaux leads avec email de bienvenue, ressources et qualification',
    useCase: 'Parfait pour les leads qui viennent de s\'inscrire via votre site web ou formulaire',
    steps: ['Email de bienvenue (J+0)', 'Ressources utiles (J+2)', 'Questionnaire de qualification (J+5)', 'Relance si pas de réponse (J+7)'],
    estimatedLeads: 'Tous les nouveaux leads',
  },
  {
    id: 'onboarding-2',
    category: 'onboarding',
    name: 'Onboarding Lead Certifié',
    description: 'Onboarding accéléré pour les leads avec données complètes (SIRET, etc.)',
    useCase: 'Pour les leads certifiés qui ont déjà fourni leurs informations complètes',
    steps: ['Email personnalisé (J+0)', 'Proposition de démo (J+1)', 'Cas d\'usage spécifiques (J+3)'],
    estimatedLeads: 'Leads certifiés uniquement',
  },
  {
    id: 'onboarding-3',
    category: 'onboarding',
    name: 'Onboarding Lead Premium',
    description: 'Onboarding VIP pour les leads à fort potentiel avec contact direct',
    useCase: 'Pour les leads avec scoring élevé ou valeur importante',
    steps: ['Email VIP (J+0)', 'Appel automatique (J+1)', 'Proposition personnalisée (J+2)', 'Suivi commercial (J+3)'],
    estimatedLeads: 'Leads avec scoring > 80 ou valeur > 50k€',
  },
  // NURTURING
  {
    id: 'nurturing-1',
    category: 'nurturing',
    name: 'Nurturing Lead Froid',
    description: 'Séquence de réchauffage pour les leads inactifs depuis plus de 30 jours',
    useCase: 'Réactivez les leads qui se sont désintéressés',
    steps: ['Email de rappel (J+0)', 'Contenu de valeur (J+7)', 'Témoignage client (J+14)', 'Offre spéciale (J+21)'],
    estimatedLeads: 'Leads inactifs > 30 jours',
  },
  {
    id: 'nurturing-2',
    category: 'nurturing',
    name: 'Nurturing Lead Tiède',
    description: 'Séquence d\'engagement pour les leads qui ont montré un intérêt modéré',
    useCase: 'Maintenez l\'engagement des leads qui ont visité votre site mais ne se sont pas convertis',
    steps: ['Email éducatif (J+0)', 'Webinaire invitation (J+3)', 'Case study (J+7)', 'Appel à l\'action (J+10)'],
    estimatedLeads: 'Leads avec scoring 40-60',
  },
  {
    id: 'nurturing-3',
    category: 'nurturing',
    name: 'Nurturing Post-Demo',
    description: 'Séquence de suivi après une démonstration ou un appel découverte',
    useCase: 'Maintenez l\'engagement après une démo pour maximiser les conversions',
    steps: ['Email de remerciement (J+0)', 'Ressources complémentaires (J+1)', 'Questions de clarification (J+3)', 'Proposition personnalisée (J+5)'],
    estimatedLeads: 'Leads ayant assisté à une démo',
  },
  {
    id: 'nurturing-4',
    category: 'nurturing',
    name: 'Nurturing Contenu Éducatif',
    description: 'Séquence basée sur la distribution de contenu de valeur pour éduquer les leads',
    useCase: 'Éduquez vos leads avec du contenu pertinent pour les faire progresser dans le funnel',
    steps: ['Guide pratique (J+0)', 'Webinaire (J+7)', 'E-book premium (J+14)', 'Case study (J+21)'],
    estimatedLeads: 'Leads intéressés par le contenu',
  },
  // RELANCE
  {
    id: 'relance-1',
    category: 'relance',
    name: 'Relance Devis Non Répondu',
    description: 'Relance automatique des devis envoyés sans réponse après 3 jours',
    useCase: 'Augmentez le taux de réponse aux devis',
    steps: ['Rappel devis (J+3)', 'Questions de clarification (J+5)', 'Offre alternative (J+7)', 'Escalade commercial (J+10)'],
    estimatedLeads: 'Devis envoyés sans réponse',
  },
  {
    id: 'relance-2',
    category: 'relance',
    name: 'Relance Email Non Ouvert',
    description: 'Relance automatique si l\'email précédent n\'a pas été ouvert',
    useCase: 'Réessayez avec un sujet différent si le premier email n\'a pas été ouvert',
    steps: ['Nouveau sujet (J+2)', 'Format alternatif (J+4)', 'SMS si disponible (J+6)'],
    estimatedLeads: 'Emails non ouverts',
  },
  {
    id: 'relance-3',
    category: 'relance',
    name: 'Relance Opportunité Perdue',
    description: 'Relance des opportunités qui ont été perdues avec une nouvelle approche',
    useCase: 'Donnez une seconde chance aux opportunités perdues',
    steps: ['Email de réouverture (J+0)', 'Nouvelle proposition (J+7)', 'Offre spéciale (J+14)', 'Dernière chance (J+21)'],
    estimatedLeads: 'Opportunités marquées "Perdues"',
  },
  {
    id: 'relance-4',
    category: 'relance',
    name: 'Relance Rendez-vous Annulé',
    description: 'Relance automatique après l\'annulation d\'un rendez-vous',
    useCase: 'Réprogrammez rapidement les rendez-vous annulés',
    steps: ['Email de relance (J+0)', 'Nouveaux créneaux (J+1)', 'Appel téléphonique (J+2)', 'Offre flexible (J+3)'],
    estimatedLeads: 'Rendez-vous annulés',
  },
  // CONVERSION
  {
    id: 'conversion-1',
    category: 'conversion',
    name: 'Conversion Lead Chaud',
    description: 'Séquence optimisée pour convertir rapidement les leads avec scoring élevé',
    useCase: 'Maximisez les conversions des leads les plus qualifiés',
    steps: ['Email VIP (J+0)', 'Appel automatique (J+1)', 'Proposition personnalisée (J+2)', 'Suivi commercial (J+3)'],
    estimatedLeads: 'Leads avec scoring > 80',
  },
  {
    id: 'conversion-2',
    category: 'conversion',
    name: 'Conversion Abandon Panier',
    description: 'Récupération des leads qui ont commencé un processus mais ne l\'ont pas terminé',
    useCase: 'Récupérez les leads qui ont abandonné un formulaire ou une demande',
    steps: ['Rappel immédiat (J+0)', 'Offre incitative (J+1)', 'Support personnalisé (J+2)'],
    estimatedLeads: 'Leads avec action incomplète',
  },
  {
    id: 'conversion-3',
    category: 'conversion',
    name: 'Conversion Urgence',
    description: 'Séquence accélérée pour les leads avec signal d\'urgence détecté',
    useCase: 'Convertissez rapidement les leads qui montrent des signes d\'urgence',
    steps: ['Contact immédiat (J+0)', 'Proposition express (J+0)', 'Suivi rapproché (J+1)'],
    estimatedLeads: 'Leads avec signal d\'urgence',
  },
  {
    id: 'conversion-4',
    category: 'conversion',
    name: 'Conversion Fin de Période',
    description: 'Séquence de conversion avec offre limitée en fin de période',
    useCase: 'Créez un sentiment d\'urgence pour accélérer les conversions',
    steps: ['Offre limitée (J+0)', 'Rappel compteur (J+1)', 'Dernière chance (J+2)', 'Extension exceptionnelle (J+3)'],
    estimatedLeads: 'Leads en fin de période',
  },
  // RETENTION
  {
    id: 'retention-1',
    category: 'retention',
    name: 'Rétention Client Actif',
    description: 'Séquence de fidélisation pour maintenir l\'engagement des clients existants',
    useCase: 'Renforcez la relation avec vos clients actifs',
    steps: ['Newsletter mensuelle', 'Contenu exclusif', 'Enquête satisfaction', 'Offres personnalisées'],
    estimatedLeads: 'Clients actifs',
  },
  {
    id: 'retention-2',
    category: 'retention',
    name: 'Prévention Churn',
    description: 'Détection et intervention précoce pour éviter la perte de clients',
    useCase: 'Identifiez et récupérez les clients à risque de churn',
    steps: ['Détection signal faible', 'Contact proactif', 'Offre de rétention', 'Escalade si nécessaire'],
    estimatedLeads: 'Clients à risque de churn',
  },
  {
    id: 'retention-3',
    category: 'retention',
    name: 'Renouvellement Contrat',
    description: 'Séquence de renouvellement pour les contrats arrivant à échéance',
    useCase: 'Assurez le renouvellement des contrats clients',
    steps: ['Rappel échéance (J-30)', 'Proposition renouvellement (J-15)', 'Négociation (J-7)', 'Confirmation (J-1)'],
    estimatedLeads: 'Contrats arrivant à échéance',
  },
  {
    id: 'retention-4',
    category: 'retention',
    name: 'Programme Fidélité',
    description: 'Séquence de récompenses pour les clients fidèles',
    useCase: 'Récompensez et fidélisez vos meilleurs clients',
    steps: ['Points de fidélité', 'Offres exclusives', 'Événements VIP', 'Reconnaissance spéciale'],
    estimatedLeads: 'Clients fidèles',
  },
  // REACTIVATION
  {
    id: 'reactivation-1',
    category: 'reactivation',
    name: 'Réactivation Lead Perdu',
    description: 'Tentative de réactivation des leads marqués comme perdus',
    useCase: 'Donnez une seconde chance aux leads perdus',
    steps: ['Email de réactivation (J+0)', 'Nouvelle proposition (J+7)', 'Offre spéciale (J+14)', 'Dernière chance (J+21)'],
    estimatedLeads: 'Leads marqués "Perdu"',
  },
  {
    id: 'reactivation-2',
    category: 'reactivation',
    name: 'Réactivation Client Inactif',
    description: 'Réactivation des clients qui n\'ont pas eu d\'activité récente',
    useCase: 'Rallumez l\'intérêt des clients inactifs',
    steps: ['Email de rappel', 'Nouveautés produits', 'Offre de retour', 'Programme fidélité'],
    estimatedLeads: 'Clients inactifs > 90 jours',
  },
  {
    id: 'reactivation-3',
    category: 'reactivation',
    name: 'Réactivation Email Bounce',
    description: 'Réactivation des leads avec emails en erreur',
    useCase: 'Récupérez les leads avec problèmes d\'email',
    steps: ['Vérification email', 'Nettoyage base', 'Relance alternative', 'Mise à jour contact'],
    estimatedLeads: 'Leads avec emails en erreur',
  },
  {
    id: 'reactivation-4',
    category: 'reactivation',
    name: 'Réactivation Saisonnière',
    description: 'Réactivation ciblée selon les périodes de l\'année',
    useCase: 'Profitez des périodes propices pour réactiver vos leads',
    steps: ['Offre saisonnière', 'Contenu thématique', 'Événements spéciaux', 'Promotions limitées'],
    estimatedLeads: 'Leads selon période',
  },
  // UPSELL
  {
    id: 'upsell-1',
    category: 'upsell',
    name: 'Upsell Client Satisfait',
    description: 'Proposition d\'upgrade ou de produits complémentaires aux clients satisfaits',
    useCase: 'Augmentez la valeur moyenne des commandes',
    steps: ['Enquête satisfaction', 'Recommandations produits', 'Offre upgrade', 'Suivi personnalisé'],
    estimatedLeads: 'Clients avec satisfaction > 8/10',
  },
  {
    id: 'upsell-2',
    category: 'upsell',
    name: 'Cross-sell Produits Complémentaires',
    description: 'Proposition de produits complémentaires basée sur les achats précédents',
    useCase: 'Maximisez la valeur client avec des produits associés',
    steps: ['Analyse historique', 'Recommandations IA', 'Email personnalisé', 'Offre bundle'],
    estimatedLeads: 'Clients avec historique d\'achat',
  },
  {
    id: 'upsell-3',
    category: 'upsell',
    name: 'Upgrade Plan Premium',
    description: 'Proposition d\'upgrade vers un plan supérieur',
    useCase: 'Faites évoluer vos clients vers des offres plus complètes',
    steps: ['Analyse utilisation', 'Bénéfices premium', 'Offre transition', 'Support migration'],
    estimatedLeads: 'Clients utilisant intensivement',
  },
  {
    id: 'upsell-4',
    category: 'upsell',
    name: 'Upsell Saisonnier',
    description: 'Proposition d\'offres saisonnières ou événementielles',
    useCase: 'Profitez des occasions spéciales pour proposer des upgrades',
    steps: ['Détection occasion', 'Offre spéciale', 'Promotion limitée', 'Suivi personnalisé'],
    estimatedLeads: 'Clients selon contexte',
  },
  // QUALIFICATION
  {
    id: 'qualification-1',
    category: 'qualification',
    name: 'Qualification MQL → SQL',
    description: 'Automatisation de la qualification des leads marketing en leads commerciaux',
    useCase: 'Transformez les leads marketing en opportunités commerciales',
    steps: ['Scoring automatique', 'Questionnaire qualification', 'Assignation commercial', 'Suivi personnalisé'],
    estimatedLeads: 'MQL avec scoring > 60',
  },
  {
    id: 'qualification-2',
    category: 'qualification',
    name: 'Qualification par Formulaire',
    description: 'Qualification automatique basée sur les réponses à un formulaire',
    useCase: 'Qualifiez rapidement les leads qui remplissent vos formulaires',
    steps: ['Analyse réponses', 'Scoring automatique', 'Tagging intelligent', 'Routing commercial'],
    estimatedLeads: 'Leads avec formulaire rempli',
  },
  {
    id: 'qualification-3',
    category: 'qualification',
    name: 'Qualification BANT',
    description: 'Qualification selon les critères BANT (Budget, Autorité, Besoin, Timing)',
    useCase: 'Qualifiez vos leads selon les standards BANT',
    steps: ['Questionnaire BANT', 'Scoring multi-critères', 'Classification automatique', 'Routing optimisé'],
    estimatedLeads: 'Leads à qualifier',
  },
  {
    id: 'qualification-4',
    category: 'qualification',
    name: 'Qualification par Comportement',
    description: 'Qualification basée sur le comportement et l\'engagement',
    useCase: 'Qualifiez selon les actions et interactions des leads',
    steps: ['Tracking comportement', 'Scoring engagement', 'Détection intérêt', 'Qualification automatique'],
    estimatedLeads: 'Leads avec comportement actif',
  },
  // ESCALADE
  {
    id: 'escalade-1',
    category: 'escalade',
    name: 'Escalade Lead VIP',
    description: 'Escalade automatique des leads à fort potentiel vers un commercial senior',
    useCase: 'Assurez-vous que les meilleurs leads sont traités en priorité',
    steps: ['Détection VIP', 'Notification manager', 'Assignation senior', 'Suivi renforcé'],
    estimatedLeads: 'Leads VIP (valeur > 50k€)',
  },
  {
    id: 'escalade-2',
    category: 'escalade',
    name: 'Escalade Urgence',
    description: 'Escalade automatique des situations urgentes ou critiques',
    useCase: 'Gérez les situations critiques rapidement',
    steps: ['Détection urgence', 'Alerte immédiate', 'Assignation prioritaire', 'Suivi rapproché'],
    estimatedLeads: 'Leads avec signal d\'urgence',
  },
  {
    id: 'escalade-3',
    category: 'escalade',
    name: 'Escalade Non-Réponse',
    description: 'Escalade automatique si pas de réponse après plusieurs tentatives',
    useCase: 'Assurez le suivi même en cas de non-réponse',
    steps: ['Tentative 1 (J+0)', 'Tentative 2 (J+3)', 'Escalade manager (J+7)', 'Dernière chance (J+10)'],
    estimatedLeads: 'Leads sans réponse',
  },
  {
    id: 'escalade-4',
    category: 'escalade',
    name: 'Escalade Objection',
    description: 'Escalade automatique en cas d\'objection détectée',
    useCase: 'Gérez les objections avec l\'expertise appropriée',
    steps: ['Détection objection', 'Analyse type', 'Routing expert', 'Réponse personnalisée'],
    estimatedLeads: 'Leads avec objections',
  },
  // CUSTOM
  {
    id: 'custom-1',
    category: 'custom',
    name: 'Scénario Personnalisé',
    description: 'Créez votre propre workflow d\'automation selon vos besoins spécifiques',
    useCase: 'Adaptez l\'automation à votre processus unique',
    steps: ['Workflow personnalisé', 'Déclencheurs sur mesure', 'Actions multiples', 'Conditions avancées'],
    estimatedLeads: 'Selon vos critères',
  },
];

// Fonction helper pour trouver le template correspondant à une automation
const findTemplateForAutomation = (automation: MarketingAutomation): ScenarioTemplate | undefined => {
  // Chercher par nom exact
  let template = SCENARIO_TEMPLATES.find(t => t.name === automation.name);
  
  // Si pas trouvé, chercher par catégorie et nom similaire
  if (!template) {
    const categoryTemplates = SCENARIO_TEMPLATES.filter(t => t.category === automation.category);
    // Chercher le premier template de la catégorie (généralement le template principal)
    template = categoryTemplates[0];
  }
  
  return template;
};

// Fonction helper pour générer des workflows par défaut selon le template
const generateDefaultWorkflow = (templateId: string): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => {
  const template = SCENARIO_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return { nodes: [], edges: [] };
  }

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let nodeIdCounter = 1;
  let xPosition = 0;
  const ySpacing = 150;

  // Créer le nœud trigger de départ
  const triggerNode: WorkflowNode = {
    id: `node-${nodeIdCounter++}`,
    type: 'trigger',
    label: template.category === 'onboarding' ? 'Nouveau Lead' : 
           template.category === 'nurturing' ? 'Lead Inactif' :
           template.category === 'relance' ? 'Devis Envoyé' :
           template.category === 'conversion' ? 'Lead Chaud' :
           template.category === 'retention' ? 'Client Actif' :
           template.category === 'reactivation' ? 'Lead Perdu' :
           template.category === 'upsell' ? 'Client Satisfait' :
           template.category === 'qualification' ? 'MQL' :
           template.category === 'escalade' ? 'Lead VIP' : 'Événement',
    position: { x: xPosition, y: 0 },
    data: {
      triggerType: template.category === 'onboarding' ? 'lead_created' : 
                   template.category === 'nurturing' ? 'email_open' :
                   template.category === 'relance' ? 'email_click' :
                   'tag_added',
    },
  };
  nodes.push(triggerNode);
  xPosition += 250;

  // Créer les nœuds d'action basés sur les steps du template
  let previousNodeId = triggerNode.id;
  let previousDelayDays = 0;
  
  template.steps.forEach((step, index) => {
    // Extraire le délai si présent (J+0, J+2, etc.)
    const delayMatch = step.match(/J[+-](\d+)/);
    const currentDelayDays = delayMatch ? parseInt(delayMatch[1], 10) : 0;
    const relativeDelayDays = currentDelayDays - previousDelayDays;
    const delayMinutes = relativeDelayDays * 24 * 60;

    // Créer un nœud wait si nécessaire (seulement si délai relatif > 0)
    if (delayMinutes > 0 && index > 0) {
      const waitNode: WorkflowNode = {
        id: `node-${nodeIdCounter++}`,
        type: 'wait',
        label: relativeDelayDays === 1 ? 'Attendre 1 jour' : `Attendre ${relativeDelayDays} jours`,
        position: { x: xPosition, y: 0 },
        data: {
          delayMinutes,
        },
      };
      nodes.push(waitNode);
      
      // Connecter le nœud précédent au nœud wait
      edges.push({
        id: `edge-${edges.length + 1}`,
        source: previousNodeId,
        target: waitNode.id,
      });
      
      previousNodeId = waitNode.id;
      xPosition += 250;
    }

    // Créer le nœud d'action
    const actionLabel = step.replace(/\(J[+-]\d+\)/g, '').trim();
    const lowerLabel = actionLabel.toLowerCase();
    
    // Déterminer le type d'action basé sur le contenu
    let actionType = 'send_email'; // Par défaut
    if (lowerLabel.includes('email')) {
      actionType = 'send_email';
    } else if (lowerLabel.includes('appel') || lowerLabel.includes('téléphonique') || lowerLabel.includes('contact')) {
      actionType = 'assign_to';
    } else if (lowerLabel.includes('tag')) {
      actionType = 'add_tag';
    } else if (lowerLabel.includes('statut') || lowerLabel.includes('statut')) {
      actionType = 'change_status';
    } else if (lowerLabel.includes('questionnaire') || lowerLabel.includes('qualification') || lowerLabel.includes('formulaire')) {
      actionType = 'send_email'; // Questionnaire via email
    } else if (lowerLabel.includes('relance') || lowerLabel.includes('rappel')) {
      actionType = 'send_email';
    }
    
    const actionNode: WorkflowNode = {
      id: `node-${nodeIdCounter++}`,
      type: 'action',
      label: actionLabel,
      position: { x: xPosition, y: 0 },
      data: {
        actionType,
      },
    };
    nodes.push(actionNode);
    
    // Connecter au nœud précédent
    edges.push({
      id: `edge-${edges.length + 1}`,
      source: previousNodeId,
      target: actionNode.id,
    });
    
    previousNodeId = actionNode.id;
    previousDelayDays = currentDelayDays;
    xPosition += 250;
  });

  return { nodes, edges };
};

export const MarketingAutomationManager: React.FC = () => {
  const { showToast } = useApp();
  const {
    automations,
    loading,
    error,
    loadAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    enrollLeadsFromTarget,
    getAutomationStats,
  } = useMarketingAutomations();

  const {
    segments,
    loadSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    refreshSegmentCount,
  } = useLeadSegments();

  const { templates } = useEmailTemplates();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<MarketingAutomation | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<LeadSegment | null>(null);
  const [expandedAutomations, setExpandedAutomations] = useState<Set<string>>(new Set());
  const [automationStats, setAutomationStats] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'onboarding' as AutomationCategory,
    targetSegmentId: '',
    targetCriteria: {} as SegmentCriteria,
    pauseOnEngagement: true,
    maxEnrollments: undefined as number | undefined,
    priority: 0,
    templateId: '' as string,
  });

  const [segmentFormData, setSegmentFormData] = useState({
    name: '',
    description: '',
    criteria: {} as SegmentCriteria,
    isDynamic: true,
  });

  useEffect(() => {
    loadAutomations();
    loadSegments();
  }, []);

  useEffect(() => {
    // Charger les stats pour les automations actives
    const loadStats = async () => {
      const activeAutomations = automations.filter(a => a.status === 'active');
      if (activeAutomations.length === 0) return;

      setLoadingStats(true);
      const stats: Record<string, any> = {};
      for (const automation of activeAutomations) {
        stats[automation.id] = await getAutomationStats(automation.id);
      }
      setAutomationStats(stats);
      setLoadingStats(false);
    };

    if (automations.length > 0) {
      loadStats();
    }
  }, [automations]);

  // Générer automatiquement le workflow si vide lors de l'ouverture de la prévisualisation
  const enrichedWorkflowData = useMemo(() => {
    if (!selectedAutomation || !showPreviewModal) return null;
    
    const hasEmptyWorkflow = !selectedAutomation.workflowData.nodes || selectedAutomation.workflowData.nodes.length === 0;
    
    if (hasEmptyWorkflow) {
      const template = findTemplateForAutomation(selectedAutomation);
      if (template) {
        return generateDefaultWorkflow(template.id);
      }
    }
    
    return selectedAutomation.workflowData;
  }, [selectedAutomation, showPreviewModal]);

  // Sauvegarder le workflow généré en arrière-plan
  useEffect(() => {
    if (selectedAutomation && showPreviewModal && enrichedWorkflowData) {
      const hasEmptyWorkflow = !selectedAutomation.workflowData.nodes || selectedAutomation.workflowData.nodes.length === 0;
      const hasGeneratedWorkflow = enrichedWorkflowData.nodes && enrichedWorkflowData.nodes.length > 0;
      
      if (hasEmptyWorkflow && hasGeneratedWorkflow) {
        updateAutomation(selectedAutomation.id, { workflowData: enrichedWorkflowData })
          .then(() => {
            loadAutomations();
          })
          .catch(err => {
            console.error('Error saving generated workflow:', err);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAutomation?.id, showPreviewModal, enrichedWorkflowData]);

  const handleCreate = async () => {
    try {
      if (!formData.name) {
        showToast('Le nom est requis', 'error');
        return;
      }

      // Générer le workflow par défaut si un template est sélectionné
      const workflowData = formData.templateId 
        ? generateDefaultWorkflow(formData.templateId)
        : { nodes: [], edges: [] };

      await createAutomation({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        status: 'draft',
        targetSegmentId: formData.targetSegmentId || undefined,
        targetCriteria: formData.targetSegmentId ? undefined : formData.targetCriteria,
        workflowData,
        pauseOnEngagement: formData.pauseOnEngagement,
        maxEnrollments: formData.maxEnrollments,
        priority: formData.priority,
      });

      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        category: 'onboarding',
        targetSegmentId: '',
        targetCriteria: {},
        pauseOnEngagement: true,
        maxEnrollments: undefined,
        priority: 0,
        templateId: '',
      });
      showToast('Automation créée avec succès', 'success');
    } catch (err) {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const handleEdit = (automation: MarketingAutomation) => {
    setSelectedAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      category: automation.category,
      targetSegmentId: automation.targetSegmentId || '',
      targetCriteria: automation.targetCriteria || {},
      pauseOnEngagement: automation.pauseOnEngagement,
      maxEnrollments: automation.maxEnrollments,
      priority: automation.priority,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedAutomation) return;

    try {
      await updateAutomation(selectedAutomation.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        targetSegmentId: formData.targetSegmentId || undefined,
        targetCriteria: formData.targetSegmentId ? undefined : formData.targetCriteria,
        pauseOnEngagement: formData.pauseOnEngagement,
        maxEnrollments: formData.maxEnrollments,
        priority: formData.priority,
      });

      setShowEditModal(false);
      setSelectedAutomation(null);
      showToast('Automation mise à jour', 'success');
    } catch (err) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDelete = async (automationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette automation ?')) return;

    try {
      await deleteAutomation(automationId);
      showToast('Automation supprimée', 'success');
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleEnrollLeads = async (automationId: string) => {
    try {
      const count = await enrollLeadsFromTarget(automationId);
      showToast(`${count} lead(s) inscrit(s)`, 'success');
    } catch (err) {
      showToast('Erreur lors de l\'inscription', 'error');
    }
  };

  const handleCreateSegment = async () => {
    try {
      if (!segmentFormData.name) {
        showToast('Le nom est requis', 'error');
        return;
      }

      await createSegment(segmentFormData);
      setShowSegmentModal(false);
      setSegmentFormData({
        name: '',
        description: '',
        criteria: {},
        isDynamic: true,
      });
      showToast('Segment créé avec succès', 'success');
    } catch (err) {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedAutomations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAutomations(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Automations Marketing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Créez des workflows automatisés avec segmentation avancée
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowScenariosModal(true)} variant="secondary" icon={BookOpen}>
            Scénarios
          </Button>
          <Button onClick={() => setShowSegmentModal(true)} variant="secondary" icon={Filter}>
            Nouveau Segment
          </Button>
          <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
            Nouvelle Automation
          </Button>
        </div>
      </div>

      {/* Tableau des scénarios actifs avec stats */}
      {automations.filter(a => a.status === 'active').length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-500" />
              Scénarios Actifs
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Catégorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inscriptions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actives</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Terminées</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exécutions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taux de réussite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {automations
                  .filter(a => a.status === 'active')
                  .map((automation) => {
                    const categoryInfo = CATEGORY_LABELS[automation.category];
                    const stats = automationStats[automation.id] || {
                      totalEnrollments: 0,
                      activeEnrollments: 0,
                      completedEnrollments: 0,
                      totalExecutions: 0,
                      successfulExecutions: 0,
                      failedExecutions: 0,
                      successRate: '0',
                    };

                    return (
                      <tr key={automation.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900 dark:text-white">{automation.name}</div>
                          {automation.description && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">{automation.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={categoryInfo.color}>
                            {categoryInfo.icon}
                            {categoryInfo.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {loadingStats ? <Loader size="sm" /> : stats.totalEnrollments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {loadingStats ? <Loader size="sm" /> : (
                            <span className="text-green-600 dark:text-green-400 font-medium">{stats.activeEnrollments}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {loadingStats ? <Loader size="sm" /> : (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.completedEnrollments}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {loadingStats ? <Loader size="sm" /> : stats.totalExecutions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {loadingStats ? <Loader size="sm" /> : (
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                parseFloat(stats.successRate) >= 90 ? 'text-green-600 dark:text-green-400' :
                                parseFloat(stats.successRate) >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {stats.successRate}%
                              </span>
                              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    parseFloat(stats.successRate) >= 90 ? 'bg-green-500' :
                                    parseFloat(stats.successRate) >= 70 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${stats.successRate}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Eye}
                              onClick={() => {
                                setSelectedAutomation(automation);
                                setShowPreviewModal(true);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Edit3}
                              onClick={() => handleEdit(automation)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Segments Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Filter size={20} className="text-indigo-500" />
          Segments de Leads
        </h3>
        {segments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
            Aucun segment créé. Créez votre premier segment pour cibler vos automations.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">{segment.name}</h4>
                  <Badge className={segment.isDynamic ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
                    {segment.isDynamic ? 'Dynamique' : 'Statique'}
                  </Badge>
                </div>
                {segment.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{segment.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {segment.leadCount} lead(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={RefreshCw}
                      onClick={() => refreshSegmentCount(segment.id)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => deleteSegment(segment.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Zap size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">Aucune automation créée</p>
            <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
              Créer votre première automation
            </Button>
          </div>
        ) : (
          automations.map((automation) => {
            const categoryInfo = CATEGORY_LABELS[automation.category];
            const statusInfo = STATUS_LABELS[automation.status];
            const isExpanded = expandedAutomations.has(automation.id);

            return (
              <div
                key={automation.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{automation.name}</h3>
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.icon}
                          {categoryInfo.label}
                        </Badge>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                      {automation.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{automation.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        {automation.targetSegmentId && (
                          <span className="flex items-center gap-1">
                            <Filter size={14} />
                            Segment: {segments.find(s => s.id === automation.targetSegmentId)?.name || 'N/A'}
                          </span>
                        )}
                        {automation.workflowData.nodes.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap size={14} />
                            {automation.workflowData.nodes.length} étape(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => {
                          setSelectedAutomation(automation);
                          setShowPreviewModal(true);
                        }}
                      >
                        Prévisualiser
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit3}
                        onClick={() => handleEdit(automation)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Users}
                        onClick={() => handleEnrollLeads(automation.id)}
                      >
                        Inscrire leads
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => handleDelete(automation.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      L'éditeur de workflow sera disponible dans une prochaine version.
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Automation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouvelle Automation"
        size="large"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ex: Onboarding Nouveau Lead"
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de l'automation..."
          />
          <Select
            label="Catégorie"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as AutomationCategory })}
            options={Object.entries(CATEGORY_LABELS).map(([value, info]) => ({
              value,
              label: info.label,
            }))}
          />
          <Select
            label="Segment cible (optionnel)"
            value={formData.targetSegmentId}
            onChange={(value) => setFormData({ ...formData, targetSegmentId: value })}
            options={[
              { value: '', label: 'Aucun (utiliser critères directs)' },
              ...segments.map(s => ({ value: s.id, label: s.name })),
            ]}
          />
          <div className="flex gap-4">
            <Input
              label="Priorité"
              type="number"
              value={formData.priority.toString()}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Max inscriptions (optionnel)"
              type="number"
              value={formData.maxEnrollments?.toString() || ''}
              onChange={(e) => setFormData({ ...formData, maxEnrollments: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pauseOnEngagement"
              checked={formData.pauseOnEngagement}
              onChange={(e) => setFormData({ ...formData, pauseOnEngagement: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="pauseOnEngagement" className="text-sm text-slate-700 dark:text-slate-300">
              Pause automatique si engagement détecté
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Automation Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAutomation(null);
        }}
        title="Modifier l'Automation"
        size="large"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Select
            label="Catégorie"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as AutomationCategory })}
            options={Object.entries(CATEGORY_LABELS).map(([value, info]) => ({
              value,
              label: info.label,
            }))}
          />
          <Select
            label="Segment cible"
            value={formData.targetSegmentId}
            onChange={(value) => setFormData({ ...formData, targetSegmentId: value })}
            options={[
              { value: '', label: 'Aucun (utiliser critères directs)' },
              ...segments.map(s => ({ value: s.id, label: s.name })),
            ]}
          />
          <div className="flex gap-4">
            <Input
              label="Priorité"
              type="number"
              value={formData.priority.toString()}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Max inscriptions"
              type="number"
              value={formData.maxEnrollments?.toString() || ''}
              onChange={(e) => setFormData({ ...formData, maxEnrollments: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editPauseOnEngagement"
              checked={formData.pauseOnEngagement}
              onChange={(e) => setFormData({ ...formData, pauseOnEngagement: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="editPauseOnEngagement" className="text-sm text-slate-700 dark:text-slate-300">
              Pause automatique si engagement détecté
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => {
              setShowEditModal(false);
              setSelectedAutomation(null);
            }}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* Create Segment Modal */}
      <Modal
        isOpen={showSegmentModal}
        onClose={() => setShowSegmentModal(false)}
        title="Nouveau Segment"
        size="large"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={segmentFormData.name}
            onChange={(e) => setSegmentFormData({ ...segmentFormData, name: e.target.value })}
            placeholder="ex: Leads Chauds avec Budget > 10k€"
          />
          <Textarea
            label="Description"
            value={segmentFormData.description}
            onChange={(e) => setSegmentFormData({ ...segmentFormData, description: e.target.value })}
            placeholder="Description du segment..."
          />
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-500/30">
            <p className="text-sm text-indigo-800 dark:text-indigo-300">
              <strong>Note:</strong> L'éditeur de critères avancés sera disponible dans une prochaine version.
              Pour l'instant, créez le segment et modifiez les critères via l'API ou directement en base de données.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDynamic"
              checked={segmentFormData.isDynamic}
              onChange={(e) => setSegmentFormData({ ...segmentFormData, isDynamic: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isDynamic" className="text-sm text-slate-700 dark:text-slate-300">
              Segment dynamique (recalculé automatiquement)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowSegmentModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSegment}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {selectedAutomation && (enrichedWorkflowData || selectedAutomation.workflowData) && (
        <WorkflowPreview
          workflow={{
            id: selectedAutomation.id,
            name: selectedAutomation.name,
            description: selectedAutomation.description,
            scenarioType: selectedAutomation.category as any,
            status: selectedAutomation.status as any,
            workflowData: enrichedWorkflowData || selectedAutomation.workflowData,
            createdBy: selectedAutomation.createdBy,
            createdAt: selectedAutomation.createdAt,
            updatedAt: selectedAutomation.updatedAt,
          }}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedAutomation(null);
          }}
        />
      )}

      {/* Scénarios Modal */}
      <Modal
        isOpen={showScenariosModal}
        onClose={() => setShowScenariosModal(false)}
        title="Scénarios Disponibles"
        size="2xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choisissez un scénario pré-configuré pour créer rapidement une nouvelle automation. Chaque scénario inclut un workflow optimisé et des recommandations de ciblage.
          </p>
          
          {/* Filtres par catégorie */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const allButton = document.getElementById('filter-all');
                if (allButton) allButton.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs"
            >
              Tous
            </Button>
            {Object.entries(CATEGORY_LABELS).map(([category, info]) => (
              <Button
                key={category}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {info.icon}
                {info.label}
              </Button>
            ))}
          </div>

          {/* Liste des scénarios par catégorie */}
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {Object.entries(CATEGORY_LABELS).map(([category, info]) => {
              const categoryTemplates = SCENARIO_TEMPLATES.filter(s => s.category === category);
              const categoryAutomations = automations.filter(a => a.category === category);
              
              if (categoryTemplates.length === 0) return null;

              return (
                <div key={category} id={`category-${category}`} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className={`p-1.5 rounded-lg ${info.color}`}>
                      {info.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{info.label}</h3>
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {categoryTemplates.length} scénario(s)
                    </Badge>
                    {categoryAutomations.length > 0 && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        {categoryAutomations.length} actif(s)
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-slate-800"
                        onClick={() => {
                          setFormData({
                            name: template.name,
                            description: template.description,
                            category: template.category,
                            targetSegmentId: '',
                            targetCriteria: {},
                            pauseOnEngagement: true,
                            maxEnrollments: undefined,
                            priority: 0,
                            templateId: template.id,
                          });
                          setShowScenariosModal(false);
                          setShowCreateModal(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{template.name}</h4>
                          <Badge className={info.color} size="sm">
                            {info.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{template.description}</p>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-start gap-2">
                            <Target size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <strong className="text-slate-700 dark:text-slate-300">Cas d'usage:</strong> {template.useCase}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Users size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <strong className="text-slate-700 dark:text-slate-300">Cible:</strong> {template.estimatedLeads}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Étapes:</p>
                          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                            {template.steps.map((step, idx) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <Clock size={10} className="text-slate-400" />
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

