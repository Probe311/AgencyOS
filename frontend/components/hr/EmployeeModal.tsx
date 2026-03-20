import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { FileInput } from '../ui/FileInput';
import { Employee } from '../../types';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { generateUniqueId } from '../../lib/utils';
import { UserPlus, Mail, Phone, Calendar, Briefcase, MapPin, DollarSign } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSave?: () => void;
}

const DEPARTMENT_OPTIONS = [
  { value: 'R&D & Tech', label: 'R&D & Tech' },
  { value: 'Design & Costumes', label: 'Design & Costumes' },
  { value: 'Marketing & RP', label: 'Marketing & RP' },
  { value: 'Missions & Ops', label: 'Missions & Ops' },
  { value: 'Événements', label: 'Événements' },
  { value: 'Stratégie', label: 'Stratégie' },
  { value: 'Renseignement', label: 'Renseignement' },
];

const STATUS_OPTIONS = [
  { value: 'Actif', label: 'Actif' },
  { value: 'En mission', label: 'En mission' },
  { value: 'Télétravail', label: 'Télétravail' },
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, employee, onSave }) => {
  const { showToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: 'R&D & Tech' as Employee['department'],
    status: 'Actif' as Employee['status'],
    joinDate: new Date().toISOString().split('T')[0],
    salary: '',
    ptoBalance: 25,
    avatar: `https://i.pravatar.cc/150?u=${generateUniqueId()}`,
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || 'R&D & Tech',
        status: employee.status || 'Actif',
        joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        salary: '',
        ptoBalance: employee.ptoBalance || 25,
        avatar: employee.avatar || `https://i.pravatar.cc/150?u=${generateUniqueId()}`,
        address: '',
        notes: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        department: 'R&D & Tech',
        status: 'Actif',
        joinDate: new Date().toISOString().split('T')[0],
        salary: '',
        ptoBalance: 25,
        avatar: `https://i.pravatar.cc/150?u=${generateUniqueId()}`,
        address: '',
        notes: '',
      });
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, create or update the user
      let userId;
      if (employee?.id) {
        // Update existing employee
        const { data: userData, error: userError } = await supabase
          .from('users')
          .update({
            name: formData.name,
            email: formData.email,
            avatar_url: formData.avatar,
          })
          .eq('id', employee.id)
          .select()
          .single();

        if (userError) throw userError;
        userId = userData.id;
      } else {
        // Create new user
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([{
            name: formData.name,
            email: formData.email,
            avatar_url: formData.avatar,
          }])
          .select()
          .single();

        if (userError) throw userError;
        userId = userData.id;
      }

      // Then, create or update the employee record
      const employeeData = {
        user_id: userId,
        position: formData.position,
        department: formData.department,
        hire_date: formData.joinDate,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        status: formData.status,
      };

      if (employee?.id) {
        const { error: empError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('user_id', userId);

        if (empError) throw empError;
        showToast('Employé mis à jour', 'success');
      } else {
        const { error: empError } = await supabase
          .from('employees')
          .insert([employeeData]);

        if (empError) throw empError;
        showToast('Employé créé', 'success');
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
      title={employee ? 'Modifier l\'employé' : 'Nouvel employé'}
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
              label="Nom complet *"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              icon={UserPlus}
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              icon={Mail}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              icon={Phone}
            />
            <Input
              label="Adresse"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              icon={MapPin}
            />
          </div>
          <Input
            label="Photo de profil (URL)"
            value={formData.avatar}
            onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
            placeholder="https://..."
          />
        </div>

        {/* Section: Informations professionnelles */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Informations professionnelles
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poste *"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              required
              icon={Briefcase}
              placeholder="ex: Développeur Frontend"
            />
            <Dropdown
              label="Département *"
              value={formData.department}
              onChange={(value) => setFormData(prev => ({ ...prev, department: value as Employee['department'] }))}
              options={DEPARTMENT_OPTIONS}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date d'entrée *"
              type="date"
              value={formData.joinDate}
              onChange={(e) => setFormData(prev => ({ ...prev, joinDate: e.target.value }))}
              required
              icon={Calendar}
            />
            <Dropdown
              label="Statut *"
              value={formData.status}
              onChange={(value) => setFormData(prev => ({ ...prev, status: value as Employee['status'] }))}
              options={STATUS_OPTIONS}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Salaire (€)"
              type="number"
              step="0.01"
              value={formData.salary}
              onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
              icon={DollarSign}
              placeholder="35000"
            />
            <Input
              label="Solde de congés (jours)"
              type="number"
              value={formData.ptoBalance}
              onChange={(e) => setFormData(prev => ({ ...prev, ptoBalance: parseInt(e.target.value) || 0 }))}
              placeholder="25"
            />
          </div>
        </div>

        {/* Section: Notes */}
        <div className="space-y-4">
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes internes, informations complémentaires..."
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
            {employee ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

