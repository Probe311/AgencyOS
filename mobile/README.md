# AgencyOS Mobile App

Application mobile React Native pour AgencyOS.

## Installation

```bash
# Installer les dépendances
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

## Configuration

Créer un fichier `.env` à la racine du projet mobile :

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Fonctionnalités

- ✅ Authentification (Supabase Auth)
- ✅ Dashboard avec statistiques
- ✅ Liste des tâches
- ✅ Liste des leads
- ✅ Synchronisation offline
- ✅ Notifications push
- ✅ Géolocalisation
- ✅ Photos (galerie et appareil photo)
- ✅ Visites terrain avec géolocalisation

## Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Configuration Supabase
│   ├── services/
│   │   ├── offlineSync.ts       # Synchronisation offline
│   │   ├── notifications.ts     # Notifications push
│   │   ├── geolocation.ts       # Géolocalisation
│   │   └── photos.ts            # Gestion photos
│   ├── screens/
│   │   ├── AuthScreen.tsx        # Écran d'authentification
│   │   ├── DashboardScreen.tsx   # Tableau de bord
│   │   ├── TasksScreen.tsx       # Liste des tâches
│   │   └── LeadsScreen.tsx       # Liste des leads
│   └── navigation/
│       └── AppNavigator.tsx     # Navigation principale
├── App.tsx                       # Point d'entrée
└── package.json
```

## Services

### OfflineSyncService
Gère la synchronisation offline des données. Les actions sont mises en queue quand hors ligne et synchronisées automatiquement quand la connexion est rétablie.

### NotificationService
Gère les notifications push locales et distantes. Enregistre automatiquement le token de l'appareil.

### GeolocationService
Gère la géolocalisation pour les visites terrain. Demande les permissions et enregistre les positions.

### PhotoService
Gère la sélection et l'upload de photos depuis la galerie ou l'appareil photo.

## Développement

```bash
# Démarrer Metro bundler
npm start

# Lancer sur iOS
npm run ios

# Lancer sur Android
npm run android
```

## Build

### iOS
```bash
cd ios
pod install
cd ..
npm run ios
```

### Android
```bash
npm run android
```

