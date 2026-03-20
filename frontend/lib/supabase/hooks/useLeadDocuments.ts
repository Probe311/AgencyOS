import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export interface LeadDocument {
  id: string;
  leadId: string;
  name: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  category?: 'contrat' | 'devis' | 'facture' | 'note' | 'presentation' | 'autre';
  description?: string;
  isPrivate: boolean;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadDocuments = (leadId?: string) => {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadDocuments(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadDocuments = async (id: string) => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let query = supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });

      // Filtrer les documents privés
      query = query.or(`is_private.eq.false,uploaded_by.eq.${userId}`);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formatted: LeadDocument[] = (data || []).map((d: any) => ({
        id: d.id,
        leadId: d.lead_id,
        name: d.name,
        fileUrl: d.file_url,
        fileType: d.file_type,
        fileSize: d.file_size,
        category: d.category,
        description: d.description,
        isPrivate: d.is_private,
        uploadedBy: d.uploaded_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      setDocuments(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    leadId: string,
    file: File,
    category?: 'contrat' | 'devis' | 'facture' | 'note' | 'presentation' | 'autre',
    description?: string,
    isPrivate: boolean = false
  ): Promise<LeadDocument> => {
    try {
      setUploading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${Date.now()}.${fileExt}`;
      const filePath = `lead-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data, error: insertError } = await supabase
        .from('lead_documents')
        .insert({
          lead_id: leadId,
          name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          category: category,
          description: description,
          is_private: isPrivate,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newDocument: LeadDocument = {
        id: data.id,
        leadId: data.lead_id,
        name: data.name,
        fileUrl: data.file_url,
        fileType: data.file_type,
        fileSize: data.file_size,
        category: data.category,
        description: data.description,
        isPrivate: data.is_private,
        uploadedBy: data.uploaded_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setDocuments([newDocument, ...documents]);
      return newDocument;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const document = documents.find(d => d.id === id);
      if (!document) throw new Error('Document non trouvé');

      // Delete from storage
      const filePath = document.fileUrl.split('/').slice(-2).join('/');
      await supabase.storage
        .from('documents')
        .remove([`lead-documents/${filePath}`]);

      // Delete record
      const { error: deleteError } = await supabase
        .from('lead_documents')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    uploading,
    loadDocuments,
    uploadDocument,
    deleteDocument,
  };
};

