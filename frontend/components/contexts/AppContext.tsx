
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ViewState, Integration, Task, Lead, ChatMessage, CalendarEvent, AgencyEvent, Employee, Campaign, User, Document, Asset, SocialPost, FinanceStat, Candidate, ProductionProject, Influencer, RoadmapGoal, Notification, ChatChannel, ListeningAlert } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ToastContainer, ToastItem } from '../ui/ToastContainer';
import { useRealtimeNotifications } from '../../lib/hooks/useRealtimeNotifications';
import { useAuth } from './AuthContext';
import { FollowUpService } from '../../lib/services/followUpService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  currentView: ViewState;
  navigate: (view: ViewState) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  projectFilter: string | null;
  setProjectFilter: (filter: string | null) => void;
  
  // Integrations
  integrations: Integration[];
  toggleIntegration: (id: string) => void;
  
  // Global Actions
  openGlobalCreate: () => void;

  // Data States
  users: User[];
  tasks: Task[];
  leads: Lead[];
  employees: Employee[];
  campaigns: Campaign[];
  socialPosts: SocialPost[];
  financeStats: FinanceStat[];
  candidates: Candidate[];
  productionProjects: ProductionProject[];
  influencers: Influencer[];
  roadmapGoals: RoadmapGoal[];
  notifications: Notification[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  calendarEvents: CalendarEvent[];
  agencyEvents: AgencyEvent[];
  documents: Document[];
  assets: Asset[];
  listeningAlerts: ListeningAlert[];

  // Mutators
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  
  addLead: (lead: Lead) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (id: string) => void;
  deleteAllLeads: () => Promise<void>;
  resetAllLeadValues: () => Promise<void>;
  
  addChatMessage: (msg: ChatMessage) => void;
  
  addProductionProject: (project: ProductionProject) => void;
  
  addCalendarEvent: (evt: CalendarEvent) => void;
  
  updateUser: (user: User) => void; // Added for Avatar update
  markAllNotificationsAsRead: () => Promise<void>;
  
  updateAssets: (updates: Array<{ id: string; tags: string[] }>) => Promise<void>;
  
  isLoadingData: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Data State Initialization
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  
  // Core Data
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [financeStats, setFinanceStats] = useState<FinanceStat[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [productionProjects, setProductionProjects] = useState<ProductionProject[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [roadmapGoals, setRoadmapGoals] = useState<RoadmapGoal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [agencyEvents, setAgencyEvents] = useState<AgencyEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [listeningAlerts, setListeningAlerts] = useState<ListeningAlert[]>([]);

  // --- SUPABASE HYDRATION ---
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      setIsLoadingData(true);
      
          // Phase 1: Charger les données essentielles en premier (pour afficher l'UI rapidement)
      const fetchEssentialData = async () => {
        try {
          const [usersResult] = await Promise.all([
            supabase.from('users').select('*').limit(100),
            // Notifications chargées via useRealtimeNotifications
          ]);

          if(usersResult.data) setUsers(usersResult.data);
          
          // Marquer comme chargé pour permettre l'affichage de l'UI
          setIsLoadingData(false);
        } catch (e) {
          console.error("Error loading essential data from Supabase", e);
          setIsLoadingData(false);
        }
      };

      // Phase 2: Charger les autres données en arrière-plan (après le rendu initial)
      const fetchBackgroundData = async () => {
        try {
          const results = await Promise.all([
             supabase.from('tasks').select('*').limit(5000),
             supabase.from('leads').select('*').limit(5000),
             supabase.from('employees').select('*').limit(100),
             supabase.from('campaigns').select('*').limit(100),
             supabase.from('social_posts').select('*').limit(100),
             supabase.from('finance_stats').select('*').limit(100),
             supabase.from('candidates').select('*').limit(100),
             supabase.from('production_projects').select('*').limit(100),
             supabase.from('influencers').select('*').limit(100),
             supabase.from('roadmap_goals').select('*').limit(100),
             supabase.from('chat_channels').select('*').limit(50),
             supabase.from('chat_messages').select('*').order('timestamp', { ascending: false }).limit(200),
             supabase.from('events').select('*').limit(200),
             supabase.from('documents').select('*').limit(200),
             supabase.from('assets').select('*').limit(200),
             supabase.from('listening_alerts').select('*').limit(100),
          ]);

          if(results[0].data) {
            const mappedTasks = results[0].data.map((t: any) => ({
              ...t, dueDate: t.due_date, startDate: t.start_date, estimatedTime: t.estimated_time, subTasks: t.sub_tasks
            }));
            
            // Charger les assignés pour toutes les tâches
            const taskIds = mappedTasks.map((t: any) => t.id).filter(Boolean);
            if (taskIds.length > 0) {
              const { data: assigneesData } = await supabase
                .from('task_assignees')
                .select('task_id, user_id')
                .in('task_id', taskIds);
              
              if (assigneesData) {
                // Grouper les assignés par taskId
                const assigneesByTask: Record<string, string[]> = {};
                assigneesData.forEach((a: any) => {
                  if (!assigneesByTask[a.task_id]) {
                    assigneesByTask[a.task_id] = [];
                  }
                  assigneesByTask[a.task_id].push(a.user_id);
                });
                
                // Ajouter les assignés aux tâches
                mappedTasks.forEach((task: any) => {
                  if (assigneesByTask[task.id]) {
                    task.assignees = assigneesByTask[task.id];
                  }
                });
              }
            }
            
            setTasks(mappedTasks);
          }

          if(results[1].data) setLeads(results[1].data.map((l: any) => {
             // Parser les données enrichies depuis notes (JSON)
             let enrichedData = {};
             if (l.notes) {
                try {
                   enrichedData = JSON.parse(l.notes);
                } catch (e) {
                   // Si notes n'est pas du JSON, le garder comme description
                   enrichedData = { description: l.notes };
                }
             }
             
             return {
                ...l, 
                stage: l.status, // Le schéma utilise 'status' mais le type Lead utilise 'stage'
                lastContact: l.last_contact || 'Jamais', 
                lifecycleStage: l.lifecycle_stage || 'Lead',
                ...enrichedData // Restaurer les champs enrichis
             };
          }));

          if(results[2].data) setEmployees(results[2].data.map((e: any) => ({
             ...e, joinDate: e.join_date, ptoBalance: e.pto_balance
          })));

          if(results[3].data) setCampaigns(results[3].data);
          if(results[4].data) setSocialPosts(results[4].data);
          if(results[5].data) setFinanceStats(results[5].data);
          
          if(results[6].data) setCandidates(results[6].data.map((c:any) => ({
             ...c, appliedDate: c.applied_date
          })));

          if(results[7].data) setProductionProjects(results[7].data.map((p:any) => ({
             ...p, soldHours: p.sold_hours, spentHours: p.spent_hours, startDate: p.start_date
          })));

          if(results[8].data) setInfluencers(results[8].data.map((i:any) => ({
             ...i, engagementRate: i.engagement_rate, costPerPost: i.cost_per_post
          })));

          if(results[9].data) setRoadmapGoals(results[9].data);
          if(results[10].data) setChatChannels(results[10].data);
          
          if(results[11].data) setChatMessages(results[11].data.map((m: any) => ({
             ...m, senderId: m.sender_id, senderName: m.sender_name, senderAvatar: m.sender_avatar, isMe: m.is_me
          })));

          if(results[12].data) setAgencyEvents(results[12].data);
          
          if(results[13].data) setDocuments(results[13].data.map((d:any) => ({
             ...d, lastModified: d.last_modified, folderId: d.folder_id
          })));

          if(results[14].data) setAssets(results[14].data.map((a:any) => ({
             ...a, uploadDate: a.upload_date
          })));

          if(results[15].data) setListeningAlerts(results[15].data);

        } catch (e) {
          console.error("Error loading background data from Supabase", e);
        }
      };

      // Charger les données essentielles immédiatement
      fetchEssentialData();
      
      // Charger les autres données après un court délai pour permettre le rendu initial
      setTimeout(() => {
        fetchBackgroundData();
      }, 100);
    }
  }, []);

  const openGlobalCreate = () => {
    window.dispatchEvent(new CustomEvent('open-global-create'));
  };

  const navigate = (view: ViewState) => setCurrentView(view);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(int => 
      int.id === id ? { ...int, status: int.status === 'Connecté' ? 'Déconnecté' : 'Connecté' } : int
    ));
  };

  // --- MUTATORS ---

  const addTask = async (task: Task) => {
    setTasks(prev => [task, ...prev]);
    if (isSupabaseConfigured && supabase) {
       await supabase.from('tasks').insert([{
          id: task.id, title: task.title, client: task.client, department: task.department,
          status: task.status, priority: task.priority, assignee: task.assignee,
          due_date: task.dueDate, start_date: task.startDate, estimated_time: task.estimatedTime,
          description: task.description, sub_tasks: task.subTasks
       }]);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (isSupabaseConfigured && supabase) {
       await supabase.from('tasks').update({
          title: updatedTask.title, status: updatedTask.status, priority: updatedTask.priority,
          client: updatedTask.client, description: updatedTask.description,
          sub_tasks: updatedTask.subTasks, due_date: updatedTask.dueDate
       }).eq('id', updatedTask.id);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (isSupabaseConfigured && supabase) {
       await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const addLead = async (lead: Lead) => {
    // Certifier automatiquement le lead si les critères sont remplis
    const { certifyLeadIfEligible } = await import('../../lib/utils/leadCertification');
    const certifiedLead = certifyLeadIfEligible(lead);
    
    setLeads(prev => [certifiedLead, ...prev]);
    if (isSupabaseConfigured && supabase) {
       try {
         // Préparer les données enrichies pour le champ notes (JSON stringifié)
         const enrichedData: any = {};
         const leadAny = certifiedLead as any;
         
         // Collecter tous les champs enrichis qui ne sont pas dans le schéma de base
         if (leadAny.description) enrichedData.description = leadAny.description;
         if (leadAny.industry) enrichedData.industry = leadAny.industry;
         if (leadAny.website) enrichedData.website = leadAny.website;
         if (leadAny.address) enrichedData.address = leadAny.address;
         if (leadAny.linkedin) enrichedData.linkedin = leadAny.linkedin;
         if (leadAny.company_size) enrichedData.company_size = leadAny.company_size;
         if (leadAny.client_type) enrichedData.client_type = leadAny.client_type;
         if (leadAny.digital_maturity) enrichedData.digital_maturity = leadAny.digital_maturity;
         if (leadAny.triggerEvent) enrichedData.triggerEvent = leadAny.triggerEvent;
         if (leadAny.ceo) enrichedData.ceo = leadAny.ceo;
         if (leadAny.employees) enrichedData.employees = leadAny.employees;
         if (leadAny.techStack) enrichedData.techStack = leadAny.techStack;
         if (leadAny.google_rating) enrichedData.google_rating = leadAny.google_rating;
         if (leadAny.google_reviews_count) enrichedData.google_reviews_count = leadAny.google_reviews_count;
         if (leadAny.creation_year) enrichedData.creation_year = leadAny.creation_year;
         // Champs typologie
         if (leadAny.family) enrichedData.family = leadAny.family;
         if (leadAny.temperature) enrichedData.temperature = leadAny.temperature;
         
         // Construire le champ notes avec les données enrichies
         let notes = '';
         if (Object.keys(enrichedData).length > 0) {
           notes = JSON.stringify(enrichedData);
         }
         
         // Normaliser la source pour respecter la contrainte CHECK de la base de données
         const validSources: Lead['source'][] = ['Site Web', 'LinkedIn', 'Référence', 'Pubs', 'Appel froid', 'Robot Prospection'];
         let normalizedSource: Lead['source'] | null = null;
         if (lead.source) {
           const exactMatch = validSources.find(s => s === lead.source);
           normalizedSource = exactMatch || null;
         }
         // Si pas de source valide, utiliser 'Site Web' par défaut
         if (!normalizedSource) {
           normalizedSource = 'Site Web';
         }
         
         const { error } = await supabase.from('leads').insert([{
            id: certifiedLead.id, 
            name: certifiedLead.name, 
            company: certifiedLead.company, 
            value: 0, // Toujours à zéro - sera incrémenté uniquement avec la validation de devis
            status: certifiedLead.stage || 'Nouveau', // Le schéma utilise 'status' pas 'stage'
            lifecycle_stage: certifiedLead.lifecycleStage || 'Lead', 
            probability: certifiedLead.probability || 10,
            email: certifiedLead.email || null, 
            phone: certifiedLead.phone || null,
            source: normalizedSource, 
            notes: notes || null,
            certified: (certifiedLead as any).certified || false,
            certified_at: (certifiedLead as any).certifiedAt || null,
            siret: (certifiedLead as any).siret || leadAny.siret || null
         }]);

         if (error) {
           console.error('Erreur lors de l\'ajout du lead dans Supabase:', error);
           throw error;
         }
       } catch (error: any) {
         console.error('Erreur lors de l\'ajout du lead:', error);
         // Retirer le lead de l'état local en cas d'erreur
         setLeads(prev => prev.filter(l => l.id !== lead.id));
         throw error;
       }
    }
  };

  const updateLead = async (updatedLead: Lead) => {
    const previousLead = leads.find(l => l.id === updatedLead.id);
    // Certifier automatiquement le lead si les critères sont remplis
    const { certifyLeadIfEligible } = await import('../../lib/utils/leadCertification');
    const certifiedLead = certifyLeadIfEligible(updatedLead);
    
    setLeads(prev => prev.map(l => l.id === certifiedLead.id ? certifiedLead : l));
    if (isSupabaseConfigured && supabase) {
       try {
         // Préparer les données enrichies pour le champ notes (JSON stringifié)
         const enrichedData: any = {};
         const leadAny = certifiedLead as any;
         
         // Collecter tous les champs enrichis qui ne sont pas dans le schéma de base
         if (leadAny.description) enrichedData.description = leadAny.description;
         if (leadAny.industry) enrichedData.industry = leadAny.industry;
         if (leadAny.website) enrichedData.website = leadAny.website;
         if (leadAny.address) enrichedData.address = leadAny.address;
         if (leadAny.linkedin) enrichedData.linkedin = leadAny.linkedin;
         if (leadAny.company_size) enrichedData.company_size = leadAny.company_size;
         if (leadAny.client_type) enrichedData.client_type = leadAny.client_type;
         if (leadAny.digital_maturity) enrichedData.digital_maturity = leadAny.digital_maturity;
         if (leadAny.triggerEvent) enrichedData.triggerEvent = leadAny.triggerEvent;
         if (leadAny.ceo) enrichedData.ceo = leadAny.ceo;
         if (leadAny.employees) enrichedData.employees = leadAny.employees;
         if (leadAny.techStack) enrichedData.techStack = leadAny.techStack;
         if (leadAny.google_rating) enrichedData.google_rating = leadAny.google_rating;
         if (leadAny.google_reviews_count) enrichedData.google_reviews_count = leadAny.google_reviews_count;
         if (leadAny.creation_year) enrichedData.creation_year = leadAny.creation_year;
         // Champs typologie
         if (updatedLead.family) enrichedData.family = updatedLead.family;
         if (updatedLead.temperature) enrichedData.temperature = updatedLead.temperature;
         
         // Construire le champ notes avec les données enrichies
         let notes = '';
         if (Object.keys(enrichedData).length > 0) {
           notes = JSON.stringify(enrichedData);
         }
         
         // Normaliser la source pour respecter la contrainte CHECK de la base de données
         const validSources: Lead['source'][] = ['Site Web', 'LinkedIn', 'Référence', 'Pubs', 'Appel froid', 'Robot Prospection'];
         let normalizedSource: Lead['source'] | null = null;
         if (updatedLead.source) {
           const exactMatch = validSources.find(s => s === updatedLead.source);
           normalizedSource = exactMatch || null;
         }
         // Si pas de source valide, utiliser 'Site Web' par défaut
         if (!normalizedSource) {
           normalizedSource = 'Site Web';
         }
         
         const { error } = await supabase.from('leads').update({ 
            name: certifiedLead.name,
            company: certifiedLead.company,
            status: certifiedLead.stage || 'Nouveau', // Le schéma utilise 'status' pas 'stage'
            lifecycle_stage: certifiedLead.lifecycleStage || 'Lead',
            probability: certifiedLead.probability || 10, 
            value: 0, // Toujours à zéro - sera incrémenté uniquement avec la validation de devis
            email: certifiedLead.email || null,
            phone: certifiedLead.phone || null,
            source: normalizedSource,
            notes: notes || null,
            certified: (certifiedLead as any).certified || false,
            certified_at: (certifiedLead as any).certifiedAt || null,
            siret: (certifiedLead as any).siret || leadAny.siret || null
         }).eq('id', certifiedLead.id);

         if (error) {
           console.error('Erreur lors de la mise à jour du lead dans Supabase:', error);
           // Restaurer l'état précédent en cas d'erreur
           if (previousLead) {
             setLeads(prev => prev.map(l => l.id === updatedLead.id ? previousLead : l));
           }
           throw error;
         }
       } catch (error: any) {
         console.error('Erreur lors de la mise à jour du lead:', error);
         // Restaurer l'état précédent en cas d'erreur
         if (previousLead) {
           setLeads(prev => prev.map(l => l.id === updatedLead.id ? previousLead : l));
         }
         throw error;
       }
    }
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    if (isSupabaseConfigured && supabase) {
       await supabase.from('leads').delete().eq('id', id);
    }
  };

  const deleteAllLeads = async () => {
    if (isSupabaseConfigured && supabase) {
      // Récupérer tous les IDs des leads
      const { data: allLeads, error: fetchError } = await supabase
        .from('leads')
        .select('id');

      if (fetchError) throw fetchError;

      if (allLeads && allLeads.length > 0) {
        const ids = allLeads.map((l: any) => l.id);
        
        // Supprimer tous les leads par petits lots pour éviter les erreurs 400
        // Utiliser des lots plus petits (50) pour éviter les problèmes d'URL trop longue
        const batchSize = 50;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          
          // Utiliser une approche plus fiable : supprimer un par un si le lot échoue
          try {
            const { error: deleteError } = await supabase
              .from('leads')
              .delete()
              .in('id', batch);
            
            if (deleteError) {
              // Si la suppression par lot échoue, supprimer un par un
              console.warn(`Erreur suppression par lot, passage à la suppression individuelle:`, deleteError);
              for (const id of batch) {
                const { error: singleDeleteError } = await supabase
                  .from('leads')
                  .delete()
                  .eq('id', id);
                
                if (singleDeleteError) {
                  console.error(`Erreur suppression lead ${id}:`, singleDeleteError);
                }
              }
            }
          } catch (err) {
            // En cas d'erreur, supprimer un par un
            console.warn(`Erreur lors de la suppression par lot, passage à la suppression individuelle:`, err);
            for (const id of batch) {
              try {
                const { error: singleDeleteError } = await supabase
                  .from('leads')
                  .delete()
                  .eq('id', id);
                
                if (singleDeleteError) {
                  console.error(`Erreur suppression lead ${id}:`, singleDeleteError);
                }
              } catch (singleErr) {
                console.error(`Erreur critique suppression lead ${id}:`, singleErr);
              }
            }
          }
        }
      }
    }
    setLeads([]);
  };

  const resetAllLeadValues = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        // Mettre toutes les valeurs à zéro dans la base de données
        const { error } = await supabase
          .from('leads')
          .update({ value: 0 })
          .neq('value', 0); // Ne mettre à jour que ceux qui ne sont pas déjà à zéro
        
        if (error) {
          console.error('Erreur lors de la réinitialisation des valeurs:', error);
          throw error;
        }
        
        // Mettre à jour l'état local
        setLeads(prev => prev.map(lead => ({ ...lead, value: 0 })));
      } catch (error: any) {
        console.error('Erreur lors de la réinitialisation des valeurs:', error);
        throw error;
      }
    } else {
      // Mettre à jour l'état local même si Supabase n'est pas configuré
      setLeads(prev => prev.map(lead => ({ ...lead, value: 0 })));
    }
  };

  const addChatMessage = async (msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
    if (isSupabaseConfigured && supabase) {
       await supabase.from('chat_messages').insert([{
          id: msg.id, sender_id: msg.senderId, sender_name: msg.senderName,
          sender_avatar: msg.senderAvatar, content: msg.content, timestamp: msg.timestamp,
          is_me: msg.isMe, attachments: msg.attachments
       }]);
    }
  };

  const addProductionProject = async (project: ProductionProject) => {
     setProductionProjects(prev => [project, ...prev]);
     if (isSupabaseConfigured && supabase) {
        await supabase.from('production_projects').insert([{
           id: project.id, name: project.name, client: project.client, department: project.department,
           status: project.status, sold_hours: project.soldHours, spent_hours: project.spentHours,
           start_date: project.startDate, deadline: project.deadline, budget: project.budget, cost: project.cost
        }]);
     }
  };
  
  const addCalendarEvent = (evt: CalendarEvent) => setCalendarEvents(prev => [...prev, evt]);

  const updateUser = async (updatedUser: User) => {
     setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
     if (isSupabaseConfigured && supabase) {
        try {
           const { error } = await supabase.from('users').update({
              name: updatedUser.name,
              email: updatedUser.email,
              avatar_url: updatedUser.avatar,
              role: updatedUser.role
           }).eq('id', updatedUser.id);
           
           if (error) {
              console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
              throw error;
           }
        } catch (err) {
           console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
           throw err;
        }
     }
  };

  const markAllNotificationsAsRead = async () => {
     if (!isSupabaseConfigured || !supabase || users.length === 0) {
        return;
     }

     try {
        const currentUserId = users[0].id;
        const { error } = await supabase
           .from('notifications')
           .update({ read: true })
           .eq('user_id', currentUserId)
           .eq('read', false);

        if (error) {
           console.error('Erreur lors du marquage des notifications:', error);
           throw error;
        }

        // Mettre à jour l'état local
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
     } catch (err) {
        console.error('Erreur lors du marquage des notifications:', err);
        throw err;
     }
  };

  const updateAssets = async (updates: Array<{ id: string; tags: string[] }>) => {
     if (!isSupabaseConfigured || !supabase) {
        // Mettre à jour uniquement l'état local si Supabase n'est pas configuré
        setAssets(prev => prev.map(asset => {
           const update = updates.find(u => u.id === asset.id);
           if (update) {
              return { ...asset, tags: update.tags };
           }
           return asset;
        }));
        return;
     }

     try {
        // Mettre à jour chaque asset dans Supabase
        for (const update of updates) {
           const { error } = await supabase
              .from('assets')
              .update({ tags: update.tags })
              .eq('id', update.id);

           if (error) {
              console.error(`Erreur lors de la mise à jour de l'asset ${update.id}:`, error);
              throw error;
           }
        }

        // Mettre à jour l'état local
        setAssets(prev => prev.map(asset => {
           const update = updates.find(u => u.id === asset.id);
           if (update) {
              return { ...asset, tags: update.tags };
           }
           return asset;
        }));
     } catch (err) {
        console.error('Erreur lors de la mise à jour des assets:', err);
        throw err;
     }
  };

  return (
    <AppContext.Provider value={{ 
      currentView, navigate, showToast, projectFilter, setProjectFilter, 
      integrations, toggleIntegration, openGlobalCreate,
      users, tasks, leads, employees, campaigns, socialPosts, financeStats, 
      candidates, productionProjects, influencers, roadmapGoals, notifications,
      chatChannels, chatMessages, calendarEvents, agencyEvents, documents, assets, listeningAlerts,
      addTask, updateTask, deleteTask, addLead, updateLead, deleteLead, deleteAllLeads, resetAllLeadValues, addChatMessage, addCalendarEvent, addProductionProject, updateUser, markAllNotificationsAsRead, updateAssets,
      isLoadingData
    }}>
      {children}
      <ToastContainer 
        toasts={toasts.map(t => ({ id: t.id, message: t.message, type: t.type }))}
        onRemove={removeToast}
      />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
