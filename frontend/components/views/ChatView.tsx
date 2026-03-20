
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Hash, Search, Plus, Phone, Video, Info, MoreHorizontal, 
  Smile, Paperclip, Mic, Send, Image, FileText, FolderPlus, UserPlus, X, MessageSquare
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { ChatChannel, ChatMessage } from '../../types';
import { useApp } from '../contexts/AppContext';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { PageLayout } from '../ui/PageLayout';
import { generateUniqueId } from '../../lib/utils';
import { generateAvatar } from '../../lib/utils/avatar';

export const ChatView: React.FC = () => {
  const { showToast, chatMessages, addChatMessage, chatChannels } = useApp();
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Créer un canal par défaut si aucun canal n'existe
  const defaultChannel: ChatChannel = useMemo(() => ({
    id: 'default-general',
    name: 'Général',
    type: 'channel',
    unread: 0
  }), []);

  // Set default channel
  useEffect(() => {
     if (chatChannels.length > 0) {
        // Si un canal est sélectionné mais n'existe plus dans la liste, ou si aucun canal n'est sélectionné
        if (!selectedChannel || !chatChannels.find(c => c.id === selectedChannel.id)) {
           setSelectedChannel(chatChannels[0]);
        }
     } else {
        // Utiliser le canal par défaut si aucun canal n'existe
        if (!selectedChannel || selectedChannel.id !== defaultChannel.id) {
           setSelectedChannel(defaultChannel);
        }
     }
  }, [chatChannels, defaultChannel, selectedChannel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, selectedChannel]);

  // Fermer les menus quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && pendingAttachments.length === 0) || !selectedChannel) return;
    
    // Use Context which handles Supabase Insert
    addChatMessage({
      id: generateUniqueId(),
      senderId: '1', // Current user ID (In real app, use auth user ID)
      senderName: 'Moi',
      senderAvatar: generateAvatar('Me', 'b6e3f4'),
      content: messageText || '',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isMe: true,
      reactions: [],
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined
    });
    
    setMessageText('');
    setPendingAttachments([]);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
     // In a real app, you would dispatch an action to update the store/Supabase
     showToast(`Réaction ${emoji} ajoutée`, 'success');
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          setPendingAttachments(prev => [...prev, file.name]);
          showToast(`Image "${file.name}" prête à être envoyée`, 'success');
        };
        reader.readAsDataURL(file);
      } else {
        showToast(`Le fichier "${file.name}" n'est pas une image`, 'error');
      }
    });
    
    // Réinitialiser l'input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      setPendingAttachments(prev => [...prev, file.name]);
      showToast(`Fichier "${file.name}" prêt à être envoyé`, 'success');
    });
    
    // Réinitialiser l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecord = () => {
    showToast('Enregistrement vocal (fonctionnalité à venir)', 'info');
  };

  const handleCreateChannel = () => {
    setShowPlusMenu(false);
    showToast('Création de canal (fonctionnalité à venir)', 'info');
  };

  const handleCreateDM = () => {
    setShowPlusMenu(false);
    showToast('Création de message direct (fonctionnalité à venir)', 'info');
  };

  // Afficher la vue par défaut même si aucun canal n'existe
  if (!selectedChannel) {
     return <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">Chargement des canaux...</div>;
  }

  return (
    <PageLayout
      header={{
        icon: MessageSquare,
        iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        title: "Messagerie",
        description: "Communiquez avec votre équipe en temps réel",
        rightActions: [
          {
            icon: Plus,
            label: "Nouveau canal",
            variant: "primary",
            onClick: handleCreateChannel,
            title: "Créer un nouveau canal"
          }
        ]
      }}
      contentClassName="flex-1 flex"
    >
      <div className="flex-1 flex bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-700 flex flex-col hidden md:flex">
         {/* Sidebar Header */}
         <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-800 dark:text-white text-lg mb-4 px-2">Équipe agence</h2>
            <SearchBar 
              placeholder="Rechercher..." 
            />
         </div>

         {/* Channel List */}
         <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div className="mb-6">
               <div className="flex justify-between items-center px-2 mb-2 group">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Canaux</h3>
                  <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-500 p-1 h-auto" icon={Plus} />
               </div>
               <div className="space-y-0.5">
                  {(chatChannels.filter(c => c.type === 'channel').length > 0 
                     ? chatChannels.filter(c => c.type === 'channel')
                     : [defaultChannel]
                  ).map(channel => (
                     <Button 
                        key={channel.id}
                        variant="ghost"
                        onClick={() => setSelectedChannel(channel)}
                        className={`w-full !justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-500 ${
                           selectedChannel?.id === channel.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                     >
                        <div className="flex items-center gap-2">
                           <Hash size={16} className={selectedChannel?.id === channel.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                           <span>{channel.name}</span>
                        </div>
                        {channel.unread > 0 && (
                           <span className="bg-rose-500 text-white text-[10px] px-1.5 rounded-full font-bold">{channel.unread}</span>
                        )}
                     </Button>
                  ))}
               </div>
            </div>

            <div>
               <div className="flex justify-between items-center px-2 mb-2 group">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Messages directs</h3>
                  <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-500 p-1 h-auto" icon={Plus} />
               </div>
               <div className="space-y-0.5">
                  {chatChannels.filter(c => c.type === 'dm').map(dm => (
                     <Button 
                        key={dm.id}
                        variant="ghost"
                        onClick={() => setSelectedChannel(dm)}
                        className={`w-full !justify-start gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-500 ${
                           selectedChannel?.id === dm.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                     >
                        <div className="relative">
                           <img src={dm.avatar} className="w-5 h-5 rounded-md object-cover" alt={dm.name} />
                           <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 border border-white dark:border-slate-800 rounded-full ${
                              dm.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                           }`}></div>
                        </div>
                        <span>{dm.name}</span>
                     </Button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800">
         {/* Header */}
         <div className="h-16 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2">
               {selectedChannel.type === 'channel' ? <Hash size={20} className="text-slate-400 dark:text-slate-500" /> : null}
               <h3 className="font-bold text-slate-800 dark:text-white">{selectedChannel.name}</h3>
               {selectedChannel.type === 'channel' && <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 hidden sm:inline">Sujet : Général</span>}
            </div>
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
               <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" icon={Phone} />
               <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" icon={Video} />
               <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-2"></div>
               <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hidden sm:flex" icon={Info} />
            </div>
         </div>

         {/* Messages */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/30">
            {/* Date Divider */}
            <div className="flex items-center gap-4">
               <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
               <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Aujourd'hui</span>
               <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
            </div>

            {chatMessages.map((msg) => (
               <div key={msg.id} className={`flex gap-4 group ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="shrink-0">
                     <img src={msg.senderAvatar} className="w-10 h-10 rounded-xl object-cover" alt={msg.senderName} />
                  </div>
                  <div className={`max-w-2xl ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                     <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{msg.senderName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                     </div>
                     <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm group-hover:shadow-md transition-all duration-500 ${
                        msg.isMe ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-tr-none' : 'bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-tl-none'
                     }`}>
                        {msg.content}
                        
                        {/* Reaction Trigger */}
                        <div className={`absolute -bottom-3 ${msg.isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-all duration-500`}>
                           <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm p-1 flex gap-1">
                              <button onClick={() => handleAddReaction(msg.id, '👍')} className="hover:scale-125 transition-all duration-500">👍</button>
                              <button onClick={() => handleAddReaction(msg.id, '❤️')} className="hover:scale-125 transition-all duration-500">❤️</button>
                              <button onClick={() => handleAddReaction(msg.id, '😂')} className="hover:scale-125 transition-all duration-500">😂</button>
                           </div>
                        </div>
                     </div>
                     
                     {/* Attachments */}
                     {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                           {msg.attachments.map((att, idx) => {
                              const isImage = att.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
                              return isImage ? (
                                 <div key={idx} className="relative">
                                    <img 
                                       src={att.startsWith('data:') ? att : `/${att}`} 
                                       alt={att}
                                       className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                                       onError={(e) => {
                                          // Si l'image ne charge pas, afficher comme fichier
                                          e.currentTarget.style.display = 'none';
                                       }}
                                    />
                                 </div>
                              ) : (
                                 <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-500">
                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded flex items-center justify-center font-bold">
                                       <FileText size={14} />
                                    </div>
                                    <div>
                                       <p className="max-w-[150px] truncate">{att}</p>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               </div>
            ))}
            <div ref={messagesEndRef} />
         </div>

         {/* Input Area */}
         <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 relative">
            {/* Pièces jointes en attente */}
            {pendingAttachments.length > 0 && (
               <div className="mb-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((att, index) => (
                     <div key={index} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        <Paperclip size={12} />
                        <span className="max-w-[150px] truncate">{att}</span>
                        <button
                           onClick={() => handleRemoveAttachment(index)}
                           className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500"
                        >
                           <X size={14} />
                        </button>
                     </div>
                  ))}
               </div>
            )}

            <form onSubmit={handleSendMessage} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-2 focus-within:border-indigo-300 dark:focus-within:border-indigo-500 transition-all duration-500">
               <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message #${selectedChannel.name}`}
                  className="w-full bg-transparent border-none focus:outline-none text-sm px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
               />
               <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-200 dark:border-slate-600 mt-2">
                  <div className="flex gap-2 text-slate-400 dark:text-slate-500 relative">
                     {/* Menu Plus */}
                     <div className="relative" ref={plusMenuRef}>
                        <Button 
                           type="button" 
                           variant="ghost" 
                           className="p-1 h-auto hover:text-indigo-600 hover:bg-indigo-50" 
                           icon={Plus}
                           onClick={() => setShowPlusMenu(!showPlusMenu)}
                        />
                        {showPlusMenu && (
                           <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
                              <button
                                 onClick={handleCreateChannel}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-all duration-500"
                              >
                                 <FolderPlus size={16} />
                                 <span>Nouveau canal</span>
                              </button>
                              <button
                                 onClick={handleCreateDM}
                                 className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-all duration-500"
                              >
                                 <UserPlus size={16} />
                                 <span>Nouveau message direct</span>
                              </button>
                           </div>
                        )}
                     </div>

                     {/* Upload Image */}
                     <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                     />
                     <Button 
                        type="button" 
                        variant="ghost" 
                        className="p-1 h-auto hover:text-indigo-600 hover:bg-indigo-50" 
                        icon={Image}
                        onClick={() => imageInputRef.current?.click()}
                     />

                     {/* Upload File */}
                     <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                     />
                     <Button 
                        type="button" 
                        variant="ghost" 
                        className="p-1 h-auto hover:text-indigo-600 hover:bg-indigo-50 hidden sm:inline-flex" 
                        icon={Paperclip}
                        onClick={() => fileInputRef.current?.click()}
                     />

                     {/* Emoji Picker */}
                     <div className="relative" ref={emojiPickerRef}>
                        <Button 
                           type="button" 
                           variant="ghost" 
                           className="p-1 h-auto hover:text-indigo-600 hover:bg-indigo-50 hidden sm:inline-flex" 
                           icon={Smile}
                           onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        />
                        {showEmojiPicker && (
                           <div className="absolute bottom-full left-0 mb-2 z-50">
                              <EmojiPicker
                                 onEmojiClick={handleEmojiClick}
                                 searchDisabled={false}
                                 skinTonesDisabled={false}
                                 width={350}
                                 height={400}
                                 previewConfig={{ showPreview: false }}
                              />
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="flex gap-2 items-center">
                     <Button 
                        type="button" 
                        variant="ghost" 
                        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hidden sm:inline-flex" 
                        icon={Mic}
                        onClick={handleVoiceRecord}
                     />
                     <Button 
                        type="submit" 
                        disabled={!messageText.trim() && pendingAttachments.length === 0}
                        className="bg-indigo-600 dark:bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 h-auto w-auto"
                     >
                        <Send size={16} />
                     </Button>
                  </div>
               </div>
            </form>
         </div>
      </div>
      </div>
    </PageLayout>
  );
};
