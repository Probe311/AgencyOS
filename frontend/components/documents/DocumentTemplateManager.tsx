import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, Search, Filter, X } from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { DocumentTemplateService } from '../../lib/services/documentTemplateService';
import { DocumentTemplate } from '../../lib/services/documentEditorService';
import { useApp } from '../contexts/AppContext';

export const DocumentTemplateManager: React.FC = () => {
  const { showToast, user } = useApp();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    htmlContent: '',
    isPublic: false,
  });

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await DocumentTemplateService.getTemplates();
      setTemplates(loadedTemplates);
    } catch (error: any) {
      showToast('Erreur lors du chargement des templates', 'error');
    }
  };

  const loadCategories = async () => {
    try {
      const loadedCategories = await DocumentTemplateService.getCategories();
      setCategories(loadedCategories);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      htmlContent: '<h1>Titre</h1><p>Contenu du document...</p>',
      isPublic: false,
    });
    setSelectedTemplate(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      htmlContent: template.html_content || '',
      isPublic: template.is_public,
    });
    setIsEditModalOpen(true);
  };

  const handleView = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsViewModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.htmlContent) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
      }

      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: stripHtml(formData.htmlContent),
              },
            ],
          },
        ],
      };

      if (selectedTemplate) {
        await DocumentTemplateService.updateTemplate(selectedTemplate.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          content,
          htmlContent: formData.htmlContent,
          isPublic: formData.isPublic,
        });
        showToast('Template mis à jour avec succès', 'success');
      } else {
        await DocumentTemplateService.createTemplate(
          formData.name,
          content,
          formData.htmlContent,
          {
            description: formData.description,
            category: formData.category,
            isPublic: formData.isPublic,
            userId: user?.id,
          }
        );
        showToast('Template créé avec succès', 'success');
      }

      await loadTemplates();
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      await DocumentTemplateService.deleteTemplate(templateId);
      await loadTemplates();
      showToast('Template supprimé', 'success');
    } catch (error: any) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <PageLayout
      header={{
        icon: FileText,
        title: 'Templates de documents',
        description: 'Gérez vos templates de documents réutilisables',
        rightActions: [
          {
            label: 'Nouveau template',
            icon: Plus,
            onClick: handleCreate,
            variant: 'primary',
          },
        ],
      }}
    >
      <div className="space-y-4">
        {/* Filtres */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dropdown
            value={selectedCategory}
            onChange={(value) => setSelectedCategory(value)}
            options={[
              { value: 'all', label: 'Toutes les catégories' },
              ...categories.map(cat => ({ value: cat, label: cat })),
            ]}
          />
        </div>

        {/* Liste des templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {template.description}
                    </p>
                  )}
                </div>
                {template.is_public && (
                  <Badge variant="blue">Public</Badge>
                )}
              </div>

              {template.category && (
                <Badge variant="slate" className="mb-2">
                  {template.category}
                </Badge>
              )}

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-500">
                  {template.usage_count} utilisation{template.usage_count > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => handleView(template)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleEdit(template)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(template.id)}
                    className="text-rose-600"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">Aucun template trouvé</p>
            <p className="text-sm">Créez votre premier template pour commencer</p>
          </div>
        )}
      </div>

      {/* Modal Création/Édition */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedTemplate(null);
        }}
        title={selectedTemplate ? 'Modifier le template' : 'Nouveau template'}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Nom du template *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Brief client"
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="Description du template"
          />
          <Input
            label="Catégorie"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Ex: brief, contract, proposal"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contenu HTML *
            </label>
            <Textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              rows={12}
              className="font-mono text-sm"
              placeholder="<h1>Titre</h1><p>Contenu...</p>"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="isPublic" className="text-sm text-slate-700 dark:text-slate-300">
              Template public (visible par tous)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {selectedTemplate ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Visualisation */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTemplate(null);
        }}
        title={selectedTemplate?.name || 'Template'}
        size="xl"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="prose prose-slate dark:prose-invert max-w-none border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <div dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content || '' }} />
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

