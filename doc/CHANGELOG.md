# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Non versionné]

### Ajouté
- **Réorganisation complète de l'API REST** (2025-01-27) :
  - Configuration centralisée dans `api/utils/config.ts` pour Supabase (service role + anon clients)
  - Gestion d'erreurs standardisée dans `api/utils/errors.ts` (sendError, sendSuccess, sendPaginated)
  - Structure unifiée : tous les endpoints dans `/api/` sans versioning (`/api/v1/` supprimé)
  - Middleware centralisés : authentification (`api/middleware/auth.ts`), rate limiting (`api/middleware/rateLimit.ts`), logging (`api/middleware/logging.ts`)
  - Endpoints disponibles : `/api/leads`, `/api/tasks`, `/api/tokens`, `/api/reports/process`, `/api/saml/*`, `/api/email/send`, `/api/tracking/*`
  - Documentation complète : `api/INDEX.md`, `api/README.md`, `api/STRUCTURE.md`, `api/MIGRATION_GUIDE.md`, `api/REORGANIZATION_SUMMARY.md`
  - Spécification OpenAPI mise à jour (`api/openapi.yaml`) avec tous les endpoints
- Configuration robots.txt pour le référencement
- Fichier .htaccess pour la configuration Apache et le routing SPA
- Documentation ROADMAP.md pour le suivi des fonctionnalités
- Changelog principal du projet
- Composants UI factorisés :
  - `Container` : Composant de conteneur avec gestion de largeur et padding
  - `Block` : Bloc de contenu réutilisable avec variantes de style
  - `Card` : Carte interactive avec variantes (default, elevated, outlined, interactive)
  - `Checkbox` : Checkbox stylisée avec tailles personnalisables
  - `Toggle` : Toggle/Switch avec support du label et tailles multiples
  - `CTA` : Bouton Call-to-Action avec icônes configurables
  - `ViewToggle` : Composant pour changer de vue (pills, segmented, default)
  - `StatCard` : Carte de statistiques avec support des graphiques
- Fichier d'export centralisé `components/ui/index.ts` pour tous les composants UI

### Changé
- Documentation structurée dans le dossier `doc/`
- CHANGELOG.md et ROADMAP.md déplacés dans `doc/`
- README.md du dossier doc mis à jour avec les nouveaux fichiers
- **Refactorisation de la structure du projet** : Création du dossier `front/` contenant tout le code frontend
  - Tous les fichiers React/TypeScript déplacés dans `front/`
  - Configuration Vite mise à jour pour chercher les variables d'environnement dans le dossier parent
  - README.md principal et `front/README.md` mis à jour avec les nouvelles instructions
- **Réorganisation de l'API REST** (2025-01-27) :
  - Suppression du versioning `/api/v1/` → tous les endpoints sous `/api/`
  - Déplacement des endpoints depuis `api/v1/` et `frontend/api/` vers `api/`
  - Middleware déplacés de `api/v1/middleware/` vers `api/middleware/`
  - Mise à jour de toutes les références dans le code et la documentation (100% des imports mis à jour)
  - Configuration Vercel unifiée pour tous les endpoints `api/**/*.ts`
  - Documentation API complète : 6 documents créés/mis à jour (`api/README.md`, `api/openapi.yaml`, `api/INDEX.md`, `api/STRUCTURE.md`, `api/MIGRATION_GUIDE.md`, `api/REORGANIZATION_SUMMARY.md`)
  - Nettoyage complet : dossiers `api/v1/` et `frontend/api/` supprimés
  - Uniformisation : 20 fichiers organisés (14 TS, 5 MD, 1 YAML), 82 imports/exports validés, 0 erreur de linting

### Technique
- Support du routing côté client (SPA) via .htaccess
- Optimisations de performance (compression GZIP, cache des assets)
- En-têtes de sécurité configurés
- Architecture de composants UI factorisée pour améliorer la réutilisabilité
- **API REST** :
  - Configuration Supabase centralisée et partagée
  - Middleware réutilisables (auth, rate limiting, logging)
  - Structure sans versioning pour simplifier les URLs
  - Code factorisé et uniformisé

---

## Notes

Pour l'historique détaillé de l'intégration Supabase, voir [CHANGELOG_SUPABASE.md](./CHANGELOG_SUPABASE.md).

