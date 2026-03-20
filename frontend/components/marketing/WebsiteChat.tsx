import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Bot, Send, User, Settings, X, Plus, Code, Copy, 
  BarChart3, Users, Clock, TrendingUp, Bell, UserPlus, Download,
  Filter, Search, CheckCircle2, AlertCircle
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { Lead } from '../../types';

interface ChatMessage {
  id: string;
  session_id: string;
  lead_id?: string;
  sender_type: 'visitor' | 'agent' | 'bot';
  message: string;
  metadata: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface ChatSession {
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  lead_id?: string;
  last_message_at: string;
  unread_count: number;
  assigned_to?: string;
  status: 'active' | 'waiting' | 'closed';
}

interface ChatbotConfig {
  id: string;
  name: string;
  description?: string;
  welcome_message: string;
  fallback_message: string;
  is_active: boolean;
  rules: Array<{
    keyword: string;
    response: string;
    exact_match?: boolean;
  }>;
  auto_create_lead: boolean;
  transfer_keywords: string[];
  created_by?: string;
}

interface ChatAnalytics {
  total_conversations: number;
  total_messages: number;
  avg_response_time: number;
  bot_responses: number;
  agent_responses: number;
  leads_created: number;
  transfer_rate: number;
}

export const WebsiteChat: React.FC = () => {
  const { showToast, user } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'waiting' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatbotConfig();
    loadSessions();
    loadAnalytics();
    
    // S'abonner aux nouvelles sessions
    const channel = supabase
      .channel('chat_sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'website_chat_messages'
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
      subscribeToMessages(selectedSession);
      markMessagesAsRead(selectedSession);
    }
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [selectedSession]);

  const loadChatbotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_configurations')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Créer une configuration par défaut si elle n'existe pas
        const defaultConfig: Omit<ChatbotConfig, 'id'> = {
          name: 'Chatbot par défaut',
          welcome_message: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
          fallback_message: 'Je ne comprends pas votre demande. Un agent peut vous aider.',
          is_active: true,
          rules: [],
          auto_create_lead: true,
          transfer_keywords: ['agent', 'humain', 'parler', 'contact']
        };
        
        const { data: newConfig } = await supabase
          .from('chatbot_configurations')
          .insert([{ ...defaultConfig, created_by: user?.id }])
          .select()
          .single();
        
        if (newConfig) {
          setChatbotConfig(newConfig);
        }
      } else if (data) {
        setChatbotConfig(data);
      }
    } catch (error: any) {
      console.error('Error loading chatbot config:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('website_chat_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Grouper par session
      const sessionsMap = new Map<string, ChatSession>();
      
      messagesData?.forEach((msg: ChatMessage) => {
        if (!sessionsMap.has(msg.session_id)) {
          sessionsMap.set(msg.session_id, {
            session_id: msg.session_id,
            visitor_name: msg.metadata?.visitor_name,
            visitor_email: msg.metadata?.visitor_email,
            lead_id: msg.lead_id,
            last_message_at: msg.created_at,
            unread_count: 0,
            status: 'active'
          });
        }
        
        const session = sessionsMap.get(msg.session_id)!;
        if (new Date(msg.created_at) > new Date(session.last_message_at)) {
          session.last_message_at = msg.created_at;
        }
        if (!msg.is_read && msg.sender_type === 'visitor') {
          session.unread_count++;
        }
        if (msg.metadata?.visitor_name) {
          session.visitor_name = msg.metadata.visitor_name;
        }
        if (msg.metadata?.visitor_email) {
          session.visitor_email = msg.metadata.visitor_email;
        }
        if (msg.lead_id) {
          session.lead_id = msg.lead_id;
        }
      });

      const sessionsList = Array.from(sessionsMap.values())
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      
      setSessions(sessionsList);
      
      if (sessionsList.length > 0 && !selectedSession) {
        setSelectedSession(sessionsList[0].session_id);
      }
    } catch (error: any) {
      showToast('Erreur lors du chargement des sessions', 'error');
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('website_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des messages', 'error');
    }
  };

  const subscribeToMessages = (sessionId: string) => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'website_chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
          
          // Si c'est un message visiteur, créer un lead si configuré
          if (newMessage.sender_type === 'visitor' && chatbotConfig?.auto_create_lead) {
            createLeadFromChat(newMessage);
          }
          
          // Si le message contient des mots-clés de transfert, notifier
          if (newMessage.sender_type === 'visitor' && chatbotConfig?.transfer_keywords) {
            const shouldTransfer = chatbotConfig.transfer_keywords.some(keyword =>
              newMessage.message.toLowerCase().includes(keyword.toLowerCase())
            );
            if (shouldTransfer) {
              notifyAgentTransfer(sessionId);
            }
          }
          
          // Réponse automatique du bot
          if (newMessage.sender_type === 'visitor' && chatbotConfig) {
            handleBotResponse(newMessage.message, sessionId);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const markMessagesAsRead = async (sessionId: string) => {
    try {
      await supabase
        .from('website_chat_messages')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('is_read', false);
      
      loadSessions();
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const createLeadFromChat = async (message: ChatMessage) => {
    try {
      // Vérifier si un lead existe déjà pour cette session
      if (message.lead_id) return;

      const visitorEmail = message.metadata?.visitor_email;
      const visitorName = message.metadata?.visitor_name || 'Visiteur chat';

      if (!visitorEmail) return;

      // Vérifier si un lead existe déjà avec cet email
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', visitorEmail)
        .single();

      let leadId = existingLead?.id;

      if (!leadId) {
        // Créer un nouveau lead
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert([{
            name: visitorName,
            email: visitorEmail,
            company: message.metadata?.company || '',
            source: 'Site Web',
            stage: 'Nouveau',
            lifecycleStage: 'Lead'
          }])
          .select()
          .single();

        if (error) throw error;
        leadId = newLead.id;
      }

      // Mettre à jour le message avec le lead_id
      await supabase
        .from('website_chat_messages')
        .update({ lead_id: leadId })
        .eq('session_id', message.session_id);

      // Mettre à jour tous les messages de la session
      await supabase
        .from('website_chat_messages')
        .update({ lead_id: leadId })
        .eq('session_id', message.session_id)
        .is('lead_id', null);

      showToast('Lead créé automatiquement depuis le chat', 'success');
      loadSessions();
    } catch (error: any) {
      console.error('Error creating lead from chat:', error);
    }
  };

  const notifyAgentTransfer = async (sessionId: string) => {
    try {
      await supabase.from('notifications').insert({
        user_id: user?.id,
        type: 'chat_transfer',
        title: 'Transfert de chat demandé',
        message: `Un visiteur demande à parler à un agent (session: ${sessionId.substring(0, 8)})`,
        metadata: { session_id: sessionId }
      });

      showToast('Notification envoyée : transfert demandé', 'info');
    } catch (error: any) {
      console.error('Error notifying agent:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;

    try {
      const { error } = await supabase
        .from('website_chat_messages')
        .insert([{
          session_id: selectedSession,
          sender_type: 'agent',
          message: newMessage,
          is_read: true,
          metadata: { agent_id: user?.id }
        }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      showToast('Erreur lors de l\'envoi du message', 'error');
    }
  };

  const handleBotResponse = async (message: string, sessionId: string) => {
    if (!chatbotConfig || !chatbotConfig.is_active) return;

    // Vérifier les règles du chatbot
    let botMessage = chatbotConfig.fallback_message;
    let matched = false;

    for (const rule of chatbotConfig.rules) {
      if (rule.exact_match) {
        if (message.toLowerCase() === rule.keyword.toLowerCase()) {
          botMessage = rule.response;
          matched = true;
          break;
        }
      } else {
        if (message.toLowerCase().includes(rule.keyword.toLowerCase())) {
          botMessage = rule.response;
          matched = true;
          break;
        }
      }
    }

    // Si aucune règle ne correspond, utiliser le message de bienvenue pour les salutations
    if (!matched) {
      const greetings = ['bonjour', 'salut', 'hello', 'bonsoir', 'bonne journée'];
      if (greetings.some(g => message.toLowerCase().includes(g))) {
        botMessage = chatbotConfig.welcome_message;
      }
    }

    // Attendre un peu avant de répondre (simulation de réflexion)
    setTimeout(async () => {
      try {
        await supabase
          .from('website_chat_messages')
          .insert([{
            session_id: sessionId,
            sender_type: 'bot',
            message: botMessage,
            metadata: { rule_matched: matched }
          }]);
      } catch (error: any) {
        console.error('Error sending bot response:', error);
      }
    }, 1000);
  };

  const loadAnalytics = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('website_chat_messages')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const botMessages = messagesData.filter(m => m.sender_type === 'bot').length;
      const agentMessages = messagesData.filter(m => m.sender_type === 'agent').length;
      const visitorMessages = messagesData.filter(m => m.sender_type === 'visitor').length;
      const sessions = new Set(messagesData.map(m => m.session_id));
      const leadsCreated = new Set(messagesData.filter(m => m.lead_id).map(m => m.lead_id)).size;
      
      // Calculer le temps de réponse moyen (simplifié)
      let totalResponseTime = 0;
      let responseCount = 0;
      
      const sessionsList = Array.from(sessions);
      for (const sessionId of sessionsList) {
        const sessionMessages = messagesData
          .filter(m => m.session_id === sessionId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        for (let i = 0; i < sessionMessages.length - 1; i++) {
          if (sessionMessages[i].sender_type === 'visitor' && 
              (sessionMessages[i + 1].sender_type === 'agent' || sessionMessages[i + 1].sender_type === 'bot')) {
            const responseTime = new Date(sessionMessages[i + 1].created_at).getTime() - 
                                new Date(sessionMessages[i].created_at).getTime();
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      }

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount / 1000 / 60 : 0; // en minutes
      const transferRate = visitorMessages > 0 ? (agentMessages / visitorMessages) * 100 : 0;

      setAnalytics({
        total_conversations: sessions.size,
        total_messages: messagesData.length,
        avg_response_time: Math.round(avgResponseTime),
        bot_responses: botMessages,
        agent_responses: agentMessages,
        leads_created: leadsCreated,
        transfer_rate: Math.round(transferRate)
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
    }
  };

  const saveChatbotConfig = async () => {
    if (!chatbotConfig) return;

    try {
      const { error } = await supabase
        .from('chatbot_configurations')
        .upsert({
          ...chatbotConfig,
          created_by: user?.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      showToast('Configuration du chatbot sauvegardée', 'success');
      setIsConfigModalOpen(false);
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/chat-widget.js';
    script.setAttribute('data-chat-url', '${baseUrl}');
    document.head.appendChild(script);
  })();
</script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    showToast('Code d\'intégration copié', 'success');
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.visitor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.session_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedSessionData = sessions.find(s => s.session_id === selectedSession);

  return (
    <PageLayout
      header={{
        icon: MessageCircle,
        title: "Chat website et chatbot",
        description: "Gérez les conversations avec vos visiteurs",
        rightActions: [
          {
            label: "Analytics",
            icon: BarChart3,
            onClick: () => setIsAnalyticsOpen(true),
            variant: 'outline'
          },
          {
            label: "Code embed",
            icon: Code,
            onClick: () => setIsEmbedModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Configuration",
            icon: Settings,
            onClick: () => setIsConfigModalOpen(true),
            variant: 'outline'
          }
        ]
      }}
    >
      <div className="flex gap-6 h-full">
        {/* Liste des sessions */}
        <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
          <div className="mb-4">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="mb-2"
            />
            <Dropdown
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as any)}
              options={[
                { value: 'all', label: 'Toutes' },
                { value: 'active', label: 'Actives' },
                { value: 'waiting', label: 'En attente' },
                { value: 'closed', label: 'Fermées' }
              ]}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredSessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() => setSelectedSession(session.session_id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-500 ${
                  selectedSession === session.session_id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {session.visitor_name || `Session ${session.session_id.substring(0, 8)}`}
                  </span>
                  {session.unread_count > 0 && (
                    <Badge variant="blue" className="text-xs">
                      {session.unread_count}
                    </Badge>
                  )}
                </div>
                {session.visitor_email && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {session.visitor_email}
                  </p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {new Date(session.last_message_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {session.lead_id && (
                  <Badge variant="green" className="text-xs mt-1">
                    Lead créé
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Zone de chat */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {selectedSession ? (
            <>
              {/* En-tête de conversation */}
              <div className="border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {selectedSessionData?.visitor_name || `Session ${selectedSession.substring(0, 8)}`}
                  </h3>
                  {selectedSessionData?.visitor_email && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedSessionData.visitor_email}
                    </p>
                  )}
                </div>
                {selectedSessionData?.lead_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(`/crm?lead=${selectedSessionData.lead_id}`, '_blank');
                    }}
                  >
                    Voir le lead
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Aucun message dans cette conversation</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_type === 'agent'
                            ? 'bg-indigo-600 text-white'
                            : msg.sender_type === 'bot'
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_type === 'bot' ? (
                            <Bot size={14} />
                          ) : msg.sender_type === 'agent' ? (
                            <User size={14} />
                          ) : (
                            <User size={14} />
                          )}
                          <span className="text-xs opacity-75">
                            {msg.sender_type === 'agent' ? 'Vous' : msg.sender_type === 'bot' ? 'Bot' : 'Visiteur'}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        <span className="text-xs opacity-50 mt-1 block">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Tapez votre message..."
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                    onClick={handleSendMessage}
                    icon={Send}
                  >
                    Envoyer
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de configuration */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configuration du chatbot"
        size="lg"
      >
        {chatbotConfig && (
          <div className="space-y-4">
            <Input
              label="Nom"
              value={chatbotConfig.name}
              onChange={(e) => setChatbotConfig({ ...chatbotConfig, name: e.target.value })}
            />
            <Textarea
              label="Description"
              value={chatbotConfig.description || ''}
              onChange={(e) => setChatbotConfig({ ...chatbotConfig, description: e.target.value })}
              rows={2}
            />
            <Textarea
              label="Message de bienvenue"
              value={chatbotConfig.welcome_message}
              onChange={(e) => setChatbotConfig({ ...chatbotConfig, welcome_message: e.target.value })}
              rows={3}
            />
            <Textarea
              label="Message par défaut"
              value={chatbotConfig.fallback_message}
              onChange={(e) => setChatbotConfig({ ...chatbotConfig, fallback_message: e.target.value })}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chatbotConfig.auto_create_lead}
                onChange={(e) => setChatbotConfig({ ...chatbotConfig, auto_create_lead: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Créer automatiquement un lead depuis le chat
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mots-clés de transfert (séparés par des virgules)
              </label>
              <Input
                value={chatbotConfig.transfer_keywords.join(', ')}
                onChange={(e) => setChatbotConfig({
                  ...chatbotConfig,
                  transfer_keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                })}
                placeholder="agent, humain, parler..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Règles de réponse automatique
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chatbotConfig.rules.map((rule, idx) => (
                  <div key={idx} className="flex gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded">
                    <Input
                      value={rule.keyword}
                      onChange={(e) => {
                        const newRules = [...chatbotConfig.rules];
                        newRules[idx].keyword = e.target.value;
                        setChatbotConfig({ ...chatbotConfig, rules: newRules });
                      }}
                      placeholder="Mot-clé"
                      className="flex-1"
                    />
                    <Input
                      value={rule.response}
                      onChange={(e) => {
                        const newRules = [...chatbotConfig.rules];
                        newRules[idx].response = e.target.value;
                        setChatbotConfig({ ...chatbotConfig, rules: newRules });
                      }}
                      placeholder="Réponse"
                      className="flex-1"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const newRules = chatbotConfig.rules.filter((_, i) => i !== idx);
                        setChatbotConfig({ ...chatbotConfig, rules: newRules });
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatbotConfig({
                  ...chatbotConfig,
                  rules: [...chatbotConfig.rules, { keyword: '', response: '', exact_match: false }]
                })}
                icon={Plus}
              >
                Ajouter une règle
              </Button>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={saveChatbotConfig}>
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal code embed */}
      <Modal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        title="Code d'intégration du widget"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Copiez ce code et ajoutez-le avant la balise &lt;/body&gt; de votre site web.
          </p>
          <div className="relative">
            <Textarea
              value={generateEmbedCode()}
              readOnly
              rows={6}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyEmbedCode}
              className="absolute top-2 right-2"
              icon={Copy}
            >
              Copier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal analytics */}
      <Modal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        title="Analytics du chat"
        size="lg"
      >
        {analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.total_conversations}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Conversations</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.total_messages}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Messages</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.avg_response_time} min
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Temps de réponse moyen</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.bot_responses}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Réponses bot</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.agent_responses}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Réponses agent</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.leads_created}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Leads créés</div>
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
              <div className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
                Taux de transfert : {analytics.transfer_rate}%
              </div>
              <div className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                Pourcentage de conversations transférées à un agent
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};
