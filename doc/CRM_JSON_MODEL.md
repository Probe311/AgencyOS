# Modèle JSON pour le CRM - AgencyOS

Ce document présente le modèle JSON complet pour les données CRM, incluant toutes les structures attendues.

## Structure principale

### Lead complet avec toutes les données

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Jean Dupont",
  "email": "jean.dupont@example.com",
  "phone": "+33612345678",
  "company": "Acme Corporation",
  
  "stage": "Nouveau",
  "lifecycleStage": "Lead",
  "source": "Robot Prospection",
  "value": 50000,
  "probability": 25,
  "lastContact": "2024-01-15T10:30:00Z",
  
  "assignedTo": "user-uuid-here",
  "notes": "Lead intéressé par nos services de marketing digital",
  
  "convertedAt": null,
  "lostAt": null,
  "lostReason": null,
  "firstContactDate": "2024-01-10T09:00:00Z",
  "lastActivityDate": "2024-01-15T10:30:00Z",
  
  "createdAt": "2024-01-10T09:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  
  "family": "Grandes Entreprises & ETI",
  "temperature": "Tiède",
  
  "enrichment": {
    "description": "Entreprise spécialisée dans le développement de logiciels B2B. Fondée en 2015, elle compte 50 employés et génère un CA de 5M€.",
    "industry": "Agences Marketing & Com",
    "website": "https://www.acme-corp.com",
    "address": "123 Rue de la République, 75001 Paris, France",
    "linkedin": "https://linkedin.com/company/acme-corp",
    "companySize": "10-50 employés",
    "employees": "50",
    "creationYear": "2015",
    "ceo": "Marie Martin",
    "clientType": "PME",
    "digitalMaturity": "Intermédiaire",
    "techStack": ["React", "Node.js", "PostgreSQL", "AWS"],
    "triggerEvent": "Ouverture d'une nouvelle agence à Lyon",
    "googleRating": "4.5",
    "googleReviewsCount": "127",
    "businessCategory": "Services B2B",
    "businessVertical": "Technologie",
    "geographicData": {
      "city": "Paris",
      "region": "Île-de-France",
      "country": "France",
      "postalCode": "75001",
      "coordinates": {
        "lat": 48.8566,
        "lng": 2.3522
      }
    },
    "socialNetworks": {
      "linkedin": "https://linkedin.com/company/acme-corp",
      "twitter": "https://twitter.com/acmecorp",
      "facebook": "https://facebook.com/acmecorp"
    },
    "reliability": {
      "dataCompleteness": 85,
      "sourceReliability": 90,
      "lastValidated": "2024-01-15T10:30:00Z"
    },
    "sources": [
      "Google Maps",
      "Sirene",
      "LinkedIn",
      "Site Web Officiel"
    ]
  },
  
  "qualityScore": {
    "overallScore": 78,
    "emailValid": true,
    "phoneValid": true,
    "dataCompleteness": 85,
    "sourceReliability": 90,
    "dataFreshness": 5,
    "missingFields": ["website", "linkedin"],
    "suspiciousFields": [],
    "lastValidatedAt": "2024-01-15T10:30:00Z"
  },
  
  "activities": [
    {
      "id": "activity-uuid-1",
      "userId": "user-uuid-here",
      "activityType": "email",
      "subject": "Prise de contact initiale",
      "description": "Email envoyé pour présenter nos services",
      "duration": null,
      "activityDate": "2024-01-10T09:00:00Z",
      "outcome": "positive",
      "nextFollowupDate": "2024-01-17T09:00:00Z",
      "createdAt": "2024-01-10T09:00:00Z"
    },
    {
      "id": "activity-uuid-2",
      "userId": "user-uuid-here",
      "activityType": "call",
      "subject": "Appel de découverte",
      "description": "Appel téléphonique de 30 minutes pour comprendre les besoins",
      "duration": 30,
      "activityDate": "2024-01-12T14:00:00Z",
      "outcome": "positive",
      "nextFollowupDate": "2024-01-19T14:00:00Z",
      "createdAt": "2024-01-12T14:00:00Z"
    },
    {
      "id": "activity-uuid-3",
      "userId": "user-uuid-here",
      "activityType": "meeting",
      "subject": "Réunion de présentation",
      "description": "Réunion en visio pour présenter notre solution",
      "duration": 60,
      "activityDate": "2024-01-15T10:00:00Z",
      "outcome": "neutral",
      "nextFollowupDate": "2024-01-22T10:00:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  
  "quotes": [
    {
      "id": "quote-uuid-1",
      "quoteNumber": "DEV-2024-001",
      "title": "Devis Marketing Digital",
      "description": "Prestation de services marketing digital pour Q1 2024",
      "subtotal": 45000,
      "taxRate": 20,
      "taxAmount": 9000,
      "total": 54000,
      "currency": "EUR",
      "status": "sent",
      "validUntil": "2024-02-15",
      "sentAt": "2024-01-15T11:00:00Z",
      "viewedAt": "2024-01-15T14:30:00Z",
      "acceptedAt": null,
      "items": [
        {
          "id": "item-uuid-1",
          "description": "Stratégie marketing digital",
          "quantity": 1,
          "unitPrice": 15000,
          "total": 15000,
          "position": 0
        },
        {
          "id": "item-uuid-2",
          "description": "Création de contenu (10 articles)",
          "quantity": 10,
          "unitPrice": 500,
          "total": 5000,
          "position": 1
        },
        {
          "id": "item-uuid-3",
          "description": "Gestion réseaux sociaux (3 mois)",
          "quantity": 3,
          "unitPrice": 5000,
          "total": 15000,
          "position": 2
        },
        {
          "id": "item-uuid-4",
          "description": "Publicité Google Ads (budget inclus)",
          "quantity": 1,
          "unitPrice": 10000,
          "total": 10000,
          "position": 3
        }
      ],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ],
  
  "invoices": [],
  
  "timeline": [
    {
      "id": "timeline-uuid-1",
      "type": "lead_created",
      "title": "Lead créé",
      "description": "Lead créé via Robot Prospection",
      "date": "2024-01-10T09:00:00Z",
      "userId": "system",
      "metadata": {
        "source": "Robot Prospection",
        "zone": "Paris",
        "activity": "Agences Marketing & Com"
      }
    },
    {
      "id": "timeline-uuid-2",
      "type": "status_changed",
      "title": "Statut changé",
      "description": "Statut changé de 'Nouveau' à 'Découverte'",
      "date": "2024-01-12T14:00:00Z",
      "userId": "user-uuid-here",
      "metadata": {
        "oldStatus": "Nouveau",
        "newStatus": "Découverte"
      }
    },
    {
      "id": "timeline-uuid-3",
      "type": "activity",
      "title": "Appel téléphonique",
      "description": "Appel de découverte effectué",
      "date": "2024-01-12T14:00:00Z",
      "userId": "user-uuid-here",
      "metadata": {
        "activityType": "call",
        "duration": 30
      }
    }
  ]
}
```

## Modèle pour import multiple (tableau de leads)

```json
[
  {
    "name": "Jean Dupont",
    "company": "Acme Corporation",
    "email": "jean.dupont@example.com",
    "phone": "+33612345678",
    "stage": "Nouveau",
    "lifecycleStage": "Lead",
    "source": "Site Web",
    "value": 50000,
    "probability": 25,
    "lastContact": "Jamais",
    "family": "Grandes Entreprises & ETI",
    "temperature": "Tiède",
    "industry": "Agences Marketing & Com",
    "website": "https://www.acme-corp.com",
    "address": "123 Rue de la République, 75001 Paris",
    "linkedin": "https://linkedin.com/company/acme-corp",
    "description": "Entreprise spécialisée dans le développement de logiciels B2B"
  },
  {
    "name": "Marie Martin",
    "company": "TechStart SAS",
    "email": "marie.martin@techstart.fr",
    "phone": "+33698765432",
    "stage": "Découverte",
    "lifecycleStage": "MQL",
    "source": "LinkedIn",
    "value": 30000,
    "probability": 40,
    "lastContact": "2024-01-14",
    "family": "Startups Tech / SaaS",
    "temperature": "Chaud",
    "industry": "Startups Tech / SaaS",
    "website": "https://www.techstart.fr",
    "description": "Startup en croissance dans le secteur SaaS"
  }
]
```

## Modèle pour prospection (résultats de recherche)

```json
{
  "searchId": "search-uuid-here",
  "zone": "Paris",
  "activity": "Agences Marketing & Com",
  "status": "completed",
  "leadsFound": 15,
  "leadsAdded": 12,
  "sourcesUsed": [
    "Google Maps",
    "Sirene",
    "LinkedIn",
    "Site Web Officiel",
    "Pages Jaunes"
  ],
  "executionTimeSeconds": 245,
  "startedAt": "2024-01-15T09:00:00Z",
  "completedAt": "2024-01-15T09:04:05Z",
  "leads": [
    {
      "id": "lead-uuid-1",
      "name": "Jean Dupont",
      "company": "Acme Corporation",
      "email": "jean.dupont@example.com",
      "phone": "+33612345678",
      "stage": "Nouveau",
      "lifecycleStage": "Lead",
      "source": "Robot Prospection",
      "value": 0,
      "probability": 20,
      "lastContact": "Jamais",
      "description": "Entreprise identifiée via Google Maps et Sirene",
      "industry": "Agences Marketing & Com",
      "triggerEvent": "Ouverture d'une nouvelle agence",
      "website": "https://www.acme-corp.com",
      "address": "123 Rue de la République, 75001 Paris, France",
      "linkedin": "https://linkedin.com/company/acme-corp",
      "companySize": "10-50 employés",
      "clientType": "PME",
      "digitalMaturity": "Intermédiaire",
      "socialNetworks": {
        "linkedin": "https://linkedin.com/company/acme-corp",
        "facebook": "https://facebook.com/acmecorp"
      },
      "sources": [
        "Google Maps",
        "Sirene",
        "LinkedIn",
        "Site Web Officiel"
      ],
      "qualityScore": {
        "overallScore": 78,
        "emailValid": true,
        "phoneValid": true,
        "dataCompleteness": 85,
        "sourceReliability": 90,
        "dataFreshness": 0,
        "missingFields": [],
        "suspiciousFields": []
      }
    }
  ]
}
```

## Modèle pour scores de qualité

```json
{
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "overallScore": 78,
  "emailValid": true,
  "phoneValid": true,
  "dataCompleteness": 85,
  "sourceReliability": 90,
  "dataFreshness": 5,
  "missingFields": ["website", "linkedin"],
  "suspiciousFields": [],
  "lastValidatedAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Modèle pour activités commerciales

```json
{
  "id": "activity-uuid-1",
  "userId": "user-uuid-here",
  "leadId": "lead-uuid-here",
  "activityType": "call",
  "subject": "Appel de découverte",
  "description": "Appel téléphonique de 30 minutes pour comprendre les besoins du client",
  "duration": 30,
  "activityDate": "2024-01-12T14:00:00Z",
  "outcome": "positive",
  "nextFollowupDate": "2024-01-19T14:00:00Z",
  "createdAt": "2024-01-12T14:00:00Z",
  "updatedAt": "2024-01-12T14:00:00Z"
}
```

## Modèle pour historique de prospection

```json
{
  "id": "history-uuid-1",
  "scheduledSearchId": "scheduled-search-uuid-here",
  "zone": "Paris",
  "activity": "Agences Marketing & Com",
  "status": "completed",
  "leadsFound": 15,
  "leadsAdded": 12,
  "sourcesUsed": [
    "Google Maps",
    "Sirene",
    "LinkedIn",
    "Site Web Officiel"
  ],
  "errorMessage": null,
  "executionTimeSeconds": 245,
  "startedAt": "2024-01-15T09:00:00Z",
  "completedAt": "2024-01-15T09:04:05Z",
  "createdBy": "user-uuid-here"
}
```

## Modèle pour recherche planifiée

```json
{
  "id": "scheduled-search-uuid-1",
  "name": "Prospection Paris - Marketing",
  "zone": "Paris",
  "activity": "Agences Marketing & Com",
  "frequency": "weekly",
  "dayOfWeek": 1,
  "dayOfMonth": null,
  "timeOfDay": "09:00:00",
  "isActive": true,
  "lastRunAt": "2024-01-15T09:00:00Z",
  "nextRunAt": "2024-01-22T09:00:00Z",
  "totalRuns": 5,
  "totalLeadsFound": 75,
  "createdBy": "user-uuid-here",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T09:00:00Z"
}
```

## Valeurs autorisées

### Stages
- `"Nouveau"`, `"Découverte"`, `"Proposition"`, `"Négociation"`, `"Gagné"`

### Lifecycle Stages
- `"Audience"`, `"Lead"`, `"MQL"`, `"SQL"`, `"Contact"`, `"Opportunité"`, `"Client"`, `"Client Actif"`, `"Ambassadeur"`, `"Inactif"`, `"Perdu"`

### Sources
- `"Site Web"`, `"LinkedIn"`, `"Référence"`, `"Pubs"`, `"Appel froid"`, `"Robot Prospection"`

### Familles
- `"Artisans"`, `"Commerçants"`, `"Industrie & Manufacturier"`, `"Professions Libérales"`, `"Hôtellerie, Restauration & Loisirs"`, `"Grandes Entreprises & ETI"`

### Températures
- `"Chaud"`, `"Tiède"`, `"Froid"`

### Types d'activités
- `"call"`, `"email"`, `"meeting"`, `"note"`, `"task"`, `"quote_sent"`, `"proposal_sent"`, `"follow_up"`

### Statuts de devis
- `"draft"`, `"sent"`, `"viewed"`, `"accepted"`, `"rejected"`, `"expired"`

### Statuts de facture
- `"draft"`, `"sent"`, `"viewed"`, `"paid"`, `"overdue"`, `"cancelled"`, `"refunded"`

## Notes importantes

1. **UUIDs** : Tous les identifiants doivent être des UUIDs valides (format RFC 4122)
2. **Dates** : Format ISO 8601 avec timezone (ex: `2024-01-15T10:30:00Z`)
3. **Champs optionnels** : Les champs non requis peuvent être omis ou avoir la valeur `null`
4. **Tableaux** : Les tableaux peuvent être vides `[]` si aucune donnée n'est disponible
5. **Objets imbriqués** : Les objets d'enrichissement et de qualité peuvent être omis si non disponibles
6. **Normalisation** : Le système normalise automatiquement les sources lors de l'import

