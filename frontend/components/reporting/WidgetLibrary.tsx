import React from 'react';
import { BarChart3, TrendingUp, Table, Type, Gauge } from 'lucide-react';
import { Button } from '../ui/Button';

export interface WidgetType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultSize: { width: number; height: number };
  category: 'kpi' | 'chart' | 'data' | 'text';
}

export const WIDGET_TYPES: WidgetType[] = [
  {
    id: 'kpi',
    name: 'KPI',
    description: 'Indicateur clé de performance',
    icon: <Gauge size={20} />,
    defaultSize: { width: 200, height: 150 },
    category: 'kpi',
  },
  {
    id: 'line-chart',
    name: 'Graphique ligne',
    description: 'Graphique en ligne',
    icon: <TrendingUp size={20} />,
    defaultSize: { width: 400, height: 300 },
    category: 'chart',
  },
  {
    id: 'bar-chart',
    name: 'Graphique barres',
    description: 'Graphique en barres',
    icon: <BarChart3 size={20} />,
    defaultSize: { width: 400, height: 300 },
    category: 'chart',
  },
  {
    id: 'table',
    name: 'Tableau',
    description: 'Tableau de données',
    icon: <Table size={20} />,
    defaultSize: { width: 500, height: 300 },
    category: 'data',
  },
  {
    id: 'text',
    name: 'Texte',
    description: 'Bloc de texte',
    icon: <Type size={20} />,
    defaultSize: { width: 300, height: 200 },
    category: 'text',
  },
];

interface WidgetLibraryProps {
  onAddWidget: (widgetType: WidgetType) => void;
}

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ onAddWidget }) => {
  const categories = ['kpi', 'chart', 'data', 'text'] as const;
  const categoryLabels: Record<string, string> = {
    kpi: 'KPIs',
    chart: 'Graphiques',
    data: 'Données',
    text: 'Texte',
  };

  return (
    <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 overflow-y-auto">
      <h3 className="font-bold text-slate-900 dark:text-white mb-4">Bibliothèque de widgets</h3>
      
      {categories.map((category) => {
        const widgets = WIDGET_TYPES.filter(w => w.category === category);
        if (widgets.length === 0) return null;

        return (
          <div key={category} className="mb-6">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              {categoryLabels[category]}
            </h4>
            <div className="space-y-2">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('widgetType', widget.id);
                  }}
                  onClick={() => onAddWidget(widget)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-indigo-600 dark:text-indigo-400">
                      {widget.icon}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {widget.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {widget.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

