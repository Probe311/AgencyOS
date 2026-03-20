# Scripts d'enrichissement des leads

## enrich-leads.js

Script pour enrichir automatiquement les leads avec :
- **SIREN/SIRET** : Recherche via l'API SIRENE officielle (data.gouv.fr)
- **Adresse complète** : Enrichissement depuis les données SIRENE
- **Coordonnées GPS** : Géocodage via Nominatim (OpenStreetMap)
- **Email** : Extraction depuis le site web + enrichissement IA
- **Téléphone** : Extraction depuis le site web + enrichissement IA
- **Décideurs** : Recherche depuis le site web + enrichissement IA

### Prérequis

- Node.js 18+
- Variables d'environnement optionnelles :
  - `GEMINI_API_KEY` ou `VITE_GEMINI_API_KEY` : Pour l'enrichissement IA (optionnel mais recommandé)

### Utilisation

```bash
# Depuis la racine du projet - Traiter tous les leads
node scripts/enrich-leads.js

# Tester avec seulement 5 leads (pour vérifier que tout fonctionne)
MAX_LEADS=5 node scripts/enrich-leads.js
```

Le script va :
1. Lire `Json/leads-global.json`
2. Enrichir chaque lead avec toutes les sources disponibles
3. Sauvegarder le résultat dans `Json/leads-global-enriched.json`
4. Afficher des statistiques à la fin

**Note Windows PowerShell** : Pour définir une variable d'environnement temporaire :
```powershell
$env:MAX_LEADS=5; node scripts/enrich-leads.js
```

### Fonctionnalités

- **Traitement par lots** : Les leads sont traités par lots de 10 pour sauvegarder régulièrement
- **Gestion des rate limits** : Délai de 2 secondes entre chaque requête pour éviter les limites
- **Sauvegarde incrémentale** : Le fichier est sauvegardé après chaque lot
- **Gestion d'erreurs** : Continue même si certaines requêtes échouent

### Sources de données

1. **API SIRENE** (gratuit, officiel)
   - Recherche par nom d'entreprise
   - Retourne SIREN, SIRET, adresse complète, activité, effectif

2. **Nominatim/OpenStreetMap** (gratuit)
   - Géocodage des adresses
   - Retourne latitude, longitude, adresse formatée

3. **Scraping du site web** (gratuit)
   - Extraction d'emails et téléphones depuis le HTML
   - Recherche de décideurs dans le contenu

4. **IA Gemini** (nécessite clé API)
   - Enrichissement intelligent des données manquantes
   - Extraction structurée d'informations

### Notes importantes

- Le script respecte les rate limits des APIs (2 secondes entre requêtes)
- Les données existantes ne sont pas écrasées si elles sont déjà présentes
- Le script peut prendre plusieurs heures pour traiter un grand nombre de leads
- Les sauvegardes intermédiaires permettent de reprendre en cas d'interruption

### Statistiques

À la fin de l'exécution, le script affiche :
- Nombre total de leads traités
- Nombre avec SIRET
- Nombre avec SIREN
- Nombre avec coordonnées GPS
- Nombre avec email
- Nombre avec téléphone

