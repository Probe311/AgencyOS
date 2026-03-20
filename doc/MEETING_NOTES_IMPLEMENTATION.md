# Service de Prise de Notes de Réunion - Documentation

## Vue d'ensemble

Le service de prise de notes de réunion est une fonctionnalité complète intégrée à l'agenda et au système d'abonnement IA. Il permet de prendre des notes manuelles, d'uploader des fichiers audio, de générer des transcriptions, et d'utiliser l'IA pour créer des résumés, extraire des actions et générer des insights.

## Architecture

### Base de données

#### Table `meeting_notes`
- **Structure** : Stocke les notes de réunion liées aux appointments
- **Champs principaux** :
  - `appointment_id` : Référence vers l'appointment
  - `user_id` : Utilisateur propriétaire
  - `transcription_text` : Transcription du fichier audio
  - `manual_notes` : Notes saisies manuellement
  - `ai_summary` : Résumé généré par l'IA
  - `action_items` : Actions extraites (JSONB)
  - `insights` : Insights générés (JSONB)
  - `audio_file_url` : URL du fichier audio uploadé
  - `transcription_status` : Statut de la transcription

#### Table `meeting_action_items`
- **Structure** : Actions à faire extraites des notes
- **Champs** : description, assigned_to, due_date, status, priority

### Services

#### `meetingNotesService.ts`
Service principal pour gérer les notes de réunion :
- `createMeetingNote()` : Créer une nouvelle note
- `updateMeetingNote()` : Mettre à jour une note
- `getMeetingNotes()` : Récupérer les notes d'un appointment
- `uploadAudioFile()` : Uploader un fichier audio vers Supabase Storage
- `generateAISummary()` : Générer un résumé IA
- `extractActionItems()` : Extraire les actions à faire
- `generateInsights()` : Générer des insights
- `checkSubscriptionAccess()` : Vérifier les accès selon le plan

### Hooks React

#### `useMeetingNotes.ts`
Hook personnalisé pour gérer les notes :
- Charge automatiquement les notes d'un appointment
- Fournit des fonctions CRUD
- Gère l'état de chargement et les erreurs

### Composants UI

#### `MeetingNotesEditor.tsx`
Éditeur complet de notes avec :
- Saisie manuelle de notes
- Upload de fichier audio
- Affichage de la transcription
- Génération IA (résumé, actions, insights)
- Gestion des accès par plan d'abonnement

#### `MeetingNotesView.tsx`
Vue en lecture seule avec :
- Affichage du résumé
- Liste des actions
- Insights
- Export PDF (à implémenter)
- Partage (à implémenter)

## Intégrations

### AppointmentScheduler
- Bouton "Prendre des notes" dans la modal d'édition d'appointment
- Ouverture directe de l'éditeur de notes

### AgendaView
- Chargement automatique des appointments avec leurs notes
- Indicateur visuel (icône FileText) sur les événements avec notes
- Bouton "Prendre des notes" / "Voir les notes" dans la modal de détails
- Rechargement automatique après sauvegarde

## Plans d'abonnement

### Free
- 5 transcriptions par mois
- Pas d'insights IA
- Fonctionnalités de base

### Starter
- 20 transcriptions par mois
- Insights basiques
- Résumé et actions IA

### Professional
- Transcriptions illimitées
- Toutes les fonctionnalités IA
- Export et partage

### Enterprise
- Transcriptions illimitées
- Toutes les fonctionnalités
- Accès API

## Fonctionnalités IA

### Résumé automatique
- Génération via Gemini/Groq/Mistral/OpenRouter
- Résumé structuré des points clés
- Adaptation au contexte de l'appointment

### Extraction d'actions
- Identification automatique des tâches
- Attribution et dates d'échéance
- Priorisation

### Insights
- Analyse de sentiment
- Niveau d'intérêt
- Recommandations
- Points d'attention

## Utilisation

### Depuis AppointmentScheduler
1. Ouvrir un appointment
2. Cliquer sur "Prendre des notes"
3. Saisir des notes ou uploader un fichier audio
4. Générer le résumé IA
5. Sauvegarder

### Depuis AgendaView
1. Cliquer sur un événement dans le calendrier
2. Cliquer sur "Prendre des notes" ou "Voir les notes"
3. Utiliser l'éditeur de notes

## Prochaines étapes

### À implémenter
1. **Transcription audio automatique** : Intégrer Whisper, Google Speech-to-Text, ou autre service
2. **Bucket Storage** : Créer le bucket `meeting-audio` dans Supabase Storage
3. **Export PDF** : Implémenter l'export en PDF des notes
4. **Partage** : Permettre le partage des notes avec d'autres utilisateurs
5. **Notifications** : Notifier lorsque la transcription est terminée
6. **Recherche** : Ajouter une recherche dans les notes

### Améliorations possibles
- Versioning des notes
- Collaboration en temps réel
- Templates de notes
- Intégration avec d'autres outils (Slack, Teams, etc.)

## Notes techniques

### Storage
Les fichiers audio sont stockés dans Supabase Storage dans le bucket `meeting-audio` avec le chemin `meeting-notes/{meetingNoteId}-{timestamp}.{ext}`.

### Sécurité
- RLS (Row Level Security) activé sur toutes les tables
- Les utilisateurs ne peuvent voir que leurs propres notes
- Vérification des accès selon le plan d'abonnement

### Performance
- Index sur `appointment_id`, `user_id`, `transcription_status`
- Chargement lazy des notes
- Cache des accès d'abonnement

## Support

Pour toute question ou problème, consulter la documentation technique ou contacter l'équipe de développement.

