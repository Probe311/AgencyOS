# Guide de Migration API

Ce guide documente les changements apportés à la structure de l'API et comment migrer votre code.

## Changements principaux

### 1. Suppression du versioning

**Avant :**
```
/api/v1/leads
/api/v1/tasks
/api/v1/tokens
```

**Après :**
```
/api/leads
/api/tasks
/api/tokens
```

### 2. Nouvelle structure

Tous les endpoints sont maintenant directement dans `/api/` :

```
/api/
├── middleware/     # Middleware partagés
├── utils/          # Utilitaires partagés
├── leads/          # Endpoints leads
├── tasks/          # Endpoints tasks
├── tokens/         # Endpoints tokens
├── reports/        # Endpoints reports
├── saml/           # Endpoints SAML
├── email/          # Endpoint email
└── tracking/       # Endpoints tracking
```

### 3. Configuration centralisée

Tous les endpoints utilisent maintenant la configuration centralisée :

```typescript
// Avant (chaque fichier)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

// Après (config centralisée)
import { supabase } from '../utils/config';
```

## Migration du code frontend

### URLs API

**Avant :**
```typescript
const response = await fetch('/api/v1/leads');
```

**Après :**
```typescript
const response = await fetch('/api/leads');
```

### Services d'intégration

Les services Zapier et Make ont été mis à jour automatiquement. Si vous avez du code personnalisé :

**Avant :**
```typescript
const apiUrl = `${window.location.origin}/api/v1`;
```

**Après :**
```typescript
const apiUrl = `${window.location.origin}/api`;
```

## Endpoints disponibles

### REST API (avec authentification)

- `GET /api/leads` - Liste des leads
- `GET /api/leads/:id` - Détails d'un lead
- `POST /api/leads` - Créer un lead
- `PUT /api/leads/:id` - Mettre à jour un lead
- `DELETE /api/leads/:id` - Supprimer un lead

- `GET /api/tasks` - Liste des tâches
- `GET /api/tasks/:id` - Détails d'une tâche
- `POST /api/tasks` - Créer une tâche
- `PUT /api/tasks/:id` - Mettre à jour une tâche
- `DELETE /api/tasks/:id` - Supprimer une tâche

- `GET /api/tokens` - Liste des tokens API
- `POST /api/tokens` - Créer un token API
- `PATCH /api/tokens/:id` - Mettre à jour un token
- `DELETE /api/tokens/:id` - Supprimer un token

- `POST /api/reports/process` - Traiter les rapports automatisés

### SAML SSO

- `POST /api/saml/initiate` - Initier une requête SSO
- `POST /api/saml/assert` - Traiter une assertion SAML

### Email & Tracking

- `POST /api/email/send` - Envoyer un email
- `GET /api/tracking/email` - Tracker une ouverture d'email
- `GET /api/tracking/redirect` - Tracker un clic dans un email

## Authentification

L'authentification reste identique. Utilisez toujours :

```typescript
headers: {
  'Authorization': `Bearer ${apiToken}`
}
```

## Rate Limiting

Le rate limiting fonctionne de la même manière avec les mêmes headers de réponse :

- `X-RateLimit-Minute-Limit`
- `X-RateLimit-Minute-Remaining`
- `X-RateLimit-Minute-Reset`
- (Même chose pour `Hour` et `Day`)

## Notes importantes

1. **Pas de breaking changes** : Les fonctionnalités restent identiques, seules les URLs ont changé
2. **Configuration Vercel** : Mise à jour automatique pour tous les endpoints
3. **Documentation** : Consultez `api/README.md` pour la documentation complète
4. **OpenAPI** : Spécification mise à jour dans `api/openapi.yaml`

## Support

Pour toute question ou problème de migration, consultez :
- Documentation API : `api/README.md`
- Documentation technique : `doc/DOCUMENTATION_TECHNIQUE.md`
- Changelog : `doc/CHANGELOG.md`

