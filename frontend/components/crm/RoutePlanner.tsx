import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Lead } from '../../types';
import {
  calculateRouteDistance,
  calculateTravelTime,
  formatDistance,
  formatDuration,
  optimizeRouteNearestNeighbor,
  Point,
  calculateOSRMRoute,
} from '../../lib/utils/routing';

interface RoutePlannerProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
  onRouteCalculated?: (route: Point[], distance: number, duration: number) => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  selectedLeads,
  onClearSelection,
  onRouteCalculated,
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [route, setRoute] = useState<Point[] | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [useOSRM, setUseOSRM] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrer les leads qui ont des coordonnées
  const leadsWithLocation = selectedLeads.filter(
    (lead: any) => lead.latitude && lead.longitude
  );

  // Convertir les leads en points
  const points: Point[] = leadsWithLocation.map((lead: any) => ({
    lat: lead.latitude,
    lng: lead.longitude,
  }));

  // Calculer l'itinéraire
  const handleCalculateRoute = async () => {
    if (points.length < 2) {
      setError('Sélectionnez au moins 2 contacts avec des coordonnées pour calculer un itinéraire');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      if (useOSRM && points.length >= 2 && points.length <= 25) {
        // Utiliser OSRM pour un itinéraire précis (limité à 25 waypoints)
        const osrmRoute = await calculateOSRMRoute(points);
        if (osrmRoute) {
          setRoute(osrmRoute.points);
          setDistance(osrmRoute.distance / 1000); // Convertir mètres en km
          setDuration(Math.round(osrmRoute.duration / 60)); // Convertir secondes en minutes
          onRouteCalculated?.(osrmRoute.points, osrmRoute.distance / 1000, Math.round(osrmRoute.duration / 60));
        } else {
          // Fallback sur le calcul simple
          calculateSimpleRoute();
        }
      } else {
        // Calcul simple avec optimisation Nearest Neighbor
        calculateSimpleRoute();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul de l\'itinéraire');
      console.error('Route calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateSimpleRoute = () => {
    // Utiliser le premier point comme point de départ
    const startPoint = points[0];
    const remainingPoints = points.slice(1);

    // Optimiser l'ordre de visite
    const optimizedPoints = optimizeRouteNearestNeighbor(startPoint, remainingPoints);

    setRoute(optimizedPoints);
    const totalDistance = calculateRouteDistance(optimizedPoints);
    const totalDuration = calculateTravelTime(totalDistance);
    
    setDistance(totalDistance);
    setDuration(totalDuration);
    onRouteCalculated?.(optimizedPoints, totalDistance, totalDuration);
  };

  useEffect(() => {
    // Réinitialiser l'itinéraire si la sélection change
    setRoute(null);
    setDistance(0);
    setDuration(0);
    setError(null);
  }, [selectedLeads]);

  if (selectedLeads.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 max-w-md pointer-events-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-900 dark:text-white">
              Planificateur d'itinéraire
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={X}
            onClick={onClearSelection}
            className="text-slate-400 hover:text-slate-600"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin size={16} />
            <span>
              {leadsWithLocation.length} contact{leadsWithLocation.length > 1 ? 's' : ''} sélectionné{leadsWithLocation.length > 1 ? 's' : ''}
              {selectedLeads.length > leadsWithLocation.length && (
                <span className="text-orange-600">
                  {' '}({selectedLeads.length - leadsWithLocation.length} sans coordonnées)
                </span>
              )}
            </span>
          </div>

          {leadsWithLocation.length < 2 && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
              <AlertCircle size={16} />
              <span>Sélectionnez au moins 2 contacts avec des coordonnées</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {leadsWithLocation.length >= 2 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-osrm"
                  checked={useOSRM}
                  onChange={(e) => setUseOSRM(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="use-osrm" className="text-sm text-slate-700 dark:text-slate-300">
                  Utiliser le routing précis (OSRM) {points.length > 25 && '(max 25 points)'}
                </label>
              </div>

              <Button
                onClick={handleCalculateRoute}
                disabled={isCalculating || leadsWithLocation.length < 2}
                className="w-full"
                icon={Navigation}
                isLoading={isCalculating}
              >
                {isCalculating ? 'Calcul en cours...' : 'Calculer l\'itinéraire'}
              </Button>
            </div>
          )}

          {route && route.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                <span className="font-semibold text-sm">Itinéraire calculé</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs">Distance totale</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatDistance(distance)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs">Temps estimé</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatDuration(duration)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {route.length - 1} étape{route.length - 1 > 1 ? 's' : ''} (retour au départ inclus)
              </div>
            </div>
          )}

          {selectedLeads.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Contacts sélectionnés :
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {selectedLeads.slice(0, 10).map((lead) => (
                  <Badge
                    key={lead.id}
                    variant="outline"
                    className="text-xs"
                  >
                    {lead.company}
                  </Badge>
                ))}
                {selectedLeads.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedLeads.length - 10} autres
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

