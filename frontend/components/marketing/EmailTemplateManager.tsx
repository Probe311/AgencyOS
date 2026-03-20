import React, { useState, useEffect } from 'react';
import { Mail, Plus, Edit3, Trash2, Eye, Copy, Save, X, Tag, FileText, Search, Filter, Globe, Sparkles, TrendingUp, Layers, Palette } from 'lucide-react';
import { useEmailTemplates } from '../../lib/supabase/hooks/useEmailTemplates';
import { EmailTemplate, EmailTemplateCategory, EmailTemplateVariable } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { getEmailTemplates, getRecommendedTemplates, previewTemplate, duplicateTemplate, shareTemplate } from '../../lib/services/emailTemplateLibrary';
import { EmailVisualEditor } from './EmailVisualEditor';

const DEFAULT_VARIABLES: EmailTemplateVariable[] = [
  { name: 'nom', description: 'Nom complet du contact', example: 'Jean Dupont', type: 'string' },
  { name: 'prénom', description: 'Prénom du contact', example: 'Jean', type: 'string' },
  { name: 'entreprise', description: 'Nom de l\'entreprise', example: 'Acme Corp', type: 'string' },
  { name: 'secteur', description: 'Secteur d\'activité', example: 'Technologie', type: 'string' },
  { name: 'scoring', description: 'Score du lead (0-100)', example: '75', type: 'number' },
  { name: 'température', description: 'Température du lead', example: 'Chaud', type: 'string' },
  { name: 'valeur_potentielle', description: 'Valeur potentielle du deal', example: '50000€', type: 'currency' },
  { name: 'dernière_interaction', description: 'Date de dernière interaction', example: 'Il y a 3 jours', type: 'date' },
];

const CATEGORIES: { value: EmailTemplateCategory; label: string; color: string }[] = [
  { value: 'Newsletter', label: 'Newsletter', color: 'bg-blue-100 text-blue-700' },
  { value: 'Onboarding', label: 'Onboarding', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'E-commerce', label: 'E-commerce', color: 'bg-amber-100 text-amber-700' },
  { value: 'Sales', label: 'Sales', color: 'bg-rose-100 text-rose-700' },
  { value: 'Event', label: 'Event', color: 'bg-purple-100 text-purple-700' },
  { value: 'B2B', label: 'B2B', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Nurturing', label: 'Nurturing', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'Relance', label: 'Relance', color: 'bg-orange-100 text-orange-700' },
  { value: 'Bienvenue', label: 'Bienvenue', color: 'bg-green-100 text-green-700' },
  { value: 'Custom', label: 'Custom', color: 'bg-slate-100 text-slate-700' },
];

export const EmailTemplateManager: React.FC = () => {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, replaceVariables, loadTemplates } = useEmailTemplates();
  const { showToast } = useApp();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isVisualEditorOpen, setIsVisualEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EmailTemplateCategory | 'all'>('all');
  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [filterTemperature, setFilterTemperature] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationTargetLang, setTranslationTargetLang] = useState<string>('en');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Custom' as EmailTemplateCategory,
    subject: '',
    htmlContent: '',
    textContent: '',
    variables: [] as EmailTemplateVariable[],
    previewData: {} as Record<string, any>,
    isPublic: false,
    tags: [] as string[],
  });

  // Charger les templates avec filtres avancés depuis le service
  const [allTemplates, setAllTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    loadTemplatesWithFilters();
  }, [selectedCategory, filterFamily, filterTemperature, filterLanguage, filterSector, searchQuery]);

  const loadTemplatesWithFilters = async () => {
    setLoadingTemplates(true);
    try {
      const filters: any = {};
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (filterFamily !== 'all') filters.family = filterFamily;
      if (filterTemperature !== 'all') filters.temperature = filterTemperature;
      if (filterLanguage !== 'all') filters.language = filterLanguage;
      if (filterSector !== 'all') filters.sector = filterSector;
      if (searchQuery) filters.search = searchQuery;

      const filtered = await getEmailTemplates(filters);
      setAllTemplates(filtered);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      setAllTemplates(templates); // Fallback sur templates du hook
    } finally {
      setLoadingTemplates(false);
    }
  };

  const filteredTemplates = allTemplates.length > 0 ? allTemplates : templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      category: 'Custom',
      subject: '',
      htmlContent: '',
      textContent: '',
      variables: [...DEFAULT_VARIABLES],
      previewData: {
        nom: 'Jean Dupont',
        prénom: 'Jean',
        entreprise: 'Acme Corp',
        secteur: 'Technologie',
        scoring: '75',
        température: 'Chaud',
        valeur_potentielle: '50000€',
        dernière_interaction: 'Il y a 3 jours',
      },
      isPublic: false,
      tags: [],
    });
    setIsEditorOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      variables: template.variables.length > 0 ? template.variables : [...DEFAULT_VARIABLES],
      previewData: template.previewData || {},
      isPublic: template.isPublic,
      tags: template.tags || [],
    });
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.subject || !formData.htmlContent) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
      }

      const templateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        subject: formData.subject,
        htmlContent: formData.htmlContent,
        textContent: formData.textContent,
        variables: formData.variables,
        previewData: formData.previewData,
        isPublic: formData.isPublic,
        tags: formData.tags,
      };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
        showToast('Template mis à jour avec succès', 'success');
      } else {
        await createTemplate(templateData);
        showToast('Template créé avec succès', 'success');
      }

      await loadTemplates(); // Recharger la liste
      setIsEditorOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      await deleteTemplate(id);
      await loadTemplates(); // Recharger la liste
      showToast('Template supprimé', 'success');
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      variables: template.variables,
      previewData: template.previewData || {},
      isPublic: template.isPublic,
      tags: template.tags || [],
    });
    setIsPreviewOpen(true);
  };

  const getPreviewContent = () => {
    if (!editingTemplate) return '';
    const previewSubject = replaceVariables(editingTemplate.subject, formData.previewData);
    const previewHtml = replaceVariables(editingTemplate.htmlContent, formData.previewData);
    return { subject: previewSubject, html: previewHtml };
  };

  const addVariable = () => {
    const newVar: EmailTemplateVariable = {
      name: '',
      description: '',
      example: '',
      type: 'string',
    };
    setFormData({
      ...formData,
      variables: [...formData.variables, newVar],
    });
  };

  const updateVariable = (index: number, updates: Partial<EmailTemplateVariable>) => {
    const updated = [...formData.variables];
    updated[index] = { ...updated[index], ...updates };
    setFormData({ ...formData, variables: updated });
  };

  const removeVariable = (index: number) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((_, i) => i !== index),
    });
  };

  const handleTranslateTemplate = async (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsTranslateModalOpen(true);
  };

  const handleTranslate = async () => {
    if (!editingTemplate) return;
    
    setIsTranslating(true);
    try {
      // Utiliser l'IA pour traduire (via generateContent)
      const { generateContent } = await import('../../lib/ai-client');
      
      const prompt = `Traduis ce template d'email du français vers ${translationTargetLang === 'en' ? 'anglais' : translationTargetLang === 'es' ? 'espagnol' : translationTargetLang}.
      
Sujet: ${editingTemplate.subject}
Contenu HTML: ${editingTemplate.htmlContent}

Traduis en conservant:
- La structure HTML
- Les variables {{variable}} telles quelles
- Le ton et le style
- Les liens et CTA

Réponds au format JSON:
{
  "subject": "sujet traduit",
  "htmlContent": "contenu HTML traduit",
  "textContent": "version texte traduite"
}`;

      const translated = await generateContent(prompt);
      
      // Parser la réponse (JSON)
      let translatedData;
      try {
        translatedData = JSON.parse(translated);
      } catch {
        // Si pas JSON, extraire le contenu
        translatedData = {
          subject: editingTemplate.subject, // TODO: extraire depuis réponse
          htmlContent: translated,
          textContent: editingTemplate.textContent || '',
        };
      }

      // Créer un nouveau template traduit
      const translatedTemplate = {
        name: `${editingTemplate.name} (${translationTargetLang.toUpperCase()})`,
        description: editingTemplate.description || '',
        category: editingTemplate.category,
        subject: translatedData.subject,
        htmlContent: translatedData.htmlContent,
        textContent: translatedData.textContent || '',
        variables: editingTemplate.variables,
        previewData: editingTemplate.previewData,
        isPublic: editingTemplate.isPublic,
        tags: [...(editingTemplate.tags || []), translationTargetLang],
      };

      await createTemplate(translatedTemplate as any);
      showToast('Template traduit et créé avec succès', 'success');
      setIsTranslateModalOpen(false);
      await loadTemplates();
    } catch (error: any) {
      showToast(`Erreur lors de la traduction: ${error.message}`, 'error');
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Templates d'Emails</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Créez et gérez vos templates d'emails avec variables</p>
        </div>
        <Button icon={Plus} onClick={handleCreateNew}>
          Nouveau Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center shrink-0">
        <SearchBar
          placeholder="Rechercher un template..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="flex-1"
        />
        <Dropdown
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value as any)}
          options={[
            { label: 'Catégories', value: 'all' },
            ...CATEGORIES.map(c => ({ label: c.label, value: c.value })),
          ]}
          containerClassName="w-64"
        />
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const categoryInfo = CATEGORIES.find(c => c.value === template.category);
            return (
              <div
                key={template.id}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-500 flex flex-col"
              >
                <div className="h-56 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center relative overflow-hidden">
                  <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-all duration-500 z-10">
                    <Button size="sm" variant="secondary" icon={Edit3} onClick={() => handleEdit(template)}>
                      Éditer
                    </Button>
                    <Button size="sm" variant="primary" icon={Eye} onClick={() => handlePreview(template)}>
                      Aperçu
                    </Button>
                    {(template as any).language !== 'fr' && (
                      <Button size="sm" variant="ghost" icon={Globe} onClick={() => handleTranslateTemplate(template)} title="Traduire">
                        TR
                      </Button>
                    )}
                  </div>
                  <Mail className="text-slate-400/50 w-20 h-20" />
                  {template.variables.length > 0 && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-indigo-500 text-white text-xs px-2 py-1">
                        {template.variables.length} variable{template.variables.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg leading-tight pr-2">{template.name}</h4>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Palette}
                        onClick={() => {
                          setEditingTemplate(template);
                          setFormData({
                            name: template.name,
                            description: template.description || '',
                            category: template.category,
                            subject: template.subject,
                            htmlContent: template.htmlContent,
                            textContent: template.textContent || '',
                            variables: template.variables,
                            previewData: template.previewData || {},
                            isPublic: template.isPublic,
                            tags: template.tags || [],
                          });
                          setIsVisualEditorOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Éditer visuellement"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit3}
                        onClick={() => handleEdit(template)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Éditer"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => handlePreview(template)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Prévisualiser"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => handleDelete(template.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-600"
                        title="Supprimer"
                      />
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3 flex-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-auto">
                    <Badge className={categoryInfo?.color || 'bg-slate-100 text-slate-700 text-xs px-2 py-1'}>
                      {categoryInfo?.label || template.category}
                    </Badge>
                    {template.isPublic && (
                      <Badge variant="outline" className="text-xs px-2 py-1">Public</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 dark:text-slate-500">
            <Mail size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">Aucun template trouvé</p>
            <p className="text-sm">Créez votre premier template pour commencer</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingTemplate(null);
        }}
        title={editingTemplate ? 'Modifier le template' : 'Nouveau template'}
        className="max-w-6xl max-h-[95vh]"
      >
        <div className="h-[85vh] overflow-y-auto custom-scrollbar space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom du template *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Email de bienvenue"
            />
            <Dropdown
              label="Catégorie *"
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value as EmailTemplateCategory })}
              options={CATEGORIES.map(c => ({ label: c.label, value: c.value }))}
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description du template..."
            rows={2}
          />

          <Input
            label="Sujet de l'email *"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="ex: Bienvenue {{prénom}} !"
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Contenu HTML *
              </label>
              <Button
                size="sm"
                variant="outline"
                icon={Palette}
                onClick={() => {
                  setIsEditorOpen(false);
                  setIsVisualEditorOpen(true);
                }}
              >
                Éditeur visuel
              </Button>
            </div>
            <Textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              placeholder="<html>...</html> ou utilisez {{variable}} pour les variables"
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Utilisez {'{{variable}}'} pour insérer des variables dynamiques ou utilisez l'éditeur visuel pour composer votre email
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Version texte (optionnel)
            </label>
            <Textarea
              value={formData.textContent}
              onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
              placeholder="Version texte brut de l'email"
              rows={6}
            />
          </div>

          {/* Variables Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={18} /> Variables disponibles
              </h3>
              <Button size="sm" icon={Plus} onClick={addVariable}>
                Ajouter variable
              </Button>
            </div>
            <div className="space-y-3">
              {formData.variables.map((variable, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Nom (ex: nom)"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, { name: e.target.value })}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Description"
                      value={variable.description}
                      onChange={(e) => updateVariable(index, { description: e.target.value })}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Exemple"
                      value={variable.example}
                      onChange={(e) => updateVariable(index, { example: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={X}
                    onClick={() => removeVariable(index)}
                    className="text-rose-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview Data */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye size={18} /> Données de preview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {formData.variables.map((variable) => (
                <Input
                  key={variable.name}
                  label={variable.name || 'Variable'}
                  value={formData.previewData[variable.name] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    previewData: {
                      ...formData.previewData,
                      [variable.name]: e.target.value,
                    },
                  })}
                  placeholder={variable.example || 'Valeur d\'exemple'}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Annuler
            </Button>
            <Button icon={Save} onClick={handleSave}>
              {editingTemplate ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Aperçu du template"
        className="max-w-4xl"
      >
        {editingTemplate && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Sujet
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                {getPreviewContent().subject}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Contenu
              </label>
              <div
                className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                dangerouslySetInnerHTML={{ __html: getPreviewContent().html }}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Visual Editor Modal */}
      <Modal
        isOpen={isVisualEditorOpen}
        onClose={() => setIsVisualEditorOpen(false)}
        title={editingTemplate ? 'Éditeur visuel - Modifier le template' : 'Éditeur visuel - Nouveau template'}
        className="max-w-[95vw] max-h-[95vh] p-0"
      >
        <div className="h-[90vh]">
          <EmailVisualEditor
            initialHtml={formData.htmlContent}
            onSave={(html) => {
              setFormData({ ...formData, htmlContent: html });
              setIsVisualEditorOpen(false);
              setIsEditorOpen(true);
            }}
            onClose={() => {
              setIsVisualEditorOpen(false);
              setIsEditorOpen(true);
            }}
            variables={formData.variables}
          />
        </div>
      </Modal>
    </div>
  );
};

