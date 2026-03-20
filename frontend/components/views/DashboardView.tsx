import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { WidgetGrid } from '../dashboard/WidgetGrid';
import {
  DashboardLayout,
  DashboardWidgetConfig,
  DashboardWidgetType,
  getDefaultDashboardLayout,
  createDefaultDashboardLayout,
  saveDashboardLayout,
} from '../../lib/services/dashboardService';

export const DashboardView: React.FC = () => {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);

  // Charger le layout au montage
  useEffect(() => {
    if (user) {
      loadDashboardLayout();
    }
  }, [user]);

  const loadDashboardLayout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let layoutData = await getDefaultDashboardLayout(user.id);
      if (!layoutData) {
        // Créer un layout par défaut
        layoutData = await createDefaultDashboardLayout(user.id);
      }
      setLayout(layoutData);
      setWidgets(layoutData.widgetConfigs);
    } catch (error) {
      console.error('Error loading dashboard layout:', error);
      showToast('Erreur lors du chargement du dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<DashboardWidgetConfig>) => {
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  };

  const handleAddWidget = (type: DashboardWidgetType, x: number, y: number, w: number, h: number, highlighted: boolean = false) => {
    const newWidget: DashboardWidgetConfig = {
      id: `w-${Date.now()}`,
      type,
      x,
      y,
      w,
      h,
      highlighted,
    };
    setWidgets((prev) => [...prev, newWidget]);
  };

  const handleSaveLayout = async () => {
    if (!user || !layout) return;

    try {
      const updatedLayout = await saveDashboardLayout(
        user.id,
        layout.layoutName,
        widgets,
        layout.isDefault
      );
      setLayout(updatedLayout);
      setIsEditMode(false);
      showToast('Layout enregistré avec succès', 'success');
    } catch (error) {
      console.error('Error saving layout:', error);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleCancelEdit = () => {
    if (layout) {
      setWidgets(layout.widgetConfigs);
    }
    setIsEditMode(false);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} />
          <div className="text-slate-400 dark:text-slate-500">Chargement du dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 pb-10">
      {/* Header avec mode édition */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vue d'ensemble de votre activité
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" icon={X} onClick={handleCancelEdit}>
                Annuler
              </Button>
              <Button variant="outline" icon={Plus} onClick={() => setIsAddWidgetModalOpen(true)}>
                Ajouter widget
              </Button>
              <Button variant="primary" icon={Save} onClick={handleSaveLayout}>
                Enregistrer
              </Button>
            </>
          ) : (
            <Button variant="outline" icon={Edit2} onClick={() => setIsEditMode(true)}>
              Modifier
            </Button>
          )}
        </div>
         </div>

      {/* Grille de widgets */}
      <WidgetGrid
        widgets={widgets}
        onUpdateWidget={handleUpdateWidget}
        onDeleteWidget={handleDeleteWidget}
        onAddWidget={handleAddWidget}
        isEditMode={isEditMode}
        gridCols={8}
        isAddWidgetModalOpen={isAddWidgetModalOpen}
        onCloseAddWidgetModal={() => setIsAddWidgetModalOpen(false)}
        onOpenAddWidgetModal={() => setIsAddWidgetModalOpen(true)}
      />
    </div>
  );
};
