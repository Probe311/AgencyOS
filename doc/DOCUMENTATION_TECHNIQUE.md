# Documentation Technique - AgencyOS

Ce document détaille la documentation technique de l'application AgencyOS, couvrant l'architecture, l'API, et les guides de contribution.

---

## 📋 Table des matières

1. [Architecture Technique](#architecture-technique)
2. [Documentation API](#documentation-api)
3. [Guide de Contribution](#guide-de-contribution)

---

## 🏗️ Architecture Technique

### Vue d'ensemble

AgencyOS est une application web moderne construite avec une architecture frontend-backend séparée :

- **Frontend** : React 18 + TypeScript + Vite
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Styling** : Tailwind CSS + Design System custom
- **État global** : Zustand
- **IA** : Google Gemini API (avec fallback Groq/Mistral)

### Structure du projet

```
AgencyOS/
├── frontend/                 # Application React
│   ├── components/          # Composants React
│   │   ├── views/          # Vues principales (modules)
│   │   ├── ui/             # Composants UI réutilisables
│   │   ├── crm/            # Composants CRM
│   │   ├── marketing/      # Composants Marketing
│   │   ├── projects/       # Composants Projets
│   │   └── ...
│   ├── lib/                # Bibliothèques et utilitaires
│   │   ├── supabase/       # Intégration Supabase
│   │   │   └── hooks/     # Hooks React pour Supabase (87 hooks)
│   │   ├── services/       # Services (reminder, webhook, integrations)
│   │   ├── utils/          # Utilitaires (scoring, validation, export)
│   │   └── ai-client.ts    # Client IA (Gemini/Groq/Mistral)
│   ├── store/              # État global (Zustand)
│   ├── types.ts            # Types TypeScript globaux
│   └── ...
├── supabase/               # Base de données et migrations
│   ├── schema.sql          # Schéma complet de la base de données
│   └── migrations/         # Migrations SQL
├── scripts/                # Scripts utilitaires
└── doc/                    # Documentation
```

### Architecture Frontend

#### Technologies principales

- **React 18.2.0** : Bibliothèque UI
- **TypeScript 5.8** : Typage statique
- **Vite 6.2** : Build tool et dev server
- **Tailwind CSS 3.4** : Framework CSS utility-first
- **Zustand 4.5** : Gestion d'état global (léger)
- **Framer Motion 10.16** : Animations
- **Recharts 2.12** : Graphiques et visualisations
- **Leaflet 1.9** : Cartes interactives
- **Lucide React 0.263** : Icônes

#### Organisation des composants

**1. Vues principales (`components/views/`)**
Chaque module de l'application correspond à une vue :
- `DashboardView.tsx` - Tableau de bord principal
- `ProjectsView.tsx` - Gestion de projets (kanban, liste, Gantt)
- `CrmView.tsx` - CRM et pipeline commercial
- `MarketingView.tsx` - Marketing et automations
- `SocialView.tsx` - Social Media Management
- `ReportingView.tsx` - Rapports et analytics
- `ChatView.tsx` - Chat interne
- `SettingsView.tsx` - Paramètres
- etc.

**2. Composants UI (`components/ui/`)**
Composants réutilisables selon le Design System :
- `Button.tsx`, `Input.tsx`, `Modal.tsx`, `Dropdown.tsx`
- `Card.tsx`, `Badge.tsx`, `Loader.tsx`, `Toast.tsx`
- `PageLayout.tsx`, `PageHeader.tsx`, `PageSidebar.tsx`

**3. Composants métier (`components/crm/`, `components/marketing/`, etc.)**
Composants spécifiques à chaque domaine :
- CRM : `LeadTimeline.tsx`, `LeadScoringConfig.tsx`, `CrmMapView.tsx`
- Marketing : `EmailTemplateManager.tsx`, `MarketingAutomationManager.tsx`
- Projects : `ProjectDetailsView.tsx`, `MilestonesView.tsx`, `RisksView.tsx`

**4. Contextes (`components/contexts/`)**
- `AppContext.tsx` - Contexte global (toast, modals)
- `AuthContext.tsx` - Contexte d'authentification

#### Patterns architecturaux

**1. Hooks Supabase**
87 hooks React customisés pour interagir avec Supabase :
- Pattern : `use[NomTable]()` ou `use[NomFeature]()`
- Exemples : `useTasks()`, `useLeads()`, `useEmailTemplates()`, `usePermissions()`
- Localisation : `frontend/lib/supabase/hooks/`
- Types : Générés automatiquement depuis le schéma Supabase

**2. Services**
Services métier pour fonctionnalités complexes :
- `reminderService.ts` - Gestion des rappels automatiques
- `webhookService.ts` - Gestion des webhooks
- `integrations/` - 28 intégrations préparées (Stripe, Slack, etc.)

**3. Utilitaires**
Fonctions réutilisables par domaine :
- `leadScoring.ts` - Calcul du scoring des leads
- `leadValidation.ts` - Validation des données leads
- `leadEnrichment.ts` - Enrichissement des leads
- `export.ts`, `exportLeads.ts` - Exports de données
- `duplicateDetection.ts` - Détection de doublons

**4. Store global (Zustand)**
- `useAppStore.ts` - État global de l'application
- Utilisé pour : utilisateur courant, préférences, état UI global

#### Routing et navigation

- Routing côté client avec React Router (implicite dans l'architecture)
- Navigation via `Sidebar.tsx` avec gestion des vues actives
- `CommandPalette.tsx` - Raccourcis clavier pour navigation

### Architecture Backend (Supabase)

#### Structure de la base de données

**Tables principales** :
- `users` - Utilisateurs et rôles
- `workspaces` - Espaces de travail
- `folders` - Dossiers/Collections
- `projects` - Projets
- `tasks` - Tâches avec sous-tâches
- `leads` - Leads et contacts CRM
- `social_posts` - Publications sociales
- `email_templates` - Templates d'emails
- `automation_workflows` - Workflows d'automatisation
- `notifications` - Notifications
- ... (40+ tables au total)

**Relations** :
- Hiérarchie : Workspaces → Folders → Projects → Tasks
- CRM : Leads → Sales Activities → Quotes → Invoices
- Social : Social Posts → Social Comments → Social Reactions

**Row Level Security (RLS)** :
- Politiques RLS activées sur toutes les tables
- Sécurité basée sur les rôles et les workspaces
- Isolation multi-tenant

#### Authentification

- **Supabase Auth** : Gestion complète de l'authentification
- **2FA (TOTP)** : Implémenté via `TwoFactorAuth.tsx`
- **Rôles** : SuperAdmin, Admin, Manager, Éditeur, Lecteur
- **Sessions** : Gestion automatique par Supabase

#### Stockage (Storage)

- **Supabase Storage** : Préparé mais utilisation limitée actuellement
- Buckets prêts pour : pièces jointes, avatars, documents

#### Realtime

- **Supabase Realtime** : Préparé pour notifications temps réel
- Abonnements configurés dans certains hooks (ex: `useTaskDependencies`)
- Pas encore utilisé pleinement pour les notifications

### Flux de données

```
┌─────────────┐
│   React     │
│  Frontend   │
└──────┬──────┘
       │
       │ Hooks (useTasks, useLeads, etc.)
       │
┌──────▼─────────────────┐
│   Supabase Client      │
│   (lib/supabase.ts)    │
└──────┬─────────────────┘
       │
       │ REST API / WebSocket
       │
┌──────▼──────────────┐
│   Supabase          │
│   - PostgreSQL      │
│   - Auth            │
│   - Storage         │
│   - Realtime        │
└─────────────────────┘
```

### Intégration IA

**Client IA** (`lib/ai-client.ts`) :
- Support multi-providers : Gemini (prioritaire), Groq, Mistral
- Fallback automatique entre providers
- Utilisé pour :
  - Génération de contenus (emails, posts sociaux)
  - Analyse de sentiment
  - Enrichissement de leads (description, SWOT)
  - Qualification de leads
  - Résumé de documents

---

## 📡 Documentation API

### État actuel

#### API Supabase auto-générée

**Disponibilité** :
- ✅ API REST automatique pour toutes les tables Supabase
- ✅ Documentation Swagger disponible (via interface Supabase)
- ✅ Authentification intégrée (Supabase Auth)
- ✅ Row Level Security (RLS) appliqué

**Endpoints disponibles** :
Tous les endpoints suivent le pattern Supabase standard :
```
GET    /rest/v1/{table}           # Liste des enregistrements
GET    /rest/v1/{table}?id=eq.{id} # Détails d'un enregistrement
POST   /rest/v1/{table}           # Création
PATCH  /rest/v1/{table}?id=eq.{id} # Mise à jour
DELETE /rest/v1/{table}?id=eq.{id} # Suppression
```

**Tables exposées** :
- `users`, `workspaces`, `folders`, `projects`, `tasks`
- `leads`, `sales_activities`, `quotes`, `invoices`
- `social_posts`, `email_templates`, `automation_workflows`
- `notifications`, `permissions`, `role_permissions`
- ... (40+ tables)

**Authentification** :
```javascript
Headers: {
  "apikey": "{SUPABASE_ANON_KEY}",
  "Authorization": "Bearer {JWT_TOKEN}"
}
```

#### Utilisation dans le frontend

**Client Supabase** (`lib/supabase.ts`) :
```typescript
import { supabase } from '@/lib/supabase';

// Exemple d'utilisation
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId);
```

**Hooks React** :
87 hooks customisés encapsulent les appels API :
```typescript
// Exemple avec useTasks
const { tasks, loading, createTask, updateTask } = useTasks(projectId);
```

### Documentation manquante

#### ❌ Documentation API complète (OpenAPI/Swagger custom)

**État actuel** :
- ✅ Swagger auto-généré par Supabase (basique)
- ❌ Documentation custom manquante

**À créer** :
- Documentation OpenAPI/Swagger complète et personnalisée
- Exemples de requêtes/réponses pour chaque endpoint
- Codes d'erreur et messages d'erreur standardisés
- Limitations et quotas par endpoint
- Guide d'authentification détaillé
- Exemples d'utilisation par langage (JavaScript, Python, etc.)

**Recommandation** :
- Utiliser OpenAPI 3.0
- Générer automatiquement depuis le schéma Supabase
- Intégrer dans la documentation du projet

#### ❌ API REST custom (endpoints métier)

**État actuel** :
- ✅ API Supabase auto-générée (CRUD basique)
- ❌ Endpoints métier custom manquants

**Endpoints manquants** :
- `/api/leads/enrich` - Enrichissement de leads
- `/api/leads/score` - Calcul de scoring
- `/api/projects/summary` - Résumé de projet
- `/api/dashboard/stats` - Statistiques agrégées
- `/api/tasks/bulk-update` - Mise à jour en masse
- `/api/email/send` - Envoi d'emails
- `/api/reports/generate` - Génération de rapports
- `/api/integrations/webhook` - Webhooks entrants

**Recommandation** :
- Créer une API custom avec Supabase Edge Functions
- Ou créer un serveur Node.js/Express séparé
- Documenter avec OpenAPI

#### ❌ Rate limiting et quotas

**État actuel** :
- ⚠️ Rate limiting géré par Supabase (limites par défaut)
- ❌ Pas de quotas personnalisés par utilisateur/workspace

**À implémenter** :
- Rate limiting par endpoint
- Quotas par utilisateur/workspace
- Monitoring et alertes

#### ❌ Versioning d'API (v1, v2)

**État actuel** :
- ✅ API REST sans versioning

**Structure actuelle** :
- Endpoints API directement sous `/api/` (sans versioning)
- Tous les endpoints dans `/api/` avec middleware centralisé (auth, rate limiting, logging)
- Configuration centralisée dans `/api/utils/config.ts`
- Documentation par version

#### ❌ Authentification par tokens API (clés API)

**État actuel** :
- ✅ Authentification par JWT (Supabase Auth)
- ❌ Pas de tokens API pour intégrations tierces

**À implémenter** :
- Génération de clés API par utilisateur/workspace
- Gestion des permissions par clé API
- Rotation de clés API
- Interface de gestion des clés API

#### ❌ Documentation des webhooks

**État actuel** :
- ✅ Système de webhooks implémenté (`webhookService.ts`)
- ❌ Documentation des événements webhooks manquante

**À documenter** :
- Liste des événements disponibles
- Format des payloads webhooks
- Sécurité (signatures HMAC)
- Exemples d'intégration

### Plan d'action pour la documentation API

**Phase 1 - Documentation de l'API existante** :
1. Générer documentation OpenAPI depuis le schéma Supabase
2. Ajouter exemples de requêtes/réponses
3. Documenter les hooks React disponibles
4. Créer guide de démarrage rapide

**Phase 2 - API custom** :
1. Définir endpoints métier nécessaires
2. Implémenter avec Supabase Edge Functions
3. Documenter avec OpenAPI
4. Ajouter tests et exemples

**Phase 3 - Améliorations** :
1. Rate limiting et quotas
2. Versioning d'API
3. Tokens API
4. Documentation webhooks complète

---

## 👥 Guide de Contribution

### État actuel

Le guide de contribution existe (`doc/CONTRIBUTING.md`) mais peut être complété avec plus de détails.

### Contenu existant

✅ **Éléments présents** :
- Processus de fork/clone
- Création de branches
- Installation des dépendances
- Standards de code de base
- Conventions de commit (Conventional Commits)
- Processus de Pull Request

### Éléments à compléter

#### 1. Environnement de développement détaillé

**À ajouter** :
- Configuration des variables d'environnement détaillée
- Configuration locale de Supabase
- Configuration des clés API (Gemini, etc.)
- Scripts de développement disponibles
- Dépannage des problèmes courants

**Exemple de contenu** :
```markdown
### Configuration de l'environnement

1. **Variables d'environnement** :
   Créer un fichier `.env.local` à la racine :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   GEMINI_API_KEY=votre_cle_gemini
   ```

2. **Configuration Supabase locale** (optionnel) :
   ```bash
   npx supabase init
   npx supabase start
   ```

3. **Scripts disponibles** :
   ```bash
   npm run dev          # Démarre le serveur de développement
   npm run build        # Build de production
   npm run preview      # Preview du build
   ```
```

#### 2. Standards de code détaillés

**À ajouter** :
- Conventions de nommage (fichiers, composants, fonctions)
- Structure des composants React
- Gestion des erreurs
- Gestion des types TypeScript
- Commentaires et documentation du code
- Tests (quand ajoutés)

**Exemple de contenu** :
```markdown
### Standards de code

#### Nommage
- **Composants** : PascalCase (`UserProfile.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useTasks.ts`)
- **Utilitaires** : camelCase (`leadScoring.ts`)
- **Types** : PascalCase (`Task`, `Lead`)

#### Structure d'un composant React
```typescript
// 1. Imports
import React, { useState } from 'react';
import { useTasks } from '@/lib/supabase/hooks/useTasks';

// 2. Types/Interfaces
interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

// 3. Composant
export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate }) => {
  // Hooks
  const [loading, setLoading] = useState(false);
  
  // Handlers
  const handleUpdate = async () => {
    // ...
  };
  
  // Render
  return (
    // JSX
  );
};
```

#### Types TypeScript
- Toujours typer les props des composants
- Utiliser les types depuis `types.ts` quand disponibles
- Éviter `any`, utiliser `unknown` si nécessaire
- Documenter les types complexes
```

#### 3. Processus de développement

**À ajouter** :
- Workflow Git (branches, commits, PR)
- Code review guidelines
- Tests (unitaires, intégration, E2E)
- Checklist avant PR
- Processus de release

**Exemple de contenu** :
```markdown
### Workflow de développement

1. **Créer une branche** :
   ```bash
   git checkout -b feature/nom-fonctionnalite
   # ou
   git checkout -b fix/nom-bug
   ```

2. **Développer** :
   - Écrire le code
   - Ajouter des tests si applicable
   - Vérifier que ça compile : `npm run build`
   - Linter : (à ajouter quand ESLint configuré)

3. **Commit** :
   ```bash
   git add .
   git commit -m "feat: ajout de la fonctionnalité X"
   ```

4. **Push et PR** :
   ```bash
   git push origin feature/nom-fonctionnalite
   ```
   Créer une PR sur GitHub avec :
   - Description claire
   - Captures d'écran si UI
   - Référence aux issues

### Checklist avant PR
- [ ] Code compile sans erreurs
- [ ] Types TypeScript corrects
- [ ] Pas de console.log oubliés
- [ ] Code formaté correctement
- [ ] Tests passent (quand disponibles)
- [ ] Documentation mise à jour si nécessaire
```

#### 4. Architecture et patterns

**À ajouter** :
- Où ajouter de nouvelles fonctionnalités
- Comment créer un nouveau hook Supabase
- Comment créer un nouveau composant
- Comment ajouter une nouvelle vue
- Patterns à suivre
- Patterns à éviter

**Exemple de contenu** :
```markdown
### Architecture

#### Ajouter une nouvelle fonctionnalité

1. **Nouvelle table Supabase** :
   - Ajouter la migration dans `supabase/migrations/`
   - Créer le hook correspondant dans `lib/supabase/hooks/`
   - Ajouter les types dans `types.ts`

2. **Nouvelle vue** :
   - Créer le composant dans `components/views/`
   - Ajouter la route dans `Sidebar.tsx`
   - Suivre le pattern `PageLayout`

3. **Nouveau composant réutilisable** :
   - Créer dans `components/ui/` ou domaine spécifique
   - Documenter les props
   - Ajouter au Design System si approprié
```

#### 5. Débogage et dépannage

**À ajouter** :
- Comment déboguer l'application
- Problèmes courants et solutions
- Outils de développement recommandés
- Logs et monitoring

#### 6. Tests

**À ajouter** (quand tests implémentés) :
- Comment écrire des tests
- Structure des tests
- Commandes de test
- Couverture de code

### Plan d'action pour compléter le guide

**Priorité 1** :
1. ✅ Ajouter configuration environnement détaillée
2. ✅ Ajouter standards de code détaillés
3. ✅ Ajouter processus de développement complet

**Priorité 2** :
4. Ajouter section architecture et patterns
5. Ajouter section débogage
6. Ajouter exemples pratiques

**Priorité 3** :
7. Ajouter section tests (quand tests implémentés)
8. Ajouter section performance
9. Ajouter section sécurité

---

## 📊 Résumé et recommandations

### État actuel de la documentation

| Aspect | État | Complétion |
|--------|------|------------|
| Architecture technique | ⚠️ Partiel | ~60% |
| Documentation API | ❌ Manquant | ~20% |
| Guide de contribution | ⚠️ Basique | ~40% |

### Priorités

**🔴 Priorité Haute** :
1. Compléter le guide de contribution (environnement, standards, processus)
2. Documenter l'architecture technique (structure détaillée, patterns)
3. Créer documentation API basique (endpoints Supabase + hooks)

**🟡 Priorité Moyenne** :
4. Générer documentation OpenAPI/Swagger
5. Documenter les patterns architecturaux détaillés
6. Ajouter exemples pratiques dans le guide de contribution

**🟢 Priorité Basse** :
7. Documentation API custom (quand implémentée)
8. Documentation des webhooks détaillée
9. Guides vidéo/tutoriels

---

**Dernière mise à jour** : Décembre 2024  
**Prochaine révision recommandée** : Trimestrielle

