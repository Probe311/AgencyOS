/**
 * Détection intelligente de doublons pour les leads - Version optimisée
 */

export interface DuplicateMatch {
  leadId: string;
  confidence: number; // 0-100
  matchType: 'exact' | 'similar' | 'fuzzy';
  matchedFields: string[];
}

export interface DuplicateGroup {
  leads: Array<{ id: string; company: string; email?: string; phone?: string; name?: string }>;
  confidence: number;
  matchReason: string;
}

export interface DetectionOptions {
  minConfidence?: number;
  enableFuzzyMatch?: boolean;
  enableTransitiveGrouping?: boolean;
}

// Cache pour éviter les recalculs
const similarityCache = new Map<string, number>();
const normalizationCache = new Map<string, string>();

// Abréviations communes pour améliorer la normalisation
const COMPANY_ABBREVIATIONS: Record<string, string> = {
  'sarl': 'société à responsabilité limitée',
  'sas': 'société par actions simplifiée',
  'sa': 'société anonyme',
  'eurl': 'entreprise unipersonnelle à responsabilité limitée',
  'sci': 'société civile immobilière',
  'snc': 'société en nom collectif',
  'ltd': 'limited',
  'inc': 'incorporated',
  'corp': 'corporation',
  'llc': 'limited liability company',
  'plc': 'public limited company',
};

/**
 * Normalise une chaîne pour la comparaison (supprime accents, espaces, abréviations, etc.)
 */
function normalizeString(str: string): string {
  if (!str) return '';
  
  // Vérifier le cache
  const cacheKey = `str_${str}`;
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey)!;
  }
  
  let normalized = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .trim();
  
  // Remplacer les abréviations communes
  for (const [abbr, full] of Object.entries(COMPANY_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  }
  
  // Supprimer les caractères spéciaux mais garder les espaces pour les noms composés
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  
  // Normaliser les espaces multiples
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  normalizationCache.set(cacheKey, normalized);
  return normalized;
}

/**
 * Normalise un numéro de téléphone (gère formats internationaux)
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  const cacheKey = `phone_${phone}`;
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey)!;
  }
  
  // Supprimer tous les caractères non numériques sauf +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Convertir formats internationaux vers format français
  if (normalized.startsWith('+33')) {
    normalized = '0' + normalized.substring(3);
  } else if (normalized.startsWith('0033')) {
    normalized = '0' + normalized.substring(4);
  } else if (normalized.startsWith('33') && normalized.length > 10) {
    normalized = '0' + normalized.substring(2);
  }
  
  // Supprimer le + restant
  normalized = normalized.replace(/\+/g, '');
  
  normalizationCache.set(cacheKey, normalized);
  return normalized;
}

/**
 * Normalise un email (gère les alias Gmail)
 */
function normalizeEmail(email: string): string {
  if (!email) return '';
  
  const cacheKey = `email_${email}`;
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey)!;
  }
  
  let normalized = email.toLowerCase().trim();
  
  // Gérer les alias Gmail (ex: user+alias@gmail.com = user@gmail.com)
  if (normalized.includes('@gmail.com') || normalized.includes('@googlemail.com')) {
    const [local, domain] = normalized.split('@');
    const baseLocal = local.split('+')[0].replace(/\./g, '');
    normalized = `${baseLocal}@${domain}`;
  }
  
  normalizationCache.set(cacheKey, normalized);
  return normalized;
}

/**
 * Calcule la vraie distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix: number[][] = [];
  
  // Initialiser la première ligne et colonne
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Remplir la matrice
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Suppression
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calcule la similarité Jaro-Winkler (meilleur pour les noms)
 */
function jaroWinklerSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Trouver les correspondances
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Compter les transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (
    matches / s1.length +
    matches / s2.length +
    (matches - transpositions / 2) / matches
  ) / 3.0;
  
  // Bonus Jaro-Winkler pour préfixes communs
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (prefix * 0.1 * (1 - jaro));
}

/**
 * Calcule la similarité entre deux chaînes avec plusieurs algorithmes
 */
function calculateSimilarity(str1: string, str2: string, useJaroWinkler: boolean = false): number {
  if (!str1 || !str2) return 0;
  
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Vérifier le cache
  const cacheKey = `sim_${s1}_${s2}_${useJaroWinkler}`;
  if (similarityCache.has(cacheKey)) {
    return similarityCache.get(cacheKey)!;
  }
  
  let similarity = 0;
  
  // Vérification d'inclusion (très rapide)
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    similarity = Math.round((minLen / maxLen) * 100);
  } else {
    // Utiliser Jaro-Winkler pour les noms courts, Levenshtein pour les entreprises
    if (useJaroWinkler && Math.max(s1.length, s2.length) < 30) {
      similarity = Math.round(jaroWinklerSimilarity(s1, s2) * 100);
    } else {
      const distance = levenshteinDistance(s1, s2);
      const maxLen = Math.max(s1.length, s2.length);
      similarity = Math.round((1 - distance / maxLen) * 100);
    }
  }
  
  // Limiter le cache à 1000 entrées pour éviter les fuites mémoire
  if (similarityCache.size > 1000) {
    const firstKey = similarityCache.keys().next().value;
    similarityCache.delete(firstKey);
  }
  
  similarityCache.set(cacheKey, similarity);
  return similarity;
}

/**
 * Structure d'index pour accélérer les recherches
 */
interface LeadIndex {
  byEmail: Map<string, string[]>; // email -> leadIds
  byPhone: Map<string, string[]>; // phone -> leadIds
  byCompany: Map<string, string[]>; // company normalized -> leadIds
  byNameCompany: Map<string, string[]>; // name+company -> leadIds
}

/**
 * Crée un index des leads pour recherche rapide
 */
function buildIndex(
  leads: Array<{ id: string; company: string; email?: string; phone?: string; name?: string }>
): LeadIndex {
  const index: LeadIndex = {
    byEmail: new Map(),
    byPhone: new Map(),
    byCompany: new Map(),
    byNameCompany: new Map(),
  };
  
  for (const lead of leads) {
    // Index par email
    if (lead.email) {
      const emailKey = normalizeEmail(lead.email);
      if (!index.byEmail.has(emailKey)) {
        index.byEmail.set(emailKey, []);
      }
      index.byEmail.get(emailKey)!.push(lead.id);
    }
    
    // Index par téléphone
    if (lead.phone) {
      const phoneKey = normalizePhone(lead.phone);
      if (phoneKey.length >= 10) {
        if (!index.byPhone.has(phoneKey)) {
          index.byPhone.set(phoneKey, []);
        }
        index.byPhone.get(phoneKey)!.push(lead.id);
      }
    }
    
    // Index par entreprise
    if (lead.company) {
      const companyKey = normalizeString(lead.company);
      if (companyKey.length > 0) {
        if (!index.byCompany.has(companyKey)) {
          index.byCompany.set(companyKey, []);
        }
        index.byCompany.get(companyKey)!.push(lead.id);
      }
    }
    
    // Index par nom + entreprise
    if (lead.name && lead.company) {
      const nameCompanyKey = `${normalizeString(lead.name)}|${normalizeString(lead.company)}`;
      if (!index.byNameCompany.has(nameCompanyKey)) {
        index.byNameCompany.set(nameCompanyKey, []);
      }
      index.byNameCompany.get(nameCompanyKey)!.push(lead.id);
    }
  }
  
  return index;
}

/**
 * Détecte les doublons pour un lead donné (version optimisée avec indexation)
 */
export function detectDuplicates(
  lead: { id: string; company: string; email?: string; phone?: string; name?: string },
  allLeads: Array<{ id: string; company: string; email?: string; phone?: string; name?: string }>,
  index?: LeadIndex,
  options: DetectionOptions = {}
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const minConfidence = options.minConfidence ?? 70;
  const checkedIds = new Set<string>([lead.id]);
  
  // Utiliser l'index si fourni, sinon le construire
  const leadIndex = index || buildIndex(allLeads);
  
  // Créer un Map pour accès rapide aux leads
  const leadMap = new Map(allLeads.map(l => [l.id, l]));
  
  // 1. Email exact (100% de confiance)
  if (lead.email) {
    const emailKey = normalizeEmail(lead.email);
    const matchingIds = leadIndex.byEmail.get(emailKey) || [];
    for (const otherId of matchingIds) {
      if (checkedIds.has(otherId)) continue;
      checkedIds.add(otherId);
      const otherLead = leadMap.get(otherId);
      if (otherLead) {
        matches.push({
          leadId: otherId,
          confidence: 100,
          matchType: 'exact',
          matchedFields: ['email'],
        });
      }
    }
  }
  
  // 2. Téléphone exact (95% de confiance)
  if (lead.phone) {
    const phoneKey = normalizePhone(lead.phone);
    if (phoneKey.length >= 10) {
      const matchingIds = leadIndex.byPhone.get(phoneKey) || [];
      for (const otherId of matchingIds) {
        if (checkedIds.has(otherId)) continue;
        checkedIds.add(otherId);
        const otherLead = leadMap.get(otherId);
        if (otherLead) {
          matches.push({
            leadId: otherId,
            confidence: 95,
            matchType: 'exact',
            matchedFields: ['phone'],
          });
        }
      }
    }
  }
  
  // 3. Nom d'entreprise exact (90% de confiance)
  if (lead.company) {
    const companyKey = normalizeString(lead.company);
    if (companyKey.length > 0) {
      const matchingIds = leadIndex.byCompany.get(companyKey) || [];
      for (const otherId of matchingIds) {
        if (checkedIds.has(otherId)) continue;
        checkedIds.add(otherId);
        const otherLead = leadMap.get(otherId);
        if (otherLead) {
          matches.push({
            leadId: otherId,
            confidence: 90,
            matchType: 'exact',
            matchedFields: ['company'],
          });
        }
      }
    }
  }
  
  // 4. Nom + Entreprise exact (80%)
  if (lead.name && lead.company) {
    const nameCompanyKey = `${normalizeString(lead.name)}|${normalizeString(lead.company)}`;
    const matchingIds = leadIndex.byNameCompany.get(nameCompanyKey) || [];
    for (const otherId of matchingIds) {
      if (checkedIds.has(otherId)) continue;
      checkedIds.add(otherId);
      const otherLead = leadMap.get(otherId);
      if (otherLead) {
        matches.push({
          leadId: otherId,
          confidence: 80,
          matchType: 'exact',
          matchedFields: ['name', 'company'],
        });
      }
    }
  }
  
  // 5. Recherche fuzzy sur les entreprises (seulement si pas déjà trouvé)
  if (options.enableFuzzyMatch !== false && lead.company) {
    const companyKey = normalizeString(lead.company);
    if (companyKey.length > 0) {
      // Comparer avec toutes les entreprises similaires
      for (const [otherCompanyKey, otherIds] of leadIndex.byCompany.entries()) {
        if (otherCompanyKey === companyKey) continue; // Déjà traité
        
        const similarity = calculateSimilarity(lead.company, otherCompanyKey);
        if (similarity >= 85) {
          for (const otherId of otherIds) {
            if (checkedIds.has(otherId)) continue;
            checkedIds.add(otherId);
            const otherLead = leadMap.get(otherId);
            if (otherLead) {
              matches.push({
                leadId: otherId,
                confidence: similarity,
                matchType: similarity >= 90 ? 'similar' : 'fuzzy',
                matchedFields: ['company'],
              });
            }
          }
        }
      }
    }
  }
  
  // 6. Email + Entreprise similaire (75%)
  if (lead.email && lead.company) {
    const emailKey = normalizeEmail(lead.email);
    const matchingEmailIds = leadIndex.byEmail.get(emailKey) || [];
    
    for (const otherId of matchingEmailIds) {
      if (checkedIds.has(otherId)) continue;
      const otherLead = leadMap.get(otherId);
      if (otherLead && otherLead.company) {
        const companySimilarity = calculateSimilarity(lead.company, otherLead.company);
        if (companySimilarity >= 70) {
          checkedIds.add(otherId);
          matches.push({
            leadId: otherId,
            confidence: Math.max(75, companySimilarity),
            matchType: 'similar',
            matchedFields: ['email', 'company'],
          });
        }
      }
    }
  }
  
  // 7. Nom similaire + Entreprise (pour les noms avec variations)
  if (options.enableFuzzyMatch !== false && lead.name && lead.company) {
    const companyKey = normalizeString(lead.company);
    const nameKey = normalizeString(lead.name);
    
    // Chercher dans les leads avec la même entreprise
    const sameCompanyIds = leadIndex.byCompany.get(companyKey) || [];
    for (const otherId of sameCompanyIds) {
      if (checkedIds.has(otherId)) continue;
      const otherLead = leadMap.get(otherId);
      if (otherLead && otherLead.name) {
        const nameSimilarity = calculateSimilarity(lead.name, otherLead.name, true); // Jaro-Winkler pour les noms
        if (nameSimilarity >= 85) {
          checkedIds.add(otherId);
          matches.push({
            leadId: otherId,
            confidence: Math.max(75, nameSimilarity),
            matchType: nameSimilarity >= 90 ? 'similar' : 'fuzzy',
            matchedFields: ['name', 'company'],
          });
        }
      }
    }
  }
  
  // Filtrer par seuil de confiance et trier
  return matches
    .filter(m => m.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Structure Union-Find pour gérer les connexions transitives
 */
class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();
  
  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }
    
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }
  
  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) return;
    
    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;
    
    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }
  
  getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    
    for (const [leadId] of this.parent) {
      const root = this.find(leadId);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(leadId);
    }
    
    return groups;
  }
}

/**
 * Groupe les leads en doublons potentiels (version optimisée avec Union-Find)
 */
export function groupDuplicates(
  leads: Array<{ id: string; company: string; email?: string; phone?: string; name?: string }>,
  options: DetectionOptions = {}
): DuplicateGroup[] {
  if (leads.length === 0) return [];
  
  const enableTransitive = options.enableTransitiveGrouping !== false;
  const minConfidence = options.minConfidence ?? 70;
  
  // Construire l'index une seule fois
  const index = buildIndex(leads);
  const leadMap = new Map(leads.map(l => [l.id, l]));
  
  // Union-Find pour gérer les connexions transitives
  const uf = new UnionFind();
  const matchMap = new Map<string, DuplicateMatch[]>(); // leadId -> matches
  
  // Détecter tous les doublons
  for (const lead of leads) {
    const matches = detectDuplicates(lead, leads, index, options);
    if (matches.length > 0) {
      matchMap.set(lead.id, matches);
      
      // Unir tous les leads qui matchent
      for (const match of matches) {
        uf.union(lead.id, match.leadId);
        
        // Réciproque : ajouter ce lead aux matches de l'autre
        if (!matchMap.has(match.leadId)) {
          matchMap.set(match.leadId, []);
        }
        matchMap.get(match.leadId)!.push({
          leadId: lead.id,
          confidence: match.confidence,
          matchType: match.matchType,
          matchedFields: match.matchedFields,
        });
      }
    }
  }
  
  // Grouper par composantes connexes
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();
  
  if (enableTransitive) {
    // Utiliser Union-Find pour les groupes transitifs
    const componentGroups = uf.getGroups();
    
    for (const [rootId, groupLeadIds] of componentGroups) {
      if (groupLeadIds.length < 2) continue; // Ignorer les groupes d'un seul élément
      
      const groupLeads = groupLeadIds
        .map(id => leadMap.get(id))
        .filter((lead): lead is NonNullable<typeof lead> => lead !== undefined);
      
      if (groupLeads.length < 2) continue;
      
      // Calculer la confiance moyenne et les raisons de match
      const allMatches: DuplicateMatch[] = [];
      for (const lead of groupLeads) {
        allMatches.push(...(matchMap.get(lead.id) || []));
      }
      
      const maxConfidence = Math.max(...allMatches.map(m => m.confidence));
      const avgConfidence = allMatches.reduce((sum, m) => sum + m.confidence, 0) / allMatches.length;
      
      // Déterminer la raison principale
      const fieldCounts = new Map<string, number>();
      for (const match of allMatches) {
        for (const field of match.matchedFields) {
          fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
        }
      }
      const mainFields = Array.from(fieldCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([field]) => field);
      
      groups.push({
        leads: groupLeads.map(l => ({
          id: l.id,
          company: l.company,
          email: l.email,
          phone: l.phone,
          name: l.name,
        })),
        confidence: Math.round(Math.max(maxConfidence, avgConfidence)),
        matchReason: mainFields.join(' + ') || 'multiple',
      });
      
      groupLeadIds.forEach(id => processed.add(id));
    }
  } else {
    // Mode simple : un groupe par lead principal
    for (const lead of leads) {
      if (processed.has(lead.id)) continue;
      
      const matches = matchMap.get(lead.id) || [];
      if (matches.length > 0) {
        const matchedLeads = matches
          .map(m => leadMap.get(m.leadId))
          .filter((l): l is NonNullable<typeof l> => l !== undefined);
        
        if (matchedLeads.length > 0) {
          groups.push({
            leads: [lead, ...matchedLeads].map(l => ({
              id: l.id,
              company: l.company,
              email: l.email,
              phone: l.phone,
              name: l.name,
            })),
            confidence: Math.max(...matches.map(m => m.confidence)),
            matchReason: matches[0].matchedFields.join(' + '),
          });
          
          processed.add(lead.id);
          matchedLeads.forEach(l => processed.add(l.id));
        }
      }
    }
  }
  
  // Trier par confiance décroissante
  return groups.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Vérifie si un nouveau lead est un doublon (version optimisée)
 */
export function isDuplicate(
  newLead: { company: string; email?: string; phone?: string; name?: string },
  existingLeads: Array<{ id: string; company: string; email?: string; phone?: string; name?: string }>,
  threshold: number = 80
): { isDuplicate: boolean; matches: DuplicateMatch[] } {
  if (existingLeads.length === 0) {
    return { isDuplicate: false, matches: [] };
  }
  
  const index = buildIndex(existingLeads);
  const matches = detectDuplicates(
    { id: 'new', ...newLead },
    existingLeads,
    index,
    { minConfidence: threshold, enableFuzzyMatch: true }
  );
  
  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}

/**
 * Détecte les doublons de manière asynchrone avec progression
 */
export async function detectDuplicatesAsync(
  leads: Array<{ id: string; company: string; email?: string; phone?: string; name?: string }>,
  options: DetectionOptions & { onProgress?: (progress: number) => void } = {}
): Promise<DuplicateGroup[]> {
  return new Promise((resolve) => {
    // Utiliser requestIdleCallback ou setTimeout pour ne pas bloquer l'UI
    const process = () => {
      const groups = groupDuplicates(leads, options);
      resolve(groups);
    };
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(process, { timeout: 1000 });
    } else {
      setTimeout(process, 0);
    }
  });
}

/**
 * Nettoie le cache (utile pour libérer la mémoire)
 */
export function clearCache(): void {
  similarityCache.clear();
  normalizationCache.clear();
}

