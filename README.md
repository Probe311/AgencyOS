<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AgencyOS

Ce dépôt contient tout ce dont vous avez besoin pour faire tourner **AgencyOS** en local (frontend, documentation, et API).

View your app in AI Studio: https://ai.studio/apps/drive/1xzYb6P3tcoFh2cT7qD6XcW7u8jQ5_xzq

## Démarrer en local

**Prérequis :** Node.js (et `npm`).

1. Installer les dépendances du frontend :
   ```bash
   cd frontend
   npm install
   ```
2. Créer le fichier de configuration au niveau du dépôt :
   - `/.env.local`
   - Variables nécessaires :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY`
3. Lancer le serveur de dev :
   ```bash
   npm run dev
   ```

L'application sera accessible sur `http://localhost:3000`.

## Documentation

- Documentation générale : [`doc/README.md`](doc/README.md)
- API REST : [`api/README.md`](api/README.md)
- Application mobile : [`mobile/README.md`](mobile/README.md)

## Notes de sécurité

Le fichier `/.env.local` est volontairement exclu du commit via `.gitignore` afin d'éviter toute fuite de secrets.
