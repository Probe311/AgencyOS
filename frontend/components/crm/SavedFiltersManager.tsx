import React, { useState } from 'react';
import { Filter, Save, Trash2, Share2, Edit2, X, Check } from 'lucide-react';
import { useSavedFilters, SavedFilter } from '../../lib/supabase/hooks/useSavedFilters';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import { LeadFamily, LeadTemperature } from '../../types';

interface SavedFiltersManagerProps {
  resourceType: 'leads' | 'tasks' | 'projects' | 'campaigns';
  currentFilters: {
    searchQuery?: string;
    filterStage?: string;
    filterIndustry?: string;
    filterSource?: string;
    filterFamily?: LeadFamily | 'Tous';
    filterTemperature?: LeadTemperature | 'Tous';
    filterCertified?: 'Tous' | 'Certifiés' | 'Non certifiés';
    filterZone?: string;
    [key: string]: any;
  };
  onLoadFilter: (criteria: SavedFilter['criteria']) => void;
}

export const SavedFiltersManager: React.FC<SavedFiltersManagerProps> = ({
  resourceType,
  currentFilters,
  onLoadFilter,
}) => {
  const { showToast } = useApp();
  const { filters, loading, saveFilter, updateFilter, deleteFilter, getFiltersByResourceType } = useSavedFilters();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<SavedFilter | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const resourceFilters = getFiltersByResourceType(resourceType);

  const handleSave = async () => {
    if (!filterName.trim()) {
      showToast('Le nom du filtre est requis', 'error');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await updateFilter(isEditing.id, {
          name: filterName,
          description: filterDescription || undefined,
          criteria: currentFilters,
          isShared,
        });
        showToast('Filtre mis à jour', 'success');
      } else {
        await saveFilter(filterName, resourceType, currentFilters, filterDescription || undefined, isShared);
        showToast('Filtre sauvegardé', 'success');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (filter: SavedFilter) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le filtre "${filter.name}" ?`)) {
      return;
    }

    try {
      await deleteFilter(filter.id);
      showToast('Filtre supprimé', 'success');
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleLoad = (filter: SavedFilter) => {
    onLoadFilter(filter.criteria);
    showToast(`Filtre "${filter.name}" chargé`, 'success');
    setIsModalOpen(false);
  };

  const handleEdit = (filter: SavedFilter) => {
    setIsEditing(filter);
    setFilterName(filter.name);
    setFilterDescription(filter.description || '');
    setIsShared(filter.isShared);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setIsEditing(null);
    setFilterName('');
    setFilterDescription('');
    setIsShared(false);
  };

  const getFilterSummary = (criteria: SavedFilter['criteria']): string => {
    const parts: string[] = [];
    if (criteria.searchQuery) parts.push(`Recherche: "${criteria.searchQuery}"`);
    if (criteria.filterStage && criteria.filterStage !== 'Tous') parts.push(`Étape: ${criteria.filterStage}`);
    if (criteria.filterIndustry && criteria.filterIndustry !== 'Tous') parts.push(`Secteur: ${criteria.filterIndustry}`);
    if (criteria.filterFamily && criteria.filterFamily !== 'Tous') parts.push(`Famille: ${criteria.filterFamily}`);
    if (criteria.filterTemperature && criteria.filterTemperature !== 'Tous') parts.push(`Température: ${criteria.filterTemperature}`);
    if (criteria.filterCertified && criteria.filterCertified !== 'Tous') parts.push(`Certification: ${criteria.filterCertified}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Aucun critère';
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          resetForm();
          setIsModalOpen(true);
        }}
        icon={Filter}
      >
        Filtres sauvegardés
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={isEditing ? 'Modifier le filtre' : 'Sauvegarder le filtre'}
        size="md"
      >
        <div className="space-y-4">
          {!isEditing && resourceFilters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Filtres sauvegardés ({resourceFilters.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {resourceFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">
                            {filter.name}
                          </span>
                          {filter.isShared && (
                            <Badge variant="info" className="text-xs">
                              <Share2 size={10} className="mr-1" />
                              Partagé
                            </Badge>
                          )}
                        </div>
                        {filter.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {filter.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {getFilterSummary(filter.criteria)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoad(filter)}
                          icon={Filter}
                          className="h-7 w-7 p-0"
                          title="Charger"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(filter)}
                          icon={Edit2}
                          className="h-7 w-7 p-0"
                          title="Modifier"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(filter)}
                          icon={Trash2}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          title="Supprimer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              {isEditing ? 'Modifier les détails' : 'Nouveau filtre'}
            </h3>

            <div className="space-y-4">
              <Input
                label="Nom du filtre *"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Ex: Leads chauds Tech"
                required
              />

              <Textarea
                label="Description (optionnel)"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                placeholder="Description du filtre..."
                rows={2}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isShared"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="isShared" className="text-sm text-slate-700 dark:text-slate-300">
                  Partager avec l'équipe
                </label>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Critères actuels :
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {getFilterSummary(currentFilters)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !filterName.trim()}
                  icon={Save}
                  isLoading={saving}
                >
                  {saving ? 'Sauvegarde...' : isEditing ? 'Mettre à jour' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

