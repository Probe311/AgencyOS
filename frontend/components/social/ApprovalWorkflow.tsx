import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, User, Mail, Send, Settings, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';

export type ApprovalRole = 'rédacteur' | 'éditeur' | 'approbateur' | 'client';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export interface ApprovalStep {
  id: string;
  name: string;
  role: ApprovalRole;
  userId?: string;
  status: ApprovalStatus;
  comment?: string;
  completedAt?: string;
  order: number;
}

export interface ApprovalWorkflowConfig {
  id: string;
  name: string;
  steps: ApprovalStep[];
  isActive: boolean;
}

interface ApprovalWorkflowProps {
  postId: string;
  postContent: string;
  postImage?: string;
  workflow?: ApprovalWorkflowConfig;
  onApprove?: (stepId: string) => void;
  onReject?: (stepId: string, comment: string) => void;
  onRequestChanges?: (stepId: string, comment: string) => void;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  postId,
  postContent,
  postImage,
  workflow,
  onApprove,
  onReject,
  onRequestChanges,
}) => {
  const { showToast, users } = useApp();
  const [currentStep, setCurrentStep] = useState<ApprovalStep | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [changesComment, setChangesComment] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);

  if (!workflow || !workflow.steps.length) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucun workflow d'approbation configuré
        </p>
      </div>
    );
  }

  const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);
  const currentStepIndex = sortedSteps.findIndex(s => s.status === 'pending');
  const activeStep = currentStepIndex >= 0 ? sortedSteps[currentStepIndex] : null;

  const handleApprove = (step: ApprovalStep) => {
    if (onApprove) {
      onApprove(step.id);
      showToast('Étape approuvée avec succès', 'success');
    }
  };

  const handleReject = (step: ApprovalStep) => {
    setCurrentStep(step);
    setIsRejectModalOpen(true);
  };

  const handleRequestChanges = (step: ApprovalStep) => {
    setCurrentStep(step);
    setIsChangesModalOpen(true);
  };

  const confirmReject = () => {
    if (currentStep && rejectionComment.trim()) {
      if (onReject) {
        onReject(currentStep.id, rejectionComment);
        showToast('Modifications demandées', 'info');
      }
      setIsRejectModalOpen(false);
      setRejectionComment('');
      setCurrentStep(null);
    }
  };

  const confirmRequestChanges = () => {
    if (currentStep && changesComment.trim()) {
      if (onRequestChanges) {
        onRequestChanges(currentStep.id, changesComment);
        showToast('Modifications demandées', 'info');
      }
      setIsChangesModalOpen(false);
      setChangesComment('');
      setCurrentStep(null);
    }
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <XCircle size={16} className="text-rose-600 dark:text-rose-400" />;
      case 'changes_requested':
        return <Edit2 size={16} className="text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock size={16} className="text-slate-400 dark:text-slate-500" />;
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Approuvé</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Rejeté</Badge>;
      case 'changes_requested':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Modifications demandées</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">En attente</Badge>;
    }
  };

  const getRoleColor = (role: ApprovalRole) => {
    switch (role) {
      case 'rédacteur':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'éditeur':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'approbateur':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'client':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Aperçu du post */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="font-bold text-slate-900 dark:text-white mb-3">Aperçu du post</h3>
        {postImage && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img src={postImage} alt="Post" className="w-full h-48 object-cover" />
          </div>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
          {postContent}
        </p>
      </div>

      {/* Étapes du workflow */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-white">Étapes d'approbation</h3>
        {sortedSteps.map((step, index) => {
          const isActive = step.id === activeStep?.id;
          const isCompleted = step.status === 'approved';
          const canInteract = isActive;

          return (
            <div
              key={step.id}
              className={`p-4 rounded-lg border transition-all duration-500 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : isCompleted
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRoleColor(step.role)}`}>
                    <User size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{step.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{step.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(step.status)}
                  {getStatusBadge(step.status)}
                </div>
              </div>

              {step.comment && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{step.comment}</p>
                </div>
              )}

              {step.completedAt && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Complété le {new Date(step.completedAt).toLocaleDateString('fr-FR')}
                </p>
              )}

              {canInteract && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle}
                    onClick={() => handleApprove(step)}
                  >
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Edit2}
                    onClick={() => handleRequestChanges(step)}
                  >
                    Demander modifications
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={XCircle}
                    onClick={() => handleReject(step)}
                    className="text-rose-600"
                  >
                    Rejeter
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de rejet */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectionComment('');
          setCurrentStep(null);
        }}
        title="Rejeter le post"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Veuillez expliquer pourquoi ce post est rejeté :
          </p>
          <textarea
            value={rejectionComment}
            onChange={(e) => setRejectionComment(e.target.value)}
            placeholder="Commentaire de rejet..."
            rows={4}
            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectionComment('');
                setCurrentStep(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={confirmReject}
              disabled={!rejectionComment.trim()}
            >
              Rejeter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de demande de modifications */}
      <Modal
        isOpen={isChangesModalOpen}
        onClose={() => {
          setIsChangesModalOpen(false);
          setChangesComment('');
          setCurrentStep(null);
        }}
        title="Demander des modifications"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Veuillez indiquer les modifications à apporter :
          </p>
          <textarea
            value={changesComment}
            onChange={(e) => setChangesComment(e.target.value)}
            placeholder="Commentaire sur les modifications..."
            rows={4}
            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsChangesModalOpen(false);
                setChangesComment('');
                setCurrentStep(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmRequestChanges}
              disabled={!changesComment.trim()}
            >
              Demander modifications
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

