/**
 * Service de gestion des templates de documents
 * Permet de créer, gérer et appliquer des templates de documents
 */

import { supabase } from '../supabase';

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'brief' | 'report' | 'proposal' | 'meeting_notes' | 'wiki' | 'other';
  html_content: string;
  content?: any; // JSON content structure
  variables?: Array<{ name: string; description: string; example: string }>;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
  tags?: string[];
}

export interface CreateTemplateParams {
  name: string;
  description?: string;
  category: DocumentTemplate['category'];
  html_content: string;
  content?: any;
  variables?: Array<{ name: string; description: string; example: string }>;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateTemplateParams extends Partial<CreateTemplateParams> {
  id: string;
}

/**
 * Service de gestion des templates de documents
 */
export class DocumentTemplateService {
  /**
   * Récupère tous les templates
   */
  static async getTemplates(filters?: {
    category?: DocumentTemplate['category'];
    isPublic?: boolean;
    search?: string;
  }): Promise<DocumentTemplate[]> {
    try {
      let query = supabase
        .from('document_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DocumentTemplate[];
    } catch (error: any) {
      console.error('Error fetching document templates:', error);
      throw error;
    }
  }

  /**
   * Récupère un template par ID
   */
  static async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    } catch (error: any) {
      console.error('Error fetching document template:', error);
      return null;
    }
  }

  /**
   * Crée un nouveau template
   */
  static async createTemplate(params: CreateTemplateParams): Promise<DocumentTemplate> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          name: params.name,
          description: params.description || null,
          category: params.category,
          html_content: params.html_content,
          content: params.content || null,
          variables: params.variables || [],
          is_public: params.is_public || false,
          created_by: user.id,
          tags: params.tags || [],
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    } catch (error: any) {
      console.error('Error creating document template:', error);
      throw error;
    }
  }

  /**
   * Met à jour un template
   */
  static async updateTemplate(params: UpdateTemplateParams): Promise<DocumentTemplate> {
    try {
      const { id, ...updates } = params;

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.html_content) updateData.html_content = updates.html_content;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.variables !== undefined) updateData.variables = updates.variables;
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { data, error } = await supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    } catch (error: any) {
      console.error('Error updating document template:', error);
      throw error;
    }
  }

  /**
   * Supprime un template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting document template:', error);
      throw error;
    }
  }

  /**
   * Applique un template à un document
   */
  static async applyTemplate(templateId: string, documentId: string, variables?: Record<string, string>): Promise<void> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');

      // Remplacer les variables dans le contenu HTML
      let htmlContent = template.html_content;
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
      }

      // Mettre à jour le document
      const { error } = await supabase
        .from('documents')
        .update({
          html_content: htmlContent,
          content: template.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;

      // Incrémenter le compteur d'utilisation
      await supabase
        .from('document_templates')
        .update({
          usage_count: (template.usage_count || 0) + 1,
        })
        .eq('id', templateId);
    } catch (error: any) {
      console.error('Error applying document template:', error);
      throw error;
    }
  }

  /**
   * Duplique un template
   */
  static async duplicateTemplate(templateId: string, newName?: string): Promise<DocumentTemplate> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          name: newName || `${template.name} (Copie)`,
          description: template.description,
          category: template.category,
          html_content: template.html_content,
          content: template.content,
          variables: template.variables,
          is_public: false, // Les copies sont privées par défaut
          created_by: user.id,
          tags: template.tags,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    } catch (error: any) {
      console.error('Error duplicating document template:', error);
      throw error;
    }
  }

  /**
   * Récupère les templates recommandés selon le contexte
   */
  static async getRecommendedTemplates(context?: {
    category?: DocumentTemplate['category'];
    tags?: string[];
  }): Promise<DocumentTemplate[]> {
    try {
      let query = supabase
        .from('document_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (context?.category) {
        query = query.eq('category', context.category);
      }

      if (context?.tags && context.tags.length > 0) {
        // Filtrer par tags (recherche dans le tableau JSONB)
        query = query.contains('tags', context.tags);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DocumentTemplate[];
    } catch (error: any) {
      console.error('Error fetching recommended templates:', error);
      return [];
    }
  }
}
