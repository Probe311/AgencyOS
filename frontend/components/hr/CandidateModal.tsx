import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { FileInput } from '../ui/FileInput';
import { useApp } from '../contexts/AppContext';
import { Candidate } from '../../types';
import { supabase } from '../../lib/supabase';
import { generateUniqueId } from '../../lib/utils';
import { UserPlus, Mail, Phone, Briefcase, FileText } from 'lucide-react';

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
  onSave?: () => void;
}

const STAGE_OPTIONS = [
  { value: 'Candidature', label: 'Candidature' },
  { value: 'Screening', label: 'Screening' },
  { value: 'Entretien', label: 'Entretien' },
  { value: 'Offre', label: 'Offre' },
  { value: 'Embauché', label: 'Embauché' },
  { value: 'Rejeté', label: 'Rejeté' },
];

const SOURCE_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Site Web' },
  { value: 'referral', label: 'Cooptation' },
  { value: 'agency', label: 'Agence de Recrutement' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'autre', label: 'Autre' },
];

export const CandidateModal: React.FC<CandidateModalProps> = ({ 
  isOpen, 
  onClose, 
  candidate, 
  onSave 
}) => {
  const { showToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    stage: 'Candidature' as Candidate['stage'],
    source: 'linkedin',
    score: 0,
    notes: '',
    cvUrl: '',
  });

  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || '',
        email: '',
        phone: '',
        role: candidate.role || '',
        stage: candidate.stage || 'Candidature',
        source: 'linkedin',
        score: candidate.score || 0,
        notes: '',
        cvUrl: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        stage: 'Candidature',
        source: 'linkedin',
        score: 0,
        notes: '',
        cvUrl: '',
      });
    }
  }, [candidate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const candidateData = {
        name: formData.name,
        role: formData.role,
        stage: formData.stage,
        score: formData.score,
        applied_date: new Date().toISOString(),
        avatar: `https://i.pravatar.cc/150?u=${generateUniqueId()}`,
      };

      if (candidate?.id) {
        const { error } = await supabase
          .from('candidates')
          .update(candidateData)
          .eq('id', candidate.id);
        
        if (error) throw error;
        showToast('Candidat mis à jour', 'success');
      } else {
        const { error } = await supabase
          .from('candidates')
          .insert([candidateData]);
        
        if (error) throw error;
        showToast('Candidat créé', 'success');
      }

      onSave?.();
      onClose();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={candidate ? 'Modifier le candidat' : 'Nouveau candidat'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Informations personnelles */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Informations personnelles
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom & Nom *"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="ex: Peter Parker"
              icon={UserPlus}
            />
            <Input
              label="Poste visé *"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              required
              placeholder="ex: Développeur Frontend"
              icon={Briefcase}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="peter@example.com"
              icon={Mail}
            />
            <Input
              label="Téléphone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+33 6 12 34 56 78"
              icon={Phone}
            />
          </div>
        </div>

        {/* Section: Informations de recrutement */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Pipeline de recrutement
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Étape *"
              value={formData.stage}
              onChange={(value) => setFormData(prev => ({ ...prev, stage: value as Candidate['stage'] }))}
              options={STAGE_OPTIONS}
              required
            />
            <Dropdown
              label="Source"
              value={formData.source}
              onChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
              options={SOURCE_OPTIONS}
            />
          </div>
          <Input
            label="Score (0-100)"
            type="number"
            min="0"
            max="100"
            value={formData.score}
            onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
        </div>

        {/* Section: Documents */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Documents
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <FileInput
              icon={FileText}
              dropzoneText="Cliquez pour upload ou glissez un CV"
              helpText="PDF, DOCX (MAX. 5MB)"
              accept=".pdf,.doc,.docx"
              containerClassName="gap-0"
            />
          </div>
        </div>

        {/* Section: Notes */}
        <div className="space-y-4">
          <Textarea
            label="Notes / Résumé"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Expérience, compétences, soft skills, feedback d'entretien..."
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            {candidate ? 'Enregistrer' : 'Créer le candidat'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

