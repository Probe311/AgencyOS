# AgencyOS REST API

API REST custom pour AgencyOS permettant l'intégration avec des systèmes tiers et l'automatisation.

## 📚 Documentation

- **[INDEX.md](./INDEX.md)** - Index de navigation dans la documentation
- **[STRUCTURE.md](./STRUCTURE.md)** - Architecture et guide de développement
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guide de migration depuis `/api/v1/`
- **[REORGANIZATION_SUMMARY.md](./REORGANIZATION_SUMMARY.md)** - Résumé de la réorganisation
- **[openapi.yaml](./openapi.yaml)** - Spécification OpenAPI 3.0

## Base URL

```
https://your-domain.com/api
```

## Authentification

L'API utilise des tokens API pour l'authentification. Chaque requête doit inclure le token dans l'en-tête `Authorization` :

```
Authorization: Bearer agsk_your_api_token_here
```

### Créer un token API

1. Connectez-vous à AgencyOS
2. Allez dans Paramètres > API Tokens
3. Cliquez sur "Créer un token"
4. Configurez les permissions (scopes) et limites de taux
5. **Important** : Copiez le token immédiatement, il ne sera affiché qu'une seule fois

### Scopes disponibles

Les scopes définissent les permissions d'un token :

- `leads:read` - Lire les leads
- `leads:write` - Créer/modifier/supprimer les leads
- `tasks:read` - Lire les tâches
- `tasks:write` - Créer/modifier/supprimer les tâches
- `projects:read` - Lire les projets
- `projects:write` - Créer/modifier/supprimer les projets
- `*` - Accès complet (tous les scopes)

Les scopes peuvent utiliser des wildcards :
- `leads:*` - Toutes les opérations sur les leads

## Rate Limiting

L'API applique des limites de taux pour protéger le service :

- **Par défaut** : 60 requêtes/minute, 1000/heure, 10000/jour
- Les limites peuvent être personnalisées lors de la création du token
- Les headers de réponse incluent les informations de rate limit :
  - `X-RateLimit-Minute-Limit`
  - `X-RateLimit-Minute-Remaining`
  - `X-RateLimit-Minute-Reset`
  - (Même chose pour `Hour` et `Day`)

En cas de dépassement, vous recevrez une réponse `429 Too Many Requests` avec un header `Retry-After`.

## Format des réponses

### Succès

```json
{
  "data": { ... }
}
```

### Erreur

```json
{
  "error": "Error Type",
  "message": "Description de l'erreur"
}
```

### Codes de statut HTTP

- `200` - Succès
- `201` - Créé
- `204` - Pas de contenu (suppression réussie)
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Interdit (scope manquant)
- `404` - Non trouvé
- `429` - Trop de requêtes (rate limit)
- `500` - Erreur serveur

## Endpoints

### Leads

#### Liste des leads
```
GET /api/leads
```

**Query parameters :**
- `page` (int, default: 1) - Numéro de page
- `limit` (int, default: 50, max: 100) - Nombre d'éléments par page
- `status` (string) - Filtrer par statut
- `stage` (string) - Filtrer par étape
- `assigned_to` (uuid) - Filtrer par assigné
- `search` (string) - Recherche dans nom, email, company
- `sort_by` (string, default: created_at) - Champ de tri
- `sort_order` (string, default: desc) - Ordre de tri (asc/desc)

**Réponse :**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

#### Récupérer un lead
```
GET /api/leads/:id
```

#### Créer un lead
```
POST /api/leads
```

**Body :**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "status": "new",
  "stage": "lead",
  ...
}
```

#### Mettre à jour un lead
```
PUT /api/leads/:id
```

#### Supprimer un lead
```
DELETE /api/leads/:id
```

### Tasks

#### Liste des tâches
```
GET /api/tasks
```

**Query parameters :** (similaires aux leads)
- `page`, `limit`, `status`, `priority`, `assigned_to`, `project_id`, `search`, `sort_by`, `sort_order`

#### Récupérer une tâche
```
GET /api/tasks/:id
```

#### Créer une tâche
```
POST /api/tasks
```

**Body :**
```json
{
  "title": "Tâche exemple",
  "description": "Description de la tâche",
  "status": "todo",
  "priority": "medium",
  "due_date": "2025-12-31T23:59:59Z",
  ...
}
```

#### Mettre à jour une tâche
```
PUT /api/tasks/:id
```

#### Supprimer une tâche
```
DELETE /api/tasks/:id
```

### API Tokens

#### Liste des tokens
```
GET /api/tokens
```

#### Créer un token
```
POST /api/tokens
```

**Body :**
```json
{
  "name": "Token pour intégration",
  "scopes": ["leads:read", "tasks:write"],
  "rate_limit_per_minute": 100,
  "rate_limit_per_hour": 5000,
  "rate_limit_per_day": 50000,
  "expires_at": "2026-12-31T23:59:59Z",
  "ip_whitelist": ["192.168.1.1"]
}
```

**Réponse :**
```json
{
  "data": {
    "id": "uuid",
    "name": "Token pour intégration",
    "token": "agsk_...",
    "token_prefix": "agsk_...",
    ...
  },
  "warning": "Save this token securely. It will not be shown again."
}
```

#### Mettre à jour un token
```
PATCH /api/tokens/:id
```

**Body :**
```json
{
  "name": "Nouveau nom",
  "is_active": false,
  "scopes": ["leads:*"]
}
```

#### Supprimer un token
```
DELETE /api/tokens/:id
```

## Exemples

### cURL

```bash
# Liste des leads
curl -X GET "https://your-domain.com/api/leads?page=1&limit=10" \
  -H "Authorization: Bearer agsk_your_token_here"

# Créer un lead
curl -X POST "https://your-domain.com/api/leads" \
  -H "Authorization: Bearer agsk_your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp"
  }'
```

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://your-domain.com/api';
const API_TOKEN = 'agsk_your_token_here';

// Liste des leads
const response = await fetch(`${API_BASE}/leads?page=1&limit=10`, {
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`
  }
});

const data = await response.json();
console.log(data);

// Créer un lead
const newLead = await fetch(`${API_BASE}/leads`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp'
  })
});
```

### Python

```python
import requests

API_BASE = 'https://your-domain.com/api'
API_TOKEN = 'agsk_your_token_here'

headers = {
    'Authorization': f'Bearer {API_TOKEN}'
}

# Liste des leads
response = requests.get(f'{API_BASE}/leads', headers=headers, params={'page': 1, 'limit': 10})
data = response.json()
print(data)

# Créer un lead
new_lead = requests.post(
    f'{API_BASE}/leads',
    headers={**headers, 'Content-Type': 'application/json'},
    json={
        'name': 'John Doe',
        'email': 'john@example.com',
        'company': 'Acme Corp'
    }
)
```

## Versioning

L'API n'utilise pas de versioning par URL. Tous les endpoints sont disponibles directement sous `/api/`.

## Logs et Monitoring

Toutes les requêtes API sont loggées dans la table `api_logs` pour :
- Débogage
- Audit
- Analytics
- Détection d'anomalies

Les logs incluent :
- Token utilisé
- Endpoint appelé
- Méthode HTTP
- Code de statut
- Temps de réponse
- IP et User-Agent
- Body de requête/réponse (tronqué si > 10KB)

## Documentation supplémentaire

- **[STRUCTURE.md](./STRUCTURE.md)** - Architecture et guide de développement de l'API
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guide de migration depuis l'ancienne structure `/api/v1/`
- **[REORGANIZATION_SUMMARY.md](./REORGANIZATION_SUMMARY.md)** - Résumé complet de la réorganisation
- **[openapi.yaml](./openapi.yaml)** - Spécification OpenAPI 3.0 complète

## Support

Pour toute question ou problème :
- Documentation : [docs.agencyos.com/api](https://docs.agencyos.com/api)
- Support : support@agencyos.com
- Issues : [GitHub Issues](https://github.com/agencyos/issues)

