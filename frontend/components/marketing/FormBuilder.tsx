import React, { useState, useEffect, useRef } from 'react';
import { 
  GripVertical, X, Plus, Type, Mail, Phone, Calendar, CheckSquare, 
  List, FileText, Image, Upload, Eye, Save, Settings, Download,
  BarChart3, Search, Filter, Copy, Trash2, Edit2, CheckCircle2,
  AlertCircle, Hash, Link as LinkIcon, Globe
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

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'url';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  options?: Array<{ label: string; value: string }>;
  conditional?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string;
  };
  styles?: Record<string, string>;
}

interface Form {
  id?: string;
  name: string;
  description?: string;
  form_config: {
    fields: FormField[];
    submitButtonText?: string;
    submitMessage?: string;
    redirectUrl?: string;
    autoCreateLead?: boolean;
    notifications?: {
      email?: string;
      webhook?: string;
    };
  };
  is_active: boolean;
  is_public: boolean;
  submit_message?: string;
  redirect_url?: string;
}

interface FormSubmission {
  id: string;
  form_id: string;
  lead_id?: string;
  submission_data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  submitted_at: string;
  processed: boolean;
  forms?: Form;
}

const FIELD_TEMPLATES: Record<string, Partial<FormField>> = {
  text: {
    type: 'text',
    label: 'Texte',
    placeholder: 'Entrez votre texte',
    required: false,
    validation: { minLength: 0, maxLength: 255 }
  },
  email: {
    type: 'email',
    label: 'Email',
    placeholder: 'exemple@email.com',
    required: true,
    validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
  },
  phone: {
    type: 'phone',
    label: 'Téléphone',
    placeholder: '+33 1 23 45 67 89',
    required: false,
    validation: { pattern: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s.]?[(]?[0-9]{1,4}[)]?[-\\s.]?[0-9]{1,9}$' }
  },
  number: {
    type: 'number',
    label: 'Nombre',
    placeholder: '0',
    required: false,
    validation: { min: 0, max: 999999 }
  },
  textarea: {
    type: 'textarea',
    label: 'Texte long',
    placeholder: 'Votre message...',
    required: false,
    validation: { minLength: 0, maxLength: 5000 }
  },
  select: {
    type: 'select',
    label: 'Liste déroulante',
    placeholder: 'Sélectionnez une option',
    required: false,
    options: [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' }
    ]
  },
  checkbox: {
    type: 'checkbox',
    label: 'Case à cocher',
    required: false
  },
  radio: {
    type: 'radio',
    label: 'Boutons radio',
    required: false,
    options: [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' }
    ]
  },
  date: {
    type: 'date',
    label: 'Date',
    required: false
  },
  file: {
    type: 'file',
    label: 'Fichier',
    required: false
  },
  url: {
    type: 'url',
    label: 'URL',
    placeholder: 'https://...',
    required: false,
    validation: { pattern: '^https?://.+$' }
  }
};

export const FormBuilder: React.FC<{ formId?: string }> = ({ formId }) => {
  const { showToast, user } = useApp();
  const [form, setForm] = useState<Form>({
    name: '',
    form_config: {
      fields: [],
      submitButtonText: 'Envoyer',
      submitMessage: 'Merci pour votre soumission !',
      autoCreateLead: true
    },
    is_active: true,
    is_public: false
  });
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (formId) {
      loadForm(formId);
      loadSubmissions(formId);
    }
  }, [formId]);

  const loadForm = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setForm({
        ...data,
        form_config: data.form_config || { fields: [] }
      });
    } catch (error: any) {
      showToast('Erreur lors du chargement du formulaire', 'error');
    }
  };

  const loadSubmissions = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          *,
          forms:form_id (*)
        `)
        .eq('form_id', id)
        .order('submitted_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
    }
  };

  const saveForm = async () => {
    try {
      if (!form.name) {
        showToast('Veuillez entrer un nom pour le formulaire', 'error');
        return;
      }

      const formData = {
        ...form,
        updated_at: new Date().toISOString(),
        created_by: user?.id
      };

      if (form.id) {
        const { error } = await supabase
          .from('forms')
          .update(formData)
          .eq('id', form.id);

        if (error) throw error;
        showToast('Formulaire sauvegardé', 'success');
      } else {
        const { data, error } = await supabase
          .from('forms')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        setForm({ ...form, id: data.id });
        showToast('Formulaire créé', 'success');
      }
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const addField = (type: string) => {
    const template = FIELD_TEMPLATES[type];
    if (!template) return;

    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random()}`,
      type: template.type as FormField['type'],
      label: template.label || '',
      placeholder: template.placeholder,
      required: template.required || false,
      validation: template.validation ? { ...template.validation } : undefined,
      options: template.options ? [...template.options] : undefined
    };

    setForm({
      ...form,
      form_config: {
        ...form.form_config,
        fields: [...form.form_config.fields, newField]
      }
    });
    setSelectedField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setForm({
      ...form,
      form_config: {
        ...form.form_config,
        fields: form.form_config.fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    });
  };

  const deleteField = (fieldId: string) => {
    setForm({
      ...form,
      form_config: {
        ...form.form_config,
        fields: form.form_config.fields.filter(field => field.id !== fieldId)
      }
    });
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  };

  const duplicateField = (fieldId: string) => {
    const field = form.form_config.fields.find(f => f.id === fieldId);
    if (!field) return;

    const newField: FormField = {
      ...field,
      id: `field-${Date.now()}-${Math.random()}`,
      label: `${field.label} (copie)`
    };

    const index = form.form_config.fields.findIndex(f => f.id === fieldId);
    const newFields = [...form.form_config.fields];
    newFields.splice(index + 1, 0, newField);

    setForm({
      ...form,
      form_config: {
        ...form.form_config,
        fields: newFields
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedField) return;

    const draggedIndex = form.form_config.fields.findIndex(f => f.id === draggedField);
    if (draggedIndex === -1) return;

    const newFields = [...form.form_config.fields];
    const [removed] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, removed);

    setForm({
      ...form,
      form_config: {
        ...form.form_config,
        fields: newFields
      }
    });
    setDraggedField(null);
    setDragOverIndex(null);
  };

  const generateEmbedCode = () => {
    if (!form.id) return '';
    const baseUrl = window.location.origin;
    return `<iframe src="${baseUrl}/form/${form.id}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    showToast('Code d\'intégration copié', 'success');
  };

  const exportSubmissions = async (format: 'csv' | 'json') => {
    if (!form.id) return;

    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', form.id);

      if (error) throw error;

      if (format === 'csv') {
        const headers = ['ID', 'Date', ...form.form_config.fields.map(f => f.label), 'IP', 'User Agent'];
        const rows = data.map(sub => [
          sub.id,
          new Date(sub.submitted_at).toLocaleString('fr-FR'),
          ...form.form_config.fields.map(f => sub.submission_data[f.id] || ''),
          sub.ip_address || '',
          sub.user_agent || ''
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form.name}-submissions.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form.name}-submissions.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showToast(`Export ${format.toUpperCase()} réussi`, 'success');
    } catch (error: any) {
      showToast('Erreur lors de l\'export', 'error');
    }
  };

  const selectedFieldData = form.form_config.fields.find(f => f.id === selectedField);

  const renderFieldPreview = (field: FormField, values: Record<string, any> = {}) => {
    const value = values[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
      case 'url':
        return (
          <Input
            type={field.type}
            label={field.label}
            value={value}
            placeholder={field.placeholder}
            required={field.required}
            onChange={() => {}}
            disabled
          />
        );
      case 'textarea':
        return (
          <Textarea
            label={field.label}
            value={value}
            placeholder={field.placeholder}
            required={field.required}
            onChange={() => {}}
            rows={4}
            disabled
          />
        );
      case 'select':
        return (
          <Dropdown
            label={field.label}
            value={value}
            onChange={() => {}}
            options={field.options || []}
            required={field.required}
            disabled
          />
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!value}
                disabled
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">J'accepte</span>
            </div>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    disabled
                    className="h-4 w-4 text-indigo-600"
                  />
                  <label className="text-sm text-slate-600 dark:text-slate-400">{option.label}</label>
                </div>
              ))}
            </div>
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            label={field.label}
            value={value}
            required={field.required}
            onChange={() => {}}
            disabled
          />
        );
      case 'file':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              disabled
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const getFieldIcon = (type: FormField['type']) => {
    const icons = {
      text: Type,
      email: Mail,
      phone: Phone,
      number: Hash,
      textarea: FileText,
      select: List,
      checkbox: CheckSquare,
      radio: List,
      date: Calendar,
      file: Upload,
      url: LinkIcon
    };
    return icons[type] || Type;
  };

  return (
    <PageLayout
      header={{
        icon: FileText,
        title: form.name || "Nouveau formulaire",
        description: form.description || "Créez votre formulaire avec le builder drag & drop",
        rightActions: [
          {
            label: "Soumissions",
            icon: BarChart3,
            onClick: () => setIsSubmissionsModalOpen(true),
            variant: 'outline',
            disabled: !form.id
          },
          {
            label: "Code embed",
            icon: Copy,
            onClick: () => setIsEmbedModalOpen(true),
            variant: 'outline',
            disabled: !form.id
          },
          {
            label: isPreviewMode ? "Éditer" : "Prévisualiser",
            icon: Eye,
            onClick: () => setIsPreviewMode(!isPreviewMode),
            variant: 'outline'
          },
          {
            label: "Paramètres",
            icon: Settings,
            onClick: () => setIsSettingsModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Sauvegarder",
            icon: Save,
            onClick: saveForm,
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="flex gap-6 h-full">
        {/* Sidebar - Types de champs */}
        {!isPreviewMode && (
          <div className="w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex-shrink-0">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Champs</h3>
            <div className="space-y-2">
              {Object.entries(FIELD_TEMPLATES).map(([key, template]) => {
                const Icon = getFieldIcon(template.type as FormField['type']);
                return (
                  <button
                    key={key}
                    onClick={() => addField(key)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500 flex items-center gap-2"
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {key === 'textarea' ? 'Texte long' : key === 'select' ? 'Liste' : key === 'checkbox' ? 'Case' : key === 'radio' ? 'Radio' : key === 'file' ? 'Fichier' : key === 'url' ? 'Lien' : template.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Éditeur */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isPreviewMode ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{form.name}</h2>
                {form.description && (
                  <p className="text-slate-600 dark:text-slate-400">{form.description}</p>
                )}
                {form.form_config.fields.map((field) => (
                  <div key={field.id}>
                    {renderFieldPreview(field)}
                  </div>
                ))}
                <Button variant="primary" fullWidth size="lg">
                  {form.form_config.submitButtonText || 'Envoyer'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              {form.form_config.fields.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <div className="text-center">
                    <FileText size={64} className="mx-auto mb-4 opacity-50" />
                    <p>Commencez par ajouter un champ depuis la sidebar</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                  {form.form_config.fields.map((field, index) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => setSelectedField(field.id)}
                      className={`relative group border-2 rounded-lg p-4 transition-all duration-500 ${
                        selectedField === field.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : dragOverIndex === index
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Contrôles du champ */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateField(field.id);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(field.id);
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                        <GripVertical size={16} className="text-slate-400" />
                      </div>

                      {/* Rendu du champ */}
                      <div className="mt-6">
                        {renderFieldPreview(field)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panneau de propriétés */}
        {!isPreviewMode && selectedFieldData && (
          <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex-shrink-0">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Propriétés</h3>
            <div className="space-y-4">
              <Input
                label="Label"
                value={selectedFieldData.label}
                onChange={(e) => updateField(selectedFieldData.id, { label: e.target.value })}
                required
              />
              <Input
                label="Placeholder"
                value={selectedFieldData.placeholder || ''}
                onChange={(e) => updateField(selectedFieldData.id, { placeholder: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFieldData.required}
                  onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <label className="text-sm text-slate-700 dark:text-slate-300">Champ requis</label>
              </div>
              
              {(selectedFieldData.type === 'text' || selectedFieldData.type === 'textarea') && (
                <>
                  <Input
                    label="Longueur minimale"
                    type="number"
                    value={selectedFieldData.validation?.minLength || ''}
                    onChange={(e) => updateField(selectedFieldData.id, {
                      validation: {
                        ...selectedFieldData.validation,
                        minLength: parseInt(e.target.value) || undefined
                      }
                    })}
                  />
                  <Input
                    label="Longueur maximale"
                    type="number"
                    value={selectedFieldData.validation?.maxLength || ''}
                    onChange={(e) => updateField(selectedFieldData.id, {
                      validation: {
                        ...selectedFieldData.validation,
                        maxLength: parseInt(e.target.value) || undefined
                      }
                    })}
                  />
                </>
              )}
              
              {selectedFieldData.type === 'number' && (
                <>
                  <Input
                    label="Valeur minimale"
                    type="number"
                    value={selectedFieldData.validation?.min || ''}
                    onChange={(e) => updateField(selectedFieldData.id, {
                      validation: {
                        ...selectedFieldData.validation,
                        min: parseInt(e.target.value) || undefined
                      }
                    })}
                  />
                  <Input
                    label="Valeur maximale"
                    type="number"
                    value={selectedFieldData.validation?.max || ''}
                    onChange={(e) => updateField(selectedFieldData.id, {
                      validation: {
                        ...selectedFieldData.validation,
                        max: parseInt(e.target.value) || undefined
                      }
                    })}
                  />
                </>
              )}
              
              {(selectedFieldData.type === 'select' || selectedFieldData.type === 'radio') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Options</label>
                  {selectedFieldData.options?.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...(selectedFieldData.options || [])];
                          newOptions[idx].label = e.target.value;
                          updateField(selectedFieldData.id, { options: newOptions });
                        }}
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Input
                        value={option.value}
                        onChange={(e) => {
                          const newOptions = [...(selectedFieldData.options || [])];
                          newOptions[idx].value = e.target.value;
                          updateField(selectedFieldData.id, { options: newOptions });
                        }}
                        placeholder="Valeur"
                        className="flex-1"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const newOptions = selectedFieldData.options?.filter((_, i) => i !== idx);
                          updateField(selectedFieldData.id, { options: newOptions });
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [...(selectedFieldData.options || []), { label: '', value: '' }];
                      updateField(selectedFieldData.id, { options: newOptions });
                    }}
                    icon={Plus}
                  >
                    Ajouter une option
                  </Button>
                </div>
              )}

              {/* Logique conditionnelle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Affichage conditionnel
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Afficher ce champ seulement si :
                  </p>
                  <Dropdown
                    value={selectedFieldData.conditional?.fieldId || ''}
                    onChange={(value) => {
                      if (value) {
                        updateField(selectedFieldData.id, {
                          conditional: {
                            fieldId: value,
                            operator: 'equals',
                            value: ''
                          }
                        });
                      } else {
                        updateField(selectedFieldData.id, { conditional: undefined });
                      }
                    }}
                    options={[
                      { value: '', label: 'Toujours afficher' },
                      ...form.form_config.fields
                        .filter(f => f.id !== selectedFieldData.id)
                        .map(f => ({ value: f.id, label: f.label }))
                    ]}
                  />
                  {selectedFieldData.conditional && (
                    <>
                      <Dropdown
                        value={selectedFieldData.conditional.operator}
                        onChange={(value) => updateField(selectedFieldData.id, {
                          conditional: {
                            ...selectedFieldData.conditional!,
                            operator: value as any
                          }
                        })}
                        options={[
                          { value: 'equals', label: 'Égal à' },
                          { value: 'not_equals', label: 'Différent de' },
                          { value: 'contains', label: 'Contient' },
                          { value: 'greater_than', label: 'Supérieur à' },
                          { value: 'less_than', label: 'Inférieur à' }
                        ]}
                        className="mt-2"
                      />
                      <Input
                        value={selectedFieldData.conditional.value}
                        onChange={(e) => updateField(selectedFieldData.id, {
                          conditional: {
                            ...selectedFieldData.conditional!,
                            value: e.target.value
                          }
                        })}
                        placeholder="Valeur"
                        className="mt-2"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal soumissions */}
      <Modal
        isOpen={isSubmissionsModalOpen}
        onClose={() => setIsSubmissionsModalOpen(false)}
        title={`Soumissions (${submissions.length})`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => exportSubmissions('csv')}
              icon={Download}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => exportSubmissions('json')}
              icon={Download}
            >
              JSON
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {submissions.filter(sub => {
              if (!searchQuery) return true;
              const searchLower = searchQuery.toLowerCase();
              return Object.values(sub.submission_data).some(v =>
                String(v).toLowerCase().includes(searchLower)
              );
            }).map((submission) => (
              <div
                key={submission.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(submission.submitted_at).toLocaleString('fr-FR')}
                  </span>
                  {submission.lead_id && (
                    <Badge variant="green" className="text-xs">
                      Lead créé
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {form.form_config.fields.map(field => {
                    const value = submission.submission_data[field.id];
                    if (value === undefined || value === '') return null;
                    return (
                      <div key={field.id} className="text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{field.label}:</span>{' '}
                        <span className="text-slate-600 dark:text-slate-400">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal code embed */}
      <Modal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        title="Code d'intégration"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Copiez ce code pour intégrer le formulaire sur votre site web.
          </p>
          <div className="relative">
            <Textarea
              value={generateEmbedCode()}
              readOnly
              rows={4}
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

      {/* Modal paramètres */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Paramètres du formulaire"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <Input
            label="Texte du bouton d'envoi"
            value={form.form_config.submitButtonText || ''}
            onChange={(e) => setForm({
              ...form,
              form_config: { ...form.form_config, submitButtonText: e.target.value }
            })}
          />
          <Textarea
            label="Message de confirmation"
            value={form.form_config.submitMessage || ''}
            onChange={(e) => setForm({
              ...form,
              form_config: { ...form.form_config, submitMessage: e.target.value }
            })}
            rows={3}
          />
          <Input
            label="URL de redirection (optionnel)"
            value={form.form_config.redirectUrl || ''}
            onChange={(e) => setForm({
              ...form,
              form_config: { ...form.form_config, redirectUrl: e.target.value }
            })}
            placeholder="https://..."
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.form_config.autoCreateLead || false}
              onChange={(e) => setForm({
                ...form,
                form_config: { ...form.form_config, autoCreateLead: e.target.checked }
              })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Créer automatiquement un lead depuis les soumissions
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">Formulaire actif</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">Formulaire public</label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email de notification (optionnel)
            </label>
            <Input
              type="email"
              value={form.form_config.notifications?.email || ''}
              onChange={(e) => setForm({
                ...form,
                form_config: {
                  ...form.form_config,
                  notifications: {
                    ...form.form_config.notifications,
                    email: e.target.value
                  }
                }
              })}
              placeholder="notifications@example.com"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)}>
              Fermer
            </Button>
            <Button variant="primary" onClick={() => {
              saveForm();
              setIsSettingsModalOpen(false);
            }}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

