import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useApp } from '../contexts/AppContext';
import { Calendar, Clock, User } from 'lucide-react';

interface LeaveRequest {
  id?: string;
  employeeId: string;
  employeeName?: string;
  leaveType: 'Congés payés' | 'RTT' | 'Maladie' | 'Congé sans solde' | 'Autre';
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'En attente' | 'Approuvé' | 'Refusé';
}

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest?: LeaveRequest | null;
  employeeId?: string;
  employeeName?: string;
  onSave?: () => void;
}

const LEAVE_TYPE_OPTIONS = [
  { value: 'Congés payés', label: 'Congés payés' },
  { value: 'RTT', label: 'RTT (Réduction du Temps de Travail)' },
  { value: 'Maladie', label: 'Arrêt maladie' },
  { value: 'Congé sans solde', label: 'Congé sans solde' },
  { value: 'Autre', label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: 'En attente', label: 'En attente' },
  { value: 'Approuvé', label: 'Approuvé' },
  { value: 'Refusé', label: 'Refusé' },
];

export const LeaveModal: React.FC<LeaveModalProps> = ({ 
  isOpen, 
  onClose, 
  leaveRequest, 
  employeeId,
  employeeName,
  onSave 
}) => {
  const { showToast, employees } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LeaveRequest>({
    employeeId: employeeId || '',
    employeeName: employeeName || '',
    leaveType: 'Congés payés',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    days: 1,
    reason: '',
    status: 'En attente',
  });

  useEffect(() => {
    if (leaveRequest) {
      setFormData({
        ...leaveRequest,
        startDate: leaveRequest.startDate.split('T')[0],
        endDate: leaveRequest.endDate.split('T')[0],
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        employeeId: employeeId || '',
        employeeName: employeeName || '',
        leaveType: 'Congés payés',
        startDate: today,
        endDate: today,
        days: 1,
        reason: '',
        status: 'En attente',
      });
    }
  }, [leaveRequest, employeeId, employeeName, isOpen]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setFormData(prev => ({ ...prev, days: diffDays }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real app, this would save to Supabase
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      showToast(
        leaveRequest 
          ? 'Demande de congé mise à jour' 
          : 'Demande de congé créée',
        'success'
      );
      
      onSave?.();
      onClose();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.employeeId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={leaveRequest ? 'Modifier la demande de congé' : 'Nouvelle demande de congé'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Informations de base */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Informations de base
          </h3>
          
          {!employeeId && (
            <Dropdown
              label="Employé *"
              value={formData.employeeId}
              onChange={(value) => {
                const emp = employees.find(e => e.id === value);
                setFormData(prev => ({
                  ...prev,
                  employeeId: value,
                  employeeName: emp?.name || '',
                }));
              }}
              options={employees.map(emp => ({
                value: emp.id,
                label: emp.name,
              }))}
              required
            />
          )}

          {selectedEmployee && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedEmployee.avatar} 
                  alt={selectedEmployee.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedEmployee.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.position}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Solde disponible</p>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">{selectedEmployee.ptoBalance} jours</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Type de congé *"
              value={formData.leaveType}
              onChange={(value) => setFormData(prev => ({ ...prev, leaveType: value as LeaveRequest['leaveType'] }))}
              options={LEAVE_TYPE_OPTIONS}
              required
            />
            
            {leaveRequest && (
              <Dropdown
                label="Statut *"
                value={formData.status}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value as LeaveRequest['status'] }))}
                options={STATUS_OPTIONS}
                required
              />
            )}
          </div>
        </div>

        {/* Section: Dates */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Période
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date de début *"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
              icon={Calendar}
            />
            <Input
              label="Date de fin *"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              required
              icon={Calendar}
              min={formData.startDate}
            />
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/30">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                Durée: {formData.days} jour{formData.days > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Section: Raison */}
        <div className="space-y-4">
          <Textarea
            label="Raison / Commentaire"
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Décrivez la raison de votre demande de congé..."
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
            {leaveRequest ? 'Enregistrer' : 'Créer la demande'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

