import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { EmailTemplate, EmailTemplateCategory } from '../../../types';

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedTemplates: EmailTemplate[] = (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category as EmailTemplateCategory,
        subject: t.subject,
        htmlContent: t.html_content,
        textContent: t.text_content,
        variables: t.variables || [],
        previewData: t.preview_data || {},
        thumbnailUrl: t.thumbnail_url,
        isPublic: t.is_public,
        tags: t.tags || [],
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      setTemplates(formattedTemplates);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading email templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('email_templates')
        .insert({
          name: template.name,
          description: template.description,
          category: template.category,
          subject: template.subject,
          html_content: template.htmlContent,
          text_content: template.textContent,
          variables: template.variables,
          preview_data: template.previewData,
          thumbnail_url: template.thumbnailUrl,
          is_public: template.isPublic,
          tags: template.tags,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newTemplate: EmailTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        subject: data.subject,
        htmlContent: data.html_content,
        textContent: data.text_content,
        variables: data.variables || [],
        previewData: data.preview_data || {},
        thumbnailUrl: data.thumbnail_url,
        isPublic: data.is_public,
        tags: data.tags || [],
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await loadTemplates(); // Recharger pour avoir les données à jour
      return newTemplate;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.htmlContent !== undefined) updateData.html_content = updates.htmlContent;
      if (updates.textContent !== undefined) updateData.text_content = updates.textContent;
      if (updates.variables !== undefined) updateData.variables = updates.variables;
      if (updates.previewData !== undefined) updateData.preview_data = updates.previewData;
      if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { data, error: updateError } = await supabase
        .from('email_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedTemplate: EmailTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        subject: data.subject,
        htmlContent: data.html_content,
        textContent: data.text_content,
        variables: data.variables || [],
        previewData: data.preview_data || {},
        thumbnailUrl: data.thumbnail_url,
        isPublic: data.is_public,
        tags: data.tags || [],
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await loadTemplates(); // Recharger pour avoir les données à jour
      return updatedTemplate;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadTemplates(); // Recharger pour avoir les données à jour
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const getTemplateById = (id: string) => {
    return templates.find(t => t.id === id);
  };

  const getTemplatesByCategory = (category: EmailTemplateCategory) => {
    return templates.filter(t => t.category === category);
  };

  const replaceVariables = (content: string, data: Record<string, any>): string => {
    let result = content;
    // Remplacer toutes les variables {{variable}} par leurs valeurs
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, data[key] || '');
    });
    return result;
  };

  return {
    templates,
    loading,
    error,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    getTemplatesByCategory,
    replaceVariables,
  };
};

