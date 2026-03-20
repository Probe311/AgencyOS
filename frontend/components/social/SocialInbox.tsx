import React, { useState, useEffect, useRef } from 'react';
import {
  Inbox, MessageSquare, Filter, Search, User, Clock, Tag, Archive,
  Star, Send, Reply, MoreVertical, CheckCircle2, XCircle, AlertCircle,
  Plus, Edit3, Trash2, Save, X, Eye, EyeOff, Bell, BellOff
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

type MessageType = 'comment' | 'direct_message' | 'mention' | 'review' | 'story_reply';
type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Platform = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok';

interface SocialMessage {
  id: string;
  social_account_id: string;
  platform: Platform;
  message_type: MessageType;
  external_message_id: string;
  external_post_id?: string;
  sender_name: string;
  sender_username?: string;
  sender_avatar_url?: string;
  content: string;
  media_urls?: string[];
  is_read: boolean;
  is_archived: boolean;
  is_important: boolean;
  priority: Priority;
  assigned_to?: string;
  assigned_at?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  received_at: string;
  created_at: string;
  social_account?: {
    account_name: string;
  };
  assigned_user?: {
    name: string;
    avatar_url?: string;
  };
  responses?: SocialMessageResponse[];
}

interface SocialMessageResponse {
  id: string;
  content: string;
  user_id: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_at: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

interface SavedResponse {
  id: string;
  name: string;
  content: string;
  category?: string;
  platform?: Platform;
  tags?: string[];
  usage_count: number;
}

export const SocialInbox: React.FC = () => {
  const { showToast, user } = useApp();
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SocialMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SocialMessage | null>(null);
  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([]);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isSavedResponseModalOpen, setIsSavedResponseModalOpen] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [selectedSavedResponse, setSelectedSavedResponse] = useState<SavedResponse | null>(null);

  // Filtres
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterType, setFilterType] = useState<MessageType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'assigned' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMessages();
    if (user?.id) {
      loadSavedResponses();
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [messages, filterPlatform, filterType, filterPriority, filterStatus, searchQuery]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('social_messages')
        .select(`
          *,
          social_accounts(account_name),
          assigned_user:users!social_messages_assigned_to_fkey(id, name, avatar_url),
          responses:social_message_responses(
            id,
            content,
            user_id,
            status,
            sent_at,
            created_at,
            user:users(id, name, avatar_url)
          )
        `)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des messages', 'error');
    }
  };

  const loadSavedResponses = async () => {
    if (!user?.id) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('social_saved_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setSavedResponses(data || []);
    } catch (error: any) {
      console.error('Error loading saved responses:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(m => m.platform === filterPlatform);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.message_type === filterType);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(m => m.priority === filterPriority);
    }

    if (filterStatus === 'unread') {
      filtered = filtered.filter(m => !m.is_read);
    } else if (filterStatus === 'assigned') {
      filtered = filtered.filter(m => m.assigned_to === user?.id);
    } else if (filterStatus === 'archived') {
      filtered = filtered.filter(m => m.is_archived);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.content.toLowerCase().includes(query) ||
        m.sender_name.toLowerCase().includes(query) ||
        m.sender_username?.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  };

  const handleMarkAsRead = async (messageId: string, isRead: boolean) => {
    try {
      const { error } = await supabase
        .from('social_messages')
        .update({ is_read: isRead })
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleAssign = async (messageId: string, userId?: string) => {
    try {
      const { error } = await supabase
        .from('social_messages')
        .update({
          assigned_to: userId || null,
          assigned_at: userId ? new Date().toISOString() : null
        })
        .eq('id', messageId);

      if (error) throw error;
      showToast(userId ? 'Message assigné' : 'Assignation retirée', 'success');
      loadMessages();
    } catch (error: any) {
      showToast('Erreur lors de l\'assignation', 'error');
    }
  };

  const handleArchive = async (messageId: string, isArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('social_messages')
        .update({ is_archived: isArchived })
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error: any) {
      showToast('Erreur lors de l\'archivage', 'error');
    }
  };

  const handleSetPriority = async (messageId: string, priority: Priority) => {
    try {
      const { error } = await supabase
        .from('social_messages')
        .update({ priority })
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedMessage || !responseContent.trim()) return;

    try {
      // Enregistrer la réponse
      const { data: responseData, error: responseError } = await supabase
        .from('social_message_responses')
        .insert([{
          social_message_id: selectedMessage.id,
          user_id: user?.id,
          content: responseContent,
          status: 'pending'
        }])
        .select()
        .single();

      if (responseError) throw responseError;

      // TODO: Envoyer réellement via l'API de la plateforme
      // Pour l'instant, on simule
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour le statut
      await supabase
        .from('social_message_responses')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', responseData.id);

      // Marquer le message comme lu
      await handleMarkAsRead(selectedMessage.id, true);

      showToast('Réponse envoyée', 'success');
      setResponseContent('');
      setIsResponseModalOpen(false);
      loadMessages();
    } catch (error: any) {
      showToast('Erreur lors de l\'envoi', 'error');
    }
  };

  const handleSaveResponse = async () => {
    if (!selectedSavedResponse || !responseContent.trim()) return;

    try {
      const { error } = await supabase
        .from('social_saved_responses')
        .upsert({
          id: selectedSavedResponse.id === 'new' ? undefined : selectedSavedResponse.id,
          user_id: user?.id,
          name: selectedSavedResponse.name,
          content: responseContent,
          category: selectedSavedResponse.category,
          platform: selectedSavedResponse.platform as Platform | undefined,
          tags: selectedSavedResponse.tags,
          is_active: true
        });

      if (error) throw error;
      showToast('Réponse enregistrée', 'success');
      setIsSavedResponseModalOpen(false);
      loadSavedResponses();
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    const icons = {
      linkedin: '💼',
      twitter: '🐦',
      instagram: '📷',
      facebook: '👥',
      tiktok: '🎵'
    };
    return icons[platform] || '📱';
  };

  const getPriorityColor = (priority: Priority) => {
    const colors = {
      low: 'slate',
      normal: 'blue',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority];
  };

  const getTypeLabel = (type: MessageType) => {
    const labels = {
      comment: 'Commentaire',
      direct_message: 'Message privé',
      mention: 'Mention',
      review: 'Avis',
      story_reply: 'Réponse story'
    };
    return labels[type];
  };

  const unreadCount = messages.filter(m => !m.is_read).length;
  const assignedCount = messages.filter(m => m.assigned_to === user?.id).length;

  return (
    <PageLayout
      header={{
        icon: Inbox,
        title: "Inbox Social Media",
        description: "Gérez tous vos messages et commentaires en un seul endroit",
        rightActions: [
          {
            label: "Nouvelle réponse",
            icon: Plus,
            onClick: () => {
              setSelectedSavedResponse({ id: 'new', name: '', content: '', usage_count: 0 });
              setResponseContent('');
              setIsSavedResponseModalOpen(true);
            },
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="flex gap-6 h-full">
        {/* Sidebar - Liste des messages */}
        <div className="w-96 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Filtres */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
            <div className="grid grid-cols-2 gap-2">
              <Dropdown
                value={filterPlatform}
                onChange={(value) => setFilterPlatform(value as any)}
                options={[
                  { value: 'all', label: 'Toutes plateformes' },
                  { value: 'linkedin', label: 'LinkedIn' },
                  { value: 'twitter', label: 'Twitter/X' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'tiktok', label: 'TikTok' }
                ]}
              />
              <Dropdown
                value={filterType}
                onChange={(value) => setFilterType(value as any)}
                options={[
                  { value: 'all', label: 'Tous types' },
                  { value: 'comment', label: 'Commentaires' },
                  { value: 'direct_message', label: 'Messages' },
                  { value: 'mention', label: 'Mentions' },
                  { value: 'review', label: 'Avis' }
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Dropdown
                value={filterPriority}
                onChange={(value) => setFilterPriority(value as any)}
                options={[
                  { value: 'all', label: 'Toutes priorités' },
                  { value: 'low', label: 'Basse' },
                  { value: 'normal', label: 'Normale' },
                  { value: 'high', label: 'Haute' },
                  { value: 'urgent', label: 'Urgente' }
                ]}
              />
              <Dropdown
                value={filterStatus}
                onChange={(value) => setFilterStatus(value as any)}
                options={[
                  { value: 'all', label: 'Tous' },
                  { value: 'unread', label: `Non lus (${unreadCount})` },
                  { value: 'assigned', label: `Assignés (${assignedCount})` },
                  { value: 'archived', label: 'Archivés' }
                ]}
              />
            </div>
          </div>

          {/* Liste des messages */}
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Inbox size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun message</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message);
                      if (!message.is_read) {
                        handleMarkAsRead(message.id, true);
                      }
                    }}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500 ${
                      selectedMessage?.id === message.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                        : message.is_read
                        ? 'bg-white dark:bg-slate-800'
                        : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getPlatformIcon(message.platform)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {message.sender_name}
                          </span>
                          {!message.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                          {message.is_important && (
                            <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getPriorityColor(message.priority) as any} className="text-xs">
                            {getTypeLabel(message.message_type)}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(message.received_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone principale - Détails du message */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {selectedMessage ? (
            <>
              {/* En-tête du message */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {selectedMessage.sender_avatar_url ? (
                      <img
                        src={selectedMessage.sender_avatar_url}
                        alt={selectedMessage.sender_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-2xl">
                        {getPlatformIcon(selectedMessage.platform)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                        {selectedMessage.sender_name}
                      </h3>
                      {selectedMessage.sender_username && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          @{selectedMessage.sender_username}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="blue">{selectedMessage.platform}</Badge>
                        <Badge variant={getPriorityColor(selectedMessage.priority) as any}>
                          {getTypeLabel(selectedMessage.message_type)}
                        </Badge>
                        {selectedMessage.sentiment && (
                          <Badge
                            variant={
                              selectedMessage.sentiment === 'positive'
                                ? 'green'
                                : selectedMessage.sentiment === 'negative'
                                ? 'red'
                                : 'slate'
                            }
                          >
                            {selectedMessage.sentiment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetPriority(selectedMessage.id, 'urgent')}
                      title="Urgent"
                    >
                      <AlertCircle size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(selectedMessage.id, !selectedMessage.is_archived)}
                      title={selectedMessage.is_archived ? 'Désarchiver' : 'Archiver'}
                    >
                      <Archive size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAssign(selectedMessage.id, selectedMessage.assigned_to ? undefined : user?.id)}
                      title={selectedMessage.assigned_to ? 'Retirer assignation' : 'M\'assigner'}
                    >
                      <User size={18} />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(selectedMessage.received_at).toLocaleString('fr-FR')}
                </div>
              </div>

              {/* Contenu du message */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                    {selectedMessage.content}
                  </p>
                </div>

                {selectedMessage.media_urls && selectedMessage.media_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {selectedMessage.media_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Media ${index + 1}`}
                        className="rounded-lg w-full h-auto"
                      />
                    ))}
                  </div>
                )}

                {/* Historique des réponses */}
                {selectedMessage.responses && selectedMessage.responses.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Réponses</h4>
                    {selectedMessage.responses.map((response) => (
                      <div
                        key={response.id}
                        className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {response.user?.name || 'Utilisateur'}
                          </span>
                          <Badge
                            variant={
                              response.status === 'sent'
                                ? 'green'
                                : response.status === 'failed'
                                ? 'red'
                                : 'blue'
                            }
                            className="text-xs"
                          >
                            {response.status === 'sent' ? 'Envoyé' : response.status === 'failed' ? 'Échoué' : 'En attente'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{response.content}</p>
                        {response.sent_at && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {new Date(response.sent_at).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zone de réponse */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex gap-2 mb-3">
                  {savedResponses.slice(0, 3).map((saved) => (
                    <Button
                      key={saved.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResponseContent(saved.content);
                        setIsResponseModalOpen(true);
                      }}
                    >
                      {saved.name}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSavedResponseModalOpen(true)}
                  >
                    Voir toutes les réponses
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    placeholder="Tapez votre réponse..."
                    rows={3}
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                    onClick={() => setIsResponseModalOpen(true)}
                    disabled={!responseContent.trim()}
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
                <Inbox size={48} className="mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un message pour voir les détails</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de réponse */}
      <Modal
        isOpen={isResponseModalOpen}
        onClose={() => setIsResponseModalOpen(false)}
        title="Envoyer une réponse"
        size="lg"
      >
        <div className="space-y-4">
          <Textarea
            label="Réponse"
            value={responseContent}
            onChange={(e) => setResponseContent(e.target.value)}
            rows={6}
            placeholder="Tapez votre réponse..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsResponseModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSendResponse} icon={Send}>
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal réponses enregistrées */}
      <Modal
        isOpen={isSavedResponseModalOpen}
        onClose={() => setIsSavedResponseModalOpen(false)}
        title="Réponses enregistrées"
        size="lg"
      >
        <div className="space-y-4">
          {savedResponses.map((saved) => (
            <div
              key={saved.id}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
              onClick={() => {
                setResponseContent(saved.content);
                setIsSavedResponseModalOpen(false);
                setIsResponseModalOpen(true);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900 dark:text-white">{saved.name}</span>
                <span className="text-xs text-slate-500">Utilisé {saved.usage_count} fois</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {saved.content}
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </PageLayout>
  );
};

