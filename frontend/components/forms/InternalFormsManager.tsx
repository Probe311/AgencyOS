import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Settings, CheckCircle2, XCircle, Clock, AlertCircle,
  User, Filter, Search, Edit2, Trash2, Eye, Send, Users, BarChart3,
  FileCheck, ArrowRight, Check, X, MessageSquare
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { InternalFormService, InternalForm, FormSubmission, FormApproval } from '../../lib/services/internalFormService';
import { FormBuilder } from '../marketing/FormBuilder';

export const InternalFormsManager: React.FC = () => {
  const { showToast, user } = useApp();
  const [forms, setForms] = useState<InternalForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<FormApproval[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<InternalForm | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<FormApproval | null>(null);
  const [viewMode, setViewMode] = useState<'forms' | 'submissions' | 'approvals' | 'dashboard'>('forms');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    loadData();
  }, [viewMode, filterStatus]);

  const loadData = async () => {
    try {
      if (viewMode === 'forms') {
        const formsData = await InternalFormService.getForms();
        setForms(formsData);
      } else if (viewMode === 'submissions') {
        const submissionsData = await InternalFormService.getSubmissions(
          filterStatus !== 'all' ? { status: filterStatus } : undefined
        );
        setSubmissions(submissionsData);
      } else if (viewMode === 'approvals' && user?.id) {
        const approvalsData = await InternalFormService.getPendingApprovals(user.id);
        setPendingApprovals(approvalsData);
      }
    } catch (error: any) {
      showToast('Erreur lors du chargement', 'error');
    }
  };

  const handleCreateForm = () => {
    setSelectedForm(null);
    setIsFormModalOpen(true);
  };

  const handleSubmitApproval = async (status: 'approved' | 'rejected' | 'changes_requested') => {
    if (!selectedApproval || !user?.id) return;

    try {
      await InternalFormService.approveSubmission(
        selectedApproval.submission_id,
        selectedApproval.id,
        status,
        approvalComments,
        user.id
      );

      showToast(`Soumission ${status === 'approved' ? 'approuvée' : status === 'rejected' ? 'rejetée' : 'modifications demandées'}`, 'success');
      setIsApprovalModalOpen(false);
      setApprovalComments('');
      loadData();
    } catch (error: any) {
      showToast('Erreur lors de l\'approbation', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'blue', label: 'En attente' },
      in_review: { variant: 'orange', label: 'En révision' },
      approved: { variant: 'green', label: 'Approuvé' },
      rejected: { variant: 'red', label: 'Rejeté' },
      completed: { variant: 'green', label: 'Terminé' },
      cancelled: { variant: 'slate', label: 'Annulé' }
    };
    const badge = badges[status] || { variant: 'slate', label: status };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      client_request: 'Demande client',
      brief: 'Brief',
      approval: 'Approbation',
      custom: 'Personnalisé'
    };
    return labels[category] || category;
  };

  const stats = {
    totalForms: forms.length,
    totalSubmissions: submissions.length,
    pendingApprovals: pendingApprovals.length,
    approvedSubmissions: submissions.filter(s => s.status === 'approved').length
  };

  return (
    <PageLayout
      header={{
        icon: FileText,
        title: "Formulaires Internes",
        description: "Gérez les demandes client, briefs et workflows d'approbation",
        rightActions: [
          {
            label: "Nouveau formulaire",
            icon: Plus,
            onClick: handleCreateForm,
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalForms}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Formulaires</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSubmissions}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Soumissions</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingApprovals}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">En attente</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approvedSubmissions}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Approuvés</div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('forms')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                viewMode === 'forms'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Formulaires
            </button>
            <button
              onClick={() => setViewMode('submissions')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                viewMode === 'submissions'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Soumissions
            </button>
            <button
              onClick={() => setViewMode('approvals')}
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                viewMode === 'approvals'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Approbations
              {pendingApprovals.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {pendingApprovals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                viewMode === 'dashboard'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Dashboard
            </button>
          </div>

          <div className="p-6">
            {/* Vue Formulaires */}
            {viewMode === 'forms' && (
              <div className="space-y-4">
                {forms.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucun formulaire créé</p>
                    <Button
                      variant="primary"
                      icon={Plus}
                      onClick={handleCreateForm}
                      className="mt-4"
                    >
                      Créer un formulaire
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {forms.map((form) => (
                      <div
                        key={form.id}
                        className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                              {form.name}
                            </h3>
                            <Badge variant="slate">{getCategoryLabel(form.category)}</Badge>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreVertical size={18} />
                          </Button>
                        </div>
                        {form.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {form.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                          <FileCheck size={14} />
                          <span>{form.form_config.fields?.length || 0} champs</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={() => {
                              setSelectedForm(form);
                              setIsSubmissionModalOpen(true);
                            }}
                          >
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Edit2}
                            onClick={() => {
                              setSelectedForm(form);
                              setIsFormModalOpen(true);
                            }}
                          >
                            Modifier
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vue Soumissions */}
            {viewMode === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Dropdown
                    value={filterStatus}
                    onChange={(value) => setFilterStatus(value)}
                    options={[
                      { value: 'all', label: 'Tous' },
                      { value: 'pending', label: 'En attente' },
                      { value: 'in_review', label: 'En révision' },
                      { value: 'approved', label: 'Approuvé' },
                      { value: 'rejected', label: 'Rejeté' }
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {(submission.internal_forms as any)?.name || 'Formulaire'}
                            </h4>
                            {getStatusBadge(submission.status)}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock size={14} />
                              <span>
                                {new Date(submission.created_at).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            {submission.leads && (
                              <div className="flex items-center gap-2">
                                <User size={14} />
                                <span>Client: {(submission.leads as any).name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setIsSubmissionModalOpen(true);
                          }}
                        >
                          Voir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vue Approbations */}
            {viewMode === 'approvals' && (
              <div className="space-y-4">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucune approbation en attente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="p-4 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                              Soumission #{approval.submission_id.substring(0, 8)}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              Étape {approval.step_number} - En attente de votre approbation
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                icon={Check}
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setIsApprovalModalOpen(true);
                                }}
                              >
                                Approuver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={X}
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setApprovalComments('');
                                  handleSubmitApproval('rejected');
                                }}
                              >
                                Rejeter
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vue Dashboard */}
            {viewMode === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Soumissions par statut
                    </h4>
                    <div className="space-y-2">
                      {['pending', 'in_review', 'approved', 'rejected'].map((status) => {
                        const count = submissions.filter(s => s.status === status).length;
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {getStatusBadge(status).props.children}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Formulaires par catégorie
                    </h4>
                    <div className="space-y-2">
                      {['client_request', 'brief', 'approval', 'custom'].map((category) => {
                        const count = forms.filter(f => f.category === category).length;
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {getCategoryLabel(category)}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Création/Édition Formulaire */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={selectedForm ? "Modifier le formulaire" : "Créer un formulaire"}
        size="xl"
      >
        <FormBuilder
          onSave={async (formData) => {
            try {
              if (selectedForm) {
                await InternalFormService.updateForm(selectedForm.id, formData as any);
                showToast('Formulaire mis à jour', 'success');
              } else {
                await InternalFormService.createForm(formData as any, user?.id);
                showToast('Formulaire créé', 'success');
              }
              setIsFormModalOpen(false);
              loadData();
            } catch (error: any) {
              showToast('Erreur lors de la sauvegarde', 'error');
            }
          }}
          initialForm={selectedForm ? {
            name: selectedForm.name,
            description: selectedForm.description,
            form_config: selectedForm.form_config
          } : undefined}
        />
      </Modal>

      {/* Modal Détails Soumission */}
      <Modal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        title="Détails de la soumission"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                Formulaire: {(selectedSubmission.internal_forms as any)?.name}
              </h4>
              <div className="flex items-center gap-2 mb-4">
                {getStatusBadge(selectedSubmission.status)}
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(selectedSubmission.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
            <div>
              <h5 className="font-medium text-slate-900 dark:text-white mb-2">Données soumises:</h5>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <pre className="text-sm text-slate-700 dark:text-slate-300 overflow-auto">
                  {JSON.stringify(selectedSubmission.submission_data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Approbation */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Approuver la soumission"
        size="md"
      >
        {selectedApproval && (
          <div className="space-y-4">
            <Textarea
              label="Commentaires (optionnel)"
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              rows={4}
              placeholder="Ajoutez des commentaires sur cette soumission..."
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApprovalModalOpen(false);
                  setApprovalComments('');
                }}
              >
                Annuler
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleSubmitApproval('changes_requested');
                }}
              >
                Demander modifications
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleSubmitApproval('approved');
                }}
              >
                Approuver
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

