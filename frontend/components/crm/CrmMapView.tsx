import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Lead, LifecycleStage } from '../../types';
import { MapPin, Building, User, Mail, Phone, DollarSign, Layers, Navigation } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { Button } from '../ui/Button';
import { useLeads } from '../../lib/supabase/hooks/useLeads';
import { supabase } from '../../lib/supabase';
import { useProspectingZones, ProspectingZone } from '../../lib/supabase/hooks/useProspectingZones';
import { HeatmapLayer } from './HeatmapLayer';
import { RoutePlanner } from './RoutePlanner';
import { Point } from '../../lib/utils/routing';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Cache pour les géocodages
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

// Délai minimum entre les requêtes pour respecter les limites de rate limiting de Nominatim (1 req/s)
let lastGeocodeTime = 0;
const MIN_TIME_BETWEEN_REQUESTS = 1100; // 1.1 seconde entre chaque requête

// Composant pour afficher la ligne de route sur la carte
const RoutePolyline: React.FC<{ points: Point[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;

    const latLngs = points.map(p => L.latLng(p.lat, p.lng));
    
    const polyline = L.polyline(latLngs, {
      color: '#10b981',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10',
    }).addTo(map);

    // Ajuster la vue pour inclure la route
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (map.hasLayer(polyline)) {
        map.removeLayer(polyline);
      }
    };
  }, [points, map]);

  return null;
};

// Composant pour afficher un message d'information sur la carte
const MapInfoOverlay: React.FC<{ message: string; subtitle: string }> = ({ message, subtitle }) => {
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-700 max-w-xs pointer-events-auto">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={20} className="text-slate-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{message}</p>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
};

// Fix pour les icônes Leaflet par défaut
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface CrmMapViewProps {
  onLeadClick?: (lead: Lead) => void;
}

interface LeadWithLocation extends Lead {
  latitude?: number;
  longitude?: number;
  address?: string;
}

// Algorithme de clustering hiérarchique logique
// Crée une hiérarchie de clusters qui se subdivisent progressivement selon le zoom
const clusterMarkers = (
  markers: Array<{ lat: number; lng: number; lead: Lead }>, 
  zoom: number
) => {
  if (markers.length === 0) return [];
  
  // Définir les niveaux de clustering hiérarchique
  // Chaque niveau correspond à une distance de clustering différente
  // Les niveaux sont ordonnés du zoom le plus élevé au plus faible
  const clusteringLevels = [
    { zoom: 15, distance: 0.0005, name: 'very-high' },    // ~50m - Points individuels
    { zoom: 13, distance: 0.002, name: 'high' },          // ~200m - Très petits clusters
    { zoom: 11, distance: 0.005, name: 'medium-high' },    // ~500m - Petits clusters
    { zoom: 9, distance: 0.01, name: 'medium' },           // ~1km - Clusters moyens
    { zoom: 7, distance: 0.02, name: 'medium-low' },       // ~2km - Clusters grands
    { zoom: 5, distance: 0.05, name: 'low' },              // ~5km - Très grands clusters
    { zoom: 3, distance: 0.1, name: 'very-low' },         // ~10km - Clusters régionaux (ex: toute la Gironde)
  ];
  
  // Trouver le niveau de clustering approprié selon le zoom actuel
  // On cherche le niveau le plus fin (petite distance) pour le zoom actuel
  let selectedLevel = clusteringLevels[clusteringLevels.length - 1]; // Par défaut, le niveau le plus bas (régional)
  for (const level of clusteringLevels) {
    if (zoom >= level.zoom) {
      selectedLevel = level;
      break; // Prendre le premier niveau qui correspond (le plus fin)
    }
  }
  
  const maxDistance = selectedLevel.distance;

  // Fonction pour calculer la distance entre deux points (optimisée)
  const distance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const dLat = p1.lat - p2.lat;
    const dLng = p1.lng - p2.lng;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };
  
  // Fonction récursive pour créer des clusters hiérarchiques
  const createClustersRecursive = (
    points: Array<{ lat: number; lng: number; lead: Lead; index: number }>,
    distanceThreshold: number,
    minPoints: number = 1
  ): Array<{ lat: number; lng: number; leads: Lead[] }> => {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return [{
        lat: points[0].lat,
        lng: points[0].lng,
        leads: [points[0].lead],
      }];
    }
    
  const clusters: Array<{ lat: number; lng: number; leads: Lead[] }> = [];
    const processed = new Set<number>();
    
    // Créer une grille spatiale pour optimiser les recherches
    const gridSize = distanceThreshold * 1.5;
    const grid = new Map<string, Array<{ lat: number; lng: number; lead: Lead; index: number }>>();
    
    points.forEach((point) => {
      const gridX = Math.floor(point.lat / gridSize);
      const gridY = Math.floor(point.lng / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(point);
    });
    
    // Fonction pour trouver les voisins
    const findNeighbors = (point: { lat: number; lng: number; lead: Lead; index: number }) => {
      const gridX = Math.floor(point.lat / gridSize);
      const gridY = Math.floor(point.lng / gridSize);
      const neighbors: Array<{ lat: number; lng: number; lead: Lead; index: number }> = [];
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${gridX + dx},${gridY + dy}`;
          const cellPoints = grid.get(key);
          if (cellPoints) {
            for (const other of cellPoints) {
              if (other.index === point.index || processed.has(other.index)) continue;
              const dist = distance(point, other);
              if (dist < distanceThreshold) {
                neighbors.push(other);
              }
            }
          }
        }
      }
      
      return neighbors;
    };
    
    // Créer les clusters avec BFS
    points.forEach((point) => {
      if (processed.has(point.index)) return;

      const cluster: { lat: number; lng: number; leads: Lead[] } = {
        lat: point.lat,
        lng: point.lng,
        leads: [point.lead],
      };
      
      const clusterCoords: Array<{ lat: number; lng: number }> = [{ lat: point.lat, lng: point.lng }];
      const toProcess = [point];
      processed.add(point.index);
      
      // Expansion du cluster avec BFS
      while (toProcess.length > 0) {
        const current = toProcess.shift()!;
        const neighbors = findNeighbors(current);
        
        for (const neighbor of neighbors) {
          if (!processed.has(neighbor.index)) {
            cluster.leads.push(neighbor.lead);
            clusterCoords.push({ lat: neighbor.lat, lng: neighbor.lng });
            processed.add(neighbor.index);
            toProcess.push(neighbor);
          }
        }
      }
      
      // Calculer le centroïde
      if (cluster.leads.length > 1) {
        let sumLat = 0;
        let sumLng = 0;
        for (const coord of clusterCoords) {
          sumLat += coord.lat;
          sumLng += coord.lng;
        }
        cluster.lat = sumLat / clusterCoords.length;
        cluster.lng = sumLng / clusterCoords.length;
      }
      
    clusters.push(cluster);
  });
    
    return clusters;
  };
  
  // Préparer les points avec index
  const pointsWithIndex = markers.map((marker, index) => ({ ...marker, index }));
  
  // Créer les clusters au niveau approprié
  const clusters = createClustersRecursive(pointsWithIndex, maxDistance);

  return clusters;
};

// Géocodage simple basé sur l'adresse (ou nom de ville/entreprise) avec cache, timeout et retry
const geocodeAddress = async (address: string, retries: number = 1): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.trim().length === 0) {
    return null;
  }

  const normalizedAddress = address.trim();

  // Vérifier le cache
  const cached = geocodeCache.get(normalizedAddress);
  if (cached !== undefined) return cached;

  // Si l'adresse est en cache comme échec, ne pas réessayer immédiatement
  // (permet de réessayer plus tard en vidant le cache si nécessaire)
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Utiliser AbortController pour gérer le timeout
      const controller = new AbortController();
      // Timeout réduit à 8 secondes pour détecter plus rapidement les problèmes de connexion
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        // Utiliser Nominatim (OpenStreetMap) pour le géocodage gratuit
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedAddress)}&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'AgencyOS CRM (contact@agencyos.fr)',
              'Accept': 'application/json',
              'Accept-Language': 'fr-FR,fr',
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        // Gérer les erreurs HTTP spécifiques
        if (response.status === 429) {
          // Too Many Requests - attendre plus longtemps avant de réessayer
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
            continue;
          }
          geocodeCache.set(normalizedAddress, null);
          return null;
        }

        if (response.status === 503 || response.status === 502) {
          // Service temporairement indisponible
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
            continue;
          }
          // Ne pas mettre en cache pour permettre une nouvelle tentative plus tard
          return null;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const firstResult = data[0];
          const lat = parseFloat(firstResult.lat);
          const lon = parseFloat(firstResult.lon);
          
          // Vérifier que les coordonnées sont valides
          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const result = { lat, lng: lon };
            geocodeCache.set(normalizedAddress, result);
            return result;
          }
        }
        
        // Aucun résultat trouvé ou résultat invalide
        geocodeCache.set(normalizedAddress, null);
        return null;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Détecter différents types d'erreurs réseau
        const isNetworkError = fetchError.name === 'AbortError' || 
                               fetchError.name === 'TypeError' ||
                               fetchError.message?.includes('Failed to fetch') ||
                               fetchError.message?.includes('network') ||
                               fetchError.message?.includes('timeout') ||
                               fetchError.message?.includes('ERR_CONNECTION_TIMED_OUT') ||
                               fetchError.message?.includes('ERR_NETWORK');
        
        if (isNetworkError) {
          // Erreur réseau ou timeout - réessayer si tentatives restantes
          if (attempt < retries) {
            // Délai progressif : 3s pour la première retry, 5s pour la deuxième
            await new Promise(resolve => setTimeout(resolve, 3000 + (attempt * 2000)));
            continue;
          }
          // Échec final - mettre en cache comme null pour éviter les requêtes répétées
          geocodeCache.set(normalizedAddress, null);
          return null;
        }
        
        // Autres erreurs - réessayer une fois
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
        
        // Dernière tentative échouée - ne pas mettre en cache pour permettre une nouvelle tentative plus tard
        return null;
      }
    } catch (error: any) {
      // Erreur inattendue
      const isNetworkError = error?.message?.includes('network') || 
                             error?.message?.includes('timeout') ||
                             error?.message?.includes('ERR_CONNECTION_TIMED_OUT');
      
      if (attempt < retries && isNetworkError) {
        await new Promise(resolve => setTimeout(resolve, 3000 + (attempt * 2000)));
        continue;
      }
      
      if (attempt === retries) {
        geocodeCache.set(normalizedAddress, null);
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  return null;
};

// Géocodage par batch avec callback pour mise à jour progressive
const geocodeBatchProgressive = async (
  addresses: string[], 
  addressMap: Map<string, Lead[]>,
  onBatchComplete: (newLeads: LeadWithLocation[]) => void,
  onProgress?: (processed: number, total: number) => void
): Promise<void> => {
  let processedCount = 0;
  const totalAddresses = addresses.length;
  
  // Traiter toutes les adresses séquentiellement pour respecter strictement les limites de Nominatim
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    
    // Vérifier le cache avant de faire la requête
    const cached = geocodeCache.get(address);
    if (cached !== undefined) {
      // Utiliser le résultat en cache
      if (cached) {
        const leadsForAddress = addressMap.get(address) || [];
        const batchLeads: LeadWithLocation[] = leadsForAddress.map(lead => ({
          ...lead,
          latitude: cached.lat,
          longitude: cached.lng,
          address: address,
        }));
        if (batchLeads.length > 0) {
          onBatchComplete(batchLeads);
        }
      }
      processedCount++;
      if (onProgress) {
        onProgress(processedCount, totalAddresses);
      }
      continue;
    }
    
    // Attendre le délai minimum avant de faire la requête (sauf si c'est la première)
    if (i > 0) {
      const timeSinceLastRequest = Date.now() - lastGeocodeTime;
      if (timeSinceLastRequest < MIN_TIME_BETWEEN_REQUESTS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_TIME_BETWEEN_REQUESTS - timeSinceLastRequest));
      }
    }
    
    // Géocoder l'adresse - continuer même en cas d'erreur
    try {
      const result = await geocodeAddress(address, 1); // 1 retry max
      lastGeocodeTime = Date.now(); // Mettre à jour le temps de la dernière requête
      
      if (result) {
        const leadsForAddress = addressMap.get(address) || [];
        const batchLeads: LeadWithLocation[] = leadsForAddress.map(lead => ({
          ...lead,
          latitude: result.lat,
          longitude: result.lng,
          address: address,
        }));
        if (batchLeads.length > 0) {
          onBatchComplete(batchLeads);
        }
      }
      // Si pas de résultat, continuer silencieusement sans géocoder cette adresse
    } catch (error) {
      // Erreur silencieuse - l'adresse ne sera pas géocodée mais on continue avec les autres
      lastGeocodeTime = Date.now(); // Mettre à jour même en cas d'erreur pour éviter les requêtes trop rapides
      console.warn(`Erreur lors du géocodage de l'adresse "${address}":`, error);
    }
    
    processedCount++;
    if (onProgress) {
      onProgress(processedCount, totalAddresses);
    }
  }
};

// Composant pour forcer l'invalidation de la taille de la carte et stocker la référence
const MapResizeHandler: React.FC<{ onMapReady?: (map: L.Map) => void }> = ({ onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
    
    // Forcer l'invalidation de la taille immédiatement et plusieurs fois pour garantir l'affichage
    const forceResize = () => {
      map.invalidateSize(true);
      // Forcer le rechargement des tuiles
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          (layer as L.TileLayer).redraw();
        }
      });
    };
    
    // Invalider immédiatement
    forceResize();
    
    // Puis plusieurs fois avec des délais pour s'assurer que ça fonctionne
    const timeout1 = setTimeout(forceResize, 100);
    const timeout2 = setTimeout(forceResize, 300);
    const timeout3 = setTimeout(forceResize, 500);
    const timeout4 = setTimeout(forceResize, 1000);

    // Observer les changements de taille de fenêtre
    const handleResize = () => {
      // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
      requestAnimationFrame(() => {
        forceResize();
      });
    };

    // Observer les changements de thème (dark/light mode)
    const observeThemeChanges = () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            // Délai pour laisser le CSS se mettre à jour
            setTimeout(forceResize, 100);
          }
        });
      });

      // Observer les changements sur l'élément html ou body
      if (document.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
      }

      return observer;
    };

    window.addEventListener('resize', handleResize);
    const themeObserver = observeThemeChanges();

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
      window.removeEventListener('resize', handleResize);
      themeObserver.disconnect();
    };
  }, [map, onMapReady]);

  return null;
};

// Composant pour forcer l'initialisation de la carte
const MapInitializer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Forcer l'initialisation de la carte dès le montage
    const initMap = () => {
      map.invalidateSize(true);
      // S'assurer que les tuiles sont chargées
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          const tileLayer = layer as L.TileLayer;
          tileLayer.redraw();
        }
      });
      
      // Forcer l'activation du zoom à la molette
      if (map.scrollWheelZoom) {
        map.scrollWheelZoom.enable();
      }
    };

    // Initialiser immédiatement
    initMap();
    
    // Et plusieurs fois pour garantir l'affichage
    const timeouts = [
      setTimeout(initMap, 50),
      setTimeout(initMap, 200),
      setTimeout(initMap, 500),
    ];

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [map]);

  return null;
};

// Composant pour suivre le niveau de zoom de la carte
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const map = useMap();
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);

  // Mettre à jour la référence à chaque render
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    // Initialiser avec le zoom actuel
    const initialZoom = map.getZoom();
    onZoomChangeRef.current(initialZoom);

    // Écouter les changements de zoom avec debounce pour éviter trop de recalculs
    const handleZoom = () => {
      // Annuler le timeout précédent
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      
      // Mettre à jour le zoom après un court délai (debounce)
      zoomTimeoutRef.current = setTimeout(() => {
        onZoomChangeRef.current(map.getZoom());
      }, 150);
    };

    // Utiliser zoomend pour une mise à jour immédiate à la fin du zoom
    const handleZoomEnd = () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      onZoomChangeRef.current(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    // Ne pas écouter 'zoom' pour éviter trop de recalculs, seulement 'zoomend'
    // map.on('zoom', handleZoom);

    return () => {
      map.off('zoomend', handleZoomEnd);
      // map.off('zoom', handleZoom);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [map]); // Retirer onZoomChange des dépendances

  return null;
};

// Composant pour ajuster la vue de la carte (avec ajustement progressif)
const MapBounds: React.FC< { bounds: L.LatLngBounds | null; isProgressive?: boolean; boundsKey?: number }> = ({ bounds, isProgressive = false, boundsKey }) => {
  const map = useMap();
  const lastBoundsKey = useRef<number | undefined>(undefined);
  const hasInitialBounds = useRef(false);
  const userHasInteracted = useRef(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Détecter les interactions utilisateur (zoom, pan, drag)
    const handleUserInteraction = () => {
      userHasInteracted.current = true;
      // Réinitialiser après 5 secondes d'inactivité pour permettre les ajustements automatiques
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = setTimeout(() => {
        userHasInteracted.current = false;
      }, 5000);
    };

    map.on('zoomstart', handleUserInteraction);
    map.on('movestart', handleUserInteraction);
    map.on('dragstart', handleUserInteraction);

    return () => {
      map.off('zoomstart', handleUserInteraction);
      map.off('movestart', handleUserInteraction);
      map.off('dragstart', handleUserInteraction);
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    // Réinitialiser si les bounds changent complètement (nouveau jeu de données)
    if (boundsKey !== undefined && boundsKey !== lastBoundsKey.current) {
      hasInitialBounds.current = false;
      lastBoundsKey.current = boundsKey;
      userHasInteracted.current = false; // Réinitialiser l'état d'interaction pour un nouveau jeu de données
    }
    
    // Ne pas ajuster si l'utilisateur a interagi récemment avec la carte
    if (userHasInteracted.current) {
      return;
    }
    
    if (bounds) {
      if (!hasInitialBounds.current) {
        // Premier ajustement : fit bounds complet (seulement au chargement initial)
        map.fitBounds(bounds, { padding: [50, 50] });
        hasInitialBounds.current = true;
      } else if (isProgressive) {
        // Ajustements progressifs : seulement si les nouveaux points sont hors des bounds actuelles
        // Et seulement si l'utilisateur n'a pas interagi
        try {
          const currentBounds = map.getBounds();
          if (currentBounds && !currentBounds.contains(bounds)) {
            // Étendre les bounds pour inclure les nouveaux points
            const extendedBounds = bounds.extend(currentBounds);
            map.fitBounds(extendedBounds, { padding: [50, 50] });
          }
        } catch (e) {
          // Si erreur, ne pas forcer l'ajustement si l'utilisateur a interagi
          if (!userHasInteracted.current) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      }
    }
  }, [bounds, map, isProgressive, boundsKey]);

  return null;
};

export const CrmMapView: React.FC<CrmMapViewProps> = ({ onLeadClick, selectedZoneId, onZoneSelect }) => {
  const { zones, isPointInZone } = useProspectingZones();
  const { leads, loading: leadsLoading, updateLead } = useLeads();
  
  // Fonction helper pour sauvegarder les coordonnées
  const saveLeadCoordinates = async (leadId: string, latitude: number, longitude: number, address: string) => {
    try {
      if (supabase) {
        await supabase
          .from('leads')
          .update({ 
            latitude, 
            longitude, 
            geocoded_address: address,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);
      }
    } catch (error) {
      console.warn(`Erreur lors de la sauvegarde des coordonnées pour le lead ${leadId}:`, error);
    }
  };
  const [leadsWithLocation, setLeadsWithLocation] = useState<LeadWithLocation[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(6); // Zoom initial par défaut (niveau France)
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [selectedLeadsForRoute, setSelectedLeadsForRoute] = useState<Lead[]>([]);
  const [routePoints, setRoutePoints] = useState<Point[] | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Forcer l'affichage de la carte après le montage et lors des changements de thème
  useEffect(() => {
    if (mapRef.current) {
      const forceDisplay = () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize(true);
          // Forcer le rechargement des tuiles
          mapRef.current.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
              (layer as L.TileLayer).redraw();
            }
          });
        }
      };
      
      // Forcer plusieurs fois pour garantir l'affichage
      forceDisplay();
      const timeouts = [
        setTimeout(forceDisplay, 100),
        setTimeout(forceDisplay, 300),
        setTimeout(forceDisplay, 500),
        setTimeout(forceDisplay, 1000),
      ];

      // Observer les changements de thème pour forcer le redimensionnement
      const themeObserver = new MutationObserver(() => {
        requestAnimationFrame(() => {
          forceDisplay();
        });
      });

      if (document.documentElement) {
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
      }

      return () => {
        timeouts.forEach(clearTimeout);
        themeObserver.disconnect();
      };
    }
  }, []);

  // Extraire l'adresse depuis les notes (JSON) ou utiliser le nom de l'entreprise
  const extractAddress = (lead: Lead): string | null => {
    const enrichedLead = lead as any;
    
    // Chercher dans les champs enrichis
    if (enrichedLead.address) return enrichedLead.address;
    if (enrichedLead.location) return enrichedLead.location;
    
    // Si le lead a des notes, essayer de parser le JSON
    if (enrichedLead.notes) {
      try {
        const notesData = typeof enrichedLead.notes === 'string' 
          ? JSON.parse(enrichedLead.notes) 
          : enrichedLead.notes;
        
        if (notesData.address) return notesData.address;
        if (notesData.location) return notesData.location;
      } catch (e) {
        // Si ce n'est pas du JSON, ignorer
      }
    }
    
    // En dernier recours, utiliser le nom de l'entreprise
    if (lead.company) {
      return `${lead.company}, France`;
    }
    
    return null;
  };

  // Charger les leads avec leurs coordonnées (stockées ou à géocoder)
  useEffect(() => {
    const processLeads = async () => {
      if (leadsLoading) {
        setLeadsWithLocation([]);
        setIsGeocoding(false);
        return;
      }

      if (leads.length === 0) {
        setLeadsWithLocation([]);
        setIsGeocoding(false);
        return;
      }

      // 1. D'abord, charger les leads qui ont déjà des coordonnées stockées
      const leadsWithStoredCoords: LeadWithLocation[] = [];
      const leadsToGeocode: Lead[] = [];

      leads.forEach(lead => {
        if (lead.latitude && lead.longitude) {
          // Lead avec coordonnées stockées
          const address = lead.geocodedAddress || extractAddress(lead) || '';
          
          // Mettre à jour le cache avec les coordonnées stockées
          if (address && !geocodeCache.has(address)) {
            geocodeCache.set(address, {
              lat: lead.latitude,
              lng: lead.longitude,
            });
          }

          leadsWithStoredCoords.push({
            ...lead,
            latitude: lead.latitude,
            longitude: lead.longitude,
            address: address,
          });
        } else {
          // Lead à géocoder
          leadsToGeocode.push(lead);
        }
      });

      setLeadsWithLocation(leadsWithStoredCoords);

      if (leadsToGeocode.length === 0) {
        setIsGeocoding(false);
        return;
      }

      setIsGeocoding(true);
      
      // Extraire les adresses uniques pour les leads à géocoder
      const addressMap = new Map<string, Lead[]>();
      leadsToGeocode.forEach(lead => {
        const address = extractAddress(lead);
        if (address) {
          // Ne pas géocoder si l'adresse est déjà dans le cache (déjà géocodée)
          if (!geocodeCache.has(address)) {
            if (!addressMap.has(address)) {
              addressMap.set(address, []);
            }
            addressMap.get(address)!.push(lead);
          }
        }
      });

      const uniqueAddresses = Array.from(addressMap.keys());
      
      if (uniqueAddresses.length === 0) {
        setIsGeocoding(false);
        return;
      }

      // 3. Géocoder avec mise à jour progressive et sauvegarde
      await geocodeBatchProgressive(
        uniqueAddresses, 
        addressMap,
        async (newLeads) => {
          // Ajouter les nouveaux leads aux leads existants
          setLeadsWithLocation(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const filteredNewLeads = newLeads.filter(l => !existingIds.has(l.id));
            return [...prev, ...filteredNewLeads];
          });

          // Sauvegarder les coordonnées dans la base de données
          for (const newLead of newLeads) {
            try {
              await saveLeadCoordinates(
                newLead.id, 
                newLead.latitude!, 
                newLead.longitude!, 
                newLead.address || ''
              );
            } catch (error) {
              // Erreur silencieuse lors de la sauvegarde - les coordonnées seront regéocodées si nécessaire
              console.warn(`Erreur lors de la sauvegarde des coordonnées pour le lead ${newLead.id}:`, error);
            }
          }
        }
      );

      setIsGeocoding(false);
    };

    processLeads();
  }, [leads, leadsLoading, updateLead]);

  // Calculer les bounds une seule fois (basées sur tous les points, pas les clusters)
  const bounds = useMemo(() => {
    const validMarkers = leadsWithLocation
      .filter((lead) => lead.latitude && lead.longitude)
      .map((lead) => ({
        lat: lead.latitude!,
        lng: lead.longitude!,
        lead,
      }));

    if (validMarkers.length === 0) {
      return null;
    }

    // Créer les bounds pour ajuster la vue (basées sur tous les points)
    const latLngs = validMarkers.map((m) => L.latLng(m.lat, m.lng));
    return L.latLngBounds(latLngs);
  }, [leadsWithLocation]); // Ne pas dépendre de currentZoom

  // Créer les markers avec clustering adaptatif selon le zoom
  const markers = useMemo(() => {
    const validMarkers = leadsWithLocation
      .filter((lead) => lead.latitude && lead.longitude)
      .map((lead) => ({
        lat: lead.latitude!,
        lng: lead.longitude!,
        lead,
      }));

    if (validMarkers.length === 0) {
      return [];
    }

    // Clustering adaptatif basé sur le niveau de zoom
    return clusterMarkers(validMarkers, currentZoom);
  }, [leadsWithLocation, currentZoom]);

  const getStageColor = (stage?: LifecycleStage | string) => {
    if (!stage) return '#6366f1';
    if (['Client', 'Client Actif', 'Ambassadeur', 'Gagné'].includes(stage)) return '#10b981';
    if (['Perdu', 'Inactif'].includes(stage)) return '#ef4444';
    if (['Opportunité', 'SQL', 'Négociation', 'Proposition'].includes(stage)) return '#f59e0b';
    return '#6366f1';
  };

  const createCustomIcon = (color: string, isCluster: boolean, count?: number) => {
    if (isCluster) {
      // Icône pour les clusters (cercle avec nombre)
      // Ajuster la taille selon le nombre de points dans le cluster
      const size = count && count > 10 ? 48 : count && count > 5 ? 44 : 40;
      const fontSize = count && count > 10 ? '16px' : count && count > 5 ? '15px' : '14px';
      
    return L.divIcon({
        className: 'custom-marker-cluster',
      html: `
        <div style="
          background-color: ${color};
            width: ${size}px;
            height: ${size}px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
            font-size: ${fontSize};
            line-height: 1;
        ">
            ${count || ''}
        </div>
      `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2], // Centre du cercle
      });
    } else {
      // Icône MapPin pour les points individuels (style Lucide MapPin)
      const pinSvg = `
        <svg width="28" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="10" r="3" fill="white" opacity="0.3"/>
        </svg>
      `;
      
      return L.divIcon({
        className: 'custom-marker-pin',
        html: pinSvg,
        iconSize: [28, 36],
        iconAnchor: [14, 36], // Pointe du pin au bas
      });
    }
  };

  // Préparer les données pour la heatmap
  const heatmapPoints = useMemo(() => {
    return leadsWithLocation
      .filter((lead) => lead.latitude && lead.longitude)
      .map((lead) => [
        lead.latitude!,
        lead.longitude!,
        1, // Intensité par défaut (pourrait être basée sur scoring, valeur, etc.)
      ] as [number, number, number]);
  }, [leadsWithLocation]);

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 relative h-full w-full" 
      style={{ 
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Toggle Heatmap Button */}
      <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
        <Button
          variant={showHeatmap ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowHeatmap(!showHeatmap)}
          icon={Layers}
          className="gap-2"
        >
          {showHeatmap ? 'Masquer' : 'Afficher'} Heatmap
        </Button>
        <Button
          variant={selectedLeadsForRoute.length > 0 ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            if (selectedLeadsForRoute.length > 0) {
              setSelectedLeadsForRoute([]);
              setRoutePoints(null);
            }
          }}
          icon={Navigation}
          className="gap-2"
        >
          {selectedLeadsForRoute.length > 0 ? `${selectedLeadsForRoute.length} sélectionné${selectedLeadsForRoute.length > 1 ? 's' : ''}` : 'Itinéraire'}
        </Button>
      </div>

      <MapContainer
        center={[46.6034, 1.8883]} // Centre de la France par défaut
        zoom={6} // Zoom par défaut pour voir toute la France
        minZoom={3} // Permet de zoomer moins (voir l'Europe)
        maxZoom={18} // Permet de zoomer plus (niveau rue)
        className="h-full w-full"
        style={{ 
          height: '100%', 
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          touchAction: 'none',
          minHeight: 0
        }}
        scrollWheelZoom={true}
        zoomControl={true}
        wheelPxPerZoomLevel={60}
        whenReady={(map) => {
          // S'assurer que la carte est visible dès le chargement
          requestAnimationFrame(() => {
            map.target.invalidateSize(true);
            // Activer explicitement le zoom à la molette
            map.target.scrollWheelZoom.enable();
          });
        }}
      >
        <MapResizeHandler onMapReady={(map) => { mapRef.current = map; }} />
        <MapInitializer />
        <ZoomTracker onZoomChange={setCurrentZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={3}
          tileSize={256}
          zoomOffset={0}
          noWrap={false}
          updateWhenZooming={true}
          updateWhenIdle={true}
          keepBuffer={2}
          maxNativeZoom={18}
          subdomains={['a', 'b', 'c']}
          errorTileUrl=""
          crossOrigin="anonymous"
          className="leaflet-tile-layer-no-grid"
          key="osm-tiles"
        />
        {bounds && <MapBounds bounds={bounds} isProgressive={isGeocoding && leadsWithLocation.length > 0} boundsKey={leadsWithLocation.length} />}

        {/* Heatmap Layer */}
        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatmapLayer
            points={heatmapPoints}
            enabled={showHeatmap}
            options={{
              radius: 25,
              blur: 15,
              maxZoom: 17,
              minOpacity: 0.05,
              gradient: {
                0.0: 'blue',
                0.2: 'cyan',
                0.4: 'lime',
                0.6: 'yellow',
                1.0: 'red'
              },
            }}
          />
        )}

        {/* Afficher les zones de prospection */}
        {zones.filter(z => z.isActive).map((zone) => {
          if (zone.zoneType === 'circle' && zone.centerLat && zone.centerLng && zone.radiusKm) {
            // Convertir le rayon de km en mètres pour Leaflet
            const radiusMeters = zone.radiusKm * 1000;
            return (
              <Circle
                key={zone.id}
                center={[zone.centerLat, zone.centerLng]}
                radius={radiusMeters}
                pathOptions={{
                  color: zone.color,
                  fillColor: zone.color,
                  fillOpacity: selectedZoneId === zone.id ? 0.3 : 0.15,
                  weight: selectedZoneId === zone.id ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => {
                    onZoneSelect?.(selectedZoneId === zone.id ? null : zone);
                  },
                }}
              />
            );
          }
          return null;
        })}

        {markers.length === 0 && (
          <MapInfoOverlay 
            message="Aucun contact géolocalisé"
            subtitle="Ajoutez des adresses aux contacts pour les voir sur la carte"
          />
        )}

        {/* Filtrer les markers par zone si une zone est sélectionnée */}
        {markers
          .filter((cluster) => {
            if (!selectedZoneId) return true;
            const selectedZone = zones.find(z => z.id === selectedZoneId);
            if (!selectedZone) return true;
            
            // Vérifier si au moins un lead du cluster est dans la zone
            return cluster.leads.some(lead => {
              if (!lead.latitude || !lead.longitude) return false;
              return isPointInZone(lead.latitude, lead.longitude, selectedZone);
            });
          })
          .map((cluster, index) => {
          const isCluster = cluster.leads.length > 1;
          const firstLead = cluster.leads[0];
          const color = getStageColor(firstLead.lifecycleStage || firstLead.stage);
          const isSelected = selectedLeadsForRoute.some(sl => 
            cluster.leads.some(cl => cl.id === sl.id)
          );
          // Utiliser un ID unique basé sur les coordonnées et les leads pour une clé stable
          const markerKey = isCluster 
            ? `cluster-${cluster.lat.toFixed(4)}-${cluster.lng.toFixed(4)}-${cluster.leads.length}`
            : `marker-${firstLead.id}`;

          return (
            <Marker
              key={markerKey}
              position={[cluster.lat, cluster.lng]}
              icon={createCustomIcon(
                isSelected ? '#10b981' : color, 
                isCluster, 
                isCluster ? cluster.leads.length : undefined
              )}
              eventHandlers={{
                click: () => {
                  // Toggle sélection pour le routing
                  const newSelection = [...selectedLeadsForRoute];
                  cluster.leads.forEach(lead => {
                    const index = newSelection.findIndex(sl => sl.id === lead.id);
                    if (index >= 0) {
                      newSelection.splice(index, 1);
                    } else {
                      newSelection.push(lead);
                    }
                  });
                  setSelectedLeadsForRoute(newSelection);
                },
              }}
            >
              <Popup>
                {isCluster ? (
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-2">{cluster.leads.length} contacts</h3>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {cluster.leads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-2 border-b border-slate-200 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded"
                          onClick={() => onLeadClick?.(lead)}
                        >
                          <div className="font-semibold text-xs">{lead.company}</div>
                          <div className="text-xs text-slate-500">{lead.name}</div>
                          <Badge variant={getStageVariant(lead.lifecycleStage || lead.stage)} className="text-[10px] mt-1">
                            {lead.lifecycleStage || lead.stage}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 min-w-[200px]">
                    <div className="flex items-start gap-2 mb-2">
                      <Building size={16} className="text-indigo-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{firstLead.company}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <User size={12} />
                          {firstLead.name}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {firstLead.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} />
                          {firstLead.email}
                        </div>
                      )}
                      {firstLead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone size={12} />
                          {firstLead.phone}
                        </div>
                      )}
                      {firstLead.value > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={12} />
                          {firstLead.value.toLocaleString('fr-FR')} €
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <Badge variant={getStageVariant(firstLead.lifecycleStage || firstLead.stage)} className="text-[10px]">
                        {firstLead.lifecycleStage || firstLead.stage}
                      </Badge>
                      {onLeadClick && (
                        <button
                          onClick={() => onLeadClick(firstLead)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Voir détails →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}

        {/* Afficher la route calculée */}
        {routePoints && routePoints.length > 1 && (
          <RoutePolyline points={routePoints} />
        )}
      </MapContainer>

      {/* Route Planner */}
      <RoutePlanner
        selectedLeads={selectedLeadsForRoute}
        onClearSelection={() => {
          setSelectedLeadsForRoute([]);
          setRoutePoints(null);
        }}
        onRouteCalculated={(points, distance, duration) => {
          setRoutePoints(points);
          // La route sera affichée par le composant RoutePolyline
        }}
      />
      
      {/* Loader overlay par-dessus la carte */}
      {leadsLoading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center rounded-2xl pointer-events-none">
          <div className="text-center pointer-events-auto">
            <Loader size={48} className="mb-4 mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">
              Chargement des contacts...
            </p>
          </div>
        </div>
      )}
      
      {/* Indicateur de progression discret quand des points sont déjà affichés */}
      {isGeocoding && leadsWithLocation.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-slate-200 dark:border-slate-700 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Loader size={20} className="text-indigo-600" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Géocodage en cours... ({leadsWithLocation.length} point{leadsWithLocation.length > 1 ? 's' : ''} affiché{leadsWithLocation.length > 1 ? 's' : ''})
            </p>
          </div>
        </div>
      )}
      
      {/* Overlay complet uniquement si aucun point n'est encore affiché */}
      {isGeocoding && leadsWithLocation.length === 0 && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center rounded-2xl pointer-events-none">
          <div className="text-center pointer-events-auto">
            <Loader size={48} className="mb-4 mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">
              Géocodage des contacts en cours...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper pour déterminer la variante du badge
const getStageVariant = (stage?: string): 'default' | 'success' | 'danger' | 'warning' | 'info' => {
  if (!stage) return 'default';
  if (['Gagné', 'Client', 'Client Actif', 'Ambassadeur'].includes(stage)) return 'success';
  if (['Perdu', 'Inactif', 'Churn', 'Rejeté'].includes(stage)) return 'danger';
  if (['Négociation', 'Proposition', 'Opportunité', 'SQL', 'Offre'].includes(stage)) return 'warning';
  if (['MQL', 'Lead', 'Contact', 'Screening'].includes(stage)) return 'info';
  return 'default';
};

