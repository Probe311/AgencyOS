# Index de Documentation API

Guide rapide pour naviguer dans la documentation de l'API AgencyOS.

## 📚 Documentation disponible

### Guides principaux

1. **[README.md](./README.md)** - Guide complet de l'API
   - Base URL et authentification
   - Tous les endpoints documentés
   - Exemples de code (cURL, JavaScript, Python)
   - Rate limiting et format des réponses

2. **[STRUCTURE.md](./STRUCTURE.md)** - Architecture et développement
   - Structure de l'API
   - Principes de conception
   - Guide pour ajouter un nouvel endpoint
   - Configuration et middleware

3. **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guide de migration
   - Changements depuis `/api/v1/`
   - Comment migrer votre code
   - Exemples avant/après

4. **[REORGANIZATION_SUMMARY.md](./REORGANIZATION_SUMMARY.md)** - Résumé de la réorganisation
   - Objectifs atteints
   - Changements effectués
   - Statistiques et validation

5. **[openapi.yaml](./openapi.yaml)** - Spécification OpenAPI 3.0
   - Spécification complète de l'API
   - Schémas et modèles
   - Réponses et codes d'erreur

## 🚀 Démarrage rapide

### Pour utiliser l'API

1. Lisez le [README.md](./README.md) pour comprendre l'authentification
2. Créez un token API dans l'interface AgencyOS
3. Utilisez les exemples fournis pour faire vos premières requêtes

### Pour migrer depuis `/api/v1/`

1. Consultez le [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
2. Remplacez toutes les URLs `/api/v1/` par `/api/`
3. Vérifiez que votre code fonctionne correctement

### Pour développer un nouvel endpoint

1. Lisez [STRUCTURE.md](./STRUCTURE.md) pour comprendre l'architecture
2. Suivez le guide "Ajout d'un nouvel endpoint"
3. Utilisez la configuration centralisée et les middleware

## 📁 Structure des fichiers

```
/api/
├── middleware/          # Middleware réutilisables
├── utils/              # Utilitaires partagés
├── leads/              # Endpoints Leads
├── tasks/              # Endpoints Tasks
├── tokens/             # Gestion tokens API
├── reports/            # Traitement rapports
├── saml/               # SSO SAML
├── email/              # Envoi emails
└── tracking/           # Tracking emails
```

## 🔗 Liens utiles

- **Documentation technique globale** : `doc/DOCUMENTATION_TECHNIQUE.md`
- **Changelog** : `doc/CHANGELOG.md`
- **Roadmap** : `doc/ROADMAP.md`

## 📞 Support

Pour toute question :
- Consultez d'abord la documentation ci-dessus
- Voir `doc/DOCUMENTATION_TECHNIQUE.md` pour l'architecture globale
- Support : support@agencyos.com

