/**
 * Service d'analyse géographique des leads
 * Calcule répartition géographique, zones à fort potentiel, couverture commerciale
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface GeographicDistribution {
  region: string;
  department?: string;
  city?: string;
  leadsCount: number;
  clientsCount: number;
  prospectsCount: number;
  totalValue: number; // CA total
  averageValue: number; // CA moyen par lead
  conversionRate: number; // Taux de conversion leads → clients
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface HotspotZone {
  location: {
    lat: number;
    lng: number;
    region: string;
    department?: string;
    city?: string;
  };
  intensity: number; // Score d'intensité (0-100)
  leadsCount: number;
  clientsCount: number;
  totalValue: number;
  conversionRate: number;
  averageScoring: number;
  sectors: string[]; // Secteurs principaux
  companySizes: string[]; // Tailles d'entreprise principales
}

export interface CoverageAnalysis {
  userId?: string;
  userName?: string;
  region: string;
  department?: string;
  assignedLeads: number;
  clientsCount: number;
  coverageRate: number; // % de leads assignés dans la zone
  averageResponseTime?: number; // Temps moyen de réponse (jours)
  conversionRate: number;
  totalValue: number;
}

export interface RegionalComparison {
  region: string;
  leadsCount: number;
  clientsCount: number;
  conversionRate: number;
  totalValue: number;
  averageValue: number;
  averageScoring: number;
  topSectors: Array<{ sector: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  growthRate?: number; // Taux de croissance (si comparaison temporelle)
}

/**
 * Calcule la répartition géographique des clients/prospects
 */
export async function calculateGeographicDistribution(
  filters?: {
    type?: 'all' | 'leads' | 'clients' | 'prospects';
    region?: string;
    department?: string;
    period?: { start: string; end: string };
  }
): Promise<GeographicDistribution[]> {
  try {
    let query = supabase
      .from('leads')
      .select('id, lifecycle_stage, stage, value, estimated_value, geographic_data, created_at');

    // Filtres
    if (filters?.type === 'clients') {
      query = query.in('lifecycle_stage', ['Client', 'Client Actif', 'Ambassadeur']);
    } else if (filters?.type === 'prospects') {
      query = query.in('lifecycle_stage', ['Lead', 'MQL', 'SQL', 'Contact', 'Opportunité']);
    } else if (filters?.type === 'leads') {
      query = query.in('lifecycle_stage', ['Lead', 'MQL', 'SQL']);
    }

    if (filters?.region) {
      query = query.contains('geographic_data', { region: filters.region });
    }

    if (filters?.department) {
      query = query.contains('geographic_data', { department: filters.department });
    }

    if (filters?.period) {
      query = query
        .gte('created_at', filters.period.start)
        .lte('created_at', filters.period.end);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    // Grouper par région/département/ville
    const distributionMap: Record<string, GeographicDistribution> = {};

    for (const lead of leads || []) {
      const geoData = lead.geographic_data || {};
      const region = geoData.region || 'Non spécifié';
      const department = geoData.department || undefined;
      const city = geoData.city || undefined;

      const key = `${region}|${department || ''}|${city || ''}`;

      if (!distributionMap[key]) {
        distributionMap[key] = {
          region,
          department,
          city,
          leadsCount: 0,
          clientsCount: 0,
          prospectsCount: 0,
          totalValue: 0,
          averageValue: 0,
          conversionRate: 0,
          coordinates: geoData.coordinates ? {
            lat: geoData.coordinates.lat,
            lng: geoData.coordinates.lng,
          } : undefined,
        };
      }

      const dist = distributionMap[key];

      // Compter selon le type
      if (['Client', 'Client Actif', 'Ambassadeur'].includes(lead.lifecycle_stage || '')) {
        dist.clientsCount++;
      } else {
        dist.prospectsCount++;
      }

      dist.leadsCount++;
      dist.totalValue += lead.value || lead.estimated_value || 0;
    }

    // Calculer les moyennes et taux
    const distributions = Object.values(distributionMap).map(dist => ({
      ...dist,
      averageValue: dist.leadsCount > 0 ? dist.totalValue / dist.leadsCount : 0,
      conversionRate: dist.leadsCount > 0 ? (dist.clientsCount / dist.leadsCount) * 100 : 0,
    }));

    return distributions.sort((a, b) => b.leadsCount - a.leadsCount);
  } catch (err) {
    logError('Erreur calcul répartition géographique:', err);
    throw err;
  }
}

/**
 * Identifie les zones à fort potentiel (hotspots)
 */
export async function identifyHotspotZones(
  options?: {
    minLeads?: number; // Nombre minimum de leads
    minIntensity?: number; // Intensité minimum (0-100)
    radiusKm?: number; // Rayon de clustering (km)
    region?: string;
  }
): Promise<HotspotZone[]> {
  try {
    const minLeads = options?.minLeads || 5;
    const minIntensity = options?.minIntensity || 50;
    const radiusKm = options?.radiusKm || 10;

    // Récupérer tous les leads avec coordonnées
    let query = supabase
      .from('leads')
      .select('id, lifecycle_stage, value, estimated_value, scoring, quality_score, sector, industry, company_size, geographic_data');

    if (options?.region) {
      query = query.contains('geographic_data', { region: options.region });
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    // Filtrer les leads avec coordonnées
    const leadsWithCoords = (leads || []).filter(lead => {
      const geoData = lead.geographic_data || {};
      return geoData.coordinates?.lat && geoData.coordinates?.lng;
    });

    if (leadsWithCoords.length === 0) {
      return [];
    }

    // Clustering simple basé sur la distance (méthode grid-based)
    const clusters: Array<{
      center: { lat: number; lng: number };
      leads: any[];
    }> = [];

    for (const lead of leadsWithCoords) {
      const geoData = lead.geographic_data || {};
      const coords = geoData.coordinates!;

      // Trouver un cluster proche (dans le rayon)
      let assigned = false;
      for (const cluster of clusters) {
        const distance = calculateDistance(
          coords.lat,
          coords.lng,
          cluster.center.lat,
          cluster.center.lng
        );

        if (distance <= radiusKm) {
          cluster.leads.push(lead);
          // Recalculer le centre (moyenne pondérée)
          const totalLeads = cluster.leads.length;
          cluster.center.lat = (cluster.center.lat * (totalLeads - 1) + coords.lat) / totalLeads;
          cluster.center.lng = (cluster.center.lng * (totalLeads - 1) + coords.lng) / totalLeads;
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        clusters.push({
          center: { lat: coords.lat, lng: coords.lng },
          leads: [lead],
        });
      }
    }

    // Convertir les clusters en hotspots
    const hotspots: HotspotZone[] = clusters
      .filter(cluster => cluster.leads.length >= minLeads)
      .map(cluster => {
        const leads = cluster.leads;
        const clientsCount = leads.filter(l => 
          ['Client', 'Client Actif', 'Ambassadeur'].includes(l.lifecycle_stage || '')
        ).length;
        const totalValue = leads.reduce((sum, l) => 
          sum + (l.value || l.estimated_value || 0), 0
        );
        const avgScoring = leads.reduce((sum, l) => 
          sum + (l.scoring || l.quality_score || 0), 0
        ) / leads.length;

        // Compter les secteurs
        const sectorCounts: Record<string, number> = {};
        const companySizeCounts: Record<string, number> = {};
        const locations: Record<string, any> = {};

        leads.forEach(lead => {
          const sector = lead.sector || lead.industry || 'Non spécifié';
          sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;

          const size = lead.company_size || 'Non spécifié';
          companySizeCounts[size] = (companySizeCounts[size] || 0) + 1;

          const geoData = lead.geographic_data || {};
          if (geoData.region) {
            locations[geoData.region] = {
              region: geoData.region,
              department: geoData.department,
              city: geoData.city,
            };
          }
        });

        // Calculer l'intensité (0-100)
        // Basé sur: nombre de leads, taux de conversion, valeur totale, scoring moyen
        const conversionRate = leads.length > 0 ? (clientsCount / leads.length) * 100 : 0;
        const intensity = Math.min(100, 
          (leads.length / 20) * 30 + // Nombre de leads (max 30 points)
          (conversionRate / 100) * 25 + // Taux de conversion (max 25 points)
          Math.min(totalValue / 100000, 1) * 25 + // Valeur totale (max 25 points)
          (avgScoring / 100) * 20 // Scoring moyen (max 20 points)
        );

        const topLocation = Object.values(locations)[0] || {};

        return {
          location: {
            lat: cluster.center.lat,
            lng: cluster.center.lng,
            region: topLocation.region || 'Non spécifié',
            department: topLocation.department,
            city: topLocation.city,
          },
          intensity: Math.round(intensity),
          leadsCount: leads.length,
          clientsCount,
          totalValue: Math.round(totalValue),
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageScoring: Math.round(avgScoring * 100) / 100,
          sectors: Object.entries(sectorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([sector]) => sector),
          companySizes: Object.entries(companySizeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([size]) => size),
        };
      })
      .filter(hotspot => hotspot.intensity >= minIntensity)
      .sort((a, b) => b.intensity - a.intensity);

    return hotspots;
  } catch (err) {
    logError('Erreur identification hotspots:', err);
    throw err;
  }
}

/**
 * Calcule la distance entre deux points GPS (formule Haversine)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Analyse la couverture commerciale par région/département
 */
export async function analyzeCoverage(
  filters?: {
    userId?: string;
    region?: string;
    department?: string;
  }
): Promise<CoverageAnalysis[]> {
  try {
    // Récupérer tous les leads avec assignation
    let query = supabase
      .from('leads')
      .select('id, assigned_to, lifecycle_stage, value, estimated_value, geographic_data, created_at');

    if (filters?.region) {
      query = query.contains('geographic_data', { region: filters.region });
    }

    if (filters?.department) {
      query = query.contains('geographic_data', { department: filters.department });
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    // Récupérer les utilisateurs pour les noms
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email');

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    // Grouper par région/département et utilisateur
    const coverageMap: Record<string, CoverageAnalysis> = {};

    for (const lead of leads || []) {
      const geoData = lead.geographic_data || {};
      const region = geoData.region || 'Non spécifié';
      const department = geoData.department || undefined;
      const userId = lead.assigned_to || 'unassigned';
      const userName = userId !== 'unassigned' ? usersMap.get(userId)?.name || usersMap.get(userId)?.email : 'Non assigné';

      const key = `${userId}|${region}|${department || ''}`;

      if (!coverageMap[key]) {
        coverageMap[key] = {
          userId: userId !== 'unassigned' ? userId : undefined,
          userName,
          region,
          department,
          assignedLeads: 0,
          clientsCount: 0,
          coverageRate: 0,
          conversionRate: 0,
          totalValue: 0,
        };
      }

      const coverage = coverageMap[key];
      coverage.assignedLeads++;
      
      if (['Client', 'Client Actif', 'Ambassadeur'].includes(lead.lifecycle_stage || '')) {
        coverage.clientsCount++;
      }
      
      coverage.totalValue += lead.value || lead.estimated_value || 0;
    }

    // Calculer le taux de couverture (leads assignés / total leads dans la zone)
    const totalByZone: Record<string, number> = {};
    (leads || []).forEach(lead => {
      const geoData = lead.geographic_data || {};
      const region = geoData.region || 'Non spécifié';
      const department = geoData.department || '';
      const zoneKey = `${region}|${department}`;
      totalByZone[zoneKey] = (totalByZone[zoneKey] || 0) + 1;
    });

    const coverages = Object.values(coverageMap).map(coverage => {
      const zoneKey = `${coverage.region}|${coverage.department || ''}`;
      const totalLeads = totalByZone[zoneKey] || 0;
      
      return {
        ...coverage,
        coverageRate: totalLeads > 0 ? (coverage.assignedLeads / totalLeads) * 100 : 0,
        conversionRate: coverage.assignedLeads > 0 ? (coverage.clientsCount / coverage.assignedLeads) * 100 : 0,
      };
    });

    // Filtrer par utilisateur si spécifié
    if (filters?.userId) {
      return coverages.filter(c => c.userId === filters.userId);
    }

    return coverages.sort((a, b) => b.assignedLeads - a.assignedLeads);
  } catch (err) {
    logError('Erreur analyse couverture commerciale:', err);
    throw err;
  }
}

/**
 * Compare les régions/départements
 */
export async function compareRegions(
  filters?: {
    compareBy?: 'region' | 'department' | 'city';
    period?: { start: string; end: string };
    previousPeriod?: { start: string; end: string }; // Pour calculer croissance
  }
): Promise<RegionalComparison[]> {
  try {
    const compareBy = filters?.compareBy || 'region';

    let query = supabase
      .from('leads')
      .select('id, lifecycle_stage, value, estimated_value, scoring, quality_score, sector, industry, geographic_data, created_at');

    if (filters?.period) {
      query = query
        .gte('created_at', filters.period.start)
        .lte('created_at', filters.period.end);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    // Grouper par région/département/ville
    const comparisonMap: Record<string, RegionalComparison> = {};

    for (const lead of leads || []) {
      const geoData = lead.geographic_data || {};
      let key: string;
      let region: string;

      if (compareBy === 'city') {
        key = geoData.city || 'Non spécifié';
        region = geoData.region || 'Non spécifié';
      } else if (compareBy === 'department') {
        key = geoData.department || 'Non spécifié';
        region = geoData.region || 'Non spécifié';
      } else {
        key = geoData.region || 'Non spécifié';
        region = key;
      }

      if (!comparisonMap[key]) {
        comparisonMap[key] = {
          region,
          leadsCount: 0,
          clientsCount: 0,
          conversionRate: 0,
          totalValue: 0,
          averageValue: 0,
          averageScoring: 0,
          topSectors: [],
          topCities: [],
        };
      }

      const comp = comparisonMap[key];
      comp.leadsCount++;
      
      if (['Client', 'Client Actif', 'Ambassadeur'].includes(lead.lifecycle_stage || '')) {
        comp.clientsCount++;
      }
      
      comp.totalValue += lead.value || lead.estimated_value || 0;
      comp.averageScoring += lead.scoring || lead.quality_score || 0;
    }

    // Calculer les statistiques et top secteurs/villes
    const comparisons = Object.entries(comparisonMap).map(([key, comp]) => {
      comp.averageValue = comp.leadsCount > 0 ? comp.totalValue / comp.leadsCount : 0;
      comp.conversionRate = comp.leadsCount > 0 ? (comp.clientsCount / comp.leadsCount) * 100 : 0;
      comp.averageScoring = comp.leadsCount > 0 ? comp.averageScoring / comp.leadsCount : 0;

      // Compter les secteurs et villes
      const sectorCounts: Record<string, number> = {};
      const cityCounts: Record<string, number> = {};

      (leads || []).forEach(lead => {
        const geoData = lead.geographic_data || {};
        if (compareBy === 'region' && geoData.region === key) {
          const sector = lead.sector || lead.industry || 'Non spécifié';
          sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
          
          const city = geoData.city || 'Non spécifié';
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        } else if (compareBy === 'department' && geoData.department === key) {
          const sector = lead.sector || lead.industry || 'Non spécifié';
          sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
          
          const city = geoData.city || 'Non spécifié';
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        } else if (compareBy === 'city' && geoData.city === key) {
          const sector = lead.sector || lead.industry || 'Non spécifié';
          sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        }
      });

      comp.topSectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sector, count]) => ({ sector, count }));

      comp.topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }));

      return comp;
    });

    // Calculer la croissance si période précédente fournie
    if (filters?.previousPeriod) {
      const { data: previousLeads } = await supabase
        .from('leads')
        .select('id, geographic_data')
        .gte('created_at', filters.previousPeriod.start)
        .lte('created_at', filters.previousPeriod.end);

      const previousCounts: Record<string, number> = {};
      (previousLeads || []).forEach(lead => {
        const geoData = lead.geographic_data || {};
        let key: string;
        if (compareBy === 'city') {
          key = geoData.city || 'Non spécifié';
        } else if (compareBy === 'department') {
          key = geoData.department || 'Non spécifié';
        } else {
          key = geoData.region || 'Non spécifié';
        }
        previousCounts[key] = (previousCounts[key] || 0) + 1;
      });

      comparisons.forEach(comp => {
        const previousCount = previousCounts[comp.region] || 0;
        if (previousCount > 0) {
          comp.growthRate = ((comp.leadsCount - previousCount) / previousCount) * 100;
        }
      });
    }

    return comparisons.sort((a, b) => b.leadsCount - a.leadsCount);
  } catch (err) {
    logError('Erreur comparaison régions:', err);
    throw err;
  }
}

/**
 * Exporte les données géographiques au format CSV
 */
export async function exportGeographicDataCSV(
  distributions: GeographicDistribution[]
): Promise<string> {
  const rows: string[] = [];

  // En-têtes
  rows.push('Région, Département, Ville, Nombre Leads, Nombre Clients, Nombre Prospects, CA Total (€), CA Moyen (€), Taux Conversion (%)');

  // Données
  distributions.forEach(dist => {
    rows.push(
      `${dist.region || ''}, ${dist.department || ''}, ${dist.city || ''}, ` +
      `${dist.leadsCount}, ${dist.clientsCount}, ${dist.prospectsCount}, ` +
      `${dist.totalValue.toFixed(2)}, ${dist.averageValue.toFixed(2)}, ${dist.conversionRate.toFixed(2)}`
    );
  });

  return rows.join('\n');
}

