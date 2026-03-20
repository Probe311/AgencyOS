import React, { useState, useRef, useCallback } from 'react';
import { GripVertical, X, Plus, Type, Image, MousePointerClick, Minus, Eye, Code, Save, Smartphone, Monitor, Tablet, Mail, Film, FileCode, Columns, Layout, Palette, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Dropdown } from '../ui/Dropdown';

export interface EmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'separator' | 'spacer' | 'form' | 'video' | 'html' | 'columns';
  content: string;
  styles?: Record<string, string>;
  props?: Record<string, any>;
  columns?: EmailBlock[][]; // Pour les blocs colonnes
}

interface EmailVisualEditorProps {
  initialHtml?: string;
  onSave: (html: string) => void;
  onClose: () => void;
  variables?: Array<{ name: string; description: string; example: string }>;
}

const BLOCK_TEMPLATES: Record<string, Partial<EmailBlock>> = {
  text: {
    type: 'text',
    content: '<p>Votre texte ici</p>',
    styles: { padding: '16px', fontSize: '16px', lineHeight: '1.5', color: '#333333' },
  },
  image: {
    type: 'image',
    content: '',
    props: { src: '', alt: 'Image', width: '100%' },
    styles: { padding: '16px', textAlign: 'center' },
  },
  button: {
    type: 'button',
    content: 'Cliquez ici',
    styles: {
      padding: '12px 24px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      borderRadius: '6px',
      textDecoration: 'none',
      display: 'inline-block',
      fontWeight: '600',
    },
    props: { href: '#', target: '_blank' },
  },
  separator: {
    type: 'separator',
    content: '',
    styles: { borderTop: '1px solid #e2e8f0', margin: '16px 0' },
  },
  spacer: {
    type: 'spacer',
    content: '',
    styles: { height: '32px' },
  },
  form: {
    type: 'form',
    content: '',
    props: { action: '#', method: 'post' },
    styles: { padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' },
  },
  video: {
    type: 'video',
    content: '',
    props: { src: '', width: '100%', height: 'auto', controls: true },
    styles: { padding: '16px', textAlign: 'center' },
  },
  html: {
    type: 'html',
    content: '<div>Code HTML personnalisé</div>',
    styles: { padding: '16px' },
  },
  columns: {
    type: 'columns',
    content: '',
    props: { columnCount: 2 },
    columns: [[], []],
    styles: { padding: '16px', display: 'grid', gap: '16px' },
  },
};

export const EmailVisualEditor: React.FC<EmailVisualEditorProps> = ({
  initialHtml = '',
  onSave,
  onClose,
  variables = [],
}) => {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewClient, setPreviewClient] = useState<'gmail' | 'outlook' | 'apple' | 'generic'>('generic');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isMultiPreviewOpen, setIsMultiPreviewOpen] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Thèmes prédéfinis
  const THEMES: Record<string, { name: string; colors: Record<string, string>; fonts: Record<string, string> }> = {
    default: {
      name: 'Par défaut',
      colors: {
        primary: '#4f46e5',
        secondary: '#64748b',
        background: '#ffffff',
        text: '#1e293b',
        border: '#e2e8f0',
      },
      fonts: {
        heading: 'Arial, sans-serif',
        body: 'Arial, sans-serif',
        size: '16px',
      },
    },
    modern: {
      name: 'Moderne',
      colors: {
        primary: '#0ea5e9',
        secondary: '#8b5cf6',
        background: '#f8fafc',
        text: '#0f172a',
        border: '#cbd5e1',
      },
      fonts: {
        heading: 'Inter, sans-serif',
        body: 'Inter, sans-serif',
        size: '16px',
      },
    },
    professional: {
      name: 'Professionnel',
      colors: {
        primary: '#1e40af',
        secondary: '#475569',
        background: '#ffffff',
        text: '#0f172a',
        border: '#94a3b8',
      },
      fonts: {
        heading: 'Georgia, serif',
        body: 'Georgia, serif',
        size: '14px',
      },
    },
    vibrant: {
      name: 'Vibrant',
      colors: {
        primary: '#f59e0b',
        secondary: '#ec4899',
        background: '#ffffff',
        text: '#1e293b',
        border: '#fbbf24',
      },
      fonts: {
        heading: 'Poppins, sans-serif',
        body: 'Poppins, sans-serif',
        size: '16px',
      },
    },
  };

  // Parser le HTML initial en blocs
  React.useEffect(() => {
    if (initialHtml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialHtml, 'text/html');
        const body = doc.body;
        const parsedBlocks: EmailBlock[] = [];

        Array.from(body.children).forEach((element, index) => {
          const block: EmailBlock = {
            id: `block-${Date.now()}-${index}`,
            type: 'text',
            content: element.outerHTML,
            styles: {},
          };

          if (element.tagName === 'IMG') {
            block.type = 'image';
            block.props = {
              src: (element as HTMLImageElement).src,
              alt: (element as HTMLImageElement).alt,
              width: (element as HTMLImageElement).width || '100%',
            };
            block.content = '';
          } else if (element.tagName === 'A' && element.querySelector('button, .button')) {
            block.type = 'button';
            const button = element.querySelector('button, .button') || element;
            block.content = button.textContent || '';
            block.props = {
              href: (element as HTMLAnchorElement).href || '#',
              target: (element as HTMLAnchorElement).target || '_blank',
            };
            block.styles = {
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
            };
          } else if (element.tagName === 'HR') {
            block.type = 'separator';
            block.content = '';
          }

          parsedBlocks.push(block);
        });

        if (parsedBlocks.length > 0) {
          setBlocks(parsedBlocks);
        } else {
          // Si pas de blocs, créer un bloc texte par défaut
          setBlocks([{
            id: `block-${Date.now()}`,
            type: 'text',
            content: '<p>Commencez à éditer votre email</p>',
            styles: {},
          }]);
        }
      } catch (error) {
        console.error('Erreur parsing HTML:', error);
        // Créer un bloc texte par défaut
        setBlocks([{
          id: `block-${Date.now()}`,
          type: 'text',
          content: initialHtml || '<p>Commencez à éditer votre email</p>',
          styles: {},
        }]);
      }
    } else {
      // Créer un bloc texte par défaut
      setBlocks([{
        id: `block-${Date.now()}`,
        type: 'text',
        content: '<p>Commencez à éditer votre email</p>',
        styles: {},
      }]);
    }
  }, [initialHtml]);

  const addBlock = useCallback((type: string) => {
    const template = BLOCK_TEMPLATES[type];
    if (!template) return;

    const newBlock: EmailBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: template.type as any,
      content: template.content || '',
      styles: { ...template.styles },
      props: { ...template.props },
    };

    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
  }, [blocks]);

  const removeBlock = useCallback((id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlock === id) {
      setSelectedBlock(null);
    }
  }, [blocks, selectedBlock]);

  const updateBlock = useCallback((id: string, updates: Partial<EmailBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [blocks]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    setBlocks(newBlocks);
  }, [blocks]);

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlock(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Déterminer si on est au-dessus ou en dessous du bloc
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY;
    const blockCenter = rect.top + rect.height / 2;
    const position = mouseY < blockCenter ? 'top' : 'bottom';
    
    setDragOverIndex(index);
    setDragOverPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedBlock) {
      const fromIndex = blocks.findIndex(b => b.id === draggedBlock);
      if (fromIndex !== -1) {
        // Si on dépose au-dessus, insérer avant, sinon après
        const insertIndex = dragOverPosition === 'top' ? toIndex : toIndex + 1;
        const finalIndex = fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
        
        if (fromIndex !== finalIndex && finalIndex >= 0 && finalIndex <= blocks.length) {
          moveBlock(fromIndex, finalIndex);
          if (autoSaveEnabled) {
            triggerAutoSave();
          }
        }
      }
    } else {
      // Ajout d'un nouveau bloc depuis la sidebar
      const blockType = e.dataTransfer.getData('blockType');
      if (blockType) {
        const insertIndex = dragOverPosition === 'top' ? toIndex : toIndex + 1;
        addBlockAtPosition(blockType, insertIndex);
      }
    }
    
    setDraggedBlock(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  };

  const addBlockAtPosition = useCallback((type: string, index: number) => {
    const template = BLOCK_TEMPLATES[type];
    if (!template) return;

    const newBlock: EmailBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: template.type as any,
      content: template.content || '',
      styles: { ...template.styles },
      props: { ...template.props },
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, newBlock);
    setBlocks(newBlocks);
    setSelectedBlock(newBlock.id);
    
    if (autoSaveEnabled) {
      triggerAutoSave();
    }
  }, [blocks, autoSaveEnabled]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setIsSaving(true);
    autoSaveTimeoutRef.current = setTimeout(() => {
      const html = generateHTML();
      // Sauvegarder dans localStorage comme backup
      localStorage.setItem('email-editor-autosave', JSON.stringify({
        blocks,
        html,
        timestamp: new Date().toISOString(),
      }));
      setLastSaved(new Date());
      setIsSaving(false);
    }, 1000); // Sauvegarde après 1 seconde d'inactivité
  }, [blocks, generateHTML, autoSaveEnabled]);

  // Charger la sauvegarde automatique au montage
  React.useEffect(() => {
    const saved = localStorage.getItem('email-editor-autosave');
    if (saved && !initialHtml) {
      try {
        const data = JSON.parse(saved);
        if (data.blocks && data.blocks.length > 0) {
          // Optionnel : proposer de restaurer
          // Pour l'instant, on ne restaure pas automatiquement
        }
      } catch (error) {
        console.error('Error loading autosave:', error);
      }
    }
  }, [initialHtml]);

  const generateHTML = useCallback((client: 'gmail' | 'outlook' | 'apple' | 'generic' = 'generic', responsive: boolean = false) => {
    // Styles spécifiques par client
    const clientStyles: Record<string, Record<string, string>> = {
      gmail: {
        container: { maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' },
        text: { fontSize: '14px', lineHeight: '1.5', color: '#333333' },
        button: { padding: '12px 24px', backgroundColor: '#1a73e8', color: '#ffffff', borderRadius: '4px' }
      },
      outlook: {
        container: { maxWidth: '600px', margin: '0 auto', fontFamily: 'Calibri, sans-serif', backgroundColor: '#ffffff' },
        text: { fontSize: '11pt', lineHeight: '1.5', color: '#000000' },
        button: { padding: '10px 20px', backgroundColor: '#0078d4', color: '#ffffff', borderRadius: '0px' }
      },
      apple: {
        container: { maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', backgroundColor: '#ffffff' },
        text: { fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f' },
        button: { padding: '14px 28px', backgroundColor: '#0071e3', color: '#ffffff', borderRadius: '980px' }
      },
      generic: {
        container: { maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' },
        text: { fontSize: '16px', lineHeight: '1.5', color: '#333333' },
        button: { padding: '12px 24px', backgroundColor: '#4f46e5', color: '#ffffff', borderRadius: '6px' }
      }
    };

    const styles = clientStyles[client];
    const container = document.createElement('div');
    Object.assign(container.style, styles.container);
    
    if (responsive) {
      container.style.width = viewMode === 'mobile' ? '100%' : viewMode === 'tablet' ? '768px' : '100%';
    }

    blocks.forEach(block => {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '16px';
      if (responsive && viewMode === 'mobile') {
        wrapper.style.padding = '8px';
      }

      switch (block.type) {
        case 'text':
          wrapper.innerHTML = block.content;
          if (styles.text) {
            const textElements = wrapper.querySelectorAll('p, span, div');
            textElements.forEach(el => {
              Object.assign((el as HTMLElement).style, styles.text);
            });
          }
          break;
        case 'image':
          const img = document.createElement('img');
          img.src = block.props?.src || '';
          img.alt = block.props?.alt || 'Image';
          if (responsive && viewMode === 'mobile') {
            img.style.width = '100%';
            img.style.maxWidth = '100%';
          } else {
            img.style.width = block.props?.width || '100%';
          }
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          wrapper.appendChild(img);
          break;
        case 'button':
          const link = document.createElement('a');
          link.href = block.props?.href || '#';
          link.target = block.props?.target || '_blank';
          link.textContent = block.content;
          const buttonStyles = { ...block.styles, ...styles.button };
          Object.assign(link.style, buttonStyles);
          if (responsive && viewMode === 'mobile') {
            link.style.width = '100%';
            link.style.display = 'block';
            link.style.textAlign = 'center';
          }
          wrapper.appendChild(link);
          break;
        case 'separator':
          const hr = document.createElement('hr');
          Object.assign(hr.style, block.styles);
          wrapper.appendChild(hr);
          break;
        case 'spacer':
          const spacer = document.createElement('div');
          Object.assign(spacer.style, block.styles);
          if (responsive && viewMode === 'mobile') {
            spacer.style.height = String(parseInt(block.styles?.height || '32px') / 2) + 'px';
          }
          wrapper.appendChild(spacer);
          break;
        case 'form':
          const form = document.createElement('form');
          form.action = block.props?.action || '#';
          form.method = block.props?.method || 'post';
          form.innerHTML = `
            <input type="text" placeholder="Nom" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 4px;" />
            <input type="email" placeholder="Email" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 4px;" />
            <button type="submit" style="padding: 10px 20px; background-color: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">Envoyer</button>
          `;
          Object.assign(form.style, block.styles);
          wrapper.appendChild(form);
          break;
        case 'video':
          const videoWrapper = document.createElement('div');
          if (block.props?.src) {
            // Détecter si c'est YouTube, Vimeo, etc.
            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
            const vimeoRegex = /vimeo\.com\/(\d+)/;
            const youtubeMatch = block.props.src.match(youtubeRegex);
            const vimeoMatch = block.props.src.match(vimeoRegex);
            
            if (youtubeMatch) {
              const iframe = document.createElement('iframe');
              iframe.src = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
              iframe.width = '100%';
              iframe.height = '315';
              iframe.frameBorder = '0';
              iframe.allowFullscreen = true;
              iframe.style.maxWidth = '100%';
              videoWrapper.appendChild(iframe);
            } else if (vimeoMatch) {
              const iframe = document.createElement('iframe');
              iframe.src = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
              iframe.width = '100%';
              iframe.height = '315';
              iframe.frameBorder = '0';
              iframe.allowFullscreen = true;
              iframe.style.maxWidth = '100%';
              videoWrapper.appendChild(iframe);
            } else {
              const video = document.createElement('video');
              video.src = block.props.src;
              video.controls = block.props?.controls !== false;
              video.width = block.props?.width || '100%';
              video.style.maxWidth = '100%';
              video.style.height = 'auto';
              videoWrapper.appendChild(video);
            }
          } else {
            videoWrapper.innerHTML = '<p style="text-align: center; color: #999;">Aucune vidéo</p>';
          }
          Object.assign(videoWrapper.style, block.styles);
          wrapper.appendChild(videoWrapper);
          break;
        case 'html':
          const htmlDiv = document.createElement('div');
          htmlDiv.innerHTML = block.content;
          Object.assign(htmlDiv.style, block.styles);
          wrapper.appendChild(htmlDiv);
          break;
        case 'columns':
          const columnsContainer = document.createElement('div');
          const columnCount = block.props?.columnCount || 2;
          columnsContainer.style.display = 'grid';
          columnsContainer.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
          columnsContainer.style.gap = '16px';
          if (responsive && viewMode === 'mobile') {
            columnsContainer.style.gridTemplateColumns = '1fr';
          }
          Object.assign(columnsContainer.style, block.styles);
          
          if (block.columns && block.columns.length > 0) {
            block.columns.forEach((columnBlocks) => {
              const column = document.createElement('div');
              columnBlocks.forEach((colBlock) => {
                // Récursivement générer le HTML pour chaque bloc de colonne
                const colWrapper = document.createElement('div');
                // Simplification : on génère juste le contenu
                if (colBlock.type === 'text') {
                  colWrapper.innerHTML = colBlock.content;
                } else if (colBlock.type === 'image' && colBlock.props?.src) {
                  const img = document.createElement('img');
                  img.src = colBlock.props.src;
                  img.alt = colBlock.props.alt || '';
                  img.style.width = '100%';
                  img.style.height = 'auto';
                  colWrapper.appendChild(img);
                }
                column.appendChild(colWrapper);
              });
              columnsContainer.appendChild(column);
            });
          } else {
            // Colonnes vides par défaut
            for (let i = 0; i < columnCount; i++) {
              const column = document.createElement('div');
              column.innerHTML = '<p style="padding: 16px; background: #f8f9fa; border-radius: 4px; text-align: center; color: #999;">Colonne ' + (i + 1) + '</p>';
              columnsContainer.appendChild(column);
            }
          }
          wrapper.appendChild(columnsContainer);
          break;
      }

      // Appliquer les styles du bloc
      if (block.styles && Object.keys(block.styles).length > 0) {
        Object.assign(wrapper.style, block.styles);
      }

      container.appendChild(wrapper);
    });

    return container.outerHTML;
  }, [blocks, viewMode]);

  const selectedBlockData = blocks.find(b => b.id === selectedBlock);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPreviewMode ? 'outline' : 'primary'}
            icon={isPreviewMode ? Code : Eye}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? 'Éditer' : 'Prévisualiser'}
          </Button>
          {isPreviewMode && (
            <>
              <Dropdown
                value={previewClient}
                onChange={(value) => setPreviewClient(value as any)}
                options={[
                  { value: 'generic', label: 'Générique' },
                  { value: 'gmail', label: 'Gmail' },
                  { value: 'outlook', label: 'Outlook' },
                  { value: 'apple', label: 'Apple Mail' }
                ]}
              />
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300 dark:border-slate-600">
                <Button
                  size="sm"
                  variant={viewMode === 'desktop' ? 'primary' : 'outline'}
                  icon={Monitor}
                  onClick={() => setViewMode('desktop')}
                  title="Desktop"
                />
                <Button
                  size="sm"
                  variant={viewMode === 'tablet' ? 'primary' : 'outline'}
                  icon={Tablet}
                  onClick={() => setViewMode('tablet')}
                  title="Tablette"
                />
                <Button
                  size="sm"
                  variant={viewMode === 'mobile' ? 'primary' : 'outline'}
                  icon={Smartphone}
                  onClick={() => setViewMode('mobile')}
                  title="Mobile"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={Mail}
                onClick={() => setIsMultiPreviewOpen(true)}
              >
                Prévisualisation multi-clients
              </Button>
            </>
          )}
          {!isPreviewMode && (
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-slate-300 dark:border-slate-600">
              <Button size="sm" variant="outline" icon={Type} onClick={() => addBlock('text')} title="Texte">
                Texte
              </Button>
              <Button size="sm" variant="outline" icon={Image} onClick={() => addBlock('image')} title="Image">
                Image
              </Button>
              <Button size="sm" variant="outline" icon={MousePointerClick} onClick={() => addBlock('button')} title="Bouton">
                Bouton
              </Button>
              <Button size="sm" variant="outline" icon={Minus} onClick={() => addBlock('separator')} title="Séparateur">
                Séparateur
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {autoSaveEnabled && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mr-2">
              {isSaving ? (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  Enregistrement...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : null}
            </div>
          )}
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button icon={Save} onClick={() => {
            const html = generateHTML();
            onSave(html);
            setLastSaved(new Date());
            // Nettoyer la sauvegarde automatique après sauvegarde manuelle
            localStorage.removeItem('email-editor-autosave');
          }}>
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Blocs disponibles et propriétés */}
        {!isPreviewMode && (
          <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-y-auto">
            {selectedBlockData ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">Propriétés du bloc</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={X}
                    onClick={() => setSelectedBlock(null)}
                  />
                </div>

                {selectedBlockData.type === 'text' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Contenu HTML
                    </label>
                    <Textarea
                      value={selectedBlockData.content}
                      onChange={(e) => updateBlock(selectedBlockData.id, { content: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Utilisez {'{{variable}}'} pour les variables dynamiques
                    </p>
                  </div>
                )}

                {selectedBlockData.type === 'image' && (
                  <div className="space-y-3">
                    <Input
                      label="URL de l'image"
                      value={selectedBlockData.props?.src || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, src: e.target.value },
                      })}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Input
                      label="Texte alternatif"
                      value={selectedBlockData.props?.alt || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, alt: e.target.value },
                      })}
                    />
                    <Input
                      label="Largeur"
                      value={selectedBlockData.props?.width || '100%'}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, width: e.target.value },
                      })}
                    />
                  </div>
                )}

                {selectedBlockData.type === 'button' && (
                  <div className="space-y-3">
                    <Input
                      label="Texte du bouton"
                      value={selectedBlockData.content}
                      onChange={(e) => updateBlock(selectedBlockData.id, { content: e.target.value })}
                    />
                    <Input
                      label="URL"
                      value={selectedBlockData.props?.href || '#'}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, href: e.target.value },
                      })}
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Couleur de fond
                      </label>
                      <Input
                        type="color"
                        value={selectedBlockData.styles?.backgroundColor || '#4f46e5'}
                        onChange={(e) => updateBlock(selectedBlockData.id, {
                          styles: { ...selectedBlockData.styles, backgroundColor: e.target.value },
                        })}
                      />
                    </div>
                  </div>
                )}

                {selectedBlockData.type === 'form' && (
                  <div className="space-y-3">
                    <Input
                      label="Action (URL)"
                      value={selectedBlockData.props?.action || '#'}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, action: e.target.value },
                      })}
                      placeholder="/api/contact"
                    />
                    <Dropdown
                      label="Méthode"
                      value={selectedBlockData.props?.method || 'post'}
                      onChange={(value) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, method: value },
                      })}
                      options={[
                        { value: 'post', label: 'POST' },
                        { value: 'get', label: 'GET' },
                      ]}
                    />
                  </div>
                )}

                {selectedBlockData.type === 'video' && (
                  <div className="space-y-3">
                    <Input
                      label="URL de la vidéo"
                      value={selectedBlockData.props?.src || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        props: { ...selectedBlockData.props, src: e.target.value },
                      })}
                      placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                    />
                    <p className="text-xs text-slate-500">
                      Supporte YouTube, Vimeo et vidéos directes
                    </p>
                  </div>
                )}

                {selectedBlockData.type === 'html' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Code HTML
                    </label>
                    <Textarea
                      value={selectedBlockData.content}
                      onChange={(e) => updateBlock(selectedBlockData.id, { content: e.target.value })}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Code HTML personnalisé (utilisez avec précaution)
                    </p>
                  </div>
                )}

                {selectedBlockData.type === 'columns' && (
                  <div className="space-y-3">
                    <Dropdown
                      label="Nombre de colonnes"
                      value={String(selectedBlockData.props?.columnCount || 2)}
                      onChange={(value) => {
                        const count = parseInt(value);
                        const newColumns: EmailBlock[][] = [];
                        for (let i = 0; i < count; i++) {
                          newColumns.push(selectedBlockData.columns?.[i] || []);
                        }
                        updateBlock(selectedBlockData.id, {
                          props: { ...selectedBlockData.props, columnCount: count },
                          columns: newColumns,
                        });
                      }}
                      options={[
                        { value: '2', label: '2 colonnes' },
                        { value: '3', label: '3 colonnes' },
                        { value: '4', label: '4 colonnes' },
                      ]}
                    />
                    <p className="text-xs text-slate-500">
                      Les colonnes seront automatiquement empilées sur mobile
                    </p>
                  </div>
                )}

                {/* Sélecteur de thème */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Thème
                  </h4>
                  <Dropdown
                    value={selectedTheme}
                    onChange={(value) => {
                      setSelectedTheme(value);
                      const theme = THEMES[value];
                      if (theme && selectedBlockData) {
                        updateBlock(selectedBlockData.id, {
                          styles: {
                            ...selectedBlockData.styles,
                            color: theme.colors.text,
                            backgroundColor: selectedBlockData.type === 'button' ? theme.colors.primary : theme.colors.background,
                            fontFamily: theme.fonts.body,
                            fontSize: theme.fonts.size,
                          },
                        });
                      }
                    }}
                    options={Object.keys(THEMES).map(key => ({
                      value: key,
                      label: THEMES[key].name,
                    }))}
                  />
                </div>

                {/* Éditeur de styles inline pour tous les blocs */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Styles personnalisés
                  </h4>
                  <div className="space-y-2">
                    <Input
                      label="Padding"
                      value={selectedBlockData.styles?.padding || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        styles: { ...selectedBlockData.styles, padding: e.target.value },
                      })}
                      placeholder="16px"
                    />
                    <Input
                      label="Margin"
                      value={selectedBlockData.styles?.margin || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        styles: { ...selectedBlockData.styles, margin: e.target.value },
                      })}
                      placeholder="0 auto"
                    />
                    <Input
                      label="Background Color"
                      type="color"
                      value={selectedBlockData.styles?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        styles: { ...selectedBlockData.styles, backgroundColor: e.target.value },
                      })}
                    />
                    <Input
                      label="Text Color"
                      type="color"
                      value={selectedBlockData.styles?.color || '#333333'}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        styles: { ...selectedBlockData.styles, color: e.target.value },
                      })}
                    />
                    <Input
                      label="Font Size"
                      value={selectedBlockData.styles?.fontSize || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        styles: { ...selectedBlockData.styles, fontSize: e.target.value },
                      })}
                      placeholder="16px"
                    />
                    <Input
                      label="Border Radius"
                      value={selectedBlockData.styles?.borderRadius || ''}
                      onChange={(e) => updateBlock(selectedBlockData.id, {
                        styles: { ...selectedBlockData.styles, borderRadius: e.target.value },
                      })}
                      placeholder="8px"
                    />
                  </div>
                </div>

                {variables.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Variables disponibles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Badge
                          key={variable.name}
                          className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900"
                          onClick={() => {
                            if (selectedBlockData.type === 'text') {
                              const newContent = selectedBlockData.content + ` {{${variable.name}}}`;
                              updateBlock(selectedBlockData.id, { content: newContent });
                            }
                          }}
                        >
                          {`{{${variable.name}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Blocs disponibles</h3>
                <div className="space-y-2">
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'text');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Type size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Bloc texte</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Paragraphe de texte avec formatage</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'image');
                    }}
                    onClick={() => addBlock('image')}
                  >
                    <div className="flex items-center gap-2">
                      <Image size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Image</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Insérer une image</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'button');
                    }}
                    onClick={() => addBlock('button')}
                  >
                    <div className="flex items-center gap-2">
                      <MousePointerClick size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Bouton CTA</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Bouton d'appel à l'action</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'columns');
                    }}
                    onClick={() => addBlock('columns')}
                  >
                    <div className="flex items-center gap-2">
                      <Columns size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Colonnes</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Layout avec colonnes multiples</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'form');
                    }}
                    onClick={() => addBlock('form')}
                  >
                    <div className="flex items-center gap-2">
                      <Layout size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Formulaire</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Formulaire de contact</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'video');
                    }}
                    onClick={() => addBlock('video')}
                  >
                    <div className="flex items-center gap-2">
                      <Film size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Vidéo</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Vidéo embed (YouTube, Vimeo)</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'html');
                    }}
                    onClick={() => addBlock('html')}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">HTML personnalisé</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Code HTML libre</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'separator');
                    }}
                    onClick={() => addBlock('separator')}
                  >
                    <div className="flex items-center gap-2">
                      <Minus size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Séparateur</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Ligne de séparation</p>
                  </div>
                  <div
                    className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('blockType', 'spacer');
                    }}
                    onClick={() => addBlock('spacer')}
                  >
                    <div className="flex items-center gap-2">
                      <Minus size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">Espaceur</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Espace vertical</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editor/Preview Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-8">
          <div
            ref={editorRef}
            className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 min-h-full"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Si aucun bloc n'existe, ajouter à la fin
              if (blocks.length === 0) {
                const blockType = e.dataTransfer.getData('blockType');
                if (blockType) {
                  addBlock(blockType);
                }
              }
            }}
          >
            {isPreviewMode ? (
              <div
                className="email-preview"
                style={{
                  width: viewMode === 'mobile' ? '375px' : viewMode === 'tablet' ? '768px' : '100%',
                  margin: '0 auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                dangerouslySetInnerHTML={{ __html: generateHTML(previewClient, true) }}
              />
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    {/* Zone de drop au-dessus du bloc */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverIndex(index);
                        setDragOverPosition('top');
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedBlock) {
                          const fromIndex = blocks.findIndex(b => b.id === draggedBlock);
                          if (fromIndex !== -1 && fromIndex !== index) {
                            const finalIndex = fromIndex < index ? index - 1 : index;
                            if (finalIndex >= 0) {
                              moveBlock(fromIndex, finalIndex);
                              if (autoSaveEnabled) triggerAutoSave();
                            }
                          }
                        } else {
                          const blockType = e.dataTransfer.getData('blockType');
                          if (blockType) {
                            addBlockAtPosition(blockType, index);
                          }
                        }
                        setDraggedBlock(null);
                        setDragOverIndex(null);
                        setDragOverPosition(null);
                      }}
                      className={`h-2 transition-all duration-200 ${
                        dragOverIndex === index && dragOverPosition === 'top'
                          ? 'bg-indigo-500 h-8 border-2 border-indigo-500 border-dashed rounded'
                          : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    />
                    <div
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, block.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => setSelectedBlock(block.id)}
                      className={`relative group border-2 rounded-lg p-4 transition-all duration-500 ${
                        selectedBlock === block.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      } ${dragOverIndex === index && dragOverPosition === 'bottom' ? 'border-blue-500 border-dashed' : ''}`}
                    >
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={16} className="text-slate-400 cursor-move" />
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={X}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBlock(block.id);
                        }}
                        className="text-rose-600"
                      />
                    </div>

                    {block.type === 'text' && (
                      <div dangerouslySetInnerHTML={{ __html: block.content }} />
                    )}
                    {block.type === 'image' && (
                      <div className="text-center">
                        {block.props?.src ? (
                          <img
                            src={block.props.src}
                            alt={block.props.alt || 'Image'}
                            style={{ width: block.props.width || '100%', maxWidth: '100%', height: 'auto' }}
                          />
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                            <Image size={32} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Aucune image</p>
                          </div>
                        )}
                      </div>
                    )}
                    {block.type === 'button' && (
                      <div className="text-center">
                        <a
                          href={block.props?.href || '#'}
                          target={block.props?.target || '_blank'}
                          style={block.styles}
                          className="inline-block"
                        >
                          {block.content}
                        </a>
                      </div>
                    )}
                    {block.type === 'separator' && (
                      <hr style={block.styles} />
                    )}
                    {block.type === 'spacer' && (
                      <div style={block.styles} />
                    )}
                    {block.type === 'form' && (
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                        <form style={block.styles}>
                          <input type="text" placeholder="Nom" className="w-full p-2 mb-2 border rounded" />
                          <input type="email" placeholder="Email" className="w-full p-2 mb-2 border rounded" />
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
                            Envoyer
                          </button>
                        </form>
                      </div>
                    )}
                    {block.type === 'video' && (
                      <div className="text-center">
                        {block.props?.src ? (
                          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                            <p className="text-sm text-slate-500 mb-2">Vidéo: {block.props.src}</p>
                            <div className="bg-slate-100 dark:bg-slate-700 rounded p-8">
                              <Film size={32} className="mx-auto text-slate-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                            <Film size={32} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Aucune vidéo</p>
                          </div>
                        )}
                      </div>
                    )}
                    {block.type === 'html' && (
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                        <div dangerouslySetInnerHTML={{ __html: block.content }} />
                      </div>
                    )}
                    {block.type === 'columns' && (
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${block.props?.columnCount || 2}, 1fr)`,
                            gap: '16px',
                            ...block.styles,
                          }}
                        >
                          {Array.from({ length: block.props?.columnCount || 2 }).map((_, i) => (
                            <div
                              key={i}
                              className="bg-slate-100 dark:bg-slate-700 rounded p-4 text-center text-sm text-slate-500"
                            >
                              Colonne {i + 1}
                              {block.columns?.[i] && block.columns[i].length > 0 && (
                                <div className="mt-2 text-xs">
                                  {block.columns[i].length} bloc(s)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                    {/* Zone de drop en dessous du dernier bloc */}
                    {index === blocks.length - 1 && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverIndex(index + 1);
                          setDragOverPosition('bottom');
                        }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedBlock) {
                            const fromIndex = blocks.findIndex(b => b.id === draggedBlock);
                            if (fromIndex !== -1) {
                              moveBlock(fromIndex, blocks.length - 1);
                              if (autoSaveEnabled) triggerAutoSave();
                            }
                          } else {
                            const blockType = e.dataTransfer.getData('blockType');
                            if (blockType) {
                              addBlockAtPosition(blockType, blocks.length);
                            }
                          }
                          setDraggedBlock(null);
                          setDragOverIndex(null);
                          setDragOverPosition(null);
                        }}
                        className={`h-2 transition-all duration-200 ${
                          dragOverIndex === index + 1 && dragOverPosition === 'bottom'
                            ? 'bg-indigo-500 h-8 border-2 border-indigo-500 border-dashed rounded'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}

                {blocks.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <Type size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-2">Commencez à construire votre email</p>
                    <p className="text-sm">Glissez-déposez des blocs depuis la sidebar ou utilisez les boutons de la toolbar</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal prévisualisation multi-clients */}
      <Modal
        isOpen={isMultiPreviewOpen}
        onClose={() => setIsMultiPreviewOpen(false)}
        title="Prévisualisation multi-clients"
        size="xl"
      >
        <div className="space-y-6">
          {(['gmail', 'outlook', 'apple', 'generic'] as const).map((client) => (
            <div key={client} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-white capitalize">
                  {client === 'gmail' ? 'Gmail' : client === 'outlook' ? 'Outlook' : client === 'apple' ? 'Apple Mail' : 'Générique'}
                </h4>
              </div>
              <div className="p-4 bg-white">
                <div
                  className="email-preview"
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                  dangerouslySetInnerHTML={{ __html: generateHTML(client) }}
                />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 text-center">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Desktop</h5>
              </div>
              <div className="p-4 bg-white" style={{ width: '600px', margin: '0 auto' }}>
                <div
                  className="email-preview"
                  dangerouslySetInnerHTML={{ __html: generateHTML('generic') }}
                />
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 text-center">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Tablette</h5>
              </div>
              <div className="p-4 bg-white" style={{ width: '768px', margin: '0 auto' }}>
                <div
                  className="email-preview"
                  dangerouslySetInnerHTML={{ __html: generateHTML('generic') }}
                />
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 text-center">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Mobile</h5>
              </div>
              <div className="p-4 bg-white" style={{ width: '375px', margin: '0 auto' }}>
                <div
                  className="email-preview"
                  dangerouslySetInnerHTML={{ __html: generateHTML('generic', true) }}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

