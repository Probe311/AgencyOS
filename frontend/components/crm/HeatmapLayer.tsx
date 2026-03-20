import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: Array<[number, number, number]>; // [lat, lng, intensity]
  enabled: boolean;
  options?: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    minOpacity?: number;
    gradient?: { [key: number]: string };
  };
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points, enabled, options }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || points.length === 0) {
      return;
    }

    // Configuration par défaut pour la heatmap
    const defaultOptions = {
      radius: options?.radius || 25,
      blur: options?.blur || 15,
      maxZoom: options?.maxZoom || 17,
      minOpacity: options?.minOpacity || 0.05,
      gradient: options?.gradient || {
        0.0: 'blue',
        0.2: 'cyan',
        0.4: 'lime',
        0.6: 'yellow',
        1.0: 'red'
      },
    };

    // Créer la couche de heatmap
    const heatmapLayer = (L as any).heatLayer(points, defaultOptions);
    heatmapLayer.addTo(map);

    // Cleanup
    return () => {
      if (map.hasLayer(heatmapLayer)) {
        map.removeLayer(heatmapLayer);
      }
    };
  }, [map, points, enabled, options]);

  return null;
};

