import React, { useState, useEffect } from 'react';
import {
  Lightbulb, Sparkles, CheckCircle2, X, RefreshCw, TrendingUp,
  AlertTriangle, Target, Zap, ArrowRight, Filter
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';
import {
  IntelligentSuggestion,
  SuggestionCategory,
  SuggestionPriority,
  generateIntelligentSuggestions,
  getIntelligentSuggestions,
  applySuggestion,
  dismissSuggestion
} from '../../lib/services/intelligentSuggestionsService';

export const IntelligentSuggestions: React.FC = () => {
  const { showToast, user } = useApp();
  const [suggestions, setSuggestions] = useState<IntelligentSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<IntelligentSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<IntelligentSuggestion | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    category?: SuggestionCategory;
    priority?: SuggestionPriority;
    showApplied?: boolean;
    showDismissed?: boolean;
  }>({
    showApplied: false,
    showDismissed: false
  });

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user, filters]);

  useEffect(() => {
    applyFilters();
  }, [suggestions, filters]);

  const loadSuggestions = async () => {
    try {
      const data = await getIntelligentSuggestions(user?.id || '', {
        category: filters.category,
        priority: filters.priority,
        is_applied: filters.showApplied ? true : undefined,
        is_dismissed: filters.showDismissed ? true : undefined
      });
      setSuggestions(data);
    } catch (error: any) {
      showToast('Erreur lors du chargement des suggestions', 'error');
    }
  };

  const applyFilters = () => {
    let filtered = [...suggestions];

    if (!filters.showApplied) {
      filtered = filtered.filter(s => !s.is_applied);
    }
    if (!filters.showDismissed) {
      filtered = filtered.filter(s => !s.is_dismissed);
    }

    setFilteredSuggestions(filtered);
  };

  const handleGenerateSuggestions = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      await generateIntelligentSuggestions(user.id, filters.category ? [filters.category] : undefined);
      showToast('Suggestions générées avec succès', 'success');
      await loadSuggestions();
    } catch (error: any) {
      showToast('Erreur lors de la génération', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      await applySuggestion(suggestionId);
      showToast('Suggestion appliquée', 'success');
      await loadSuggestions();
      setIsDetailModalOpen(false);
    } catch (error: any) {
      showToast('Erreur lors de l\'application', 'error');
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    try {
      await dismissSuggestion(suggestionId);
      showToast('Suggestion ignorée', 'success');
      await loadSuggestions();
      setIsDetailModalOpen(false);
    } catch (error: any) {
      showToast('Erreur lors de l\'ignorance', 'error');
    }
  };

  const getCategoryIcon = (category: SuggestionCategory) => {
    const icons = {
      lead_management: Target,
      task_optimization: Zap,
      workflow_improvement: Sparkles,
      content_optimization: Lightbulb,
      timing_optimization: TrendingUp,
      resource_allocation: Target,
      communication: Zap,
      sales_strategy: TrendingUp
    };
    return icons[category] || Lightbulb;
  };

  const getCategoryLabel = (category: SuggestionCategory) => {
    const labels = {
      lead_management: 'Gestion des leads',
      task_optimization: 'Optimisation des tâches',
      workflow_improvement: 'Amélioration des workflows',
      content_optimization: 'Optimisation du contenu',
      timing_optimization: 'Optimisation du timing',
      resource_allocation: 'Allocation des ressources',
      communication: 'Communication',
      sales_strategy: 'Stratégie commerciale'
    };
    return labels[category] || category;
  };

  const getPriorityColor = (priority: SuggestionPriority) => {
    const colors = {
      urgent: 'red',
      high: 'orange',
      medium: 'blue',
      low: 'slate'
    };
    return colors[priority] || 'slate';
  };

  const activeSuggestions = filteredSuggestions.filter(s => !s.is_applied && !s.is_dismissed);
  const urgentSuggestions = activeSuggestions.filter(s => s.priority === 'urgent');
  const highPrioritySuggestions = activeSuggestions.filter(s => s.priority === 'high');

  return (
    <PageLayout
      header={{
        icon: Sparkles,
        title: "Suggestions intelligentes",
        description: "Recommandations IA pour optimiser vos performances",
        rightActions: [
          {
            label: isGenerating ? 'Génération...' : 'Générer des suggestions',
            icon: RefreshCw,
            onClick: handleGenerateSuggestions,
            variant: 'primary',
            disabled: isGenerating
          }
        ]
      }}
    >
      <div className="space-y-6">
        {/* Filtres */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 items-center">
          <Filter size={20} className="text-slate-500" />
          <Dropdown
            label="Catégorie"
            value={filters.category || ''}
            onChange={(value) => setFilters({ ...filters, category: value as SuggestionCategory || undefined })}
            options={[
              { value: '', label: 'Toutes les catégories' },
              { value: 'lead_management', label: 'Gestion des leads' },
              { value: 'task_optimization', label: 'Optimisation des tâches' },
              { value: 'workflow_improvement', label: 'Amélioration des workflows' },
              { value: 'content_optimization', label: 'Optimisation du contenu' },
              { value: 'timing_optimization', label: 'Optimisation du timing' },
              { value: 'resource_allocation', label: 'Allocation des ressources' },
              { value: 'communication', label: 'Communication' },
              { value: 'sales_strategy', label: 'Stratégie commerciale' }
            ]}
          />
          <Dropdown
            label="Priorité"
            value={filters.priority || ''}
            onChange={(value) => setFilters({ ...filters, priority: value as SuggestionPriority || undefined })}
            options={[
              { value: '', label: 'Toutes les priorités' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'Haute' },
              { value: 'medium', label: 'Moyenne' },
              { value: 'low', label: 'Basse' }
            ]}
          />
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Suggestions actives</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{activeSuggestions.length}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
            <div className="text-sm text-red-600 dark:text-red-400 mb-1">Urgentes</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentSuggestions.length}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
            <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">Haute priorité</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{highPrioritySuggestions.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Impact moyen</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeSuggestions.length > 0
                ? Math.round(activeSuggestions.reduce((sum, s) => sum + s.impact_score, 0) / activeSuggestions.length)
                : 0}
            </div>
          </div>
        </div>

        {/* Liste des suggestions */}
        {activeSuggestions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Sparkles size={48} className="mx-auto mb-4 text-slate-400" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">Aucune suggestion disponible</p>
            <Button variant="primary" onClick={handleGenerateSuggestions} disabled={isGenerating}>
              {isGenerating ? 'Génération...' : 'Générer des suggestions'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSuggestions.map((suggestion) => {
              const CategoryIcon = getCategoryIcon(suggestion.category);

              return (
                <div
                  key={suggestion.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedSuggestion(suggestion);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg bg-${getPriorityColor(suggestion.priority)}-100 dark:bg-${getPriorityColor(suggestion.priority)}-900/20`}>
                        <CategoryIcon className={`text-${getPriorityColor(suggestion.priority)}-600 dark:text-${getPriorityColor(suggestion.priority)}-400`} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {suggestion.title}
                          </h3>
                          <Badge variant={getPriorityColor(suggestion.priority) as any}>
                            {suggestion.priority}
                          </Badge>
                          <Badge variant="slate">
                            {getCategoryLabel(suggestion.category)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>Impact: {suggestion.impact_score}/100</span>
                          <span>Confiance: {suggestion.confidence}%</span>
                          {suggestion.action_items && suggestion.action_items.length > 0 && (
                            <span>{suggestion.action_items.length} action(s)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplySuggestion(suggestion.id);
                        }}
                      >
                        Appliquer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={X}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissSuggestion(suggestion.id);
                        }}
                      >
                        Ignorer
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal détail suggestion */}
      {selectedSuggestion && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedSuggestion.title}
          size="lg"
        >
          <div className="space-y-6">
            <div>
              <p className="text-slate-600 dark:text-slate-400">{selectedSuggestion.description}</p>
            </div>

            {selectedSuggestion.action_items && selectedSuggestion.action_items.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Actions recommandées</h4>
                <div className="space-y-2">
                  {selectedSuggestion.action_items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={16} className="text-indigo-600" />
                          <span className="font-medium text-slate-900 dark:text-white">{item.action}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                          Priorité: {item.priority} • Impact estimé: {item.estimated_impact}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Score d'impact</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedSuggestion.impact_score}/100</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Niveau de confiance</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedSuggestion.confidence}%</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => handleDismissSuggestion(selectedSuggestion.id)}>
                Ignorer
              </Button>
              <Button variant="primary" onClick={() => handleApplySuggestion(selectedSuggestion.id)}>
                Appliquer la suggestion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};

