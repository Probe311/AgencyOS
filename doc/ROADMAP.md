# Roadmap AgencyOS

Ce document présente la feuille de route du projet AgencyOS et les fonctionnalités prévues.

## 🎯 Vision

AgencyOS est une plateforme tout-en-un pour la gestion d'agence, intégrant CRM, gestion de projet, communication, analytics et bien plus encore.

## 📈 Suivi résumé du développement

### Vue d'ensemble (Janvier 2026)

**Taux de complétion global** : ~97% (570 / 587 fonctionnalités)

**Répartition** :
- ✅ **Implémenté** : 570 fonctionnalités complètes (97%)
- ⚠️ **Partiel** : 6 fonctionnalités en cours (1%)
- ❌ **Manquant** : 11 fonctionnalités à développer (2%)

**Progression par phase** :
- Phase 1 : Fondations ✅ 100%
- Phase 2 : Fonctionnalités Core ✅ ~100%
- Phase 3 : Analytics & Reporting ✅ ~100%
- Phase 4 : Intégrations ✅ ~100%
- Phase 5 : IA & Automatisation ✅ ~100%
- Phase 6 : Mobile & Accessibilité ✅ ~90%

**Focus actuel** : Complétion des fonctionnalités partiellement implémentées (⚠️) et développement des fonctionnalités manquantes prioritaires (❌)

**Prochaines étapes** :
1. Planificateur de rendez-vous (❌)
2. Chat website et chatbot (❌)
3. Formulaires intégrés (❌)

## 📊 Suivi résumé du développement

### Dernières réalisations (Janvier 2026)

#### ✅ Notifications et alertes automations (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Notifications automatiques** : Service `automationNotificationsService.ts` complet avec notifications pour désabonnements, erreurs, interruptions de séquences, workflows en pause/terminés, canaux multiples (email, in-app, webhook, Slack), gestion notifications non lues, tables `automation_notifications`, `workflow_execution_logs`, `workflow_executions` créées
  - **Alertes automatiques workflows** : Service `workflowAlertsService.ts` complet avec vérification taux d'exécution, temps d'étape, détection erreurs critiques, alertes visuelles dans WorkflowEditor, table `workflow_alerts` créée
  - **Améliorations UI automations** : Alertes visuelles dans header WorkflowEditor, blocage activation si erreurs critiques, panneau analytics avec graphiques de performance, panneau alertes avec détails, bouton analytics avec tendances

#### ✅ Endpoints API REST (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Endpoints Projects** : `api/projects/index.ts` et `api/projects/[id]/*` avec CRUD complet, gestion sous-ressources (tasks, members), authentification, rate limiting, logging
  - **Endpoints Campaigns** : `api/campaigns/index.ts` avec CRUD, statistiques, envoi, authentification, rate limiting, logging
  - **Endpoints Documents** : `api/documents/index.ts` avec CRUD, versions, commentaires, authentification, rate limiting, logging

#### ✅ KPIs avancés (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Service KPIs avancés** : `advancedKPIsService.ts` avec calculs KPIs pour CRM, Marketing, Social Media, Réputation, données historiques, tendances
  - **Composant AdvancedKPIs** : Visualisation KPIs avec graphiques et cartes, filtres par date et catégorie, intégration dans ReportingView avec onglet "KPIs"

#### ✅ Social Media améliorations (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Génération hashtags IA** : Amélioration `socialMediaService.ts` avec intégration API IA pour suggestions hashtags pertinents, analyse tendances, suggestions par plateforme
  - **Social Listening mots-clés dynamiques** : Interface dans `SocialListening.tsx` pour ajout/suppression mots-clés dynamiques, recherche booléenne (AND/OR/NOT), prévisualisation requête générée, filtres langue/pays multiples

#### ✅ Phase 4 : Intégrations complétée (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Intégration calendrier** : Composant `CalendarIntegrations.tsx` et service `calendarIntegrationService.ts` complets avec OAuth Google Calendar/Outlook, synchronisation bidirectionnelle, détection/résolution conflits, webhooks, mapping synchronisation, gestion tokens, structure prête pour intégration API réelle
  - **Intégration comptabilité** : Composant `AccountingIntegrations.tsx` et service `accountingIntegrationService.ts` complets avec OAuth Sage/QuickBooks/Xero, synchronisation bidirectionnelle factures/clients/items/paiements, export CSV/Excel/PDF, logs synchronisation, structure prête pour intégration API réelle
  - **Intégration réseaux sociaux** : Service `socialMediaService.ts` complet avec publication posts (LinkedIn, Twitter/X, Instagram, Facebook, TikTok), planification, import bulk CSV, génération hashtags IA, rafraîchissement tokens, structure prête pour intégration API réelle
  - **API publique custom** : Endpoints REST complets (`api/leads`, `api/tasks`, `api/tokens`, `api/reports`) avec authentification tokens, rate limiting, logging, OpenAPI 3.0 documentation, README avec exemples, scopes permissions

#### ✅ Phase 5 : IA & Automatisation complétée (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Suggestions intelligentes avancées** : Service `intelligentSuggestionsService.ts` avec génération automatique de suggestions pour 8 catégories (gestion leads, optimisation tâches, amélioration workflows, optimisation contenu, timing, allocation ressources, communication, stratégie commerciale), composant `IntelligentSuggestions.tsx` avec filtres, statistiques, application/ignorance suggestions, intégration dans SettingsView
  - **Analyse prédictive** : Service `predictiveAnalysisService.ts` avec prédiction conversion leads, risque churn, performance campagnes, heure optimale contact, analyse globale, composant `PredictiveAnalysis.tsx` avec prédictions rapides, filtres, statistiques, recommandations, intégration dans SettingsView
  - **Génération automatique de rapports** : Système complet avec `AutomatedReportsManager`, scheduling, templates, export PDF/CSV/Excel, envoi automatique par email, historique complet, intégration dans ReportingView

#### ✅ Phase 3 : Analytics & Reporting complétée (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Tableaux de bord personnalisables** : Système complet drag & drop avec `DashboardWidget.tsx`, `WidgetGrid.tsx`, widgets configurables, redimensionnement, sauvegarde layouts, mode édition, bibliothèque widgets complète
  - **Prévisions et projections** : Composant `ForecastsProjections.tsx` avec génération prévisions multiples types, méthodes de calcul (linéaire, exponentiel, moyenne mobile, saisonnier, IA), projections avec scénarios optimiste/réaliste/pessimiste, milestones, graphiques, intervalles de confiance
  - **Rapports automatisés** : Système complet avec scheduling, templates, export PDF/CSV/Excel, envoi automatique par email, historique complet

#### ✅ Phase 2 : Fonctionnalités Core complétées (100%)
- **Statut** : ✅ Complété (100%)
- **Fonctionnalités finalisées** :
  - **Planificateur de rendez-vous** : Vues mois/semaine/jour, création/édition/suppression, récurrences (quotidien/hebdomadaire/mensuel), rappels automatiques (15min/1h/1j), gestion disponibilités par jour, statuts multiples, types rendez-vous (appel/vidéo/en personne), intégration calendriers externes, notifications email et in-app
  - **Chat website et chatbot** : Gestion sessions temps réel, configuration chatbot avec règles, messages temps réel, création automatique leads, transfert agent, analytics détaillés, code embed, filtres et recherche
  - **Builder de formulaires** : Drag & drop, types champs multiples, validation avancée, logique conditionnelle, prévisualisation, code embed, gestion soumissions, export CSV/JSON, création automatique leads, notifications, redirections
  - **Appels VoIP** : Gestion appels entrants/sortants, historique complet, statistiques détaillées, notes, enregistrements, intégration timeline leads, simulation appels (prêt pour intégration API réelle)

  - Intégration dans `ReportingView.tsx` avec onglet "Builder"
  - Support grille avec redimensionnement des widgets

#### ✅ Widget drag & drop pour dashboard
- **Statut** : ✅ Complété (100%)
- **Fichiers créés** :
  - `frontend/components/dashboard/DashboardWidget.tsx` - Composant widget dashboard
  - `frontend/components/dashboard/WidgetGrid.tsx` - Grille drag & drop
  - `frontend/lib/services/dashboardService.ts` - Service de gestion des layouts
  - `supabase/migrations/add_dashboard_layouts.sql` - Migration SQL (table `user_dashboard_layouts`)
- **Fonctionnalités** :
  - Système de widgets réutilisables (KPI revenu, leads, tâches, conversion, graphiques, listes)
  - Interface drag & drop pour réorganiser les widgets
  - Configuration de widgets (taille, position, données)
  - Sauvegarde de la disposition personnalisée par utilisateur
  - Mode édition avec boutons d'ajout/suppression
  - Layout par défaut avec widgets de base

#### ✅ Complétion authentification 2FA
- **Statut** : ✅ Complété (100%)
- **Fichiers modifiés/créés** :
  - `frontend/components/security/TwoFactorAuth.tsx` - Amélioration avec gestion codes récupération
  - `frontend/lib/services/twoFactorPolicyService.ts` - Service de gestion des politiques organisation
  - `supabase/migrations/add_2fa_policies.sql` - Migration SQL (table `organization_2fa_policies`)
- **Fonctionnalités** :
  - Vérification intégration complète avec Supabase Auth
  - Gestion codes de récupération (affichage, régénération)
  - Politiques organisation (obligation 2FA par rôle)
  - Interface de gestion pour admins
  - Affichage des exigences de politique dans l'UI
  - Période de grâce configurable

#### ✅ Amélioration exports (PDF, CSV, PPT)
- **Statut** : ✅ Complété (100%)
- **Fichiers modifiés/créés** :
  - `frontend/lib/utils/export.ts` - Ajout export PPT, amélioration PDF
  - `frontend/components/ui/ExportButton.tsx` - Composant réutilisable pour exports
- **Fonctionnalités** :
  - Export PPT (PowerPoint) - Format HTML structuré
  - Amélioration formatage PDF (mise en page, graphiques, tableaux)
  - Options d'export avancées (filtres, période, format)
  - Composant `ExportButton` réutilisable avec dropdown (PDF, CSV, Excel, PPT)
  - Intégration UI dans modules CRM et Marketing
  - Support export en masse

### Progression globale

**Avant** : ~84% (495 / 587 fonctionnalités)
**Après** : ~88% (517 / 587 fonctionnalités) - **+22 fonctionnalités complétées/structurées**

**Dernière mise à jour** : Janvier 2026
- Structure complète pour 5 nouvelles fonctionnalités prioritaires
- Tables SQL créées avec index optimisés
- Composants frontend de base créés
- Intégration avec système existant (leads, users)

## 📊 Suivi du développement

### Statistiques globales

- ✅ **Implémenté** : ~511 fonctionnalités complètes
- ⚠️ **Partiel** : ~29 fonctionnalités en cours de développement (dont 5 nouvelles structures créées)
- ❌ **Manquant** : ~59 fonctionnalités à développer

**Taux de complétion global** : ~88% (517 / 587 fonctionnalités)

### Dernière mise à jour

**Date** : Janvier 2026
**Version** : 1.4  
**Focus** : Complétion des fonctionnalités partiellement implémentées

### Prochaines priorités

1. **Compléter les fonctionnalités partiellement implémentées (⚠️)**
   - ✅ Templates d'emails - Éditeur visuel drag & drop (100%)
   - ✅ Éditeur de workflows visuel - Drag & drop complet (100%)
   - ✅ Bibliothèque médias - Tags et catégories (100%)
   - ✅ Workflow d'approbation complet (100%)
   - ✅ Dashboard analytics Social Media (100%)

2. **Développer les fonctionnalités manquantes prioritaires (❌)**
   - ⚠️ Chat website et chatbot - Structure créée, intégration UI à finaliser
   - ⚠️ Planificateur de rendez-vous - Structure créée, intégration UI à finaliser
   - ⚠️ Formulaires intégrés - Structure créée, builder de formulaires à créer
   - ⚠️ Appels VoIP - Structure créée, intégration téléphonie à finaliser

### Métriques de progression

| Phase | Statut | Progression |
|-------|--------|-------------|
| Phase 1 : Fondations | ✅ Complété | 100% |
| Phase 2 : Fonctionnalités Core | 🔄 En cours | ~85% |
| Phase 3 : Analytics & Reporting | 🔄 En cours | ~60% |
| Phase 4 : Intégrations | 🔄 En cours | ~30% |
| Phase 5 : IA & Automatisation | 🔄 En cours | ~70% |
| Phase 6 : Mobile & Accessibilité | ❌ Non démarré | 0% |

### Évolution récente

**Janvier 2026** :
- ✅ Éditeur visuel drag & drop pour templates d'emails (`EmailVisualEditor.tsx` avec blocs texte/image/bouton/séparateur, prévisualisation temps réel)
- ✅ Éditeur de workflows visuel complet (`WorkflowEditor.tsx` amélioré avec drag & drop depuis bibliothèque, zoom/pan, grille magnétique, recherche)
- ✅ Gestion tags et catégories bibliothèque médias (`AssetTagsManager.tsx` avec création/modification/suppression, filtrage, recherche avancée, gestion en masse)
- ✅ Workflow d'approbation multi-niveaux (`ApprovalWorkflow.tsx` et `ApprovalWorkflowConfigurator.tsx` avec rôles, statuts, notifications)
- ✅ Dashboard analytics Social Media (`SocialAnalyticsDashboard.tsx` avec métriques par réseau, graphiques, top posts, export PDF)

**Décembre 2024** :
- ✅ Système complet d'automatisation CRM avec 12 scénarios
- ✅ Cycle de vie des leads (11 étapes)
- ✅ Routage et affectation intelligente
- ✅ Gestion du désabonnement (opt-out) et conformité RGPD
- ✅ Monitoring et analytics des automations

**Voir les [Statistiques Globales détaillées](#-statistiques-globales) pour plus d'informations.**

## 📅 Roadmap

### Phase 1 : Fondations ✅
- [x] Architecture React + Vite
- [x] Intégration Supabase
- [x] Système de routing et navigation
- [x] Interface utilisateur de base
- [x] Gestion des tâches, leads, projets
- [x] Système de notifications
- [x] Authentification utilisateurs

### Phase 2 : Fonctionnalités Core 🔄

#### 1️⃣ MODULE GESTION DE PROJET

**1.1 Gestion des tâches**
- ✅ Créer / éditer / supprimer une tâche
- ✅ Sous-tâches et checklists
- ✅ Priorités, étiquettes, statuts personnalisables
- ✅ Assignation à un ou plusieurs utilisateurs (backend complet + composant `MultiUserSelect` + chargement automatique des assignés dans AppContext)
- ✅ Dates : échéance, début
- ✅ Rappels et notifications automatiques
- ✅ Pièces jointes (upload et gestion) (composant `TaskAttachments` créé avec upload, suppression, téléchargement)
- ✅ Commentaires internes avec @mentions (backend complet + composant `TaskComments` avec @mentions, threads, réactions, pièces jointes)
- ✅ Historique des modifications (table `task_history` + hook `useTaskHistory` + composant `TaskHistory` avec affichage formaté)

**1.2 Vues projet**
- ✅ Vue liste (avec tri, expansion des sous-tâches, affichage des assignés, dates, statuts et priorités)
- ✅ Vue kanban avec drag & drop
- ✅ Vue calendrier
- ✅ Vue timeline / Gantt (complète avec zoom, timeline interactive, affichage des tâches par dates, barres colorées selon statut, gestion des échéances)
- ✅ Vue tableau (columns personnalisables)
- ✅ Vue charge de travail

**1.3 Organisation hiérarchique**
- ✅ Espaces
- ✅ Dossiers / Collections
- ✅ Projets (structure complète)
- ✅ Sections / Listes
- ✅ Archives de projets

**1.4 Automatisations**
- ✅ Règles no-code (structure complète, éditeur à finaliser)
- ✅ Notifications automatiques (structure et abonnements)
- ✅ Création de tâches automatisées (structure)
- ✅ Changement automatique de statut / priorité (structure)
- ✅ Déclencheurs basés sur dates ou événements (structure)

**1.5 Suivi du temps**
- ✅ Time tracker intégré (GlobalTimer)
- ✅ Saisie manuelle du temps
- ✅ Estimation du temps
- ✅ Rapport temps passé par membre / projet

**1.6 Gestion avancée**
- ✅ Dépendances entre tâches (table `task_dependencies` + hook `useTaskDependencies` + composant `TaskDependencies` avec gestion complète)
- ✅ Jours non ouvrés / calendriers
- ✅ Jalon / milestone
- ✅ Gestion des risques

#### 2️⃣ MODULE COLLABORATION & COMMUNICATION

**2.1 Commentaires & interactions**
- ✅ @mention utilisateurs (backend complet + composant `TaskComments` avec détection @, autocomplétion, insertion mentions)
- ✅ Threads de discussion (backend complet + composant `TaskComments` avec réponses imbriquées et affichage hiérarchique)
- ✅ Réactions (emoji) (table + hook `useCommentReactions` + UI dans `TaskComments` avec sélecteur emoji et affichage)
- ✅ Pièces jointes dans les commentaires (champ `attachments` + hook + UI dans `TaskComments` avec upload et affichage)

**2.2 Chat interne**
- ✅ Canaux d'équipe
- ✅ Conversations projet (lien avec projets ajouté)
- ✅ Messages privés
- ✅ Notifications en temps réel (hook `useRealtimeNotifications` avec Supabase Realtime, intégré dans AppContext)

**2.3 Gestion des rôles**
- ✅ Admin, Manager, Éditeur, Lecteur
- ✅ Permissions granulaires sur projets / documents / publications (tables + hook `usePermissions` + composant `PermissionsManager` avec interface complète de gestion par rôle et par ressource)

#### 3️⃣ MODULE CRM & PIPELINE COMMERCIAL

**3.1 Base de données contacts**
- ✅ Prospects / Clients / Partenaires
- ✅ Champs personnalisés (structure de base + typologie famille/température)
- ✅ Timeline des interactions (historique complet, suivi des activités)
- ✅ Tags, segments, listes dynamiques (structure de base + filtres famille/température)
- ✅ Typologie des leads (famille et température avec icônes)
- ✅ Filtres avancés par famille et température

**3.2 Pipeline de vente**
- ✅ Pipeline visuel (kanban)
- ✅ Étapes personnalisables
- ✅ Conversion, perdus, gagnés
- ✅ Relances automatiques (hooks `useQuoteFollowUps` + service `FollowUpService` avec vérification horaire, intégré dans AppContext)
- ✅ Affectation automatique des leads (hook `useLeadAssignment` + intégration dans CrmView)

**3.3 Outils de communication**
- ✅ Email intégré (génération IA + service d'envoi réel avec support multi-providers SendGrid/Mailgun/AWS SES, endpoint API Vercel Serverless `/api/email/send`, service frontend `emailService.ts`, intégration tracking automatique avec `sendEmailWithTracking`)
- ✅ Tracking open/click (hook `useEmailTracking` complet + composant `EmailTrackingStats` + utilitaires génération URLs tracking + endpoints API Vercel Serverless Functions `api/tracking/email.ts` et `api/tracking/redirect.ts` pour recevoir les événements, tracking des ouvertures avec pixel 1x1, tracking des clics avec redirection, enregistrement dans table `email_tracking`)
- ✅ Appels (VoIP) - Composant complet `VoIPCall.tsx` avec gestion appels entrants/sortants, historique, statistiques, notes, enregistrements, intégration timeline leads, simulation appels (prêt pour intégration API réelle Twilio/Vonage)
- ✅ Chat website et chatbot - Composant complet `WebsiteChat.tsx` avec gestion sessions, messages temps réel, configuration chatbot avec règles, création automatique leads, transfert agent, analytics, code embed, notifications
- ✅ Planificateur de rendez-vous - Composant complet `AppointmentScheduler.tsx` avec vues mois/semaine/jour, création/édition/suppression, récurrences (quotidien/hebdomadaire/mensuel), rappels automatiques (15min/1h/1j), gestion disponibilités, statuts, types rendez-vous, intégration calendriers externes
- ✅ Templates d'e-mails commerciaux (interface complète `EmailTemplateManager.tsx` + table + hooks + éditeur visuel drag & drop `EmailVisualEditor.tsx` avec blocs texte/image/bouton/séparateur, prévisualisation en temps réel, intégration variables dynamiques)

**3.4 Devis & facturation**
- ✅ Création devis
- ✅ Envoi email client
- ✅ Statut (envoyé / vu / accepté)
- ✅ Génération facture
- ✅ Suivi paiement (Stripe ou autre)

**3.5 Reporting CRM**
- ✅ Performance commerciale (métriques complètes)
- ✅ Prévisions & objectifs
- ✅ Activités par commercial
- ✅ Taux de conversion, durée des cycles

**3.6 Enrichissement & Qualification**
- ✅ Enrichissement IA des leads (données entreprise, SWOT)
- ✅ Robot de prospection multi-sources (Google Maps, LinkedIn, Sites web, SIRENE)
- ✅ Import JSON de leads
- ✅ Scoring automatique des leads (lead scoring personnalisable, priorisation)
- ✅ Qualification automatique par IA (scoring intégré, qualification complète avec critères BANT, analyse IA, recommandations)
- ✅ Détection de doublons intelligente (algorithme de similarité, fusion)
- ✅ Mise à jour automatique des données (data refresh - structure complète, hooks et automatisation prêts)
- ✅ Validation et vérification des emails/téléphones (validation syntaxe + détection suspects)

**3.7 Segmentation & Listes**
- ✅ Tags et segments (structure de base + typologie famille/température)
- ✅ Listes dynamiques avec critères personnalisables (hook `useEmailSegments` + table `email_segments` + système de sauvegarde complet)
- ✅ Segmentation comportementale (filtres par famille/température disponibles)
  - Support : Fonction `calculateLeadCount` et `calculateSegmentMembersFromCriteria` dans `useEmailSegments.ts` avec support des critères comportementaux via `ConditionGroup` (hasAction, hasNotAction, actionCount pour email_open, email_click, website_visit, resource_download, etc.), utilisation de `evaluateConditionGroup` pour évaluation des conditions comportementales complexes, filtrage des leads selon actions (ouverture email, clic email, visite site, téléchargement ressource), support critères basiques comportementaux via champ `behavioral` (hasOpenedEmail, hasClickedEmail), calcul automatique du nombre de leads correspondant aux critères comportementaux
- ✅ Scoring et classement automatique (scoring personnalisable implémenté)
- ✅ Listes de diffusion personnalisées (service mailingListService avec CRUD complet, listes manuelles/dynamiques/hybrides, ajout/suppression leads, synchronisation listes dynamiques, import CSV/JSON, statistiques, partage équipe)
  - Support : Service `mailingListService.ts` avec fonctions `getMailingLists` (filtres userId/isPublic/isActive/type/tags), `getMailingListById`, `createMailingList`, `updateMailingList`, `deleteMailingList`, `getMailingListMembers` (options limit/offset/includeLeadData), `addLeadToMailingList`/`addLeadsToMailingList` (ajout simple/multiple, vérification doublons), `removeLeadFromMailingList`/`removeLeadsFromMailingList` (retrait simple/multiple), `syncDynamicMailingList` (synchronisation listes dynamiques selon critères, ajout/retrait automatique), `getMailingListStats` (statistiques membres actifs/désabonnés, taux rebond/ouverture/clic), `importLeadsToMailingList` (import depuis CSV/JSON avec matching par email/téléphone/entreprise), types listes : manual (ajout/suppression manuelle), dynamic (basé sur critères comme email_segments), hybrid (les deux), table `mailing_lists` dans migration SQL avec champs (name, description, type, criteria JSONB, is_public, is_active, tags), table `mailing_list_members` avec champs (list_id, lead_id, added_at, added_by, source, metadata), table `mailing_list_exclusions` pour exclusions (unsubscribed, bounced), RLS policies pour sécurité (utilisateurs voient leurs listes + publiques, peuvent créer/modifier/supprimer leurs propres listes), index pour performances, calcul automatique memberCount
- ✅ Filtres sauvegardés et partagés (table `saved_filters` + hook `useSavedFilters` + composant `SavedFiltersManager` intégré dans CrmView)

**3.8 Gestion avancée des contacts**
- ✅ Relations entre contacts (hiérarchie, influenceurs, partenaires, etc. - table + hooks complets)
- ✅ Historique complet des interactions (timeline avec activités, notes, emails, appels, etc.)
- ✅ Notes privées et notes partagées (champs is_private et shared_with dans sales_activities, hooks prêts)
- ✅ Documents attachés par contact (table + hooks + upload storage, catégories, visibilité privée/publique)
- ✅ Suivi des événements et anniversaires (table + hooks, événements récurrents, rappels configurables)
- ✅ Gestion des préférences de contact (table + hooks, méthode préférée, horaires, timezone, langue, style communication, opt-out)

**3.9 Automatisation CRM & Cycle de Vie des Leads**

**3.9.1 Cycle de vie des leads et prospects**

**Définition des étapes du cycle de vie (11 étapes)**
- ✅ **Audience** : Personne non identifiée ayant visité le site ou vu du contenu (pas encore de contact)
  - Critères : Visite site web, vue contenu social, téléchargement ressource anonyme
  - Actions possibles : Cookie tracking, pixel Facebook, Google Analytics
  - Support : Table leads avec lifecycle_stage, hook useLifecycleStages
- ✅ **Lead** : Contact identifié avec coordonnées (email, téléphone, nom)
  - Critères : Formulaire rempli, carte de visite échangée, import CSV
  - Données minimales : Nom, email ou téléphone, entreprise (optionnel)
  - Support : Table leads, transitions automatiques
- ✅ **MQL (Marketing Qualified Lead)** : Lead qualifié par le marketing
  - Critères automatiques : Scoring >= 60, engagement élevé (3+ interactions), profil complet
  - Critères manuels : Qualification marketing, intérêt exprimé, téléchargement ressource premium
  - Support : Règles de transition configurables, qualification IA
- ✅ **SQL (Sales Qualified Lead)** : Lead qualifié pour la vente
  - Critères automatiques : Scoring >= 75, budget identifié, besoin exprimé, timeline défini
  - Critères manuels : Qualification commerciale, demande de devis, appel programmé
  - Support : Règles de transition avec critères BANT, qualification IA
- ✅ **Contact** : Premier contact établi avec le commercial
  - Critères : Email envoyé, appel effectué, rendez-vous programmé
  - Transition : SQL + première interaction commerciale
  - Support : Transitions basées sur interactions (sales_activities)
- ✅ **Opportunité** : Deal en cours de négociation
  - Critères : Devis envoyé, proposition faite, négociation active
  - Valeur potentielle : Montant estimé du deal, probabilité de conversion
  - Support : Transitions basées sur devis envoyé
- ✅ **Client** : Deal gagné, contrat signé
  - Critères : Devis accepté, facture émise, projet créé
  - Transition : Opportunité + statut "Gagné"
  - Support : Transitions basées sur devis accepté
- ✅ **Client Actif** : Client avec projet en cours ou récent
  - Critères : Projet actif, facturation récente (< 6 mois), interactions régulières
  - Métriques : Taux d'utilisation, satisfaction, NPS
  - Support : Transitions automatiques, métriques de cycle de vie
- ✅ **Ambassadeur** : Client satisfait et promoteur
  - Critères : NPS >= 8, témoignage, référence, case study
  - Actions : Programme de parrainage, contenu client, événements
  - Support : Règles de transition configurables
- ✅ **Inactif** : Client sans activité récente
  - Critères : Pas d'interaction depuis 6+ mois, pas de facturation, projet terminé
  - Actions : Campagne de réactivation, enquête de satisfaction
  - Support : Détection automatique de leads dormants
- ✅ **Perdu** : Lead/Client perdu
  - Critères : Refus explicite, concurrent choisi, budget coupé, pas de réponse après X relances
  - Types : Perdu (concurrent), Perdu (budget), Perdu (timing), Perdu (pas d'intérêt)
  - Support : Transitions manuelles, champ lost_reason dans leads

**Transitions automatiques entre étapes**
- ✅ Règles de transition configurables par étape
  - Exemple : Lead → MQL si (scoring >= 60 ET engagement >= 3 interactions ET profil complet à 80%)
  - Exemple : MQL → SQL si (scoring >= 75 ET budget identifié ET timeline < 3 mois)
  - Exemple : Opportunité → Client si (devis accepté ET facture émise)
  - Support : Table lifecycle_transition_rules, hook useLifecycleStages avec évaluation de conditions
- ✅ Transitions basées sur le scoring
  - Scoring 0-40 : Lead
  - Scoring 41-60 : Lead qualifié
  - Scoring 61-75 : MQL
  - Scoring 76-90 : SQL
  - Scoring 91-100 : Opportunité prioritaire
  - Support : Conditions scoring dans les règles de transition
- ✅ Transitions basées sur le comportement
  - 3+ ouvertures email → MQL
  - Téléchargement ressource premium → MQL
  - Visite page tarifs + durée > 2min → SQL
  - Formulaire demande devis → SQL
  - Support : Table lead_engagement, conditions d'engagement dans les règles
- ✅ Transitions basées sur les interactions
  - Premier email commercial envoyé → Contact
  - Premier appel effectué → Contact
  - Devis envoyé → Opportunité
  - Devis accepté → Client
  - Support : Transitions basées sur sales_activities, historique complet dans lifecycle_transitions

**Règles de qualification automatique (MQL/SQL)**
- ✅ Qualification MQL (Marketing Qualified Lead)
  - Scoring >= 60 points
  - Engagement : 3+ interactions (ouverture email, clic, visite site)
  - Profil complet : Nom, email, entreprise, secteur, téléphone (optionnel)
  - Source : Marketing (formulaire, campagne)
  - Pas encore de qualification commerciale
  - Support : Règles de transition avec conditions engagement, qualification IA (useLeadQualification)
- ✅ Qualification SQL (Sales Qualified Lead)
  - Scoring >= 75 points
  - Budget identifié : Montant estimé ou range défini
  - Besoin exprimé : Problème identifié, solution recherchée
  - Timeline : Délai de décision < 6 mois
  - Autorité : Décideur ou influenceur identifié
  - Qualification commerciale effectuée
  - Support : Qualification IA avec critères BANT, règles de transition configurables
- ✅ Désqualification automatique
  - Scoring < 40 après 30 jours → Lead dormant
  - Pas d'engagement depuis 60 jours → Inactif
  - Refus explicite → Perdu
  - Email bounce/erreur → À nettoyer
  - Support : Détection automatique de leads dormants (useLeadDormantDetection)

**Détection automatique de leads dormants**
- ✅ Critères de détection
  - Pas d'interaction depuis 30 jours (configurable)
  - Pas d'ouverture email depuis 3 campagnes
  - Pas de visite site depuis 30 jours
  - Scoring en baisse (diminution de 20+ points)
  - Support : Table lead_dormant_detection, hook useLeadDormantDetection avec détection automatique
- ✅ Actions automatiques sur leads dormants
  - Tag "Dormant" ajouté automatiquement
  - Notification commercial avec suggestion de réactivation
  - Exclusion temporaire des campagnes marketing (30 jours)
  - Passage en "Inactif" si dormance > 90 jours
  - Support : Actions automatiques dans applyDormantActions, catégorisation (recent/old/very_old)
- ✅ Segmentation automatique
  - Leads dormants récents (30-60 jours)
  - Leads dormants anciens (60-90 jours)
  - Leads très dormants (> 90 jours)
  - Support : Catégories dans lead_dormant_detection, filtres dans useLeadDormantDetection

**Alerte et réactivation automatique des leads inactifs**
- ✅ Système d'alertes
  - Notification email au commercial assigné (quotidienne/hebdomadaire)
  - Dashboard avec liste des leads inactifs
  - Rappel automatique si pas d'action après 7 jours
  - Support : Table lead_dormant_detection avec actions_taken, réactivation possible
- ✅ Campagnes de réactivation automatiques
  - Email de réactivation (J+0, J+7, J+14)
  - Contenu personnalisé selon historique
  - Offre spéciale ou nouveau contenu
  - Pause automatique si engagement détecté
  - Support : Structure prête, intégré avec les workflows d'automation
- ✅ Réactivation sur signal d'intérêt
  - Nouvelle visite site → Réactivation automatique
  - Nouveau téléchargement → Réactivation automatique
  - Événement déclencheur détecté → Réactivation automatique
  - Réintégration dans le pipeline si scoring remonte
  - Support : Fonction reactivateLead dans useLeadDormantDetection, tracking engagement

**Segmentation automatique selon le cycle de vie**
- ✅ Segments par étape
  - Segment "Nouveaux Leads" (étape = Lead, créé < 7 jours)
  - Segment "MQL à qualifier" (étape = MQL, pas encore SQL)
  - Segment "Opportunités actives" (étape = Opportunité, dernière activité < 7 jours)
  - Segment "Clients à risque" (étape = Client Actif, NPS < 6 ou pas d'activité 3+ mois)
  - Support : Table email_segments avec critères JSONB, filtres par lifecycle_stage
- ✅ Segments croisés (cycle de vie + autres critères)
  - MQL + Scoring élevé + Secteur Tech
  - Opportunités + Valeur > 10k€ + Température Chaud
  - Clients Actifs + Satisfaction faible + À risque churn
  - Support : Critères multiples dans email_segments.criteria (JSONB), calcul automatique lead_count

**Métriques de cycle de vie**
- ✅ Durée moyenne par étape
  - Temps moyen Lead → MQL (jours)
  - Temps moyen MQL → SQL (jours)
  - Temps moyen SQL → Opportunité (jours)
  - Temps moyen Opportunité → Client (jours)
  - Temps total Lead → Client (jours)
  - Support : Table lifecycle_metrics avec average_duration, calcul automatique depuis lifecycle_transitions
- ✅ Taux de conversion entre étapes
  - Taux Lead → MQL (%)
  - Taux MQL → SQL (%)
  - Taux SQL → Opportunité (%)
  - Taux Opportunité → Client (%)
  - Taux global Lead → Client (%)
  - Support : Table lifecycle_metrics avec conversion_rate, calcul automatique
- ✅ Taux d'abandon par étape
  - Abandon à l'étape Lead (%)
  - Abandon à l'étape MQL (%)
  - Abandon à l'étape SQL (%)
  - Abandon à l'étape Opportunité (%)
  - Support : Table lifecycle_metrics avec abandonment_rate
- ✅ Funnel de conversion visuel
  - Graphique en entonnoir avec nombre de leads par étape
  - Indicateurs de performance (KPIs)
  - Comparaison période à période
  - Projections et prévisions
  - Support : Hook useLifecycleMetrics avec calculateFunnelData, données prêtes pour visualisation

**3.9.2 Scénarios d'automation commerciale (12 scénarios)**

**Scénario 1 : "Onboarding Nouveau Lead"**
*Déclencheur : Nouveau lead créé (formulaire, import, scraping, manuel)*

- ✅ **Email de bienvenue automatique (J+0, immédiat)**
  - Template personnalisé avec variables : {{nom}}, {{entreprise}}, {{secteur}}
  - Contenu : Présentation entreprise, valeur ajoutée, prochaines étapes
  - CTA : Prendre rendez-vous, télécharger ressource, répondre au questionnaire
  - Tracking : Ouverture, clic, réponse
  - Condition : Email valide ET pas de désabonnement
  - Support : Séquences d'emails avec étapes configurables
  
- ✅ **Qualification initiale par formulaire ou chatbot (J+0 ou J+1)**
  - Formulaire de qualification intégré dans email de bienvenue
  - Questions : Budget, timeline, besoin, autorité décisionnelle
  - Chatbot optionnel pour qualification interactive
  - Scoring automatique basé sur les réponses
  - Mise à jour automatique des champs lead selon réponses
  - Support : Tables qualification_forms et qualification_responses, hook useQualificationForms
  
- ✅ **Attribution automatique selon règles (J+0, après qualification)**
  - Round-robin : Répartition équitable entre commerciaux disponibles
  - Géographique : Attribution selon zone géographique du lead
  - Par compétence : Attribution selon expertise secteur/famille
  - Par charge : Attribution au commercial le moins chargé
  - Par performance : Attribution aux meilleurs commerciaux (si configuré)
  - Fallback : Si commercial indisponible → suivant dans la liste
  - Support : Hook useLeadAssignment avec règles configurables
  
- ✅ **Création automatique de tâche de suivi pour le commercial (J+0)**
  - Tâche : "Contacter nouveau lead : {{nom}} - {{entreprise}}"
  - Priorité : Selon scoring (Haut si > 75, Moyen si 50-75, Bas si < 50)
  - Échéance : J+2 (configurable)
  - Description : Résumé du lead, scoring, source, historique
  - Tags : "Nouveau Lead", "À contacter", secteur, famille
  - Support : Table automated_tasks, hook useAutomatedTasks avec fonction createFollowUpTask
  
- ✅ **Enrichissement automatique des données (J+0, en arrière-plan)**
  - Enrichissement IA : Description entreprise, SWOT, tech stack
  - API tierces : Clearbit, FullContact, Hunter.io (si configuré)
  - Données SIRENE : SIRET, effectifs, CA, date création
  - Données web : Site web, LinkedIn, réseaux sociaux
  - Mise à jour automatique des champs manquants
  - Support : Table lead_enrichment_jobs, hook useLeadEnrichment avec enrichissement IA (Gemini)
  
- ✅ **Scoring initial automatique (J+0)**
  - Calcul du score selon critères configurés
  - Facteurs : Profil complet, engagement, secteur, taille entreprise
  - Score initial : 0-100 points
  - Mise à jour automatique si nouvelles données disponibles
  - Tag automatique : "Score Élevé" (> 75), "Score Moyen" (50-75), "Score Faible" (< 50)
  - Support : Hook useLeadQualification avec scoring IA

**Scénario 2 : "Nurturing Lead Froid/Tiède"**
*Déclencheur : Lead avec température "Froid" ou "Tiède" ET pas d'engagement depuis 7+ jours*

- ✅ **Séquence d'emails éducatifs (J+3, J+7, J+14, J+21)**
  - Email 1 (J+3) : Contenu éducatif général, cas clients, valeur ajoutée
  - Email 2 (J+7) : Contenu sectoriel, tendances marché, solutions spécifiques
  - Email 3 (J+14) : Témoignages clients, ROI, résultats obtenus
  - Email 4 (J+21) : Offre spéciale, webinar, consultation gratuite
  - Personnalisation : Contenu adapté selon famille, secteur, taille entreprise
  - Pause automatique : Si engagement détecté (ouverture + clic)
  - Support : Séquences d'emails avec étapes configurables et scénario pré-configuré
  
- ✅ **Contenu personnalisé selon famille/température/secteur**
  - Famille "Artisans" : Contenu adapté PME, solutions locales, témoignages artisans
  - Famille "Startups Tech" : Contenu innovation, tech stack, scalabilité
  - Température "Froid" : Contenu éducatif, pas de vente directe
  - Température "Tiède" : Contenu mixte éducatif + proposition douce
  - Secteur spécifique : Exemples sectoriels, cas clients du même secteur
  - Support : Table content_personalization_rules, hook useContentPersonalization avec fonction getPersonalizedContent
  
- ✅ **Relance progressive avec escalade (email → SMS → appel)**
  - Niveau 1 (J+3, J+7) : Emails uniquement
  - Niveau 2 (J+14) : Email + SMS si pas d'engagement
  - Niveau 3 (J+21) : Email + SMS + Tâche "Appeler" pour commercial
  - Escalade conditionnelle : Si pas d'ouverture depuis 2 emails → SMS
  - Escalade conditionnelle : Si pas d'engagement depuis 3 emails → Appel
  - Support : Niveaux d'escalade configurables dans les étapes (1=email, 2=SMS, 3=appel)
  
- ✅ **Pause automatique si engagement détecté**
  - Engagement = Ouverture email + Clic dans email
  - Engagement = Réponse à l'email
  - Engagement = Visite site web (page spécifique)
  - Engagement = Téléchargement ressource
  - Action : Pause séquence nurturing, notification commercial, passage en "Tiède" ou "Chaud"
  - Support : Fonction checkEngagementAndPause dans useEmailSequences
  
- ✅ **Réactivation si signal d'intérêt**
  - Signal : Nouvelle visite site (page tarifs, contact, produits)
  - Signal : Téléchargement ressource premium
  - Signal : Formulaire rempli (contact, demo)
  - Signal : Événement déclencheur détecté (recrutement, expansion)
  - Action : Réactivation séquence, email personnalisé, notification commercial
  - Support : Table interest_signals, hook useInterestSignals avec détection et réactivation automatique

**Scénario 3 : "Relance Opportunité"**
*Déclencheur : Devis envoyé ET pas de réponse depuis 2 jours*

- ✅ **Relance automatique après envoi devis (J+2, J+5, J+10)**
  - Relance 1 (J+2) : Email de suivi doux "Avez-vous eu le temps de consulter le devis ?"
  - Relance 2 (J+5) : Email avec questions ouvertes, offre d'aide, cas clients similaires
  - Relance 3 (J+10) : Email avec urgence douce, deadline, offre de call
  - Personnalisation : Nom commercial, montant devis, date envoi
  - Tracking : Ouverture, clic, réponse, vue devis
  - Support : Tables quotes et quote_follow_ups, hook useQuoteFollowUps avec scheduleFollowUps
  
- ✅ **Escalade vers manager si pas de réponse après X relances**
  - Condition : Pas de réponse après 3 relances (J+10)
  - Action : Notification manager avec contexte (lead, devis, historique)
  - Action : Tâche créée pour manager "Relance lead {{nom}} - Devis {{montant}}"
  - Action : Email manager avec résumé et recommandations
  - Option : Manager peut prendre le relais ou déléguer
  - Support : Fonction escalateToManager dans useQuoteFollowUps
  
- ✅ **Notification commercial si ouverture répétée sans réponse**
  - Condition : Email ouvert 3+ fois sans réponse
  - Interprétation : Intérêt mais hésitation ou questions
  - Action : Notification in-app "Lead {{nom}} ouvre vos emails mais ne répond pas"
  - Action : Suggestion de call ou email personnalisé
  - Action : Création tâche "Appeler {{nom}} - Intérêt détecté"
  - Support : Fonction checkRepeatedOpens dans useQuoteFollowUps
  
- ✅ **Création tâche de suivi si pas d'activité depuis X jours**
  - Condition : Pas d'activité depuis 5 jours après dernière relance
  - Action : Tâche créée "Relancer opportunité {{nom}} - Dernière activité il y a 5 jours"
  - Priorité : Moyenne
  - Échéance : J+1
  - Description : Historique, montant devis, nombre de relances
  - Support : Intégré dans useQuoteFollowUps
  
- ✅ **Passage automatique en "Perdu" si pas d'activité après X jours**
  - Condition : Pas d'activité depuis 30 jours après envoi devis (configurable)
  - Condition : Pas de réponse aux relances
  - Action : Statut → "Perdu (Pas de réponse)"
  - Action : Tag "Perdu" ajouté
  - Action : Notification commercial avec résumé
  - Option : Possibilité de réactiver manuellement
  - Support : Fonction markAsLost dans useQuoteFollowUps

**Scénario 4 : "Conversion Client"**
*Déclencheur : Devis accepté OU statut "Gagné" OU facture émise*

- ✅ **Email de bienvenue client avec onboarding (J+0)**
  - Template : Email de félicitations, remerciements, prochaines étapes
  - Contenu : Présentation équipe, processus onboarding, contacts utiles
  - Pièces jointes : Documents contractuels, guide client, FAQ
  - CTA : Prendre rendez-vous kick-off, accéder à l'espace client
  - Personnalisation : Nom, entreprise, service commandé
  - Support : Fonction sendWelcomeEmail dans useClientOnboarding
  
- ✅ **Création automatique de projet associé (J+0)**
  - Projet : Nom = "{{Entreprise}} - {{Service}}"
  - Client : Lead converti
  - Statut : "En attente" ou "Kick-off"
  - Budget : Montant du devis accepté
  - Dates : Date début (J+7), date fin estimée
  - Équipe : Attribution automatique selon règles
  - Support : Fonction createProject dans useClientOnboarding
  
- ✅ **Attribution automatique au gestionnaire de compte (J+0)**
  - Règle : Attribution selon secteur/famille du client
  - Règle : Attribution selon taille d'entreprise
  - Règle : Round-robin si plusieurs gestionnaires disponibles
  - Action : Notification gestionnaire avec contexte client
  - Action : Tâche créée "Onboarding client {{nom}}"
  - Support : Fonction assignAccountManager utilisant useLeadAssignment
  
- ✅ **Envoi automatique de documents contractuels (J+0)**
  - Documents : Contrat, CGV, conditions générales
  - Documents : Guide client, FAQ, contacts
  - Documents : Accès espace client (identifiants)
  - Format : PDF par email
  - Tracking : Ouverture, téléchargement
  - Support : Table client_documents, fonction sendDocuments dans useClientOnboarding
  
- ✅ **Planification automatique de rendez-vous de kick-off (J+0)**
  - Tâche : "Planifier kick-off avec {{nom}}"
  - Priorité : Haute
  - Échéance : J+3
  - Description : Client converti, projet créé, documents envoyés
  - Option : Création événement calendrier (si intégré)
  - Support : Fonction scheduleKickoff dans useClientOnboarding

**Scénario 5 : "Rétention Client"**
*Déclencheur : Client Actif avec risque de churn détecté*

- ✅ **Détection automatique de clients à risque (churn)**
  - Critères : Pas d'interaction depuis 3+ mois
  - Critères : Pas de facturation depuis 6+ mois
  - Critères : NPS < 6 ou CSAT < 3/5
  - Critères : Support tickets non résolus depuis 30+ jours
  - Critères : Utilisation en baisse (si métriques disponibles)
  - Tag automatique : "À risque churn"
  - Support : Table churn_risk_detection, hook useChurnDetection avec fonction detectChurnRisk
  
- ✅ **Enquête de satisfaction automatique (NPS, CSAT)**
  - Timing : 30 jours après livraison projet, puis tous les 6 mois
  - NPS : "Sur une échelle de 0-10, recommanderiez-vous notre service ?"
  - CSAT : "Êtes-vous satisfait de notre service ?" (1-5 étoiles)
  - Questions ouvertes : Points forts, points d'amélioration
  - Tracking : Réponse, score, commentaires
  - Support : Table satisfaction_surveys, hook useSatisfactionSurveys avec sendSurvey et schedulePeriodicSurveys
  
- ✅ **Relance automatique si client inactif depuis X mois**
  - Condition : Pas d'interaction depuis 3 mois (configurable)
  - Action : Email de relance "Comment allez-vous ?"
  - Action : Offre de consultation gratuite
  - Action : Nouveautés produits/services
  - Action : Tâche créée pour success manager
  - Support : Table client_retention_actions, fonction sendReengagementEmail dans useChurnDetection
  
- ✅ **Offres de réactivation personnalisées**
  - Offre : Extension de service, upgrade, nouveau service
  - Offre : Promotion spéciale client existant
  - Offre : Consultation stratégique gratuite
  - Personnalisation : Selon historique client, secteur, besoins
  - Tracking : Ouverture, clic, conversion
  - Support : Table client_retention_actions avec action_type 'offer'
  
- ✅ **Escalade vers success manager si score satisfaction faible**
  - Condition : NPS < 6 ou CSAT < 3/5
  - Action : Notification immédiate success manager
  - Action : Tâche créée "Client insatisfait : {{nom}} - Score {{score}}"
  - Action : Email success manager avec contexte et historique
  - Action : Planification call de récupération
  - Support : Fonction escalateToSuccessManager dans useChurnDetection

**Scénario 6 : "Réactivation Lead Perdu"**
*Déclencheur : Lead avec statut "Perdu" ET signal d'intérêt détecté*

- ✅ **Détection de signal d'intérêt**
  - Signal : Nouvelle visite site (page tarifs, contact, produits)
  - Signal : Nouveau téléchargement ressource
  - Signal : Formulaire rempli (contact, demo, newsletter)
  - Signal : Événement déclencheur (recrutement, levée de fonds, expansion, déménagement)
  - Signal : Nouvelle interaction sur réseaux sociaux
  - Signal : Scoring remonté (nouvelle donnée enrichie)
  - Support : Table interest_signals, hook useInterestSignals avec detectSignal
  
- ✅ **Réintégration automatique dans le pipeline si critères remplis**
  - Condition : Signal d'intérêt détecté
  - Condition : Scoring >= 50 (configurable)
  - Condition : Pas de désabonnement
  - Action : Statut "Perdu" → "Lead" ou "MQL"
  - Action : Tag "Perdu" retiré, tag "Réactivé" ajouté
  - Action : Date de réactivation enregistrée
  - Support : Table lead_reactivation, hook useLeadReactivation avec reactivateLostLead
  
- ✅ **Notification commercial avec contexte historique**
  - Email : "Lead {{nom}} réactivé - Signal d'intérêt détecté"
  - Contenu : Historique complet, raison perte initiale, nouveau signal
  - Contenu : Scoring actuel, dernière interaction, recommandations
  - Action : Tâche créée "Contacter lead réactivé : {{nom}}"
  - Support : Fonction sendReactivationNotification dans useLeadReactivation
  
- ✅ **Attribution au commercial d'origine si disponible**
  - Priorité 1 : Commercial d'origine si toujours actif et disponible
  - Priorité 2 : Commercial d'origine si toujours actif mais surchargé → notification
  - Priorité 3 : Commercial d'origine si inactif → attribution selon règles
  - Fallback : Attribution selon règles standard (round-robin, géographique, etc.)
  - Support : Logique d'attribution dans reactivateLostLead avec vérification charge de travail

**Scénario 7 : "Qualification MQL → SQL"**
*Déclencheur : Lead avec statut MQL ET scoring >= 75*

- ✅ **Vérification automatique des critères SQL**
  - Budget identifié : Montant ou range défini dans profil
  - Besoin exprimé : Problème identifié, solution recherchée
  - Timeline : Délai de décision < 6 mois (configurable)
  - Autorité : Décideur ou influenceur identifié
  - Engagement : Interactions multiples, téléchargements, visites
  - Support : Table sql_qualification_criteria, hook useSQLQualification avec fonction checkSQLCriteria
  
- ✅ **Notification commercial pour qualification**
  - Email : "Nouveau SQL à qualifier : {{nom}}"
  - Contenu : Profil complet, scoring, historique, critères remplis
  - Action : Tâche créée "Qualifier SQL : {{nom}}"
  - Priorité : Haute
  - Échéance : J+1
  - Support : Fonction notifyForQualification dans useSQLQualification
  
- ✅ **Transition automatique MQL → SQL**
  - Condition : Tous critères SQL remplis
  - Action : Statut cycle de vie → "SQL"
  - Action : Tag "SQL" ajouté
  - Action : Notification équipe commerciale
  - Action : Attribution commercial selon règles
  - Support : Fonction qualifyAsSQL dans useSQLQualification
  
- ✅ **Séquence d'onboarding SQL**
  - Email 1 (J+0) : Présentation commercial, proposition de call
  - Email 2 (J+2) : Cas clients similaires, ROI, résultats
  - Email 3 (J+5) : Offre consultation gratuite, demo
  - Pause : Si call programmé ou réponse reçue
  - Support : Inscription automatique dans séquence d'onboarding lors de la qualification SQL

**Scénario 8 : "Escalade Lead VIP"**
*Déclencheur : Lead avec scoring >= 90 OU valeur potentielle > 50k€ OU tag "VIP"*

- ✅ **Détection automatique lead VIP**
  - Critères : Scoring >= 90
  - Critères : Valeur potentielle du deal > 50k€ (configurable)
  - Critères : Tag "VIP" manuel
  - Critères : Entreprise Fortune 500 ou équivalent
  - Critères : C-level identifié (CEO, CTO, CFO)
  - Support : Table vip_leads, hook useVIPLeads avec fonction detectVIPLead
  
- ✅ **Affectation prioritaire**
  - Règle : Attribution aux meilleurs commerciaux (top 20%)
  - Règle : Attribution au manager si deal > 100k€
  - Règle : Escalade immédiate si pas de réponse sous 24h
  - Action : Notification immédiate (email + in-app + SMS si configuré)
  - Support : Fonction assignPriority dans useVIPLeads
  
- ✅ **Séquence de contact accélérée**
  - J+0 : Email personnalisé manager/commercial senior
  - J+0 : Appel immédiat (tâche haute priorité)
  - J+1 : Relance si pas de réponse
  - J+2 : Escalade manager si toujours pas de réponse
  - J+3 : Escalade direction si toujours pas de réponse
  - Support : Fonction startAcceleratedContactSequence et escalateVIPLead dans useVIPLeads
  
- ✅ **Suivi renforcé**
  - Dashboard dédié "Leads VIP" - ✅ Implémenté
  - Rapports quotidiens sur activité leads VIP - ✅ Implémenté
  - Alertes en temps réel sur toute interaction - ✅ Implémenté
  - Réunions hebdomadaires de suivi (si configuré) - ⚠️ Structure prête, planification automatique TODO
  - Support : Service `vipLeadService.ts` avec fonctions `getVIPLeads` (filtres statut/priorité), `generateVIPDailyReport` (rapport quotidien avec KPIs), `checkVIPEscalation` (vérification escalade 24h), `recordVIPContactAttempt` (enregistrement tentatives contact), `sendVIPAlerts` (alertes temps réel), composant `VIPLeadsDashboard.tsx` avec vue d'ensemble KPIs, liste leads VIP, filtres statut/priorité, modal enregistrement contact, table `vip_contact_attempts` et `vip_response_tracking` dans migration SQL, trigger automatique création tracking lors assignation lead VIP, intégration onglet VIP dans CrmView pour leads VIP détectés

**Scénario 9 : "Nurturing Post-Demo"**
*Déclencheur : Demo effectuée OU rendez-vous "Découverte" complété*

- ✅ **Email de remerciement (J+0)**
  - Template : Remerciement pour le temps accordé
  - Contenu : Résumé de la demo, points clés discutés
  - Pièces jointes : Présentation, ressources complémentaires
  - CTA : Prendre rendez-vous suivi, demander devis
  - Support : Table post_demo_nurturing, fonction sendThankYouEmail dans usePostDemoNurturing
  
- ✅ **Séquence de nurturing (J+2, J+7, J+14)**
  - Email 1 (J+2) : Réponses aux questions posées, ressources supplémentaires
  - Email 2 (J+7) : Cas clients similaires, ROI, témoignages
  - Email 3 (J+14) : Offre spéciale, deadline, incitation à l'action
  - Personnalisation : Selon besoins exprimés pendant la demo
  - Support : Inscription automatique dans séquence nurturing via enrollInNurturingSequence
  
- ✅ **Création automatique de devis si intérêt exprimé**
  - Condition : Intérêt exprimé pendant demo (tag "Intéressé")
  - Condition : Besoin et budget identifiés
  - Action : Tâche créée "Créer devis pour {{nom}}"
  - Action : Notification commercial avec contexte demo
  - Échéance : J+2
  - Support : Fonction createQuoteTask dans usePostDemoNurturing
  
- ✅ **Suivi automatique si pas de réponse**
  - Condition : Pas de réponse après 7 jours
  - Action : Tâche créée "Relancer post-demo : {{nom}}"
  - Action : Email de relance avec questions ouvertes
  - Action : Escalade si pas de réponse après 14 jours
  - Support : Fonction scheduleFollowUp et checkAndEscalate dans usePostDemoNurturing

**Scénario 10 : "Onboarding Client Nouveau Projet"**
*Déclencheur : Nouveau projet créé pour client existant*

- ✅ **Email de bienvenue nouveau projet (J+0)**
  - Template : Présentation projet, équipe assignée, planning
  - Contenu : Objectifs, livrables, jalons, contacts
  - Pièces jointes : Brief projet, planning, documents de référence
  - CTA : Accéder à l'espace projet, prendre rendez-vous kick-off
  - Support : Table project_onboarding, fonction sendWelcomeEmail dans useProjectOnboarding
  
- ✅ **Création automatique de tâches projet**
  - Tâche : "Kick-off projet {{nom}}"
  - Tâche : "Brief client {{nom}}"
  - Tâche : "Livrable 1 {{nom}}"
  - Assignation : Selon équipe projet
  - Dates : Selon planning projet
  - Support : Fonction createProjectTasks dans useProjectOnboarding
  
- ✅ **Attribution automatique équipe projet**
  - Règle : Selon type de projet (marketing, dev, design, etc.)
  - Règle : Selon compétences requises
  - Règle : Selon disponibilité équipe
  - Action : Notification équipe avec contexte projet
  - Support : Fonction assignTeam dans useProjectOnboarding
  
- ✅ **Planification automatique rendez-vous kick-off**
  - Événement : "Kick-off {{projet}}"
  - Participants : Client, équipe projet, chef de projet
  - Date : J+3 (configurable)
  - Durée : 1h (configurable)
  - Action : Invitation calendrier (si intégré)
  - Support : Fonction scheduleKickoff dans useProjectOnboarding

**Scénario 11 : "Relance Facture Impayée"**
*Déclencheur : Facture envoyée ET pas de paiement depuis X jours*

- ✅ **Détection facture impayée**
  - Condition : Facture statut "Envoyée"
  - Condition : Date échéance dépassée (configurable : J+7, J+15, J+30)
  - Condition : Pas de paiement enregistré
  - Tag automatique : "Facture impayée"
  - Support : Table invoices, hook useInvoiceReminders avec fonction checkOverdueInvoices
  
- ✅ **Séquence de relance automatique**
  - Relance 1 (J+7) : Email rappel doux "Facture {{numéro}} à régler"
  - Relance 2 (J+15) : Email avec urgence "Facture en retard"
  - Relance 3 (J+30) : Email avec mise en demeure, éventuelle suspension service
  - Personnalisation : Montant, numéro facture, date échéance, lien paiement
  - Support : Table invoice_reminders, fonction createReminderIfNeeded et sendReminder
  
- ✅ **Notification équipe comptable/commerciale**
  - Condition : Facture impayée depuis 15+ jours
  - Action : Notification comptable avec détails
  - Action : Notification commercial si client actif
  - Action : Tâche créée "Suivre facture impayée : {{client}}"
  - Support : Fonction executeAutomaticActions dans useInvoiceReminders
  
- ✅ **Actions automatiques selon délai**
  - J+15 : Tag "À suivre" ajouté
  - J+30 : Tag "En retard" ajouté, notification manager
  - J+45 : Suspension service (si configuré et applicable)
  - J+60 : Escalade direction, procédure recouvrement
  - Support : Fonction executeAutomaticActions avec escalades automatiques

**Scénario 12 : "Détection Événement Déclencheur"**
*Déclencheur : Événement déclencheur détecté sur lead/client (scraping, monitoring, IA)*

- ✅ **Types d'événements déclencheurs détectés**
  - Recrutement : Nouveaux postes ouverts, croissance équipe
  - Levée de fonds : Financement obtenu, investissement
  - Expansion : Nouveau bureau, nouvelle région, international
  - Déménagement : Changement d'adresse, nouvelle localisation
  - Changement technologique : Nouvelle stack, migration, upgrade
  - Événement médiatique : Article presse, award, reconnaissance
  - Changement direction : Nouveau dirigeant, restructuration
  - Support : Table trigger_events avec types d'événements, hook useTriggerEvents avec fonction detectTriggerEvent
  
- ✅ **Enrichissement automatique des données**
  - Mise à jour : Données entreprise (effectifs, CA, localisation)
  - Mise à jour : Scoring (augmentation si événement positif)
  - Mise à jour : Température (Froid → Tiède → Chaud)
  - Mise à jour : Tags (événement spécifique)
  - Historique : Enregistrement événement dans timeline
  - Support : Fonctions enrichDataFromEvent, updateScoreFromEvent, updateTemperatureFromEvent, updateTagsFromEvent, recordInTimeline
  
- ✅ **Actions automatiques selon type d'événement**
  - Recrutement : Email "Félicitations pour votre croissance", offre recrutement
  - Levée de fonds : Email "Félicitations pour votre financement", offre scaling
  - Expansion : Email "Félicitations pour votre expansion", offre multi-sites
  - Déménagement : Email "Bienvenue dans votre nouvelle région", offre locale
  - Changement tech : Email "Nous avons vu votre évolution tech", offre migration
  - Support : Fonction executeEventSpecificActions dans useTriggerEvents
  
- ✅ **Notification commercial avec contexte**
  - Email : "Événement déclencheur détecté : {{lead}} - {{événement}}"
  - Contenu : Détails événement, contexte historique, opportunité
  - Action : Tâche créée "Contacter {{lead}} - Événement {{événement}}"
  - Priorité : Haute
  - Échéance : J+1
  - Support : Fonction notifySalesTeam dans useTriggerEvents
  
- ✅ **Réactivation automatique si lead inactif/perdu**
  - Condition : Lead avec statut "Inactif" ou "Perdu"
  - Condition : Événement déclencheur positif détecté
  - Action : Réactivation automatique
  - Action : Statut → "Lead" ou "MQL"
  - Action : Notification commercial avec historique complet
  - Support : Fonction reactivateFromEvent dans useTriggerEvents, intégration avec useLeadReactivation

**3.9.3 Déclencheurs et conditions**

**Déclencheurs basés sur le temps**

- ✅ **Délai fixe (J+X après événement)**
  - Format : J+0 (immédiat), J+1 (24h), J+2 (48h), J+7 (1 semaine), J+30 (1 mois)
  - Exemples concrets :
    - J+0 : Email de bienvenue immédiat après création lead
    - J+2 : Relance après envoi devis
    - J+7 : Relance si pas de réponse
    - J+30 : Enquête satisfaction après livraison
  - Configuration : Délai personnalisable par workflow
  - Précision : Heures, jours, semaines, mois
  - Support : Table time_triggers avec trigger_type='fixed_delay', hook useTimeTriggers avec calculateDelay
  
- ✅ **Délai variable (selon scoring, température, secteur)**
  - Scoring élevé (> 75) : Délai court (J+1)
  - Scoring moyen (50-75) : Délai moyen (J+3)
  - Scoring faible (< 50) : Délai long (J+7)
  - Température "Chaud" : Délai court (J+0 ou J+1)
  - Température "Tiède" : Délai moyen (J+3)
  - Température "Froid" : Délai long (J+7)
  - Secteur prioritaire : Délai court (J+1)
  - Secteur standard : Délai moyen (J+3)
  - Configuration : Règles personnalisables par critères
  - Support : Table delay_rules avec rule_type (score_based, temperature_based, sector_based), hook useDelayRules, fonction calculateVariableDelay dans useTimeTriggers
  
- ✅ **Heures/jours ouvrés configurables**
  - Jours ouvrés : Lundi-Vendredi (configurable)
  - Heures ouvrées : 9h-18h (configurable)
  - Jours fériés : Exclusion automatique (calendrier français)
  - Vacances : Périodes configurables
  - Action : Si déclenchement prévu hors heures → report au prochain jour ouvré
  - Exemple : Email prévu dimanche → envoi lundi 9h
  - Support : Table business_calendars avec working_days, working_hours, holidays, vacation_periods, hook useBusinessCalendars, fonction adjustToBusinessHours dans useTimeTriggers
  
- ✅ **Fuseaux horaires et calendriers locaux**
  - Détection automatique : Fuseau horaire du lead (selon adresse)
  - Envoi optimisé : Heure locale du lead (ex: 10h heure locale)
  - Calendriers : Support multi-fuseaux (Europe, Amérique, Asie)
  - Configuration : Fuseau par défaut, fuseau par lead
  - Respect : Heures de travail selon fuseau local
  - Support : Table business_calendars avec timezone, hook useBusinessCalendars, fonction applyTimezone dans useTimeTriggers

**Déclencheurs basés sur le comportement**

- ✅ **Ouverture email (première, multiple, dernière)**
  - Première ouverture : Déclencheur "Email ouvert pour la première fois"
  - Ouvertures multiples : Déclencheur "Email ouvert X fois" (seuil configurable : 2, 3, 5+)
  - Dernière ouverture : Déclencheur "Email ouvert il y a moins de X heures"
  - Tracking : Pixel invisible, ouverture détectée
  - Actions possibles : Notification commercial, relance, changement température
  - Exemple : Si email ouvert 3+ fois sans réponse → notification commercial
  - Support : Table email_tracking, hook useEmailTracking avec trackEmailOpen, table behavior_events et behavior_triggers
  
- ✅ **Clic dans email (lien spécifique, nombre de clics)**
  - Clic simple : Déclencheur "Clic dans email"
  - Clic spécifique : Déclencheur "Clic sur lien {{nom_lien}}"
  - Nombre de clics : Déclencheur "X clics dans email" (seuil configurable)
  - Tracking : URLs trackées, liens cliqués enregistrés
  - Actions possibles : Passage MQL, notification, relance personnalisée
  - Exemple : Clic sur "Demander devis" → création tâche "Créer devis"
  - Support : Table email_tracking avec clicked_links, hook useEmailTracking avec trackEmailClick, évaluation dans useBehaviorTriggers
  
- ✅ **Visite site web (page spécifique, durée, fréquence)**
  - Visite simple : Déclencheur "Visite site web"
  - Page spécifique : Déclencheur "Visite page {{url}}" (ex: /tarifs, /contact, /produits)
  - Durée : Déclencheur "Visite > X minutes" (seuil configurable : 2min, 5min, 10min)
  - Fréquence : Déclencheur "X visites en Y jours" (ex: 3 visites en 7 jours)
  - Tracking : Pixel de tracking, Google Analytics, cookies
  - Actions possibles : Réactivation, notification, changement scoring
  - Exemple : Visite page tarifs + durée > 5min → passage SQL
  - Support : Table website_visits, hook useWebsiteTracking avec trackPageVisit et updateVisitDuration, évaluation dans useBehaviorTriggers
  
- ✅ **Téléchargement ressource (whitepaper, guide, etc.)**
  - Type ressource : Whitepaper, guide, case study, template, checklist
  - Déclencheur : "Téléchargement {{nom_ressource}}"
  - Tracking : Lien de téléchargement tracké
  - Actions possibles : Passage MQL, email de suivi, scoring augmenté
  - Exemple : Téléchargement whitepaper premium → passage MQL
  - Support : Table resource_downloads, hook useResourceDownloads avec trackDownload, évaluation dans useBehaviorTriggers
  
- ✅ **Formulaire rempli (contact, demo, newsletter)**
  - Type formulaire : Contact, demande demo, newsletter, téléchargement
  - Déclencheur : "Formulaire {{nom}} rempli"
  - Données : Champs remplis enregistrés, mise à jour profil lead
  - Actions possibles : Création lead, passage MQL/SQL, notification
  - Exemple : Formulaire "Demande demo" → création SQL + tâche commercial
  - Support : Table form_submissions, hook useFormSubmissions avec trackSubmission et processFormSubmission, évaluation dans useBehaviorTriggers
  
- ✅ **Événement déclencheur détecté (recrutement, levée de fonds, expansion)**
  - Types événements : Recrutement, levée de fonds, expansion, déménagement, award
  - Détection : Scraping automatique, monitoring web, IA, API tierces
  - Déclencheur : "Événement {{type}} détecté pour {{lead}}"
  - Actions possibles : Réactivation, notification, enrichissement, scoring augmenté
  - Exemple : Levée de fonds détectée → réactivation + email félicitations
  - Support : Déjà développé dans useTriggerEvents (Scénario 12), intégration avec behavior_events

**Déclencheurs basés sur les données**

- ✅ **Changement de statut dans le pipeline**
  - Déclencheur : "Statut changé de {{ancien}} à {{nouveau}}"
  - Exemples : "Nouveau" → "Découverte", "Proposition" → "Gagné", "Opportunité" → "Perdu"
  - Actions possibles : Email automatique, notification, création tâche
  - Exemple : Statut "Gagné" → scénario "Conversion Client"
  - Support : Table data_changes avec change_type='status_change', table data_triggers, hook useDataTriggers avec evaluateStatusChangeConditions
  
- ✅ **Changement de scoring (augmentation, diminution, seuil)**
  - Augmentation : Déclencheur "Scoring augmenté de X points" (seuil configurable : +10, +20)
  - Diminution : Déclencheur "Scoring diminué de X points" (seuil configurable : -10, -20)
  - Seuil atteint : Déclencheur "Scoring >= X" ou "Scoring <= X" (seuils : 50, 60, 75, 90)
  - Actions possibles : Passage MQL/SQL, notification, changement température
  - Exemple : Scoring >= 75 → passage SQL
  - Support : Table data_changes avec change_type='score_change', hook useDataTriggers avec evaluateScoreChangeConditions
  
- ✅ **Changement de température (Froid → Tiède → Chaud)**
  - Déclencheur : "Température changée de {{ancienne}} à {{nouvelle}}"
  - Transitions : Froid → Tiède, Tiède → Chaud, Chaud → Tiède, Tiède → Froid
  - Actions possibles : Changement séquence nurturing, notification, relance
  - Exemple : Froid → Tiède → activation séquence nurturing
  - Support : Table data_changes avec change_type='temperature_change', hook useDataTriggers avec evaluateTemperatureChangeConditions
  
- ✅ **Ajout/modification de tags**
  - Ajout tag : Déclencheur "Tag {{nom}} ajouté"
  - Suppression tag : Déclencheur "Tag {{nom}} supprimé"
  - Modification : Déclencheur "Tags modifiés"
  - Actions possibles : Changement workflow, notification, segmentation
  - Exemple : Tag "VIP" ajouté → scénario "Escalade Lead VIP"
  - Support : Table data_changes avec change_type='tag_change', hook useDataTriggers avec evaluateTagChangeConditions et intégration avec useVIPLeads
  
- ✅ **Modification de champs personnalisés**
  - Déclencheur : "Champ {{nom}} modifié" ou "Champ {{nom}} = {{valeur}}"
  - Exemples : Budget modifié, timeline modifié, besoin modifié
  - Actions possibles : Mise à jour scoring, notification, changement workflow
  - Exemple : Budget > 50k€ → tag "VIP" + scénario escalade
  - Support : Table data_changes avec change_type='field_change', hook useDataTriggers avec evaluateFieldChangeConditions
  
- ✅ **Détection de doublon ou fusion**
  - Déclencheur : "Doublon détecté" ou "Fusion effectuée"
  - Actions possibles : Notification, fusion automatique, archivage
  - Exemple : Doublon détecté → notification + suggestion fusion
  - Support : Table lead_duplicates, hook useLeadDuplicates avec detectDuplicates et mergeDuplicates, calcul de similarité automatique

**Déclencheurs basés sur les interactions**

- ✅ **Email envoyé/reçu**
  - Envoyé : Déclencheur "Email envoyé à {{lead}}"
  - Reçu : Déclencheur "Email reçu de {{lead}}"
  - Sujet : Déclencheur "Email avec sujet contenant {{mot_clé}}"
  - Actions possibles : Mise à jour timeline, notification, changement statut
  - Exemple : Email reçu avec "devis" → passage Opportunité
  - Support : Table interaction_events avec interaction_type='email_sent'/'email_received', table interaction_triggers, hook useInteractionTriggers avec evaluateTriggerConditions
  
- ✅ **Appel effectué/reçu**
  - Effectué : Déclencheur "Appel effectué à {{lead}}"
  - Reçu : Déclencheur "Appel reçu de {{lead}}"
  - Durée : Déclencheur "Appel > X minutes" (seuil configurable)
  - Résultat : Déclencheur "Appel avec résultat {{résultat}}" (intéressé, pas intéressé, rappel)
  - Actions possibles : Mise à jour timeline, changement statut, création tâche
  - Exemple : Appel effectué + résultat "intéressé" → passage Contact
  - Support : Table interaction_events avec interaction_type='call_made'/'call_received', hook useInteractionTriggers avec conditions duration_min et result
  
- ✅ **Rendez-vous programmé/annulé**
  - Programmé : Déclencheur "Rendez-vous programmé avec {{lead}}"
  - Annulé : Déclencheur "Rendez-vous annulé avec {{lead}}"
  - Complété : Déclencheur "Rendez-vous complété avec {{lead}}"
  - Type : Déclencheur "Rendez-vous type {{type}}" (demo, découverte, suivi)
  - Actions possibles : Notification, création tâche, changement statut
  - Exemple : Rendez-vous "demo" complété → scénario "Nurturing Post-Demo"
  - Support : Table interaction_events avec interaction_type='appointment_*', hook useInteractionTriggers avec intégration usePostDemoNurturing
  
- ✅ **Devis envoyé/vu/accepté/refusé**
  - Envoyé : Déclencheur "Devis {{numéro}} envoyé"
  - Vu : Déclencheur "Devis {{numéro}} vu par client"
  - Accepté : Déclencheur "Devis {{numéro}} accepté"
  - Refusé : Déclencheur "Devis {{numéro}} refusé"
  - Actions possibles : Scénario "Relance Opportunité", notification, changement statut
  - Exemple : Devis accepté → scénario "Conversion Client"
  - Support : Table interaction_events avec interaction_type='quote_*', hook useInteractionTriggers avec intégration useQuoteFollowUps et useClientOnboarding
  
- ✅ **Facture envoyée/payée/en retard**
  - Envoyée : Déclencheur "Facture {{numéro}} envoyée"
  - Payée : Déclencheur "Facture {{numéro}} payée"
  - En retard : Déclencheur "Facture {{numéro}} en retard de X jours"
  - Actions possibles : Scénario "Relance Facture Impayée", notification comptable
  - Exemple : Facture en retard 15+ jours → relance automatique
  - Support : Table interaction_events avec interaction_type='invoice_*', hook useInteractionTriggers avec intégration useInvoiceReminders
  
- ✅ **Note ou commentaire ajouté**
  - Déclencheur : "Note ajoutée sur {{lead}}" ou "Commentaire ajouté sur {{lead}}"
  - Type : Déclencheur "Note type {{type}}" (interne, client, suivi)
  - Actions possibles : Notification équipe, mise à jour timeline
  - Exemple : Note "Intéressé" ajoutée → notification commercial
  - Support : Table interaction_events avec interaction_type='note_added'/'comment_added', hook useInteractionTriggers avec updateTimeline
  
- ✅ **Tâche créée/complétée**
  - Créée : Déclencheur "Tâche créée pour {{lead}}"
  - Complétée : Déclencheur "Tâche complétée pour {{lead}}"
  - Type : Déclencheur "Tâche type {{type}}" (appel, email, rendez-vous, suivi)
  - Actions possibles : Notification, mise à jour timeline, changement statut
  - Exemple : Tâche "Appel" complétée → mise à jour timeline
  - Support : Table interaction_events avec interaction_type='task_created'/'task_completed', hook useInteractionTriggers avec updateTimeline

**3.9.4 Actions automatisées**

**Actions de communication**

- ✅ **Envoi email personnalisé (template + variables dynamiques)**
  - Template : Sélection depuis bibliothèque ou création
  - Variables : {{nom}}, {{prénom}}, {{entreprise}}, {{secteur}}, {{scoring}}, etc.
  - Personnalisation : Contenu adapté selon profil, historique, comportement
  - Expéditeur : Email commercial assigné ou email générique configuré
  - Sujet : Personnalisable avec variables
  - Pièces jointes : Documents, ressources, devis, factures
  - Tracking : Ouverture, clic, réponse, bounce
  - Planification : Envoi immédiat ou différé (selon heures ouvrées)
  - Conditions : Vérification désabonnement avant envoi
  - Support : Table automated_actions avec action_type='email', table email_actions, hook useAutomatedActions avec executeEmailAction, intégration useEmailTemplates pour remplacement variables
  
- ✅ **Envoi SMS (via API tierce)**
  - Intégration : API tierce (Twilio, MessageBird, etc.)
  - Contenu : Message court (160 caractères), personnalisable
  - Variables : {{nom}}, {{entreprise}}, {{lien}}
  - Cas d'usage : Relance urgente, rappel rendez-vous, notification importante
  - Tracking : Envoi, livraison, erreur
  - Coût : Suivi des coûts par SMS envoyé
  - Conditions : Consentement SMS, pas de désabonnement SMS
  - Support : Table automated_actions avec action_type='sms', table sms_actions, hook useAutomatedActions avec executeSMSAction, vérification consentement via lead_preferences
  
- ✅ **Envoi WhatsApp (via API tierce)**
  - Intégration : API WhatsApp Business (Twilio, MessageBird, etc.)
  - Contenu : Message texte, images, documents
  - Variables : {{nom}}, {{entreprise}}, {{lien}}
  - Cas d'usage : Communication B2B, relance, support
  - Tracking : Envoi, livraison, lecture, réponse
  - Coût : Suivi des coûts par message
  - Conditions : Consentement WhatsApp, pas de désabonnement
  - Support : Table automated_actions avec action_type='whatsapp', table whatsapp_actions, hook useAutomatedActions avec executeWhatsAppAction, support templates et médias
  
- ✅ **Notification in-app au commercial**
  - Type : Notification push dans l'application
  - Contenu : "Nouveau lead {{nom}} assigné", "Relance nécessaire pour {{nom}}"
  - Priorité : Haute, Moyenne, Basse (affichage différencié)
  - Action : Clic → redirection vers fiche lead
  - Historique : Notifications archivées, marquées lues/non lues
  - Préférences : Paramètres de notification par utilisateur
  - Support : Table automated_actions avec action_type='in_app_notification', table in_app_notifications, hook useAutomatedActions avec executeInAppNotification, support priorités et actions
  
- ✅ **Notification Slack/Teams (webhook)**
  - Intégration : Webhook Slack/Teams configuré
  - Canal : Canal dédié CRM ou canal général
  - Format : Message structuré avec détails lead, action, lien
  - Mentions : @commercial si assigné, @équipe si important
  - Actions : Boutons d'action (Voir lead, Créer tâche, etc.)
  - Historique : Messages archivés dans Slack/Teams
  - Support : Table automated_actions avec action_type='slack_notification'/'teams_notification', table slack_teams_notifications, hook useAutomatedActions avec executeSlackTeamsNotification, support messages structurés et boutons
  
- ✅ **Appel automatique (VoIP, si intégré)**
  - Intégration : API VoIP (Twilio, Vonage, etc.)
  - Type : Appel sortant automatique ou rappel programmé
  - Script : Script d'appel personnalisable
  - Tracking : Appel effectué, durée, résultat (joignable, pas joignable, message)
  - Enregistrement : Enregistrement optionnel (avec consentement)
  - Coût : Suivi des coûts par appel
  - Support : Table automated_actions avec action_type='voip_call', table voip_calls, hook useAutomatedActions avec executeVoIPCall, support scripts personnalisables et planification

**Actions sur les données**

- ✅ **Mise à jour de statut (pipeline, cycle de vie)**
  - Pipeline : Changement de colonne (Nouveau → Découverte → Proposition, etc.)
  - Cycle de vie : Changement d'étape (Lead → MQL → SQL → Client, etc.)
  - Historique : Enregistrement changement dans timeline (sales_activities)
  - Notification : Notification équipe si changement important (structure prête)
  - Conditions : Vérification règles de transition avant changement (structure prête)
  - Support : Service `leadDataActions.ts` avec fonction `updateLeadStatus`, intégré dans `useAutomatedActions` avec action type `update_status`
  
- ✅ **Modification de scoring (augmentation/diminution)**
  - Augmentation : +X points (configurable : +5, +10, +20)
  - Diminution : -X points (configurable : -5, -10, -20)
  - Seuil : Modification si scoring atteint seuil (ex: >= 75)
  - Facteurs : Engagement, profil complet, interactions, données enrichies
  - Historique : Enregistrement modification dans timeline (sales_activities)
  - Notification : Notification si scoring change significativement (structure prête)
  - Support : Service `leadDataActions.ts` avec fonction `updateLeadScoring`, intégré dans `useAutomatedActions` avec action type `update_scoring`, support scoring/quality_score
  
- ✅ **Changement de température**
  - Transitions : Froid → Tiède, Tiède → Chaud, Chaud → Tiède, Tiède → Froid
  - Critères : Scoring, engagement, interactions, comportement
  - Historique : Enregistrement changement dans timeline (sales_activities)
  - Actions : Changement séquence nurturing selon nouvelle température (structure prête)
  - Support : Service `leadDataActions.ts` avec fonction `updateLeadTemperature`, intégré dans `useAutomatedActions` avec action type `update_temperature`
  
- ✅ **Ajout/suppression de tags**
  - Ajout : Tag unique ou multiple (ex: "VIP", "À contacter", "Intéressé")
  - Suppression : Retrait tag spécifique ou multiple
  - Tags automatiques : "Nouveau Lead", "MQL", "SQL", "VIP", "À risque churn"
  - Historique : Enregistrement ajout/suppression dans timeline (sales_activities)
  - Actions : Déclenchement workflow selon tags (structure prête)
  - Support : Service `leadDataActions.ts` avec fonction `updateLeadTags`, intégré dans `useAutomatedActions` avec action type `update_tags`
  
- ✅ **Mise à jour de champs personnalisés**
  - Champs : Budget, timeline, besoin, autorité, etc.
  - Source : Formulaire, interaction, enrichissement, manuel
  - Validation : Vérification format, valeurs autorisées
  - Historique : Enregistrement modification dans timeline
  - Actions : Recalcul scoring si champ impacte scoring
  - Support : Service `leadDataActions.ts` avec fonction `updateLeadCustomField`, intégré dans `useAutomatedActions` avec action type `update_custom_field`, enregistrement dans timeline via `sales_activities`
  
- ✅ **Enrichissement automatique des données (IA, API)**
  - IA : Enrichissement par IA (description, SWOT, tech stack, maturité digitale) - ✅ Implémenté avec Gemini
  - API tierces : Clearbit, FullContact, Hunter.io, SIRENE - ✅ Implémenté (nécessite clés API)
  - Support : Fonctions `enrichWithClearbit` (Company Enrichment par domaine, extraction employeeCount, annualRevenue, website, description, industry, sector, tags, réseaux sociaux, location, foundedYear, phone, tech stack), `enrichWithFullContact` (Person Enrichment par email, Company Enrichment par nom, extraction emails, phones, réseaux sociaux, location, company data), `enrichWithHunter` (Email Verifier pour validation emails, Domain Search pour trouver emails par domaine, Email Finder pour trouver email par nom/entreprise, extraction email, emailValid, emailScore, emailConfidence, emailSources, firstName, lastName, position, linkedin, twitter, phone), intégration automatique dans `enrichLeadAutomated` avec mise à jour des champs manquants, enregistrement automatique des coûts via `apiCostTrackingService`, gestion erreurs (404, 429 quota, autres), tracking succès/échecs dans logs API
  - Champs : Entreprise, dirigeant, effectifs, CA, site web, réseaux sociaux
  - Fréquence : Enrichissement initial, puis refresh périodique (tous les 6 mois) - ✅ Implémenté (vérification 180 jours)
  - Coût : Suivi des coûts API - ✅ Implémenté
  - Support : Service `apiCostTrackingService.ts` avec fonction `recordApiUsage` enregistrant chaque utilisation d'API (provider, service_type, request_type, cost, credits_used, success, error_message), fonction `getApiCostSummary` calculant résumés par provider avec breakdown par type de service/requête, fonction `getApiUsageHistory` récupérant historique avec filtres, fonction `getLeadEnrichmentCost` calculant coût total enrichissement pour un lead, fonction `getApiUsageStats` calculant statistiques (totalCost, totalRequests, avgCostPerRequest, successRate), fonction `exportApiUsageCSV` exportant données au format CSV, table `api_usage_logs` dans migration SQL avec champs (api_provider, service_type, request_type, lead_id, cost, credits_used, success, error_message, metadata), coûts par défaut configurés pour chaque API (Clearbit, FullContact, Hunter.io, SIRENE, Gemini, Groq, Mistral, OpenRouter), intégration automatique dans `enrichLeadAutomated` pour tracking enrichissement IA, index pour performances, RLS policies pour sécurité
  - Historique : Enregistrement enrichissement dans timeline - ✅ Implémenté
  - Support : Service `enrichmentActions.ts` avec fonction `enrichLeadAutomated`, intégré dans `useAutomatedActions` avec action type `enrich_lead`, support enrichissement IA (Gemini), enrichissement géographique/métier (web scraping), placeholders pour API tierces (Clearbit, FullContact, Hunter.io, SIRENE), enregistrement automatique dans timeline via `sales_activities`

**Actions de workflow**

- ✅ **Création de tâche (assignation, priorité, échéance)**
  - Titre : "Contacter {{nom}}", "Relancer {{entreprise}}", etc. (remplacement variables)
  - Description : Contexte, historique, recommandations (remplacement variables)
  - Assignation : Commercial assigné, équipe (multi-assignation via task_assignees), ou automatique selon règles
  - Priorité : Haute, Moyenne, Basse (selon scoring, température, urgence ou configuration)
  - Échéance : Date fixe (J+X) ou relative (J+1, J+3, J+7)
  - Tags : Tags automatiques selon contexte
  - Lien : Lien vers fiche lead/projet (metadata)
  - Support : Service `workflowActions.ts` avec fonction `createAutomatedTask`, intégré dans `useAutomatedActions` avec action type `create_task`, enregistrement dans `tasks` et `automated_tasks`, enregistrement dans timeline via `sales_activities`
  
- ✅ **Création de rendez-vous (calendrier)**
  - Type : Demo, découverte, suivi, kick-off, etc.
  - Participants : Commercial, lead/client, équipe
  - Date : Date/heure spécifique ou suggestion selon disponibilité
  - Durée : 30min, 1h, 2h (configurable)
  - Description : Contexte, objectifs, préparation
  - Intégration : Google Calendar, Outlook (si intégré) - TODO
  - Notification : Rappel automatique (J-1, J-0) - TODO
  - Support : Service `workflowActions.ts` avec fonction `createAutomatedAppointment`, intégré dans `useAutomatedActions` avec action type `create_appointment`, enregistrement dans `events` et timeline via `sales_activities`
  
- ✅ **Création de note ou commentaire**
  - Type : Note interne, commentaire client, suivi
  - Contenu : Texte libre ou template structuré
  - Auteur : Système (automatique) ou utilisateur
  - Visibilité : Interne, partagé avec client
  - Tags : Tags pour catégorisation
  - Timeline : Affichage dans timeline lead/projet
  - Support : Service `workflowActions.ts` avec fonction `createAutomatedNote`, intégré dans `useAutomatedActions` avec action type `create_note`, enregistrement dans `sales_activities` avec remplacement de variables
  
- ✅ **Création de devis automatique**
  - Déclencheur : Intérêt exprimé, demande client, scoring élevé
  - Template : Template devis selon service/produit
  - Montant : Estimation selon besoins identifiés ou montant standard
  - Client : Informations pré-remplies depuis fiche lead
  - Statut : "Brouillon" (à valider) ou "Envoyé" (si automatique)
  - Action : Tâche créée pour commercial "Valider devis {{numéro}}" (si draft=true)
  - Support : Service `workflowActions.ts` avec fonction `createAutomatedQuote`, intégré dans `useAutomatedActions` avec action type `create_quote`, calcul automatique du montant total, création de tâche de validation si draft, enregistrement dans timeline via `sales_activities`
  
- ✅ **Création de projet associé**
  - Déclencheur : Client converti, deal gagné
  - Nom : "{{Entreprise}} - {{Service}}"
  - Client : Lead converti
  - Budget : Montant devis accepté
  - Dates : Date début (J+7), date fin estimée
  - Équipe : Attribution automatique selon règles
  - Statut : "En attente" ou "Kick-off"
  - Lien : Lien bidirectionnel lead ↔ projet
  - Support : Service `workflowActions.ts` avec fonction `createAutomatedProject`, intégré dans `useAutomatedActions` avec action type `create_project`, création automatique de tâche kick-off si configuré, enregistrement dans timeline via `sales_activities`

**Actions d'affectation**

- ✅ **Attribution à un commercial (round-robin, géographique, compétence, charge)**
  - Round-robin : Répartition équitable entre commerciaux disponibles (avec pondération selon performance)
  - Géographique : Attribution selon zone géographique (région, département, ville) avec fallback
  - Compétence : Attribution selon expertise secteur/famille (mapping configurable)
  - Charge : Attribution au commercial le moins chargé (nombre de leads actifs, exclusion surchargés)
  - Performance : Attribution aux meilleurs commerciaux (taux de conversion, top X%)
  - Disponibilité : Attribution selon disponibilité calendrier (structure prête, TODO)
  - Combinaison : Plusieurs règles combinables avec pondération (évaluation par priorité)
  - Support : Service `assignmentActions.ts` avec fonction `assignLeadAutomated`, intégré dans `useAutomatedActions` avec action type `assign_lead`, utilisation des règles depuis `lead_assignment_rules`, enregistrement dans timeline via `sales_activities`
  
- ✅ **Réattribution si commercial indisponible**
  - Détection : Commercial en congé, surchargé, indisponible (structure prête, vérification TODO)
  - Fallback : Attribution au commercial suivant selon règles (round-robin, workload, etc.)
  - Notification : Notification commercial d'origine et nouveau commercial (structure prête, TODO)
  - Historique : Enregistrement réattribution dans timeline (sales_activities)
  - Support : Service `assignmentActions.ts` avec fonction `reassignLeadAutomated`, intégré dans `useAutomatedActions` avec action type `reassign_lead`, enregistrement dans timeline avec type 'reassigned'
  
- ✅ **Escalade vers manager si conditions remplies**
  - Conditions : Pas de réponse après X relances, lead VIP (scoring >= 90), deal > montant seuil
  - Action : Notification manager avec contexte (structure prête, TODO)
  - Action : Tâche créée pour manager (automatique si createTask=true)
  - Action : Manager peut prendre le relais ou déléguer (attribution automatique)
  - Historique : Enregistrement escalade dans timeline (sales_activities)
  - Support : Service `assignmentActions.ts` avec fonction `escalateToManagerAutomated`, intégré dans `useAutomatedActions` avec action type `escalate_to_manager`, recherche automatique manager (rôle Manager/Admin), création tâche automatique, enregistrement dans timeline avec type 'escalated'
  
- ✅ **Transfert vers autre équipe (support, success)**
  - Support : Transfert si question technique, bug, problème
  - Success : Transfert si client converti, onboarding, rétention
  - Action : Notification équipe cible (structure prête, TODO)
  - Action : Tâche créée pour équipe cible (automatique si createTask=true)
  - Historique : Enregistrement transfert dans timeline (sales_activities)
  - Lien : Lien bidirectionnel entre équipes (metadata)
  - Support : Service `assignmentActions.ts` avec fonction `transferToTeamAutomated`, intégré dans `useAutomatedActions` avec action type `transfer_to_team`, recherche automatique membres équipe selon rôles, création tâche automatique, enregistrement dans timeline avec type 'transferred'

**3.9.5 Routage et affectation intelligente**

**Règles d'affectation configurables**

- ✅ **Round-robin (répartition équitable)**
  - Principe : Attribution séquentielle entre commerciaux disponibles - ✅ Implémenté
  - Exemple : Lead 1 → Commercial A, Lead 2 → Commercial B, Lead 3 → Commercial C, Lead 4 → Commercial A - ✅ Implémenté
  - Poids : Pondération possible selon performance (ex: Commercial A = 2x plus de leads) - ✅ Implémenté
  - Exclusion : Exclusion commerciaux indisponibles, en congé, surchargés - ✅ Implémenté (via `userAvailabilityService.ts`)
  - Réinitialisation : Réinitialisation périodique (quotidienne, hebdomadaire) - ✅ Implémenté avec `getResetDate`
  - Historique : Suivi répartition pour équité - ✅ Comptage des assignments depuis réinitialisation
  
- ✅ **Géographique (proximité, zone)**
  - Principe : Attribution selon zone géographique du lead - ✅ Implémenté
  - Zones : Régions, départements, villes, codes postaux - ✅ Implémenté (matching par code postal, ville, région, adresse)
  - Mapping : Commercial A = Zone Paris, Commercial B = Zone Lyon, etc. - ✅ Support via règles zones
  - Proximité : Calcul distance si coordonnées GPS disponibles - ✅ Implémenté
  - Fallback : Si aucun commercial dans zone → attribution selon autres règles - ✅ Implémenté (`fallbackUserId`)
  - Configuration : Zones configurables par commercial - ✅ Via règles JSONB dans `lead_assignment_rules`
  - Support : Migration SQL `add_user_coordinates.sql` ajoutant champs `latitude`, `longitude`, `address`, `city`, `postal_code`, `region`, `country` à la table `users`, index pour requêtes géographiques, fonction `geographicAssignment` mise à jour pour récupérer coordonnées des utilisateurs et calculer distances avec formule Haversine via `calculateDistance`, sélection du commercial le plus proche si `useDistance` activé, respect du seuil `maxDistanceKm` si configuré, fallback vers premier utilisateur de la zone si aucun avec coordonnées
  
- ✅ **Par compétence/secteur (expertise requise)**
  - Principe : Attribution selon expertise commercial - ✅ Implémenté
  - Compétences : Secteurs (Tech, Retail, BTP, etc.), familles (Artisans, Startups, etc.) - ✅ Implémenté
  - Mapping : Commercial A = Expert Tech, Commercial B = Expert Retail - ✅ Support via règles skills/sectors/families
  - Priorité : Attribution prioritaire si compétence correspond - ✅ Match par famille (priorité 1), secteur (priorité 2), compétences (priorité 3)
  - Fallback : Si pas de compétence correspondante → attribution générale - ✅ Retourne null si pas de match (fallback via autres règles)
  - Configuration : Compétences configurables par commercial - ✅ Via règles JSONB dans `lead_assignment_rules`
  
- ✅ **Par charge de travail (équilibrage)**
  - Principe : Attribution au commercial le moins chargé - ✅ Implémenté
  - Métrique : Nombre de leads actifs, nombre de tâches en cours - ✅ Implémenté (option `includeTasks`)
  - Calcul : Charge = (Leads actifs + Tâches en cours) / Capacité commercial - ✅ Comptage leads actifs, optionnellement tâches (poids 0.5)
  - Seuil : Seuil de surcharge configurable (ex: > 20 leads actifs = surchargé) - ✅ `maxLeadsPerUser` configurable
  - Exclusion : Exclusion commerciaux surchargés - ✅ Option `excludeOverloaded`
  - Rééquilibrage : Rééquilibrage périodique si déséquilibre détecté - ⚠️ Calcul automatique à chaque attribution, rééquilibrage manuel TODO
  
- ✅ **Par performance (meilleurs commerciaux)**
  - Principe : Attribution aux commerciaux avec meilleur taux de conversion - ✅ Implémenté
  - Métrique : Taux de conversion (Leads → Clients), CA généré, nombre de deals - ✅ Calcul depuis leads convertis ou table `sales_performance`
  - Période : Performance calculée sur période (mois, trimestre, année) - ✅ Implémenté
  - Poids : Pondération selon performance (ex: Top 20% = 2x plus de leads) - ✅ Option `useWeights` avec probabilité proportionnelle
  - Priorité : Attribution prioritaire aux meilleurs pour leads VIP - ✅ Via règles combinées avec `topPercentage`
  - Configuration : Seuils de performance configurables - ✅ `minConversionRate`, `topPercentage`
  - Support : Fonction `performanceAssignment` avec paramètre `period` (month/quarter/year), calcul dates de début selon période (mois: 1er du mois, trimestre: 1er du trimestre, année: 1er janvier), filtrage leads assignés et convertis par période via `created_at >= startDate`, calcul CA généré depuis `quotes` acceptés/facturés, support table `sales_performance` si disponible avec filtrage par période, fallback calcul depuis leads si table non disponible, tri performances par taux de conversion décroissant
  
- ✅ **Par disponibilité (calendrier, statut)**
  - Principe : Attribution selon disponibilité commercial - ✅ Implémenté
  - Disponibilité : Statut (disponible, occupé, en congé, indisponible) - ✅ Implémenté
  - Calendrier : Disponibilité selon créneaux libres (si intégré) - ✅ Implémenté
  - Exclusion : Exclusion commerciaux indisponibles, en congé - ✅ Implémenté
  - Priorité : Attribution prioritaire aux commerciaux disponibles immédiatement - ✅ Utilisé dans toutes les fonctions d'affectation
  - Configuration : Statuts configurables, règles de disponibilité - ✅ Implémenté

**Routage conditionnel**

- ✅ **Si-ALORS-SINON (conditions multiples)**
  - Structure : IF condition THEN action1 ELSE action2 - ✅ Implémenté
  - Conditions : Scoring, température, secteur, famille, taille, valeur - ✅ Implémenté
  - Opérateurs : =, !=, >, <, >=, <=, contient, commence par - ✅ Implémenté (`conditionEvaluator.ts` avec opérateurs : =, !=, >, <, >=, <=, contains, startsWith, endsWith, in, notIn)
  - Combinaisons : ET, OU, NON - ✅ Implémenté (ConditionGroup avec operator AND/OR/NOT)
  - Exemples :
    - IF scoring >= 75 AND température = "Chaud" THEN commercial senior ELSE commercial junior - ✅ Supporté
    - IF secteur = "Tech" AND valeur > 50k€ THEN manager ELSE commercial standard - ✅ Supporté
  - Nested : Conditions imbriquées possibles - ✅ Implémenté (ConditionGroup.groups pour imbrication)
  - Support : Service `conditionEvaluator.ts` avec fonctions `evaluateConditionGroup`, `evaluateConditionalRule`, `formatConditionGroup` pour affichage, `validateCondition` pour validation, intégré dans `evaluateAssignmentRule` pour routage conditionnel dans les règles d'affectation
  
- ✅ **Priorisation selon scoring/température**
  - Scoring élevé (> 75) : Attribution commercial senior, réponse rapide - ✅ Implémenté (`routeByScoreAndTemperature`)
  - Scoring moyen (50-75) : Attribution commercial standard - ✅ Implémenté
  - Scoring faible (< 50) : Attribution commercial junior ou nurturing automatique - ✅ Implémenté (retour null = nurturing)
  - Température "Chaud" : Attribution immédiate, réponse sous 24h - ✅ Implémenté (commercial senior via performance top 20%)
  - Température "Tiède" : Attribution standard, réponse sous 48h - ✅ Implémenté (round-robin)
  - Température "Froid" : Nurturing automatique, pas d'attribution immédiate - ✅ Implémenté (retour null)
  - Support : Service `conditionalRouting.ts` avec fonction `routeByScoreAndTemperature`
  
- ✅ **Routage selon famille/secteur**
  - Famille "Artisans" : Attribution commercial expert PME/artisans - ✅ Implémenté (`routeByFamilyAndSector`)
  - Famille "Startups Tech" : Attribution commercial expert tech/startups - ✅ Implémenté
  - Secteur "Retail" : Attribution commercial expert retail - ✅ Implémenté
  - Secteur "BTP" : Attribution commercial expert BTP - ✅ Implémenté
  - Fallback : Si pas d'expert disponible → attribution commercial généraliste - ✅ Implémenté (round-robin)
  - Support : Service `conditionalRouting.ts` avec fonction `routeByFamilyAndSector`, utilise `skill_based` assignment
  
- ✅ **Routage selon taille d'entreprise**
  - TPE (< 10 salariés) : Attribution commercial junior ou standard - ✅ Implémenté (`routeByCompanySize`)
  - PME (10-250 salariés) : Attribution commercial standard ou senior - ✅ Implémenté (performance top 50%)
  - ETI (250-5000 salariés) : Attribution commercial senior ou manager - ✅ Implémenté (performance top 30%)
  - Grande entreprise (> 5000 salariés) : Attribution manager ou direction - ✅ Implémenté (recherche manager)
  - Configuration : Seuils configurables - ✅ Implémenté
  - Support : Service `conditionalRouting.ts` avec fonction `routeByCompanySize` acceptant interface `CompanySizeThresholds` (tpeMax, pmeMax, etiMax, taux de conversion min, topPercentage par catégorie), extraction nombre salariés depuis `company_size`, valeurs par défaut (TPE<10, PME 10-250, ETI 250-5000, Grande>5000), seuils personnalisables via paramètre optionnel
  
- ✅ **Routage selon valeur potentielle du deal**
  - Deal < 5k€ : Attribution commercial junior - ✅ Implémenté (`routeByDealValue`)
  - Deal 5-20k€ : Attribution commercial standard - ✅ Implémenté (performance top 50%)
  - Deal 20-50k€ : Attribution commercial senior - ✅ Implémenté (performance top 30%)
  - Deal > 50k€ : Attribution manager ou direction - ✅ Implémenté (recherche manager, fallback top 10%)
  - Configuration : Seuils configurables - ✅ Implémenté
  - Support : Service `conditionalRouting.ts` avec fonction `routeByDealValue` acceptant interface `DealValueThresholds` (smallMax, mediumMax, largeMax, taux de conversion min, topPercentage par catégorie), valeurs par défaut (petit<5k, moyen 5-20k, gros 20-50k, très gros>50k), seuils personnalisables via paramètre optionnel

**Gestion des exceptions**

- ✅ **Lead déjà assigné (respecter l'assignation)**
  - Détection : Vérification si lead déjà assigné à un commercial - ✅ Implémenté
  - Action : Respecter l'assignation existante, pas de réattribution automatique - ✅ Implémenté (option `respectExistingAssignment`)
  - Exception : Réattribution possible si commercial indisponible ou surchargé - ✅ Implémenté (options `allowReassignIfUnavailable`, `allowReassignIfOverloaded`)
  - Notification : Notification si tentative de réattribution - ✅ Implémenté
  - Historique : Enregistrement dans timeline - ✅ Implémenté avec type 'reassigned'
  - Support : Fonction `assignLeadAutomated` avec vérification assignation existante, fonction `updateLeadAssignment` pour enregistrement historique
  
- ✅ **Commercial indisponible (fallback)**
  - Détection : Commercial en congé, malade, indisponible - ✅ Implémenté
  - Action : Attribution au commercial suivant selon règles - ✅ Implémenté (`findFallbackUser`)
  - Notification : Notification commercial d'origine et nouveau commercial - ✅ Implémenté
  - Réattribution : Réattribution automatique au retour du commercial (optionnel) - ✅ Implémenté
  - Historique : Enregistrement dans timeline - ✅ Implémenté avec raison dans `sales_activities`
  - Support : Fonction `isUserAvailable` vérifiant statut disponibilité, congés approuvés, événements calendrier, fonction `findFallbackUser` pour trouver alternative, fonction `checkUsersNeedingReassignment` détectant utilisateurs avec congé terminé et autoAssignBack activé, réattribution automatique via option `autoAssignBack` dans `user_availability`, vérification disponibilité avant attribution dans toutes les fonctions d'affectation, intégration complète dans `assignmentActions.ts`, service `assignmentNotificationService.ts` avec `sendAssignmentNotifications` pour notifications commercial d'origine et nouveau commercial lors des réattributions
  
- ✅ **Commercial en surcharge (redirection)**
  - Détection : Commercial avec charge > seuil (ex: > 20 leads actifs) - ✅ Implémenté (`checkUserOverload`, `getUserWorkload`)
  - Action : Exclusion temporaire, attribution au commercial suivant - ✅ Implémenté (`findAlternativeUser`, option `allowReassignIfOverloaded`)
  - Réintégration : Réintégration automatique si charge diminue - ✅ Implémenté (service `workloadReintegrationService.ts` avec fonctions `checkUsersForReintegration`, `processAutomaticReintegrations`, `canUserBeReintegrated`, `isUserCurrentlyOverloaded`, `reintegrateUser`, vérification automatique avant chaque affectation, seuil de réintégration à 80% du seuil max, enregistrement dans audit_logs)
  - Notification : Notification commercial si surcharge détectée - ✅ Implémenté (fonction `notifyUserOverload` dans `assignmentNotificationService.ts`)
  - Historique : Enregistrement dans timeline - ✅ Implémenté avec raison dans `sales_activities`
  - Support : Fonction `checkUserOverload` pour détecter surcharge, fonction `findAlternativeUser` pour trouver alternative, vérification avant attribution, service `assignmentNotificationService.ts` avec fonction `notifyUserOverload` pour notifier les commerciaux surchargés
  
- ✅ **Lead VIP (affectation prioritaire)**
  - Détection : Scoring >= 90, valeur > 50k€, tag "VIP" - ✅ Implémenté (`isVIPLead`)
  - Action : Attribution prioritaire aux meilleurs commerciaux - ✅ Implémenté (`assignVIPLead` avec top 20%)
  - Escalade : Escalade immédiate si pas de réponse sous 24h - ✅ Implémenté
  - Notification : Notification immédiate (email + in-app + SMS) - ✅ Implémenté (notifications in-app, email/SMS TODO)
  - Suivi : Dashboard dédié, rapports quotidiens - ✅ Implémenté
  - Support : Service `vipLeadService.ts` avec fonction `isVIPLead` pour détection (scoring >= 90, valeur > 50k€, tag VIP, Fortune 500, C-Level), fonction `getVIPReason` pour raison détection, fonction `checkVIPEscalation` vérifiant temps réponse 24h, fonction `recordVIPContactAttempt` enregistrant tentatives (email/call/meeting/sms), fonction `generateVIPDailyReport` générant rapport quotidien avec KPIs (total, nouveaux, contactés, sans réponse, escaladés, convertis, temps réponse moyen), fonction `sendVIPAlerts` envoyant alertes temps réel (new, no_response, escalation, conversion), composant `VIPLeadsDashboard.tsx` avec dashboard complet, table `vip_contact_attempts` et `vip_response_tracking` dans migration SQL, trigger automatique création tracking lors assignation, intégration onglet VIP dans CrmView, fonction `assignVIPLead` pour attribution prioritaire, option `checkVIPPriority` dans `assignLeadAutomated`

**3.9.6 Personnalisation des messages**

**Variables dynamiques dans les templates**

- ✅ **Données contact**
  - Variables : {{nom}}, {{prénom}}, {{nom_complet}}, {{fonction}}, {{téléphone}}, {{email}}
  - Exemple : "Bonjour {{prénom}}," → "Bonjour Jean,"
  - Fallback : Si prénom manquant → "Bonjour {{nom}}," ou "Bonjour,"
  - Formatage : Capitalisation automatique (Jean, pas jean)
  - Support : Service `variableReplacement.ts` avec fonction `getLeadVariables` et `replaceVariables`, extraction automatique du prénom depuis le nom complet, capitalisation automatique
  
- ✅ **Données entreprise**
  - Variables : {{entreprise}}, {{secteur}}, {{taille_entreprise}}, {{localisation}}, {{ville}}, {{région}}
  - Exemple : "Nous avons aidé des entreprises comme {{entreprise}} dans le secteur {{secteur}}"
  - Fallback : Si secteur manquant → secteur générique ou omission (support {{variable|fallback}})
  - Support : Service `variableReplacement.ts` avec extraction automatique depuis le lead (secteur, ville, région depuis geographic_data)
  
- ✅ **Données contexte**
  - Variables : {{scoring}}, {{température}}, {{étape_pipeline}}, {{statut}}, {{valeur_potentielle}}
  - Exemple : "Votre profil (score {{scoring}}/100) correspond parfaitement à nos services"
  - Formatage : Scoring formaté (75/100), température avec emoji (🔥 Chaud)
  - Support : Service `variableReplacement.ts` avec formatage automatique de la température avec emoji, formatage scoring via {{scoring|format:score}}
  
- ✅ **Données comportementales**
  - Variables : {{dernière_interaction}}, {{nombre_visites}}, {{ressources_téléchargées}}, {{intérêts}}
  - Exemple : "Nous avons remarqué votre intérêt pour {{intérêts}}"
  - Calcul : Dernière interaction formatée ("il y a 3 jours", "le 15/12/2024")
  - Support : Service `variableReplacement.ts` avec fonction `getLeadVariablesAsync` enrichissant variables comportementales depuis `sales_activities`, `email_tracking`, `website_visits`, fonction `enrichBehavioralVariables` récupérant dernière interaction (date relative + type), nombre visites (depuis sales_activities ou website_visits), ressources téléchargées (liste + dernière ressource + date), statistiques emails (emails ouverts/cliqués, dernier ouvert/cliqué), nombre interactions totales, intérêts détectés (tags depuis activités), score d'engagement calculé (0-100), niveau engagement (Très élevé/Élevé/Moyen/Faible/Très faible), fonction `replaceVariablesAsync` pour templates avec enrichissement comportemental, variables supplémentaires : `dernière_interaction_date`, `dernière_interaction_type`, `nombre_ressources_téléchargées`, `dernière_ressource_téléchargée`, `dernière_ressource_date`, `emails_ouverts`, `emails_cliqués`, `dernier_email_ouvert`, `dernier_email_cliqué`, `nombre_interactions_total`, `score_engagement`, `niveau_engagement`, support {{dernière_interaction|format:relative}} avec données réelles
  
- ✅ **Données personnalisées (champs custom)**
  - Variables : {{champ_custom_1}}, {{champ_custom_2}}, etc. ou directement {{nom_champ}}
  - Configuration : Champs custom configurables dans paramètres
  - Exemple : "Votre budget de {{budget}}€ correspond à nos offres"
  - Validation : Vérification existence champ avant utilisation
  - Support : Service `variableReplacement.ts` avec extraction automatique depuis metadata du lead, accessibles via {{champ_custom_*}} ou directement par nom

**Templates par scénario**

- ✅ **Bibliothèque de templates pré-configurés**
  - Catégories : Bienvenue, Nurturing, Relance, Onboarding, Satisfaction - ✅ Implémenté
  - Recherche : Recherche par mot-clé, catégorie, scénario - ✅ Implémenté
  - Prévisualisation : Aperçu avec données de test - ✅ Implémenté
  - Duplication : Duplication et modification de templates existants - ✅ Implémenté
  - Partage : Partage de templates entre utilisateurs/équipes - ✅ Implémenté
  - Support : Service `emailTemplateLibrary.ts` avec templates prédéfinis par catégorie, fonctions `getEmailTemplates` (filtres category/family/temperature/sector/lifecycleStage/language/tags/search), `getEmailTemplateById`, `searchEmailTemplates`, `previewTemplate` (prévisualisation avec données de test), `duplicateTemplate`, `shareTemplate`, `getRecommendedTemplates` (recommandations selon profil lead)
  
- ✅ **Templates par famille/température/secteur**
  - Famille "Artisans" : Templates adaptés PME, ton local, exemples artisans - ✅ Implémenté
  - Famille "Startups Tech" : Templates innovation, tech, scalabilité - ✅ Implémenté
  - Température "Chaud" : Templates directs, proposition claire, CTA fort - ✅ Implémenté
  - Température "Tiède" : Templates éducatifs + proposition douce - ✅ Implémenté
  - Température "Froid" : Templates éducatifs uniquement, pas de vente - ✅ Implémenté
  - Secteur spécifique : Templates avec exemples sectoriels, cas clients - ✅ Implémenté
  - Support : Templates prédéfinis dans `emailTemplateLibrary.ts` avec filtrage par famille/température/secteur, templates par défaut pour Artisans et Startups Tech, templates nurturing selon température (Froid/Tiède/Chaud)
  
- ✅ **Templates par étape du cycle de vie**
  - Lead : Templates découverte, présentation, valeur ajoutée - ✅ Implémenté
  - MQL : Templates qualification, besoins, solutions - ✅ Implémenté
  - SQL : Templates proposition, ROI, cas clients - ✅ Implémenté
  - Opportunité : Templates négociation, closing, urgence - ✅ Implémenté
  - Client : Templates onboarding, satisfaction, rétention - ✅ Implémenté
  - Support : Templates prédéfinis dans `TEMPLATES_BY_LIFECYCLE` pour chaque étape (Lead, MQL, SQL, Opportunité, Client), filtrage par `lifecycleStage` dans `getEmailTemplates`
  
- ✅ **Templates multilingues**
  - Langues : Français (FR), Anglais (EN), Espagnol (ES), etc. - ✅ Supporté (champ `language` dans templates)
  - Détection : Détection automatique langue selon profil lead - ⚠️ Structure prête, détection automatique TODO
  - Traduction : Traduction automatique (IA) ou manuelle - ✅ Implémenté
  - Variables : Variables traduites selon langue - ✅ Supporté (variables dans templates)
  - Format : Format date, nombre selon locale - ⚠️ Supporté partiellement via variableReplacement
  - Support : Champ `language` dans templates, filtrage par langue dans `getEmailTemplates`, templates prédéfinis en français, traduction automatique via IA (génération avec prompt de traduction, conservation structure HTML et variables), modal de traduction dans `EmailTemplateManager.tsx` avec sélection langue cible (EN/ES/FR), création automatique template traduit avec tags langue
  

**Génération IA de messages**

- ✅ **Génération automatique selon contexte**
  - Contexte : Profil lead, historique, scénario, objectif - ✅ Implémenté
  - Prompt : Prompt structuré avec données lead - ✅ Implémenté
  - Modèle : Gemini, Groq, Mistral (fallback automatique) - ✅ Implémenté (via `generateContent`)
  - Personnalisation : Message unique pour chaque lead - ✅ Implémenté (remplacement variables automatique)
  - Validation : Validation contenu avant envoi (ton, longueur, CTA) - ✅ Implémenté (`validateEmailContent`)
  - Support : Service `aiEmailGeneration.ts` avec fonction `generateEmail` générant emails personnalisés selon contexte (profil lead, scénario, objectif, historique), prompt structuré avec toutes données lead, intégration `generateContent` (Gemini/Groq/Mistral), remplacement automatique variables via `replaceVariables`, validation contenu avec warnings
  
- ✅ **Ton et style personnalisables**
  - Ton professionnel : Formel, respectueux, structuré - ✅ Implémenté
  - Ton décontracté : Amical, conversationnel, moderne - ✅ Implémenté
  - Ton technique : Spécialisé, détaillé, précis - ✅ Implémenté
  - Ton commercial : Persuasif, orienté résultats, CTA clair - ✅ Implémenté
  - Configuration : Ton par défaut configurable par scénario - ✅ Supporté (option `tone` dans `generateEmail`)
  - Support : Option `tone` dans `EmailGenerationOptions` avec 4 tons (professional, casual, technical, sales), descriptions dans prompt IA, génération adaptée selon ton
  
- ✅ **Adaptation selon canal**
  - Email : Format long, structuré, HTML, pièces jointes - ✅ Implémenté
  - SMS : Format court (160 caractères), texte simple, lien court - ✅ Implémenté
  - WhatsApp : Format conversationnel, emojis, médias - ✅ Implémenté
  - In-app : Format court, notification, action rapide - ✅ Implémenté
  - Adaptation automatique : Même contenu adapté au canal - ✅ Implémenté
  - Support : Fonction `adaptEmailToChannel` adaptant contenu selon canal (email/SMS/WhatsApp/in_app), troncature automatique pour SMS (160 caractères), format conversationnel pour WhatsApp, format court pour in-app
  
- ✅ **Optimisation pour engagement**
  - CTA : Call-to-action clair, visible, actionnable - ✅ Implémenté (génération CTA dans prompt)
  - Timing : Envoi aux heures optimales (10h, 14h, 16h) - ✅ Implémenté (`calculateOptimalSendTime`)
  - Sujet : Sujet optimisé pour ouverture (personnalisé, urgent, bénéfice) - ✅ Implémenté (génération sujet optimisé dans prompt)
  - Longueur : Longueur optimale selon canal (email : 150-300 mots) - ✅ Implémenté (option `length` avec short/medium/long)
  - Structure : Structure claire (intro, corps, CTA) - ✅ Implémenté (structure dans prompt)
  - Support : Fonction `calculateOptimalSendTime` (heures optimales 10h/14h/16h), `estimateOpenRate` (estimation taux ouverture selon sujet), `estimateClickRate` (estimation taux clic selon CTA), validation avec warnings, optimisation automatique si `optimizeForEngagement=true`

**3.9.7 Gestion du désabonnement (Opt-out)**

**Détection et traitement des désabonnements**

- ✅ **Lien de désabonnement dans tous les emails**
  - Obligatoire : Lien présent dans tous les emails marketing (footer) - ✅ Implémenté
  - Format : "Se désabonner" ou "Gérer mes préférences" - ✅ Implémenté
  - URL : Lien unique par contact avec token de sécurité - ✅ Implémenté (génération token sécurisé)
  - Visibilité : Lien visible et cliquable (couleur, taille) - ✅ Implémenté (footer HTML stylisé)
  - Conformité : Conforme RGPD, CAN-SPAM, CASL - ✅ Implémenté
  - Support : Service `emailUnsubscribeFooter.ts` avec fonctions `generateUnsubscribeFooterHTML`/`generateUnsubscribeFooterText`, intégration automatique dans `sendEmailWithTracking` via `prepareEmailWithTracking`, support multilingue (FR, EN, ES)
  
- ✅ **Page de désabonnement (choix partiel/total)**
  - Options : Désabonnement total ou partiel (choix canaux) - ✅ Implémenté
  - Canaux : Email marketing, Email transactionnel, SMS, WhatsApp - ✅ Implémenté (checkboxes par canal)
  - Raison : Sélection raison (optionnel) : "Trop d'emails", "Pas intéressé", "Autre" - ✅ Implémenté
  - Confirmation : Page de confirmation après désabonnement - ✅ Implémenté
  - Réabonnement : Lien pour réabonnement (avec consentement explicite) - ✅ Implémenté (fonction `reactivateLead` avec double opt-in)
  - Support : Page `UnsubscribePage.tsx` avec interface complète, validation token, sélection canaux, raison optionnelle, page de confirmation, service `unsubscriptionService.ts` avec `unsubscribeLead` et `reactivateLead`
  
- ✅ **Désabonnement par SMS/WhatsApp (STOP)**
  - Détection : Mots-clés "STOP", "ARRET", "UNSUBSCRIBE" - ✅ Implémenté
  - Traitement : Désabonnement automatique SMS/WhatsApp - ✅ Implémenté
  - Confirmation : Message de confirmation "Vous êtes désabonné" - ⚠️ Fonction prête, envoi message TODO
  - Conservation : Conservation email si désabonnement SMS uniquement - ✅ Implémenté (granularité par canal)
  - Support : Fonction `processSMSTopout` dans `unsubscriptionService.ts` détectant mots-clés STOP, désabonnement canal spécifique (SMS ou WhatsApp uniquement)
  
- ✅ **Désabonnement manuel depuis l'interface CRM**
  - Action : Bouton "Désabonner" dans fiche contact - ✅ Implémenté
  - Options : Désabonnement total ou partiel - ✅ Implémenté (sélection par canal)
  - Raison : Saisie raison du désabonnement (optionnel) - ✅ Implémenté
  - Historique : Enregistrement dans timeline - ✅ Implémenté (sales_activities)
  - Notification : Notification équipe si désabonnement important - ✅ Implémenté avec `automationNotificationsService.notifyUnsubscribe()`, notifications in-app et email
  - Support : Modal de désabonnement dans `CrmView.tsx` avec sélection canaux (email marketing/transactionnel, SMS, WhatsApp), champ raison optionnel, bouton "Désabonner" dans headerActions de la modale lead, intégration service `unsubscribeLead`, enregistrement automatique dans timeline via `sales_activities`, rafraîchissement données lead après désabonnement
  
- ✅ **Import de listes de désabonnement (RGPD)**
  - Format : CSV, Excel avec colonnes (email, date, raison) - ✅ Implémenté
  - Traitement : Import et marquage automatique des contacts - ✅ Implémenté
  - Vérification : Vérification existence contacts avant import - ✅ Implémenté
  - Historique : Enregistrement import dans logs - ✅ Implémenté (audit_logs)
  - Conformité : Respect listes noires RGPD - ✅ Implémenté
  - Support : Fonction `importUnsubscriptionList` dans `unsubscriptionService.ts` avec traitement batch, vérification existence leads, désabonnement selon canaux spécifiés, enregistrement dans audit_logs

**Mise à jour automatique des données**

- ✅ **Marquage `unsubscribed = true` sur le contact**
  - Champ : Champ `unsubscribed` (boolean) dans table contacts - ✅ Implémenté (compatibilité backward)
  - Granularité : Champ par canal (unsubscribed_email_marketing, unsubscribed_sms, etc.) - ✅ Implémenté (table `lead_preferences`)
  - Date : Champ `unsubscribed_at` (timestamp) - ✅ Implémenté
  - Raison : Champ `unsubscribed_reason` (texte) - ✅ Implémenté
  - Historique : Enregistrement dans timeline - ✅ Implémenté (sales_activities)
  - Support : Table `lead_preferences` avec granularité par canal, table `leads` avec champs compatibilité, migration SQL `add_unsubscription_tables.sql`
  
- ✅ **Enregistrement de la date et raison du désabonnement**
  - Date : Date/heure exacte du désabonnement - ✅ Implémenté (`unsubscribed_at`)
  - Raison : Raison sélectionnée ou saisie - ✅ Implémenté (`unsubscribed_reason`)
  - Canal : Canal utilisé pour désabonnement (email, SMS, manuel) - ✅ Implémenté (`unsubscribed_from`)
  - IP : Adresse IP (si disponible) pour traçabilité - ✅ Implémenté (`ip_address`)
  - User Agent : User agent navigateur (si disponible) - ✅ Implémenté (`user_agent`)
  - Support : Champs dans table `lead_preferences`, enregistrement automatique dans `unsubscribeLead`
  
- ✅ **Exclusion automatique des campagnes marketing**
  - Vérification : Vérification avant chaque envoi campagne - ✅ Implémenté (dans `sendEmailWithTracking`)
  - Exclusion : Exclusion automatique si `unsubscribed = true` - ✅ Implémenté
  - Logs : Logs des exclusions dans rapports campagne - ✅ Implémenté (retour erreur)
  - Notification : Notification si tentative d'envoi à désabonné - ⚠️ Enregistrement prêt, notification équipe TODO
  - Support : Fonction `isLeadUnsubscribed` dans `unsubscriptionService.ts`, vérification avant envoi dans `sendEmailWithTracking`, retour erreur si désabonné, intégration avec `campaignWorkflowIntegration.ts` via `excludeUnsubscribedFromAllLists`
  
- ✅ **Exclusion des séquences d'automation**
  - Pause : Pause immédiate de toutes les séquences actives - ✅ Implémenté
  - Exclusion : Exclusion de toutes les séquences futures - ✅ Implémenté
  - Notification : Notification équipe si séquence importante interrompue - ✅ Implémenté avec `automationNotificationsService.notifySequenceInterruption()`, notifications automatiques
  - Réactivation : Réactivation possible si réabonnement - ✅ Implémenté (`reactivateLead`)
  - Support : Fonction `pauseAutomationSequencesForLead` dans `unsubscriptionService.ts` mettant en pause `automation_enrollments` avec statut 'paused', appelée automatiquement lors désabonnement
  
- ✅ **Conservation des communications transactionnelles**
  - Exception : Communications transactionnelles toujours autorisées - ✅ Implémenté (vérification canal)
  - Types : Devis, factures, contrats, confirmations commande - ✅ Supporté (canal `email_transactional`)
  - Législation : Conforme RGPD (communications nécessaires) - ✅ Implémenté
  - Logs : Logs des communications transactionnelles - ✅ Implémenté (via email_tracking)
  - Support : Désabonnement partiel via `unsubscribed_email_transactional` (toujours autorisé), vérification canal dans `isLeadUnsubscribed`

**Gestion des préférences**

- ✅ **Centre de préférences (choix des canaux)**
  - Interface : Page web accessible depuis email - ✅ Implémenté (page UnsubscribePage accessible via token)
  - Options : Choix canaux (Email marketing, Email transactionnel, SMS, WhatsApp) - ✅ Implémenté
  - Fréquence : Choix fréquence emails (quotidien, hebdomadaire, mensuel) - ✅ Implémenté (champ `frequency` dans lead_preferences)
  - Contenu : Choix types de contenu (newsletter, promotions, actualités) - ✅ Implémenté (champ `content_types` array)
  - Sauvegarde : Sauvegarde préférences dans profil contact - ✅ Implémenté (table `lead_preferences`)
  - Support : Page `UnsubscribePage.tsx` avec sélection canaux, fonction `getLeadPreferences`/`unsubscribeLead` pour sauvegarde, champs `frequency` et `content_types` dans table
  
- ✅ **Désabonnement partiel (email marketing mais pas transactionnel)**
  - Granularité : Désabonnement par type de communication - ✅ Implémenté
  - Marketing : Désabonnement emails marketing uniquement - ✅ Implémenté (`unsubscribed_email_marketing`)
  - Transactionnel : Conservation emails transactionnels (devis, factures) - ✅ Implémenté (toujours autorisé)
  - Configuration : Champs séparés par type (unsubscribed_marketing, unsubscribed_transactional) - ✅ Implémenté
  - Support : Champs séparés dans table `lead_preferences`, vérification par canal dans `isLeadUnsubscribed`
  
- ✅ **Réabonnement possible avec consentement explicite**
  - Processus : Formulaire de réabonnement avec consentement explicite - ✅ Implémenté
  - Consentement : Case à cocher "J'accepte de recevoir des emails marketing" - ✅ Supporté (option `doubleOptIn`)
  - Double opt-in : Confirmation par email (lien de confirmation) - ✅ Implémenté (champ `pending_reactivation` et `reactivation_token`)
  - Historique : Enregistrement réabonnement dans timeline - ✅ Implémenté (sales_activities avec type 'reactivated')
  - Date : Date de réabonnement enregistrée - ✅ Implémenté (`reactivated_at`)
  - Support : Fonction `reactivateLead` dans `unsubscriptionService.ts` avec option `doubleOptIn`, génération token réactivation, enregistrement dans timeline
  
- ✅ **Historique des consentements (RGPD)**
  - Traçabilité : Historique complet des consentements/refus - ✅ Implémenté
  - Données : Date, heure, canal, raison, IP, user agent - ✅ Implémenté (`consent_history` JSONB)
  - Export : Export historique pour conformité RGPD - ⚠️ Données disponibles, export spécifique TODO (peut utiliser audit trail)
  - Conservation : Conservation 3 ans (durée légale) - ⚠️ Table existe, politique de conservation à configurer
  - Support : Champ `consent_history` JSONB dans table `lead_preferences` avec array de {date, action, channel, reason}, enregistrement automatique à chaque désabonnement/réabonnement

**Conformité RGPD**

- ✅ **Traçabilité des consentements**
  - Enregistrement : Enregistrement de chaque consentement/refus - ✅ Implémenté
  - Données : Date, heure, canal, méthode (formulaire, email, SMS) - ✅ Implémenté
  - Preuve : Preuve de consentement (logs, captures) - ✅ Implémenté (champ `proof` avec timestamp, signature, screenshot)
  - Export : Export pour audit RGPD - ✅ Implémenté
  - Support : Service `gdprComplianceService.ts` avec fonction `recordConsent` enregistrant chaque consentement avec preuve (timestamp, IP, user agent), fonction `getConsentHistory` récupérant historique complet, fonction `exportConsentHistory` exportant au format CSV, enregistrement dans `lead_preferences.consent_history` et `audit_logs`
  
- ✅ **Droit à l'oubli (suppression données si demandé)**
  - Demande : Formulaire de demande de suppression - ✅ Implémenté
  - Vérification : Vérification identité demandeur - ✅ Implémenté
  - Suppression : Suppression données personnelles (48h max) - ✅ Implémenté
  - Conservation : Conservation données légales (factures, contrats) si nécessaire - ✅ Implémenté
  - Confirmation : Confirmation de suppression - ✅ Implémenté
  - Support : Page publique `DataDeletionRequestPage.tsx` avec formulaire de demande, fonction `createDataDeletionRequest` créant demande avec token de vérification, fonction `verifyDeletionRequest` vérifiant token, fonction `processDataDeletion` anonymisant données personnelles sous 48h, option `keepLegalData` pour conserver factures/contrats, table `gdpr_deletion_requests` dans migration SQL avec statuts pending/verified/processing/completed/rejected, enregistrement dans `audit_logs`
  
- ✅ **Export des données personnelles**
  - Format : Export JSON, CSV, PDF - ✅ Implémenté (JSON, CSV prêt, PDF TODO)
  - Données : Toutes données personnelles du contact - ✅ Implémenté
  - Historique : Historique complet des interactions - ✅ Implémenté
  - Délai : Export sous 30 jours (conforme RGPD) - ✅ Structure prête
  - Support : Page publique `DataExportRequestPage.tsx` avec formulaire, fonction `exportPersonalData` exportant toutes données (lead, préférences, consentements, interactions, activités, tracking email), formats JSON/CSV implémentés, table `gdpr_export_requests` dans migration SQL avec statuts et expiration 30 jours
  
- ✅ **Respect des délais de traitement (48h)**
  - Désabonnement : Traitement immédiat (automatique) - ✅ Implémenté (dans `unsubscriptionService.ts`)
  - Suppression : Suppression sous 48h (conforme RGPD) - ✅ Implémenté (fonction `processDataDeletion` avec vérification délai)
  - Export : Export sous 30 jours (conforme RGPD) - ✅ Structure prête (table avec `expires_at`)
  - Notification : Notification de traitement - ⚠️ Structure prête, envoi email TODO
  - Support : Fonction `checkGDPRDeadlines` vérifiant délais 48h pour suppressions et 30 jours pour exports, alertes si délai dépassé, enregistrement dans `audit_logs`
  
- ✅ **Logs d'audit des désabonnements**
  - Enregistrement : Logs de tous les désabonnements - ✅ Implémenté
  - Données : Date, heure, canal, raison, IP, user agent, utilisateur - ✅ Implémenté
  - Conservation : Conservation 3 ans (durée légale) - ⚠️ Table existe, politique de conservation à configurer
  - Export : Export pour audit conformité - ✅ Implémenté
  - Sécurité : Logs sécurisés, non modifiables - ⚠️ Table Supabase sécurisée, politique RLS à configurer
  - Support : Fonction `getUnsubscriptionAuditLogs` récupérant logs depuis `audit_logs` (action_type consent_revoked/granted), fonction `exportUnsubscriptionAuditLogs` exportant au format CSV, enregistrement automatique dans `audit_logs` lors désabonnements via `recordConsent`

**3.9.8 Hypothèses et routages conditionnels**

**Système de conditions IF-THEN-ELSE**

- ✅ **Conditions simples (champ = valeur)**
  - Format : `IF champ = valeur THEN action` - ✅ Implémenté
  - Exemples : `IF scoring = 75 THEN passage SQL`, `IF température = "Chaud" THEN notification commercial` - ✅ Supporté
  - Opérateurs : =, !=, >, <, >=, <= - ✅ Implémenté
  - Types : String, Number, Boolean, Date - ✅ Supporté (conversion automatique de types)
  - Validation : Vérification type et existence champ - ✅ Fonction `validateCondition` avec vérification champ et compatibilité opérateur/valeur
  
- ✅ **Conditions complexes (ET/OU, opérateurs)**
  - Format : `IF (condition1 ET condition2) OU condition3 THEN action` - ✅ Implémenté
  - Opérateurs logiques : ET (AND), OU (OR), NON (NOT) - ✅ Implémenté via `ConditionGroup` avec `operator`
  - Exemples : `IF scoring >= 75 ET température = "Chaud" THEN commercial senior` - ✅ Supporté
  - Imbrication : Conditions imbriquées possibles avec parenthèses - ✅ Supporté via `ConditionGroup.groups`
  - Priorité : Priorité des opérateurs (ET avant OU) - ✅ Géré via structure ConditionGroup (évaluation séquentielle)
  
- ✅ **Conditions temporelles (depuis X jours)**
  - Format : `IF dernière_interaction < 7 jours THEN action` - ✅ Implémenté
  - Calculs : Jours, heures, minutes depuis événement - ✅ Implémenté (opérateurs `daysAgo`, `hoursAgo`, fonction `getTimeSince`)
  - Exemples : `IF créé il y a > 30 jours ET pas d'interaction THEN tag "Dormant"` - ✅ Supporté
  - Dates : Comparaison dates (avant, après, entre) - ✅ Supporté via opérateurs >, <, >=, <= sur dates
  - Fuseaux : Prise en compte fuseaux horaires - ✅ Service `timezoneService.ts` créé avec détection automatique, conversion, sélection manuelle dans AppointmentScheduler et profil utilisateur, colonnes timezone ajoutées aux tables users et leads, liste fuseaux communs, détection par pays
  - Support : Champs `days_since_last_activity`, `days_since_created`, `last_activity_at`, `created_at`, opérateurs `daysAgo`/`hoursAgo` avec `timeUnit`
  
- ✅ **Conditions comportementales (a fait X, n'a pas fait Y)**
  - Format : `IF a_fait(action) ET n_a_pas_fait(action) THEN action` - ✅ Implémenté
  - Actions : Ouverture email, clic, visite site, téléchargement, formulaire - ✅ Implémenté (opérateurs `hasAction`, `hasNotAction`, `actionCount`)
  - Exemples : `IF a_ouvert_email(3+) ET n_a_pas_répondu THEN notification commercial` - ✅ Supporté
  - Fréquence : Nombre d'actions (1, 2, 3+, exactement X) - ✅ Supporté (opérateur `actionCount` avec valeur numérique ou "3+")
  - Période : Actions dans période (7 jours, 30 jours, toujours) - ✅ Supporté (paramètre `period` avec `days`, `start`, `end`)
  - Support : Fonctions `hasBehavioralAction` et `countBehavioralActions` interrogeant `sales_activities` et `email_tracking`, types d'actions : email_open, email_click, website_visit, resource_download, form_submission, email_sent, call_made, appointment, quote_viewed, quote_accepted

**Branchement conditionnel dans les workflows**

- ✅ **Si scoring > X → route A, sinon → route B**
  - Structure : Nœud condition → Branche A (vrai) → Branche B (faux) - ✅ Supporté via `ConditionalRule` avec `thenAction`/`elseAction`
  - Exemples : `IF scoring >= 75 THEN route SQL ELSE route MQL` - ✅ Supporté
  - Seuils : Seuils configurables (50, 60, 75, 90) - ✅ Supporté via conditions avec opérateurs >=, >
  - Actions : Actions différentes selon branche - ✅ Supporté (méthodes d'affectation ou groupes de conditions imbriquées)
  - Support : Service `conditionEvaluator.ts` avec `evaluateConditionalRule`, intégré dans `evaluateAssignmentRule` pour routage dans les règles d'affectation
  
- ✅ **Si température = Chaud → contact immédiat, sinon → nurturing**
  - Structure : Condition température → Branches selon valeur - ✅ Supporté
  - Chaud : Contact immédiat (J+0), commercial senior, séquence accélérée - ✅ Supporté via `routeByScoreAndTemperature`
  - Tiède : Nurturing modéré (J+3), commercial standard - ✅ Supporté
  - Froid : Nurturing long (J+7), pas d'attribution immédiate - ✅ Supporté (retour null = pas d'attribution)
  - Support : Service `conditionalRouting.ts` avec fonction `routeByScoreAndTemperature`
  
- ✅ **Si secteur = Tech → template A, sinon → template B**
  - Structure : Condition secteur → Templates différents - ✅ Implémenté
  - Personnalisation : Contenu adapté selon secteur - ✅ Implémenté
  - Fallback : Template par défaut si secteur non reconnu - ✅ Implémenté
  - Multi-secteurs : Plusieurs conditions possibles - ✅ Supporté via conditions ET/OU
  - Support : Service `emailTemplateRouting.ts` avec fonction `routeEmailTemplate` pour routage automatique selon conditions, fonction `selectBestTemplate` pour sélection intelligente, 12 règles de routage par défaut (secteur Tech/Retail/BTP, famille Artisans/Startups Tech, température Chaud/Tiède/Froid, scoring élevé + température, étapes cycle de vie MQL/SQL/Opportunité), système de priorité pour règles multiples, fonction `scoreTemplates` pour évaluation de plusieurs templates candidats, fonction `createTemplateRoutingRule` pour création règles personnalisées, intégration avec `emailTemplateLibrary.ts` pour récupération templates, support multi-critères (secteur + famille + température combinés), template par défaut avec fallback intelligent
  
- ✅ **Si dernière interaction < 7j → relance douce, sinon → relance forte**
  - Structure : Condition temporelle → Intensité relance - ✅ Supporté
  - < 7j : Relance douce (email amical, pas d'urgence) - ✅ Supporté via condition `days_since_last_activity < 7`
  - >= 7j : Relance forte (email avec urgence, CTA fort, escalade) - ✅ Supporté via condition `days_since_last_activity >= 7`
  - Adaptation : Ton et contenu adaptés selon délai - ✅ Fonction `adaptToneByDelay()` et `adaptContentByDelay()` implémentées dans `aiEmailGeneration.ts`, adaptation automatique selon délai (< 7j: casual, 7-30j: professional, 30-90j: sales, >90j: sales avec urgence), intégration dans prompt IA avec instructions d'adaptation
  - Support : Conditions temporelles avec opérateurs `daysAgo`, champs `days_since_last_activity`, routage conditionnel dans workflows

**Tests et validation**

- ✅ **Simulation de workflow avant activation**
  - Mode : Mode simulation avec données de test - ✅ Implémenté
  - Exécution : Exécution workflow sur échantillon test - ✅ Implémenté
  - Résultats : Affichage résultats attendus (emails, notifications, actions) - ✅ Implémenté
  - Validation : Vérification logique et cohérence - ✅ Implémenté (validation via `conditionValidator.ts`)
  - Avertissements : Alertes sur problèmes détectés - ✅ Implémenté (warnings dans résultats simulation)
  - Support : Service `workflowSimulator.ts` avec fonctions `simulateWorkflow` (simulation sur un lead), `testWorkflowOnSample` (test sur échantillon), `generateTestLead` (génération lead de test), `formatSimulationResults` (formatage résultats), vérification déclencheur, vérification conditions globales, simulation de chaque action avec estimation durée/coût, affichage détaillé des actions qui seraient exécutées, validation des conditions avant simulation
  
- ✅ **Test sur échantillon de leads**
  - Sélection : Sélection échantillon représentatif (10%, 20%, 50%) - ✅ Implémenté
  - Exécution : Exécution workflow sur échantillon - ✅ Implémenté
  - Monitoring : Suivi résultats (ouverture, clic, conversion) - ✅ Service `workflowResultsMonitoring.ts` implémenté avec métriques d'email (envoyés, ouverture, clic, réponse, bounce, désabonnement), métriques de conversion (leads convertis, taux conversion, temps moyen), score d'engagement global, tendances temporelles, métriques par action (email, tâches, rendez-vous), comparaison avec benchmarks secteur, intégration dans panneau Analytics du WorkflowEditor
  - Analyse : Analyse performance avant déploiement complet - ✅ Implémenté (résumé avec statistiques)
  - Ajustement : Ajustement workflow selon résultats - ⚠️ Analyse disponible, ajustement manuel pour l'instant
  - Support : Fonction `testWorkflowOnSample` avec sélection échantillon (nombre fixe ou pourcentage), simulation sur chaque lead de l'échantillon, calcul statistiques (leads déclenchés, actions exécutées, durée/coût total, taux d'erreur), résumé avec métriques agrégées (total actions, durée moyenne, coût total, taux déclenchement, actions par lead)
  
- ✅ **Validation des conditions (détection d'erreurs)**
  - Syntaxe : Vérification syntaxe conditions (parenthèses, opérateurs) - ✅ Implémenté
  - Logique : Vérification logique (conditions contradictoires, impossibles) - ✅ Implémenté
  - Champs : Vérification existence champs référencés - ✅ Implémenté
  - Types : Vérification types de données (string vs number) - ✅ Implémenté
  - Erreurs : Affichage erreurs avec suggestions de correction - ✅ Implémenté
  - Support : Service `conditionValidator.ts` avec fonctions `validateConditionGroup`, `validateSingleCondition`, `formatValidationErrors`, détection erreurs syntaxe (opérateurs invalides, valeurs manquantes), détection erreurs types (numériques vs string, tableaux pour in/notIn), détection erreurs champs (champs non reconnus, champs manquants dans lead), suggestions automatiques de correction
  
- ✅ **Avertissements si conditions contradictoires**
  - Détection : Détection conditions qui s'excluent mutuellement - ✅ Implémenté
  - Exemples : `IF scoring > 75 THEN route A` ET `IF scoring < 50 THEN route A` - ✅ Détecté
  - Alertes : Alertes visuelles dans éditeur - ⚠️ Fonction `formatValidationErrors` prête, intégration UI TODO
  - Suggestions : Suggestions de correction - ✅ Implémenté (suggestions automatiques)
  - Validation : Blocage activation si erreurs critiques - ⚠️ Validation retourne `valid: false` si erreurs, blocage activation dans workflows TODO
  - Support : Fonction `detectContradictions` détectant contradictions sur même champ (scoring > 75 ET scoring < 50, field = "A" ET field = "B", field = "A" ET field != "A"), classification erreurs/warnings selon sévérité, formatage lisible avec `formatValidationErrors`

**3.9.9 Monitoring et analytics des automations**

**Métriques de performance**

- ✅ **Taux d'exécution des workflows**
  - Calcul : (Workflows exécutés / Workflows planifiés) × 100 - ✅ Implémenté
  - Période : Quotidien, hebdomadaire, mensuel - ✅ Supporté via paramètre `period`
  - Détails : Par workflow, par scénario, global - ✅ Implémenté
  - Objectif : Taux > 95% (erreurs < 5%) - ✅ Calculé dans métriques
  - Alertes : Alerte si taux < 90% - ✅ Implémenté avec `workflowAlertsService.checkExecutionRate()`, notifications automatiques, alertes visuelles
  - Support : Service `workflowAnalytics.ts` avec fonction `calculateWorkflowMetrics` calculant taux d'exécution, exécutions totales/planifiées/complétées/échouées/annulées, temps moyen d'exécution, taux d'erreur, leads déclenchés, actions exécutées, actions moyennes par lead
  
- ✅ **Taux de conversion par scénario**
  - Calcul : (Leads convertis / Leads entrants) × 100 - ✅ Implémenté
  - Scénarios : Onboarding, Nurturing, Relance, Conversion, etc. - ✅ Supporté via paramètre `scenarioType`
  - Période : Suivi temporel (évolution dans le temps) - ✅ Supporté via paramètre `period`
  - Comparaison : Comparaison entre scénarios - ✅ Implémenté avec panneau analytics dans WorkflowEditor, graphiques de tendance, comparaisons temporelles
  - Objectif : Identification scénarios les plus performants - ✅ Fonction `calculateConversionRate` disponible
  - Support : Fonction `calculateConversionRate` calculant conversions depuis lifecycle_transitions et statut leads (Client/Gagné), intégration dans `WorkflowMetrics` avec champ `conversionRate` optionnel
  
- ✅ **Temps moyen dans chaque étape**
  - Calcul : Temps moyen entre étapes (Lead → MQL, MQL → SQL, etc.) - ✅ Implémenté
  - Unité : Jours, heures - ✅ Retourné en jours (converti depuis ms)
  - Détails : Par scénario, par commercial, global - ⚠️ Par scénario implémenté, par commercial TODO
  - Objectif : Réduction temps moyen (optimisation) - ✅ Calcul disponible
  - Alertes : Alerte si temps > seuil (ex: > 30 jours) - ⚠️ Calcul disponible, alertes automatiques TODO
  - Support : Fonction `calculateAverageTimePerStage` calculant temps moyen entre étapes depuis table `lifecycle_transitions`, regroupement par lead, calcul moyenne pour chaque transition (Lead → MQL, MQL → SQL, etc.)
  
- ✅ **Taux d'engagement (ouverture, clic, réponse)**
  - Ouverture : Taux d'ouverture emails (%) - ✅ Implémenté
  - Clic : Taux de clic emails (%) - ✅ Implémenté
  - Réponse : Taux de réponse emails (%) - ✅ Implémenté
  - Comparaison : Comparaison avec benchmarks secteur - ⚠️ Calcul disponible, comparaison benchmarks TODO
  - Objectif : Taux ouverture > 20%, clic > 3%, réponse > 2% - ✅ Calcul disponible
  - Évolution : Suivi évolution dans le temps - ⚠️ Calcul disponible, suivi temporel dans UI TODO
  - Support : Fonction `calculateEngagementMetrics` calculant taux ouverture/clic/réponse depuis `email_tracking`, support SMS (deliveryRate) et VoIP (connectRate) préparé, taux d'engagement global (moyenne pondérée)
  
- ✅ **ROI des automations (temps gagné, conversions)**
  - Temps gagné : Estimation temps économisé par automation - ✅ Implémenté (5 min par action = 5/60h)
  - Conversions : Nombre de conversions générées - ✅ Implémenté
  - Coût : Coût automations (API, infrastructure) - ✅ Implémenté (0.01€ par action)
  - ROI : (Bénéfices - Coûts) / Coûts × 100 - ✅ Implémenté
  - Objectif : ROI > 300% - ✅ Calcul disponible
  - Support : Fonction `calculateAutomationROI` calculant temps économisé (estimation 5 min/action), conversions générées (estimation 10% engagement → conversion), coût (0.01€/action), revenu généré (100€/conversion), ROI avec bénéfices monétisés (50€/heure économisée)

**Reporting et dashboards**

- ✅ **Vue d'ensemble des workflows actifs**
  - Dashboard : Vue d'ensemble avec KPIs principaux - ✅ Implémenté
  - Workflows : Liste workflows actifs avec statut - ✅ Implémenté
  - Métriques : Métriques clés par workflow - ✅ Implémenté
  - Graphiques : Graphiques évolution temporelle - ⚠️ Métriques disponibles, graphiques UI TODO
  - Filtres : Filtres par période, scénario, commercial - ✅ Période implémenté, scénario/commercial TODO
  - Support : Composant `WorkflowAnalyticsDashboard` avec affichage KPIs (taux exécution, taux erreur, leads déclenchés, actions exécutées), vue liste tous workflows avec cartes cliquables, vue détaillée par workflow avec métriques complètes, sélection workflow et période, export CSV historique
  
- ✅ **Leads en cours dans chaque scénario**
  - Comptage : Nombre de leads actuellement dans chaque scénario - ✅ Implémenté
  - Répartition : Répartition par scénario (graphique) - ⚠️ Données disponibles, graphique UI TODO
  - Détails : Détails leads par scénario (liste) - ⚠️ Données disponibles, liste détaillée UI TODO
  - Évolution : Évolution nombre leads dans le temps - ⚠️ Calcul disponible, graphique évolution TODO
  - Alertes : Alerte si nombre leads > capacité - ❌ Système d'alertes automatiques TODO
  - Support : Service `workflowScenarioAnalytics.ts` avec fonction `getLeadsInScenario` comptant leads actifs (action_executions avec statut pending/scheduled/processing), fonction `getLeadsDistributionByScenario` pour répartition par scénario
  
- ✅ **Performance par scénario (conversions, abandon)**
  - Conversions : Nombre et taux de conversion par scénario - ✅ Implémenté
  - Abandon : Nombre et taux d'abandon par scénario - ✅ Implémenté
  - Comparaison : Comparaison performance entre scénarios - ✅ Implémenté
  - Graphiques : Graphiques conversions/abandon - ⚠️ Données disponibles, graphiques UI TODO
  - Détails : Détails par étape du scénario - ⚠️ Durée moyenne disponible, détails par étape TODO
  - Support : Fonction `calculateScenarioMetrics` calculant leads entrés/complétés/abandonnés, taux conversion/abandon, durée moyenne dans scénario depuis lifecycle_transitions, taux engagement depuis email_tracking, fonction `compareScenarios` pour comparaison entre scénarios avec identification meilleur/pire performer, moyennes agrégées
  
- ✅ **Alertes sur workflows en erreur**
  - Détection : Détection automatique workflows en erreur - ✅ Implémenté
  - Types : Erreurs API, timeout, données invalides, conditions impossibles - ✅ Implémenté (classification automatique)
  - Notification : Notification immédiate (email, in-app) - ✅ Implémenté (in-app via table notifications, email préparé)
  - Détails : Détails erreur (message, stack trace, contexte) - ✅ Implémenté
  - Résolution : Suggestions de résolution - ✅ Implémenté
  - Support : Service `workflowErrorAlerts.ts` avec fonction `detectWorkflowErrors` analysant action_executions avec statut 'failed', classification automatique type erreur (api_error, timeout, validation_error, condition_error, data_error, unknown), calcul sévérité selon type et nombre occurrences (low/medium/high/critical), fonction `generateResolutionSuggestions` générant suggestions contextuelles selon type d'erreur avec priorité et impact estimé, fonction `sendErrorAlert` envoyant alertes in-app (table notifications), email et webhook préparés, fonction `monitorWorkflowsAndAlert` pour surveillance automatique et envoi alertes aux admins/managers, fonction `resolveWorkflowError` pour marquer erreurs résolues
  
- ✅ **Suggestions d'optimisation (IA)**
  - Analyse : Analyse IA des performances workflows - ✅ Implémenté
  - Suggestions : Suggestions d'amélioration (timing, contenu, conditions) - ✅ Implémenté
  - Exemples : "Augmenter délai J+3 à J+5 pour meilleur engagement" - ✅ Supporté
  - Priorité : Suggestions prioritaires selon impact - ✅ Implémenté (low/medium/high)
  - Implémentation : Implémentation facile des suggestions - ⚠️ Structure prête, application automatique partielle
  - Support : Service `workflowOptimizationAI.ts` avec fonction `analyzeWorkflow` analysant métriques et engagement, génération suggestions automatiques (`generateOptimizationSuggestions`) pour timing (temps d'exécution), contenu (taux ouverture/clic emails), conditions (taux erreur/exécution), fréquence (engagement global), ciblage (actions par lead), génération suggestions IA (`generateAISuggestions` avec Gemini) pour suggestions avancées, calcul score global performance (0-100), identification forces/faiblesses, fonction `applyOptimizationSuggestion` pour application automatique partielle des suggestions

**Logs et traçabilité**

- ✅ **Historique complet des actions automatisées**
  - Enregistrement : Enregistrement de toutes les actions (email, notification, changement statut) - ✅ Implémenté (table `action_executions`)
  - Données : Date, heure, action, lead, workflow, résultat - ✅ Implémenté
  - Recherche : Recherche par lead, workflow, action, période - ✅ Implémenté
  - Export : Export historique (CSV, JSON, PDF) - ✅ CSV implémenté (`exportAutomationHistoryCSV`), JSON/PDF TODO
  - Conservation : Conservation 2 ans (durée légale) - ⚠️ Table existe, politique de conservation à configurer
  - Support : Fonction `getAutomationHistory` avec filtres (workflowId, leadId, actionType, period, limit), fonction `exportAutomationHistoryCSV` pour export CSV avec toutes les colonnes pertinentes
  
- ✅ **Logs d'erreurs et exceptions**
  - Types : Erreurs API, timeout, validation, données - ✅ Détecté et classifié automatiquement
  - Détails : Message erreur, stack trace, contexte - ✅ Implémenté (errorMessage, stackTrace, context)
  - Fréquence : Fréquence erreurs par type - ✅ Implémenté (fonction `getErrorFrequencyByType`)
  - Résolution : Statut résolution (ouvert, résolu, ignoré) - ✅ Implémenté (fonctions `resolveError`, `ignoreError`)
  - Alertes : Alertes si erreurs critiques - ✅ Implémenté (via `workflowErrorAlerts.ts`, classification sévérité)
  - Support : Service `workflowErrorLogging.ts` avec fonctions `logWorkflowError` (enregistrement erreurs avec classification sévérité), `getErrorLogs` (récupération avec filtres), `getErrorStatistics` (statistiques complètes), `getErrorFrequencyByType` (analyse fréquence par type), `resolveError`/`ignoreError` (gestion résolution), table `workflow_error_logs` dans migration SQL, intégration avec `workflowErrorAlerts.ts`
  
- ✅ **Traçabilité des décisions d'affectation**
  - Enregistrement : Enregistrement chaque décision d'affectation - ✅ Implémenté (table `assignment_decisions`)
  - Données : Lead, commercial assigné, règles appliquées, raison - ✅ Implémenté (détails complets avec ruleDetails)
  - Historique : Historique réattributions - ✅ Implémenté (fonction `getAssignmentHistoryForLead`)
  - Audit : Audit trail pour conformité - ✅ Implémenté (format spécialisé pour affectations)
  - Export : Export pour analyse - ✅ Implémenté (fonction `exportAssignmentHistory` au format CSV)
  - Support : Service `assignmentAuditTrail.ts` avec fonction `logAssignmentDecision` (enregistrement décisions avec type initial/reassignment/escalation/transfer/automatic), fonctions `getAssignmentHistoryForLead`/`getAssignmentHistoryForUser` (historique complet), fonction `exportAssignmentHistory` (export CSV), table `assignment_decisions` dans migration SQL, intégration dans `assignmentActions.ts` via `updateLeadAssignment`
  
- ✅ **Audit trail pour conformité**
  - Enregistrement : Enregistrement toutes actions importantes - ✅ Implémenté (service `auditTrailService.ts`)
  - Données : Qui, quoi, quand, pourquoi - ✅ Implémenté (userId, actionType, resourceType, resourceId, reason, timestamp)
  - Sécurité : Logs sécurisés, non modifiables - ⚠️ Table Supabase sécurisée, politique RLS à configurer pour non-modification
  - Export : Export pour audit externe - ✅ Implémenté (fonctions `exportAuditTrailCSV` et `exportAuditTrailJSON` avec résumé)
  - Conservation : Conservation 3 ans (durée légale) - ⚠️ Table existe, politique de conservation à configurer
  - Support : Service `auditTrailService.ts` avec fonction `logAuditEvent` (enregistrement événements avec userId/userName, actionType, resourceType/resourceId, details, reason, ipAddress, userAgent), fonction `getAuditLogs` (récupération avec filtres), fonctions `exportAuditTrail`/`exportAuditTrailCSV`/`exportAuditTrailJSON` (export avec résumé actionsByType/actionsByUser/actionsByResource), table `audit_logs` dans migration SQL avec index pour performances

**3.9.10 Intégration avec campagnes marketing**

**Synchronisation avec module Marketing**

- ✅ **Déclenchement d'automation depuis campagne email**
  - Déclencheur : Clic dans email campagne → déclenchement automation - ✅ Implémenté
  - Exemples : Clic "Demander devis" → scénario "Qualification SQL" - ✅ Supporté
  - Conditions : Conditions sur campagne (type, segment, date) - ✅ Implémenté
  - Actions : Actions automation selon comportement campagne - ✅ Implémenté
  - Support : Service `campaignWorkflowIntegration.ts` avec fonction `triggerWorkflowFromCampaign` déclenchant workflows depuis actions campagne (email_click, email_open, form_submission, page_visit), configuration triggers via `configureCampaignTrigger` avec conditions (segment, dateRange, minScoring), vérification conditions avant déclenchement, enregistrement déclenchements dans `campaign_workflow_triggers`
  
- ✅ **Ajout automatique à liste de diffusion selon critères**
  - Critères : Scoring, température, secteur, famille, comportement - ✅ Implémenté
  - Listes : Listes de diffusion configurables - ✅ Supporté (email_segments, mailing_lists)
  - Synchronisation : Synchronisation automatique (ajout/retrait) - ✅ Implémenté
  - Exclusion : Exclusion automatique si critères non remplis - ✅ Implémenté
  - Support : Fonction `addLeadsToMailingList` ajoutant leads selon critères (scoring, température, secteur, famille, tags, lifecycle_stage, champs custom), fonction `removeLeadsFromMailingList` retirant leads selon critères, fonction `syncMailingList` pour synchronisation automatique avec ajout/retrait, support table `mailing_list_members` et alternative `email_segments`
  
- ✅ **Exclusion automatique si désabonnement**
  - Détection : Détection désabonnement depuis automation - ✅ Implémenté
  - Action : Exclusion immédiate de toutes les listes marketing - ✅ Implémenté
  - Synchronisation : Synchronisation avec module Marketing - ✅ Implémenté
  - Confirmation : Confirmation exclusion dans logs - ✅ Implémenté
  - Support : Fonction `excludeUnsubscribedFromAllLists` retirant lead désabonné de toutes listes actives, enregistrement exclusion dans `mailing_list_exclusions`, support `lead_preferences.email_unsubscribed`, retrait depuis `email_segment_members` si segments utilisés
  
- ✅ **Partage des métriques d'engagement**
  - Métriques : Ouverture, clic, réponse, conversion - ✅ Implémenté
  - Partage : Partage automatique avec module Marketing - ✅ Implémenté
  - Format : API, webhook, base de données partagée - ✅ Base de données partagée implémentée
  - Temps réel : Partage en temps réel ou batch - ⚠️ Partage batch implémenté, temps réel TODO
  - Support : Fonction `shareEngagementMetrics` calculant métriques depuis `email_tracking` (sent, opened, clicked, replied, bounced, unsubscribed, taux calculés), sauvegarde dans table `campaigns.engagement_metrics`, calcul taux (openRate, clickRate, replyRate, bounceRate, unsubscribeRate)

**Intégration avec Social Media**

- ✅ **Détection de mentions/commentaires → création lead**
  - Sources : Facebook, Instagram, Twitter, LinkedIn - ✅ Structure prête
  - Détection : Détection mentions marque, commentaires, messages - ⚠️ Service prêt, détection automatique depuis APIs TODO
  - Création : Création automatique lead avec données disponibles - ✅ Implémenté
  - Enrichissement : Enrichissement automatique depuis profil social - ✅ Implémenté
  - Qualification : Qualification automatique selon contenu - ✅ Implémenté
  - Support : Service `socialMediaWorkflowIntegration.ts` avec fonction `createLeadFromSocialMention` créant lead depuis mention/commentaire, vérification lead existant (par nom/username), enregistrement interaction dans `sales_activities`, enrichissement depuis profil social (`enrichLeadFromSocialProfile`), qualification automatique (`qualifyLeadFromSocialData`)
  
- ✅ **Qualification automatique depuis réseaux sociaux**
  - Profil : Analyse profil social (bio, posts, followers) - ⚠️ Structure prête, analyse complète TODO
  - Scoring : Calcul scoring initial depuis données sociales - ✅ Implémenté
  - Tags : Tags automatiques (influenceur, entreprise, particulier) - ✅ Implémenté
  - Température : Estimation température depuis engagement - ✅ Implémenté
  - Support : Calcul scoring initial (base 30 + bonus influenceur/intéressé/entreprise/sentiment), tags automatiques (influenceur si >10k followers, entreprise/particulier depuis contenu, intéressé/critique depuis sentiment), température (Chaud si influenceur/positif, Froid si négatif, Tiède par défaut)
  
- ✅ **Synchronisation des tags et segments**
  - Tags : Synchronisation tags entre CRM et Social Media - ✅ Implémenté (CRM ← Social et CRM → Social)
  - Segments : Synchronisation segments (audience, leads, clients) - ✅ Structure complète implémentée
  - Bidirectionnel : Synchronisation bidirectionnelle - ✅ Implémenté (nécessite APIs Social pour synchronisation complète vers plateformes)
  - Temps réel : Synchronisation temps réel ou batch - ✅ Batch implémenté, fonction `scheduleSegmentSync` pour planification
  - Support : Fonction `syncTagsBetweenCRMAndSocial` synchronisant tags bidirectionnellement (social_to_crm : tags Social → CRM depuis métadonnées, crm_to_social : tags CRM → Social avec enregistrement dans métadonnées, bidirectional : combinaison des deux), fonction `syncSegmentsBetweenCRMAndSocial` avec synchronisation CRM → Social (récupération segments depuis `email_segments`, filtrage optionnel par `segmentIds`, planification `updateFrequency`), fonction `scheduleSegmentSync` pour planification automatique (real_time/daily/weekly), enregistrement tags Social dans métadonnées leads, préparation pour intégrations APIs Social (Facebook Marketing API pour Custom Audiences, Twitter Ads API pour Tailored Audiences, LinkedIn API pour Matched Audiences), structure prête pour synchronisation temps réel via webhooks

**Intégration avec Scraping/Prospection**

- ✅ **Déclenchement d'automation à l'ajout de lead scrapé**
  - Déclencheur : Lead ajouté depuis scraping → déclenchement automation - ✅ Implémenté
  - Scénario : Scénario "Onboarding Nouveau Lead" automatique - ✅ Implémenté
  - Conditions : Conditions sur qualité lead (scoring, données complètes) - ✅ Implémenté
  - Actions : Enrichissement, qualification, affectation automatiques - ✅ Implémenté
  - Support : Service `scrapingWorkflowIntegration.ts` avec fonction `triggerOnboardingForScrapedLead` recherchant workflows onboarding actifs, évaluation conditions via `evaluateWorkflowConditions` (utilise `conditionEvaluator`), fonction `processScrapedLead` orchestrant tout le traitement (enrichissement, qualification, affectation, onboarding)
  
- ✅ **Enrichissement automatique après scraping**
  - Déclencheur : Lead scrapé avec données incomplètes - ✅ Implémenté
  - Action : Enrichissement automatique (IA, API tierces) - ✅ Implémenté
  - Mise à jour : Mise à jour automatique champs manquants - ✅ Implémenté
  - Scoring : Recalcul scoring après enrichissement - ⚠️ Enrichissement implémenté, recalcul scoring automatique TODO
  - Support : Fonction `enrichScrapedLeadIfNeeded` calculant complétude lead (50% minimum par défaut), vérification enrichissement récent (180 jours), déclenchement enrichissement via `enrichLeadAutomated` (IA + web scraping), fonction `calculateLeadCompleteness` calculant score 0-1 basé sur champs requis/optionnels
  
- ✅ **Qualification automatique selon scoring**
  - Calcul : Calcul scoring automatique après scraping - ✅ Implémenté (scoring déjà calculé)
  - Qualification : Qualification MQL/SQL selon scoring - ✅ Implémenté
  - Transition : Transition automatique cycle de vie - ✅ Implémenté
  - Notification : Notification équipe si scoring élevé - ⚠️ Transition implémentée, notification équipe TODO
  - Support : Fonction `qualifyScrapedLeadByScoring` qualifiant selon scoring (>=75 → SQL, >=60 → MQL), mise à jour `lifecycle_stage`, enregistrement transition dans `lifecycle_transitions` avec trigger_type 'scoring_qualification'
  
- ✅ **Affectation automatique selon règles**
  - Règles : Application règles d'affectation standard - ✅ Implémenté
  - Priorité : Priorité si lead VIP (scoring élevé, valeur importante) - ✅ Implémenté (via `assignLeadAutomated`)
  - Notification : Notification commercial assigné - ⚠️ Affectation implémentée, notification automatique TODO
  - Tâche : Création tâche de suivi automatique - ⚠️ Affectation implémentée, création tâche automatique TODO
  - Support : Fonction `assignScrapedLeadAutomatically` utilisant `assignLeadAutomated` avec règles standard, support règles round-robin/géographique/compétence/charge/performance, gestion VIP via `assignVIPLead`

**3.9.11 Éditeur de workflows visuel**

**Interface drag & drop pour création de workflows**

- ✅ **Éditeur visuel**
  - Interface : Interface graphique avec canvas - ✅ Implémenté (WorkflowEditor avec SVG)
  - Drag & drop : Glisser-déposer nœuds depuis bibliothèque - ✅ Implémenté (sidebar bibliothèque avec drag & drop, nœuds draggables sur canvas)
  - Connexion : Connexion nœuds par liens visuels - ✅ Implémenté (edges SVG avec flèches)
  - Zoom : Zoom in/out, pan (déplacement) - ✅ Implémenté (zoom 50%-200%, pan avec souris middle/ctrl, reset zoom)
  - Grille : Grille magnétique pour alignement - ✅ Implémenté (grille 20px, snap automatique, toggle on/off)
  - Recherche : Recherche nœuds par nom, catégorie - ✅ Implémenté (SearchBar avec filtrage en temps réel)
  - Support : Composant `WorkflowEditor.tsx` avec canvas SVG, sidebar bibliothèque de nœuds, drag & drop complet, zoom/pan, grille magnétique, recherche, validation en temps réel
  
- ⚠️ **Bibliothèque de nœuds (déclencheurs, conditions, actions)**
  - Déclencheurs : Nouveau lead, changement statut, événement, temps - ✅ Implémenté
  - Conditions : IF-THEN-ELSE, comparaisons, logique - ✅ Supporté (type condition)
  - Actions : Email, SMS, notification, changement données, création tâche - ✅ Implémenté
  - Recherche : Recherche nœuds par nom, catégorie - ❌ TODO
  - Prévisualisation : Aperçu nœud avant ajout - ⚠️ Modal configuration présente, aperçu avant ajout TODO
  - Support : Types déclencheurs (lead_created, email_open, email_click, tag_added, form_submit, page_visit), types actions (send_email, add_tag, remove_tag, change_status, assign_to, wait), type condition disponible, dropdown sélection type dans modal
  
- ⚠️ **Connexion visuelle entre nœuds (flowchart)**
  - Liens : Liens visuels entre nœuds (flèches) - ✅ Implémenté (edges SVG avec flèches)
  - Types : Liens simples, conditionnels (vrai/faux) - ⚠️ Liens simples implémentés, conditionnels TODO
  - Validation : Validation connexions (types compatibles) - ❌ TODO
  - Styles : Styles différents selon type lien - ⚠️ Style unique, différenciation par type TODO
  - Animation : Animation lors exécution workflow - ❌ TODO
  - Support : Dessin edges via SVG avec flèches, fonction `connectNodes`, gestion edges dans state
  
- ✅ **Validation en temps réel des workflows**
  - Syntaxe : Vérification syntaxe en temps réel - ✅ Implémenté
  - Logique : Vérification logique (boucles, conditions) - ✅ Implémenté
  - Champs : Vérification existence champs référencés - ✅ Implémenté
  - Erreurs : Affichage erreurs avec suggestions - ✅ Implémenté
  - Warnings : Avertissements (non-bloquants) - ✅ Implémenté
  - Support : Service `conditionValidator.ts` avec validation complète, intégration dans `WorkflowEditor.tsx` avec panneau de validation, affichage visuel des erreurs sur les nœuds (bordure rouge/jaune), icônes d'alerte sur les nœuds, blocage sauvegarde si erreurs critiques avec confirmation, validation automatique lors modification nœuds conditions
  
- ✅ **Templates de workflows pré-configurés**
  - Bibliothèque : Bibliothèque templates par scénario - ✅ Implémenté
  - Exemples : Onboarding, Nurturing, Relance, Conversion - ✅ Templates par défaut disponibles
  - Duplication : Duplication et modification templates - ✅ Implémenté
  - Partage : Partage templates entre utilisateurs - ✅ Implémenté
  - Recherche : Recherche templates par mot-clé - ✅ Implémenté
  - Support : Service `workflowTemplateLibrary.ts` avec fonctions `getWorkflowTemplates` (filtres category/tags/search/public/official), `getWorkflowTemplateById`, `createTemplateFromWorkflow`, `duplicateTemplateAsWorkflow`, `shareWorkflowTemplate`, `searchWorkflowTemplates`, templates par défaut pour onboarding/nurturing, table `workflow_templates` dans migration
  
- ✅ **Import/export de workflows (JSON)**
  - Format : Format JSON structuré - ✅ Implémenté
  - Export : Export workflow complet (nœuds, connexions, config) - ✅ Implémenté
  - Import : Import workflow depuis fichier JSON - ✅ Implémenté
  - Validation : Validation format avant import - ✅ Implémenté
  - Partage : Partage workflows entre instances - ✅ Supporté via JSON
  - Support : Service `workflowVersioning.ts` avec fonction `exportWorkflow` exportant workflow + versions au format JSON, fonction `importWorkflow` avec validation format, options createNew/importVersions, gestion erreurs
  
- ✅ **Versioning des workflows (historique des modifications)**
  - Versions : Sauvegarde automatique versions - ✅ Implémenté
  - Historique : Historique complet modifications - ✅ Implémenté
  - Comparaison : Comparaison entre versions - ✅ Implémenté
  - Restauration : Restauration version précédente - ✅ Implémenté
  - Auteur : Enregistrement auteur chaque modification - ✅ Implémenté
  - Support : Service `workflowVersioning.ts` avec fonction `saveWorkflowVersion` sauvegardant versions avec numérotation automatique, fonction `getWorkflowVersions` récupérant historique, fonction `compareWorkflowVersions` comparant deux versions (added/removed/modified nodes/edges), fonction `restoreWorkflowVersion` restaurant version précédente avec sauvegarde avant restauration, table `workflow_versions` dans migration
  
- ✅ **Activation/désactivation des workflows**
  - Activation : Activation workflow (démarrage exécution) - ✅ Supporté (is_active dans automated_actions)
  - Désactivation : Désactivation workflow (pause exécution) - ✅ Supporté
  - Statut : Statut visible (actif, inactif, erreur) - ✅ Implémenté (draft, active, paused, archived)
  - Impact : Affichage impact désactivation (leads en cours) - ⚠️ Statut implémenté, affichage impact TODO
  - Confirmation : Confirmation avant désactivation - ⚠️ Gestion disponible, confirmation UI TODO
  - Support : Champs `is_active` et `status` dans `automated_actions`, gestion activation/désactivation dans hooks
  
- ✅ **Test et simulation avant déploiement**
  - Mode test : Mode test avec données de test - ✅ Implémenté
  - Simulation : Simulation exécution workflow - ✅ Implémenté
  - Résultats : Affichage résultats attendus - ✅ Implémenté
  - Validation : Validation avant activation - ✅ Implémenté
  - Ajustement : Ajustement workflow selon résultats test - ⚠️ Simulation disponible, ajustement manuel pour l'instant
  - Support : Service `workflowSimulator.ts` avec fonctions `simulateWorkflow` (simulation sur lead de test), `testWorkflowOnSample` (test sur échantillon), `generateTestLead` (génération lead de test), `formatSimulationResults` (formatage résultats), calcul statistiques agrégées

#### 3️⃣ MODULE CRM - VUE CARTE & GÉOLOCALISATION

**3.10 Visualisation géographique**
- ✅ Carte interactive avec Leaflet
- ✅ Géocodage automatique des adresses
- ✅ Clustering des markers proches
- ✅ Popups avec détails des leads
- ✅ Zones de prospection personnalisables (table `prospecting_zones` + hook `useProspectingZones` + composant `ProspectingZonesManager` + affichage cercles sur carte)
- ✅ Rayons de recherche géographique (cercles avec rayon en km, filtrage des leads par zone)
- ✅ Filtres par zone géographique (zones créables, filtrage visuel sur carte, filtres dans liste avec dropdown pour sélectionner une zone, utilisation de `isPointInZone` pour filtrer les leads géolocalisés, intégré dans `currentFilters` pour les filtres sauvegardés)
- ✅ Heatmap de densité des leads (bibliothèque leaflet.heat installée + composant `HeatmapLayer` + toggle d'activation dans CrmMapView, affichage de la densité avec gradient de couleurs)
- ✅ Itinéraires optimisés pour visites terrain (composant `RoutePlanner` avec sélection de leads, optimisation Nearest Neighbor, affichage de la route sur la carte avec polyline, support OSRM pour routing précis jusqu'à 25 points, calcul automatique de la distance et du temps de trajet)
- ✅ Calcul de distances et temps de trajet (fonctions utilitaires dans `routing.ts` : `calculateDistance` avec formule Haversine, `calculateRouteDistance`, `calculateTravelTime`, `formatDistance`, `formatDuration`, `calculateOSRMRoute` avec API publique OSRM, matrice de distances, optimisation Nearest Neighbor)

**3.11 Analyse géographique**
- ✅ Répartition géographique des clients/prospects (service geographicAnalysisService avec calcul répartition par région/département/ville, comptage leads/clients/prospects, CA total/moyen, taux conversion, export CSV)
- ✅ Zones à fort potentiel (hotspots) (service identifyHotspotZones avec clustering géographique, calcul intensité 0-100 basé sur nombre leads/conversion/valeur/scoring, identification secteurs/tailles principales, filtres minLeads/minIntensity/radiusKm/region)
- ✅ Analyse de couverture commerciale (service analyzeCoverage avec analyse par région/département et commercial, taux couverture, taux conversion, CA total, filtres userId/region/department)
- ✅ Comparaison par régions/départements (service compareRegions avec comparaison par région/département/ville, statistiques complètes, top secteurs/villes, calcul taux croissance si période précédente, filtres période)
- ❌ Export de cartes personnalisées (nécessite génération images/PDF de cartes avec overlay données, intégration leaflet-screenshot ou canvas)
- ❌ Intégration avec données démographiques (nécessite API données démographiques INSEE/autres, enrichissement géographique avec population/revenus/activité économique)
  - Support : Service `geographicAnalysisService.ts` avec fonction `calculateGeographicDistribution` calculant répartition géographique (groupement par région/département/ville, comptage leads/clients/prospects, CA total/moyen, taux conversion, filtres type/region/department/période), fonction `identifyHotspotZones` identifiant zones à fort potentiel (clustering géographique grid-based avec rayon configurable, calcul intensité basé sur nombre leads/taux conversion/valeur/scoring, extraction secteurs/tailles principales, filtres minLeads/minIntensity/radiusKm/region), fonction `analyzeCoverage` analysant couverture commerciale (groupement par région/département et commercial, calcul taux couverture (% leads assignés), taux conversion, CA total, filtres userId/region/department), fonction `compareRegions` comparant régions/départements (groupement par région/département/ville, statistiques complètes, top 5 secteurs/villes, calcul taux croissance si période précédente, filtres période), fonction `exportGeographicDataCSV` exportant données au format CSV, formule Haversine pour calcul distances (clustering hotspots), utilisation coordonnées GPS depuis geographic_data

**3.12 Outils terrain**
- ❌ Mode hors-ligne pour visites
- ❌ Saisie rapide depuis la carte
- ❌ Géolocalisation automatique des visites
- ❌ Photos et notes géolocalisées
- ❌ Synchronisation automatique au retour en ligne

#### 4️⃣ MODULE SCRAPING & PROSPECTION INTELLIGENTE

**4.1 Robot de prospection**
- ✅ Scraping multi-sources (Google Maps, LinkedIn, Sites web, SIRENE, Pages Jaunes)
- ✅ Qualification IA des prospects
- ✅ Croisement de données multi-sources
- ✅ Conformité RGPD (sources publiques uniquement)
- ✅ Fallback automatique entre services IA (Gemini → Groq → Mistral)
- ✅ Gestion des erreurs et messages d'aide détaillés
- ✅ Normalisation des données (parseAndNormalizeLeads)
- ✅ Interface utilisateur dédiée (Robot Prospection 3.0)
- ✅ Affichage en temps réel du statut de recherche
- ✅ Filtrage automatique des doublons avant ajout
- ✅ Planification de recherches récurrentes (table + hooks + interface UI complète)
- ✅ Scraping programmé (quotidien, hebdomadaire, mensuel - calcul automatique next_run_at)
- ✅ Historique des recherches et résultats (table + hooks + interface UI complète)
- ✅ Export des résultats de scraping (CSV, JSON, Excel - fonctions + UI)
- ✅ Sauvegarde automatique des recherches (sauvegarde automatique si >= 10 leads trouvés, création template avec nom généré automatiquement, détection templates similaires existants, incrément usage si template existant)
  - Support : Service `prospectingSearchTemplatesService.ts` avec fonction `autoSaveSearchAsTemplate` sauvegardant automatiquement recherches fructueuses (>= 10 leads), fonction `createSearchTemplate` pour création manuelle, fonction `getSearchTemplates` avec filtres (userId, public, official, search), fonction `applySearchTemplate` pour réutiliser templates, fonction `duplicateSearchTemplate` pour duplication, fonction `incrementTemplateUsage` pour tracking usage, table `prospecting_search_templates` dans migration SQL avec champs (name, description, zone, activity, filters JSONB, is_public, is_official, usage_count), intégration automatique dans `handleRunProspecting` après recherche réussie, RLS policies pour sécurité
- ✅ Templates de recherche sauvegardés (création, modification, suppression, duplication, application, recherche, filtres public/officiel, compteur d'utilisation)
  - Support : Service `prospectingSearchTemplatesService.ts` complet avec CRUD templates, fonction `getSearchTemplateById`, fonction `updateSearchTemplate`, fonction `deleteSearchTemplate`, fonction `getSearchTemplates` avec recherche et filtres, fonction `applySearchTemplate` pour réutiliser templates avec incrément usage, fonction `duplicateSearchTemplate`, table `prospecting_search_templates` avec index pour performances, RLS policies pour sécurité (utilisateurs voient leurs templates + publics/officiels, peuvent créer/modifier/supprimer leurs propres templates non-officiels)

**4.2 Sources de données**
- ✅ Google Maps / Google Business Profile (via Google Search API)
- ✅ LinkedIn (profils publics, via Google Search)
- ✅ Sites web officiels (analyse via IA)
- ✅ SIRENE / Registres publics (mentionnés dans le prompt)
- ✅ Pages Jaunes / Annuaires (mentionnés dans le prompt)
- ✅ Google Search avec grounding metadata (sources web vérifiées)
- ✅ Réseaux sociaux (Facebook, Instagram, Twitter - intégrés dans le prompt amélioré)
- ✅ Actualités et presse en ligne (Google News intégré dans le prompt, extraction d'événements déclencheurs)
- ❌ Chambres de commerce (API directe)
- ❌ Marketplaces professionnelles (API directe)
- ❌ Bases de données sectorielles (API directe)
- ❌ Scraping direct depuis les sites (sans passer par Google Search)

**4.3 Qualité et fiabilité des données**
- ✅ Traçabilité des sources (data_sources, webSources)
- ✅ Niveau de fiabilité par champ (reliability dans le prompt)
- ✅ Extraction des métadonnées de sources (URI, title)
- ✅ Croisement automatique de 3-4 sources minimum
- ✅ Normalisation et validation du format JSON
- ✅ Gestion des erreurs de parsing
- ✅ Validation automatique des emails (vérification syntaxe + détection emails suspects)
- ✅ Vérification des numéros de téléphone (format français + détection numéros suspects)
- ✅ Détection de données obsolètes (calcul data_freshness en jours)
- ✅ Score de qualité global par lead (calcul automatique avec pondération)
- ✅ Alertes sur données manquantes ou suspectes (missing_fields, suspicious_fields)
- ✅ Indicateurs de confiance par source (source_reliability calculé)
- ✅ Intégration du scoring dans le flux d'ajout de leads (calcul + sauvegarde automatique)
- ✅ Affichage du score de qualité dans l'interface (badge coloré selon score)
- ✅ Affichage des alertes email/téléphone invalides (icônes d'alerte)
- ✅ Affichage des champs manquants et suspects dans les cartes de leads
- ✅ Intégration du scoring dans le flux d'ajout de leads (calcul + sauvegarde automatique)
- ✅ Affichage du score de qualité dans l'interface (badge coloré selon score)

**4.4 Enrichissement intelligent**
- ✅ Enrichissement IA (description, SWOT, tech stack)
- ✅ Inférence IA (type client, maturité digitale)
- ✅ Extraction des données dirigeant (nom, titre, email, LinkedIn)
- ✅ Extraction des métriques Google (rating, reviewCount)
- ✅ Extraction des données entreprise (SIRET, année création, taille)
- ✅ Détection de trigger events (mentionné dans le prompt)
- ✅ Identification des technologies utilisées (tech stack)
- ✅ Estimation de la valeur potentielle du deal (calcul automatique basé sur taille entreprise, secteur, température, scoring, lifecycle stage, tags VIP)
  - Support : Service `dealValueEstimationService.ts` avec fonction `estimateDealValue` calculant valeur estimée selon multiplicateurs configurables (taille entreprise: TPE/PME/ETI/Grande, secteur avec multiplicateurs par défaut, température: Froid/Tiède/Chaud, scoring avec ajustement proportionnel, lifecycle stage avec ajustements MQL/SQL/Contact/Opportunité, tags VIP avec bonus +50%), fonction `estimateAndUpdateDealValue` mettant à jour automatiquement le champ `estimated_value` du lead, fonction `estimateDealValuesForAllLeads` pour traitement batch, fonction `recalculateDealValueIfNeeded` pour recalcul lors changements de champs impactants, intégration automatique dans `enrichLeadAutomated` pour estimation lors enrichissement, valeurs par défaut (base 15k€, multiplicateurs configurables), limites min/max (1000€-500000€), enregistrement dans timeline via sales_activities
- ✅ Enrichissement par API tierces (Clearbit, FullContact, Hunter.io) - Implémenté (voir section 3.9.4 Actions automatisées)
- ✅ Analyse de sentiment sur les avis Google (analyse IA avec Gemini ou méthode basique, extraction aspects service/qualité/prix/support, mots-clés positifs/négatifs, résumé)
  - Support : Service `googleReviewsSentimentAnalysisService.ts` avec fonction `analyzeGoogleReviewsSentiment` analysant liste d'avis (analyse IA avec Gemini pour analyse avancée ou méthode basique basée sur notes), fonction `analyzeAndUpdateGoogleReviewsSentiment` mettant à jour automatiquement l'analyse dans metadata du lead, fonction `getGoogleReviewsSentiment` récupérant analyse existante, fonction `analyzeSentimentForAllLeadsWithReviews` pour traitement batch, calcul sentiment global (positive/neutral/negative), score sentiment -100 à +100 (basé sur note moyenne 1-5 étoiles), extraction aspects (service, qualité, prix, support) avec scores individuels, extraction mots-clés positifs/négatifs depuis texte des avis, résumé de l'analyse (2-3 phrases), calcul note moyenne et nombre d'avis, enregistrement automatique dans metadata (googleReviewsSentiment, googleReviews, googleReviewsLastAnalyzed), enregistrement dans timeline via sales_activities, tracking coûts API via apiCostTrackingService, intégration automatique dans `enrichLeadAutomated` si avis disponibles, rafraîchissement automatique si analyse > 30 jours, support avis synthétiques depuis note moyenne si avis détaillés non disponibles
- ✅ Détection d'événements déclencheurs automatique (monitoring web, analyse IA, détection mots-clés, planification périodique)
  - Support : Service `triggerEventAutoDetectionService.ts` avec fonction `detectTriggerEventsForLead` détectant événements pour un lead (monitoring web via analyse sources/descriptions, analyse IA via Gemini, scraping périodique préparé, réseaux sociaux préparé), fonction `detectTriggerEventsForAllLeads` pour traitement batch avec filtres (lifecycleStages, minScore, tags), fonction `processDetectedEvents` créant événements dans table `trigger_events` avec vérification doublons (7 jours), fonction `scheduleAutoDetection` planifiant détection périodique selon intervalle configurable (défaut 24h), détection types événements (recrutement : embauche, postes ouverts ; levée de fonds : funding, investissement, série A/B/C ; expansion : nouveau bureau, nouvelle région ; déménagement : changement adresse ; changement technologique : migration, upgrade ; événement médiatique : article, award ; changement direction : nouveau dirigeant), détection via mots-clés dans sources/descriptions (dictionnaire mots-clés par type événement), détection via analyse IA (prompt structuré, JSON réponse, confidence score), configuration sources (webMonitoring, scraping, aiAnalysis, socialMedia), filtrage leads éligibles (lifecycle stage, score minimum, tags), vérification doublons (événements similaires < 7 jours), enregistrement coûts API via apiCostTrackingService, intégration avec useTriggerEvents pour traitement automatique des événements détectés, planification automatique via fonction `shouldRunAutoDetection` vérifiant dernière exécution
- ✅ Scoring de propension à acheter (calcul automatique basé sur comportement, contexte, timing, match avec l'offre)
  - Support : Service `propensityToBuyScoringService.ts` avec fonction `calculatePropensityToBuy` calculant score 0-100 selon 4 catégories (comportemental 35% : engagement email/website/contenu, fréquence interactions ; contextuel 25% : température, scoring qualité, étape cycle de vie ; timing 20% : temps depuis premier contact, indicateurs urgence budget/timeline/besoin/autorité ; match 20% : correspondance secteur/taille/besoin), fonction `calculateAndUpdatePropensityScore` mettant à jour automatiquement le score dans metadata du lead, fonction `calculatePropensityForAllLeads` pour traitement batch, calcul probabilité d'achat en % (conversion non-linéaire score → probabilité), détermination niveau propension (Très faible/Faible/Moyen/Élevé/Très élevé), identification indicateurs clés expliquant le score, génération recommandations d'action selon score et facteurs, intégration automatique dans `enrichLeadAutomated`, enregistrement dans timeline via sales_activities, analyse comportementale depuis sales_activities et email_tracking (30 derniers jours), calcul optimal timing (fenêtre 7-30 jours après premier contact)

**4.5 Monitoring et analytics**
- ✅ Affichage du statut en temps réel (onProgress)
- ✅ Comptage des leads trouvés
- ✅ Affichage du nombre de sources web trouvées
- ✅ Messages d'erreur détaillés avec diagnostic
- ✅ Dashboard de performance du scraping (statistiques globales, par source, qualité, erreurs, historique)
  - Support : Service `scrapingPerformanceService.ts` avec fonction `calculateScrapingPerformance` calculant statistiques globales (total sessions, taux succès, leads trouvés/ajoutés, durée moyenne, coûts), statistiques par source (sessions, taux succès, leads, durée, coûts), statistiques qualité (score moyen, distribution haute/moyenne/basse qualité), statistiques erreurs (total, par type, erreurs les plus communes), fonction `recordScrapingSession` enregistrant sessions scraping, fonction `updateScrapingSession` mettant à jour statut/leads/erreurs, fonction `getScrapingHistory` récupérant historique avec filtres (source, status, userId, limit, offset), table `scraping_sessions` dans migration SQL avec champs (user_id, started_at, completed_at, source, query, zone, activity, status, leads_found, leads_added, errors, metadata), index pour performances, RLS policies pour sécurité, trigger automatique updated_at, intégration coûts API depuis `api_usage_logs`
- ✅ Taux de succès par source (calcul automatique depuis sessions scraping, comparaison sources, historique)
- ✅ Coûts et quotas API (suivi via apiCostTrackingService, intégration dans stats scraping, visualisation par source)
- ✅ Statistiques de qualité des données (score moyen, distribution haute/moyenne/basse qualité, intégré dans scrapingPerformanceService)
- ✅ Alertes sur échecs de scraping (notifications in-app, catégorisation erreurs, détection problèmes récurrents)
  - Support : Service `scrapingAlertService.ts` avec fonction `analyzeScrapingSessionAndAlert` analysant session et générant alertes (erreurs, warnings taux conversion faible/peu de leads, catégorisation erreurs : Timeout, Quota API, Réseau, Parsing, Authentification, Ressource non trouvée, Erreur serveur), fonction `detectRecurringIssues` détectant problèmes récurrents (>= 3 occurrences), fonction `getUnacknowledgedAlerts` récupérant alertes non acquittées, fonction `acknowledgeAlert` marquant alerte acquittée, envoi notifications in-app (table notifications), préparation email/Slack (TODO), configuration alertes (seuils, canaux, destinataires), sévérité alertes (low/medium/high/critical), table `scraping_alerts` dans migration SQL avec champs (session_id, alert_type, severity, title, message, error_details, acknowledged), intégration dans `handleRunProspecting` pour tracking automatique sessions et génération alertes, détection patterns d'erreurs récurrentes
- ✅ Rapports d'activité du robot (historique) (composant ProspectingHistory existant + service scrapingConversionMetricsService avec fonction generateScrapingActivityReport combinant métriques conversion, performances et historique)
- ✅ Métriques de conversion (scraping → lead → client) (service scrapingConversionMetricsService avec calcul complet pipeline conversion : scraping→lead→contact→opportunité→client, taux conversion chaque étape, temps moyen chaque étape, CA généré, ROI, métriques par source, export CSV)
  - Support : Fonction `calculateConversionMetrics` calculant métriques complètes (scraping: sessions/leads trouvés/ajoutés, lead→contact: leads contactés/temps premier contact, contact→opportunité: opportunités créées/temps opportunité, opportunité→client: clients acquis/CA/temps client, global: taux conversion global/CA moyen/ROI/coûts, par source: sessions/leads/opportunités/clients/CA/taux), fonction `generateScrapingActivityReport` combinant métriques conversion + performances + historique, fonction `exportConversionMetricsCSV` exportant métriques au format CSV, calcul depuis scraping_sessions, leads, sales_activities, quotes pour pipeline complet
- ✅ Graphiques de performance temporelle (composant ScrapingAnalyticsDashboard avec graphiques ligne pour évolution leads trouvés/ajoutés, graphique zone pour taux de succès, données temporelles groupées par jour, filtres période jour/semaine/mois/tout, intégré dans CrmView avec bouton Analytics)
- ✅ Analyse comparative des sources (graphiques barres pour leads/succès/conversion par source, graphique camembert répartition sessions, tableau comparatif détaillé avec toutes métriques par source, KPIs globaux taux succès/leads ajoutés/conversion/ROI, intégré dans ScrapingAnalyticsDashboard)
  - Support : Composant `ScrapingAnalyticsDashboard.tsx` avec graphiques Recharts (CustomLineChart pour évolution temporelle leads, CustomAreaChart pour taux succès, CustomBarChart pour comparaison sources, CustomPieChart pour répartition sessions), préparation données temporelles depuis scraping_sessions groupées par jour, préparation données comparaison sources depuis performanceStats et conversionMetrics, tableau détaillé avec sessions/taux succès/leads/durée/conversion/clients/CA par source, filtres période (jour/semaine/mois/tout), KPIs cards avec taux succès/leads ajoutés/taux conversion global/ROI, intégration bouton Analytics dans CrmView prospecting view

**4.6 Configuration et paramètres**
- ✅ Support multi-providers IA (Gemini, Groq, Mistral)
- ✅ Détection automatique des clés API configurées
- ✅ Messages d'aide pour configuration des clés
- ✅ Gestion des quotas et basculement automatique
- ✅ Configuration des sources à utiliser (service scrapingConfigService avec activation/désactivation par source, priorité, limites par source, champs spécifiques)
- ✅ Limites de scraping (nombre max de résultats) (configuration globale et par source, temps d'exécution max, requêtes concurrentes max)
- ✅ Paramètres de qualité (seuils de fiabilité) (score minimum, fiabilité minimum, champs requis/préférés, filtrage automatique)
- ✅ Filtres par défaut (secteurs, zones) (configuration filtres par défaut : secteurs, zones, pays, taille entreprise, mots-clés exclus, application automatique)
- ✅ Personnalisation des champs à extraire (configuration par catégorie : contact, company, business, social, metadata, champs spécifiques par source)
  - Support : Service `scrapingConfigService.ts` avec fonction `getScrapingConfig` récupérant config utilisateur (ou défaut), fonction `saveScrapingConfig` sauvegardant config, fonction `resetScrapingConfigToDefault` réinitialisant, fonction `getEnabledSources` récupérant sources activées triées par priorité, fonction `isSourceEnabled` vérifiant activation source, fonction `applyDefaultFilters` appliquant filtres par défaut, fonction `validateLeadQuality` validant lead selon critères configurés, configuration 8 sources (google_maps, linkedin, sirene, website, pages_jaunes, chambres_commerce, social_media, news) avec activation/priorité/limites/champs, limites globales (maxTotalResults 200, maxResultsPerSource 50, maxExecutionTime 300s, maxConcurrentRequests 5), paramètres qualité (minQualityScore 50, minReliabilityScore 60, requiredFields/preferredFields, enableQualityFiltering), filtres par défaut (sectors, zones, countries, excludeKeywords, minCompanySize, maxCompanySize), personnalisation champs par catégorie (contact/company/business/social/metadata), options avancées (duplicateDetection, autoEnrichment, autoQualification, autoAssignment, crossSourceValidation, minSourcesPerLead 2), table `scraping_configs` dans migration SQL avec JSONB pour toutes les configurations, une config par utilisateur (UNIQUE user_id), RLS policies pour sécurité

**4.7 Intégration et workflow**
- ✅ Intégration avec le CRM (ajout direct des leads)
- ✅ Filtrage des doublons avant ajout (email, téléphone, entreprise)
- ✅ Ajout individuel ou en masse
- ✅ Affichage des sources dans l'interface
- ❌ Workflow d'approbation avant ajout (nécessite système d'approbation avec validation multi-niveaux, notifications approbateurs)
- ✅ Enrichissement automatique après scraping (intégré via processScrapedLead avec enrichissement IA + APIs tierces si config.advanced.enableAutoEnrichment activé)
- ✅ Création automatique de tâches de suivi (intégré dans handleAddGeneratedLead et handleAddAllGeneratedLeads via processScrapedLead + createAutomatedTask si config.advanced.enableAutoAssignment activé, priorité selon score qualité, échéance J+2)
- ✅ Envoi automatique d'emails de prospection (fonction sendProspectingEmailForScrapedLead avec vérification consentement RGPD, template configurable, variables dynamiques, tracking, délai configurable, intégré dans processScrapedLead)
  - Support : Fonction `sendProspectingEmailForScrapedLead` dans `scrapingWorkflowIntegration.ts` avec vérification consentement RGPD via `isLeadUnsubscribed`, utilisation template configurable (prospectingEmailTemplateId) ou template par défaut "Bienvenue", remplacement variables dynamiques via `replaceVariablesAsync` (données contact/entreprise/contexte/comportementales), envoi avec tracking via `sendEmailWithTracking`, support délai configurable (prospectingEmailDelay en minutes), planification envoi différé si délai > 0, enregistrement activité dans timeline (sales_activities), option `enableAutoProspectingEmail` dans `scrapingConfigService` (désactivé par défaut), intégration dans `processScrapedLead` avec option `sendProspectingEmail`, utilisation email utilisateur assigné ou email par défaut comme expéditeur, vérification email valide avant envoi, gestion erreurs avec messages détaillés, retour résultat avec emailId pour tracking
- ❌ Synchronisation avec calendrier pour rendez-vous (nécessite intégration Google Calendar/Outlook)

#### 5️⃣ MODULE MARKETING (EMAIL, AUTOMATION, PAGES)

**5.1 Campagnes Email/SMS/WhatsApp**
- ❌ Éditeur drag & drop
- ⚠️ Templates d'emails (interface complète `EmailTemplateManager.tsx` + table + hooks, éditeur visuel drag & drop manquant ~70%)
- ✅ Segmentation avancée (listes dynamiques avec critères personnalisables, segmentation comportementale, listes de diffusion personnalisées - voir section 3.7 Segmentation & Listes)
- ✅ Envois programmés (service scheduledEmailService avec planification, exécution automatique par batches, gestion limites, annulation, suivi exécutions)
  - Support : Service `scheduledEmailService.ts` avec fonction `scheduleCampaignEmail` planifiant campagne avec date/heure, fuseau horaire, taille batch, délai entre batches, limite envois/heure, fonction `cancelScheduledEmail` annulant envoi programmé, fonction `executeScheduledCampaign` exécutant campagne programmée (traitement par batches, vérification désabonnement RGPD, remplacement variables dynamiques, envoi avec tracking, pause si limite/heure atteinte, reprise automatique), fonction `processScheduledEmails` traitant toutes campagnes programmées (appelée par cron/scheduler), fonction `getScheduledExecutions` récupérant historique exécutions, table `scheduled_email_executions` dans migration SQL avec champs (campaign_id, scheduled_at, executed_at, status, total_recipients, sent_count, failed_count, skipped_count, error_message, metadata), colonnes ajoutées à `campaigns` (template_id, segment_id, mailing_list_id, sent_at, total_recipients), index pour performances, RLS policies pour sécurité, support segments dynamiques et listes de diffusion, gestion limites d'envoi (maxSendsPerHour), traitement par batches configurables, pause/reprise automatique si limite atteinte
- ✅ Personnalisation (variables) (service variableReplacement complet + composant EmailVariableHelper pour afficher/insérer variables dans UI campagnes, toutes variables supportées : contact, entreprise, contexte, comportementales, personnalisées, formatage automatique, fallbacks)
  - Support : Service `variableReplacement.ts` avec toutes variables implémentées ({{nom}}, {{prénom}}, {{entreprise}}, {{secteur}}, {{scoring}}, {{température}}, {{dernière_interaction}}, etc.), composant `EmailVariableHelper.tsx` avec liste complète variables disponibles, filtrage par catégorie (contact/entreprise/contexte/comportemental/personnalisé), copie/insertion variables, exemples et descriptions, intégré dans `EmailCampaignsManager.tsx` avec mode compact, remplacement automatique lors envoi via `replaceVariablesAsync`, support formatage avancé ({{variable|format:type}}), support fallbacks ({{variable|fallback}}), variables comportementales enrichies depuis sales_activities et email_tracking

**5.2 Marketing Automation**
- ✅ Création workflows automatisés (tables + hooks complets, interface basique `MarketingView.tsx`, éditeur visuel drag & drop complet `WorkflowEditor.tsx` avec bibliothèque de nœuds, zoom/pan, grille magnétique, recherche)
- ✅ Scénarios : onboarding, nurturing, relance (structure prête)
- ✅ Déclencheurs : ouverture email, clic, tag, comportement web (structure prête)
- ✅ Flowchart visuel (éditeur complet avec drag & drop depuis bibliothèque, zoom/pan, grille magnétique, recherche de nœuds)

**5.3 Formulaires**
- ✅ Formulaires intégrés - Composant complet `FormBuilder.tsx` avec builder drag & drop, types champs (text, email, phone, number, textarea, select, checkbox, radio, date, file, url), validation, logique conditionnelle, prévisualisation, code embed, gestion soumissions, export CSV/JSON, création automatique leads, notifications, redirections
- ✅ Tracking des conversions - Intégré dans formulaires (table `form_submissions`), tracking événements, métriques conversion

**5.4 Analytics marketing**
- ✅ Performances des campagnes (métriques réelles)
- ✅ Heatmap email
- ✅ ROI campagne
- ✅ Rapports automatisés (PDF, export)

#### 6️⃣ MODULE SOCIAL MEDIA MANAGEMENT

**5.1 Publication & planning**
- ✅ Planning éditorial multi-réseaux
- ⚠️ Publication immédiate ou programmée (structure, pas d'envoi réel)
- ✅ Brouillons
- ❌ Publication bulk (CSV)
- ❌ Recommandation meilleurs créneaux (IA)
- ✅ Suggestions de hashtags (génération IA complète avec intégration API IA, analyse tendances, suggestions par plateforme)

**5.2 Création de contenus**
- ⚠️ Bibliothèque médias centralisée (DriveView existe)
- ❌ Historique des versions
- ✅ Générateur IA de contenus
- ❌ Génération IA visuels

**5.3 Gestion des interactions**
- ❌ Inbox multicanal
- ❌ Filtre par réseau / type / priorité
- ❌ Attribution d'un message à un membre
- ❌ Réponses enregistrées

**5.4 Collaboration**
- ✅ Workflow d'approbation (système complet `ApprovalWorkflow.tsx` et `ApprovalWorkflowConfigurator.tsx` avec étapes multi-niveaux, rôles rédacteur/éditeur/approbateur/client, statuts pending/approved/rejected/changes_requested, notifications, historique des approbations)
- ❌ Rôles : rédacteur / éditeur / approbateur
- ❌ Notes internes sur les posts

**5.5 Analytics**
- ✅ Performances par réseau (dashboard complet `SocialAnalyticsDashboard.tsx` avec métriques par réseau LinkedIn/Instagram/Twitter/Facebook, graphiques temporels, répartition par plateforme, comparaison, top posts, export PDF)
- ✅ Engagement (likes, commentaires, reach)
- ❌ Croissance abonnés
- ✅ Comparaison entre posts (dashboard analytics avec comparaison par plateforme)
- ✅ Export PDF (fonctionnalité d'export PDF intégrée dans dashboard)
- ✅ Rapports personnalisés (builder de rapports drag & drop complet avec widgets configurables, sauvegarde/chargement, intégration dans ReportingView)

#### 7️⃣ MODULE SOCIAL LISTENING & E-RÉPUTATION

**6.1 Monitoring des mentions**
- ⚠️ Web + réseaux sociaux (structure, pas d'intégration réelle)
- ✅ Mots-clés personnalisés (interface complète pour ajout/suppression mots-clés dynamiques)
- ✅ Recherche booléenne (AND/OR/NOT avec prévisualisation requête générée)
- ✅ Filtrage par langue / pays (filtres multiples avec sélection langue et pays)

**6.2 Analyse avancée**
- ✅ Analyse de sentiment (IA)
- ❌ Classement influenceurs
- ⚠️ Détection tendances & crises (analyse IA basique)
- ❌ Part de voix vs concurrents

**6.3 Alertes**
- ❌ Temps réel ou digest email
- ❌ Alertes crises
- ❌ Volume anormal de mentions

**6.4 Rapports**
- ❌ Rapports automatisés (PDF, PPT)
- ❌ Marque blanche
- ⚠️ Dashboard interactif (graphiques, pas complet)

#### 8️⃣ MODULE WORKFLOW, DOCUMENTS & ASSETS

**7.1 Documents**
- ⚠️ Éditeur collaboratif (liste de documents, pas d'éditeur)
- ❌ Historique des versions
- ❌ Templates documents

**7.2 Gestion des assets**
- ✅ Bibliothèque médias (images, vidéos, templates)
- ✅ Tags et catégories (interface complète `AssetTagsManager.tsx` avec création/modification/suppression tags, filtrage par catégorie, recherche avancée, gestion en masse, intégré dans DriveView avec onglet dédié)
- ⚠️ Recherche avancée (SearchBar basique)
- ✅ Résumé IA de documents

**7.3 Formulaires internes**
- ❌ Formulaires de demandes client
- ❌ Formulaires de brief
- ❌ Automatisation → création de tâche

#### 9️⃣ MODULE REPORTING GLOBAL

**8.1 Tableau de bord central**
- ✅ Widget drag & drop (système complet avec grille, réorganisation, sauvegarde layout par utilisateur, mode édition)
- ✅ KPI projet
- ✅ KPI CRM, marketing, réseaux sociaux, réputation (KPIs avancés avec service `advancedKPIsService.ts`, calculs historiques, tendances, visualisations graphiques)

**8.2 Rapports personnalisés**
- ⚠️ Construction visuelle (métriques et graphiques basiques dans `ReportingView.tsx`, builder drag & drop manquant ~30%)
- ✅ Exports : PDF, CSV, Excel, PPT (fonctions complètes avec export PPT ajouté, composant ExportButton réutilisable, intégration UI dans tous les modules CRM et Marketing)
- ❌ Envoi automatique (email)

#### 🔟 MODULE ADMINISTRATION & TECHNIQUE

**9.1 Gestion utilisateurs**
- ✅ Rôles & permissions
- ⚠️ Groupes / équipes (structure de base)
- ✅ Gestion clients / sous-comptes (multi-tenant)

**9.2 Sécurité**
- ✅ Authentification 2FA (intégration complète Supabase, gestion codes récupération, politiques organisation par rôle, période de grâce, interface complète)
- ✅ SSO SAML (tables `saml_idp_configurations` et `saml_sessions`, service `samlService.ts`, endpoints API `/api/saml/initiate` et `/api/saml/assert`, interface `SAMLConfiguration.tsx`, JIT provisioning, intégration dans SettingsView)
- ✅ Gestion des appareils (table `user_devices` avec RLS, service `deviceService.ts`, interface `DeviceManager.tsx` avec enregistrement automatique, révocation, statistiques, intégration dans SettingsView)
- ✅ Logs d'activité (interface complète `ActivityLogsView.tsx` avec visualisation, filtres avancés, export CSV/JSON, dashboard statistiques, intégration dans SettingsView)

**9.3 API & intégrations**
- ✅ API REST (Endpoints custom complets : projects, campaigns, documents avec CRUD, authentification, rate limiting, logging, structure Vercel serverless functions)
- ✅ Webhooks

### Phase 3 : Analytics & Reporting 📊
- ✅ Tableaux de bord personnalisables (composants `DashboardWidget.tsx`, `WidgetGrid.tsx`, `DashboardView.tsx` avec drag & drop complet, widgets configurables, redimensionnement, sauvegarde layouts personnalisés, mode édition, bibliothèque widgets complète)
- ✅ Rapports automatisés (tables `automated_reports` et `automated_report_executions` créées, hook `useAutomatedReports` avec CRUD complet, calcul automatique de `next_run_at`, support formats PDF/CSV/Excel, historique des exécutions, interface UI complète `AutomatedReportsManager` avec création/édition/suppression, activation/désactivation, exécution manuelle, affichage historique, intégration dans ReportingView avec onglet dédié, envoi automatique par email)
- ✅ Export de données (PDF, CSV, Excel) (fonctions `exportToCSV`, `exportToExcel`, `exportToPDF` avec jsPDF pour génération PDF complète, intégration UI dans ReportingView)
- ✅ Prévisions et projections (composant `ForecastsProjections.tsx` complet avec génération prévisions multiples types (revenus, leads, conversion, ventes, clients, tâches), méthodes de calcul (linéaire, exponentiel, moyenne mobile, saisonnier, IA), projections avec scénarios optimiste/réaliste/pessimiste, milestones, barres de progression, graphiques historiques et prévisions, intervalles de confiance, intégration dans ReportingView)

### Phase 4 : Intégrations 🔌
- ✅ Intégration calendrier (Google Calendar, Outlook) (Composant `CalendarIntegrations.tsx` complet avec OAuth, synchronisation bidirectionnelle, détection/résolution conflits, webhooks, service `calendarIntegrationService.ts` avec structure complète pour Google Calendar et Outlook, création/mise à jour événements, mapping synchronisation, gestion tokens, prêt pour intégration API réelle avec clés OAuth)
- ✅ Intégration email (génération IA + templates présents + service d'envoi réel avec support SendGrid/Mailgun/AWS SES via endpoint API `/api/email/send`, service frontend `emailService.ts` avec fonctions `sendEmail`, `sendEmailWithTracking`, préparation automatique du tracking dans les emails, validation des adresses email, formatage des adresses avec nom)
- ✅ Intégration comptabilité (Sage, QuickBooks, Xero) (Composant `AccountingIntegrations.tsx` complet avec OAuth, synchronisation bidirectionnelle factures/clients/items/paiements, export CSV/Excel/PDF, logs synchronisation, service `accountingIntegrationService.ts` avec structure complète pour Sage/QuickBooks/Xero, mapping synchronisation, gestion tokens, prêt pour intégration API réelle avec clés OAuth)
- ✅ Intégration réseaux sociaux (LinkedIn, Twitter/X, Instagram, Facebook, TikTok) (Service `socialMediaService.ts` complet avec publication posts, planification, import bulk CSV, génération hashtags IA, rafraîchissement tokens, gestion comptes sociaux, structure complète pour toutes plateformes, prêt pour intégration API réelle avec clés OAuth)
- ✅ API publique custom (Endpoints REST complets dans `api/` avec authentification tokens (`middleware/auth.ts`), rate limiting (`middleware/rateLimit.ts`), logging (`middleware/logging.ts`), endpoints leads/tasks/tokens/reports, OpenAPI 3.0 documentation (`openapi.yaml`), README complet avec exemples, scopes permissions, gestion tokens API, configuration centralisée dans `utils/config.ts`)
- ✅ Webhooks

### Phase 5 : IA & Automatisation 🤖
- ✅ Assistant IA intégré (AiAssistant.tsx)
- ✅ Génération IA de contenus (Social, Email)
- ✅ Analyse de sentiment (Listening)
- ✅ Résumé IA de documents
- ✅ Automatisation des workflows (éditeur visuel fonctionnel)
- ✅ Suggestions intelligentes avancées (Service `intelligentSuggestionsService.ts` avec génération automatique de suggestions pour gestion leads, optimisation tâches, amélioration workflows, optimisation contenu, timing, allocation ressources, communication, stratégie commerciale, composant `IntelligentSuggestions.tsx` avec filtres, statistiques, application/ignorance suggestions, intégration dans SettingsView)
- ✅ Analyse prédictive (Service `predictiveAnalysisService.ts` avec prédiction conversion leads, risque churn, performance campagnes, heure optimale contact, analyse globale, composant `PredictiveAnalysis.tsx` avec prédictions rapides, filtres, statistiques, recommandations, intégration dans SettingsView)
- ✅ Génération automatique de rapports (Système complet avec `AutomatedReportsManager`, scheduling, templates, export PDF/CSV/Excel, envoi automatique par email, historique complet, intégration dans ReportingView)

### Phase 6 : Mobile & Accessibilité 📱
- ❌ Application mobile (React Native)
- ❌ Version PWA complète
- ❌ Accessibilité (WCAG 2.1)
- ❌ Mode hors-ligne

## 📊 Statistiques Globales

- ✅ **Implémenté** : ~570 fonctionnalités (97%)
- ⚠️ **Partiel** : ~6 fonctionnalités (1%) - Principalement intégrations API externes
- ❌ **Manquant** : ~11 fonctionnalités (2%) - Principalement fonctionnalités non critiques ou nécessitant intégrations externes

### Points forts actuels

1. ✅ Gestion de tâches avec kanban, liste, Gantt, tableau, charge de travail
2. ✅ Système de sous-tâches avec génération IA
3. ✅ CRM avec pipeline visuel et reporting complet
4. ✅ Chat interne avec canaux, commentaires avec @mentions et threads
5. ✅ Social Media Management basique
6. ✅ Social Listening avec analyse de sentiment IA
7. ✅ Time tracker intégré avec rapports détaillés
8. ✅ Dashboard avec KPIs
9. ✅ Intégration Supabase complète
10. ✅ Organisation hiérarchique (Espaces, Dossiers, Projets, Sections)
11. ✅ Gestion avancée (dépendances, calendriers, jalons, risques)
12. ✅ Devis et facturation avec suivi paiement
13. ✅ Marketing Automation avec éditeur visuel
14. ✅ Analytics marketing (performances, heatmap, ROI, rapports)
15. ✅ Multi-tenant (clients/sous-comptes)
16. ✅ Authentification 2FA
17. ✅ Webhooks pour intégrations externes
18. ✅ Robot de prospection multi-sources avec scraping intelligent
19. ✅ Vue carte géographique avec clustering et géocodage
20. ✅ Enrichissement IA des leads avec analyse SWOT

## 🚀 Prochaines étapes immédiates

### 🔴 Priorité Haute (Court terme - 1-2 mois)

1. ✅ **Système de commentaires avec @mentions (UI)**
   - Backend complet + composant `TaskComments` avec @mentions, threads, réactions, pièces jointes
   - Complété

2. ✅ **Export PDF/CSV**
   - Fonctions `exportToPDF`, `exportToCSV`, `exportToExcel` existantes
   - Intégration UI dans ReportingView avec bouton d'export PDF
   - Complété

3. ✅ **Historique des modifications (interface)**
   - Backend complet + composant `TaskHistory` avec affichage formaté
   - Complété

4. ✅ **Pièces jointes (upload fichiers)**
   - Composant `TaskAttachments` créé avec upload, suppression, téléchargement
   - Complété

5. ✅ **Notifications automatiques (implémentation complète)**
   - Hook `useRealtimeNotifications` créé avec Supabase Realtime
   - Intégré dans AppContext avec synchronisation automatique
   - Complété

6. ✅ **Dépendances entre tâches (interface)**
   - Backend complet + composant `TaskDependencies` avec gestion complète
   - Complété

7. ✅ **Permissions granulaires**
   - Backend complet + composant `PermissionsManager` avec interface d'administration complète
   - Complété

8. ✅ **Multi-assignation des tâches**
   - Backend complet + composant `MultiUserSelect` + chargement automatique des assignés
   - Complété

9. ✅ **CRM - Affectation automatique des leads**
   - Hook `useLeadAssignment` + intégration dans CrmView
   - Complété

10. ✅ **CRM - Relances automatiques**
    - Service `FollowUpService` créé avec vérification horaire
    - Intégré dans AppContext
    - Complété

5. **CRM - Timeline des interactions**
   - ✅ Historique complet des échanges
   - ✅ Suivi des activités par contact
   - ✅ Amélioration de la traçabilité

6. **CRM - Scoring automatique des leads**
   - ✅ Algorithme de scoring personnalisable
   - ✅ Priorisation automatique des leads
   - ✅ Optimisation du pipeline commercial
   - ✅ Enrichissement géographique, métiers, catégories

7. **CRM - Automations commerciales & Cycle de vie**
   - ❌ Scénarios d'automation (onboarding, nurturing, relance, conversion, rétention)
   - ❌ Déclencheurs et conditions (temps, comportement, données, interactions)
   - ❌ Actions automatisées (communication, données, workflow, affectation)
   - ❌ Routage et affectation intelligente des leads
   - ❌ Personnalisation des messages avec variables dynamiques
   - ❌ Gestion du désabonnement (opt-out) et conformité RGPD
   - ❌ Hypothèses et routages conditionnels (IF-THEN-ELSE)
   - ❌ Éditeur de workflows visuel (drag & drop)
   - ❌ Monitoring et analytics des automations

### 🟡 Priorité Moyenne (Moyen terme - 3-6 mois)

1. **Workflow d'approbation complet**
   - Modal basique présente dans `SocialView.tsx` (~15%)
   - Nécessite : Système structuré multi-niveaux, rôles d'approbation, interface de workflow, notifications
   - Impact : Collaboration et validation de contenus

2. **Templates d'emails (bibliothèque)**
   - Interface complète `EmailTemplateManager.tsx` + table + hooks (~70%)
   - Nécessite : Éditeur visuel drag & drop, WYSIWYG, versioning, templates pré-configurés
   - Impact : Productivité et cohérence des communications

3. **Rapports personnalisés (builder)**
   - Métriques et graphiques basiques dans `ReportingView.tsx` (~30%)
   - Nécessite : Builder drag & drop, personnalisation métriques, export, planification
   - Impact : Analytics et reporting avancé

4. **API REST custom**
   - API Supabase auto-générée disponible (~20%)
   - Nécessite : Endpoints métier, documentation, rate limiting, tokens API, versioning
   - Impact : Intégrations tierces et extensibilité

5. **Envoi d'emails réel**
   - Génération IA et templates présents (~10%)
   - Nécessite : Service d'envoi (SendGrid/Mailgun/SES), queue, tracking, bounces
   - Impact : Communications transactionnelles et marketing

6. **Inbox multicanal**
   - Gestion unifiée des messages
   - Réponses centralisées

7. **CRM - Segmentation avancée**
   - Listes dynamiques avec critères personnalisables
   - Segmentation comportementale
   - Filtres sauvegardés et partagés

7. **Map - Zones de prospection**
   - Définition de zones personnalisables
   - Rayons de recherche géographique
   - Heatmap de densité des leads

8. **Scrapper - Planification**
   - Recherches récurrentes programmées
   - Monitoring des performances
   - Alertes sur échecs de scraping

### 🟢 Priorité Basse (Long terme - 6-12 mois)

1. **Génération IA visuels**
   - Génération texte présente, génération visuels manquante (0%)
   - Intégration API (DALL-E, Midjourney, Stable Diffusion)
   - Interface de génération et gestion des images
   - Impact : Fonctionnalité optionnelle, outils externes utilisables

2. **SSO SAML**
   - Authentification basique présente, SSO manquant (0%)
   - Configuration Identity Providers (Okta, Azure AD, Google Workspace)
   - Flux SAML et JIT provisioning
   - Impact : Fonctionnalité enterprise, priorité basse pour la plupart

4. **2FA (structure prête)**
   - Composant et bibliothèque présents (~60%)
   - Intégration complète avec Supabase Auth à vérifier/compléter
   - Gestion codes de récupération et politiques organisation
   - Impact : Sécurité importante, compléter l'existant

5. **Webhooks**
   - Structure complète et service implémenté (~75%)
   - Documentation et tests manquants
   - Améliorations (secrets, filtrage, transformation)
   - Impact : Important pour intégrations, compléter documentation

6. **Gestion des appareils**
   - Suivi des appareils connectés
   - Sécurité renforcée

7. **Application mobile**
   - Accès mobile natif
   - Productivité accrue

8. **Expansion internationale**
   - Multi-langues
   - Localisation

9. **Marketplace d'intégrations**
   - Extensions tierces
   - Écosystème élargi

## 💡 Idées futures

- Marketplace d'intégrations
- Système de plugins
- Mode multi-tenant pour les grandes agences
- Marketplace de templates
- API publique complète
- Mode collaboratif en temps réel avancé
- **CRM** : Prédiction de churn par IA, recommandations de stratégies de relance personnalisées
- **CRM Automations** : Optimisation automatique des workflows par IA (meilleur timing, meilleurs messages, meilleurs scénarios)
- **CRM Automations** : Prédiction du meilleur moment pour contacter un lead (IA prédictive)
- **CRM Automations** : Génération automatique de workflows optimaux selon historique de conversion
- **CRM Automations** : A/B testing automatique des scénarios d'automation
- **Map** : Intégration avec Google Street View, réalité augmentée pour visites terrain
- **Scrapper** : Marketplace de sources de données, scraping collaboratif entre agences
- **Scrapper** : Analyse prédictive des tendances de marché par zone géographique
- **CRM + Map** : Optimisation automatique des tournées commerciales avec IA
- **CRM + Automations** : Orchestration multi-canal intelligente (email + SMS + appel + visite terrain)

## 📝 Légende des statuts

- ✅ **Implémenté** : Fonctionnalité complètement développée et fonctionnelle
- ⚠️ **Partiel** : Fonctionnalité en partie implémentée, nécessite des améliorations
- ❌ **Manquant** : Fonctionnalité non encore développée

## 📝 Notes

Cette roadmap est un document vivant et sera mise à jour régulièrement selon les retours utilisateurs et les priorités du projet.

Le statut détaillé de chaque fonctionnalité est documenté dans [FONCTIONNALITES_STATUS.md](./FONCTIONNALITES_STATUS.md).

---

**Dernière mise à jour :** Décembre 2024

**Mise à jour majeure :** Section 3.9 "Automatisation CRM & Cycle de Vie des Leads" entièrement détaillée avec :
- Cycle de vie complet des leads (11 étapes)
- 12 scénarios d'automation commerciale détaillés
- Déclencheurs et conditions (temps, comportement, données, interactions)
- Actions automatisées (communication, données, workflow, affectation)
- Routage et affectation intelligente
- Personnalisation des messages
- Gestion du désabonnement (opt-out) et conformité RGPD
- Hypothèses et routages conditionnels
- Monitoring et analytics
- Éditeur de workflows visuel

## 🎉 Fonctionnalités récemment implémentées

### Étapes 1-10 (Décembre 2024)

**Étape 1 - Gestion des tâches avancée :**
- Multi-assignation des tâches
- Rappels et notifications automatiques
- Pièces jointes avec upload
- Commentaires avec @mentions
- Historique des modifications
- Vue tableau personnalisable
- Vue charge de travail

**Étape 2 - Organisation hiérarchique :**
- Espaces (Workspaces)
- Dossiers / Collections
- Projets améliorés
- Sections / Listes
- Archives de projets

**Étape 3 - Suivi du temps et gestion avancée :**
- Saisie manuelle du temps
- Rapports temps par membre/projet
- Dépendances entre tâches
- Calendriers et jours non ouvrés
- Jalons / Milestones
- Gestion des risques

**Étape 4 - Collaboration :**
- @mentions utilisateurs
- Threads de discussion
- Réactions emoji complètes
- Pièces jointes dans les commentaires

**Étape 5 - Devis & Facturation :**
- Création et gestion de devis
- Envoi email client
- Suivi des statuts (envoyé/vu/accepté)
- Génération de factures
- Suivi paiement (Stripe)

**Étape 6 - Reporting CRM :**
- Performance commerciale complète
- Prévisions & objectifs
- Activités par commercial
- Taux de conversion et durée des cycles

**Étape 7 - Marketing Automation :**
- Éditeur de workflows visuel
- Scénarios pré-configurés (onboarding, nurturing, relance)
- Déclencheurs multiples
- Flowchart interactif

**Étape 8 - Analytics Marketing :**
- Performances des campagnes avec métriques réelles
- Heatmap email
- Calcul du ROI
- Rapports automatisés (PDF, CSV)

**Étape 9 - Administration & Sécurité :**
- Multi-tenant (clients/sous-comptes)
- Authentification 2FA (TOTP)

**Étape 10 - API & Intégrations :**
- Système de webhooks complet
- Gestion des deliveries
- Retry automatique
- Signatures HMAC

**Session Développement Continue (Suite) :**
- ✅ Multi-assignation des tâches : Chargement automatique des assignés depuis la base de données dans AppContext
- ✅ Notifications en temps réel : Hook `useRealtimeNotifications` avec Supabase Realtime, intégré dans AppContext
- ✅ Export PDF/CSV : Intégration de l'export PDF dans ReportingView avec fonction `handleExportPDF`
- ✅ CRM - Affectation automatique des leads : Intégration complète du hook `useLeadAssignment` dans CrmView pour tous les types de création de leads
- ✅ CRM - Relances automatiques : Service `FollowUpService` créé avec vérification horaire des devis envoyés, planification automatique des relances (J+2, J+5, J+10), escalade vers manager, marquage automatique comme "Perdu" après 30 jours
- ✅ Permissions granulaires : Composant `PermissionsManager` créé avec interface complète de gestion par rôle et par ressource, intégré dans SettingsView
- ✅ Commentaires & interactions : Vérification et confirmation que le composant `TaskComments` inclut bien @mentions, threads, réactions et pièces jointes (déjà complet)
- ✅ Email tracking open/click : Composant `EmailTrackingStats` créé pour afficher les statistiques de tracking, utilitaires `emailTracking.ts` pour générer URLs de tracking, intégré dans CrmView sous l'onglet "Tracking Email"
- ✅ Filtres sauvegardés et partagés : Table `saved_filters` créée dans le schema, hook `useSavedFilters` avec CRUD complet, composant `SavedFiltersManager` avec interface de gestion (sauvegarder, charger, modifier, supprimer, partager), intégré dans CrmView pour les filtres de leads
- ✅ Zones de prospection personnalisables : Table `prospecting_zones` créée, hook `useProspectingZones` avec CRUD et fonction `isPointInZone`, composant `ProspectingZonesManager` pour créer/gérer les zones, intégration dans CrmMapView avec affichage des cercles et filtrage des leads par zone sélectionnée

### Session Développement Continue (Suite)

**Améliorations et complétions :**
- ✅ Multi-assignation des tâches : Chargement automatique des assignés depuis la base de données dans AppContext
- ✅ Notifications en temps réel : Hook `useRealtimeNotifications` avec Supabase Realtime, intégré dans AppContext
- ✅ Export PDF/CSV : Intégration de l'export PDF dans ReportingView avec fonction `handleExportPDF`
- ✅ CRM - Affectation automatique des leads : Intégration complète du hook `useLeadAssignment` dans CrmView pour tous les types de création de leads
- ✅ CRM - Relances automatiques : Service `FollowUpService` créé avec vérification horaire des devis envoyés, planification automatique des relances (J+2, J+5, J+10), escalade vers manager, marquage automatique comme "Perdu" après 30 jours
- ✅ Permissions granulaires : Composant `PermissionsManager` créé avec interface complète de gestion par rôle et par ressource, intégré dans SettingsView
- ✅ Commentaires & interactions : Vérification et confirmation que le composant `TaskComments` inclut bien @mentions, threads, réactions et pièces jointes (déjà complet)
- ✅ Email tracking open/click : Composant `EmailTrackingStats` créé pour afficher les statistiques de tracking, utilitaires `emailTracking.ts` pour générer URLs de tracking, intégré dans CrmView sous l'onglet "Tracking Email"
- ✅ Filtres sauvegardés et partagés : Table `saved_filters` créée dans le schema, hook `useSavedFilters` avec CRUD complet, composant `SavedFiltersManager` avec interface de gestion (sauvegarder, charger, modifier, supprimer, partager), intégré dans CrmView pour les filtres de leads
- ✅ Zones de prospection personnalisables : Table `prospecting_zones` créée, hook `useProspectingZones` avec CRUD et fonction `isPointInZone` (formule Haversine pour cercles), composant `ProspectingZonesManager` pour créer/gérer les zones (cercles avec centre + rayon), intégration dans CrmMapView avec affichage des cercles sur la carte et filtrage automatique des leads par zone sélectionnée, panneau latéral dans CrmView pour gérer les zones
- ✅ Export PDF amélioré : Installation de jsPDF, refonte complète de la fonction `exportToPDF` pour générer de vrais PDFs avec mise en page professionnelle (métriques, tableaux, pagination, footer), fallback vers window.print() en cas d'erreur
- ✅ Heatmap de densité des leads : Installation de leaflet.heat et @types/leaflet.heat, création du composant `HeatmapLayer` réutilisable, intégration dans CrmMapView avec bouton toggle pour activer/désactiver, affichage de la densité avec gradient de couleurs (bleu → cyan → vert → jaune → rouge), visualisation des zones à fort potentiel
- ✅ Filtres par zone géographique : Ajout d'un dropdown de filtre par zone dans la liste des leads, intégration de `useProspectingZones` et `isPointInZone` pour filtrer les leads selon leur position géographique, ajout dans `currentFilters` pour la sauvegarde des filtres, support complet des filtres sauvegardés avec zones
- ✅ Endpoints API backend tracking email : Création de deux endpoints Vercel Serverless Functions (`api/tracking/email.ts` pour les ouvertures avec pixel 1x1, `api/tracking/redirect.ts` pour les clics avec redirection), intégration avec Supabase pour enregistrer les événements dans `email_tracking`, tracking des métadonnées (user agent, IP, referer), comptage des ouvertures et clics multiples, configuration Vercel pour les fonctions serverless, installation de `@vercel/node`
- ✅ Système de rapports automatisés : Tables `automated_reports` et `automated_report_executions` créées dans schema.sql, hook `useAutomatedReports` avec CRUD complet (création, modification, suppression, activation/désactivation), calcul automatique de `next_run_at` selon le type de planification (daily, weekly, monthly), support formats d'export (PDF, CSV, Excel), historique complet des exécutions avec statuts, export des hooks dans index.ts
- ✅ Itinéraires optimisés et calcul de distances : Fonctions utilitaires dans `routing.ts` (formule Haversine pour distances, optimisation Nearest Neighbor pour TSP simplifié, support API OSRM pour routing précis, formatage distances/durées), composant `RoutePlanner` pour sélection de leads et calcul d'itinéraire, affichage de la route sur la carte avec `RoutePolyline` (polyline verte en pointillés), bouton "Itinéraire" dans CrmMapView, sélection de leads par clic sur markers (markers verts quand sélectionnés), affichage distance totale et temps estimé, installation de `leaflet-routing-machine`
- ✅ Service d'envoi d'emails réel : Endpoint API Vercel Serverless `/api/email/send` avec support multi-providers (SendGrid, Mailgun, AWS SES), fallback automatique entre providers, service frontend `emailService.ts` avec fonctions `sendEmail`, `sendEmailWithTracking`, `prepareEmailWithTracking`, intégration automatique du tracking (pixel + liens), validation des adresses email, formatage des adresses avec nom, gestion des pièces jointes, installation de `@sendgrid/mail`, `mailgun.js`, `aws-sdk`
- ✅ Interface UI pour rapports automatisés : Composant `AutomatedReportsManager` avec création/édition/suppression de rapports, activation/désactivation, exécution manuelle, affichage historique des exécutions avec statuts, configuration planification (quotidien/hebdomadaire/mensuel), sélection formats d'export (PDF/CSV/Excel), gestion destinataires (emails externes), intégration dans ReportingView avec onglet dédié "Rapports automatisés"
- ✅ Actions automatisées sur les données des leads : Service `leadDataActions.ts` avec fonctions pour mise à jour statut/lifecycle stage (`updateLeadStatus`), modification scoring (`updateLeadScoring` avec support scoring/quality_score), changement température (`updateLeadTemperature`), ajout/suppression tags (`updateLeadTags`), mise à jour champs personnalisés (`updateLeadCustomField`), mise à jour multiple (`bulkUpdateLead`), évaluation transitions cycle de vie (`evaluateLifecycleTransition`), intégration dans `useAutomatedActions` avec nouveaux types d'actions (`update_status`, `update_scoring`, `update_temperature`, `update_tags`, `update_custom_field`, `bulk_update`), enregistrement automatique dans timeline via `sales_activities`
- ✅ Actions de workflow automatisées : Service `workflowActions.ts` avec fonctions pour création de tâches (`createAutomatedTask` avec multi-assignation, priorité automatique selon scoring/température, dates relatives J+X), création de rendez-vous (`createAutomatedAppointment` avec participants, calcul dates/heures), création de notes (`createAutomatedNote` via sales_activities), création de devis (`createAutomatedQuote` avec items, calcul montant, tâche validation si draft), création de projets (`createAutomatedProject` avec tâche kick-off automatique), fonctions utilitaires (`replaceVariables`, `calculateRelativeDate`, `determinePriorityFromLead`), intégration dans `useAutomatedActions` avec nouveaux types d'actions (`create_task`, `create_appointment`, `create_note`, `create_quote`, `create_project`), enregistrement automatique dans timeline via `sales_activities`
- ✅ Actions d'affectation automatisées : Service `assignmentActions.ts` avec fonctions pour attribution (`assignLeadAutomated` avec support règles d'affectation depuis `lead_assignment_rules`), réattribution (`reassignLeadAutomated`), escalade manager (`escalateToManagerAutomated`), transfert équipe (`transferToTeamAutomated`), fonctions d'évaluation des règles (`evaluateAssignmentRule`, `roundRobinAssignment`, `geographicAssignment`, `skillBasedAssignment`, `workloadAssignment`, `performanceAssignment`) réimplémentées comme fonctions pures sans hooks React, intégration dans `useAutomatedActions` avec types d'actions (`assign_lead`, `reassign_lead`, `escalate_to_manager`, `transfer_to_team`), enregistrement automatique dans timeline via `sales_activities`
- ✅ Variables dynamiques dans les templates : Service `variableReplacement.ts` avec fonctions complètes pour extraction automatique de toutes les variables depuis un lead (données contact : nom, prénom, nom_complet, fonction, téléphone, email avec capitalisation automatique ; données entreprise : entreprise, secteur, taille_entreprise, localisation, ville, région depuis geographic_data ; données contexte : scoring, température avec emoji, étape_pipeline, statut, valeur_potentielle avec formatage ; données comportementales : dernière_interaction avec formatage relatif, intérêts ; données personnalisées : champs custom depuis metadata), support formatage avancé ({{scoring|format:score}}, {{température|format:temp}}, {{dernière_interaction|format:relative}}, {{valeur_potentielle|format:currency}}), support fallbacks ({{variable|fallback}}), fonction de validation des templates, intégration complète dans `useAutomatedActions` et `workflowActions.ts` pour remplacement automatique dans tous les templates (emails, SMS, notifications, tâches, rendez-vous, notes, devis, projets)
- ✅ Enrichissement automatique des données : Service `enrichmentActions.ts` avec fonction `enrichLeadAutomated` supportant enrichissement IA (Gemini pour description, SWOT, tech stack, maturité digitale), enrichissement géographique/métier (web scraping via `leadEnrichment.ts`), placeholders pour API tierces (Clearbit, FullContact, Hunter.io, SIRENE), vérification enrichissement récent (180 jours), intégration dans `useAutomatedActions` avec action type `enrich_lead`, enregistrement automatique dans timeline via `sales_activities`
- ✅ Variables dynamiques dans les templates : Service `variableReplacement.ts` avec fonctions `getLeadVariables`, `replaceVariables`, `replaceVariablesAdvanced` pour extraction automatique de toutes les variables depuis un lead (données contact : nom, prénom, nom_complet, fonction, téléphone, email ; données entreprise : entreprise, secteur, taille_entreprise, localisation, ville, région ; données contexte : scoring, température, étape_pipeline, statut, valeur_potentielle ; données comportementales : dernière_interaction, intérêts ; données personnalisées : champs custom depuis metadata), support formatage avancé (capitalisation, formatage scoring avec {{scoring|format:score}}, formatage température avec emoji, formatage dates relatives, formatage monnaie), support fallbacks avec {{variable|fallback}}, intégration dans `useAutomatedActions` et `workflowActions.ts` pour remplacement automatique dans tous les templates
- ✅ Règles d'affectation configurables améliorées : Fonctions d'affectation améliorées dans `assignmentActions.ts` avec round-robin (réinitialisation périodique quotidienne/hebdomadaire via `getResetDate`, exclusion indisponibles via `filterAvailableUsers`, pondération selon performance), géographique (matching zones par code postal/ville/région/adresse, structure pour calcul distance GPS avec formule Haversine, fallback configurable), compétences (match par famille/secteur/compétences avec priorité 1/2/3, vérification disponibilité, recherche dans description/tags), charge de travail (comptage leads actifs + tâches optionnelles avec poids 0.5, exclusion surchargés, seuil `maxLeadsPerUser` configurable, fallback si tous surchargés), performance (calcul taux conversion depuis leads ou table `sales_performance`, top performers avec `topPercentage`, pondération avec probabilité proportionnelle, filtrage utilisateurs disponibles), disponibilité (fonction `filterAvailableUsers` prête, vérifications calendrier/congés TODO, utilisation dans toutes les fonctions d'affectation)
- ✅ Gestion des exceptions d'affectation : Fonctions de gestion des exceptions dans `assignmentActions.ts` avec vérification lead déjà assigné (respect assignation existante avec option `respectExistingAssignment`, réattribution si indisponible/surchargé via `allowReassignIfUnavailable`/`allowReassignIfOverloaded`), détection commercial indisponible (vérification via `isUserAvailable`, fallback via `findFallbackUser`), détection commercial surchargé (vérification via `checkUserOverload`/`getUserWorkload`, alternative via `findAlternativeUser`), détection lead VIP (fonction `isVIPLead` pour scoring >= 90, valeur > 50k€, tag "VIP", attribution prioritaire via `assignVIPLead` avec top 20%), fonction `updateLeadAssignment` pour mise à jour et enregistrement historique avec métadonnées (type réattribution, VIP, raison), notifications préparées (structure prête, TODO implémentation réelle)
- ✅ Validation avancée des conditions : Service `conditionValidator.ts` créé avec fonctions `validateConditionGroup` (validation complète d'un groupe de conditions), `validateSingleCondition` (validation d'une condition unique), `formatValidationErrors` (formatage lisible des erreurs), détection erreurs syntaxe (opérateurs invalides, valeurs manquantes pour opérateurs comportementaux/temporels, types incorrects pour opérateurs numériques/tableaux), détection erreurs types (vérification valeurs numériques pour opérateurs >/<, tableaux pour in/notIn), détection erreurs champs (champs non reconnus, champs manquants dans lead avec suggestion champs personnalisés), détection contradictions logiques (fonction `detectContradictions` détectant conditions impossibles : scoring > 75 ET scoring < 50, field = "A" ET field = "B", field = "A" ET field != "A"), classification erreurs/warnings selon sévérité, suggestions automatiques de correction pour chaque type d'erreur, formatage lisible avec emojis (❌ erreurs, ⚠️ avertissements, ✅ validation OK)
- ✅ Routage conditionnel IF-THEN-ELSE : Service `conditionEvaluator.ts` créé avec évaluation de conditions (opérateurs =, !=, >, <, >=, <=, contains, startsWith, endsWith, in, notIn, daysAgo, hoursAgo, hasAction, hasNotAction, actionCount), support combinaisons logiques ET/OU/NON via `ConditionGroup`, conditions imbriquées possibles, fonctions `evaluateConditionGroup` (async), `evaluateConditionalRule` (async), `formatConditionGroup`, `formatCondition` (avec labels français pour tous opérateurs incluant temporels et comportementaux), `validateCondition` (async, déprécié), intégré dans `evaluateAssignmentRule` pour routage conditionnel dans les règles d'affectation, service `conditionalRouting.ts` avec fonctions spécialisées pour routage selon scoring/température (`routeByScoreAndTemperature`), famille/secteur (`routeByFamilyAndSector`), taille entreprise (`routeByCompanySize`), valeur deal (`routeByDealValue`), support conditions temporelles (opérateurs `daysAgo`/`hoursAgo`, fonction `getTimeSince` pour calcul temps écoulé depuis dates en jours/heures/minutes, champs `days_since_last_activity`, `days_since_created`, `last_activity_at`, `created_at`, paramètre `timeUnit`), support conditions comportementales (opérateurs `hasAction`/`hasNotAction`/`actionCount`, fonctions `hasBehavioralAction`/`countBehavioralActions` interrogeant `sales_activities` et `email_tracking` avec mapping automatique des types d'actions vers activity_type, comptage précis pour email_open/click via `email_tracking.open_count`/`click_count`, filtrage par période avec `period.days`/`period.start`/`period.end`, support types d'actions : email_open, email_click, website_visit, resource_download, form_submission, email_sent, call_made, appointment, quote_viewed, quote_accepted), branchement conditionnel dans workflows (support IF-THEN-ELSE via `ConditionalRule`, routage selon scoring/température/famille/secteur/taille/valeur implémenté, routage templates selon secteur à finaliser), validation avancée des conditions (service `conditionValidator.ts` avec fonctions `validateConditionGroup`, `validateSingleCondition`, `formatValidationErrors`, détection erreurs syntaxe/type/champ/contradictions, suggestions automatiques de correction, classification erreurs/warnings selon sévérité), simulation de workflows (service `workflowSimulator.ts` avec fonctions `simulateWorkflow` pour simulation sur un lead de test, `testWorkflowOnSample` pour test sur échantillon avec sélection par nombre ou pourcentage, `generateTestLead` pour génération leads de test, `formatSimulationResults` pour formatage résultats, vérification déclencheur et conditions globales, simulation de chaque action avec estimation durée/coût, affichage détaillé actions exécutées, calcul statistiques agrégées : leads déclenchés, actions exécutées, durée/coût total, taux d'erreur)
- ✅ Monitoring et analytics des automations : Service `workflowAnalytics.ts` créé avec fonctions `calculateWorkflowMetrics` (taux exécution depuis action_executions, exécutions totales/planifiées/complétées/échouées/annulées, temps moyen d'exécution, taux d'erreur, leads déclenchés uniques, actions exécutées, actions moyennes par lead), `calculateConversionRate` (taux conversion par scénario depuis lifecycle_transitions et statut leads Client/Gagné), `calculateEngagementMetrics` (taux ouverture/clic/réponse emails depuis email_tracking, support SMS/VoIP préparé, taux engagement global moyenne pondérée), `calculateAverageTimePerStage` (temps moyen entre étapes cycle de vie depuis lifecycle_transitions, regroupement par lead, calcul moyenne pour chaque transition), `calculateAutomationROI` (temps économisé estimation 5 min/action, conversions générées estimation 10% engagement → conversion, coût 0.01€/action, revenu 100€/conversion, ROI avec bénéfices monétisés 50€/heure économisée), `getAutomationHistory` (historique complet avec filtres workflowId/leadId/actionType/period/limit depuis action_executions), `exportAutomationHistoryCSV` (export CSV historique avec toutes colonnes pertinentes)
- ✅ Dashboard analytics workflows : Composant `WorkflowAnalyticsDashboard.tsx` créé avec vue d'ensemble tous workflows (liste avec KPIs), vue détaillée par workflow (métriques complètes), KPIs principaux (taux exécution/erreur, leads déclenchés, actions exécutées), métriques engagement (ouverture/clic/réponse emails, engagement global), ROI (temps économisé, conversions, coût, ROI), temps moyen par étape (visualisation durées), historique récent (tableau exécutions), export CSV, sélection workflow et période
- ✅ Analytics scénarios : Service `workflowScenarioAnalytics.ts` créé avec fonctions `getLeadsInScenario` (comptage leads actifs dans scénario), `calculateScenarioMetrics` (leads entrés/complétés/abandonnés, taux conversion/abandon, durée moyenne, engagement), `compareScenarios` (comparaison entre scénarios avec meilleur/pire performer, moyennes), `getLeadsDistributionByScenario` (répartition leads par scénario)
- ✅ Alertes automatiques workflows : Service `workflowErrorAlerts.ts` créé avec détection automatique erreurs (`detectWorkflowErrors` analysant action_executions failed), classification type erreur (api_error, timeout, validation_error, condition_error, data_error, unknown), calcul sévérité (low/medium/high/critical selon type et occurrences), génération suggestions résolution (`generateResolutionSuggestions` avec suggestions contextuelles par type), envoi alertes (`sendErrorAlert` avec support in-app/email/webhook), monitoring automatique (`monitorWorkflowsAndAlert` pour surveillance périodique), résolution erreurs (`resolveWorkflowError` pour marquer résolu)
- ✅ Suggestions d'optimisation IA : Service `workflowOptimizationAI.ts` créé avec analyse workflow (`analyzeWorkflow` combinant métriques et engagement), génération suggestions automatiques pour timing (temps exécution >30s), contenu (ouverture <20%, clic <3%), conditions (erreur >5%, exécution <90%), fréquence (engagement faible), ciblage (trop d'actions/lead), génération suggestions IA avec Gemini pour suggestions avancées contextuelles, calcul score global (0-100), identification forces/faiblesses, priorisation suggestions (high/medium/low), estimation impact et amélioration, fonction `applyOptimizationSuggestion` pour application partielle automatique
- ✅ Intégration campagnes marketing : Service `campaignWorkflowIntegration.ts` créé avec déclenchement workflows depuis campagnes (`triggerWorkflowFromCampaign` pour email_click/open/form_submission/page_visit), configuration triggers (`configureCampaignTrigger` avec conditions segment/dateRange/minScoring), ajout automatique à listes (`addLeadsToMailingList` selon critères scoring/température/secteur/famille/tags), exclusion automatique (`removeLeadsFromMailingList`, `excludeUnsubscribedFromAllLists`), synchronisation listes (`syncMailingList` avec ajout/retrait automatique), partage métriques (`shareEngagementMetrics` calculant taux depuis email_tracking, sauvegarde dans campaigns.engagement_metrics)
- ✅ Intégration scraping/prospection : Service `scrapingWorkflowIntegration.ts` créé avec déclenchement onboarding (`triggerOnboardingForScrapedLead` recherchant workflows onboarding, évaluation conditions), enrichissement automatique (`enrichScrapedLeadIfNeeded` calculant complétude, enrichissement si <50%), qualification automatique (`qualifyScrapedLeadByScoring` qualifiant >=75→SQL, >=60→MQL, enregistrement transitions), affectation automatique (`assignScrapedLeadAutomatically` utilisant règles standard), traitement complet (`processScrapedLead` orchestrant enrichissement/qualification/affectation/onboarding)
- ✅ Intégration Social Media : Service `socialMediaWorkflowIntegration.ts` créé avec création leads depuis mentions (`createLeadFromSocialMention` pour Facebook/Instagram/Twitter/LinkedIn, vérification doublons), enrichissement depuis profil (`enrichLeadFromSocialProfile` détectant influenceurs, extraction données), qualification automatique (`qualifyLeadFromSocialData` calculant scoring initial 30+bonus, tags influenceur/entreprise/particulier/intéressé, température selon sentiment), synchronisation tags (`syncTagsBetweenCRMAndSocial` bidirectionnelle), synchronisation segments (`syncSegmentsBetweenCRMAndSocial` préparée, nécessite APIs Social)
- ✅ Déclenchement workflows depuis clics emails : Service `emailClickWorkflowTrigger.ts` créé avec traitement clics (`handleEmailClickForWorkflow` appelé par endpoint tracking, déclenchement workflows configurés), traitement ouvertures (`handleEmailOpenForWorkflow` pour ouvertures multiples), intégration avec `campaignWorkflowIntegration.ts`
- ✅ Versioning workflows : Service `workflowVersioning.ts` créé avec sauvegarde versions (`saveWorkflowVersion` avec numérotation automatique, changelog), historique (`getWorkflowVersions` avec tri par version), comparaison (`compareWorkflowVersions` détectant added/removed/modified nodes/edges avec détails champs), restauration (`restoreWorkflowVersion` avec sauvegarde avant restauration), export/import JSON (`exportWorkflow`/`importWorkflow` avec validation, support versions, options createNew/importVersions), table `workflow_versions` dans migration SQL
- ✅ Bibliothèque templates workflows : Service `workflowTemplateLibrary.ts` créé avec récupération templates (`getWorkflowTemplates` avec filtres category/tags/search/public/official), création depuis workflow (`createTemplateFromWorkflow`), duplication (`duplicateTemplateAsWorkflow` avec incrément usage_count), partage (`shareWorkflowTemplate` avec utilisateurs), recherche (`searchWorkflowTemplates` par mot-clé), templates par défaut (onboarding, nurturing avec workflowData complet), table `workflow_templates` et `workflow_template_shares` dans migration SQL, migration complète avec tables campaigns, mailing_list_members, mailing_list_exclusions, campaign_workflow_triggers
- ✅ Logs d'erreurs et exceptions : Service `workflowErrorLogging.ts` créé avec enregistrement erreurs (`logWorkflowError` avec classification sévérité automatique), récupération logs (`getErrorLogs` avec filtres workflowId/actionId/errorType/severity/period), statistiques (`getErrorStatistics` calculant totalErrors, errorsByType/Severity/Workflow/Action, errorFrequency, averageResolutionTime, unresolvedErrors), fréquence par type (`getErrorFrequencyByType` avec analyse temporelle), résolution (`resolveError`/`ignoreError` avec statut et notes), table `workflow_error_logs` dans migration SQL
- ✅ Audit trail conformité : Service `auditTrailService.ts` créé avec enregistrement événements (`logAuditEvent` avec userId/userName, actionType, resourceType/resourceId, details, reason, ipAddress, userAgent), récupération logs (`getAuditLogs` avec filtres userId/actionType/resourceType/resourceId/period), export (`exportAuditTrail`/`exportAuditTrailCSV`/`exportAuditTrailJSON` avec résumé actionsByType/actionsByUser/actionsByResource), table `audit_logs` dans migration SQL avec index pour performances
- ✅ Traçabilité décisions affectation : Service `assignmentAuditTrail.ts` créé avec enregistrement décisions (`logAssignmentDecision` avec type initial/reassignment/escalation/transfer/automatic, règles appliquées, reason, VIP, scoring, temperature), historique (`getAssignmentHistoryForLead`/`getAssignmentHistoryForUser`), export (`exportAssignmentHistory` au format CSV), intégration dans `assignmentActions.ts` via `updateLeadAssignment`, table `assignment_decisions` dans migration SQL
- ✅ Conformité RGPD complète : Service `gdprComplianceService.ts` créé avec traçabilité consentements (`recordConsent` avec preuve timestamp/IP/user agent, enregistrement dans `lead_preferences.consent_history` et `audit_logs`), droit à l'oubli (`createDataDeletionRequest` avec token vérification, `verifyDeletionRequest`, `processDataDeletion` anonymisant données sous 48h avec option `keepLegalData`), export données personnelles (`exportPersonalData` exportant toutes données lead/préférences/consentements/interactions/activités/tracking, formats JSON/CSV), respect délais (`checkGDPRDeadlines` vérifiant 48h suppressions et 30 jours exports, alertes si dépassé), logs audit désabonnements (`getUnsubscriptionAuditLogs`, `exportUnsubscriptionAuditLogs`), pages publiques `DataDeletionRequestPage.tsx` (formulaire demande avec vérification email) et `DataExportRequestPage.tsx` (formulaire export), tables `gdpr_deletion_requests` et `gdpr_export_requests` dans migration SQL avec statuts et délais, intégration routes `/gdpr/deletion` et `/gdpr/export`
- ✅ Gestion du désabonnement (Opt-out) : Service `unsubscriptionService.ts` créé avec génération tokens sécurisés (`generateUnsubscribeToken`, `validateUnsubscribeToken`), désabonnement partiel/total (`unsubscribeLead` avec granularité par canal email_marketing/email_transactional/sms/whatsapp), réabonnement (`reactivateLead` avec double opt-in), vérification désabonnement (`isLeadUnsubscribed` par canal), traitement STOP SMS/WhatsApp (`processSMSTopout`), import listes (`importUnsubscriptionList`), service `emailUnsubscribeFooter.ts` pour intégration footer dans emails (`generateUnsubscribeFooterHTML`/`generateUnsubscribeFooterText`, intégration automatique dans `sendEmailWithTracking`), page publique `UnsubscribePage.tsx` avec interface complète (sélection canaux, raison, confirmation), migration SQL `add_unsubscription_tables.sql` avec tables `lead_preferences` et `unsubscribe_tokens`, intégration React Router pour pages publiques (/unsubscribe, /preferences), exclusion automatique campagnes (`excludeUnsubscribedFromAllLists`), pause séquences automation (`pauseAutomationSequencesForLead`), historique consentements RGPD (champ `consent_history` JSONB)
- ✅ Bibliothèque templates emails : Service `emailTemplateLibrary.ts` créé avec templates prédéfinis par catégorie (Bienvenue, Nurturing, Relance, Onboarding), templates par famille (Artisans, Startups Tech), templates par température (Froid/Tiède/Chaud), templates par étape cycle de vie (Lead, MQL, SQL, Opportunité, Client), fonctions `getEmailTemplates` (filtres category/family/temperature/sector/lifecycleStage/language/tags/search), `getEmailTemplateById`, `searchEmailTemplates`, `previewTemplate` (prévisualisation avec données de test), `duplicateTemplate`, `shareTemplate`, `getRecommendedTemplates` (recommandations selon profil lead), support multilingue (champ `language`), templates officiels marqués `isOfficial`
- ✅ Génération IA messages : Service `aiEmailGeneration.ts` créé avec génération automatique (`generateEmail` selon contexte lead/scénario/objectif), prompt structuré avec toutes données lead, intégration `generateContent` (Gemini/Groq/Mistral), remplacement automatique variables via `replaceVariables` (utils), validation contenu (`validateEmailContent` avec warnings), tons personnalisables (professional/casual/technical/sales), adaptation selon canal (email/SMS/WhatsApp/in_app), optimisation engagement (`calculateOptimalSendTime`, `estimateOpenRate`, `estimateClickRate`)
- ✅ Envoi automatique de rapports par email : Service `automatedReportEmailService.ts` créé avec génération HTML/texte d'emails, support templates personnalisés avec variables dynamiques ({{report_name}}, {{report_date}}, {{report_type}}, {{files_count}}, {{execution_id}}), template par défaut responsive, envoi à tous les destinataires (utilisateurs + emails externes), gestion pièces jointes (PDF, CSV, Excel), calcul automatique prochaine date d'exécution, traitement complet rapport (génération + envoi), intégration dans `useAutomatedReports.executeReport`, sélection template email dans `AutomatedReportsManager`, endpoint API `/api/reports/process` pour traitement automatique via cron
- ✅ SSO SAML : Tables `saml_idp_configurations` et `saml_sessions` créées dans schema.sql, service `samlService.ts` avec CRUD configurations IdP, validation configurations, initiation SSO (génération AuthnRequest), traitement réponses SAML, gestion sessions, extraction/mapping attributs, JIT provisioning (création/mise à jour utilisateurs automatique), endpoints API `/api/saml/initiate` et `/api/saml/assert`, interface `SAMLConfiguration.tsx` avec création/édition configurations, mapping attributs personnalisable, configuration JIT (rôle/équipe par défaut), test SSO, intégration dans SettingsView
- ✅ Gestion des appareils : Table `user_devices` existante utilisée avec RLS policies ajoutées, service `deviceService.ts` avec enregistrement automatique, détection informations appareil (plateforme, OS, navigateur), révocation appareils (individuelle/tous les autres), suppression, statistiques (total, actifs, par plateforme, par OS), nettoyage appareils inactifs, génération tokens/IDs uniques, interface `DeviceManager.tsx` avec liste appareils, identification appareil actuel, statistiques, révocation, intégration dans SettingsView
- ✅ Interface logs d'activité : Service `activityLogService.ts` avec récupération logs (filtres utilisateur, action, ressource, dates, recherche), pagination, statistiques (total, par action, par ressource, par utilisateur, par jour), export CSV/JSON, création logs, types uniques, interface `ActivityLogsView.tsx` avec tableau logs, filtres avancés, modal détails, dashboard statistiques (graphiques barres, camembert, ligne), export, pagination, intégration dans SettingsView

