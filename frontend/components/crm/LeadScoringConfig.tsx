import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { Settings, Save, Trash2, Plus } from 'lucide-react';
import { 
  loadScoringRules, 
  loadDefaultScoringRule, 
  saveScoringRule, 
  updateScoringRule,
  ScoringRule,
  ScoringRulesConfig,
  ScoringWeights,
} from '../../lib/utils/leadScoring';

interface LeadScoringConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadScoringConfig: React.FC<LeadScoringConfigProps> = ({ isOpen, onClose }) => {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const loadedRules = await loadScoringRules();
      setRules(loadedRules);
    } catch (error) {
      console.error('Erreur chargement règles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    try {
      setIsSaving(true);
      if (editingRule.id) {
        await updateScoringRule(editingRule.id, editingRule);
      } else {
        await saveScoringRule(editingRule);
      }
      await loadRules();
      setEditingRule(null);
    } catch (error) {
      console.error('Erreur sauvegarde règle:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return;

    try {
      await updateScoringRule(ruleId, { is_active: false });
      await loadRules();
    } catch (error) {
      console.error('Erreur suppression règle:', error);
    }
  };

  const defaultRule: ScoringRule = {
    name: 'Nouvelle règle',
    is_active: true,
    is_default: false,
    rules: {
      email_valid: { weight: 25, enabled: true },
      phone_valid: { weight: 25, enabled: true },
      data_completeness: { weight: 30, enabled: true },
      source_reliability: { weight: 20, enabled: true },
    },
    weights: {
      email_valid: 25,
      phone_valid: 25,
      data_completeness: 30,
      source_reliability: 20,
    },
  };

  // Calculer le titre du modal d'édition
  const editingModalTitle = editingRule && editingRule.id ? "Modifier la règle" : "Nouvelle règle";

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Configuration du scoring des leads">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Configurez les règles de scoring pour prioriser automatiquement vos leads.
            </p>
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => setEditingRule(defaultRule)}
            >
              Nouvelle règle
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : (
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucune règle configurée. Créez votre première règle de scoring.
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {rule.name}
                          </h4>
                          {rule.is_default && (
                            <Badge variant="success" size="sm">Par défaut</Badge>
                          )}
                          {!rule.is_active && (
                            <Badge variant="secondary" size="sm">Inactive</Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {rule.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {rule.rules.email_valid?.enabled && (
                            <span>Email: {rule.weights?.email_valid}%</span>
                          )}
                          {rule.rules.phone_valid?.enabled && (
                            <span>Téléphone: {rule.weights?.phone_valid}%</span>
                          )}
                          {rule.rules.data_completeness?.enabled && (
                            <span>Complétude: {rule.weights?.data_completeness}%</span>
                          )}
                          {rule.rules.source_reliability?.enabled && (
                            <span>Fiabilité: {rule.weights?.source_reliability}%</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingRule(rule)}
                        >
                          Modifier
                        </Button>
                        {!rule.is_default && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Trash2}
                            onClick={() => rule.id && handleDeleteRule(rule.id)}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      {editingRule && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRule(null)}
          title={editingModalTitle}
        >
          <div className="space-y-4">
            <Input
              label="Nom de la règle"
              value={editingRule.name}
              onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              value={editingRule.description || ''}
              onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
              rows={3}
            />

            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-white">Pondérations</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email valide (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.weights?.email_valid || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setEditingRule({
                      ...editingRule,
                      weights: { ...(editingRule.weights || {}), email_valid: value },
                      rules: {
                        ...(editingRule.rules || {}),
                        email_valid: { ...(editingRule.rules?.email_valid || {}), weight: value, enabled: value > 0 },
                      },
                    });
                  }}
                />
                <Input
                  label="Téléphone valide (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.weights?.phone_valid || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setEditingRule({
                      ...editingRule,
                      weights: { ...(editingRule.weights || {}), phone_valid: value },
                      rules: {
                        ...(editingRule.rules || {}),
                        phone_valid: { ...(editingRule.rules?.phone_valid || {}), weight: value, enabled: value > 0 },
                      },
                    });
                  }}
                />
                <Input
                  label="Complétude données (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.weights?.data_completeness || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setEditingRule({
                      ...editingRule,
                      weights: { ...(editingRule.weights || {}), data_completeness: value },
                      rules: {
                        ...(editingRule.rules || {}),
                        data_completeness: { ...(editingRule.rules?.data_completeness || {}), weight: value, enabled: value > 0 },
                      },
                    });
                  }}
                />
                <Input
                  label="Fiabilité sources (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.weights?.source_reliability || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setEditingRule({
                      ...editingRule,
                      weights: { ...(editingRule.weights || {}), source_reliability: value },
                      rules: {
                        ...(editingRule.rules || {}),
                        source_reliability: { ...(editingRule.rules?.source_reliability || {}), weight: value, enabled: value > 0 },
                      },
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={() => setEditingRule(null)}
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                icon={Save}
                onClick={handleSaveRule}
                isLoading={isSaving}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

