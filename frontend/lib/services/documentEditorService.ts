import { supabase } from '../supabase';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: any; // JSONB structure
  html_content?: string;
  created_by?: string;
  created_at: string;
  change_summary?: string;
  is_current: boolean;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  version_id?: string;
  parent_comment_id?: string;
  user_id: string;
  content: string;
  selection_start?: number;
  selection_end?: number;
  selection_text?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  replies?: DocumentComment[];
}

export interface DocumentCollaborator {
  id: string;
  document_id: string;
  user_id: string;
  cursor_position?: number;
  selection_start?: number;
  selection_end?: number;
  last_active_at: string;
  is_typing: boolean;
  users?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  content: any;
  html_content?: string;
  thumbnail_url?: string;
  is_public: boolean;
  created_by?: string;
  usage_count: number;
}

/**
 * Service de gestion de l'éditeur collaboratif de documents
 */
export class DocumentEditorService {
  /**
   * Crée une nouvelle version du document
   */
  static async createVersion(
    documentId: string,
    content: any,
    htmlContent: string,
    changeSummary?: string,
    userId?: string
  ): Promise<DocumentVersion> {
    // Récupérer le numéro de version actuel
    const { data: currentVersion } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const versionNumber = currentVersion ? currentVersion.version_number + 1 : 1;

    // Marquer l'ancienne version comme non actuelle
    await supabase
      .from('document_versions')
      .update({ is_current: false })
      .eq('document_id', documentId)
      .eq('is_current', true);

    // Créer la nouvelle version
    const { data, error } = await supabase
      .from('document_versions')
      .insert([{
        document_id: documentId,
        version_number: versionNumber,
        content,
        html_content: htmlContent,
        created_by: userId,
        change_summary: changeSummary,
        is_current: true
      }])
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour le document
    await supabase
      .from('documents')
      .update({
        content,
        html_content: htmlContent,
        current_version: versionNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    return data;
  }

  /**
   * Récupère toutes les versions d'un document
   */
  static async getVersions(documentId: string): Promise<DocumentVersion[]> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*, users(id, name, email)')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Restaure une version précédente
   */
  static async restoreVersion(versionId: string, documentId: string): Promise<void> {
    const { data: version, error: fetchError } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (fetchError || !version) throw new Error('Version not found');

    // Créer une nouvelle version avec le contenu restauré
    await this.createVersion(
      documentId,
      version.content,
      version.html_content || '',
      `Restauration de la version ${version.version_number}`,
      version.created_by
    );
  }

  /**
   * Ajoute un commentaire sur le document
   */
  static async addComment(
    documentId: string,
    content: string,
    userId: string,
    versionId?: string,
    parentCommentId?: string,
    selectionStart?: number,
    selectionEnd?: number,
    selectionText?: string
  ): Promise<DocumentComment> {
    const { data, error } = await supabase
      .from('document_comments')
      .insert([{
        document_id: documentId,
        version_id: versionId,
        parent_comment_id: parentCommentId,
        user_id: userId,
        content,
        selection_start: selectionStart,
        selection_end: selectionEnd,
        selection_text: selectionText
      }])
      .select('*, users(id, name, email, avatar_url)')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Récupère tous les commentaires d'un document
   */
  static async getComments(documentId: string, versionId?: string): Promise<DocumentComment[]> {
    let query = supabase
      .from('document_comments')
      .select('*, users(id, name, email, avatar_url)')
      .eq('document_id', documentId)
      .is('parent_comment_id', null); // Commentaires principaux seulement

    if (versionId) {
      query = query.eq('version_id', versionId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    // Récupérer les réponses pour chaque commentaire
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('document_comments')
          .select('*, users(id, name, email, avatar_url)')
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || []
        };
      })
    );

    return commentsWithReplies;
  }

  /**
   * Résout un commentaire
   */
  static async resolveComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('document_comments')
      .update({
        resolved: true,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) throw error;
  }

  /**
   * Met à jour la position du curseur d'un collaborateur
   */
  static async updateCollaboratorCursor(
    documentId: string,
    userId: string,
    cursorPosition?: number,
    selectionStart?: number,
    selectionEnd?: number,
    isTyping?: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('document_collaborators')
      .upsert([{
        document_id: documentId,
        user_id: userId,
        cursor_position: cursorPosition,
        selection_start: selectionStart,
        selection_end: selectionEnd,
        is_typing: isTyping || false,
        last_active_at: new Date().toISOString()
      }], {
        onConflict: 'document_id,user_id'
      });

    if (error) throw error;
  }

  /**
   * Récupère les collaborateurs actifs
   */
  static async getActiveCollaborators(documentId: string): Promise<DocumentCollaborator[]> {
    // Récupérer les collaborateurs actifs dans les 30 dernières secondes
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data, error } = await supabase
      .from('document_collaborators')
      .select('*, users(id, name, email, avatar_url)')
      .eq('document_id', documentId)
      .gte('last_active_at', thirtySecondsAgo)
      .order('last_active_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Supprime un collaborateur (quand il quitte le document)
   */
  static async removeCollaborator(documentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('document_collaborators')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Récupère les templates disponibles
   */
  static async getTemplates(category?: string): Promise<DocumentTemplate[]> {
    let query = supabase
      .from('document_templates')
      .select('*')
      .or('is_public.eq.true');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Crée un document à partir d'un template
   */
  static async createFromTemplate(
    templateId: string,
    name: string,
    projectId?: string,
    userId?: string
  ): Promise<string> {
    // Récupérer le template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) throw new Error('Template not found');

    // Créer le document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert([{
        name,
        project_id: projectId,
        uploaded_by: userId,
        content: template.content,
        html_content: template.html_content,
        is_collaborative: true,
        current_version: 1
      }])
      .select()
      .single();

    if (docError) throw docError;

    // Créer la version initiale
    await this.createVersion(
      document.id,
      template.content,
      template.html_content || '',
      'Document créé à partir du template',
      userId
    );

    // Incrémenter le compteur d'utilisation
    await supabase
      .from('document_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', templateId);

    return document.id;
  }
}

