import React, { useState, useEffect } from 'react';
import { History, Clock, User, RotateCcw, Eye, GitCompare, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { DocumentEditorService, DocumentVersion } from '../../lib/services/documentEditorService';

interface DocumentVersionHistoryProps {
  documentId: string;
  onRestore?: (versionId: string) => void;
}

export const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  documentId,
  onRestore,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<DocumentVersion | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const loadedVersions = await DocumentEditorService.getVersions(documentId);
      setVersions(loadedVersions);
    } catch (error: any) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Restaurer cette version ? La version actuelle sera sauvegardée.')) return;

    try {
      await DocumentEditorService.restoreVersion(versionId, documentId);
      await loadVersions();
      if (onRestore) {
        onRestore(versionId);
      }
    } catch (error: any) {
      console.error('Error restoring version:', error);
    }
  };

  const handleCompare = (version1: DocumentVersion, version2: DocumentVersion) => {
    setSelectedVersion(version1);
    setCompareVersion(version2);
    setIsCompareOpen(true);
  };

  const getDiff = (html1: string, html2: string): string => {
    // Simple diff basique - peut être amélioré avec une bibliothèque de diff
    if (html1 === html2) {
      return 'Aucune différence';
    }
    
    const text1 = html1.replace(/<[^>]*>/g, '').trim();
    const text2 = html2.replace(/<[^>]*>/g, '').trim();
    
    if (text1.length !== text2.length) {
      return `Différence de ${Math.abs(text1.length - text2.length)} caractères`;
    }
    
    return 'Contenu modifié';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">Chargement de l'historique...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History size={20} />
          Historique des versions ({versions.length})
        </h3>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className={`p-4 border rounded-lg transition-all ${
              version.is_current
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={version.is_current ? 'green' : 'slate'}>
                    Version {version.version_number}
                    {version.is_current && ' (Actuelle)'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Clock size={14} />
                    {new Date(version.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {version.change_summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {version.change_summary}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {version.created_by ? 'Utilisateur' : 'Système'}
                  </div>
                  {version.html_content && (
                    <div className="flex items-center gap-1">
                      <span>{version.html_content.length} caractères</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!version.is_current && (
                  <>
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={GitCompare}
                        onClick={() => handleCompare(version, versions[index - 1])}
                        title="Comparer avec la version précédente"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => {
                        setSelectedVersion(version);
                        setIsPreviewOpen(true);
                      }}
                      title="Prévisualiser"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => handleRestore(version.id)}
                      title="Restaurer cette version"
                    >
                      Restaurer
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de comparaison */}
      <Modal
        isOpen={isCompareOpen}
        onClose={() => {
          setIsCompareOpen(false);
          setSelectedVersion(null);
          setCompareVersion(null);
        }}
        title="Comparaison des versions"
        size="xl"
      >
        {selectedVersion && compareVersion && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge>Version {selectedVersion.version_number}</Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(selectedVersion.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div
                  className="prose prose-slate dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedVersion.html_content || '' }}
                />
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge>Version {compareVersion.version_number}</Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(compareVersion.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div
                  className="prose prose-slate dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: compareVersion.html_content || '' }}
                />
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Différence détectée:</strong>{' '}
                {getDiff(selectedVersion.html_content || '', compareVersion.html_content || '')}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de prévisualisation */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedVersion(null);
        }}
        title={`Prévisualisation - Version ${selectedVersion?.version_number}`}
        size="lg"
      >
        {selectedVersion && (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: selectedVersion.html_content || '' }} />
          </div>
        )}
      </Modal>
    </div>
  );
};
