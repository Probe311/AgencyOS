/**
 * Script d'enrichissement des leads
 * Enrichit chaque lead avec : SIREN, adresse complète, email, téléphone, décideurs, coordonnées GPS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_FILE = path.join(__dirname, '../Json/leads-global.json');
const OUTPUT_FILE = path.join(__dirname, '../Json/leads-global-enriched.json');
const DELAY_BETWEEN_REQUESTS = 2000; // 2 secondes entre chaque requête pour éviter les rate limits
const BATCH_SIZE = 10; // Traiter par lots pour sauvegarder régulièrement

// Option pour tester avec un échantillon (définir MAX_LEADS pour limiter)
const MAX_LEADS = process.env.MAX_LEADS ? parseInt(process.env.MAX_LEADS) : null;

/**
 * Recherche une entreprise dans l'API SIRENE (améliorée)
 */
async function searchSireneCompany(companyName, address) {
  try {
    // Nettoyer le nom de l'entreprise (supprimer les caractères spéciaux, abréviations)
    const cleanName = companyName
      .replace(/\s+(SARL|SAS|SA|EURL|SNC|SCS|SCA|SASU|SCI|SELARL|SELAS|SELAFA|SCP)\s*$/i, '')
      .replace(/[^\w\s-]/g, ' ')
      .trim();
    
    // Essayer plusieurs variations du nom
    const nameVariations = [
      cleanName,
      companyName,
      cleanName.replace(/\s+/g, ' '),
      cleanName.replace(/^(le|la|les|l')\s+/i, '')
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Supprimer les doublons
    
    for (const nameVariation of nameVariations) {
      if (!nameVariation || nameVariation.length < 3) continue;
      
      let searchUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(nameVariation)}&per_page=10`;
      
      // Si on a une adresse, extraire le code postal pour améliorer la recherche
      if (address) {
        const postalCodeMatch = address.match(/\b(\d{5})\b/);
        if (postalCodeMatch) {
          const department = postalCodeMatch[1].substring(0, 2);
          searchUrl += `&departement=${department}`;
        }
      }
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`  → [SIRENE] Rate limit atteint, attente 60s...`);
          await sleep(60000);
          continue;
        }
        if (response.status === 404) {
          continue; // Essayer la variation suivante
        }
        continue;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Trouver la meilleure correspondance
        let bestMatch = null;
        let bestScore = 0;
        
        for (const company of data.results) {
          let score = 0;
          
          // Score basé sur le nom
          const companyNameLower = (company.nom_complet || company.nom_raison_sociale || '').toLowerCase();
          const searchNameLower = nameVariation.toLowerCase();
          
          if (companyNameLower === searchNameLower) {
            score += 100;
          } else if (companyNameLower.includes(searchNameLower) || searchNameLower.includes(companyNameLower)) {
            score += 50;
          }
          
          // Score basé sur l'adresse si disponible
          if (address) {
            const companyAddress = (company.siege?.adresse || company.adresse || '').toLowerCase();
            const companyCity = (company.siege?.ville || company.ville || '').toLowerCase();
            const companyPostal = (company.siege?.code_postal || company.code_postal || '').toLowerCase();
            const searchAddress = address.toLowerCase();
            
            if (companyPostal && searchAddress.includes(companyPostal)) {
              score += 30;
            }
            if (companyCity && searchAddress.includes(companyCity)) {
              score += 20;
            }
            if (companyAddress && (searchAddress.includes(companyAddress.substring(0, 10)) || 
                companyAddress.includes(searchAddress.substring(0, 10)))) {
              score += 20;
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = company;
          }
        }
        
        // Si on a une bonne correspondance (score > 50), retourner les données
        if (bestMatch && bestScore >= 50) {
          return {
            siren: bestMatch.siren || '',
            siret: bestMatch.siret || '',
            nom_complet: bestMatch.nom_complet || bestMatch.nom_raison_sociale || '',
            adresse: bestMatch.siege?.adresse || bestMatch.adresse || '',
            code_postal: bestMatch.siege?.code_postal || bestMatch.code_postal || '',
            ville: bestMatch.siege?.ville || bestMatch.ville || '',
            activite_principale: bestMatch.activite_principale || '',
            date_creation: bestMatch.date_creation || '',
            tranche_effectif: bestMatch.tranche_effectif || '',
            score: bestScore
          };
        }
      }
      
      // Délai entre les requêtes pour éviter les rate limits
      await sleep(1000);
    }
    
    return null;
  } catch (error) {
    console.warn(`  → [SIRENE] Erreur pour "${companyName}":`, error.message);
    return null;
  }
}

/**
 * Géocode une adresse pour obtenir les coordonnées GPS
 */
async function geocodeAddress(address) {
  try {
    if (!address || address.trim() === '') return null;
    
    // Utiliser Nominatim (OpenStreetMap) - gratuit, pas besoin d'API key
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=fr`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'AgencyOS-LeadEnrichment/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        formatted_address: data[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`[Géocodage] Erreur pour "${address}":`, error.message);
    return null;
  }
}

/**
 * Recherche des informations supplémentaires via recherche web
 */
async function searchCompanyInfo(companyName, website, address) {
  try {
    // Construire une requête de recherche
    const searchQuery = `"${companyName}" ${address ? address.split(',')[0] : ''} contact email téléphone`.trim();
    
    // Utiliser Google Search (via web_search tool si disponible)
    // Sinon, on peut utiliser une recherche simple via fetch
    // Note: Google Search nécessite une API key, mais on peut essayer une recherche basique
    
    // Pour l'instant, on retourne les informations qu'on peut extraire du site web
    if (website) {
      try {
        // Essayer de récupérer le contenu de la page d'accueil
        const response = await fetch(website, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Extraire les emails (pattern basique)
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const emails = html.match(emailRegex) || [];
          const uniqueEmails = [...new Set(emails)].filter(e => 
            !e.includes('example.com') && 
            !e.includes('test.com') &&
            !e.includes('placeholder')
          );
          
          // Extraire les téléphones (format français)
          const phoneRegex = /(?:0|\+33)[1-9](?:[.\s-]?\d{2}){4}/g;
          const phones = html.match(phoneRegex) || [];
          const uniquePhones = [...new Set(phones)];
          
          return {
            emails: uniqueEmails.slice(0, 3), // Max 3 emails
            phones: uniquePhones.slice(0, 2) // Max 2 téléphones
          };
        }
      } catch (error) {
        // Ignorer les erreurs de fetch
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`[Recherche Web] Erreur pour "${companyName}":`, error.message);
    return null;
  }
}

/**
 * Recherche des informations sur société.com
 */
async function searchSocieteCom(companyName, siret) {
  try {
    // Construire l'URL de recherche société.com
    // Note: société.com peut bloquer les requêtes automatisées
    const searchQuery = encodeURIComponent(companyName);
    
    // Essayer d'abord avec le SIRET si disponible
    let searchUrl = '';
    if (siret && siret.length === 14) {
      searchUrl = `https://www.societe.com/societe/${siret}`;
    } else {
      searchUrl = `https://www.societe.com/cgi-bin/search?champs=${searchQuery}`;
    }
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.societe.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      // Société.com peut retourner 403 pour les bots, on ignore silencieusement
      if (response.status === 403) {
        console.warn(`  → [Société.com] Accès bloqué (probablement anti-bot)`);
      }
      return null;
    }

    const html = await response.text();
    
    // Extraire les informations de la page
    const results = {
      siret: null,
      siren: null,
      capital: null,
      dirigeants: [],
      dateCreation: null
    };
    
    // Chercher le SIRET dans la page (plusieurs patterns possibles)
    const siretPatterns = [
      /SIRET[:\s]+(\d{14})/i,
      /(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})/,
      /siret[:\s]*(\d{14})/i
    ];
    
    for (const pattern of siretPatterns) {
      const match = html.match(pattern);
      if (match) {
        const siretFound = match[1].replace(/\s/g, '');
        if (siretFound.length === 14) {
          results.siret = siretFound;
          results.siren = siretFound.substring(0, 9);
          break;
        }
      }
    }
    
    // Chercher le capital (plusieurs formats)
    const capitalPatterns = [
      /Capital[:\s]+([\d\s,]+)\s*€/i,
      /Capital social[:\s]+([\d\s,]+)\s*€/i,
      /([\d\s,]+)\s*€\s*de capital/i
    ];
    
    for (const pattern of capitalPatterns) {
      const match = html.match(pattern);
      if (match) {
        results.capital = match[1].replace(/[\s,]/g, '');
        break;
      }
    }
    
    // Chercher les dirigeants (patterns variés)
    const dirigeantPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*-\s*([^<\n]+)/g,
      /<[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)<\/[^>]*>\s*<[^>]*>([^<]+)<\/[^>]*>/g,
      /Dirigeant[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi
    ];
    
    for (const pattern of dirigeantPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches.slice(0, 5)) {
        const name = (match[1] || '').trim();
        const role = (match[2] || 'Dirigeant').trim();
        if (name.length > 3 && name.length < 50 && !results.dirigeants.some(d => d.name.toLowerCase() === name.toLowerCase())) {
          results.dirigeants.push({ name, role: role || 'Dirigeant' });
        }
      }
      if (results.dirigeants.length > 0) break;
    }
    
    // Chercher la date de création
    const datePatterns = [
      /Crée[ée]\s+le[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /Date de création[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        results.dateCreation = match[1];
        break;
      }
    }
    
    // Retourner les résultats seulement si on a trouvé quelque chose
    const hasData = results.siret || results.capital || results.dirigeants.length > 0 || results.dateCreation;
    return hasData ? results : null;
  } catch (error) {
    console.warn(`  → [Société.com] Erreur pour "${companyName}":`, error.message);
    return null;
  }
}

/**
 * Recherche des informations sur LinkedIn (via recherche web)
 */
async function searchLinkedIn(companyName, website) {
  try {
    // LinkedIn nécessite une authentification pour accéder à l'API officielle
    // On peut essayer de rechercher via Google avec "site:linkedin.com"
    const searchQuery = `site:linkedin.com/company "${companyName}"`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=5`;
    
    const response = await fetch(googleSearchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Extraire les URLs LinkedIn de la page
    const linkedinUrlPattern = /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/([a-zA-Z0-9-]+)/g;
    const linkedinUrls = [...html.matchAll(linkedinUrlPattern)];
    
    const results = {
      companyUrl: null,
      employees: []
    };
    
    for (const match of linkedinUrls) {
      if (match[2] === 'company') {
        results.companyUrl = match[0];
        break;
      }
    }
    
    // Note: Pour obtenir plus d'informations (employés, dirigeants), il faudrait
    // soit utiliser l'API LinkedIn officielle (nécessite OAuth), soit scraper
    // les pages LinkedIn (complexe et peut violer les ToS)
    
    return results.companyUrl ? results : null;
  } catch (error) {
    console.warn(`  → [LinkedIn] Erreur pour "${companyName}":`, error.message);
    return null;
  }
}

/**
 * Recherche des décideurs via recherche web et IA
 */
async function searchDecisionMakers(companyName, website) {
  try {
    // Construire une requête de recherche pour trouver les dirigeants
    const searchQuery = `"${companyName}" dirigeant directeur gérant CEO fondateur`;
    
    // Note: Pour une recherche efficace, on pourrait utiliser:
    // - Google Custom Search API
    // - SerpAPI
    // - ScraperAPI
    // - LinkedIn (nécessite OAuth)
    
    // Pour l'instant, on peut essayer d'extraire depuis le site web
    if (website) {
      try {
        const response = await fetch(website, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Chercher des patterns de noms de dirigeants dans le HTML
          // Pattern: "Prénom Nom" suivi de "Directeur", "Gérant", etc.
          const directorPattern = /(?:directeur|gérant|fondateur|ceo|pdg|président)[^<]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi;
          const matches = [...html.matchAll(directorPattern)];
          
          if (matches.length > 0) {
            const decisionMakers = matches
              .map(m => m[1])
              .filter(name => name.length > 3 && name.length < 50)
              .slice(0, 3); // Max 3 décideurs
            
            if (decisionMakers.length > 0) {
              return decisionMakers.map(name => ({
                name: name.trim(),
                role: 'Dirigeant',
                source: 'website'
              }));
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`[Décideurs] Erreur pour "${companyName}":`, error.message);
    return null;
  }
}

/**
 * Utilise l'IA via OpenRouter pour enrichir les informations d'un lead
 */
async function enrichWithAI(lead, sireneData) {
  try {
    // Vérifier si une clé API OpenRouter est disponible
    const openRouterApiKey = process.env.OPENROUTER_API_KEY || 
                             process.env.VITE_OPENROUTER_API_KEY ||
                             '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';
    
    if (!openRouterApiKey) {
      console.log(`  → Clé API OpenRouter non trouvée, skip de l'enrichissement IA`);
      return null;
    }
    
    // Construire le prompt pour l'IA (version courte pour économiser les tokens)
    const companyName = lead.company || lead.name || '';
    const website = lead.website || '';
    const address = lead.address || '';
    const contactName = lead.name || '';
    const siret = sireneData?.siret || '';
    
    // Extraire le domaine du site web pour proposer un email
    let emailDomain = '';
    if (website) {
      try {
        const url = new URL(website.startsWith('http') ? website : `https://${website}`);
        emailDomain = url.hostname.replace('www.', '');
      } catch (e) {
        emailDomain = website.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || '';
      }
    }
    
    const prompt = `Enrichis données entreprise (JSON uniquement):
Ent: ${companyName}
Web: ${website}
Adr: ${address}
${siret ? `SIRET: ${siret}` : ''}
Contact: ${contactName}

1. Email manquant? Propose contact@${emailDomain || 'entreprise.com'} ou null
2. Phone: null
3. Décideurs: Si "${contactName}" existe, utilise. Sinon cherche. Format: [{"name":"Nom","role":"Rôle"}] ou []
4. Adr: Complète si incomplète, sinon null

JSON: {"email":"..." ou null,"phone":null,"decisionMakers":[...] ou [],"address":"..." ou null}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': 'https://github.com/AgencyOS',
        'X-Title': 'AgencyOS Lead Enrichment'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5', // Modèle plus économique et rapide
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Plus bas pour des réponses plus précises
        max_tokens: 500 // Réduit pour économiser les crédits
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = JSON.parse(errorText).error;
      
      if (response.status === 402) {
        // Erreur de crédits insuffisants
        console.warn(`  → Crédits OpenRouter insuffisants ou limite de tokens dépassée. Skip de l'enrichissement IA pour ce lead.`);
        return null;
      }
      
      console.warn(`  → Erreur OpenRouter (${response.status}): ${errorData?.message || errorText.substring(0, 100)}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) return null;
    
    // Extraire le JSON de la réponse (peut être dans un code block markdown)
    let jsonText = text.trim();
    
    // Supprimer les code blocks markdown si présents
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Chercher le JSON dans le texte
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn(`  → Erreur parsing JSON IA: ${parseError.message}`);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`  → Erreur IA pour "${lead.company || lead.name}": ${error.message}`);
    return null;
  }
}

/**
 * Enrichit un lead avec toutes les informations disponibles
 */
async function enrichLead(lead, index, total) {
  console.log(`\n[${index + 1}/${total}] Enrichissement de: ${lead.company || lead.name}`);
  
  const enriched = { ...lead };
  let hasChanges = false;
  
  // Initialiser les champs manquants
  if (!enriched.decisionMakers) {
    enriched.decisionMakers = [];
  }
  
  // 1. Recherche SIREN/SIRET si manquant (API SIRENE)
  if (!enriched.siret && !enriched.siren) {
    console.log(`  → Recherche SIREN/SIRET (API SIRENE)...`);
    const sireneData = await searchSireneCompany(lead.company || lead.name, lead.address);
    
    if (sireneData && sireneData.siret) {
      enriched.siret = sireneData.siret;
      enriched.siren = sireneData.siren;
      hasChanges = true;
      console.log(`  ✓ SIRET trouvé: ${sireneData.siret} (score: ${sireneData.score || 'N/A'})`);
      
      // Enrichir l'adresse si plus complète
      if (sireneData.adresse && sireneData.code_postal && sireneData.ville) {
        const fullAddress = `${sireneData.adresse}, ${sireneData.code_postal} ${sireneData.ville}`;
        if (!enriched.address || enriched.address.length < fullAddress.length) {
          enriched.address = fullAddress;
          hasChanges = true;
          console.log(`  ✓ Adresse enrichie: ${fullAddress}`);
        }
      }
      
      // Ajouter les données SIRENE supplémentaires
      enriched.sireneData = {
        nom_complet: sireneData.nom_complet,
        activite_principale: sireneData.activite_principale,
        date_creation: sireneData.date_creation,
        tranche_effectif: sireneData.tranche_effectif
      };
    } else {
      console.log(`  → SIRET non trouvé via API SIRENE`);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  } else {
    console.log(`  → SIRET déjà présent: ${enriched.siret || enriched.siren}`);
  }
  
  // 1b. Recherche sur société.com si SIRET toujours manquant
  if (!enriched.siret && !enriched.siren) {
    console.log(`  → Recherche sur société.com...`);
    const societeData = await searchSocieteCom(lead.company || lead.name, enriched.siret);
    
    if (societeData) {
      if (societeData.siret && !enriched.siret) {
        enriched.siret = societeData.siret;
        enriched.siren = societeData.siren;
        hasChanges = true;
        console.log(`  ✓ SIRET trouvé sur société.com: ${societeData.siret}`);
      }
      
      // Ajouter les dirigeants trouvés
      if (societeData.dirigeants && societeData.dirigeants.length > 0) {
        const existingNames = new Set((enriched.decisionMakers || []).map(d => d.name.toLowerCase()));
        const newDirigeants = societeData.dirigeants.filter(d => !existingNames.has(d.name.toLowerCase()));
        if (newDirigeants.length > 0) {
          enriched.decisionMakers = [...(enriched.decisionMakers || []), ...newDirigeants.map(d => ({ ...d, source: 'societe.com' }))];
          hasChanges = true;
          console.log(`  ✓ ${newDirigeants.length} dirigeant(s) trouvé(s) sur société.com`);
        }
      }
      
      // Ajouter les données société.com
      enriched.societeComData = {
        capital: societeData.capital,
        dateCreation: societeData.dateCreation
      };
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  
  // 2. Géocodage GPS si adresse disponible
  if (enriched.address && (!enriched.latitude || !enriched.longitude)) {
    console.log(`  → Géocodage de l'adresse...`);
    const geoData = await geocodeAddress(enriched.address);
    
    if (geoData) {
      enriched.latitude = geoData.latitude;
      enriched.longitude = geoData.longitude;
      enriched.formatted_address = geoData.formatted_address;
      hasChanges = true;
      console.log(`  ✓ Coordonnées GPS: ${geoData.latitude}, ${geoData.longitude}`);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  } else if (enriched.latitude && enriched.longitude) {
    console.log(`  → Coordonnées GPS déjà présentes`);
  }
  
  // 3. Recherche email et téléphone si manquants
  if ((!enriched.email || enriched.email === 'Non trouvé' || enriched.email.trim() === '') ||
      (!enriched.phone || enriched.phone === 'Non trouvé' || enriched.phone.trim() === '')) {
    console.log(`  → Recherche email et téléphone...`);
    const webInfo = await searchCompanyInfo(
      lead.company || lead.name, 
      lead.website || enriched.website,
      enriched.address || lead.address
    );
    
    if (webInfo) {
      if (webInfo.emails && webInfo.emails.length > 0 && 
          (!enriched.email || enriched.email === 'Non trouvé' || enriched.email.trim() === '')) {
        enriched.email = webInfo.emails[0];
        hasChanges = true;
        console.log(`  ✓ Email trouvé: ${webInfo.emails[0]}`);
      }
      
      if (webInfo.phones && webInfo.phones.length > 0 && 
          (!enriched.phone || enriched.phone === 'Non trouvé' || enriched.phone.trim() === '')) {
        enriched.phone = webInfo.phones[0].replace(/\s+/g, ' ').trim();
        hasChanges = true;
        console.log(`  ✓ Téléphone trouvé: ${webInfo.phones[0]}`);
      }
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  
  // 5. Recherche LinkedIn
  if (!enriched.linkedinUrl || enriched.linkedinUrl === 'Non trouvé') {
    console.log(`  → Recherche LinkedIn...`);
    const linkedinData = await searchLinkedIn(
      lead.company || lead.name,
      lead.website || enriched.website
    );
    
    if (linkedinData && linkedinData.companyUrl) {
      enriched.linkedinUrl = linkedinData.companyUrl;
      hasChanges = true;
      console.log(`  ✓ LinkedIn trouvé: ${linkedinData.companyUrl}`);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  
  // 6. Recherche décideurs (site web)
  if (!enriched.decisionMakers || enriched.decisionMakers.length === 0) {
    console.log(`  → Recherche décideurs (site web)...`);
    const decisionMakers = await searchDecisionMakers(
      lead.company || lead.name,
      lead.website || enriched.website
    );
    
    if (decisionMakers && decisionMakers.length > 0) {
      enriched.decisionMakers = decisionMakers;
      hasChanges = true;
      console.log(`  ✓ ${decisionMakers.length} décideur(s) trouvé(s) sur le site web`);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  
  // 7. Enrichissement via IA (si des données manquent encore)
  const missingData = [];
  if (!enriched.email || enriched.email === 'Non trouvé' || enriched.email.trim() === '') missingData.push('email');
  if (!enriched.phone || enriched.phone === 'Non trouvé' || enriched.phone.trim() === '') missingData.push('phone');
  if (!enriched.decisionMakers || enriched.decisionMakers.length === 0) missingData.push('decisionMakers');
  
  if (missingData.length > 0) {
    console.log(`  → Enrichissement IA pour: ${missingData.join(', ')}...`);
    const aiData = await enrichWithAI(lead, enriched.sireneData);
    
    if (aiData) {
      if (aiData.email && (!enriched.email || enriched.email === 'Non trouvé')) {
        enriched.email = aiData.email;
        hasChanges = true;
        console.log(`  ✓ Email IA: ${aiData.email}`);
      }
      
      if (aiData.phone && (!enriched.phone || enriched.phone === 'Non trouvé')) {
        enriched.phone = aiData.phone;
        hasChanges = true;
        console.log(`  ✓ Téléphone IA: ${aiData.phone}`);
      }
      
      if (aiData.decisionMakers && aiData.decisionMakers.length > 0 && 
          (!enriched.decisionMakers || enriched.decisionMakers.length === 0)) {
        enriched.decisionMakers = aiData.decisionMakers;
        hasChanges = true;
        console.log(`  ✓ ${aiData.decisionMakers.length} décideur(s) IA trouvé(s)`);
      }
      
      if (aiData.address && (!enriched.address || enriched.address.length < aiData.address.length)) {
        enriched.address = aiData.address;
        hasChanges = true;
        console.log(`  ✓ Adresse IA enrichie`);
      }
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  
  // Mettre à jour le score de qualité
  if (hasChanges) {
    enriched.enrichedAt = new Date().toISOString();
    enriched.enrichmentSource = 'script-enrichment';
  }
  
  return enriched;
}

/**
 * Fonction utilitaire pour attendre
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('🚀 Démarrage de l\'enrichissement des leads...\n');
    
    // Lire le fichier JSON
    console.log(`📖 Lecture du fichier: ${INPUT_FILE}`);
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    let leads = JSON.parse(fileContent);
    
    // Limiter le nombre de leads si MAX_LEADS est défini (pour les tests)
    if (MAX_LEADS && MAX_LEADS > 0) {
      leads = leads.slice(0, MAX_LEADS);
      console.log(`⚠️  Mode test: traitement limité à ${MAX_LEADS} leads\n`);
    }
    
    console.log(`✓ ${leads.length} leads trouvés\n`);
    
    const enrichedLeads = [];
    let processed = 0;
    
    // Traiter les leads par lots
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, Math.min(i + BATCH_SIZE, leads.length));
      
      console.log(`\n📦 Traitement du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(leads.length / BATCH_SIZE)}`);
      
      // Enrichir chaque lead du lot
      for (const lead of batch) {
        const enriched = await enrichLead(lead, processed, leads.length);
        enrichedLeads.push(enriched);
        processed++;
      }
      
      // Sauvegarder après chaque lot
      console.log(`\n💾 Sauvegarde intermédiaire...`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedLeads, null, 2), 'utf-8');
      console.log(`✓ ${processed}/${leads.length} leads traités et sauvegardés`);
    }
    
    // Sauvegarde finale
    console.log(`\n💾 Sauvegarde finale...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedLeads, null, 2), 'utf-8');
    
    // Statistiques
    const stats = {
      total: enrichedLeads.length,
      withSiret: enrichedLeads.filter(l => l.siret).length,
      withSiren: enrichedLeads.filter(l => l.siren).length,
      withGPS: enrichedLeads.filter(l => l.latitude && l.longitude).length,
      withEmail: enrichedLeads.filter(l => l.email && l.email !== 'Non trouvé').length,
      withPhone: enrichedLeads.filter(l => l.phone && l.phone !== 'Non trouvé').length
    };
    
    console.log(`\n✅ Enrichissement terminé !`);
    console.log(`\n📊 Statistiques:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Avec SIRET: ${stats.withSiret} (${((stats.withSiret / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Avec SIREN: ${stats.withSiren} (${((stats.withSiren / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Avec GPS: ${stats.withGPS} (${((stats.withGPS / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Avec Email: ${stats.withEmail} (${((stats.withEmail / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Avec Téléphone: ${stats.withPhone} (${((stats.withPhone / stats.total) * 100).toFixed(1)}%)`);
    console.log(`\n📁 Fichier sauvegardé: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'enrichissement:', error);
    process.exit(1);
  }
}

// Exécuter le script
main();

