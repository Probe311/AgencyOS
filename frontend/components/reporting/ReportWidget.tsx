import React, { useState } from 'react';
import { GripVertical, X, Settings, Gauge, TrendingUp, BarChart3, Table, Type } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { ReportWidget as ReportWidgetType } from '../../lib/services/reportBuilderService';
import { WIDGET_TYPES } from './WidgetLibrary';

interface ReportWidgetProps {
  widget: ReportWidgetType;
  onUpdate: (widget: ReportWidgetType) => void;
  onDelete: (widgetId: string) => void;
  onDragStart: (e: React.DragEvent, widgetId: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const ReportWidget: React.FC<ReportWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  onDragStart,
  isSelected,
  onSelect,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const widgetType = WIDGET_TYPES.find(wt => wt.id === widget.type);

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      ...widget,
      config: {
        ...widget.config,
        [key]: value,
      },
    });
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'kpi':
        return (
          <div className="h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg">
            <Gauge size={32} className="text-indigo-600 dark:text-indigo-400 mb-2" />
            <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
              {widget.config.value || '0'}
            </div>
            <div className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
              {widget.config.label || 'KPI'}
            </div>
          </div>
        );
      case 'line-chart':
        return (
          <div className="h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-center">
              <TrendingUp size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Graphique ligne</p>
              <p className="text-xs text-slate-400 mt-1">{widget.config.title || 'Sans titre'}</p>
            </div>
          </div>
        );
      case 'bar-chart':
        return (
          <div className="h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-center">
              <BarChart3 size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Graphique barres</p>
              <p className="text-xs text-slate-400 mt-1">{widget.config.title || 'Sans titre'}</p>
            </div>
          </div>
        );
      case 'table':
        return (
          <div className="h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-center">
              <Table size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Tableau</p>
              <p className="text-xs text-slate-400 mt-1">{widget.config.title || 'Sans titre'}</p>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="h-full p-4 bg-white dark:bg-slate-700 rounded-lg">
            <p className="text-slate-900 dark:text-white">
              {widget.config.content || 'Texte...'}
            </p>
          </div>
        );
      default:
        return <div className="h-full flex items-center justify-center text-slate-400">Widget inconnu</div>;
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, widget.id)}
        onClick={onSelect}
        className={`relative border-2 rounded-lg transition-all ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
        }`}
        style={{
          width: widget.size.width,
          height: widget.size.height,
          position: 'absolute',
          left: widget.position.x,
          top: widget.position.y,
        }}
      >
        {/* Contrôles */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-slate-400 cursor-move" />
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            icon={Settings}
            onClick={(e) => {
              e.stopPropagation();
              setIsConfigOpen(true);
            }}
            className="h-6 w-6 p-0"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(widget.id);
            }}
            className="h-6 w-6 p-0 text-rose-600"
          />
        </div>

        {/* Contenu du widget */}
        <div className="h-full w-full">{renderWidgetContent()}</div>
      </div>

      {/* Modal Configuration */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title={`Configuration - ${widgetType?.name || 'Widget'}`}
        size="md"
      >
        <div className="space-y-4">
          {widget.type === 'kpi' && (
            <>
              <Input
                label="Label"
                value={widget.config.label || ''}
                onChange={(e) => handleConfigChange('label', e.target.value)}
                placeholder="Ex: Revenus totaux"
              />
              <Input
                label="Valeur"
                value={widget.config.value || ''}
                onChange={(e) => handleConfigChange('value', e.target.value)}
                placeholder="0"
              />
              <Input
                label="Unité"
                value={widget.config.unit || ''}
                onChange={(e) => handleConfigChange('unit', e.target.value)}
                placeholder="€, %, etc."
              />
            </>
          )}

          {(widget.type === 'line-chart' || widget.type === 'bar-chart') && (
            <>
              <Input
                label="Titre"
                value={widget.config.title || ''}
                onChange={(e) => handleConfigChange('title', e.target.value)}
                placeholder="Titre du graphique"
              />
              <Dropdown
                label="Source de données"
                value={widget.config.dataSource || 'revenue'}
                onChange={(value) => handleConfigChange('dataSource', value)}
                options={[
                  { value: 'revenue', label: 'Revenus' },
                  { value: 'leads', label: 'Leads' },
                  { value: 'tasks', label: 'Tâches' },
                  { value: 'conversions', label: 'Conversions' },
                ]}
              />
            </>
          )}

          {widget.type === 'table' && (
            <>
              <Input
                label="Titre"
                value={widget.config.title || ''}
                onChange={(e) => handleConfigChange('title', e.target.value)}
                placeholder="Titre du tableau"
              />
              <Dropdown
                label="Source de données"
                value={widget.config.dataSource || 'leads'}
                onChange={(value) => handleConfigChange('dataSource', value)}
                options={[
                  { value: 'leads', label: 'Leads' },
                  { value: 'tasks', label: 'Tâches' },
                  { value: 'projects', label: 'Projets' },
                ]}
              />
            </>
          )}

          {widget.type === 'text' && (
            <Textarea
              label="Contenu"
              value={widget.config.content || ''}
              onChange={(e) => handleConfigChange('content', e.target.value)}
              rows={6}
              placeholder="Votre texte ici..."
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
