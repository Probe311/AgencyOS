/**
 * Utilitaires pour le calcul de distances et d'itinéraires
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface Route {
  points: Point[];
  distance: number; // Distance en mètres
  duration: number; // Durée en secondes
  instructions?: string[];
}

/**
 * Calcule la distance entre deux points en utilisant la formule Haversine
 * @param point1 - Premier point
 * @param point2 - Deuxième point
 * @returns Distance en kilomètres
 */
export const calculateDistance = (point1: Point, point2: Point): number => {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Convertit des degrés en radians
 */
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calcule la distance totale d'un parcours passant par plusieurs points
 * @param points - Liste de points à visiter dans l'ordre
 * @returns Distance totale en kilomètres
 */
export const calculateRouteDistance = (points: Point[]): number => {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(points[i], points[i + 1]);
  }

  return totalDistance;
};

/**
 * Calcule le temps de trajet estimé en fonction de la distance
 * @param distanceKm - Distance en kilomètres
 * @param averageSpeedKmh - Vitesse moyenne en km/h (défaut: 50 km/h en ville)
 * @returns Temps en minutes
 */
export const calculateTravelTime = (
  distanceKm: number,
  averageSpeedKmh: number = 50
): number => {
  return Math.round((distanceKm / averageSpeedKmh) * 60);
};

/**
 * Trouve le point le plus proche d'un point de référence
 * @param referencePoint - Point de référence
 * @param points - Liste de points à comparer
 * @returns Index du point le plus proche et distance
 */
export const findNearestPoint = (
  referencePoint: Point,
  points: Point[]
): { index: number; distance: number } | null => {
  if (points.length === 0) return null;

  let nearestIndex = 0;
  let nearestDistance = calculateDistance(referencePoint, points[0]);

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(referencePoint, points[i]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return { index: nearestIndex, distance: nearestDistance };
};

/**
 * Algorithme simplifié du voyageur de commerce (Nearest Neighbor)
 * Trouve un ordre de visite approximativement optimal en commençant par le point le plus proche
 * @param startPoint - Point de départ
 * @param points - Points à visiter
 * @returns Ordre optimal des points
 */
export const optimizeRouteNearestNeighbor = (
  startPoint: Point,
  points: Point[]
): Point[] => {
  if (points.length === 0) return [];

  const visited = new Set<number>();
  const route: Point[] = [startPoint];
  let currentPoint = startPoint;
  let remainingPoints = points.map((p, i) => ({ point: p, index: i }));

  while (remainingPoints.length > 0) {
    const nearest = findNearestPoint(currentPoint, remainingPoints.map(p => p.point));
    if (!nearest) break;

    const nearestItem = remainingPoints[nearest.index];
    route.push(nearestItem.point);
    currentPoint = nearestItem.point;
    remainingPoints = remainingPoints.filter((_, i) => i !== nearest.index);
  }

  // Retour au point de départ
  route.push(startPoint);

  return route;
};

/**
 * Formate une distance en texte lisible
 * @param distanceKm - Distance en kilomètres
 * @returns Chaîne formatée (ex: "5.2 km" ou "450 m")
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Formate une durée en texte lisible
 * @param minutes - Durée en minutes
 * @returns Chaîne formatée (ex: "1h 30min" ou "45min")
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
};

/**
 * Calcule un itinéraire en utilisant l'API OSRM (si disponible)
 * Note: OSRM nécessite un serveur de routing. Cette fonction peut être étendue pour utiliser une API externe.
 * @param points - Points à visiter
 * @returns Route avec distance et durée, ou null si l'API n'est pas disponible
 */
export const calculateOSRMRoute = async (
  points: Point[]
): Promise<Route | null> => {
  if (points.length < 2) return null;

  try {
    // Utiliser l'API publique OSRM (peut être limitée en production)
    // En production, il faudrait utiliser son propre serveur OSRM ou une autre API
    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
    const profile = 'driving'; // 'driving', 'walking', 'cycling'
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn('OSRM API not available, using distance calculation');
      return null;
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const routePoints: Point[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({ lng: coord[0], lat: coord[1] })
    );

    return {
      points: routePoints,
      distance: route.distance, // Distance en mètres
      duration: route.duration, // Durée en secondes
    };
  } catch (error) {
    console.warn('Error calculating OSRM route:', error);
    return null;
  }
};

/**
 * Calcule les distances et temps de trajet entre plusieurs points
 * @param points - Liste de points
 * @returns Matrice de distances (en km) et temps (en minutes)
 */
export const calculateDistanceMatrix = (
  points: Point[],
  averageSpeedKmh: number = 50
): { distances: number[][]; times: number[][] } => {
  const n = points.length;
  const distances: number[][] = [];
  const times: number[][] = [];

  for (let i = 0; i < n; i++) {
    distances[i] = [];
    times[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
        times[i][j] = 0;
      } else {
        const dist = calculateDistance(points[i], points[j]);
        distances[i][j] = dist;
        times[i][j] = calculateTravelTime(dist, averageSpeedKmh);
      }
    }
  }

  return { distances, times };
};

