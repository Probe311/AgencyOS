# Services d'Intégration

Ce dossier contient tous les connecteurs pour les services tiers intégrés dans AgencyOS.

## Services disponibles

### Réseaux Sociaux
- **LinkedIn** (`linkedin.ts`) - Gestion des posts et analytics LinkedIn
- **Instagram** (`instagram.ts`) - Gestion des posts Instagram Business
- **X (Twitter)** (`twitter.ts`) - Gestion des tweets et analytics
- **TikTok** (`tiktok.ts`) - Gestion des vidéos TikTok
- **YouTube** (`youtube.ts`) - Gestion des chaînes et vidéos YouTube
- **Pinterest** (`pinterest.ts`) - Gestion des tableaux et épingles Pinterest
- **Snapchat** (`snapchat.ts`) - Gestion des stories et publicités Snapchat
- **Reddit** (`reddit.ts`) - Gestion des posts et commentaires Reddit
- **Discord** (`discord.ts`) - Intégration avec les serveurs Discord
- **Telegram** (`telegram.ts`) - Gestion des bots et canaux Telegram

### Publicité
- **Google Ads** (`googleAds.ts`) - Gestion des campagnes publicitaires Google
- **Meta Ads** (`metaAds.ts`) - Gestion des campagnes Facebook/Instagram Ads
- **Microsoft Advertising** (`microsoftAds.ts`) - Gestion des campagnes Bing/Microsoft Ads
- **Amazon Ads** (`amazonAds.ts`) - Gestion des campagnes publicitaires Amazon
- **LinkedIn Ads** (`linkedinAds.ts`) - Gestion des campagnes publicitaires LinkedIn
- **Twitter Ads** (`twitterAds.ts`) - Gestion des campagnes publicitaires Twitter/X

### Productivité & Développement
- **Slack** (`slack.ts`) - Intégration avec les canaux Slack
- **Notion** (`notion.ts`) - Synchronisation avec les pages Notion
- **GitHub** (`github.ts`) - Suivi des repositories et issues

### Finance & CRM
- **Stripe** (`stripe.ts`) - Gestion des paiements et abonnements
- **HubSpot** (`hubspot.ts`) - Synchronisation CRM et contacts

### Automatisation
- **Zapier** (`zapier.ts`) - Intégration avec la plateforme d'automatisation Zapier
- **Make (Integromat)** (`make.ts`) - Intégration avec la plateforme d'automatisation Make

## Configuration OAuth

Pour activer les intégrations, vous devez configurer les clés OAuth dans les variables d'environnement :

```env
# LinkedIn
VITE_LINKEDIN_CLIENT_ID=your_client_id
VITE_LINKEDIN_CLIENT_SECRET=your_client_secret

# Instagram
VITE_INSTAGRAM_CLIENT_ID=your_client_id
VITE_INSTAGRAM_CLIENT_SECRET=your_client_secret

# Twitter/X
VITE_TWITTER_CLIENT_ID=your_client_id
VITE_TWITTER_CLIENT_SECRET=your_client_secret

# TikTok
VITE_TIKTOK_CLIENT_ID=your_client_id
VITE_TIKTOK_CLIENT_SECRET=your_client_secret

# Google Ads
VITE_GOOGLE_ADS_CLIENT_ID=your_client_id
VITE_GOOGLE_ADS_CLIENT_SECRET=your_client_secret

# Meta Ads
VITE_META_ADS_CLIENT_ID=your_client_id
VITE_META_ADS_CLIENT_SECRET=your_client_secret

# Slack
VITE_SLACK_CLIENT_ID=your_client_id
VITE_SLACK_CLIENT_SECRET=your_client_secret

# Notion
VITE_NOTION_CLIENT_ID=your_client_id
VITE_NOTION_CLIENT_SECRET=your_client_secret

# GitHub
VITE_GITHUB_CLIENT_ID=your_client_id
VITE_GITHUB_CLIENT_SECRET=your_client_secret

# Stripe
VITE_STRIPE_CLIENT_ID=your_client_id
VITE_STRIPE_CLIENT_SECRET=your_client_secret

# HubSpot
VITE_HUBSPOT_CLIENT_ID=your_client_id
VITE_HUBSPOT_CLIENT_SECRET=your_client_secret

# Zapier
VITE_ZAPIER_CLIENT_ID=your_client_id
VITE_ZAPIER_CLIENT_SECRET=your_client_secret

# Make (Integromat)
VITE_MAKE_CLIENT_ID=your_client_id
VITE_MAKE_CLIENT_SECRET=your_client_secret

# YouTube
VITE_YOUTUBE_CLIENT_ID=your_client_id
VITE_YOUTUBE_CLIENT_SECRET=your_client_secret

# Pinterest
VITE_PINTEREST_CLIENT_ID=your_client_id
VITE_PINTEREST_CLIENT_SECRET=your_client_secret

# Snapchat
VITE_SNAPCHAT_CLIENT_ID=your_client_id
VITE_SNAPCHAT_CLIENT_SECRET=your_client_secret

# Reddit
VITE_REDDIT_CLIENT_ID=your_client_id
VITE_REDDIT_CLIENT_SECRET=your_client_secret

# Discord
VITE_DISCORD_CLIENT_ID=your_client_id
VITE_DISCORD_CLIENT_SECRET=your_client_secret

# Telegram
VITE_TELEGRAM_BOT_TOKEN=your_bot_token

# Microsoft Advertising
VITE_MICROSOFT_ADS_CLIENT_ID=your_client_id
VITE_MICROSOFT_ADS_CLIENT_SECRET=your_client_secret

# Amazon Ads
VITE_AMAZON_ADS_CLIENT_ID=your_client_id
VITE_AMAZON_ADS_CLIENT_SECRET=your_client_secret

# LinkedIn Ads
VITE_LINKEDIN_ADS_CLIENT_ID=your_client_id
VITE_LINKEDIN_ADS_CLIENT_SECRET=your_client_secret

# Twitter Ads
VITE_TWITTER_ADS_CLIENT_ID=your_client_id
VITE_TWITTER_ADS_CLIENT_SECRET=your_client_secret
```

## Architecture

### BaseIntegrationService
Classe abstraite de base pour tous les services d'intégration. Chaque service doit implémenter :
- `getAuthUrl()` - Génère l'URL d'autorisation OAuth
- `exchangeCodeForToken()` - Échange le code d'autorisation contre un token
- `refreshAccessToken()` - Rafraîchit le token d'accès
- `testConnection()` - Teste la connexion avec le service
- `getAccountInfo()` - Récupère les informations du compte connecté

### TokenManager
Service de gestion automatique des tokens OAuth :
- Vérifie l'expiration des tokens
- Rafraîchit automatiquement les tokens expirés
- Planifie les rafraîchissements futurs
- Gère les erreurs de rafraîchissement

### Factory Pattern
`integrationFactory.ts` crée les instances de services selon le provider demandé.

## Utilisation

```typescript
import { useIntegrations } from '../../lib/supabase/hooks';
import { createIntegrationService } from '../../lib/services/integrations';

// Dans un composant
const { integrations, addIntegration, updateIntegration } = useIntegrations();

// Créer un service
const service = createIntegrationService('linkedin');

// Lancer le flux OAuth
const authUrl = service.getAuthUrl();
window.location.href = authUrl;

// Après le callback OAuth
const tokenData = await service.exchangeCodeForToken(code);
await addIntegration({
  provider: 'linkedin',
  name: 'LinkedIn',
  category: 'Réseaux Sociaux',
  status: 'Connecté',
  enabled: true,
  accessToken: tokenData.accessToken,
  // ...
});
```

## Callbacks OAuth

Les callbacks OAuth doivent être gérés dans le composant `IntegrationsSettings`. L'URL de callback est automatiquement configurée comme :
`${window.location.origin}/oauth/callback/{provider}`

Assurez-vous que votre application OAuth est configurée avec cette URL de redirection.

## Intégrations avec services tiers (Zapier, Make)

Les intégrations Zapier et Make permettent de connecter AgencyOS à des milliers d'applications via ces plateformes d'automatisation.

### Configuration pour Zapier

1. **Créer une application Zapier** :
   - Allez sur https://developer.zapier.com/
   - Créez une nouvelle application
   - Configurez OAuth 2.0 avec les URLs de callback : `${window.location.origin}/oauth/callback/zapier`
   - Récupérez votre `CLIENT_ID` et `CLIENT_SECRET`

2. **Configurer les variables d'environnement** :
   ```env
   VITE_ZAPIER_CLIENT_ID=your_zapier_client_id
   VITE_ZAPIER_CLIENT_SECRET=your_zapier_client_secret
   ```

3. **Créer des Zaps** :
   - Une fois connecté, vous pouvez créer des Zaps qui déclenchent des actions dans AgencyOS
   - Utilisez l'URL de l'API publique : `${window.location.origin}/api`

### Configuration pour Make

1. **Créer une application Make** :
   - Allez sur https://www.make.com/en/help/apps/custom-apps
   - Créez une nouvelle application personnalisée
   - Configurez OAuth 2.0 avec les URLs de callback : `${window.location.origin}/oauth/callback/make`
   - Récupérez votre `CLIENT_ID` et `CLIENT_SECRET`

2. **Configurer les variables d'environnement** :
   ```env
   VITE_MAKE_CLIENT_ID=your_make_client_id
   VITE_MAKE_CLIENT_SECRET=your_make_client_secret
   ```

3. **Créer des scénarios** :
   - Une fois connecté, vous pouvez créer des scénarios Make
   - Utilisez l'URL de l'API publique : `${window.location.origin}/api`

### API REST pour intégrations tierces

Pour permettre à Zapier, Make et d'autres services de se connecter à AgencyOS, vous devez exposer une API REST. Les endpoints recommandés incluent :

- `GET /api/leads` - Liste des leads
- `POST /api/leads` - Créer un lead
- `GET /api/tasks` - Liste des tâches
- `POST /api/tasks` - Créer une tâche
- `GET /api/projects` - Liste des projets
- `POST /api/webhooks` - Gérer les webhooks

### Webhooks entrants

Les services Zapier et Make peuvent envoyer des données à AgencyOS via des webhooks. Configurez les webhooks dans la section "Webhooks" des paramètres pour recevoir des événements de ces plateformes.

## Sécurité

⚠️ **Important** : En production, les `client_secret` ne doivent JAMAIS être exposés côté client. Pour une sécurité optimale :
1. Utilisez un backend proxy pour gérer les échanges de tokens
2. Stockez les tokens de manière sécurisée (chiffrement)
3. Utilisez HTTPS pour tous les appels OAuth
4. Implémentez PKCE pour les services qui le supportent
5. Pour les API publiques, utilisez des API keys avec des permissions limitées
6. Validez et sanitize toutes les données reçues via webhooks

