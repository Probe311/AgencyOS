import React, { useState, useEffect } from 'react';
import {
  FileText, Upload, Sparkles, Loader2, CheckCircle2, AlertCircle,
  Play, Pause, Save, X, FileAudio, Trash2, Eye, Edit
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import {
  uploadAudioFile,
  generateAISummary,
  extractActionItems,
  generateInsights,
  checkSubscriptionAccess,
  type MeetingNote
} from '../../lib/services/meetingNotesService';
import { useMeetingNotes, useMeetingActionItems } from '../../lib/supabase/hooks/useMeetingNotes';
import { MeetingNotesView } from './MeetingNotesView';

interface MeetingNotesEditorProps {
  appointmentId: string;
  appointmentTitle?: string;
  appointmentDescription?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const MeetingNotesEditor: React.FC<MeetingNotesEditorProps> = ({
  appointmentId,
  appointmentTitle,
  appointmentDescription,
  isOpen,
  onClose,
  onSave
}) => {
  const { showToast, user } = useApp();
  const { notes, createNote, updateNote, loading: notesLoading } = useMeetingNotes(appointmentId);
  const [currentNote, setCurrentNote] = useState<MeetingNote | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  const [transcription, setTranscription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [aiSummary, setAiSummary] = useState('');
  const [actionItems, setActionItems] = useState<Array<any>>([]);
  const [insights, setInsights] = useState<Record<string, any> | null>(null);
  const [subscriptionAccess, setSubscriptionAccess] = useState<{
    transcription: { hasAccess: boolean; limit?: number; used?: number };
    insights: { hasAccess: boolean };
  } | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      checkAccess();
      setIsViewMode(false); // Réinitialiser le mode vue à l'ouverture
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (isOpen && user?.id && !notesLoading) {
      loadOrCreateNote();
    }
  }, [isOpen, appointmentId, user?.id, notes, notesLoading]);

  const checkAccess = async () => {
    if (!user?.id) return;

    const [transcriptionAccess, insightsAccess] = await Promise.all([
      checkSubscriptionAccess(user.id, 'transcription'),
      checkSubscriptionAccess(user.id, 'insights')
    ]);

    setSubscriptionAccess({
      transcription: transcriptionAccess,
      insights: insightsAccess
    });
  };

  const loadOrCreateNote = async () => {
    if (!user?.id || notesLoading) return;

    try {
      if (notes.length > 0) {
        const note = notes[0];
        setCurrentNote(note);
        setManualNotes(note.manual_notes || '');
        setTranscription(note.transcription_text || '');
        setAiSummary(note.ai_summary || '');
        setActionItems(note.action_items || []);
        setInsights(note.insights || null);
      } else if (!currentNote) {
        // Créer une nouvelle note seulement si on n'en a pas déjà une
        try {
          const newNote = await createNote(user.id);
          setCurrentNote(newNote);
        } catch (error: any) {
          // Si la note existe déjà (erreur de création), recharger
          console.log('Note might already exist, reloading...');
        }
      }
    } catch (error: any) {
      console.error('Error loading note:', error);
    }
  };

  // Recharger la note quand on revient du mode vue
  useEffect(() => {
    if (!isViewMode && currentNote && user?.id && !notesLoading) {
      loadOrCreateNote();
    }
  }, [isViewMode]);

  const handleAudioUpload = async (file: File) => {
    if (!currentNote || !user?.id) return;

    try {
      setAudioFile(file);
      showToast('Upload du fichier audio en cours...', 'info');

      // Vérifier l'accès
      const access = await checkSubscriptionAccess(user.id, 'transcription');
      if (!access.hasAccess) {
        showToast(access.message || 'Accès refusé à la transcription', 'error');
        return;
      }

      // Upload vers Supabase Storage
      const audioUrl = await uploadAudioFile(file, currentNote.id);

      // Mettre à jour la note
      const updatedNote = await updateNote(currentNote.id, {
        audio_file_url: audioUrl,
        transcription_status: 'processing'
      });
      if (updatedNote) setCurrentNote(updatedNote);

      showToast('Fichier audio uploadé. La transcription sera bientôt disponible.', 'info');
    } catch (error: any) {
      showToast(`Erreur upload: ${error.message}`, 'error');
    }
  };

  const handleGenerateAI = async () => {
    if (!currentNote || !user?.id) return;

    const textToAnalyze = transcription || manualNotes;
    if (!textToAnalyze.trim()) {
      showToast('Veuillez d\'abord ajouter une transcription ou des notes manuelles', 'error');
      return;
    }

    // Vérifier l'accès aux insights
    try {
      const access = await checkSubscriptionAccess(user.id, 'insights');
      if (!access.hasAccess) {
        showToast(access.message || 'Les insights IA nécessitent un plan Starter ou supérieur', 'error');
        return;
      }
    } catch (error: any) {
      showToast('Erreur lors de la vérification de l\'accès', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationStep('Génération du résumé...');

      // Générer le résumé
      let summary = '';
      try {
        summary = await generateAISummary(textToAnalyze, {
          appointmentTitle,
          appointmentDescription
        });
        setAiSummary(summary);
        setGenerationStep('Extraction des actions...');
      } catch (error: any) {
        console.error('Error generating summary:', error);
        showToast(`Erreur lors de la génération du résumé: ${error.message}`, 'error');
        setIsGenerating(false);
        setGenerationStep('');
        return;
      }

      // Extraire les actions
      let actions: Array<any> = [];
      try {
        actions = await extractActionItems(textToAnalyze, summary);
        setActionItems(actions);
        setGenerationStep('Génération des insights...');
      } catch (error: any) {
        console.error('Error extracting action items:', error);
        showToast(`Erreur lors de l'extraction des actions: ${error.message}`, 'warning');
        // Continuer même si l'extraction des actions échoue
      }

      // Générer les insights
      let generatedInsights: Record<string, any> | null = null;
      try {
        generatedInsights = await generateInsights(textToAnalyze, summary);
        setInsights(generatedInsights);
      } catch (error: any) {
        console.error('Error generating insights:', error);
        showToast(`Erreur lors de la génération des insights: ${error.message}`, 'warning');
        // Continuer même si la génération des insights échoue
      }

      // Sauvegarder dans la note (même si certaines étapes ont échoué)
      try {
        const updatedNote = await updateNote(currentNote.id, {
          ai_summary: summary,
          action_items: actions,
          insights: generatedInsights
        });
        if (updatedNote) setCurrentNote(updatedNote);
      } catch (error: any) {
        console.error('Error saving note:', error);
        showToast(`Erreur lors de la sauvegarde: ${error.message}`, 'warning');
      }

      setGenerationStep('');
      showToast('Résumé, actions et insights générés avec succès', 'success');
    } catch (error: any) {
      showToast(`Erreur génération IA: ${error.message}`, 'error');
      setGenerationStep('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentNote) return;

    try {
      const updatedNote = await updateNote(currentNote.id, {
        manual_notes: manualNotes,
        transcription_text: transcription
      });
      if (updatedNote) setCurrentNote(updatedNote);

      showToast('Notes sauvegardées', 'success');
      onSave?.();
    } catch (error: any) {
      showToast(`Erreur sauvegarde: ${error.message}`, 'error');
    }
  };

  const handleClose = () => {
    if (manualNotes || transcription) {
      if (confirm('Vous avez des modifications non sauvegardées. Voulez-vous les sauvegarder ?')) {
        handleSave();
      }
    }
    onClose();
  };

  // Si on est en mode visualisation et qu'on a une note, afficher MeetingNotesView
  if (isViewMode && currentNote) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Notes de réunion${appointmentTitle ? ` - ${appointmentTitle}` : ''}`}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              icon={Edit}
              onClick={() => setIsViewMode(false)}
            >
              Modifier
            </Button>
          </div>
          <MeetingNotesView
            note={currentNote}
            appointmentTitle={appointmentTitle}
            onEdit={() => setIsViewMode(false)}
            showToast={showToast}
            onExport={() => {
              // Recharger la note après export
              loadOrCreateNote();
            }}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Prise de notes de réunion"
      size="xl"
    >
      <div className="space-y-6">
        {/* Bouton bascule vue/édition */}
        {currentNote && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => setIsViewMode(true)}
            >
              Voir les notes
            </Button>
          </div>
        )}

        {/* Informations d'accès */}
        {subscriptionAccess && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm">
            {subscriptionAccess.transcription.limit && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <FileAudio size={14} />
                <span>
                  {subscriptionAccess.transcription.used || 0} / {subscriptionAccess.transcription.limit} transcriptions ce mois
                </span>
              </div>
            )}
            {!subscriptionAccess.insights.hasAccess && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle size={14} />
                <span>Les insights IA nécessitent un plan Starter ou supérieur</span>
              </div>
            )}
          </div>
        )}

        {/* Upload audio */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Fichier audio (optionnel)
          </label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAudioUpload(file);
              }}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload size={24} className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Cliquez pour uploader un fichier audio
              </span>
              {audioFile && (
                <span className="text-xs text-slate-500 mt-1">{audioFile.name}</span>
              )}
            </label>
          </div>
        </div>

        {/* Transcription */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Transcription
          </label>
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Collez ici la transcription de la réunion ou saisissez vos notes..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        {/* Notes manuelles */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Notes manuelles
          </label>
          <Textarea
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Ajoutez vos notes personnelles..."
            rows={6}
          />
        </div>

        {/* Bouton génération IA */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerateAI}
            disabled={isGenerating || (!transcription && !manualNotes)}
            icon={Sparkles}
            isLoading={isGenerating}
          >
            {isGenerating ? generationStep || 'Génération en cours...' : 'Générer résumé, actions et insights'}
          </Button>
          {subscriptionAccess && !subscriptionAccess.insights.hasAccess && (
            <Badge variant="warning" className="text-xs">
              Plan Starter+ requis
            </Badge>
          )}
        </div>

        {/* Résumé IA */}
        {aiSummary && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Résumé IA</h3>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {aiSummary}
            </p>
          </div>
        )}

        {/* Actions */}
        {actionItems.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Actions à faire ({actionItems.length})
              </h3>
            </div>
            <ul className="space-y-2">
              {actionItems.map((action, idx) => (
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
        {insights && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Insights</h3>
            </div>
            <div className="space-y-2 text-sm">
              {insights.sentiment && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Sentiment: </span>
                  <Badge variant={insights.sentiment === 'positif' ? 'success' : insights.sentiment === 'négatif' ? 'danger' : 'info'}>
                    {insights.sentiment}
                  </Badge>
                </div>
              )}
              {insights.interest_level && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Niveau d'intérêt: </span>
                  <Badge variant={insights.interest_level === 'élevé' ? 'success' : insights.interest_level === 'faible' ? 'danger' : 'info'}>
                    {insights.interest_level}
                  </Badge>
                </div>
              )}
              {insights.recommendations && insights.recommendations.length > 0 && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Recommandations:</span>
                  <ul className="list-disc list-inside mt-1 text-slate-600 dark:text-slate-400">
                    {insights.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
          <Button onClick={handleSave} icon={Save}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

