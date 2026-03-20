import React, { useState } from 'react';
import { FileText, Sparkles, CheckCircle2, Download, Share2, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { MeetingNote } from '../../lib/services/meetingNotesService';
import { exportMeetingNoteToPDF, exportMeetingNoteToMarkdown } from '../../lib/services/meetingNotesExport';

interface MeetingNotesViewProps {
  note: MeetingNote;
  appointmentTitle?: string;
  onEdit?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MeetingNotesView: React.FC<MeetingNotesViewProps> = ({
  note,
  appointmentTitle,
  onEdit,
  onExport,
  onShare,
  showToast
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportMeetingNoteToPDF(note, appointmentTitle);
      showToast?.('PDF exporté avec succès', 'success');
      onExport?.();
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showToast?.(`Erreur lors de l'export PDF: ${error.message}`, 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportMarkdown = () => {
    try {
      exportMeetingNoteToMarkdown(note, appointmentTitle);
      showToast?.('Markdown exporté avec succès', 'success');
      onExport?.();
    } catch (error: any) {
      console.error('Error exporting Markdown:', error);
      showToast?.(`Erreur lors de l'export Markdown: ${error.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notes de réunion</h2>
        </div>
        <div className="flex gap-2">
          {onShare && (
            <Button variant="outline" size="sm" icon={Share2} onClick={onShare}>
              Partager
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            icon={isExportingPDF ? Loader2 : FileText}
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            isLoading={isExportingPDF}
          >
            {isExportingPDF ? 'Génération...' : 'Export PDF'}
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportMarkdown}>
            Export MD
          </Button>
          {onEdit && (
            <Button variant="primary" size="sm" onClick={onEdit}>
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Résumé IA */}
      {note.ai_summary && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Résumé IA</h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {note.ai_summary}
          </p>
        </div>
      )}

      {/* Transcription */}
      {note.transcription_text && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Transcription</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
            {note.transcription_text}
          </p>
        </div>
      )}

      {/* Notes manuelles */}
      {note.manual_notes && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Notes manuelles</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {note.manual_notes}
          </p>
        </div>
      )}

      {/* Actions */}
      {note.action_items && note.action_items.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
              Actions à faire ({note.action_items.length})
            </h3>
          </div>
          <ul className="space-y-2">
            {note.action_items.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                <div className="flex-1">
                  <span className="text-slate-700 dark:text-slate-300">{action.description}</span>
                  {action.assigned_to && (
                    <span className="text-slate-500 dark:text-slate-400 ml-2">
                      → {action.assigned_to}
                    </span>
                  )}
                  {action.due_date && (
                    <span className="text-slate-500 dark:text-slate-400 ml-2">
                      ({new Date(action.due_date).toLocaleDateString('fr-FR')})
                    </span>
                  )}
                </div>
                <Badge
                  variant={action.priority === 'urgent' ? 'danger' : action.priority === 'high' ? 'warning' : 'info'}
                  className="text-xs"
                >
                  {action.priority}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {note.insights && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-purple-900 dark:text-purple-100">Insights</h3>
          </div>
          <div className="space-y-2 text-sm">
            {note.insights.sentiment && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Sentiment: </span>
                <Badge variant={note.insights.sentiment === 'positif' ? 'success' : note.insights.sentiment === 'négatif' ? 'danger' : 'info'}>
                  {note.insights.sentiment}
                </Badge>
              </div>
            )}
            {note.insights.interest_level && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Niveau d'intérêt: </span>
                <Badge variant={note.insights.interest_level === 'élevé' ? 'success' : note.insights.interest_level === 'faible' ? 'danger' : 'info'}>
                  {note.insights.interest_level}
                </Badge>
              </div>
            )}
            {note.insights.recommendations && Array.isArray(note.insights.recommendations) && note.insights.recommendations.length > 0 && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Recommandations:</span>
                <ul className="list-disc list-inside mt-1 text-slate-600 dark:text-slate-400">
                  {note.insights.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Métadonnées */}
      <div className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
        Créé le {new Date(note.created_at).toLocaleString('fr-FR')}
        {note.updated_at && note.updated_at !== note.created_at && (
          <> • Modifié le {new Date(note.updated_at).toLocaleString('fr-FR')}</>
        )}
        {note.word_count && <> • {note.word_count} mots</>}
        {note.duration_seconds && <> • {Math.floor(note.duration_seconds / 60)} min</>}
      </div>
    </div>
  );
};

