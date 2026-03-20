import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, AtSign, Reply, Smile, Paperclip, Download, Image as ImageIcon, File } from 'lucide-react';
import { TaskComment, User } from '../../types';
import { useTaskComments } from '../../lib/supabase/hooks/useTaskComments';
import { useCommentReactions } from '../../lib/supabase/hooks/useCommentReactions';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { uploadFile } from '../../lib/utils/upload';
import { getUserAvatar } from '../../lib/utils/avatar';

interface TaskCommentsProps {
  taskId: string;
  currentUserId?: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '💯', '✨', '😊', '🚀'];

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, currentUserId }) => {
  const { getTaskComments, addTaskComment, deleteTaskComment } = useTaskComments();
  const { toggleReaction, getCommentReactions } = useCommentReactions();
  const { users } = useUsers();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, any[]>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  useEffect(() => {
    // Load reactions for all comments
    const loadReactions = async () => {
      const reactionsMap: Record<string, any[]> = {};
      for (const comment of comments) {
        const reactions = await getCommentReactions(comment.id);
        reactionsMap[comment.id] = reactions;
        if (comment.replies) {
          for (const reply of comment.replies) {
            const replyReactions = await getCommentReactions(reply.id);
            reactionsMap[reply.id] = replyReactions;
          }
        }
      }
      setCommentReactions(reactionsMap);
    };
    if (comments.length > 0) {
      loadReactions();
    }
  }, [comments]);

  const loadComments = async () => {
    const taskComments = await getTaskComments(taskId);
    setComments(taskComments);
  };

  const handleCommentChange = (value: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyContent(value);
    } else {
      setNewComment(value);
    }
    
    const textarea = isReply ? replyTextareaRef.current : textareaRef.current;
    const cursorPos = textarea?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      if (query.length === 0 || /^[a-zA-Z0-9_]*$/.test(query)) {
        setMentionIndex(lastAtIndex);
        setMentionQuery(query);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User, isReply: boolean = false) => {
    if (mentionIndex === -1) return;
    
    const currentText = isReply ? replyContent : newComment;
    const beforeMention = currentText.substring(0, mentionIndex);
    const afterMention = currentText.substring(mentionIndex + mentionQuery.length + 1);
    const updatedComment = `${beforeMention}@${user.name} ${afterMention}`;
    
    if (isReply) {
      setReplyContent(updatedComment);
    } else {
      setNewComment(updatedComment);
    }
    
    setShowMentions(false);
    setMentionQuery('');
    setMentionIndex(-1);
    
    setTimeout(() => {
      const textarea = isReply ? replyTextareaRef.current : textareaRef.current;
      textarea?.focus();
      const newPos = beforeMention.length + user.name.length + 2;
      textarea?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const userName = match[1];
      const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
      if (user) {
        mentions.push(user.id);
      }
    }
    
    return mentions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && attachments.length === 0) return;

    setUploading(true);
    try {
      const mentions = extractMentions(newComment);
      const uploadedUrls: string[] = [];

      // Upload attachments
      for (const file of attachments) {
        const result = await uploadFile(file, 'comment-attachments');
        if (result.url) {
          uploadedUrls.push(result.url);
        }
      }

      const comment = await addTaskComment(taskId, newComment, mentions, uploadedUrls);
      
      if (comment) {
        await loadComments();
        setNewComment('');
        setAttachments([]);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim() && replyAttachments.length === 0) return;

    setUploading(true);
    try {
      const mentions = extractMentions(replyContent);
      const uploadedUrls: string[] = [];

      // Upload attachments
      for (const file of replyAttachments) {
        const result = await uploadFile(file, 'comment-attachments');
        if (result.url) {
          uploadedUrls.push(result.url);
        }
      }

      const comment = await addTaskComment(taskId, replyContent, mentions, uploadedUrls, parentId);
      
      if (comment) {
        await loadComments();
        setReplyContent('');
        setReplyAttachments([]);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      await toggleReaction(commentId, emoji);
      await loadComments();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon size={16} />;
    }
    return <File size={16} />;
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const renderComment = (comment: TaskComment, isReply: boolean = false) => {
    const reactions = commentReactions[comment.id] || [];
    const groupedReactions = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.userId);
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: string[] }>);

    return (
      <div key={comment.id} className={`bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 ${isReply ? 'ml-8 mt-2' : ''}`}>
        <div className="flex items-start gap-3">
          <img
            src={comment.userAvatar || getUserAvatar(undefined, comment.userId)}
            alt={comment.userName || 'User'}
            className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-600 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {comment.userName || 'Utilisateur inconnu'}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-2">
              {comment.content.split(/(@\w+)/g).map((part, i) => {
                if (part.startsWith('@')) {
                  const userName = part.substring(1);
                  const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                  return (
                    <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      @{user?.name || userName}
                    </span>
                  );
                }
                return part;
              })}
            </p>

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {comment.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-500"
                  >
                    {getFileIcon(url)}
                    <span className="truncate max-w-[150px]">{url.split('/').pop()}</span>
                    <Download size={12} />
                  </a>
                ))}
              </div>
            )}

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {Object.values(groupedReactions).map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReaction(comment.id, reaction.emoji)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all duration-500 ${
                      reaction.users.includes(currentUserId || '')
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-slate-600 dark:text-slate-300">{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-500"
              >
                <Smile size={14} />
                <span>Réagir</span>
              </button>
              {!isReply && (
                <button
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setTimeout(() => replyTextareaRef.current?.focus(), 0);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-500"
                >
                  <Reply size={14} />
                  <span>Répondre</span>
                </button>
              )}
              {comment.userId === currentUserId && (
                <button
                  onClick={() => deleteTaskComment(comment.id).then(loadComments)}
                  className="text-slate-400 hover:text-red-500 transition-all duration-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker === comment.id && (
              <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleReaction(comment.id, emoji);
                      setShowEmojiPicker(null);
                    }}
                    className="text-lg hover:scale-125 transition-all duration-500"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Textarea
                    ref={replyTextareaRef}
                    value={replyContent}
                    onChange={(e) => handleCommentChange(e.target.value, true)}
                    placeholder="Écrire une réponse..."
                    className="pr-10 min-h-[60px] text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleReplySubmit(comment.id);
                      }
                      if (e.key === 'Escape') {
                        setReplyingTo(null);
                        setReplyContent('');
                      }
                    }}
                  />
                  {showMentions && filteredUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => insertMention(user, true)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {user.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setReplyAttachments([...replyAttachments, ...files].slice(0, 5));
                      }}
                      className="hidden"
                    />
                    <Button size="sm" variant="ghost" type="button" icon={Paperclip}>
                      {replyAttachments.length > 0 ? `${replyAttachments.length} fichier(s)` : 'Pièce jointe'}
                    </Button>
                  </label>
                  {replyAttachments.length > 0 && (
                    <div className="flex gap-1">
                      {replyAttachments.map((file, idx) => (
                        <span key={idx} className="text-xs text-slate-500 flex items-center gap-1">
                          {file.name}
                          <button
                            type="button"
                            onClick={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                      setReplyAttachments([]);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReplySubmit(comment.id)}
                    disabled={uploading || (!replyContent.trim() && replyAttachments.length === 0)}
                    icon={Send}
                  >
                    Répondre
                  </Button>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-2">
                {comment.replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-slate-600 dark:text-slate-400" />
        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
          Commentaires ({comments.length})
        </h4>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {comments.map((comment) => renderComment(comment))}
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Ajouter un commentaire... Utilisez @ pour mentionner"
            className="pr-10 min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAttachments([...attachments, ...files].slice(0, 5));
              }}
              className="hidden"
            />
            <Button size="sm" variant="ghost" type="button" icon={Paperclip}>
              {attachments.length > 0 ? `${attachments.length} fichier(s)` : 'Pièce jointe'}
            </Button>
          </label>
          {attachments.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {attachments.map((file, idx) => (
                <span key={idx} className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {file.name}
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex-1" />
          <Button
            type="submit"
            size="sm"
            icon={Send}
            disabled={uploading || (!newComment.trim() && attachments.length === 0)}
          >
            {uploading ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </form>
    </div>
  );
};
