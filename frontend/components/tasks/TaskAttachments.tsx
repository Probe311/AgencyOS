import React, { useState } from 'react';
import { Paperclip, X, Download, File, Image as ImageIcon, FileText, Video, Music, Archive } from 'lucide-react';
import { Button } from '../ui/Button';
import { FileInput } from '../ui/FileInput';
import { uploadFile, deleteFile } from '../../lib/utils/upload';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';

interface TaskAttachmentsProps {
  taskId: string;
  attachments: string[];
  onAttachmentsChange: (attachments: string[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const getFileIcon = (url: string) => {
  const extension = url.split('.').pop()?.toLowerCase();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'webm'];
  const audioExtensions = ['mp3', 'wav', 'ogg'];
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];

  if (imageExtensions.includes(extension || '')) return ImageIcon;
  if (videoExtensions.includes(extension || '')) return Video;
  if (audioExtensions.includes(extension || '')) return Music;
  if (archiveExtensions.includes(extension || '')) return Archive;
  if (documentExtensions.includes(extension || '')) return FileText;
  return File;
};

const getFileName = (url: string): string => {
  try {
    const path = url.split('/').pop() || '';
    return decodeURIComponent(path);
  } catch {
    return url.split('/').pop() || 'fichier';
  }
};

export const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  taskId,
  attachments,
  onAttachmentsChange,
}) => {
  const { showToast } = useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      showToast(`Le fichier est trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`, 'error');
      return;
    }

    setUploading(true);
    setUploadingFile(file.name);

    try {
      const result = await uploadFile(file, `task-attachments/${taskId}`);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.url) {
        const newAttachments = [...attachments, result.url];
        await updateTaskAttachments(newAttachments);
        onAttachmentsChange(newAttachments);
        showToast('Fichier uploadé avec succès', 'success');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast(error instanceof Error ? error.message : 'Erreur lors de l\'upload', 'error');
    } finally {
      setUploading(false);
      setUploadingFile(null);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (attachmentUrl: string) => {
    try {
      // Extract path from URL
      const urlParts = attachmentUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'agencyos-files');
      if (bucketIndex === -1) {
        throw new Error('URL invalide');
      }
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      await deleteFile(filePath);
      
      const newAttachments = attachments.filter(url => url !== attachmentUrl);
      await updateTaskAttachments(newAttachments);
      onAttachmentsChange(newAttachments);
      
      showToast('Fichier supprimé avec succès', 'success');
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(error instanceof Error ? error.message : 'Erreur lors de la suppression', 'error');
    }
  };

  const updateTaskAttachments = async (newAttachments: string[]) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ attachments: newAttachments })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task attachments:', error);
      throw error;
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-slate-600 dark:text-slate-400" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            Pièces jointes ({attachments.length})
          </h4>
        </div>
      </div>

      {uploading && (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-3 flex items-center gap-3">
          <Loader size="sm" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Upload en cours: {uploadingFile}
          </span>
        </div>
      )}

      <FileInput
        label=""
        accept="*/*"
        onChange={handleFileSelect}
        disabled={uploading}
        dropzoneText={uploading ? 'Upload en cours...' : 'Ajouter des fichiers'}
        helpText="Taille maximum: 10 MB"
        containerClassName="w-full"
      />

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((url, index) => {
            const Icon = getFileIcon(url);
            const fileName = getFileName(url);

            return (
              <div
                key={index}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded">
                    <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {fileName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(url)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500 p-1"
                    title="Télécharger"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(url)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-500 p-1"
                    title="Supprimer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          Aucune pièce jointe
        </p>
      )}
    </div>
  );
};

