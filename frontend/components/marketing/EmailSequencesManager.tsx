import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trash2, Edit3, Mail, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useEmailSequences, EmailSequence, EmailSequenceStep, ScenarioType } from '../../lib/supabase/hooks/useEmailSequences';
import { useEmailTemplates } from '../../lib/supabase/hooks/useEmailTemplates';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  onboarding: 'Onboarding',
  nurturing: 'Nurturing',
  reactivation: 'Réactivation',
  relance: 'Relance',
  conversion: 'Conversion',
  retention: 'Rétention',
  custom: 'Personnalisé',
};

const ESCALATION_LABELS: Record<number, string> = {
  1: 'Email',
  2: 'SMS',
  3: 'Appel',
};

export const EmailSequencesManager: React.FC = () => {
  const {
    sequences,
    loading,
    error,
    loadSequences,
    createSequence,
    updateSequence,
    deleteSequence,
    addStep,
    enrollLead,
    pauseEnrollment,
    checkAndEnrollLeads,
  } = useEmailSequences();

  const { templates } = useEmailTemplates();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);

  const [newSequence, setNewSequence] = useState({
    name: '',
    description: '',
    scenarioType: 'custom' as ScenarioType,
    triggerConditions: {
      temperature: [] as string[],
      daysInactive: 0,
      lifecycleStage: [] as string[],
    },
    isActive: true,
    pauseOnEngagement: true,
  });

  const [newStep, setNewStep] = useState({
    stepOrder: 1,
    delayDays: 0,
    delayHours: 0,
    templateId: '',
    subject: '',
    content: '',
    escalationLevel: 1,
  });

  useEffect(() => {
    loadSequences();
  }, []);

  const handleCreateSequence = async () => {
    try {
      await createSequence(newSequence);
      setShowCreateModal(false);
      setNewSequence({
        name: '',
        description: '',
        scenarioType: 'custom',
        triggerConditions: {
          temperature: [],
          daysInactive: 0,
          lifecycleStage: [],
        },
        isActive: true,
        pauseOnEngagement: true,
      });
    } catch (err) {
      console.error('Error creating sequence:', err);
    }
  };

  const handleAddStep = async () => {
    if (!selectedSequence) return;

    try {
      await addStep(selectedSequence.id, {
        ...newStep,
        personalizationRules: {},
        conditions: {},
      });
      setShowStepModal(false);
      setNewStep({
        stepOrder: (selectedSequence.steps?.length || 0) + 1,
        delayDays: 0,
        delayHours: 0,
        templateId: '',
        subject: '',
        content: '',
        escalationLevel: 1,
      });
      await loadSequences();
    } catch (err) {
      console.error('Error adding step:', err);
    }
  };

  const handleEnrollLeads = async (sequenceId: string) => {
    try {
      if (!sequenceId || sequenceId.trim() === '') {
        alert('Erreur : ID de séquence invalide');
        return;
      }
      const count = await checkAndEnrollLeads(sequenceId);
      alert(`${count} leads inscrits dans la séquence`);
      await loadSequences();
    } catch (err: any) {
      console.error('Error enrolling leads:', err);
      alert(`Erreur lors de l'inscription : ${err.message || 'Erreur inconnue'}`);
    }
  };

  const handleEdit = (sequence: EmailSequence) => {
    setEditingSequence(sequence);
    setNewSequence({
      name: sequence.name,
      description: sequence.description || '',
      scenarioType: sequence.scenarioType || 'custom',
      triggerConditions: sequence.triggerConditions,
      isActive: sequence.isActive,
      pauseOnEngagement: sequence.pauseOnEngagement,
    });
    setShowEditModal(true);
  };

  const handleUpdateSequence = async () => {
    if (!editingSequence) return;
    try {
      await updateSequence(editingSequence.id, newSequence);
      setShowEditModal(false);
      setEditingSequence(null);
      await loadSequences();
    } catch (err) {
      console.error('Error updating sequence:', err);
      alert('Erreur lors de la mise à jour de la séquence');
    }
  };

  const handleDelete = async (sequenceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette séquence ?')) {
      return;
    }
    try {
      await deleteSequence(sequenceId);
      await loadSequences();
    } catch (err) {
      console.error('Error deleting sequence:', err);
      alert('Erreur lors de la suppression de la séquence');
    }
  };

  const toggleSequence = (sequenceId: string) => {
    const newExpanded = new Set(expandedSequences);
    if (newExpanded.has(sequenceId)) {
      newExpanded.delete(sequenceId);
    } else {
      newExpanded.add(sequenceId);
    }
    setExpandedSequences(newExpanded);
  };

  const createPredefinedSequence = async (scenario: 'onboarding' | 'nurturing') => {
    if (scenario === 'onboarding') {
      const sequence = await createSequence({
        name: 'Onboarding Nouveau Lead',
        description: 'Séquence d\'accueil automatique pour les nouveaux leads',
        scenarioType: 'onboarding',
        triggerConditions: {
          lifecycleStage: ['Lead'],
        },
        isActive: true,
        pauseOnEngagement: true,
      });

      // Ajouter les étapes
      await addStep(sequence.id, {
        stepOrder: 1,
        delayDays: 0,
        delayHours: 0,
        templateId: '',
        subject: 'Bienvenue chez {{entreprise}} !',
        content: 'Bonjour {{nom}},\n\nMerci de votre intérêt...',
        escalationLevel: 1,
        personalizationRules: {},
        conditions: {},
      });
    } else if (scenario === 'nurturing') {
      const sequence = await createSequence({
        name: 'Nurturing Lead Froid/Tiède',
        description: 'Séquence d\'emails éducatifs pour réchauffer les leads',
        scenarioType: 'nurturing',
        triggerConditions: {
          temperature: ['Froid', 'Tiède'],
          daysInactive: 7,
        },
        isActive: true,
        pauseOnEngagement: true,
      });

      // Ajouter les 4 étapes
      const steps = [
        { delayDays: 3, subject: 'Email 1 : Contenu éducatif', escalationLevel: 1 },
        { delayDays: 7, subject: 'Email 2 : Contenu sectoriel', escalationLevel: 1 },
        { delayDays: 14, subject: 'Email 3 : Témoignages clients', escalationLevel: 1 },
        { delayDays: 21, subject: 'Email 4 : Offre spéciale', escalationLevel: 1 },
      ];

      for (let i = 0; i < steps.length; i++) {
        await addStep(sequence.id, {
          stepOrder: i + 1,
          delayDays: steps[i].delayDays,
          delayHours: 0,
          templateId: '',
          subject: steps[i].subject,
          content: '',
          escalationLevel: steps[i].escalationLevel,
          personalizationRules: {},
          conditions: {},
        });
      }
    }

    await loadSequences();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des séquences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Séquences d'emails</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez vos séquences d'emails automatisées</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => createPredefinedSequence('onboarding')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Scénario Onboarding
          </Button>
          <Button
            variant="outline"
            onClick={() => createPredefinedSequence('nurturing')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Scénario Nurturing
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle séquence
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Erreur : {error.message}
        </div>
      )}

      {/* Scénarios pré-configurés */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Scénarios pré-configurés</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer"
            onClick={() => createPredefinedSequence('onboarding')}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Onboarding Nouveau Lead</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Séquence d'accueil automatique pour les nouveaux leads
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Utiliser ce scénario
            </Button>
          </div>

          <div
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer"
            onClick={() => createPredefinedSequence('nurturing')}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Nurturing Lead Froid/Tiède</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Séquence d'emails éducatifs pour réchauffer les leads
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Utiliser ce scénario
            </Button>
          </div>

          <div
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all duration-500 cursor-pointer opacity-50"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Réactivation</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Séquence de réactivation pour les leads inactifs (à venir)
            </p>
            <Button size="sm" variant="outline" className="w-full" disabled>
              Bientôt disponible
            </Button>
          </div>
        </div>
      </div>

      {/* Mes Séquences */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Mes Séquences</h3>
      </div>

      <div className="space-y-4">
        {sequences.map((sequence) => (
          <div
            key={sequence.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSequence(sequence.id)}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    {expandedSequences.has(sequence.id) ? '▼' : '▶'}
                  </button>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{sequence.name}</h3>
                  {sequence.scenarioType && (
                    <Badge variant="outline">
                      {SCENARIO_LABELS[sequence.scenarioType]}
                    </Badge>
                  )}
                  <Badge variant={sequence.isActive ? 'success' : 'secondary'}>
                    {sequence.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                {sequence.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-8">{sequence.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnrollLeads(sequence.id)}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Inscrire leads
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(sequence)}
                  title="Modifier la séquence"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDelete(sequence.id)}
                  title="Supprimer la séquence"
                  className="text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {expandedSequences.has(sequence.id) && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Conditions de déclenchement :</span>
                    <div className="mt-1 space-y-1">
                      {sequence.triggerConditions.temperature?.length > 0 && (
                        <div>Température : {sequence.triggerConditions.temperature.join(', ')}</div>
                      )}
                      {sequence.triggerConditions.daysInactive > 0 && (
                        <div>Inactif depuis : {sequence.triggerConditions.daysInactive} jours</div>
                      )}
                      {sequence.triggerConditions.lifecycleStage?.length > 0 && (
                        <div>Stade : {sequence.triggerConditions.lifecycleStage.join(', ')}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Options :</span>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {sequence.pauseOnEngagement ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                        <span className="text-slate-600 dark:text-slate-400">Pause si engagement détecté</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900 dark:text-white">Étapes de la séquence</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSequence(sequence);
                        setNewStep({
                          stepOrder: (sequence.steps?.length || 0) + 1,
                          delayDays: 0,
                          delayHours: 0,
                          templateId: '',
                          subject: '',
                          content: '',
                          escalationLevel: 1,
                        });
                        setShowStepModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter étape
                    </Button>
                  </div>

                  {sequence.steps && sequence.steps.length > 0 ? (
                    <div className="space-y-2">
                      {sequence.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{step.stepOrder}</Badge>
                            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              J+{step.delayDays}
                              {step.delayHours > 0 && ` ${step.delayHours}h`}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-slate-900 dark:text-white">{step.subject || 'Sans sujet'}</div>
                            {step.templateId && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Template : {templates.find(t => t.id === step.templateId)?.name || step.templateId}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">
                            {ESCALATION_LABELS[step.escalationLevel] || `Niveau ${step.escalationLevel}`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      Aucune étape configurée. Ajoutez votre première étape.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {sequences.length === 0 && (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Mail className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Aucune séquence créée</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Créez votre première séquence d'emails automatisée</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une séquence
            </Button>
          </div>
        )}
      </div>

      {/* Modal de création de séquence */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouvelle séquence d'emails"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nom de la séquence
            </label>
            <Input
              value={newSequence.name}
              onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
              placeholder="Ex: Réactivation leads inactifs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <Textarea
              value={newSequence.description}
              onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
              placeholder="Décrivez l'objectif de cette séquence..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type de scénario
            </label>
            <Select
              value={newSequence.scenarioType}
              onChange={(e) => setNewSequence({ ...newSequence, scenarioType: e.target.value as ScenarioType })}
            >
              {Object.entries(SCENARIO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pauseOnEngagement"
              checked={newSequence.pauseOnEngagement}
              onChange={(e) => setNewSequence({ ...newSequence, pauseOnEngagement: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="pauseOnEngagement" className="text-sm text-slate-700 dark:text-slate-300">
              Pause automatique si engagement détecté
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSequence}>
              Créer la séquence
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'édition de séquence */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSequence(null);
        }}
        title="Modifier la séquence"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nom de la séquence
            </label>
            <Input
              value={newSequence.name}
              onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
              placeholder="Ex: Réactivation leads inactifs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <Textarea
              value={newSequence.description}
              onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
              placeholder="Décrivez l'objectif de cette séquence..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type de scénario
            </label>
            <Select
              value={newSequence.scenarioType}
              onChange={(e) => setNewSequence({ ...newSequence, scenarioType: e.target.value as ScenarioType })}
            >
              {Object.entries(SCENARIO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editPauseOnEngagement"
              checked={newSequence.pauseOnEngagement}
              onChange={(e) => setNewSequence({ ...newSequence, pauseOnEngagement: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="editPauseOnEngagement" className="text-sm text-slate-700 dark:text-slate-300">
              Pause automatique si engagement détecté
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsActive"
              checked={newSequence.isActive}
              onChange={(e) => setNewSequence({ ...newSequence, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="editIsActive" className="text-sm text-slate-700 dark:text-slate-300">
              Séquence active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              setEditingSequence(null);
            }}>
              Annuler
            </Button>
            <Button onClick={handleUpdateSequence}>
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'ajout d'étape */}
      <Modal
        isOpen={showStepModal}
        onClose={() => setShowStepModal(false)}
        title="Ajouter une étape"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Délai (jours)
              </label>
              <Input
                type="number"
                value={newStep.delayDays}
                onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Délai (heures)
              </label>
              <Input
                type="number"
                value={newStep.delayHours}
                onChange={(e) => setNewStep({ ...newStep, delayHours: parseInt(e.target.value) || 0 })}
                min="0"
                max="23"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Template (optionnel)
            </label>
            <Select
              value={newStep.templateId || ''}
              onChange={(e) => setNewStep({ ...newStep, templateId: e.target.value || '' })}
            >
              <option value="">Aucun template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sujet de l'email
            </label>
            <Input
              value={newStep.subject}
              onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
              placeholder="Ex: Bienvenue chez {{entreprise}} !"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Niveau d'escalade
            </label>
            <Select
              value={newStep.escalationLevel}
              onChange={(e) => setNewStep({ ...newStep, escalationLevel: parseInt(e.target.value) })}
            >
              <option value="1">Email</option>
              <option value="2">SMS</option>
              <option value="3">Appel</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowStepModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddStep}>
              Ajouter l'étape
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

