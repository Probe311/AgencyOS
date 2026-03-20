
import React, { useState, useMemo, useRef } from 'react';
import { MoreVertical, Phone, Mail, LayoutGrid, List, CheckCircle2, Calendar, User, Building, ArrowRight, DollarSign, Globe, Linkedin, Radio, RefreshCcw, Plus, Sparkles, Send, Clock, FileText, CheckSquare, Paperclip, Search, BrainCircuit, Bot, MapPin, Zap, Filter, ArrowUpDown, Download, Tag, AlertTriangle, Database, Layers, Upload, Map, Trash2, Star, Settings, Wrench, Store, Factory, Briefcase, UtensilsCrossed, Building2, Flame, Thermometer, Snowflake, Code, BadgeCheck, BarChart3 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { Modal } from '../ui/Modal';
import { Lead, LeadContact, LifecycleStage, LeadFamily, LeadTemperature } from '../../types';
import { SearchBar } from '../ui/SearchBar';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { PageLayout } from '../ui/PageLayout';
import { generateUniqueId } from '../../lib/utils';
import { enrichLeadWithAI, enrichLeadWithData, runProspectingWithAI, callGeminiAPI, validateExistingLeads, LeadValidationResult } from '../../lib/ai-client';
import { CrmMapView } from '../crm/CrmMapView';
import { ProspectingScheduler } from '../crm/ProspectingScheduler';
import { ProspectingHistory } from '../crm/ProspectingHistory';
import { ScrapingAnalyticsDashboard } from '../crm/ScrapingAnalyticsDashboard';
import { LeadTimeline } from '../crm/LeadTimeline';
import { LeadEvents } from '../crm/LeadEvents';
import { LeadScoringConfig } from '../crm/LeadScoringConfig';
import { DuplicateDetection } from '../crm/DuplicateDetection';
import { useScheduledProspecting } from '../../lib/supabase/hooks/useScheduledProspecting';
import { exportLeads } from '../../lib/utils/exportLeads';
import { enrichLeadData, saveLeadEnrichment } from '../../lib/utils/leadEnrichment';
import { isDuplicate } from '../../lib/utils/duplicateDetection';
import { CustomPieChart } from '../charts/CustomPieChart';
import { shouldCertifyLead, checkLeadCertification, certifyLeadIfEligible, getCertificationMessage } from '../../lib/utils/leadCertification';
import { useLeadAssignment } from '../../lib/supabase/hooks/useLeadAssignment';
import { EmailTrackingStats } from '../crm/EmailTrackingStats';
import { SavedFiltersManager } from '../crm/SavedFiltersManager';
import { ProspectingZonesManager } from '../crm/ProspectingZonesManager';
import { VIPLeadsDashboard } from '../crm/VIPLeadsDashboard';
import { isVIPLead } from '../../lib/services/vipLeadService';
import { useProspectingZones } from '../../lib/supabase/hooks/useProspectingZones';
import { unsubscribeLead, isLeadUnsubscribed } from '../../lib/services/unsubscriptionService';
import { supabase } from '../../lib/supabase';
import { UserX } from 'lucide-react';
import { hexToRgba } from '../../lib/hooks/useKanbanColumns';
import { AppointmentScheduler } from '../crm/AppointmentScheduler';
import { FieldVisitManager } from '../crm/FieldVisitManager';

// Extend Lead type locally for enrichment fields if not present globally
interface EnrichedLead extends Lead {
   description?: string;
   industry?: string;
   employees?: string;
   website?: string;
   linkedin?: string;
   techStack?: string[];
   triggerEvent?: string;
   ceo?: string;
   address?: string;
   company_size?: string;
   client_type?: string;
   digital_maturity?: string;
   google_rating?: string;
   google_reviews_count?: string;
   creation_year?: string;
   social_networks?: Record<string, string>;
   reliability?: Record<string, string>;
}

const SECTORS = [
   'Agences Marketing & Com',
   'Startups Tech / SaaS',
   'Commerce de détail / Retail',
   'Immobilier',
   'Santé & Bien-être',
   'BTP & Construction',
   'Restauration & Hôtellerie',
   'Services Juridiques',
   'Consulting & Audit',
   'Éducation & Formation',
   'Artisans & Services Locaux'
];

// Familles de leads avec icônes
const LEAD_FAMILIES: Array<{ value: LeadFamily; label: string; icon: React.ReactNode; color: string }> = [
   { value: 'Artisans', label: 'Artisans', icon: <Wrench size={16} />, color: '#f59e0b' },
   { value: 'Commerçants', label: 'Commerçants', icon: <Store size={16} />, color: '#3b82f6' },
   { value: 'Industrie & Manufacturier', label: 'Industrie & Manufacturier', icon: <Factory size={16} />, color: '#8b5cf6' },
   { value: 'Professions Libérales', label: 'Professions Libérales', icon: <Briefcase size={16} />, color: '#10b981' },
   { value: 'Hôtellerie, Restauration & Loisirs', label: 'Hôtellerie, Restauration & Loisirs', icon: <UtensilsCrossed size={16} />, color: '#ef4444' },
   { value: 'Grandes Entreprises & ETI', label: 'Grandes Entreprises & ETI', icon: <Building2 size={16} />, color: '#6366f1' },
   { value: 'Startups Tech / SaaS', label: 'Startups Tech / SaaS', icon: <Code size={16} />, color: '#06b6d4' }
];

// Températures de leads avec icônes
const LEAD_TEMPERATURES: Array<{ value: LeadTemperature; label: string; icon: React.ReactNode; color: string }> = [
   { value: 'Chaud', label: 'Chaud', icon: <Flame size={16} />, color: '#ef4444' },
   { value: 'Tiède', label: 'Tiède', icon: <Thermometer size={16} />, color: '#f97316' },
   { value: 'Froid', label: 'Froid', icon: <Snowflake size={16} />, color: '#3b82f6' }
];

// Fonction pour obtenir les données d'une famille
const getFamilyData = (family?: LeadFamily) => {
   return LEAD_FAMILIES.find(f => f.value === family) || null;
};

// Fonction pour obtenir les données d'une température
const getTemperatureData = (temperature?: LeadTemperature) => {
   return LEAD_TEMPERATURES.find(t => t.value === temperature) || null;
};

export const CrmView: React.FC = () => {
  const { showToast, leads, addLead, updateLead, deleteLead, resetAllLeadValues } = useApp();
  const { assignLead } = useLeadAssignment();
  const [viewMode, setViewMode] = useState<'table' | 'pipeline' | 'lifecycle' | 'prospecting' | 'map' | 'appointments'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Partial<EnrichedLead> | null>(null);
  const [lifecycleGroup, setLifecycleGroup] = useState<'marketing' | 'sales' | 'success' | 'retention'>('marketing');
  const [isUnsubscribeModalOpen, setIsUnsubscribeModalOpen] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [unsubscribeData, setUnsubscribeData] = useState({
    emailMarketing: false,
    emailTransactional: false,
    sms: false,
    whatsapp: false,
    reason: '',
  });
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('Tous');
  const [filterIndustry, setFilterIndustry] = useState('Tous');
  const [filterSource, setFilterSource] = useState('Tous');
  const [filterFamily, setFilterFamily] = useState<LeadFamily | 'Tous'>('Tous');
  const [filterTemperature, setFilterTemperature] = useState<LeadTemperature | 'Tous'>('Tous');
  const [filterCertified, setFilterCertified] = useState<'Tous' | 'Certifiés' | 'Non certifiés'>('Tous');
  const [filterZone, setFilterZone] = useState<string>('Tous');

  // Prospecting Zones for filtering
  const { zones, isPointInZone } = useProspectingZones();

  // Enrichment State
  const [isEnriching, setIsEnriching] = useState(false);

  // Prospecting Robot State
  const [prospectingZone, setProspectingZone] = useState('');
  const [prospectingActivity, setProspectingActivity] = useState(SECTORS[0]);
  const [isProspecting, setIsProspecting] = useState(false);
  const [generatedLeads, setGeneratedLeads] = useState<EnrichedLead[]>([]);
  const [prospectingStatus, setProspectingStatus] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [leadQualityScores, setLeadQualityScores] = useState<Record<string, any>>({});
  
  // Lead Validation State
  const [isValidatingLeads, setIsValidatingLeads] = useState(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState({
    current: 0,
    total: 0,
    currentLead: '',
    status: '',
    results: [] as Array<{ leadId: string; company: string; status: 'success' | 'error' | 'warning'; message: string }>
  });
  const [validationResults, setValidationResults] = useState<LeadValidationResult[]>([]);
  const [showValidationResults, setShowValidationResults] = useState(false);

  // AI Lifecycle Assistant State
  const [lifecycleAdvice, setLifecycleAdvice] = useState<string | null>(null);
  const [isAnalyzingLifecycle, setIsAnalyzingLifecycle] = useState(false);

  // AI Email State
  const [emailDraft, setEmailDraft] = useState('');
  const [activeLeadTab, setActiveLeadTab] = useState<'details' | 'timeline' | 'events' | 'tasks' | 'files' | 'email' | 'vip' | 'visits'>('details');

  // Prospecting Scheduling State
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isScoringConfigOpen, setIsScoringConfigOpen] = useState(false);
  const [isDuplicateDetectionOpen, setIsDuplicateDetectionOpen] = useState(false);
  const { createHistoryEntry, updateHistoryEntry } = useScheduledProspecting();

  // Prospecting Zones State
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Drag & Drop State for Pipeline
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const pipelineStages = ['Nouveau', 'Découverte', 'Proposition', 'Négociation', 'Gagné'];
  
  // Pipeline columns configuration (using hex colors like ProjectsView)
  const pipelineColumns = [
    { id: 'Nouveau', title: 'Nouveau', color: '#64748b' },
    { id: 'Découverte', title: 'Découverte', color: '#6366f1' },
    { id: 'Proposition', title: 'Proposition', color: '#f59e0b' },
    { id: 'Négociation', title: 'Négociation', color: '#f97316' },
    { id: 'Gagné', title: 'Gagné', color: '#10b981' },
  ];

  const lifecycleStagesMap: Record<string, LifecycleStage[]> = {
     marketing: ['Audience', 'Lead', 'MQL'],
     sales: ['SQL', 'Contact', 'Opportunité'],
     success: ['Client', 'Client Actif', 'Ambassadeur'],
     retention: ['Inactif', 'Perdu']
  };

  /**
   * Calcule le score de certification d'un lead (0-100%)
   * Utilise la fonction de certification centralisée
   */
  const calculateCertificationScore = (lead: Lead | EnrichedLead): number => {
     const criteria = checkLeadCertification(lead);
     return criteria.score;
  };

  /**
   * Vérifie si un lead est certifié
   * Un lead est certifié s'il a TOUS les critères : SIRET, email, téléphone, nom du contact
   */
  const isLeadCertified = (lead: Lead | EnrichedLead): boolean => {
     return shouldCertifyLead(lead) || (lead as any).certified === true;
  };

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
     const matchesSearch = (lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            lead.company.toLowerCase().includes(searchQuery.toLowerCase()));
     const matchesStage = filterStage === 'Tous' || lead.stage === filterStage || lead.lifecycleStage === filterStage;
     // Note: Casting lead to access local properties like industry if they exist in state but not strictly in type
     const l = lead as EnrichedLead;
     const matchesIndustry = filterIndustry === 'Tous' || l.industry === filterIndustry;
     const matchesSource = filterSource === 'Tous' || lead.source === filterSource;
     const matchesFamily = filterFamily === 'Tous' || lead.family === filterFamily;
     const matchesTemperature = filterTemperature === 'Tous' || lead.temperature === filterTemperature;
     const matchesCertified = filterCertified === 'Tous' || 
                              (filterCertified === 'Certifiés' && isLeadCertified(lead)) ||
                              (filterCertified === 'Non certifiés' && !isLeadCertified(lead));

     // Filtre par zone géographique
     const matchesZone = filterZone === 'Tous' || (() => {
       if (!lead.latitude || !lead.longitude) return false;
       const selectedZone = zones.find(z => z.id === filterZone && z.isActive);
       if (!selectedZone) return false;
       return isPointInZone(lead.latitude, lead.longitude, selectedZone);
     })();

     return matchesSearch && matchesStage && matchesIndustry && matchesSource && matchesFamily && matchesTemperature && matchesCertified && matchesZone;
  });

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setActiveLeadTab('details');
    setEmailDraft('');
    setLifecycleAdvice(null);
    setIsModalOpen(true);
  };

  const handleDeleteLead = async (leadId: string, leadName?: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le lead "${leadName || 'cet élément'}" ?`)) {
      return;
    }

    try {
      deleteLead(leadId);
      showToast('Lead supprimé', 'success');
      if (selectedLead?.id === leadId) {
        setIsModalOpen(false);
        setSelectedLead(null);
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showToast(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`, 'error');
    }
  };

  // Saved Filters Support
  const currentFilters = useMemo(() => ({
    searchQuery,
    filterStage,
    filterIndustry,
    filterSource,
    filterFamily,
    filterTemperature,
    filterCertified,
    filterZone,
  }), [searchQuery, filterStage, filterIndustry, filterSource, filterFamily, filterTemperature, filterCertified, filterZone]);

  const handleLoadFilter = (criteria: any) => {
    if (criteria.searchQuery !== undefined) setSearchQuery(criteria.searchQuery || '');
    if (criteria.filterStage !== undefined) setFilterStage(criteria.filterStage || 'Tous');
    if (criteria.filterIndustry !== undefined) setFilterIndustry(criteria.filterIndustry || 'Tous');
    if (criteria.filterSource !== undefined) setFilterSource(criteria.filterSource || 'Tous');
    if (criteria.filterFamily !== undefined) setFilterFamily(criteria.filterFamily || 'Tous');
    if (criteria.filterTemperature !== undefined) setFilterTemperature(criteria.filterTemperature || 'Tous');
    if (criteria.filterCertified !== undefined) setFilterCertified(criteria.filterCertified || 'Tous');
    if (criteria.filterZone !== undefined) setFilterZone(criteria.filterZone || 'Tous');
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      
      await updateLead({ ...lead, stage: newStage as Lead['stage'] });
      showToast('Étape mise à jour', 'success');
    } catch (error: any) {
      console.error('Erreur lors du changement d\'étape:', error);
      showToast(`Erreur: ${error.message || 'Erreur inconnue'}`, 'error');
    }
  };

  // Drag & Drop handlers (similar to ProjectsView)
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      handleStageChange(leadId, stage);
      setDraggedLeadId(null);
    }
  };

  // Kanban horizontal scroll handlers
  const handleKanbanMouseDown = (e: React.MouseEvent) => {
    if (!kanbanScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - kanbanScrollRef.current.offsetLeft);
    setScrollLeft(kanbanScrollRef.current.scrollLeft);
  };

  const handleKanbanMouseLeave = () => {
    setIsDragging(false);
  };

  const handleKanbanMouseUp = () => {
    setIsDragging(false);
  };

  const handleKanbanMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !kanbanScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    kanbanScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleKanbanTouchStart = (e: React.TouchEvent) => {
    if (!kanbanScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - kanbanScrollRef.current.offsetLeft);
    setScrollLeft(kanbanScrollRef.current.scrollLeft);
  };

  const handleKanbanTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !kanbanScrollRef.current) return;
    e.preventDefault();
    const x = e.touches[0].pageX - kanbanScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    kanbanScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleKanbanTouchEnd = () => {
    setIsDragging(false);
  };

  const handleOpenCreate = () => {
     setSelectedLead({});
     setActiveLeadTab('details');
     setEmailDraft('');
     setIsModalOpen(true);
  }

  const handleImportJSON = () => {
     // Créer un input file caché
     const input = document.createElement('input');
     input.type = 'file';
     input.accept = '.json,application/json';
     input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        try {
           const text = await file.text();
           const jsonData = JSON.parse(text);
           
           // Normaliser les données : peut être un tableau ou un objet unique
           const leadsArray = Array.isArray(jsonData) ? jsonData : [jsonData];
           
           if (leadsArray.length === 0) {
              showToast('Le fichier JSON est vide', 'error');
              return;
           }

           // Fonction pour normaliser la source selon les valeurs autorisées
           const normalizeSource = (sourceValue: any): Lead['source'] | undefined => {
              if (!sourceValue) return undefined;
              
              const sourceStr = String(sourceValue).trim();
              
              // Valeurs autorisées exactes
              const validSources: Lead['source'][] = ['Site Web', 'LinkedIn', 'Référence', 'Pubs', 'Appel froid', 'Robot Prospection'];
              
              // Vérifier si la valeur correspond exactement à une valeur autorisée
              const exactMatch = validSources.find(s => s === sourceStr);
              if (exactMatch) return exactMatch;
              
              // Mapping des variations communes vers les valeurs autorisées
              const sourceMapping: Record<string, Lead['source']> = {
                 'site web': 'Site Web',
                 'siteweb': 'Site Web',
                 'website': 'Site Web',
                 'web': 'Site Web',
                 'linkedin': 'LinkedIn',
                 'linked in': 'LinkedIn',
                 'reference': 'Référence',
                 'référence': 'Référence',
                 'ref': 'Référence',
                 'pubs': 'Pubs',
                 'publicité': 'Pubs',
                 'publicite': 'Pubs',
                 'pub': 'Pubs',
                 'appel froid': 'Appel froid',
                 'cold call': 'Appel froid',
                 'coldcall': 'Appel froid',
                 'robot prospection': 'Robot Prospection',
                 'robot': 'Robot Prospection',
                 'prospection': 'Robot Prospection',
                 'import json': 'Site Web', // Valeur par défaut pour les imports JSON
                 'import': 'Site Web'
              };
              
              const normalized = sourceMapping[sourceStr.toLowerCase()];
              return normalized || undefined; // Retourne undefined si aucune correspondance
           };

           // Fonction pour normaliser la famille selon les valeurs autorisées
           const normalizeFamily = (familyValue: any): LeadFamily | undefined => {
              if (!familyValue) return undefined;
              
              const familyStr = String(familyValue).trim();
              
              // Valeurs autorisées exactes
              const validFamilies: LeadFamily[] = ['Artisans', 'Commerçants', 'Industrie & Manufacturier', 'Professions Libérales', 'Hôtellerie, Restauration & Loisirs', 'Grandes Entreprises & ETI', 'Startups Tech / SaaS'];
              
              // Vérifier si la valeur correspond exactement à une valeur autorisée
              const exactMatch = validFamilies.find(f => f === familyStr);
              if (exactMatch) return exactMatch;
              
              // Mapping des variations communes
              const familyMapping: Record<string, LeadFamily> = {
                 'artisan': 'Artisans',
                 'artisans': 'Artisans',
                 'commerçant': 'Commerçants',
                 'commerçants': 'Commerçants',
                 'commercant': 'Commerçants',
                 'commercants': 'Commerçants',
                 'industrie': 'Industrie & Manufacturier',
                 'manufacturier': 'Industrie & Manufacturier',
                 'profession libérale': 'Professions Libérales',
                 'professions libérales': 'Professions Libérales',
                 'profession liberale': 'Professions Libérales',
                 'professions liberales': 'Professions Libérales',
                 'hôtellerie': 'Hôtellerie, Restauration & Loisirs',
                 'hotellerie': 'Hôtellerie, Restauration & Loisirs',
                 'restauration': 'Hôtellerie, Restauration & Loisirs',
                 'loisirs': 'Hôtellerie, Restauration & Loisirs',
                 'grande entreprise': 'Grandes Entreprises & ETI',
                 'grandes entreprises': 'Grandes Entreprises & ETI',
                 'eti': 'Grandes Entreprises & ETI',
                 'etp': 'Grandes Entreprises & ETI',
                 'startup': 'Startups Tech / SaaS',
                 'startups': 'Startups Tech / SaaS',
                 'tech': 'Startups Tech / SaaS',
                 'saas': 'Startups Tech / SaaS',
                 'startups tech': 'Startups Tech / SaaS',
                 'startups tech / saas': 'Startups Tech / SaaS'
              };
              
              const normalized = familyMapping[familyStr.toLowerCase()];
              return normalized || undefined;
           };

           // Fonction pour normaliser la température selon les valeurs autorisées
           const normalizeTemperature = (temperatureValue: any): LeadTemperature | undefined => {
              if (!temperatureValue) return undefined;
              
              const tempStr = String(temperatureValue).trim();
              
              // Valeurs autorisées exactes
              const validTemperatures: LeadTemperature[] = ['Chaud', 'Tiède', 'Froid'];
              
              // Vérifier si la valeur correspond exactement à une valeur autorisée
              const exactMatch = validTemperatures.find(t => t === tempStr);
              if (exactMatch) return exactMatch;
              
              // Mapping des variations communes
              const temperatureMapping: Record<string, LeadTemperature> = {
                 'chaud': 'Chaud',
                 'hot': 'Chaud',
                 'tiède': 'Tiède',
                 'tiede': 'Tiède',
                 'warm': 'Tiède',
                 'froid': 'Froid',
                 'cold': 'Froid'
              };
              
              const normalized = temperatureMapping[tempStr.toLowerCase()];
              return normalized || undefined;
           };

           // Fonction pour normaliser les valeurs "Non trouvé" en null ou chaîne vide
           const normalizeValue = (value: any): any => {
              if (value === null || value === undefined) return null;
              const str = String(value).trim();
              if (str === 'Non trouvé' || str === 'Non trouve' || str === 'non trouvé' || str === 'non trouve' || str === '') {
                 return null;
              }
              return value;
           };

           // Fonction pour normaliser le nom : détecte les titres et cherche le vrai nom/prénom
           const normalizeName = (item: any, index: number): string => {
              // Liste des titres/fonctions communs qui ne sont pas des noms
              const titles = [
                 'gérant', 'gerant', 'gérante', 'gerante',
                 'responsable', 'directeur', 'directrice', 'directrice générale', 'directeur général',
                 'manager', 'chef', 'propriétaire', 'proprietaire',
                 'fondateur', 'fondatrice', 'co-fondateur', 'co-fondatrice',
                 'ceo', 'pdg', 'président', 'president', 'présidente', 'presidente',
                 'commercial', 'commerciale', 'vendeur', 'vendeuse',
                 'assistant', 'assistante', 'secrétaire', 'secretaire',
                 'coordinateur', 'coordinatrice', 'superviseur', 'superviseuse'
              ];

              // Liste des mots indiquant un nom d'entreprise plutôt qu'un nom de personne
              const companyIndicators = [
                 'maison', 'boutique', 'boucherie', 'boulangerie', 'pâtisserie', 'patisserie',
                 'pharmacie', 'optique', 'bijouterie', 'poissonnerie', 'fromagerie',
                 'librairie', 'fleuriste', 'animalerie', 'cordonnerie', 'mercerie',
                 'quincaillerie', 'chocolaterie', 'herboristerie', 'tabac', 'pressing',
                 'studio', 'atelier', 'institut', 'auto-école', 'auto ecole',
                 'l\'', 'le ', 'la ', 'les ', 'du ', 'de la ', 'des '
              ];

              // Récupérer le champ name
              const nameValue = item.name || item.nom || item.contact || item.contact_name || item.director_name || '';
              const nameStr = String(nameValue).trim();

              // Si vide, chercher dans d'autres champs
              if (!nameStr || nameStr === '') {
                 // Chercher dans d'autres champs possibles
                 const alternativeName = item.contact_name || item.director_name || item.manager_name || 
                                       item.owner_name || item.proprietaire || item.fondateur || 
                                       item.ceo || item.pdg || item.president || '';
                 if (alternativeName) {
                    return String(alternativeName).trim();
                 }
                 return `Lead ${index + 1}`;
              }

              // Vérifier si c'est un titre (commence par un titre connu)
              const nameLower = nameStr.toLowerCase();
              const isTitle = titles.some(title => {
                 // Vérifier si le nom commence par le titre ou est exactement le titre
                 return nameLower === title || nameLower.startsWith(title + ' ') || 
                        nameLower.startsWith(title + ' de') || nameLower.startsWith(title + ' du');
              });

              // Vérifier si c'est un nom d'entreprise plutôt qu'un nom de personne
              const isCompanyName = companyIndicators.some(indicator => {
                 return nameLower.startsWith(indicator) || nameLower.includes(' ' + indicator);
              });

              // Si c'est un titre ou un nom d'entreprise, chercher ailleurs
              if (isTitle || isCompanyName) {
                 // Chercher dans d'autres champs possibles
                 const alternativeName = item.contact_name || item.director_name || item.manager_name || 
                                       item.owner_name || item.proprietaire || item.fondateur || 
                                       item.ceo || item.pdg || item.president || 
                                       item.first_name || item.prenom || item.nom_complet || '';
                 
                 if (alternativeName) {
                    const altNameStr = String(alternativeName).trim();
                    // Vérifier que l'alternative n'est pas aussi un titre
                    const altNameLower = altNameStr.toLowerCase();
                    const altIsTitle = titles.some(title => altNameLower === title || altNameLower.startsWith(title + ' '));
                    if (!altIsTitle && altNameStr.length > 2) {
                       return altNameStr;
                    }
                 }

                 // Si on a un email, essayer d'extraire un nom depuis l'email
                 const email = item.email || item.mail || '';
                 if (email && typeof email === 'string' && email.includes('@')) {
                    const emailParts = email.split('@')[0];
                    // Si l'email contient un point, c'est probablement prénom.nom
                    if (emailParts.includes('.')) {
                       const nameFromEmail = emailParts.split('.').map((part: string) => 
                          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                       ).join(' ');
                       if (nameFromEmail.length > 3 && !titles.some(t => nameFromEmail.toLowerCase().includes(t))) {
                          return nameFromEmail;
                       }
                    }
                 }

                 // Si aucun nom alternatif trouvé, retourner le titre avec le nom de l'entreprise si disponible
                 if (isTitle) {
                    const company = item.company || item.company_name || item.entreprise || item.societe || '';
                    if (company && company !== 'Inconnu') {
                       return `${nameStr} - ${company}`;
                    }
                 }
              }

              // Si c'est un nom valide (pas un titre, pas une entreprise), le retourner tel quel
              return nameStr;
           };

           // Fonction pour nettoyer le nom si il ressemble à "Responsable {nom de la société}"
           const cleanName = (nameValue: any, companyValue: any): string => {
              const nameStr = String(nameValue || '').trim();
              if (!nameStr) return '';
              
              const companyStr = String(companyValue || '').trim();
              
              // Pattern: "Responsable {nom société}" ou variations
              const patterns = [
                 /^responsable\s+/i,
                 /^responsable\s+de\s+/i,
                 /^responsable\s+du\s+/i,
                 /^responsable\s+des\s+/i,
                 /^responsable\s+de\s+la\s+/i,
              ];
              
              // Si le nom commence par "Responsable"
              for (const pattern of patterns) {
                 if (pattern.test(nameStr)) {
                    const cleanedName = nameStr.replace(pattern, '').trim();
                    
                    // Si après nettoyage, ça correspond exactement au nom de la société, retourner vide
                    if (companyStr && cleanedName.toLowerCase() === companyStr.toLowerCase()) {
                       return '';
                    }
                    
                    // Si le nom nettoyé contient le nom de la société (gère les cas comme "Responsable Gradignan Serrurerie")
                    if (companyStr && cleanedName.toLowerCase().includes(companyStr.toLowerCase())) {
                       // Si c'est une correspondance significative (plus de 3 caractères), retourner vide
                       if (companyStr.length > 3) {
                          return '';
                       }
                    }
                    
                    // Si ça ne correspond pas au nom de la société, retourner le nom nettoyé (peut être un vrai nom de personne)
                    // Mais seulement si ça ne ressemble pas trop à un nom de société
                    const looksLikeCompany = /^(maison|boutique|société|entreprise|sarl|sa|sas|eurl|auto|le|la|les|du|de)\s+/i.test(cleanedName);
                    if (!looksLikeCompany && cleanedName) {
                       return cleanedName;
                    }
                    
                    // Si ça ressemble à une société, retourner vide
                    return '';
                 }
              }
              
              // Si le nom contient exactement "Responsable" suivi du nom de la société
              if (companyStr && companyStr.length > 3) {
                 const exactPattern = new RegExp(`^responsable\\s+${companyStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
                 if (exactPattern.test(nameStr)) {
                    return '';
                 }
                 
                 // Pattern plus flexible: "Responsable" suivi de mots qui incluent le nom de la société
                 const flexiblePattern = new RegExp(`^responsable\\s+.+${companyStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                 if (flexiblePattern.test(nameStr)) {
                    return '';
                 }
              }
              
              return nameStr;
           };

           let importedCount = 0;
           let errorCount = 0;

           // Importer chaque lead
           for (let index = 0; index < leadsArray.length; index++) {
              const item = leadsArray[index];
              try {
                 // Récupérer le nom brut
                 const rawName = item.name || item.nom || item.contact || item.contact_name || '';
                 const companyValue = item.company || item.company_name || item.entreprise || item.societe || 'Inconnu';
                 
                 // Nettoyer le nom
                 const cleanedName = cleanName(rawName, companyValue);
                 
                 // Normaliser les données du JSON vers le format Lead
                 const newLead: EnrichedLead = {
                    id: generateUniqueId(),
                    name: cleanedName,
                    company: companyValue,
                    // Utiliser la valeur du JSON si elle existe, sinon 0
                    value: typeof item.value === 'number' ? item.value : (parseFloat(String(item.value || 0)) || 0),
                    stage: (item.stage || item.etape || 'Nouveau') as Lead['stage'],
                    lifecycleStage: (item.lifecycleStage || item.lifecycle_stage || item.stage_lifecycle || 'Lead') as LifecycleStage,
                    lastContact: item.lastContact || item.last_contact || item.dernier_contact || 'Jamais',
                    probability: typeof item.probability === 'number' ? item.probability : (parseInt(String(item.probability || item.probabilite || 10)) || 10),
                    email: normalizeValue(item.email || item.mail) || '',
                    phone: normalizeValue(item.phone || item.telephone || item.tel) || '',
                    source: normalizeSource(item.source || item.source_lead),
                    // Champs typologie
                    family: normalizeFamily(item.family),
                    temperature: normalizeTemperature(item.temperature),
                    // Champs enrichis
                    industry: normalizeValue(item.industry) || undefined,
                    website: normalizeValue(item.website) || undefined,
                    address: normalizeValue(item.address) || undefined,
                    linkedin: normalizeValue(item.linkedin) || undefined,
                    description: normalizeValue(item.description) || undefined,
                    // Autres champs possibles
                    employees: normalizeValue(item.employees || item.company_size) || undefined,
                    company_size: normalizeValue(item.company_size) || undefined,
                    client_type: normalizeValue(item.client_type) || undefined,
                    digital_maturity: normalizeValue(item.digital_maturity) || undefined,
                    triggerEvent: normalizeValue(item.triggerEvent || item.trigger_event) || undefined,
                    ceo: normalizeValue(item.ceo) || undefined,
                    techStack: Array.isArray(item.techStack) ? item.techStack : (item.tech_stack ? [item.tech_stack] : undefined),
                    google_rating: normalizeValue(item.google_rating || item.googleRating) || undefined,
                    google_reviews_count: normalizeValue(item.google_reviews_count || item.googleReviewsCount) || undefined,
                    creation_year: normalizeValue(item.creation_year || item.creationYear) || undefined,
                    // Gérer les réseaux sociaux
                    social_networks: item.social_networks || item.socialNetworks || (item.linkedin ? { linkedin: item.linkedin } : undefined),
                    // Gérer les sources
                    reliability: item.reliability || (item.sources && Array.isArray(item.sources) ? { sources: item.sources } : undefined)
                 };

                 addLead(newLead);
                 
                 // Affectation automatique du lead importé
                 try {
                    const assignedUserId = await assignLead(newLead);
                    if (assignedUserId) {
                       await updateLead({ ...newLead, assignedTo: assignedUserId });
                    }
                 } catch (assignError) {
                    console.error('Erreur lors de l\'affectation automatique:', assignError);
                 }
                 
                 importedCount++;
              } catch (err) {
                 console.error(`Erreur lors de l'import du lead ${index + 1}:`, err);
                 errorCount++;
              }
           }

           if (importedCount > 0) {
              showToast(`${importedCount} lead(s) importé(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`, 'success');
           } else {
              showToast('Aucun lead n\'a pu être importé. Vérifiez le format du JSON.', 'error');
           }
        } catch (error: any) {
           console.error('Erreur lors de l\'import JSON:', error);
           showToast(`Erreur lors de l'import: ${error.message || 'Format JSON invalide'}`, 'error');
        }
     };
     input.click();
  }

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      if (selectedLead.id) {
         await updateLead(selectedLead as Lead);
         showToast('Lead mis à jour', 'success');
      } else {
         // Vérifier les doublons avant d'ajouter
         const duplicateCheck = isDuplicate(
            {
               company: selectedLead.company || 'Inconnu',
               email: selectedLead.email,
               phone: selectedLead.phone,
               name: selectedLead.name,
            },
            leads.map(l => ({
               id: l.id,
               company: l.company,
               email: l.email,
               phone: l.phone,
               name: l.name,
            })),
            80
         );

         if (duplicateCheck.isDuplicate) {
            const matchInfo = duplicateCheck.matches[0];
            const matchedLead = leads.find(l => l.id === matchInfo.leadId);
            if (!window.confirm(
               `⚠️ Doublon potentiel détecté (${matchInfo.confidence}% de confiance)\n\n` +
               `Un lead similaire existe déjà :\n` +
               `• ${matchedLead?.name || 'Sans nom'} - ${matchedLead?.company}\n` +
               `• Correspondance : ${matchInfo.matchedFields.join(', ')}\n\n` +
               `Voulez-vous quand même créer ce lead ?`
            )) {
               return; // Annuler la création
            }
         }

         // Créer un nouveau lead avec tous les champs enrichis
         const newLead: EnrichedLead = {
            id: generateUniqueId(),
            name: selectedLead.name || 'Nouveau Lead',
            company: selectedLead.company || 'Inconnu',
            value: 0, // Toujours à zéro - sera incrémenté uniquement avec la validation de devis
            stage: selectedLead.stage || 'Nouveau',
            lifecycleStage: selectedLead.lifecycleStage || 'Lead',
            lastContact: 'À l\'instant',
            probability: selectedLead.probability || 10,
            email: selectedLead.email,
            phone: selectedLead.phone,
            source: selectedLead.source || 'Site Web',
            siret: (selectedLead as any)?.siret || undefined,
            // Inclure tous les champs enrichis
            description: selectedLead.description,
            industry: selectedLead.industry,
            website: selectedLead.website,
            address: selectedLead.address,
            linkedin: selectedLead.linkedin,
            company_size: selectedLead.company_size,
            client_type: selectedLead.client_type,
            digital_maturity: selectedLead.digital_maturity,
            triggerEvent: selectedLead.triggerEvent,
            ceo: selectedLead.ceo,
            employees: selectedLead.employees,
            techStack: selectedLead.techStack,
            google_rating: selectedLead.google_rating,
            google_reviews_count: selectedLead.google_reviews_count,
            creation_year: selectedLead.creation_year
         };
         await addLead(newLead);
         
         // Affectation automatique du lead
         try {
            const assignedUserId = await assignLead(newLead);
            if (assignedUserId) {
               await updateLead({ ...newLead, assignedTo: assignedUserId });
               showToast('Nouveau lead créé et assigné automatiquement', 'success');
            } else {
               showToast('Nouveau lead créé', 'success');
            }
         } catch (assignError) {
            console.error('Erreur lors de l\'affectation automatique:', assignError);
            showToast('Nouveau lead créé (affectation automatique échouée)', 'warning');
         }
      }
      setIsModalOpen(false);
      setSelectedLead(null);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde du lead:', error);
      showToast(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`, 'error');
    }
  };

  const handleEnrichLead = async () => {
     if (!selectedLead?.company) {
        showToast('Veuillez entrer un nom d\'entreprise', 'error');
        return;
     }

     // Vérifier si le lead est déjà certifié
     if (isLeadCertified(selectedLead)) {
        showToast('Ce lead est déjà certifié et ne nécessite pas d\'enrichissement', 'info');
        return;
     }

     setIsEnriching(true);
     showToast('Enrichissement avec données réelles...', 'info');

     try {
        // Utiliser enrichLeadWithData qui priorise SIRENE, puis IA si nécessaire
        const enrichedData = await enrichLeadWithData({
           company: selectedLead.company,
           address: selectedLead.address,
           siret: (selectedLead as any).siret,
           website: (selectedLead as any).website,
           industry: (selectedLead as any).industry,
           company_size: (selectedLead as any).company_size,
           description: (selectedLead as any).description,
           ceo: (selectedLead as any).ceo,
           techStack: (selectedLead as any).techStack
        });
        
        // Construire la description avec données disponibles
        let description = selectedLead.description || '';
        if (enrichedData.description && !description.includes(enrichedData.description)) {
           description = enrichedData.description;
        }
        if (enrichedData.swot_summary && enrichedData.source === 'ai') {
           description += `\n\n🤖 Analysis: ${enrichedData.swot_summary}`;
        }
        
        // Enrichissement avec données géographiques, métiers, catégories
        const enrichmentData = await enrichLeadData({
           company: selectedLead.company,
           address: enrichedData.adresse || selectedLead.address,
           description: enrichedData.description,
           industry: enrichedData.industry,
           company_size: enrichedData.company_size || (selectedLead as any).company_size,
           activite_principale: enrichedData.activite_principale,
           siret: enrichedData.siret
        });

        // Mettre à jour le lead avec toutes les données (priorité aux données SIRENE)
        const updatedLead = {
           ...selectedLead,
           description: description || undefined,
           industry: enrichedData.industry || (selectedLead as any).industry,
           employees: enrichedData.company_size || (selectedLead as any).employees,
           website: enrichedData.website || (selectedLead as any).website,
           address: enrichedData.adresse || selectedLead.address,
           source: selectedLead.source || 'Robot Prospection',
           techStack: enrichedData.tech_stack || (selectedLead as any).techStack,
           ceo: enrichedData.ceo || (selectedLead as any).ceo,
           siret: enrichedData.siret || (selectedLead as any).siret,
           siren: enrichedData.siren || (selectedLead as any).siren,
           // Données d'enrichissement
           business_category: enrichmentData.business_category,
           business_vertical: enrichmentData.business_vertical,
           geographic_data: enrichmentData.geographic_data,
        };

        setSelectedLead(updatedLead);

        // Sauvegarder l'enrichissement si le lead existe déjà
        if (selectedLead.id) {
           await saveLeadEnrichment(selectedLead.id, enrichmentData);
        }

        const sourceMessage = enrichedData.source === 'sirene' 
          ? 'Données SIRENE récupérées.' 
          : enrichedData.source === 'ai'
          ? 'Données enrichies (SIRENE + IA).'
          : 'Données enrichies.';
        showToast(sourceMessage, 'success');
     } catch (e: any) {
        console.error(e);
        const errorMessage = e?.message || 'Erreur inconnue';
        // Essayer de récupérer au moins les données SIRENE même si l'IA échoue
        try {
           const { enrichLeadWithSireneData } = await import('../../lib/ai-client');
           const sireneData = await enrichLeadWithSireneData(
              selectedLead.company, 
              selectedLead.address,
              (selectedLead as any).siret
           );
           if (Object.keys(sireneData).length > 0) {
              const updatedLead = {
                 ...selectedLead,
                 address: sireneData.adresse || selectedLead.address,
                 industry: sireneData.industry || (selectedLead as any).industry,
                 company_size: sireneData.company_size || (selectedLead as any).company_size,
                 siret: sireneData.siret || (selectedLead as any).siret,
                 siren: sireneData.siren || (selectedLead as any).siren
              };
              setSelectedLead(updatedLead);
              showToast('Données SIRENE récupérées (enrichissement IA échoué).', 'warning');
              return;
           }
        } catch (sireneError) {
           console.warn('Erreur même pour SIRENE:', sireneError);
        }
        
        if (errorMessage.includes('quota') || errorMessage.includes('Quota')) {
          showToast('Quota API dépassé. Les données SIRENE ont été utilisées si disponibles.', 'warning');
        } else if (errorMessage.includes('non configurée')) {
          showToast('Clé API non configurée. Utilisation des données SIRENE uniquement.', 'warning');
        } else {
          showToast(`Enrichissement partiel: ${errorMessage}`, 'warning');
        }
     } finally {
        setIsEnriching(false);
     }
  };

  const handleRunProspecting = async () => {
     if (!prospectingZone || !prospectingActivity) {
        showToast('Veuillez remplir la zone et l\'activité', 'error');
        return;
     }

     setIsProspecting(true);
     setProspectingStatus('Initialisation...');
     showToast('Recherche de prospects en cours...', 'info');

     // Créer une entrée d'historique
     const startTime = Date.now();
     let historyEntryId: string | null = null;
     let scrapingSessionId: string | null = null;
     
     try {
        const historyEntry = await createHistoryEntry({
           zone: prospectingZone,
           activity: prospectingActivity,
           status: 'running',
           leads_found: 0,
           leads_added: 0,
           sources_used: [],
        });
        historyEntryId = historyEntry?.id || null;
     } catch (error) {
        console.error('Erreur création historique:', error);
     }

     // Créer une session de scraping pour le tracking
     try {
        const { recordScrapingSession } = await import('../../lib/services/scrapingPerformanceService');
        const session = await recordScrapingSession({
           startedAt: new Date().toISOString(),
           source: 'google_maps', // Source principale (peut être amélioré pour détecter automatiquement)
           query: `${prospectingZone} ${prospectingActivity}`,
           zone: prospectingZone,
           activity: prospectingActivity,
           status: 'processing',
           leadsFound: 0,
           leadsAdded: 0,
           errors: [],
        });
        scrapingSessionId = session.id || null;
     } catch (error) {
        console.error('Erreur création session scraping:', error);
     }

     try {
        const data = await runProspectingWithAI(
          prospectingZone,
          prospectingActivity,
          (step) => {
            setProspectingStatus(step);
          },
          { includeSocial: true, includeNews: true }
        );

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Aucun prospect trouvé');
        }

         // Calculer les scores de qualité pour chaque lead
         const { calculateLeadQualityScore } = await import('../../lib/utils/leadValidation');
         
         const newLeads = await Promise.all(data.map(async (l: any, i: number) => {
            const lead = {
               id: `scraped-${generateUniqueId()}`,
               name: l.name || 'Non disponible',
               company: l.company || 'Entreprise non identifiée',
               email: l.email || '',
               phone: l.phone || '',
               stage: 'Nouveau',
               lifecycleStage: 'Lead',
               lastContact: 'Jamais',
               probability: 20,
               source: l.source || 'Robot Prospection',
               description: `${l.trigger_event ? `Trigger: ${l.trigger_event}\n` : ''}${l.description || 'Prospect identifié'}`,
               industry: prospectingActivity,
               triggerEvent: l.trigger_event,
               website: l.website,
               address: l.address,
               linkedin: l.linkedin || l.ownerLinkedIn || '',
               company_size: l.company_size,
               client_type: l.client_type,
               digital_maturity: l.digital_maturity,
               social_networks: l.social_networks || {},
               sources: l.sources || l.data_sources || []
            };
            
            // Calculer le score de qualité
            const qualityScore = calculateLeadQualityScore(lead);
            return { ...lead, qualityScore };
         }));

         // Filtrer les leads déjà enregistrés (comparaison par email, téléphone ou nom d'entreprise)
         const existingCompanies = new Set(
           leads.map(l => l.company?.toLowerCase().trim()).filter(Boolean)
         );
         const existingEmails = new Set(
           leads.map(l => l.email?.toLowerCase().trim()).filter(Boolean)
         );
         const existingPhones = new Set(
           leads.map(l => l.phone?.replace(/\s/g, '')).filter(Boolean)
         );

         const filteredLeads = newLeads.filter(lead => {
           const companyMatch = lead.company?.toLowerCase().trim() && existingCompanies.has(lead.company.toLowerCase().trim());
           const emailMatch = lead.email?.toLowerCase().trim() && existingEmails.has(lead.email.toLowerCase().trim());
           const phoneMatch = lead.phone && existingPhones.has(lead.phone.replace(/\s/g, ''));
           return !companyMatch && !emailMatch && !phoneMatch;
         });

         const excludedCount = newLeads.length - filteredLeads.length;
         if (excludedCount > 0) {
           showToast(`${excludedCount} prospect(s) déjà enregistré(s) exclu(s)`, 'info');
         }

        setGeneratedLeads(filteredLeads);
        setHasSearched(true);
        
        // Stocker les scores de qualité dans un state séparé pour l'affichage
        const scores: Record<string, any> = {};
        filteredLeads.forEach((lead: any) => {
           if (lead.qualityScore) {
              scores[lead.id] = lead.qualityScore;
           }
        });
        setLeadQualityScores(scores);
        
        const uniqueSources = Array.from(new Set(filteredLeads.map((l: any) => l.source)));
        showToast(`${filteredLeads.length} leads qualifiés identifiés via ${uniqueSources.join(', ')}`, 'success');
        setProspectingStatus('');

        // Mettre à jour l'historique en cas de succès
        if (historyEntryId) {
           const executionTime = Math.round((Date.now() - startTime) / 1000);
           const sourcesUsed = Array.from(new Set(filteredLeads.flatMap((l: any) => l.sources || l.data_sources || [])));
           
           try {
              await updateHistoryEntry(historyEntryId, {
                 status: 'completed',
                 leads_found: filteredLeads.length,
                 leads_added: 0, // Sera mis à jour lors de l'ajout
                 sources_used: sourcesUsed.slice(0, 10), // Limiter à 10 sources
                 execution_time_seconds: executionTime,
                 completed_at: new Date().toISOString(),
              });
           } catch (error) {
              console.error('Erreur mise à jour historique:', error);
           }
        }

        // Sauvegarder automatiquement la recherche comme template si fructueuse
        try {
           const { autoSaveSearchAsTemplate } = await import('../../lib/services/prospectingSearchTemplatesService');
           await autoSaveSearchAsTemplate(
              {
                 zone: prospectingZone,
                 activity: prospectingActivity,
              },
              {
                 leadsFound: filteredLeads.length,
                 leadsAdded: 0, // Sera mis à jour lors de l'ajout
              },
              {
                 minLeadsFound: 10, // Sauvegarder automatiquement si >= 10 leads trouvés
              }
           );
        } catch (error) {
           // Ne pas faire échouer la recherche si la sauvegarde automatique échoue
           console.warn('Erreur sauvegarde automatique template:', error);
        }

        // Mettre à jour la session de scraping en cas de succès
        if (scrapingSessionId) {
           try {
              const { updateScrapingSession } = await import('../../lib/services/scrapingPerformanceService');
              const { analyzeScrapingSessionAndAlert } = await import('../../lib/services/scrapingAlertService');
              const executionTime = Math.round((Date.now() - startTime) / 1000);
              const sourcesUsed = Array.from(new Set(filteredLeads.flatMap((l: any) => l.sources || l.data_sources || [])));
              
              await updateScrapingSession(scrapingSessionId, {
                 status: 'completed',
                 completedAt: new Date().toISOString(),
                 leadsFound: filteredLeads.length,
                 leadsAdded: 0, // Sera mis à jour lors de l'ajout
                 errors: [],
                 metadata: {
                    sourcesUsed: sourcesUsed.slice(0, 10),
                    executionTimeSeconds: executionTime,
                    uniqueSources: uniqueSources,
                 },
              });

              // Analyser la session et générer des alertes si nécessaire
              // Récupérer la session mise à jour pour l'analyse
              const { data: updatedSession } = await supabase
                 .from('scraping_sessions')
                 .select('*')
                 .eq('id', scrapingSessionId)
                 .single();

              if (updatedSession) {
                 const session = {
                    id: updatedSession.id,
                    userId: updatedSession.user_id,
                    startedAt: updatedSession.started_at,
                    completedAt: updatedSession.completed_at,
                    source: updatedSession.source,
                    query: updatedSession.query,
                    zone: updatedSession.zone,
                    activity: updatedSession.activity,
                    status: updatedSession.status,
                    leadsFound: updatedSession.leads_found,
                    leadsAdded: updatedSession.leads_added,
                    errors: updatedSession.errors || [],
                    metadata: updatedSession.metadata || {},
                    createdAt: updatedSession.created_at,
                 };
                 await analyzeScrapingSessionAndAlert(session);
              }
           } catch (error) {
              console.error('Erreur mise à jour session scraping:', error);
           }
        }
     } catch (e: any) {
        console.error('Erreur prospection:', e);
        const errorMessage = e?.message || 'Erreur inconnue';

        // Mettre à jour la session de scraping en cas d'échec
        if (scrapingSessionId) {
           try {
              const { updateScrapingSession } = await import('../../lib/services/scrapingPerformanceService');
              const { analyzeScrapingSessionAndAlert } = await import('../../lib/services/scrapingAlertService');
              
              await updateScrapingSession(scrapingSessionId, {
                 status: 'failed',
                 completedAt: new Date().toISOString(),
                 leadsFound: 0,
                 leadsAdded: 0,
                 errors: [errorMessage],
              });

              // Analyser la session et générer des alertes
              // Récupérer la session mise à jour pour l'analyse
              const { data: updatedSession } = await supabase
                 .from('scraping_sessions')
                 .select('*')
                 .eq('id', scrapingSessionId)
                 .single();

              if (updatedSession) {
                 const session = {
                    id: updatedSession.id,
                    userId: updatedSession.user_id,
                    startedAt: updatedSession.started_at,
                    completedAt: updatedSession.completed_at,
                    source: updatedSession.source,
                    query: updatedSession.query,
                    zone: updatedSession.zone,
                    activity: updatedSession.activity,
                    status: updatedSession.status,
                    leadsFound: updatedSession.leads_found,
                    leadsAdded: updatedSession.leads_added,
                    errors: updatedSession.errors || [],
                    metadata: updatedSession.metadata || {},
                    createdAt: updatedSession.created_at,
                 };
                 await analyzeScrapingSessionAndAlert(session);
              }
           } catch (error) {
              console.error('Erreur mise à jour session scraping (échec):', error);
           }
        }
        
        // Extraire le message principal (première ligne)
        const firstLine = errorMessage.split('\n')[0];
        
        // Si l'erreur indique que tous les services sont indisponibles
        if (errorMessage.includes('Tous les services IA sont indisponibles') || errorMessage.includes('indisponibles')) {
          // Afficher un message détaillé dans la console et un message court dans le toast
          console.error('Détails de l\'erreur:', errorMessage);
          showToast('Services IA indisponibles. Vérifiez la console pour plus de détails.', 'error');
          setProspectingStatus('Erreur: Services IA indisponibles');
        } else if (errorMessage.includes('Quota Gemini épuisé') || errorMessage.includes('quota Gemini')) {
          if (errorMessage.includes('Mistral non configurée') || errorMessage.includes('Mistral invalide')) {
            showToast('Quota Gemini épuisé. Configurez une clé Mistral dans les paramètres pour continuer.', 'error');
            setProspectingStatus('Quota Gemini épuisé - Clé Mistral requise');
          } else {
            showToast('Quota Gemini épuisé. Basculement vers Mistral...', 'info');
            setProspectingStatus('Basculement vers Mistral...');
          }
        } else if (errorMessage.includes('quota') || errorMessage.includes('Quota') || errorMessage.includes('429')) {
          showToast('Quota API dépassé. Attendez quelques minutes ou configurez une clé Mistral.', 'error');
          setProspectingStatus('Quota dépassé');
        } else if (errorMessage.includes('non configurée') || errorMessage.includes('invalide')) {
          if (errorMessage.includes('Mistral')) {
            showToast('Clé API Mistral invalide. Vérifiez-la dans les paramètres.', 'error');
          } else {
            showToast('Clé API non configurée. Configurez au moins une clé (Gemini ou Mistral) dans les paramètres.', 'error');
          }
          setProspectingStatus('Clé API requise');
        } else if (errorMessage.includes('Aucun prospect trouvé')) {
          showToast('Aucun prospect trouvé pour ces critères. Essayez avec une autre zone ou un autre secteur.', 'warning');
          setProspectingStatus('');
        } else {
          // Message d'erreur générique (tronqué pour le toast)
          const shortMessage = firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
          showToast(`Erreur: ${shortMessage}`, 'error');
          setProspectingStatus('Erreur lors de la prospection');
        }

        // Mettre à jour l'historique en cas d'erreur
        if (historyEntryId) {
           try {
              await updateHistoryEntry(historyEntryId, {
                 status: 'failed',
                 error_message: e?.message || 'Erreur inconnue',
                 completed_at: new Date().toISOString(),
              });
           } catch (error) {
              console.error('Erreur mise à jour historique (échec):', error);
           }
        }
     } finally {
        setIsProspecting(false);
     }
  };

  const handleAddGeneratedLead = async (lead: EnrichedLead) => {
     try {
        // Enrichir avec données géographiques, métiers, catégories
        const enrichmentData = await enrichLeadData(lead);
        
        // Calculer le score de qualité avant d'ajouter
        const { calculateLeadQualityScore, saveLeadQualityScore } = await import('../../lib/utils/leadValidation');
        const qualityScore = calculateLeadQualityScore(lead);
        
        // Ajouter le lead avec données enrichies
        const enrichedLead = {
           ...lead,
           business_category: enrichmentData.business_category,
           business_vertical: enrichmentData.business_vertical,
           geographic_data: enrichmentData.geographic_data,
        };
        
        const addedLead = await addLead(enrichedLead);
        
        // Enrichissement automatique complet si configuré (IA + APIs tierces)
        if (addedLead?.id) {
           try {
              const { getScrapingConfig } = await import('../../lib/services/scrapingConfigService');
              const config = await getScrapingConfig();
              
              if (config.advanced?.enableAutoEnrichment) {
                 const { enrichLeadAutomated } = await import('../../lib/services/enrichmentActions');
                 try {
                    await enrichLeadAutomated({
                       leadId: addedLead.id,
                       enrichmentTypes: ['ai', 'clearbit', 'fullcontact', 'hunter', 'web_scraping'],
                       forceRefresh: false,
                       recordActivity: true,
                    });
                    console.log(`Enrichissement automatique effectué pour lead ${addedLead.id}`);
                 } catch (enrichError) {
                    console.error('Erreur enrichissement automatique:', enrichError);
                    // Ne pas bloquer le processus
                 }
              }
           } catch (configError) {
              console.error('Erreur récupération config scraping:', configError);
           }

           // Création automatique de tâche de suivi si configuré
           try {
              const { getScrapingConfig } = await import('../../lib/services/scrapingConfigService');
              const { createAutomatedTask } = await import('../../lib/services/workflowActions');
              const { assignLead } = await import('../../lib/supabase/hooks/useLeadAssignment');
              const config = await getScrapingConfig();
              
              if (config.advanced?.enableAutoAssignment) {
                 const { useLeadAssignment } = await import('../../lib/supabase/hooks/useLeadAssignment');
                 const assignedUserId = enrichedLead.assignedTo || await assignLead(enrichedLead).catch(() => null);
                 
                 if (assignedUserId) {
                    try {
                       await createAutomatedTask({
                          title: `Contacter nouveau lead : ${enrichedLead.name || enrichedLead.company} - ${enrichedLead.company}`,
                          description: `Lead scrapé depuis la prospection.\nScore qualité: ${qualityScore.overallScore}/100\nSource: ${enrichedLead.source || 'Robot Prospection'}`,
                          assigneeIds: [assignedUserId],
                          priority: qualityScore.overallScore >= 70 ? 'high' : qualityScore.overallScore >= 50 ? 'medium' : 'low',
                          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // J+2
                          tags: ['Nouveau Lead', 'Scraping'],
                          metadata: {
                             leadId: addedLead.id,
                             source: 'scraping',
                          },
                       });
                       console.log(`Tâche de suivi créée pour lead ${addedLead.id}`);
                    } catch (taskError) {
                       console.error('Erreur création tâche automatique:', taskError);
                    }
                 }
              }
           } catch (configError) {
              console.error('Erreur récupération config scraping:', configError);
           }
        }
        
        // Sauvegarder le score de qualité et l'enrichissement
        if (addedLead?.id) {
           try {
              await saveLeadQualityScore(addedLead.id, qualityScore);
              await saveLeadEnrichment(addedLead.id, enrichmentData);
           } catch (error) {
              console.error('Erreur sauvegarde score qualité/enrichissement:', error);
              // Ne pas bloquer l'ajout si le score échoue
           }
        }
        
        setGeneratedLeads(prev => prev.filter(l => l.id !== lead.id));
        showToast(`Lead enregistré (Score: ${qualityScore.overallScore}/100). Pipeline activé.`, 'success');
     } catch (error: any) {
        console.error('Erreur ajout lead:', error);
        showToast(`Erreur lors de l'ajout: ${error.message || 'Erreur inconnue'}`, 'error');
     }
  };

  const handleAddAllGeneratedLeads = async () => {
     if (generatedLeads.length === 0) {
        showToast('Aucun prospect à ajouter', 'warning');
        return;
     }

     try {
        const { calculateLeadQualityScore, saveLeadQualityScore } = await import('../../lib/utils/leadValidation');
        let addedCount = 0;
        let totalScore = 0;

        for (const lead of generatedLeads) {
           try {
              // Enrichir avec données géographiques, métiers, catégories
              const enrichmentData = await enrichLeadData(lead);
              
              // Calculer le score de qualité
              const qualityScore = calculateLeadQualityScore(lead);
              
              // Ajouter le lead avec données enrichies
              const enrichedLead = {
                 ...lead,
                 business_category: enrichmentData.business_category,
                 business_vertical: enrichmentData.business_vertical,
                 geographic_data: enrichmentData.geographic_data,
              };
              
              const addedLead = await addLead(enrichedLead);
              
              // Enrichissement automatique complet si configuré (IA + APIs tierces)
              if (addedLead?.id) {
                 try {
                    const { getScrapingConfig } = await import('../../lib/services/scrapingConfigService');
                    const config = await getScrapingConfig();
                    
                    if (config.advanced?.enableAutoEnrichment) {
                       const { enrichLeadAutomated } = await import('../../lib/services/enrichmentActions');
                       try {
                          await enrichLeadAutomated({
                             leadId: addedLead.id,
                             enrichmentTypes: ['ai', 'clearbit', 'fullcontact', 'hunter', 'web_scraping'],
                             forceRefresh: false,
                             recordActivity: true,
                          });
                          console.log(`Enrichissement automatique effectué pour lead ${addedLead.id}`);
                       } catch (enrichError) {
                          console.error('Erreur enrichissement automatique:', enrichError);
                          // Ne pas bloquer le processus
                       }
                    }
                 } catch (configError) {
                    console.error('Erreur récupération config scraping:', configError);
                 }
              }

              // Affectation automatique du lead
              if (addedLead?.id) {
                 try {
                    const assignedUserId = await assignLead(enrichedLead);
                    if (assignedUserId) {
                       await updateLead({ ...enrichedLead, assignedTo: assignedUserId, id: addedLead.id });
                    }
                 } catch (assignError) {
                    console.error('Erreur lors de l\'affectation automatique:', assignError);
                 }
                 
                 // Sauvegarder le score et l'enrichissement
                 try {
                    await saveLeadQualityScore(addedLead.id, qualityScore);
                    await saveLeadEnrichment(addedLead.id, enrichmentData);
                 } catch (error) {
                    console.error('Erreur sauvegarde score qualité/enrichissement:', error);
                 }
              }
              
              addedCount++;
              totalScore += qualityScore.overallScore;
           } catch (error) {
              console.error('Erreur ajout lead:', error);
           }
        }

        const avgScore = addedCount > 0 ? Math.round(totalScore / addedCount) : 0;
        setGeneratedLeads([]);
        showToast(`${addedCount} lead(s) ajouté(s) au CRM (Score moyen: ${avgScore}/100)`, 'success');
     } catch (error: any) {
        console.error('Erreur ajout multiple:', error);
        showToast(`Erreur lors de l'ajout: ${error.message || 'Erreur inconnue'}`, 'error');
     }
  };

  const handleAnalyzeLifecycle = async () => {
     if (!selectedLead?.lifecycleStage) return;
     setIsAnalyzingLifecycle(true);
     setLifecycleAdvice(null);

     try {
        const stage = selectedLead.lifecycleStage;
        
        const prompt = `You are a CRM Lifecycle Expert. Provide a specific, actionable next step to move this lead to the next stage.

Client: ${selectedLead.company}
Stage: ${stage}
Industry: ${selectedLead.industry}

Provide a brief, actionable recommendation (2-3 sentences).`;

        const response = await callGeminiAPI(prompt, {
          model: 'gemini-3-pro-preview',
          retryConfig: { maxRetries: 2 }
        });

        if (response) {
           setLifecycleAdvice(response);
        }
     } catch (e: any) {
        console.error(e);
        const errorMessage = e?.message || 'Erreur inconnue';
        if (errorMessage.includes('quota') || errorMessage.includes('Quota')) {
          setLifecycleAdvice("Quota API dépassé. Veuillez réessayer dans quelques minutes.");
        } else {
          setLifecycleAdvice("Impossible d'analyser le cycle de vie.");
        }
     } finally {
        setIsAnalyzingLifecycle(false);
     }
  };

  const getSourceIcon = (source?: string) => {
    if (!source) return <User size={14} className="text-slate-400" />;
    const s = source.toLowerCase();
    
    if (s.includes('linkedin')) return <Linkedin size={14} className="text-blue-700" />;
    if (s.includes('google') && s.includes('maps')) return <MapPin size={14} className="text-red-500" />;
    if (s.includes('google') && s.includes('business')) return <MapPin size={14} className="text-red-500" />;
    if (s.includes('sirene') || s.includes('companies house') || s.includes('registre')) return <Database size={14} className="text-orange-600" />;
    if (s.includes('website') || s.includes('site') || s.includes('web') || s.includes('sites web')) return <Globe size={14} className="text-purple-600" />;
    if (s.includes('pages jaunes') || s.includes('annuaire')) return <User size={14} className="text-pink-600" />;
    if (s.includes('chambre') || s.includes('métier') || s.includes('commerce')) return <Search size={14} className="text-yellow-600" />;
    if (s.includes('facebook') || s.includes('instagram') || s.includes('social') || s.includes('réseau')) return <Globe size={14} className="text-green-600" />;
    if (s.includes('robot') || s.includes('prospection')) return <Bot size={14} className="text-indigo-500" />;
    
    return <User size={14} className="text-slate-400" />;
  };

  // ... (Visual helpers: getStageVariant, etc. remain the same)
  const getStageVariant = (stage?: string) => {
     if (!stage) return 'default';
     if (['Gagné', 'Client', 'Client Actif', 'Ambassadeur'].includes(stage)) return 'success';
     if (['Perdu', 'Inactif', 'Churn', 'Rejeté'].includes(stage)) return 'danger';
     if (['Négociation', 'Proposition', 'Opportunité', 'SQL', 'Offre'].includes(stage)) return 'warning';
     if (['MQL', 'Lead', 'Contact', 'Screening'].includes(stage)) return 'info';
     return 'default';
  };

  return (
    <PageLayout
      header={{
        icon: Database,
        iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        title: "Base Contacts & Leads",
        description: "Gestion centralisée des opportunités et clients.",
        leftActions: [
          ...(viewMode === 'prospecting' ? [
            {
              icon: Calendar,
              onClick: () => setIsSchedulerOpen(true),
              variant: 'outline' as const
            },
            {
              icon: BarChart3,
              onClick: () => setShowAnalytics(!showAnalytics),
              variant: 'outline' as const
            },
            {
              icon: Clock,
              onClick: () => setShowHistory(!showHistory),
              variant: 'outline' as const
            },
            {
              icon: Settings,
              onClick: () => setIsScoringConfigOpen(true),
              variant: 'outline' as const
            },
            {
              icon: AlertTriangle,
              onClick: () => setIsDuplicateDetectionOpen(true),
              variant: 'outline' as const
            }
          ] : [
            {
              label: "Détecter doublons",
              icon: AlertTriangle,
              onClick: () => setIsDuplicateDetectionOpen(true),
              variant: 'outline' as const
            }
          ]),
          {
            icon: RefreshCcw,
            onClick: () => setIsConnectModalOpen(true),
            variant: 'outline' as const
          }
        ],
        viewToggle: {
          value: viewMode,
          options: [
            { value: 'table', icon: List, title: 'Liste' },
            { value: 'lifecycle', icon: BrainCircuit, title: 'Cycle de vie' },
            { value: 'pipeline', icon: LayoutGrid, title: 'Pipeline ventes' },
            { value: 'map', icon: Map, title: 'Carte' },
            { value: 'prospecting', icon: Bot, title: 'Prospection' },
            { value: 'appointments', icon: Calendar, title: 'Rendez-vous' }
          ],
          onChange: setViewMode
        },
        rightActions: [
          {
            label: "Importer",
            icon: Upload,
            onClick: handleImportJSON,
            variant: 'outline' as const,
            title: "Importer des leads depuis un fichier JSON"
          },
          {
            label: "Ajouter",
            icon: Plus,
            onClick: handleOpenCreate,
            variant: 'primary' as const
          }
        ]
      }}
    >

      {viewMode === 'table' && (
         <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Table Code ... (No major changes here) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center bg-slate-50/50 dark:bg-slate-700/20">
               <div className="w-64 flex-shrink-0">
                  <SearchBar 
                     placeholder="Rechercher..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <div className="flex gap-3 flex-1 min-w-0 overflow-x-auto">
                  <Dropdown containerClassName="gap-0" className="py-2 text-xs" value={filterStage} onChange={(value) => setFilterStage(value)} options={[{value:'Tous', label:'Tous'}, ...Object.values(lifecycleStagesMap).flat().map(s=>({value:s, label:s}))]} />
                  <Dropdown 
                     containerClassName="gap-0" 
                     className="py-2 text-xs" 
                     value={filterFamily} 
                     onChange={(value) => setFilterFamily(value as LeadFamily | 'Tous')} 
                     options={[
                        {value:'Tous', label:'Famille'},
                        ...LEAD_FAMILIES.map(f => ({value: f.value, label: f.label}))
                     ]} 
                  />
                  <Dropdown 
                     containerClassName="gap-0" 
                     className="py-2 text-xs" 
                     value={filterTemperature} 
                     onChange={(value) => setFilterTemperature(value as LeadTemperature | 'Tous')} 
                     options={[
                        {value:'Tous', label:'Température'},
                        ...LEAD_TEMPERATURES.map(t => ({value: t.value, label: t.label}))
                     ]} 
                  />
                  <Dropdown 
                     containerClassName="gap-0" 
                     className="py-2 text-xs" 
                     value={filterCertified} 
                     onChange={(value) => setFilterCertified(value as 'Tous' | 'Certifiés' | 'Non certifiés')} 
                     options={[
                        {value:'Tous', label:'Leads'},
                        {value:'Certifiés', label:'Certifiés uniquement'},
                        {value:'Non certifiés', label:'Non certifiés'}
                     ]} 
                  />
                  <Dropdown
                     containerClassName="gap-0"
                     className="py-2 text-xs"
                     value={filterZone}
                     onChange={(value) => setFilterZone(value)}
                     options={[
                        {value: 'Tous', label: 'Zone'},
                        ...zones.filter(z => z.isActive).map(zone => ({
                           value: zone.id,
                           label: zone.name
                        }))
                     ]}
                  />
               </div>
               <SavedFiltersManager
                  resourceType="leads"
                  currentFilters={currentFilters}
                  onLoadFilter={handleLoadFilter}
               />
                  <Button
                     size="sm"
                     variant="primary"
                     icon={Sparkles}
                     onClick={async () => {
                        const leadsToProcess = filteredLeads.length > 0 ? filteredLeads : leads;
                        if (leadsToProcess.length === 0) {
                           showToast('Aucun lead à enrichir', 'warning');
                           return;
                        }
                        
                        // Ouvrir la modale de progression
                        setIsOptimizationModalOpen(true);
                        setOptimizationProgress({
                           current: 0,
                           total: leadsToProcess.length,
                           currentLead: '',
                           status: 'Initialisation...',
                           results: []
                        });
                        setIsValidatingLeads(true);
                        
                        try {
                           let correctedCount = 0;
                           let enrichedCount = 0;
                           
                           // Traiter chaque lead individuellement
                           for (let i = 0; i < leadsToProcess.length; i++) {
                              const currentLead = leadsToProcess[i];
                              const leadName = currentLead.company || currentLead.name || 'Lead sans nom';
                              
                              // Vérifier si le lead est déjà certifié - si oui, le sauter
                              if (isLeadCertified(currentLead)) {
                                 setOptimizationProgress(prev => ({
                                    ...prev,
                                    current: i + 1,
                                    currentLead: leadName,
                                    status: 'Lead certifié, ignoré',
                                    results: [...prev.results, {
                                       leadId: currentLead.id,
                                       company: leadName,
                                       status: 'success',
                                       message: 'Lead certifié - ignoré par l\'enrichissement'
                                    }]
                                 }));
                                 continue; // Passer au lead suivant
                              }
                              
                              setOptimizationProgress(prev => ({
                                 ...prev,
                                 current: i + 1,
                                 currentLead: leadName,
                                 status: 'Vérification SIREN obligatoire...'
                              }));
                              
                              // 1. Vérification OBLIGATOIRE via SIRENE et validation des données
                              let validationResult;
                              let sireneValidated = false;
                              let foundSiret: string | undefined = (currentLead as any).siret;
                              
                              try {
                                 // Première tentative : recherche avec les données existantes
                                 validationResult = await validateExistingLeads(
                                    [{
                                       id: currentLead.id,
                                       company: currentLead.company,
                                       address: (currentLead as any).address,
                                       email: currentLead.email,
                                       phone: currentLead.phone,
                                       website: (currentLead as any).website,
                                       siret: foundSiret
                                    }],
                                    (step) => {
                                       setOptimizationProgress(prev => ({
                                          ...prev,
                                          status: step
                                       }));
                                    }
                                 );
                                 
                                 const result = validationResult[0];
                                 
                                 // Si pas de SIRET trouvé et entreprise non validée, chercher via SIRENE
                                 if (!result.validatedBySirene && !foundSiret) {
                                    setOptimizationProgress(prev => ({
                                       ...prev,
                                       status: 'Recherche SIRET via SIRENE...'
                                    }));
                                    
                                    // Rechercher via l'API SIRENE pour trouver le SIRET
                                    const { searchCompanyOnSocieteCom } = await import('../../lib/ai-client');
                                    
                                    const societeComData = await searchCompanyOnSocieteCom(
                                       currentLead.company,
                                       (currentLead as any).address
                                    );
                                    
                                    if (societeComData?.siret) {
                                       foundSiret = societeComData.siret;
                                       
                                       setOptimizationProgress(prev => ({
                                          ...prev,
                                          status: `SIRET trouvé (${foundSiret}), relance validation SIREN...`
                                       }));
                                       
                                       // Relancer la validation avec le SIRET trouvé
                                       validationResult = await validateExistingLeads(
                                          [{
                                             id: currentLead.id,
                                             company: currentLead.company,
                                             address: (currentLead as any).address,
                                             email: currentLead.email,
                                             phone: currentLead.phone,
                                             website: (currentLead as any).website,
                                             siret: foundSiret
                                          }],
                                          (step) => {
                                             setOptimizationProgress(prev => ({
                                                ...prev,
                                                status: step
                                             }));
                                          }
                                       );
                                    }
                                 }
                                 
                                 const finalResult = validationResult[0];
                                 
                                 // Vérification obligatoire : l'entreprise doit être trouvée dans SIREN
                                 if (!finalResult.validatedBySirene) {
                                    setOptimizationProgress(prev => ({
                                       ...prev,
                                       results: [...prev.results, {
                                          leadId: currentLead.id,
                                          company: leadName,
                                          status: 'warning',
                                          message: `Entreprise non trouvée dans SIREN${finalResult.sireneMatchScore ? ` (score: ${finalResult.sireneMatchScore}%)` : ''}`
                                       }]
                                    }));
                                    
                                    // Délai avant le lead suivant
                                    if (i < leadsToProcess.length - 1) {
                                       await new Promise(resolve => setTimeout(resolve, 15000)); // 15 secondes pour respecter les quotas
                                    }
                                    continue; // Passer au lead suivant
                                 }
                                 
                                 sireneValidated = true;
                                 
                                 setOptimizationProgress(prev => ({
                                    ...prev,
                                    status: 'Comparaison avec données SIREN...'
                                 }));
                                 
                                 // Comparer et corriger avec les données SIREN
                                 const updates: any = {};
                                 let hasUpdates = false;
                                 
                                 // Appliquer TOUTES les corrections SIRENE
                                 if (finalResult.corrections) {
                                    Object.entries(finalResult.corrections).forEach(([key, value]: [string, any]) => {
                                       if (value.new) {
                                          updates[key] = value.new;
                                          hasUpdates = true;
                                       }
                                    });
                                 }
                                 
                                 // Ajouter le SIRET trouvé via SIRENE si disponible
                                 if (foundSiret && !(currentLead as any).siret) {
                                    updates.siret = foundSiret;
                                    hasUpdates = true;
                                 }
                                 
                                 // Comparer et enrichir avec TOUTES les données SIRENE disponibles
                                 if (finalResult.sireneData) {
                                    const sirene = finalResult.sireneData;
                                    
                                    // 1. Nom de l'entreprise - utiliser le nom complet SIRENE si plus précis
                                    if (sirene.nom_complet) {
                                       const currentCompany = (currentLead.company || '').trim();
                                       const sireneNom = sirene.nom_complet.trim();
                                       
                                       // Si le nom SIRENE est plus complet ou différent, l'utiliser
                                       if (sireneNom !== currentCompany && 
                                           (sireneNom.length > currentCompany.length || 
                                            !currentCompany.toLowerCase().includes(sireneNom.toLowerCase()))) {
                                          updates.company = sireneNom;
                                          hasUpdates = true;
                                       }
                                    }
                                    
                                    // 2. Adresse complète - toujours utiliser l'adresse SIRENE (plus fiable)
                                    if (sirene.adresse && sirene.code_postal && sirene.ville) {
                                       const fullAddress = `${sirene.adresse}, ${sirene.code_postal} ${sirene.ville}`;
                                       const currentAddress = ((currentLead as any).address || '').trim();
                                       
                                       // Normaliser les adresses pour comparaison (enlever espaces multiples, majuscules)
                                       const normalizedCurrent = currentAddress.toLowerCase().replace(/\s+/g, ' ').trim();
                                       const normalizedSirene = fullAddress.toLowerCase().replace(/\s+/g, ' ').trim();
                                       
                                       // Utiliser l'adresse SIRENE si différente ou si manquante
                                       if (normalizedCurrent !== normalizedSirene || !currentAddress) {
                                          updates.address = fullAddress;
                                          // Sauvegarder aussi les composants séparés si la structure le permet
                                          if (sirene.code_postal && !updates.code_postal) {
                                             updates.code_postal = sirene.code_postal;
                                          }
                                          if (sirene.ville && !updates.ville) {
                                             updates.ville = sirene.ville;
                                          }
                                          hasUpdates = true;
                                       }
                                    } else if (sirene.adresse) {
                                       // Si pas de code postal/ville mais adresse, l'utiliser
                                       const currentAddress = ((currentLead as any).address || '').trim();
                                       if (!currentAddress || currentAddress.toLowerCase() !== sirene.adresse.toLowerCase()) {
                                          updates.address = sirene.adresse;
                                          hasUpdates = true;
                                       }
                                    }
                                    
                                    // 3. SIRET - toujours ajouter/mettre à jour
                                    if (sirene.siret && (!(currentLead as any).siret || (currentLead as any).siret !== sirene.siret)) {
                                       updates.siret = sirene.siret;
                                       hasUpdates = true;
                                    }
                                    
                                    // 4. SIREN - toujours ajouter si disponible
                                    if (sirene.siren && !(currentLead as any).siren) {
                                       updates.siren = sirene.siren;
                                       hasUpdates = true;
                                    }
                                    
                                    // 5. Activité principale (code NAF) - ajouter si disponible
                                    if (sirene.activite_principale && !(currentLead as any).activite_principale) {
                                       updates.activite_principale = sirene.activite_principale;
                                       hasUpdates = true;
                                    }
                                    
                                    // 6. Tranche d'effectif - ajouter si disponible
                                    if (sirene.tranche_effectif && !(currentLead as any).tranche_effectif) {
                                       updates.tranche_effectif = sirene.tranche_effectif;
                                       hasUpdates = true;
                                    }
                                    
                                    // 7. Date de création - ajouter si disponible
                                    if (sirene.date_creation && !(currentLead as any).date_creation) {
                                       updates.date_creation = sirene.date_creation;
                                       hasUpdates = true;
                                    }
                                    
                                    // Note: SIRENE ne fournit pas directement téléphone, email, dirigeant
                                    // Ces données doivent être enrichies via d'autres sources (IA ou autres APIs)
                                 }
                                 
                                 // 2. Enrichissement avec données réelles (SIRENE d'abord, IA en dernier recours) si validé par SIREN et non certifié
                                 if (sireneValidated && currentLead.company && !isLeadCertified(currentLead)) {
                                    setOptimizationProgress(prev => ({
                                       ...prev,
                                       status: 'Enrichissement avec données réelles...'
                                    }));
                                    
                                    try {
                                       // Utiliser enrichLeadWithData qui priorise SIRENE, puis IA si nécessaire
                                       const enrichedData = await enrichLeadWithData({
                                          company: currentLead.company,
                                          address: updates.address || (currentLead as any).address,
                                          siret: updates.siret || (currentLead as any).siret,
                                          website: (currentLead as any).website,
                                          industry: (currentLead as any).industry,
                                          company_size: (currentLead as any).company_size,
                                          description: (currentLead as any).description,
                                          ceo: (currentLead as any).ceo,
                                          techStack: (currentLead as any).techStack
                                       });
                                       
                                       // Ajouter les données SIRENE si disponibles
                                       if (enrichedData.adresse && !updates.address) {
                                          updates.address = enrichedData.adresse;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.code_postal && !updates.code_postal) {
                                          updates.code_postal = enrichedData.code_postal;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.ville && !updates.ville) {
                                          updates.ville = enrichedData.ville;
                                          hasUpdates = true;
                                       }
                                       
                                       // Ajouter les données enrichies (seulement les champs de base qui existent)
                                       if (enrichedData.website && !updates.website && !(currentLead as any).website) {
                                          updates.website = enrichedData.website;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.industry && !updates.industry && !(currentLead as any).industry) {
                                          updates.industry = enrichedData.industry;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.company_size && !updates.company_size && !(currentLead as any).company_size) {
                                          updates.company_size = enrichedData.company_size;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.ceo && !updates.ceo && !(currentLead as any).ceo) {
                                          updates.ceo = enrichedData.ceo;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.description && !updates.description && !(currentLead as any).description) {
                                          updates.description = enrichedData.description;
                                          hasUpdates = true;
                                       }
                                       if (enrichedData.activite_principale && !updates.activite_principale) {
                                          updates.activite_principale = enrichedData.activite_principale;
                                          hasUpdates = true;
                                       }
                                       
                                       // Enrichir avec données géographiques, métiers, catégories
                                       const enrichmentData = await enrichLeadData({
                                          company: currentLead.company,
                                          address: updates.address || enrichedData.adresse || (currentLead as any).address,
                                          description: enrichedData.description,
                                          industry: enrichedData.industry,
                                          company_size: enrichedData.company_size || (currentLead as any).company_size,
                                          activite_principale: enrichedData.activite_principale,
                                          siret: enrichedData.siret
                                       });
                                       
                                       // Ne pas ajouter business_category/business_vertical si la colonne n'existe pas
                                       // Ces données seront stockées dans notes/enrichment
                                       
                                       enrichedCount++;
                                       
                                       // Sauvegarder l'enrichissement (gère les erreurs de colonnes manquantes)
                                       if (currentLead.id) {
                                          try {
                                             await saveLeadEnrichment(currentLead.id, enrichmentData);
                                          } catch (enrichError: any) {
                                             console.warn(`Erreur sauvegarde enrichissement pour ${leadName}:`, enrichError);
                                             // Continuer même si la sauvegarde échoue
                                          }
                                       }
                                    } catch (enrichError: any) {
                                       console.warn(`Erreur enrichissement pour ${leadName}:`, enrichError);
                                       setOptimizationProgress(prev => ({
                                          ...prev,
                                          results: [...prev.results, {
                                             leadId: currentLead.id,
                                             company: leadName,
                                             status: 'warning',
                                             message: 'Enrichissement partiel (certaines données peuvent manquer)'
                                          }]
                                       }));
                                       // Continuer même si l'enrichissement échoue partiellement
                                    }
                                 }
                                 
                                 // 3. Mettre à jour le lead avec toutes les corrections
                                 if (hasUpdates) {
                                    setOptimizationProgress(prev => ({
                                       ...prev,
                                       status: 'Mise à jour du lead...'
                                    }));
                                    
                                    let updatedLead: Lead = {
                                       ...currentLead,
                                       ...updates
                                    };
                                    
                                    // Certifier automatiquement si le lead dépasse 80% de complétude après enrichissement
                                    try {
                                       const { certifyLeadIfHighCompleteness } = await import('../../lib/utils/leadCertification');
                                       updatedLead = await certifyLeadIfHighCompleteness(updatedLead);
                                       
                                       if (updatedLead.certified && !currentLead.certified) {
                                          setOptimizationProgress(prev => ({
                                             ...prev,
                                             status: 'Lead certifié automatiquement (>80% complétude)'
                                          }));
                                       }
                                    } catch (certError) {
                                       console.warn(`Erreur certification automatique pour ${leadName}:`, certError);
                                    }
                                    
                                    await updateLead(updatedLead);
                                    correctedCount++;
                                    
                                    const certificationMessage = updatedLead.certified && !currentLead.certified 
                                       ? ' - Certifié automatiquement (>80% complétude)'
                                       : '';
                                    
                                    setOptimizationProgress(prev => ({
                                       ...prev,
                                       results: [...prev.results, {
                                          leadId: currentLead.id,
                                          company: leadName,
                                          status: 'success',
                                          message: `${Object.keys(updates).length} champ(s) mis à jour (validé SIREN)${certificationMessage}`
                                       }]
                                    }));
                                 } else {
                                    // Même sans updates, vérifier la certification si le lead a déjà toutes les données
                                    try {
                                       let checkLead = { ...currentLead };
                                       const { certifyLeadIfHighCompleteness } = await import('../../lib/utils/leadCertification');
                                       checkLead = await certifyLeadIfHighCompleteness(checkLead);
                                       
                                       if (checkLead.certified && !currentLead.certified) {
                                          await updateLead(checkLead as Lead);
                                          setOptimizationProgress(prev => ({
                                             ...prev,
                                             results: [...prev.results, {
                                                leadId: currentLead.id,
                                                company: leadName,
                                                status: 'success',
                                                message: 'Données déjà exactes - Certifié automatiquement (>80% complétude)'
                                             }]
                                          }));
                                       } else {
                                          setOptimizationProgress(prev => ({
                                             ...prev,
                                             results: [...prev.results, {
                                                leadId: currentLead.id,
                                                company: leadName,
                                                status: 'success',
                                                message: 'Données déjà exactes (validé SIREN)'
                                             }]
                                          }));
                                       }
                                    } catch (certError) {
                                       console.warn(`Erreur vérification certification pour ${leadName}:`, certError);
                                       setOptimizationProgress(prev => ({
                                          ...prev,
                                          results: [...prev.results, {
                                             leadId: currentLead.id,
                                             company: leadName,
                                             status: 'success',
                                             message: 'Données déjà exactes (validé SIREN)'
                                          }]
                                       }));
                                    }
                                 }
                              } catch (validationError: any) {
                                 console.error(`Erreur validation SIREN pour ${leadName}:`, validationError);
                                 setOptimizationProgress(prev => ({
                                    ...prev,
                                    results: [...prev.results, {
                                       leadId: currentLead.id,
                                       company: leadName,
                                       status: 'error',
                                       message: `Erreur validation SIREN: ${validationError.message || 'Erreur inconnue'}`
                                    }]
                                 }));
                              }
                              
                              // Délai entre chaque lead pour respecter les limites API (15 secondes minimum)
                              if (i < leadsToProcess.length - 1) {
                                 await new Promise(resolve => setTimeout(resolve, 15000));
                              }
                           }
                           
                           setOptimizationProgress(prev => ({
                              ...prev,
                              status: `Terminé : ${correctedCount} lead(s) corrigé(s), ${enrichedCount} enrichi(s)`
                           }));
                           
                           showToast(`Optimisation terminée : ${correctedCount} corrigé(s), ${enrichedCount} enrichi(s)`, 'success');
                        } catch (error: any) {
                           console.error('Erreur optimisation:', error);
                           setOptimizationProgress(prev => ({
                              ...prev,
                              status: `Erreur : ${error.message}`
                           }));
                           showToast(`Erreur lors de l'optimisation: ${error.message}`, 'error');
                        } finally {
                           setIsValidatingLeads(false);
                        }
                     }}
                     disabled={isValidatingLeads}
                  >
                     {isValidatingLeads ? 'Enrichissement...' : 'Optimiser les leads'}
                  </Button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                     <tr>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Famille</th>
                        <th className="px-6 py-4">Température</th>
                        <th className="px-6 py-4">Source</th>
                        <th className="px-6 py-4">Étape</th>
                        <th className="px-6 py-4">Activité</th>
                        <th className="px-6 py-4 w-20">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {filteredLeads.map((lead) => {
                        const familyData = getFamilyData(lead.family);
                        const temperatureData = getTemperatureData(lead.temperature);
                        return (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                           <td className="px-6 py-4 font-bold cursor-pointer" onClick={() => handleOpenLead(lead)}>
                              <div className="flex items-center gap-2">
                                 {isLeadCertified(lead) && (
                                    <BadgeCheck 
                                       size={18} 
                                       className="text-green-600 dark:text-green-400 flex-shrink-0" 
                                       title={getCertificationMessage(lead)}
                                    />
                                 )}
                                 <div className="flex-1">
                                    {lead.name}
                                    <div className="text-xs font-normal text-slate-500">{lead.company}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 cursor-pointer" onClick={() => handleOpenLead(lead)}>
                              {familyData ? (
                                 <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl" style={{ backgroundColor: `${familyData.color}15`, color: familyData.color }}>
                                    {familyData.icon}
                                 </div>
                              ) : (
                                 <span className="text-xs text-slate-400">—</span>
                              )}
                           </td>
                           <td className="px-6 py-4 cursor-pointer" onClick={() => handleOpenLead(lead)}>
                              {temperatureData ? (
                                 <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl" style={{ backgroundColor: `${temperatureData.color}15`, color: temperatureData.color }}>
                                    {temperatureData.icon}
                                 </div>
                              ) : (
                                 <span className="text-xs text-slate-400">—</span>
                              )}
                           </td>
                           <td className="px-6 py-4 text-xs flex items-center gap-1.5 cursor-pointer" onClick={() => handleOpenLead(lead)}>{getSourceIcon(lead.source)} {lead.source || 'Manuel'}</td>
                           <td className="px-6 py-4 cursor-pointer" onClick={() => handleOpenLead(lead)}><Badge variant={getStageVariant(lead.lifecycleStage)}>{lead.lifecycleStage}</Badge></td>
                           <td className="px-6 py-4 text-xs text-slate-500 cursor-pointer" onClick={() => handleOpenLead(lead)}>{lead.lastContact}</td>
                           <td className="px-6 py-4">
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLead(lead.id, lead.name);
                                 }}
                                 className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                 title="Supprimer le lead"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </td>
                        </tr>
                        );
                     })}
                  </tbody>
                </table>
            </div>
         </div>
      )}

      {/* PIPELINE VIEW - Using Kanban pattern from ProjectsView */}
      {viewMode === 'pipeline' && (
        <div className="flex-1 flex flex-col gap-6 min-h-0 min-w-0">
          {/* Stats Header */}
          <div className="min-w-0 overflow-x-auto pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 min-w-max md:min-w-0">
            {pipelineColumns.map((col) => {
              const stageLeads = filteredLeads.filter(l => l.stage === col.id);
              const totalValue = stageLeads.reduce((acc, l) => acc + (l.value || 0), 0);
              const avgProbability = stageLeads.length > 0 
                ? Math.round(stageLeads.reduce((acc, l) => acc + (l.probability || 0), 0) / stageLeads.length)
                : 0;
              
              return (
                <div key={col.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-all duration-500"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                      {col.title}
                    </p>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">{stageLeads.length}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Leads</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Valeur</span>
                      <span className="font-bold text-slate-900 dark:text-white">{totalValue.toLocaleString()}€</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Prob. moy.</span>
                      <span className="font-bold text-slate-900 dark:text-white">{avgProbability}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Pipeline Kanban Board - Using ProjectsView UI pattern */}
          <div 
            ref={kanbanScrollRef}
            className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-hidden cursor-grab kanban-horizontal-scroll select-none pb-4"
            onMouseDown={handleKanbanMouseDown}
            onMouseLeave={handleKanbanMouseLeave}
            onMouseUp={handleKanbanMouseUp}
            onMouseMove={handleKanbanMouseMove}
            onTouchStart={handleKanbanTouchStart}
            onTouchMove={handleKanbanTouchMove}
            onTouchEnd={handleKanbanTouchEnd}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div className="inline-flex gap-6 h-full pb-4 min-w-max">
              {pipelineColumns.map((col) => {
                const stageLeads = filteredLeads.filter(l => l.stage === col.id);
                const bgColor = hexToRgba(col.color, 0.1);
                
                return (
                  <div 
                    key={col.id} 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className="w-80 flex-shrink-0 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 h-full"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Column Header */}
                    <div className="p-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: col.color }}
                        ></div>
                        <h3 
                          className="font-bold text-sm"
                          style={{ color: col.color }}
                        >
                          {col.title}
                        </h3>
                        <span className="text-xs text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                          {stageLeads.length}
                        </span>
                      </div>
                      <button 
                        onClick={handleOpenCreate} 
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    {/* Leads Cards */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                      <>
                        {stageLeads.map((lead) => {
                          const familyData = getFamilyData(lead.family);
                          const temperatureData = getTemperatureData(lead.temperature);
                          
                          return (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                              onClick={() => handleOpenLead(lead)}
                              className={`cursor-grab active:cursor-grabbing ${draggedLeadId === lead.id ? 'opacity-50' : ''}`}
                            >
                              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500 transition-all duration-500 group">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 flex items-start gap-2">
                                    {isLeadCertified(lead) && (
                                      <BadgeCheck 
                                        size={16} 
                                        className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" 
                                        title={getCertificationMessage(lead)}
                                      />
                                    )}
                                    <div className="flex-1">
                                      <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-500">
                                        {lead.company}
                                      </h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lead.name}</p>
                                    </div>
                                  </div>
                                  {temperatureData && (
                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg" style={{ backgroundColor: `${temperatureData.color}15`, color: temperatureData.color }}>
                                      {temperatureData.icon}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {familyData && (
                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg" style={{ backgroundColor: `${familyData.color}15`, color: familyData.color }}>
                                      {familyData.icon}
                                    </div>
                                  )}
                                  <Badge variant={getStageVariant(lead.lifecycleStage)} className="text-[10px] rounded-lg">
                                    {lead.lifecycleStage}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-600">
                                  <div className="flex items-center gap-2 text-xs">
                                    <DollarSign size={12} className="text-slate-400" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      {(lead.value || 0).toLocaleString()}€
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${
                                          (lead.probability || 0) >= 70 ? 'bg-emerald-500' : 
                                          (lead.probability || 0) >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                                        }`}
                                        style={{ width: `${lead.probability || 0}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                                      {lead.probability || 0}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button 
                          onClick={handleOpenCreate}
                          className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 text-xs font-bold hover:border-primary-300 dark:hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-500/10 transition-all"
                        >
                          + Ajouter
                        </button>
                      </>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LIFECYCLE VIEW */}
      {viewMode === 'lifecycle' && (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          {/* Lifecycle Groups Tabs */}
          <div className="flex gap-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-2">
            {Object.keys(lifecycleStagesMap).map((group) => (
              <button
                key={group}
                onClick={() => setLifecycleGroup(group as typeof lifecycleGroup)}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-500 ${
                  lifecycleGroup === group
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {group === 'marketing' ? 'Marketing' : 
                 group === 'sales' ? 'Ventes' : 
                 group === 'success' ? 'Succès' : 'Rétention'}
              </button>
            ))}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-12 gap-6">
            {lifecycleStagesMap[lifecycleGroup].map((stage) => {
              const stageLeads = filteredLeads.filter(l => l.lifecycleStage === stage);
              const totalValue = stageLeads.reduce((acc, l) => acc + (l.value || 0), 0);
              const avgProbability = stageLeads.length > 0 
                ? Math.round(stageLeads.reduce((acc, l) => acc + (l.probability || 0), 0) / stageLeads.length)
                : 0;
              
              return (
                <div key={stage} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-10 -mt-10 blur-3xl group-hover:scale-110 transition-all duration-500"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                      {stage}
                    </p>
                    <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-3">{stageLeads.length}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Leads</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Valeur totale</span>
                      <span className="font-bold text-slate-900 dark:text-white">{totalValue.toLocaleString()}€</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Probabilité moy.</span>
                      <span className="font-bold text-slate-900 dark:text-white">{avgProbability}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lifecycle Distribution Chart */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] p-6 flex flex-col items-center justify-center hover:shadow-md transition-all duration-500">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Répartition Cycle de Vie</h3>
              <div className="h-64 w-full relative">
                <CustomPieChart
                  data={Object.keys(lifecycleStagesMap).flatMap(group => 
                    lifecycleStagesMap[group].map(stage => ({
                      name: stage,
                      value: filteredLeads.filter(l => l.lifecycleStage === stage).length
                    }))
                  )}
                  colors={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b', '#14b8a6']}
                  innerRadius={40}
                  outerRadius={80}
                  height="100%"
                />
              </div>
            </div>

            {/* Leads List by Group */}
            <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-[30px] overflow-hidden flex flex-col hover:shadow-md transition-all duration-500">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  Leads - {lifecycleGroup === 'marketing' ? 'Marketing' : lifecycleGroup === 'sales' ? 'Ventes' : lifecycleGroup === 'success' ? 'Succès' : 'Rétention'}
                </h3>
                <Badge variant="info" className="rounded-lg">
                  {filteredLeads.filter(l => lifecycleStagesMap[lifecycleGroup].includes(l.lifecycleStage)).length}
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-3">
                  {lifecycleStagesMap[lifecycleGroup].map((stage) => {
                    const stageLeads = filteredLeads.filter(l => l.lifecycleStage === stage);
                    
                    return (
                      <div key={stage}>
                        {stageLeads.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              {stage}
                            </h4>
                          </div>
                        )}
                        {stageLeads.map((lead) => {
                          const familyData = getFamilyData(lead.family);
                          const temperatureData = getTemperatureData(lead.temperature);
                          
                          return (
                            <div
                              key={lead.id}
                              onClick={() => handleOpenLead(lead)}
                              className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-500 group mb-3"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-500">
                                    {lead.company}
                                  </h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{lead.name}</p>
                                </div>
                                <Badge variant={getStageVariant(lead.stage)} className="rounded-lg">
                                  {lead.stage}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                {familyData && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: `${familyData.color}15`, color: familyData.color }}>
                                    {familyData.icon}
                                    <span className="font-medium">{familyData.label}</span>
                                  </div>
                                )}
                                {temperatureData && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: `${temperatureData.color}15`, color: temperatureData.color }}>
                                    {temperatureData.icon}
                                    <span className="font-medium">{temperatureData.label}</span>
                                  </div>
                                )}
                                {getSourceIcon(lead.source)}
                                <span className="text-xs text-slate-500 dark:text-slate-400">{lead.source || 'Manuel'}</span>
                              </div>
                              
                              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-600">
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <DollarSign size={12} className="text-slate-400" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      {(lead.value || 0).toLocaleString()}€
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-slate-400" />
                                    <span className="text-slate-500 dark:text-slate-400">{lead.lastContact}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${
                                        (lead.probability || 0) >= 70 ? 'bg-emerald-500' : 
                                        (lead.probability || 0) >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                                      }`}
                                      style={{ width: `${lead.probability || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                                    {lead.probability || 0}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {filteredLeads.filter(l => lifecycleStagesMap[lifecycleGroup].includes(l.lifecycleStage)).length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Aucun lead dans ce groupe</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="flex gap-6 h-full">
          <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto custom-scrollbar">
            <ProspectingZonesManager
              onZoneSelect={(zone) => setSelectedZoneId(zone?.id || null)}
              selectedZoneId={selectedZoneId}
            />
          </div>
          <div className="flex-1 min-w-0">
            <CrmMapView 
              onLeadClick={(lead) => handleOpenLead(lead)}
              selectedZoneId={selectedZoneId}
              onZoneSelect={(zone) => setSelectedZoneId(zone?.id || null)}
            />
          </div>
        </div>
      )}

      {/* APPOINTMENTS VIEW */}
      {viewMode === 'appointments' && (
        <AppointmentScheduler />
      )}

      {/* PROSPECTING VIEW UPDATE */}
      {viewMode === 'prospecting' && (
         <div className="flex-1 flex flex-col gap-6 min-h-0">
            {showAnalytics && (
               <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <ScrapingAnalyticsDashboard />
               </div>
            )}
            {showHistory && (
               <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <ProspectingHistory />
               </div>
            )}
            <div className="flex-1 flex gap-6 min-h-0">
            {/* Control Panel */}
            <div className="w-1/3 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full shadow-sm">
               <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                     <Bot className="text-indigo-600 dark:text-indigo-400" /> Robot Prospection 3.0
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Agent autonome de scraping & qualification multi-sources.</p>
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                     <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>💡 Astuce:</strong> Configurez au moins une clé API (Gemini ou Mistral) dans les paramètres pour utiliser le robot. En cas de quota épuisé, le robot basculera automatiquement vers l'autre service.
                     </p>
                  </div>
               </div>

               <div className="space-y-6 flex-1">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/30">
                     <Input 
                        label="Zone Géographique" 
                        placeholder="ex: Paris, Lyon, Bordeaux" 
                        value={prospectingZone}
                        onChange={(e) => setProspectingZone(e.target.value)}
                        icon={MapPin}
                     />
                     <div className="mt-4">
                        <Dropdown 
                           label="Secteur d'Activité"
                           value={prospectingActivity}
                           onChange={(value) => setProspectingActivity(value)}
                           options={SECTORS.map(s => ({ value: s, label: s }))}
                           placeholder="Sélectionner un secteur..."
                        />
                     </div>
                     <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Sources Publiques Scannées en Temps Réel (100% Gratuites & Conformes RGPD) :</p>
                        <div className="flex flex-wrap gap-2">
                           <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-[10px] flex items-center gap-1"><MapPin size={10}/> Google Maps / My Business</span>
                           <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px] flex items-center gap-1"><Database size={10}/> Societe.com / Sirene</span>
                           <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] flex items-center gap-1"><Linkedin size={10}/> LinkedIn Public</span>
                           <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] flex items-center gap-1"><Globe size={10}/> Sites Web Officiels</span>
                           <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded text-[10px] flex items-center gap-1"><User size={10}/> Pages Jaunes</span>
                           <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-[10px] flex items-center gap-1"><Search size={10}/> Chambres Commerce</span>
                           <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px] flex items-center gap-1"><Globe size={10}/> Réseaux Sociaux</span>
                           <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] flex items-center gap-1"><FileText size={10}/> Actualités & Presse</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic">L'IA croise automatiquement 3-4 sources minimum par entreprise pour garantir la fiabilité des données.</p>
                     </div>
                  </div>
               </div>

               <Button 
                  fullWidth 
                  size="lg" 
                  onClick={handleRunProspecting} 
                  isLoading={isProspecting}
                  className="mt-6 shadow-lg shadow-indigo-200 dark:shadow-none"
               >
                  {isProspecting ? 'Recherche en cours...' : (hasSearched ? 'Faire une nouvelle recherche' : 'Lancer la recherche')}
               </Button>

               {/* CTA Vérification des leads existants */}
               {leads.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                     <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Vérification des leads existants</p>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">
                        Vérifiez la véracité et l'exactitude de vos {leads.length} lead(s) existant(s) via l'API SIRENE officielle.
                     </p>
                     <Button 
                        fullWidth 
                        size="sm" 
                        onClick={async () => {
                           setIsValidatingLeads(true);
                           setShowValidationResults(true);
                           setProspectingStatus('Vérification en cours...');
                           
                           try {
                              const results = await validateExistingLeads(
                                 leads.map(l => ({
                                    id: l.id,
                                    company: l.company,
                                    address: l.address,
                                    email: l.email,
                                    phone: l.phone,
                                    website: l.website,
                                    siret: (l as any).siret
                                 })),
                                 (step) => {
                                    setProspectingStatus(step);
                                 }
                              );
                              
                              setValidationResults(results);
                              
                              const validCount = results.filter(r => r.isValid).length;
                              const invalidCount = results.length - validCount;
                              
                              if (invalidCount > 0) {
                                 showToast(`${invalidCount} lead(s) avec des problèmes détectés`, 'warning');
                              } else {
                                 showToast(`Tous les leads sont valides (${validCount})`, 'success');
                              }
                           } catch (error: any) {
                              console.error('Erreur validation:', error);
                              showToast(`Erreur lors de la vérification: ${error.message}`, 'error');
                           } finally {
                              setIsValidatingLeads(false);
                              setProspectingStatus('');
                           }
                        }}
                        isLoading={isValidatingLeads}
                        variant="outline"
                        icon={CheckCircle2}
                        className="border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                     >
                        {isValidatingLeads ? 'Vérification...' : `Vérifier ${leads.length} lead(s)`}
                     </Button>
                  </div>
               )}

               {generatedLeads.length > 0 && (
                  <div className="mt-3 space-y-2">
                     <Button 
                        fullWidth 
                        size="lg" 
                        onClick={handleAddAllGeneratedLeads}
                        variant="secondary"
                        className="shadow-md"
                        icon={CheckSquare}
                     >
                        Ajouter tous ({generatedLeads.length})
                     </Button>
                     <div className="flex gap-2">
                        <Button 
                           fullWidth 
                           size="sm" 
                           onClick={async () => {
                              try {
                                 await exportLeads(generatedLeads, { 
                                    format: 'csv', 
                                    filename: `prospection_${prospectingZone.replace(/\s+/g, '_')}_${prospectingActivity.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv` 
                                 });
                                 showToast('Export CSV réussi', 'success');
                              } catch (error: any) {
                                 showToast(`Erreur export: ${error.message}`, 'error');
                              }
                           }}
                           variant="outline"
                           icon={Download}
                        >
                           CSV
                        </Button>
                        <Button 
                           fullWidth 
                           size="sm" 
                           onClick={async () => {
                              try {
                                 await exportLeads(generatedLeads, { 
                                    format: 'json', 
                                    filename: `prospection_${prospectingZone.replace(/\s+/g, '_')}_${prospectingActivity.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json` 
                                 });
                                 showToast('Export JSON réussi', 'success');
                              } catch (error: any) {
                                 showToast(`Erreur export: ${error.message}`, 'error');
                              }
                           }}
                           variant="outline"
                           icon={Download}
                        >
                           JSON
                        </Button>
                        <Button 
                           fullWidth 
                           size="sm" 
                           onClick={async () => {
                              try {
                                 await exportLeads(generatedLeads, { 
                                    format: 'excel', 
                                    filename: `prospection_${prospectingZone.replace(/\s+/g, '_')}_${prospectingActivity.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx` 
                                 });
                                 showToast('Export Excel réussi', 'success');
                              } catch (error: any) {
                                 showToast(`Erreur export: ${error.message}`, 'error');
                              }
                           }}
                           variant="outline"
                           icon={Download}
                        >
                           Excel
                        </Button>
                     </div>
                  </div>
               )}
            </div>

            {/* Results Area */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full shadow-sm overflow-hidden">
               {showValidationResults && validationResults.length > 0 ? (
                  <>
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                           Résultats de vérification ({validationResults.filter(r => r.isValid).length}/{validationResults.length} valides)
                        </h3>
                        <Button 
                           size="sm" 
                           variant="ghost"
                           onClick={() => setShowValidationResults(false)}
                        >
                           Retour aux prospects
                        </Button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {validationResults.map((result) => {
                           const lead = leads.find(l => l.id === result.leadId);
                           return (
                              <div 
                                 key={result.leadId} 
                                 className={`p-4 rounded-2xl border ${
                                    result.isValid 
                                       ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' 
                                       : 'border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                                 }`}
                              >
                                 <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                       <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-bold text-slate-900 dark:text-white">{result.company}</h4>
                                          {result.isValid ? (
                                             <Badge variant="success" className="text-xs">✓ Valide</Badge>
                                          ) : (
                                             <Badge variant="warning" className="text-xs">⚠ Problèmes</Badge>
                                          )}
                                          {result.validatedBySirene && (
                                             <Badge className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                SIRENE: {result.sireneMatchScore}%
                                             </Badge>
                                          )}
                                       </div>
                                       {lead && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400">
                                             {lead.name} • {lead.email || 'Pas d\'email'} • {lead.phone || 'Pas de téléphone'}
                                          </p>
                                       )}
                                    </div>
                                 </div>
                                 
                                 {result.issues.length > 0 && (
                                    <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800">
                                       <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">Problèmes détectés:</p>
                                       <ul className="space-y-1">
                                          {result.issues.map((issue, idx) => (
                                             <li key={idx} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                                <span>{issue}</span>
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 )}
                                 
                                 {Object.keys(result.corrections).length > 0 && (
                                    <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                       <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">Corrections suggérées:</p>
                                       <div className="space-y-2">
                                          {Object.entries(result.corrections).map(([field, correction]: [string, { old: string; new: string }]) => (
                                             <div key={field} className="text-xs">
                                                <span className="font-medium text-indigo-600 dark:text-indigo-400">{field}:</span>
                                                <div className="ml-4 mt-1">
                                                   <div className="text-slate-500 line-through">{correction.old || '(vide)'}</div>
                                                   <div className="text-indigo-700 dark:text-indigo-300 font-medium">→ {correction.new}</div>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                       <Button 
                                          size="sm" 
                                          variant="secondary"
                                          className="mt-2"
                                          onClick={async () => {
                                             if (!lead) return;
                                             
                                             const updatedLead: any = { ...lead };
                                             Object.entries(result.corrections).forEach(([field, correction]: [string, { old: string; new: string }]) => {
                                                updatedLead[field] = correction.new;
                                             });
                                             
                                             if (result.sireneData) {
                                                updatedLead.siret = result.sireneData.siret;
                                                updatedLead.siren = result.sireneData.siren;
                                                updatedLead.address = result.sireneData.adresse || lead.address;
                                                updatedLead.validated_by_sirene = true;
                                                updatedLead.sirene_match_score = result.sireneMatchScore;
                                             }
                                             
                                             await updateLead(updatedLead);
                                             showToast('Lead mis à jour avec les corrections', 'success');
                                             
                                             // Mettre à jour les résultats
                                             setValidationResults(prev => 
                                                prev.map(r => r.leadId === result.leadId ? { ...r, isValid: true, issues: [], corrections: {} } : r)
                                             );
                                          }}
                                       >
                                          Appliquer les corrections
                                       </Button>
                                    </div>
                                 )}
                                 
                                 <div className="mt-3 flex flex-wrap gap-2">
                                    {result.dataQuality.emailValid !== null && (
                                       <Badge className={`text-xs ${result.dataQuality.emailValid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                          Email: {result.dataQuality.emailValid ? '✓' : '✗'}
                                       </Badge>
                                    )}
                                    {result.dataQuality.phoneValid !== null && (
                                       <Badge className={`text-xs ${result.dataQuality.phoneValid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                          Téléphone: {result.dataQuality.phoneValid ? '✓' : '✗'}
                                       </Badge>
                                    )}
                                    {result.dataQuality.addressValid !== null && (
                                       <Badge className={`text-xs ${result.dataQuality.addressValid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                          Adresse: {result.dataQuality.addressValid ? '✓' : '✗'}
                                       </Badge>
                                    )}
                                    {result.dataQuality.websiteValid !== null && (
                                       <Badge className={`text-xs ${result.dataQuality.websiteValid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                          Site web: {result.dataQuality.websiteValid ? '✓' : '✗'}
                                       </Badge>
                                    )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </>
               ) : (
                  <>
                     <h3 className="font-bold text-slate-900 dark:text-white mb-4">Prospects détectés ({generatedLeads.length})</h3>
               
                     {generatedLeads.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                     {isProspecting ? (
                        <div className="text-center">
                           <Loader size={48} className="mb-4 mx-auto" />
                           <p className="font-medium text-slate-700 dark:text-slate-300">{prospectingStatus || 'Recherche en cours...'}</p>
                        </div>
                     ) : (
                        <div className="text-center">
                           <Bot size={64} className="mb-4 mx-auto opacity-20" />
                           <p>Configurez la recherche pour démarrer</p>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                     {generatedLeads.map((lead) => {
                        // Récupérer le score de qualité depuis le state ou depuis le lead
                        const qualityScore = leadQualityScores[lead.id] || (lead as any).qualityScore;
                        const scoreVariant = qualityScore ? (qualityScore.overallScore >= 80 ? 'success' : qualityScore.overallScore >= 60 ? 'warning' : 'danger') : 'default';
                        
                        return (
                           <div key={lead.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex justify-between items-start group hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all duration-500">
                              <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-bold text-slate-900 dark:text-white">{lead.company}</h4>
                                    <span className="text-[10px] bg-white dark:bg-slate-600 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-500 flex items-center gap-1 shadow-sm">
                                       {getSourceIcon(lead.source)} {lead.source}
                                    </span>
                                    {lead.triggerEvent && (
                                       <span className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-800 font-bold flex items-center gap-1">
                                          <Zap size={10} /> {lead.triggerEvent}
                                       </span>
                                    )}
                                    {qualityScore && (
                                       <Badge variant={scoreVariant} className="text-[10px]">
                                          Score: {qualityScore.overallScore}/100
                                       </Badge>
                                    )}
                                 </div>
                                 <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{lead.name}</p>
                                 <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                    {lead.address && <span className="flex items-center gap-1"><MapPin size={12} /> {lead.address}</span>}
                                    {lead.email && (
                                       <span className={`flex items-center gap-1 ${
                                          qualityScore?.emailValid === false ? 'text-red-600 dark:text-red-400' : ''
                                       }`}>
                                          <Mail size={12} /> {lead.email}
                                          {qualityScore?.emailValid === false && <AlertTriangle size={10} className="text-red-600" />}
                                       </span>
                                    )}
                                    {lead.phone && (
                                       <span className={`flex items-center gap-1 ${
                                          qualityScore?.phoneValid === false ? 'text-red-600 dark:text-red-400' : ''
                                       }`}>
                                          <Phone size={12} /> {lead.phone}
                                          {qualityScore?.phoneValid === false && <AlertTriangle size={10} className="text-red-600" />}
                                       </span>
                                    )}
                                    {lead.website && <span className="flex items-center gap-1"><Globe size={12} /> <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline">{lead.website.replace('https://', '').replace('http://', '').substring(0, 30)}</a></span>}
                                    {lead.linkedin && <span className="flex items-center gap-1"><Linkedin size={12} className="text-blue-600" /> <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 underline">LinkedIn</a></span>}
                                 </div>
                                 {qualityScore && (qualityScore.missingFields.length > 0 || qualityScore.suspiciousFields.length > 0) && (
                                    <div className="mt-2 space-y-1">
                                       {qualityScore.missingFields.length > 0 && (
                                          <div className="text-xs text-amber-600 dark:text-amber-400">
                                             <strong>⚠️ Manquant:</strong> {qualityScore.missingFields.join(', ')}
                                          </div>
                                       )}
                                       {qualityScore.suspiciousFields.length > 0 && (
                                          <div className="text-xs text-red-600 dark:text-red-400">
                                             <strong>⚠️ Suspect:</strong> {qualityScore.suspiciousFields.join(', ')}
                                          </div>
                                       )}
                                    </div>
                                 )}
                                 <p className="text-xs text-slate-400 mt-2 italic max-w-xl leading-relaxed whitespace-pre-wrap">{lead.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 ml-4">
                                 <Button size="sm" onClick={() => handleAddGeneratedLead(lead)} icon={Plus} variant="secondary">
                                    Ajouter
                                 </Button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
                  </>
               )}
            </div>
         </div>
         </div>
      )}

      {/* Scheduler Modal */}
      <ProspectingScheduler
         isOpen={isSchedulerOpen}
         onClose={() => setIsSchedulerOpen(false)}
         initialZone={prospectingZone}
         initialActivity={prospectingActivity}
      />

      {/* Scoring Config Modal */}
      <LeadScoringConfig
         isOpen={isScoringConfigOpen}
         onClose={() => setIsScoringConfigOpen(false)}
      />

      {/* Duplicate Detection Modal */}
      {/* Modale de progression pour l'optimisation des leads */}
      <Modal
         isOpen={isOptimizationModalOpen}
         onClose={() => {
            if (!isValidatingLeads) {
               setIsOptimizationModalOpen(false);
            }
         }}
         title="Optimisation des leads en cours"
         size="lg"
      >
         <div className="space-y-4">
            {/* Barre de progression */}
            <div className="space-y-2">
               <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                     {optimizationProgress.current} / {optimizationProgress.total} leads traités
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                     {optimizationProgress.total > 0 ? Math.round((optimizationProgress.current / optimizationProgress.total) * 100) : 0}%
                  </span>
               </div>
               <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                     className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                     style={{ width: `${optimizationProgress.total > 0 ? (optimizationProgress.current / optimizationProgress.total) * 100 : 0}%` }}
                  />
               </div>
            </div>

            {/* Lead en cours */}
            {optimizationProgress.currentLead && (
               <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                     <Loader size={24} />
                     <div className="flex-1">
                        <p className="font-medium text-indigo-900 dark:text-indigo-200">
                           {optimizationProgress.currentLead}
                        </p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                           {optimizationProgress.status}
                        </p>
                     </div>
                  </div>
               </div>
            )}

            {/* Liste des résultats */}
            {optimizationProgress.results.length > 0 && (
               <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                     Résultats :
                  </p>
                  <div className="space-y-1">
                     {optimizationProgress.results.map((result, idx) => (
                        <div
                           key={idx}
                           className={`flex items-center gap-2 p-2 rounded text-sm ${
                              result.status === 'success'
                                 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                 : result.status === 'error'
                                 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                 : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                           }`}
                        >
                           {result.status === 'success' && <CheckCircle2 size={16} className="flex-shrink-0" />}
                           {result.status === 'error' && <AlertTriangle size={16} className="flex-shrink-0" />}
                           {result.status === 'warning' && <AlertTriangle size={16} className="flex-shrink-0" />}
                           <span className="font-medium flex-1">{result.company}</span>
                           <span className="text-xs">{result.message}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Message de statut */}
            {optimizationProgress.status && !optimizationProgress.currentLead && (
               <div className="text-center py-4 text-slate-600 dark:text-slate-400">
                  <p>{optimizationProgress.status}</p>
               </div>
            )}
         </div>
      </Modal>

      <DuplicateDetection
         isOpen={isDuplicateDetectionOpen}
         onClose={() => setIsDuplicateDetectionOpen(false)}
         onMerge={async (leadIdsToMerge, keepLeadId) => {
            try {
               // Supprimer les leads fusionnés (garder seulement celui sélectionné)
               for (const leadId of leadIdsToMerge) {
                  await deleteLead(leadId);
               }
               showToast(`${leadIdsToMerge.length} lead(s) fusionné(s)`, 'success');
               // La modale reste ouverte pour permettre d'autres fusions
            } catch (error: any) {
               showToast(`Erreur lors de la fusion: ${error.message}`, 'error');
            }
         }}
         onEnrich={async (leadIdsToEnrich, keepLeadId) => {
            try {
               // Récupérer le lead principal à enrichir
               const mainLead = leads.find(l => l.id === keepLeadId);
               if (!mainLead) {
                  showToast('Lead principal introuvable', 'error');
                  return;
               }

               // Récupérer les leads à ajouter comme contacts
               const leadsToAdd = leads.filter(l => leadIdsToEnrich.includes(l.id));
               
               // Créer les contacts à partir des leads doublons
               const newContacts: LeadContact[] = leadsToAdd
                  .filter(lead => lead.name || lead.email || lead.phone) // Ignorer les leads sans info
                  .map(lead => ({
                     id: lead.id,
                     name: lead.name || 'Sans nom',
                     email: lead.email,
                     phone: lead.phone,
                     role: undefined, // Peut être défini plus tard
                     addedAt: new Date().toISOString(),
                  }));

               // Fusionner avec les contacts existants (éviter les doublons)
               const existingContacts = (mainLead as any).contacts || [];
               const existingContactIds = new Set(existingContacts.map((c: LeadContact) => c.id));
               const uniqueNewContacts = newContacts.filter(c => !existingContactIds.has(c.id));
               
               // Mettre à jour le lead avec les nouveaux contacts
               const updatedLead: Lead = {
                  ...mainLead,
                  contacts: [...existingContacts, ...uniqueNewContacts],
               };

               await updateLead(updatedLead);
               
               // Supprimer les leads qui ont été ajoutés comme contacts
               for (const leadId of leadIdsToEnrich) {
                  await deleteLead(leadId);
               }
               
               showToast(`${uniqueNewContacts.length} contact(s) ajouté(s) au lead`, 'success');
            } catch (error: any) {
               showToast(`Erreur lors de l'enrichissement: ${error.message}`, 'error');
            }
         }}
      />

      {/* Existing Modals ... */}
      <Modal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         title={selectedLead?.id ? 'Détails du lead' : 'Ajouter un lead'}
         headerActions={
            selectedLead?.company ? (
               <Button 
                  type="button" 
                  onClick={handleEnrichLead} 
                  disabled={isEnriching} 
                  variant="secondary" 
                  icon={Sparkles}
                  title="Enrichir les données avec l'IA"
               >
                  {isEnriching ? 'Enrichissement...' : 'Enrichir avec IA'}
               </Button>
            ) : undefined
         }
      >
         <div className="flex flex-col h-[85vh] max-h-[800px]">
            {selectedLead?.id && (
               <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
                  <button
                     type="button"
                     onClick={() => setActiveLeadTab('details')}
                     className={`px-4 py-2 text-sm font-medium transition-all duration-500 ${
                        activeLeadTab === 'details'
                           ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                     }`}
                  >
                     Détails
                  </button>
                  <button
                     type="button"
                     onClick={() => setActiveLeadTab('timeline')}
                     className={`px-4 py-2 text-sm font-medium transition-all duration-500 ${
                        activeLeadTab === 'timeline'
                           ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                     }`}
                  >
                     Timeline
                  </button>
                  <button
                     type="button"
                     onClick={() => setActiveLeadTab('events')}
                     className={`px-4 py-2 text-sm font-medium transition-all duration-500 ${
                        activeLeadTab === 'events'
                           ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                     }`}
                  >
                     Événements
                  </button>
                  <button
                     type="button"
                     onClick={() => setActiveLeadTab('email')}
                     className={`px-4 py-2 text-sm font-medium transition-all duration-500 ${
                        activeLeadTab === 'email'
                           ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                     }`}
                  >
                     Tracking Email
                  </button>
                  <button
                     type="button"
                     onClick={() => setActiveLeadTab('visits')}
                     className={`px-4 py-2 text-sm font-medium transition-all duration-500 ${
                        activeLeadTab === 'visits'
                           ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                     }`}
                  >
                     <MapPin className="inline h-4 w-4 mr-1" />
                     Visites terrain
                  </button>
                  {selectedLead && isVIPLead(selectedLead as Lead) && (
                      <button
                        type="button"
                        onClick={() => setActiveLeadTab('vip')}
                        className={`px-4 py-2 text-sm font-medium transition-all duration-500 ${
                           activeLeadTab === 'vip'
                              ? 'border-b-2 border-amber-600 text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                         <Crown className="inline h-4 w-4 mr-1" />
                         VIP
                      </button>
                  )}
               </div>
            )}
            {activeLeadTab === 'timeline' && selectedLead?.id ? (
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <LeadTimeline leadId={selectedLead.id} />
               </div>
            ) : activeLeadTab === 'events' && selectedLead?.id ? (
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <LeadEvents leadId={selectedLead.id} />
               </div>
            ) : activeLeadTab === 'email' && selectedLead?.id ? (
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <EmailTrackingStats leadId={selectedLead.id} emailType="manual" />
               </div>
            ) : activeLeadTab === 'vip' && selectedLead?.id ? (
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <VIPLeadsDashboard />
               </div>
            ) : activeLeadTab === 'visits' && selectedLead?.id ? (
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <FieldVisitManager leadId={selectedLead.id} />
               </div>
            ) : (
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  <form onSubmit={handleSaveLead} className="space-y-6">

                    {/* Section: Informations de base */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Informations de base</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Nom *" 
                                value={selectedLead?.name || ''} 
                                onChange={e => setSelectedLead({...selectedLead, name: e.target.value})} 
                                required 
                            />
                            <Input 
                                label="Entreprise *" 
                                value={selectedLead?.company || ''} 
                                onChange={e => setSelectedLead({...selectedLead, company: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Email" 
                                type="email"
                                value={selectedLead?.email || ''} 
                                onChange={e => setSelectedLead({...selectedLead, email: e.target.value})} 
                                icon={Mail}
                            />
                            <Input 
                                label="Téléphone" 
                                type="tel"
                                value={selectedLead?.phone || ''} 
                                onChange={e => setSelectedLead({...selectedLead, phone: e.target.value})} 
                                icon={Phone}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="SIRET" 
                                type="text"
                                placeholder="14 chiffres"
                                value={(selectedLead as any)?.siret || ''} 
                                onChange={e => setSelectedLead({...selectedLead, siret: e.target.value.replace(/\D/g, '').slice(0, 14)})} 
                                maxLength={14}
                            />
                        </div>
                    </div>

                    {/* Section: Informations commerciales */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Informations commerciales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Dropdown
                                label="Étape"
                                value={selectedLead?.stage || 'Nouveau'}
                                onChange={(value) => setSelectedLead({...selectedLead, stage: value as Lead['stage']})}
                                options={[
                                    { value: 'Nouveau', label: 'Nouveau' },
                                    { value: 'Découverte', label: 'Découverte' },
                                    { value: 'Proposition', label: 'Proposition' },
                                    { value: 'Négociation', label: 'Négociation' },
                                    { value: 'Gagné', label: 'Gagné' }
                                ]}
                            />
                            <Dropdown
                                label="Cycle de vie"
                                value={selectedLead?.lifecycleStage || 'Lead'}
                                onChange={(value) => setSelectedLead({...selectedLead, lifecycleStage: value as LifecycleStage})}
                                options={[
                                    { value: 'Audience', label: 'Audience' },
                                    { value: 'Lead', label: 'Lead' },
                                    { value: 'MQL', label: 'MQL' },
                                    { value: 'SQL', label: 'SQL' },
                                    { value: 'Contact', label: 'Contact' },
                                    { value: 'Opportunité', label: 'Opportunité' },
                                    { value: 'Client', label: 'Client' },
                                    { value: 'Client Actif', label: 'Client Actif' },
                                    { value: 'Ambassadeur', label: 'Ambassadeur' },
                                    { value: 'Inactif', label: 'Inactif' },
                                    { value: 'Perdu', label: 'Perdu' }
                                ]}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                                label="Valeur (€)" 
                                type="number"
                                value={0} 
                                onChange={e => setSelectedLead({...selectedLead, value: 0})} 
                                icon={DollarSign}
                                disabled
                                title="La valeur est toujours à zéro et sera incrémentée uniquement avec la validation de devis"
                            />
                            <Input 
                                label="Probabilité (%)" 
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Probabilité de conversion (0-100%)"
                                value={selectedLead?.probability || 10} 
                                onChange={e => setSelectedLead({...selectedLead, probability: parseInt(e.target.value) || 10})} 
                            />
                            <Dropdown
                                label="Source"
                                value={selectedLead?.source || 'Site Web'}
                                onChange={(value) => setSelectedLead({...selectedLead, source: value as Lead['source']})}
                                options={[
                                    { value: 'Site Web', label: 'Site Web' },
                                    { value: 'LinkedIn', label: 'LinkedIn' },
                                    { value: 'Référence', label: 'Référence' },
                                    { value: 'Pubs', label: 'Pubs' },
                                    { value: 'Appel froid', label: 'Appel froid' },
                                    { value: 'Robot Prospection', label: 'Robot Prospection' }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Section: Typologie */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Typologie</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Dropdown
                                label="Famille"
                                value={selectedLead?.family || ''}
                                onChange={(value) => setSelectedLead({...selectedLead, family: value as LeadFamily || undefined})}
                                options={[
                                    { value: '', label: 'Non spécifié' },
                                    ...LEAD_FAMILIES.map(f => ({ 
                                        value: f.value, 
                                        label: `${f.label}` 
                                    }))
                                ]}
                            />
                            <Dropdown
                                label="Température"
                                value={selectedLead?.temperature || ''}
                                onChange={(value) => setSelectedLead({...selectedLead, temperature: value as LeadTemperature || undefined})}
                                options={[
                                    { value: '', label: 'Non spécifié' },
                                    ...LEAD_TEMPERATURES.map(t => ({ 
                                        value: t.value, 
                                        label: `${t.label}` 
                                    }))
                                ]}
                            />
                        </div>
                        {(selectedLead?.family || selectedLead?.temperature) && (
                            <div className="flex gap-3 items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                {selectedLead?.family && (() => {
                                    const familyData = getFamilyData(selectedLead.family);
                                    return familyData ? (
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${familyData.color}15`, color: familyData.color }}>
                                            {familyData.icon}
                                            <span className="text-sm font-medium">{familyData.label}</span>
                                        </div>
                                    ) : null;
                                })()}
                                {selectedLead?.temperature && (() => {
                                    const temperatureData = getTemperatureData(selectedLead.temperature);
                                    return temperatureData ? (
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${temperatureData.color}15`, color: temperatureData.color }}>
                                            {temperatureData.icon}
                                            <span className="text-sm font-medium">{temperatureData.label}</span>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Section: Enrichissement IA - Entreprise */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                            Enrichissement IA - Entreprise
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Secteur d'activité" 
                                value={selectedLead?.industry || ''} 
                                onChange={e => setSelectedLead({...selectedLead, industry: e.target.value})} 
                                placeholder="ex: Agences Marketing & Com"
                            />
                            <Input 
                                label="Site web" 
                                type="url"
                                value={selectedLead?.website || ''} 
                                onChange={e => setSelectedLead({...selectedLead, website: e.target.value})} 
                                icon={Globe}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Adresse" 
                                value={selectedLead?.address || ''} 
                                onChange={e => setSelectedLead({...selectedLead, address: e.target.value})} 
                                icon={MapPin}
                            />
                            <Input 
                                label="LinkedIn" 
                                type="url"
                                value={selectedLead?.linkedin || ''} 
                                onChange={e => setSelectedLead({...selectedLead, linkedin: e.target.value})} 
                                icon={Linkedin}
                                placeholder="https://linkedin.com/company/..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                                label="Taille d'entreprise" 
                                value={selectedLead?.company_size || ''} 
                                onChange={e => setSelectedLead({...selectedLead, company_size: e.target.value})} 
                                placeholder="ex: 10-50 employés"
                            />
                            <Input 
                                label="Nombre d'employés" 
                                value={selectedLead?.employees || ''} 
                                onChange={e => setSelectedLead({...selectedLead, employees: e.target.value})} 
                                placeholder="ex: 25"
                            />
                            <Input 
                                label="Année de création" 
                                value={selectedLead?.creation_year || ''} 
                                onChange={e => setSelectedLead({...selectedLead, creation_year: e.target.value})} 
                                placeholder="ex: 2015"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="CEO / Dirigeant" 
                                value={selectedLead?.ceo || ''} 
                                onChange={e => setSelectedLead({...selectedLead, ceo: e.target.value})} 
                                placeholder="Nom du dirigeant"
                            />
                            <Input 
                                label="Type de client" 
                                value={selectedLead?.client_type || ''} 
                                onChange={e => setSelectedLead({...selectedLead, client_type: e.target.value})} 
                                placeholder="ex: PME, Grand compte, Startup..."
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <Input 
                                label="Maturité digitale" 
                                value={selectedLead?.digital_maturity || ''} 
                                onChange={e => setSelectedLead({...selectedLead, digital_maturity: e.target.value})} 
                                placeholder="ex: Débutant, Intermédiaire, Avancé"
                            />
                        </div>
                        {selectedLead?.techStack && selectedLead.techStack.length > 0 && (
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Stack technique</label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedLead.techStack.map((tech, idx) => (
                                        <Badge key={idx} variant="info">{tech}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Analyse stratégique */}
                    {selectedLead?.description && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                                <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                                Analyse stratégique
                            </h3>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/30">
                                <Textarea
                                    label="Description / Analyse"
                                    value={selectedLead.description}
                                    onChange={e => setSelectedLead({...selectedLead, description: e.target.value})}
                                    rows={6}
                                    className="bg-white dark:bg-slate-800"
                                />
                            </div>
                            {selectedLead?.triggerEvent && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <Zap size={16} className="text-amber-600 dark:text-amber-400" />
                                    <div>
                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Trigger:</span>
                                        <span className="text-sm text-amber-800 dark:text-amber-200 ml-2">{selectedLead.triggerEvent}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section: Métriques Google (si disponibles) */}
                    {(selectedLead?.google_rating || selectedLead?.google_reviews_count) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Métriques Google</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedLead?.google_rating && (
                                    <Input 
                                        label="Note Google" 
                                        value={selectedLead.google_rating} 
                                        onChange={e => setSelectedLead({...selectedLead, google_rating: e.target.value})} 
                                        icon={Star}
                                    />
                                )}
                                {selectedLead?.google_reviews_count && (
                                    <Input 
                                        label="Nombre d'avis Google" 
                                        value={selectedLead.google_reviews_count} 
                                        onChange={e => setSelectedLead({...selectedLead, google_reviews_count: e.target.value})} 
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        {selectedLead?.id && (
                            <Button 
                                type="button" 
                                onClick={() => {
                                    if (selectedLead.id) {
                                        handleDeleteLead(selectedLead.id, selectedLead.name);
                                    }
                                }}
                                variant="secondary"
                                icon={Trash2}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                                Supprimer
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                            <Button type="submit">Sauvegarder</Button>
                        </div>
                    </div>
                  </form>
               </div>
            )}
         </div>
      </Modal>

      {/* Modal de désabonnement manuel */}
      <Modal
         isOpen={isUnsubscribeModalOpen}
         onClose={() => {
            setIsUnsubscribeModalOpen(false);
            setUnsubscribeData({
               emailMarketing: false,
               emailTransactional: false,
               sms: false,
               whatsapp: false,
               reason: '',
            });
         }}
         title="Désabonner le lead"
      >
         <div className="space-y-6">
            {selectedLead?.email && (
               <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Lead</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                     {selectedLead.name || 'Sans nom'} - {selectedLead.email}
                  </p>
                  {selectedLead.company && (
                     <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {selectedLead.company}
                     </p>
                  )}
               </div>
            )}

            <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Canaux à désabonner <span className="text-red-500">*</span>
               </label>
               <div className="space-y-3">
                  <label className="flex items-start space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={unsubscribeData.emailMarketing}
                        onChange={(e) => setUnsubscribeData({ ...unsubscribeData, emailMarketing: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-0.5"
                     />
                     <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">Email marketing</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Newsletters, promotions, campagnes marketing
                        </p>
                     </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={unsubscribeData.emailTransactional}
                        onChange={(e) => setUnsubscribeData({ ...unsubscribeData, emailTransactional: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-0.5"
                     />
                     <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">Email transactionnel</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Devis, factures, confirmations (non recommandé)
                        </p>
                     </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={unsubscribeData.sms}
                        onChange={(e) => setUnsubscribeData({ ...unsubscribeData, sms: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-0.5"
                     />
                     <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">SMS</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Messages SMS marketing
                        </p>
                     </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={unsubscribeData.whatsapp}
                        onChange={(e) => setUnsubscribeData({ ...unsubscribeData, whatsapp: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-0.5"
                     />
                     <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">WhatsApp</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Messages WhatsApp marketing
                        </p>
                     </div>
                  </label>
               </div>
            </div>

            <div>
               <label htmlFor="unsubscribe-reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Raison (optionnel)
               </label>
               <Textarea
                  id="unsubscribe-reason"
                  value={unsubscribeData.reason}
                  onChange={(e) => setUnsubscribeData({ ...unsubscribeData, reason: e.target.value })}
                  placeholder="Ex: Trop d'emails, pas intéressé, changement de poste..."
                  rows={3}
               />
            </div>

            <div className="flex gap-3 justify-end">
               <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                     setIsUnsubscribeModalOpen(false);
                     setUnsubscribeData({
                        emailMarketing: false,
                        emailTransactional: false,
                        sms: false,
                        whatsapp: false,
                        reason: '',
                     });
                  }}
                  disabled={isUnsubscribing}
               >
                  Annuler
               </Button>
               <Button
                  type="button"
                  onClick={async () => {
                     if (!selectedLead?.id || !selectedLead?.email) {
                        showToast('Erreur: Lead ou email manquant', 'error');
                        return;
                     }

                     // Vérifier qu'au moins un canal est sélectionné
                     if (!unsubscribeData.emailMarketing && !unsubscribeData.emailTransactional && 
                         !unsubscribeData.sms && !unsubscribeData.whatsapp) {
                        showToast('Veuillez sélectionner au moins un canal à désabonner', 'error');
                        return;
                     }

                     setIsUnsubscribing(true);
                     try {
                        await unsubscribeLead(
                           selectedLead.id,
                           {
                              emailMarketing: unsubscribeData.emailMarketing,
                              emailTransactional: unsubscribeData.emailTransactional,
                              sms: unsubscribeData.sms,
                              whatsApp: unsubscribeData.whatsapp,
                           },
                           {
                              reason: unsubscribeData.reason || undefined,
                              from: 'manual',
                           }
                        );

                        showToast('Lead désabonné avec succès', 'success');
                        setIsUnsubscribeModalOpen(false);
                        setUnsubscribeData({
                           emailMarketing: false,
                           emailTransactional: false,
                           sms: false,
                           whatsapp: false,
                           reason: '',
                        });

                        // Rafraîchir les données du lead si nécessaire
                        if (selectedLead.id) {
                           const { data: updatedLead } = await supabase
                              .from('leads')
                              .select('*')
                              .eq('id', selectedLead.id)
                              .single();
                           
                           if (updatedLead) {
                              setSelectedLead({ ...selectedLead, ...updatedLead });
                           }
                        }
                     } catch (error: any) {
                        showToast(`Erreur lors du désabonnement: ${error.message}`, 'error');
                     } finally {
                        setIsUnsubscribing(false);
                     }
                  }}
                  disabled={isUnsubscribing}
               >
                  {isUnsubscribing ? 'Désabonnement...' : 'Désabonner'}
               </Button>
            </div>
         </div>
      </Modal>
    </PageLayout>
  );
};
