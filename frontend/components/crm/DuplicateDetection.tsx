import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { Checkbox } from '../ui/Checkbox';
import { Radio } from '../ui/Radio';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { AlertTriangle, Merge, X, Settings, Filter, RefreshCw, UserPlus } from 'lucide-react';
import { detectDuplicatesAsync, groupDuplicates, DuplicateGroup, DetectionOptions, clearCache } from '../../lib/utils/duplicateDetection';
import { Lead } from '../../types';
import { useApp } from '../contexts/AppContext';

interface DuplicateDetectionProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge?: (leadIds: string[], keepLeadId: string) => void;
  onEnrich?: (leadIds: string[], keepLeadId: string) => void;
}

export const DuplicateDetection: React.FC<DuplicateDetectionProps> = ({ 
  isOpen, 
  onClose,
  onMerge,
  onEnrich
}) => {
  const { leads } = useApp();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [selectedLeads, setSelectedLeads] = useState<Record<string, Set<string>>>({}); // groupId -> Set of leadIds
  const [isMerging, setIsMerging] = useState(false);
  const [isEnriching, setIsEnriching] = useState<string | null>(null); // groupId en cours d'enrichissement
  
  // Options de détection
  const [minConfidence, setMinConfidence] = useState(70);
  const [enableFuzzyMatch, setEnableFuzzyMatch] = useState(true);
  const [enableTransitiveGrouping, setEnableTransitiveGrouping] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filterConfidence, setFilterConfidence] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && leads.length > 0) {
      detectDuplicates();
    } else if (isOpen && leads.length === 0) {
      setLoading(false);
      setDuplicateGroups([]);
    }
  }, [isOpen, leads.length]);

  useEffect(() => {
    // Filtrer les groupes selon le filtre de confiance
    if (filterConfidence !== null) {
      setFilteredGroups(duplicateGroups.filter(g => g.confidence >= filterConfidence));
    } else {
      setFilteredGroups(duplicateGroups);
    }
  }, [duplicateGroups, filterConfidence]);

  const detectDuplicates = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    clearCache(); // Nettoyer le cache avant une nouvelle détection
    
    try {
      const leadData = leads.map(l => ({
        id: l.id,
        company: l.company,
        email: l.email,
        phone: l.phone,
        name: l.name,
      }));

      const options: DetectionOptions = {
        minConfidence,
        enableFuzzyMatch,
        enableTransitiveGrouping,
        onProgress: (p) => setProgress(p),
      };

      // Utiliser la version asynchrone pour ne pas bloquer l'UI
      const groups = await detectDuplicatesAsync(leadData, options);
      setDuplicateGroups(groups);
      setProgress(100);
    } catch (error) {
      console.error('Erreur détection doublons:', error);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [leads, minConfidence, enableFuzzyMatch, enableTransitiveGrouping]);

  const handleRefresh = () => {
    detectDuplicates();
  };

  const handleSelectGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSelectMergeTarget = (groupId: string, leadId: string) => {
    setMergeTargets({ ...mergeTargets, [groupId]: leadId });
  };

  const handleToggleLeadSelection = (groupId: string, leadId: string) => {
    setSelectedLeads(prev => {
      const groupSelections = prev[groupId] || new Set<string>();
      const newGroupSelections = new Set(groupSelections);
      
      if (newGroupSelections.has(leadId)) {
        newGroupSelections.delete(leadId);
      } else {
        newGroupSelections.add(leadId);
      }
      
      // Si aucun lead n'est sélectionné, retirer le groupe (revient à l'état "tous sélectionnés")
      if (newGroupSelections.size === 0) {
        const newSelected = { ...prev };
        delete newSelected[groupId];
        return newSelected;
      }
      
      return { ...prev, [groupId]: newGroupSelections };
    });
  };

  const handleMerge = async (group: DuplicateGroup, groupId: string) => {
    const selectedLeadIds = selectedLeads[groupId] || new Set<string>();
    const targetId = mergeTargets[groupId];
    
    // Si aucun lead n'est sélectionné, utiliser tous les leads du groupe (comportement par défaut)
    const leadsToProcess = selectedLeadIds.size > 0 
      ? Array.from(selectedLeadIds)
      : group.leads.map(l => l.id);
    
    // Si aucun target n'est sélectionné, utiliser le premier lead
    const finalTargetId = targetId || leadsToProcess[0];
    const leadIdsToMerge = leadsToProcess.filter(id => id !== finalTargetId);
    
    if (onMerge && leadIdsToMerge.length > 0 && finalTargetId) {
      setIsMerging(true);
      try {
        // Appeler la fonction de fusion (qui peut être asynchrone)
        await onMerge(leadIdsToMerge, finalTargetId);
        
        // Retirer les leads fusionnés de la sélection
        setSelectedLeads(prev => {
          const newSelected = { ...prev };
          const groupSelections = newSelected[groupId];
          if (groupSelections) {
            const newGroupSelections = new Set(groupSelections);
            leadIdsToMerge.forEach(id => newGroupSelections.delete(id));
            newGroupSelections.delete(finalTargetId);
            
            if (newGroupSelections.size === 0) {
              delete newSelected[groupId];
              // Retirer aussi le groupe de la sélection principale
              setSelectedGroups(prev => {
                const newSet = new Set(prev);
                newSet.delete(groupId);
                return newSet;
              });
            } else {
              newSelected[groupId] = newGroupSelections;
            }
          }
          return newSelected;
        });
        
        // Retirer le target de mergeTargets si tous les leads sont fusionnés
        if (selectedLeadIds.size === 0 || leadIdsToMerge.length === leadsToProcess.length - 1) {
          setMergeTargets(prev => {
            const newTargets = { ...prev };
            delete newTargets[groupId];
            return newTargets;
          });
        }
        
        // Relancer la détection pour mettre à jour la liste (les leads ont changé)
        // Attendre un peu pour que les leads soient mis à jour dans le contexte
        setTimeout(() => {
          detectDuplicates();
        }, 300);
      } catch (error) {
        console.error('Erreur lors de la fusion:', error);
      } finally {
        setIsMerging(false);
      }
    }
  };

  const handleEnrich = async (group: DuplicateGroup, groupId: string) => {
    const selectedLeadIds = selectedLeads[groupId] || new Set<string>();
    const targetId = mergeTargets[groupId] || group.leads[0].id;
    
    // Si aucun lead n'est sélectionné, utiliser tous les leads du groupe sauf le target
    const leadsToProcess = selectedLeadIds.size > 0 
      ? Array.from(selectedLeadIds)
      : group.leads.map(l => l.id);
    
    const leadIdsToEnrich = leadsToProcess.filter(id => id !== targetId);
    
    if (onEnrich && leadIdsToEnrich.length > 0 && targetId) {
      setIsEnriching(groupId);
      try {
        // Appeler la fonction d'enrichissement (qui peut être asynchrone)
        await onEnrich(leadIdsToEnrich, targetId);
        
        // Retirer les leads enrichis de la sélection
        setSelectedLeads(prev => {
          const newSelected = { ...prev };
          const groupSelections = newSelected[groupId];
          if (groupSelections) {
            const newGroupSelections = new Set(groupSelections);
            leadIdsToEnrich.forEach(id => newGroupSelections.delete(id));
            
            if (newGroupSelections.size === 0) {
              delete newSelected[groupId];
              // Retirer aussi le groupe de la sélection principale
              setSelectedGroups(prev => {
                const newSet = new Set(prev);
                newSet.delete(groupId);
                return newSet;
              });
            } else {
              newSelected[groupId] = newGroupSelections;
            }
          }
          return newSelected;
        });
        
        // Relancer la détection pour mettre à jour la liste
        setTimeout(() => {
          detectDuplicates();
        }, 300);
      } catch (error) {
        console.error('Erreur lors de l\'enrichissement:', error);
      } finally {
        setIsEnriching(null);
      }
    }
  };

  if (!isOpen) return null;

  const totalLeadsInDuplicates = filteredGroups.reduce((sum, g) => sum + g.leads.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détection de doublons">
      <div className="space-y-4">
        {/* Options et filtres */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={Settings}
              onClick={() => setShowSettings(!showSettings)}
            >
              Options
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={handleRefresh}
              disabled={loading}
            >
              Actualiser
            </Button>
          </div>
          {!loading && filteredGroups.length > 0 && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {filteredGroups.length} groupe(s) • {totalLeadsInDuplicates} lead(s) concerné(s)
            </div>
          )}
        </div>

        {/* Panneau de configuration */}
        {showSettings && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Seuil de confiance minimum: {minConfidence}%
              </label>
              <Input
                type="number"
                min="50"
                max="100"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Correspondance floue (fuzzy matching)
              </label>
              <Toggle
                checked={enableFuzzyMatch}
                onChange={setEnableFuzzyMatch}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Groupement transitif (A=B, B=C → A=C)
              </label>
              <Toggle
                checked={enableTransitiveGrouping}
                onChange={setEnableTransitiveGrouping}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Filtrer par confiance
              </label>
              <Input
                type="number"
                min="70"
                max="100"
                placeholder="Tous"
                value={filterConfidence || ''}
                onChange={(e) => setFilterConfidence(e.target.value ? Number(e.target.value) : null)}
                className="w-20"
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setShowSettings(false);
                detectDuplicates();
              }}
              className="w-full"
            >
              Appliquer et relancer
            </Button>
          </div>
        )}

        {/* Barre de progression */}
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Analyse en cours...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle size={48} className="mx-auto mb-4 text-green-500" />
            <p className="font-medium">Aucun doublon détecté</p>
            <p className="text-sm mt-2">Tous vos leads sont uniques.</p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {duplicateGroups.length} groupe(s) de doublons détecté(s)
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Sélectionnez les groupes à fusionner et choisissez le lead à conserver.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredGroups.map((group, idx) => {
                const groupId = idx.toString();
                const isSelected = selectedGroups.has(groupId);
                const targetId = mergeTargets[groupId] || group.leads[0].id;

                return (
                  <div
                    key={groupId}
                    className={`p-4 rounded-lg border ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectGroup(groupId)}
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {group.leads.length} doublon(s) potentiel(s)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Confiance: {group.confidence}% • Correspondance: {group.matchReason}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={group.confidence >= 90 ? 'danger' : group.confidence >= 80 ? 'warning' : 'secondary'}
                        size="sm"
                      >
                        {group.confidence}%
                      </Badge>
                    </div>

                    {isSelected && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Sélectionnez les leads à fusionner, puis choisissez celui à conserver :
                        </p>
                        {group.leads.map((lead) => {
                          const fullLead = leads.find(l => l.id === lead.id);
                          const groupSelectedLeads = selectedLeads[groupId] || new Set<string>();
                          // Si aucun lead n'est explicitement sélectionné, tous sont considérés comme sélectionnés par défaut
                          // Sinon, on vérifie si ce lead est dans la sélection
                          const isLeadSelected = groupSelectedLeads.size === 0 || groupSelectedLeads.has(lead.id);
                          const isTarget = targetId === lead.id;
                          const hasSelection = groupSelectedLeads.size > 0;
                          // Un lead peut être target s'il n'y a pas de sélection explicite OU s'il est dans la sélection
                          const canBeTarget = !hasSelection || groupSelectedLeads.has(lead.id);
                          
                          return (
                            <div
                              key={lead.id}
                              className={`flex items-center gap-3 p-2 rounded border transition-all duration-500 ${
                                isTarget && canBeTarget
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                  : isLeadSelected && canBeTarget
                                  ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              } ${!canBeTarget ? 'opacity-50' : 'cursor-pointer'}`}
                              onClick={() => {
                                if (canBeTarget) {
                                  handleSelectMergeTarget(groupId, lead.id);
                                }
                              }}
                            >
                              <Checkbox
                                checked={isLeadSelected}
                                onChange={() => {
                                  const groupSelectedLeads = selectedLeads[groupId] || new Set<string>();
                                  
                                  // Si on décoche et qu'il n'y a pas encore de sélection explicite,
                                  // on doit créer une sélection avec tous les autres leads
                                  if (groupSelectedLeads.size === 0 && isLeadSelected) {
                                    // Créer une sélection avec tous les leads sauf celui qu'on décoche
                                    const allLeadIds = new Set(group.leads.map(l => l.id));
                                    allLeadIds.delete(lead.id);
                                    setSelectedLeads(prev => ({
                                      ...prev,
                                      [groupId]: allLeadIds
                                    }));
                                  } else if (groupSelectedLeads.size === 1 && groupSelectedLeads.has(lead.id)) {
                                    // Si on décoche le dernier lead sélectionné, on revient à l'état "tous sélectionnés"
                                    // en supprimant le groupe de la sélection
                                    setSelectedLeads(prev => {
                                      const newSelected = { ...prev };
                                      delete newSelected[groupId];
                                      return newSelected;
                                    });
                                  } else {
                                    // Comportement normal : toggle la sélection
                                    handleToggleLeadSelection(groupId, lead.id);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Radio
                                name={`target-${groupId}`}
                                checked={isTarget && canBeTarget}
                                onChange={() => {
                                  if (canBeTarget) {
                                    handleSelectMergeTarget(groupId, lead.id);
                                  }
                                }}
                                disabled={!canBeTarget}
                                containerClassName="m-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {fullLead?.name || lead.name || 'Sans nom'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {lead.company}
                                </p>
                                <div className="flex gap-2 mt-1 text-xs text-slate-500">
                                  {lead.email && <span>📧 {lead.email}</span>}
                                  {lead.phone && <span>📞 {lead.phone}</span>}
                                </div>
                              </div>
                              {isTarget && canBeTarget && (
                                <Badge variant="success" size="sm">À conserver</Badge>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            icon={Merge}
                            onClick={() => handleMerge(group, groupId)}
                            disabled={isMerging || !targetId || (selectedLeads[groupId]?.size === 0 && group.leads.length < 2)}
                          >
                            {isMerging ? 'Fusion en cours...' : 'Fusionner les sélectionnés'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={UserPlus}
                            onClick={() => handleEnrich(group, groupId)}
                            disabled={isEnriching === groupId}
                          >
                            {isEnriching === groupId ? 'Enrichissement...' : 'Enrichir le contact'}
                          </Button>
                        </div>
                        {selectedLeads[groupId] && selectedLeads[groupId].size > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {selectedLeads[groupId].size} lead(s) sélectionné(s) pour fusion
                          </p>
                        )}
                      </div>
                    )}

                    {!isSelected && (
                      <div className="space-y-1 mt-2">
                        {group.leads.slice(0, 3).map((lead) => {
                          const fullLead = leads.find(l => l.id === lead.id);
                          return (
                            <div key={lead.id} className="text-sm text-slate-600 dark:text-slate-400">
                              • {fullLead?.name || lead.name || 'Sans nom'} - {lead.company}
                            </div>
                          );
                        })}
                        {group.leads.length > 3 && (
                          <div className="text-sm text-slate-500">
                            + {group.leads.length - 3} autre(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

