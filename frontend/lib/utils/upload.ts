import { supabase, isSupabaseConfigured } from '../supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export const uploadFile = async (
  file: File,
  folder: string = 'task-attachments'
): Promise<UploadResult> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase n\'est pas configuré');
  }

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('agencyos-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('agencyos-files')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      url: '',
      path: '',
      error: error instanceof Error ? error.message : 'Erreur lors de l\'upload',
    };
  }
};

export const deleteFile = async (filePath: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase n\'est pas configuré');
  }

  try {
    const { error } = await supabase.storage
      .from('agencyos-files')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

