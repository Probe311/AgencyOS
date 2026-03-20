import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Save, Users, MessageSquare, History, FileCheck, X, CheckCircle2,
  MoreVertical, Download, Share2, Eye, Edit2, Clock, User, Send, Trash2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  Link, Image as ImageIcon, Table, Heading1, Heading2, Heading3, Type, Palette
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
import { DocumentEditorService, DocumentVersion, DocumentComment, DocumentCollaborator } from '../../lib/services/documentEditorService';

interface CollaborativeDocumentEditorProps {
  documentId: string;
  onClose?: () => void;
}

export const CollaborativeDocumentEditor: React.FC<CollaborativeDocumentEditorProps> = ({
  documentId,
  onClose
}) => {
  const { showToast, user } = useApp();
  const [document, setDocument] = useState<any>(null);
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [collaborators, setCollaborators] = useState<DocumentCollaborator[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadDocument();
    loadCollaborators();
    loadComments();
    loadVersions();

    // Mettre à jour la position du curseur toutes les 2 secondes
    const cursorInterval = setInterval(() => {
      updateCursorPosition();
    }, 2000);

    // Écouter les changements en temps réel
    const subscription = supabase
      .channel(`document:${documentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`
      }, (payload) => {
        if (payload.new) {
          setDocument(payload.new as any);
          if ((payload.new as any).html_content) {
            setHtmlContent((payload.new as any).html_content);
            if (editorRef.current) {
              editorRef.current.innerHTML = (payload.new as any).html_content;
            }
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'document_collaborators',
        filter: `document_id=eq.${documentId}`
      }, () => {
        loadCollaborators();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'document_comments',
        filter: `document_id=eq.${documentId}`
      }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      clearInterval(cursorInterval);
      subscription.unsubscribe();
      DocumentEditorService.removeCollaborator(documentId, user?.id || '');
    };
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      setDocument(data);
      setHtmlContent(data.html_content || '');
      setContent(data.content || '');
      
      if (editorRef.current) {
        editorRef.current.innerHTML = data.html_content || '';
      }
    } catch (error: any) {
      showToast('Erreur lors du chargement du document', 'error');
    }
  };

  const loadCollaborators = async () => {
    try {
      const collaborators = await DocumentEditorService.getActiveCollaborators(documentId);
      setCollaborators(collaborators.filter(c => c.user_id !== user?.id));
    } catch (error: any) {
      console.error('Error loading collaborators:', error);
    }
  };

  const loadComments = async () => {
    try {
      const comments = await DocumentEditorService.getComments(documentId);
      setComments(comments);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    }
  };

  const loadVersions = async () => {
    try {
      const versions = await DocumentEditorService.getVersions(documentId);
      setVersions(versions);
    } catch (error: any) {
      console.error('Error loading versions:', error);
    }
  };

  const updateCursorPosition = async () => {
    if (!editorRef.current || !user?.id) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const start = range.startOffset;
      const end = range.endOffset;
      const text = selection.toString();

      await DocumentEditorService.updateCollaboratorCursor(
        documentId,
        user.id,
        start,
        start,
        end,
        false
      );
    }
  };

  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;

    const newHtmlContent = editorRef.current.innerHTML;
    setHtmlContent(newHtmlContent);

    // Auto-save après 2 secondes d'inactivité
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveDocument(newHtmlContent);
    }, 2000);
  }, [documentId]);

  const saveDocument = async (html?: string) => {
    setIsSaving(true);
    try {
      const htmlToSave = html || htmlContent;
      const contentToSave = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: editorRef.current?.innerText || ''
              }
            ]
          }
        ]
      };

      await DocumentEditorService.createVersion(
        documentId,
        contentToSave,
        htmlToSave,
        'Modification automatique'
      );

      showToast('Document sauvegardé', 'success');
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSelectionStart(range.startOffset);
      setSelectionEnd(range.endOffset);
      setSelectedText(selection.toString());
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id) return;

    try {
      await DocumentEditorService.addComment(
        documentId,
        newComment,
        user.id,
        undefined,
        undefined,
        selectionStart,
        selectionEnd,
        selectedText
      );

      setNewComment('');
      setSelectedText('');
      loadComments();
      showToast('Commentaire ajouté', 'success');
    } catch (error: any) {
      showToast('Erreur lors de l\'ajout du commentaire', 'error');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Restaurer cette version ? La version actuelle sera sauvegardée.')) return;

    try {
      await DocumentEditorService.restoreVersion(versionId, documentId);
      await loadDocument();
      await loadVersions();
      showToast('Version restaurée', 'success');
    } catch (error: any) {
      showToast('Erreur lors de la restauration', 'error');
    }
  };

  const formatToolbar = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
    editorRef.current?.focus();
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Image';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      range.insertNode(img);
      handleContentChange();
    } else if (editorRef.current) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Image';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      editorRef.current.appendChild(img);
      handleContentChange();
    }
    
    setImageUrl('');
    setIsImageModalOpen(false);
  };

  const insertTable = () => {
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.margin = '16px 0';
    table.style.border = '1px solid #e2e8f0';
    
    for (let i = 0; i < tableRows; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < tableCols; j++) {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        cell.style.border = '1px solid #e2e8f0';
        cell.style.padding = '8px';
        cell.style.textAlign = 'left';
        if (i === 0) {
          cell.style.backgroundColor = '#f8f9fa';
          cell.style.fontWeight = '600';
        }
        cell.textContent = i === 0 ? `En-tête ${j + 1}` : '';
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    
    if (range) {
      range.insertNode(table);
    } else if (editorRef.current) {
      editorRef.current.appendChild(table);
    }
    
    handleContentChange();
    setIsTableModalOpen(false);
    setTableRows(3);
    setTableCols(3);
  };

  const formatHeading = (level: number) => {
    document.execCommand('formatBlock', false, `h${level}`);
    handleContentChange();
    editorRef.current?.focus();
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Chargement du document...</div>
      </div>
    );
  }

  return (
    <PageLayout
      header={{
        icon: FileText,
        title: document.name,
        description: "Éditeur collaboratif de documents",
        rightActions: [
          {
            label: isSaving ? "Sauvegarde..." : "Sauvegarder",
            icon: Save,
            onClick: () => saveDocument(),
            variant: 'primary',
            disabled: isSaving
          },
          {
            label: `${collaborators.length} collaborateur${collaborators.length > 1 ? 's' : ''}`,
            icon: Users,
            onClick: () => {},
            variant: 'outline'
          },
          {
            label: "Commentaires",
            icon: MessageSquare,
            onClick: () => setIsCommentsOpen(true),
            variant: 'outline'
          },
          {
            label: "Versions",
            icon: History,
            onClick: () => setIsVersionsOpen(true),
            variant: 'outline'
          }
        ]
      }}
    >
      <div className="flex h-[calc(100vh-200px)]">
        {/* Éditeur principal */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Barre d'outils */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1 flex-wrap">
            {/* Titres */}
            <Button
              variant="ghost"
              size="sm"
              icon={Heading1}
              onClick={() => formatHeading(1)}
              title="Titre 1"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Heading2}
              onClick={() => formatHeading(2)}
              title="Titre 2"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Heading3}
              onClick={() => formatHeading(3)}
              title="Titre 3"
            />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
            
            {/* Formatage */}
            <Button
              variant="ghost"
              size="sm"
              icon={Bold}
              onClick={() => formatToolbar('bold')}
              title="Gras"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Italic}
              onClick={() => formatToolbar('italic')}
              title="Italique"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Underline}
              onClick={() => formatToolbar('underline')}
              title="Souligné"
            />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
            
            {/* Alignement */}
            <Button
              variant="ghost"
              size="sm"
              icon={AlignLeft}
              onClick={() => formatToolbar('justifyLeft')}
              title="Aligner à gauche"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={AlignCenter}
              onClick={() => formatToolbar('justifyCenter')}
              title="Centrer"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={AlignRight}
              onClick={() => formatToolbar('justifyRight')}
              title="Aligner à droite"
            />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
            
            {/* Listes */}
            <Button
              variant="ghost"
              size="sm"
              icon={List}
              onClick={() => formatToolbar('insertUnorderedList')}
              title="Liste à puces"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={ListOrdered}
              onClick={() => formatToolbar('insertOrderedList')}
              title="Liste numérotée"
            />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
            
            {/* Insertion */}
            <Button
              variant="ghost"
              size="sm"
              icon={Link}
              onClick={() => {
                const url = prompt('URL du lien:');
                if (url) formatToolbar('createLink', url);
              }}
              title="Insérer un lien"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={ImageIcon}
              onClick={() => setIsImageModalOpen(true)}
              title="Insérer une image"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Table}
              onClick={() => setIsTableModalOpen(true)}
              title="Insérer un tableau"
            />
          </div>

          {/* Zone d'édition */}
          <div className="flex-1 overflow-auto p-8">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              className="min-h-full outline-none prose prose-slate dark:prose-invert max-w-none focus:outline-none"
              style={{
                fontSize: '16px',
                lineHeight: '1.6'
              }}
              suppressContentEditableWarning
            />
          </div>

          {/* Indicateurs de collaborateurs */}
          {collaborators.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Collaborateurs actifs:</span>
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                    {collab.users?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {collab.users?.name || 'Utilisateur'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Commentaires */}
      <Modal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        title="Commentaires"
        size="lg"
      >
        <div className="space-y-4">
          {/* Nouveau commentaire */}
          {selectedText && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Texte sélectionné:</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">"{selectedText}"</p>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={3}
            />
            <Button
              variant="primary"
              icon={Send}
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              Envoyer
            </Button>
          </div>

          {/* Liste des commentaires */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      {comment.users?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {comment.users?.name || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(comment.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {comment.resolved ? (
                    <Badge variant="green">Résolu</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await DocumentEditorService.resolveComment(comment.id, user?.id || '');
                        loadComments();
                      }}
                    >
                      Résoudre
                    </Button>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-2">{comment.content}</p>
                {comment.selection_text && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-sm italic">
                    "{comment.selection_text}"
                  </div>
                )}

                {/* Réponses */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-8 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">
                            {reply.users?.name || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(reply.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal Versions */}
      <Modal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        title="Historique des versions"
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {versions.map((version) => (
            <div
              key={version.id}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={version.is_current ? 'green' : 'slate'}>
                      Version {version.version_number}
                      {version.is_current && ' (Actuelle)'}
                    </Badge>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(version.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {version.change_summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {version.change_summary}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Par {version.created_by ? 'Utilisateur' : 'Système'}
                  </p>
                </div>
                {!version.is_current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreVersion(version.id)}
                  >
                    Restaurer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </PageLayout>
  );
};

