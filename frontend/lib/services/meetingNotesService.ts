/**
 * Service de prise de notes de réunion avec transcription audio et génération IA
 * Intégré avec l'agenda et le système d'abonnement
 */

import { supabase } from '../supabase';
import { callGeminiAPI } from '../ai-client';

export interface MeetingNote {
  id: string;
  appointment_id: string;
  user_id: string;
  transcription_text?: string;
  manual_notes?: string;
  ai_summary?: string;
  action_items: Array<{
    description: string;
    assigned_to?: string;
    due_date?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }>;
  insights?: Record<string, any>;
  audio_file_url?: string;
  transcription_status: 'pending' | 'processing' | 'completed' | 'error';
  language?: string;
  duration_seconds?: number;
  word_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface MeetingActionItem {
  id: string;
  meeting_note_id: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at?: string;
}

export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';

interface SubscriptionLimits {
  transcriptionsPerMonth: number;
  hasInsights: boolean;
  hasAdvancedFeatures: boolean;
}

/**
 * Vérifie l'accès d'un utilisateur selon son plan d'abonnement
 */
export async function checkSubscriptionAccess(
  userId: string,
  feature: 'transcription' | 'insights' | 'advanced'
): Promise<{ hasAccess: boolean; limit?: number; used?: number; message?: string }> {
  try {
    // Récupérer le plan de l'utilisateur via user_clients -> clients
    const { data: userClient, error: userClientError } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (userClientError || !userClient) {
      // Pas de client associé, utiliser le plan free par défaut
      return getPlanLimits('free', feature);
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('plan')
      .eq('id', userClient.client_id)
      .single();

    if (clientError || !client) {
      return getPlanLimits('free', feature);
    }

    const plan = (client.plan || 'free') as SubscriptionPlan;
    const limits = getPlanLimits(plan, feature);

    // Pour les transcriptions, vérifier l'utilisation mensuelle
    if (feature === 'transcription' && limits.limit) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('meeting_notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .eq('transcription_status', 'completed');

      const used = count || 0;
      const hasAccess = used < limits.limit;

      return {
        hasAccess,
        limit: limits.limit,
        used,
        message: hasAccess
          ? undefined
          : `Limite de ${limits.limit} transcriptions/mois atteinte. Passez à un plan supérieur pour plus de transcriptions.`
      };
    }

    return limits;
  } catch (error) {
    console.error('Error checking subscription access:', error);
    // En cas d'erreur, autoriser l'accès (fail open)
    return { hasAccess: true };
  }
}

/**
 * Retourne les limites selon le plan
 */
function getPlanLimits(
  plan: SubscriptionPlan,
  feature: 'transcription' | 'insights' | 'advanced'
): { hasAccess: boolean; limit?: number; message?: string } {
  const planLimits: Record<SubscriptionPlan, SubscriptionLimits> = {
    free: {
      transcriptionsPerMonth: 5,
      hasInsights: false,
      hasAdvancedFeatures: false
    },
    starter: {
      transcriptionsPerMonth: 20,
      hasInsights: true,
      hasAdvancedFeatures: false
    },
    professional: {
      transcriptionsPerMonth: -1, // Illimité
      hasInsights: true,
      hasAdvancedFeatures: true
    },
    enterprise: {
      transcriptionsPerMonth: -1, // Illimité
      hasInsights: true,
      hasAdvancedFeatures: true
    }
  };

  const limits = planLimits[plan];

  switch (feature) {
    case 'transcription':
      return {
        hasAccess: true,
        limit: limits.transcriptionsPerMonth === -1 ? undefined : limits.transcriptionsPerMonth
      };
    case 'insights':
      return {
        hasAccess: limits.hasInsights,
        message: limits.hasInsights
          ? undefined
          : 'Les insights IA nécessitent un plan Starter ou supérieur.'
      };
    case 'advanced':
      return {
        hasAccess: limits.hasAdvancedFeatures,
        message: limits.hasAdvancedFeatures
          ? undefined
          : 'Les fonctionnalités avancées nécessitent un plan Professional ou supérieur.'
      };
    default:
      return { hasAccess: false };
  }
}

/**
 * Crée une note de réunion liée à un rendez-vous
 */
export async function createMeetingNote(
  appointmentId: string,
  userId: string
): Promise<MeetingNote> {
  try {
    const { data, error } = await supabase
      .from('meeting_notes')
      .insert({
        appointment_id: appointmentId,
        user_id: userId,
        transcription_status: 'pending',
        action_items: [],
        language: 'fr'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error creating meeting note:', error);
    throw new Error(`Erreur lors de la création de la note: ${error.message}`);
  }
}

/**
 * Transcrit un fichier audio (via API externe)
 * Note: Cette fonction nécessite une intégration avec un service de transcription
 * Pour l'instant, retourne une erreur indiquant qu'il faut uploader manuellement
 */
export async function transcribeAudio(
  audioFile: File,
  language?: string
): Promise<string> {
  try {
    // Vérifier l'accès à la transcription
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const access = await checkSubscriptionAccess(user.id, 'transcription');
    if (!access.hasAccess) {
      throw new Error(access.message || 'Accès refusé à la transcription');
    }

    // TODO: Intégrer avec un service de transcription (Whisper, Google Speech-to-Text, etc.)
    // Pour l'instant, on retourne une erreur indiquant qu'il faut uploader manuellement
    throw new Error(
      'La transcription audio automatique sera bientôt disponible. ' +
      'Vous pouvez pour l\'instant uploader une transcription manuelle.'
    );
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

/**
 * Upload un fichier audio vers Supabase Storage
 */
export async function uploadAudioFile(
  audioFile: File,
  meetingNoteId: string
): Promise<string> {
  try {
    const fileExt = audioFile.name.split('.').pop();
    const fileName = `${meetingNoteId}-${Date.now()}.${fileExt}`;
    const filePath = `meeting-notes/${fileName}`;

    const { data, error } = await supabase.storage
      .from('meeting-audio')
      .upload(filePath, audioFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('meeting-audio')
      .getPublicUrl(filePath);

    // Mettre à jour la note avec l'URL du fichier
    await supabase
      .from('meeting_notes')
      .update({ audio_file_url: publicUrl })
      .eq('id', meetingNoteId);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading audio file:', error);
    throw new Error(`Erreur lors de l'upload du fichier audio: ${error.message}`);
  }
}

/**
 * Génère un résumé IA de la transcription
 */
export async function generateAISummary(
  transcription: string,
  context?: {
    appointmentTitle?: string;
    appointmentDescription?: string;
    leadData?: any;
  }
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const access = await checkSubscriptionAccess(user.id, 'insights');
    if (!access.hasAccess) {
      throw new Error(access.message || 'Accès refusé aux insights IA');
    }

    let prompt = `Tu es un assistant expert en analyse de réunions. Analyse la transcription suivante d'une réunion et génère un résumé structuré et concis.

Transcription de la réunion:
${transcription}

`;

    if (context?.appointmentTitle) {
      prompt += `Titre de la réunion: ${context.appointmentTitle}\n`;
    }
    if (context?.appointmentDescription) {
      prompt += `Description: ${context.appointmentDescription}\n`;
    }
    if (context?.leadData) {
      prompt += `Contexte client: ${JSON.stringify(context.leadData)}\n`;
    }

    prompt += `\nGénère un résumé structuré en français qui inclut:
1. Points clés discutés
2. Décisions prises
3. Prochaines étapes mentionnées
4. Questions ouvertes

Format: Texte structuré avec des sections claires.`;

    const summary = await callGeminiAPI(prompt, {
      model: 'gemini-2.0-flash-exp',
      retryConfig: {
        maxRetries: 2,
        initialDelay: 1000
      }
    });

    return summary;
  } catch (error: any) {
    console.error('Error generating AI summary:', error);
    throw new Error(`Erreur lors de la génération du résumé: ${error.message}`);
  }
}

/**
 * Extrait les actions à faire depuis la transcription
 */
export async function extractActionItems(
  transcription: string,
  summary?: string
): Promise<Array<{
  description: string;
  assigned_to?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const access = await checkSubscriptionAccess(user.id, 'insights');
    if (!access.hasAccess) {
      throw new Error(access.message || 'Accès refusé aux insights IA');
    }

    const prompt = `Analyse la transcription suivante d'une réunion et extrais toutes les actions à faire (tâches, TODO, engagements).

${summary ? `Résumé de la réunion:\n${summary}\n\n` : ''}Transcription complète:
${transcription}

Extrais toutes les actions mentionnées avec:
- Description claire de l'action
- Personne assignée (si mentionnée)
- Date d'échéance (si mentionnée)
- Priorité (low, medium, high, urgent)

Retourne UNIQUEMENT un JSON valide avec ce format:
{
  "actions": [
    {
      "description": "Description de l'action",
      "assigned_to": "Nom de la personne ou null",
      "due_date": "YYYY-MM-DD ou null",
      "priority": "low|medium|high|urgent"
    }
  ]
}`;

    const response = await callGeminiAPI(prompt, {
      model: 'gemini-2.0-flash-exp',
      retryConfig: {
        maxRetries: 2,
        initialDelay: 1000
      }
    });

    // Parser la réponse JSON
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedResponse);
    const actions = parsed.actions || [];

    return actions.map((action: any) => ({
      description: action.description || '',
      assigned_to: action.assigned_to || undefined,
      due_date: action.due_date || undefined,
      status: 'pending' as const,
      priority: (action.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent'
    }));
  } catch (error: any) {
    console.error('Error extracting action items:', error);
    throw new Error(`Erreur lors de l'extraction des actions: ${error.message}`);
  }
}

/**
 * Génère des insights business depuis la transcription
 */
export async function generateInsights(
  transcription: string,
  summary?: string,
  leadData?: any
): Promise<Record<string, any>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const access = await checkSubscriptionAccess(user.id, 'insights');
    if (!access.hasAccess) {
      throw new Error(access.message || 'Accès refusé aux insights IA');
    }

    const prompt = `Analyse la transcription suivante d'une réunion commerciale et génère des insights business pertinents.

${summary ? `Résumé de la réunion:\n${summary}\n\n` : ''}Transcription complète:
${transcription}

${leadData ? `Contexte client:\n${JSON.stringify(leadData)}\n\n` : ''}

Génère des insights structurés incluant:
- Sentiment général de la réunion (positif, neutre, négatif)
- Niveau d'intérêt du client (faible, moyen, élevé)
- Points de friction ou préoccupations mentionnés
- Opportunités identifiées
- Recommandations pour le suivi

Retourne UNIQUEMENT un JSON valide avec ce format:
{
  "sentiment": "positif|neutre|négatif",
  "interest_level": "faible|moyen|élevé",
  "concerns": ["préoccupation 1", "préoccupation 2"],
  "opportunities": ["opportunité 1", "opportunité 2"],
  "recommendations": ["recommandation 1", "recommandation 2"]
}`;

    const response = await callGeminiAPI(prompt, {
      model: 'gemini-2.0-flash-exp',
      retryConfig: {
        maxRetries: 2,
        initialDelay: 1000
      }
    });

    // Parser la réponse JSON
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedResponse);
    return parsed;
  } catch (error: any) {
    console.error('Error generating insights:', error);
    throw new Error(`Erreur lors de la génération des insights: ${error.message}`);
  }
}

/**
 * Met à jour une note de réunion
 */
export async function updateMeetingNote(
  noteId: string,
  updates: Partial<MeetingNote>
): Promise<MeetingNote> {
  try {
    const { data, error } = await supabase
      .from('meeting_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error updating meeting note:', error);
    throw new Error(`Erreur lors de la mise à jour de la note: ${error.message}`);
  }
}

/**
 * Récupère les notes d'un rendez-vous
 */
export async function getMeetingNotes(appointmentId: string): Promise<MeetingNote[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error getting meeting notes:', error);
    throw new Error(`Erreur lors de la récupération des notes: ${error.message}`);
  }
}

/**
 * Récupère une note par son ID
 */
export async function getMeetingNoteById(noteId: string): Promise<MeetingNote | null> {
  try {
    const { data, error } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  } catch (error: any) {
    console.error('Error getting meeting note:', error);
    throw new Error(`Erreur lors de la récupération de la note: ${error.message}`);
  }
}

/**
 * Supprime une note de réunion
 */
export async function deleteMeetingNote(noteId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('meeting_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting meeting note:', error);
    throw new Error(`Erreur lors de la suppression de la note: ${error.message}`);
  }
}

/**
 * Crée une action à faire depuis une note
 */
export async function createActionItem(
  meetingNoteId: string,
  actionItem: Omit<MeetingActionItem, 'id' | 'meeting_note_id' | 'created_at' | 'updated_at'>
): Promise<MeetingActionItem> {
  try {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .insert({
        meeting_note_id: meetingNoteId,
        ...actionItem
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error creating action item:', error);
    throw new Error(`Erreur lors de la création de l'action: ${error.message}`);
  }
}

/**
 * Met à jour une action à faire
 */
export async function updateActionItem(
  actionItemId: string,
  updates: Partial<MeetingActionItem>
): Promise<MeetingActionItem> {
  try {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .update(updates)
      .eq('id', actionItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error updating action item:', error);
    throw new Error(`Erreur lors de la mise à jour de l'action: ${error.message}`);
  }
}

/**
 * Récupère les actions d'une note
 */
export async function getActionItems(meetingNoteId: string): Promise<MeetingActionItem[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .select('*')
      .eq('meeting_note_id', meetingNoteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error getting action items:', error);
    throw new Error(`Erreur lors de la récupération des actions: ${error.message}`);
  }
}

/**
 * Supprime une action à faire
 */
export async function deleteActionItem(actionItemId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('meeting_action_items')
      .delete()
      .eq('id', actionItemId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting action item:', error);
    throw new Error(`Erreur lors de la suppression de l'action: ${error.message}`);
  }
}

