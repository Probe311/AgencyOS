# Structure de l'API AgencyOS

Ce document décrit la structure et l'organisation de l'API REST d'AgencyOS.

## Architecture

```
/api/
├── middleware/          # Middleware partagés
│   ├── auth.ts         # Authentification par tokens API
│   ├── rateLimit.ts    # Rate limiting configurable
│   └── logging.ts      # Logging automatique des requêtes
│
├── utils/              # Utilitaires partagés
│   ├── config.ts       # Configuration Supabase centralisée
│   └── errors.ts       # Gestion d'erreurs standardisée
│
├── leads/              # Gestion des leads
│   └── index.ts        # CRUD complet (GET, POST, PUT, DELETE)
│
├── tasks/              # Gestion des tâches
│   └── index.ts        # CRUD complet (GET, POST, PUT, DELETE)
│
├── tokens/             # Gestion des tokens API
│   └── index.ts        # CRUD tokens (GET, POST, PATCH, DELETE)
│
├── reports/            # Rapports automatisés
│   └── process.ts      # Traitement des rapports (POST)
│
├── saml/               # SSO SAML
│   ├── initiate.ts    # Initiation SSO (POST)
│   └── assert.ts      # Traitement assertion (POST)
│
├── email/              # Envoi d'emails
│   └── send.ts         # Envoi multi-providers (POST)
│
└── tracking/           # Tracking emails
    ├── email.ts        # Tracking ouvertures (GET)
    └── redirect.ts     # Tracking clics (GET)
```

## Principes de conception

### 1. Configuration centralisée

Tous les endpoints utilisent la configuration centralisée dans `utils/config.ts` :

```typescript
import { supabase } from '../utils/config';
import { supabaseAnon } from '../utils/config'; // Pour endpoints publics
```

### 2. Middleware réutilisables

Les endpoints authentifiés utilisent les middleware standardisés :

```typescript
import { authenticateApiToken, requireScope } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';
```

### 3. Structure sans versioning

Tous les endpoints sont directement sous `/api/` sans préfixe de version :
- ✅ `/api/leads`
- ❌ `/api/v1/leads` (ancienne structure)

### 4. Gestion d'erreurs standardisée

Utilisation des utilitaires d'erreurs pour des réponses cohérentes :

```typescript
import { sendError, sendSuccess, sendPaginated } from '../utils/errors';
```

## Types d'endpoints

### Endpoints authentifiés

Requièrent un token API dans l'en-tête `Authorization: Bearer <token>` :

- `/api/leads/*`
- `/api/tasks/*`
- `/api/tokens/*`
- `/api/reports/process`

### Endpoints publics

Accessibles sans authentification :

- `/api/email/send`
- `/api/tracking/email`
- `/api/tracking/redirect`
- `/api/saml/*`

## Middleware

### Authentification (`middleware/auth.ts`)

- Vérifie la validité du token API
- Vérifie les scopes requis
- Vérifie l'expiration et la whitelist IP
- Attache les informations utilisateur à la requête

### Rate Limiting (`middleware/rateLimit.ts`)

- Limites par minute, heure et jour
- Headers de réponse avec informations de quota
- Retourne 429 si limite dépassée

### Logging (`middleware/logging.ts`)

- Enregistre toutes les requêtes authentifiées
- Stocke les métadonnées (IP, User-Agent, temps de réponse)
- Limite la taille des bodies loggés (10KB max)

## Configuration

### Variables d'environnement

Toutes les variables sont lues depuis `utils/config.ts` :

- `VITE_SUPABASE_URL` ou `SUPABASE_URL` - URL Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role (admin)
- `VITE_SUPABASE_ANON_KEY` ou `SUPABASE_ANON_KEY` - Clé anonyme (public)

### Configuration Vercel

Tous les fichiers `api/**/*.ts` sont configurés dans `frontend/vercel.json` :

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  }
}
```

## Ajout d'un nouvel endpoint

Pour ajouter un nouvel endpoint :

1. Créer le dossier dans `/api/` (ex: `/api/projects/`)
2. Créer `index.ts` avec le handler
3. Importer la config centralisée : `import { supabase } from '../utils/config'`
4. Utiliser les middleware si authentification requise
5. Documenter dans `README.md` et `openapi.yaml`

Exemple :

```typescript
// api/projects/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

export default withLogging(async (req: AuthenticatedRequest, res: VercelResponse) => {
  await authenticateApiToken(req, res, async () => {
    await rateLimitMiddleware(req, res, async () => {
      // Votre logique ici
    });
  });
});
```

## Documentation

- **README.md** : Guide complet de l'API avec exemples
- **openapi.yaml** : Spécification OpenAPI 3.0
- **MIGRATION_GUIDE.md** : Guide de migration depuis l'ancienne structure
- **STRUCTURE.md** : Ce document

## Support

Pour toute question :
- Consultez `api/README.md` pour la documentation complète
- Voir `api/MIGRATION_GUIDE.md` pour la migration
- Voir `doc/DOCUMENTATION_TECHNIQUE.md` pour l'architecture globale

