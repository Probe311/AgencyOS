
import React, { useState } from 'react';
import { 
  Users, UserPlus, Mail, Phone, Calendar, Briefcase, 
  Search, Filter, MoreHorizontal, Clock, Star, MapPin, X,
  ChevronDown, ArrowUpDown, CheckSquare, Settings, Palmtree, Edit2, Trash2, Eye
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { SearchBar } from '../ui/SearchBar';
import { Checkbox } from '../ui/Checkbox';
import { useApp } from '../contexts/AppContext';
import { PageLayout } from '../ui/PageLayout';
import { EmployeeModal } from '../hr/EmployeeModal';
import { CandidateModal } from '../hr/CandidateModal';
import { LeaveModal } from '../hr/LeaveModal';
import { Employee, Candidate } from '../../types';
import { supabase } from '../../lib/supabase';

export const HrView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'directory' | 'recruitment' | 'timeoff'>('directory');
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    window.location.reload(); // Simple reload for now
  };

  return (
    <PageLayout
      header={{
        icon: Users,
        iconBgColor: "bg-cyan-100 dark:bg-cyan-900/20",
        iconColor: "text-cyan-600 dark:text-cyan-400",
        title: "Ressources Humaines",
        description: "Gérez votre équipe, recrutements et congés.",
        rightActions: [
          {
            label: activeTab === 'recruitment' ? 'Nouveau Recrutement' : activeTab === 'timeoff' ? 'Demander Congé' : 'Nouvel Employé',
            icon: activeTab === 'recruitment' ? Briefcase : activeTab === 'timeoff' ? Palmtree : UserPlus,
            onClick: () => {
              if (activeTab === 'recruitment') {
                setSelectedCandidate(null);
                setIsCandidateModalOpen(true);
              } else if (activeTab === 'timeoff') {
                setIsLeaveModalOpen(true);
              } else {
                setSelectedEmployee(null);
                setIsEmployeeModalOpen(true);
              }
            },
            variant: 'primary'
          }
        ]
      }}
      contentClassName="h-full flex flex-col min-h-0"
    >
      <div className="flex flex-col h-full min-h-0 gap-6">
        {/* Tabs */}
        <div className="flex gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex shadow-sm">
             <button 
               onClick={() => setActiveTab('directory')}
               className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'directory' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
             >
               Annuaire
             </button>
             <button 
               onClick={() => setActiveTab('recruitment')}
               className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'recruitment' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
             >
               Recrutement
             </button>
             <button 
               onClick={() => setActiveTab('timeoff')}
               className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-500 ${activeTab === 'timeoff' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
             >
               Congés
             </button>
          </div>
        </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'directory' && (
          <EmployeeDirectory 
            onEdit={(emp) => {
              setSelectedEmployee(emp);
              setIsEmployeeModalOpen(true);
            }}
            onAdd={() => {
              setSelectedEmployee(null);
              setIsEmployeeModalOpen(true);
            }}
          />
        )}
        {activeTab === 'recruitment' && (
          <RecruitmentTable 
            onAddClick={() => {
              setSelectedCandidate(null);
              setIsCandidateModalOpen(true);
            }}
            onEdit={(cand) => {
              setSelectedCandidate(cand);
              setIsCandidateModalOpen(true);
            }}
          />
        )}
        {activeTab === 'timeoff' && (
          <TimeOffView 
            onRequestLeave={() => setIsLeaveModalOpen(true)}
          />
        )}
      </div>
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onSave={handleRefresh}
      />

      {/* Candidate Modal */}
      <CandidateModal
        isOpen={isCandidateModalOpen}
        onClose={() => {
          setIsCandidateModalOpen(false);
          setSelectedCandidate(null);
        }}
        candidate={selectedCandidate}
        onSave={handleRefresh}
      />

      {/* Leave Modal */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSave={handleRefresh}
      />
    </PageLayout>
  );
};

interface EmployeeDirectoryProps {
  onEdit: (employee: Employee) => void;
  onAdd: () => void;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ onEdit, onAdd }) => {
  const { employees, showToast } = useApp();

  const handleDelete = async (employee: Employee) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${employee.name} ?`)) return;
    try {
      // Delete employee record first, then user if needed
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);
      
      if (error) throw error;
      showToast('Employé supprimé', 'success');
      window.location.reload();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  return (
  <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-6">
       {employees.map((employee) => (
         <div key={employee.id} className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-500 group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(employee); }}
                className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                aria-label="Modifier"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
                className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="relative mb-4">
              <img src={employee.avatar} alt={employee.name} className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-md bg-indigo-50 dark:bg-indigo-900/20" />
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                 employee.status === 'Actif' ? 'bg-emerald-500' : employee.status === 'En mission' ? 'bg-blue-500' : 'bg-amber-500'
              }`}></div>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">{employee.name}</h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">{employee.position}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">{employee.department}</p>
            
            <div className="w-full border-t border-slate-50 dark:border-slate-700 pt-4 mt-auto flex justify-center gap-4">
               <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full" aria-label="Envoyer email">
                  <Mail size={18} />
               </button>
               <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full" aria-label="Appeler">
                  <Phone size={18} />
               </button>
               <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-500 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full" aria-label="Calendrier">
                  <Calendar size={18} />
               </button>
            </div>
         </div>
       ))}
       
       {/* Add New Placeholder */}
       <div 
         onClick={onAdd}
         className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[30px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-all duration-500 cursor-pointer h-full min-h-[280px] group">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-sm transition-all duration-500">
             <UserPlus size={24} className="text-slate-300 dark:text-slate-500 group-hover:text-indigo-500" />
          </div>
          <span className="font-medium text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-500">Ajouter Nouveau Membre</span>
       </div>
    </div>
  </div>
  );
};

interface RecruitmentTableProps {
  onAddClick: () => void;
  onEdit: (candidate: Candidate) => void;
}

const STAGE_OPTIONS = [
  { value: 'Candidature', label: 'Candidature' },
  { value: 'Screening', label: 'Screening' },
  { value: 'Entretien', label: 'Entretien' },
  { value: 'Offre', label: 'Offre' },
  { value: 'Embauché', label: 'Embauché' },
  { value: 'Rejeté', label: 'Rejeté' },
];

const RecruitmentTable: React.FC<RecruitmentTableProps> = ({ onAddClick, onEdit }) => {
  const { candidates, showToast } = useApp();

  const handleDelete = async (candidate: Candidate) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${candidate.name} ?`)) return;
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidate.id);
      
      if (error) throw error;
      showToast('Candidat supprimé', 'success');
      window.location.reload();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleStageChange = async (candidate: Candidate, newStage: Candidate['stage']) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ stage: newStage })
        .eq('id', candidate.id);
      
      if (error) throw error;
      showToast('Statut mis à jour', 'success');
      window.location.reload();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };
  const getStageVariant = (stage: string) => {
    switch (stage) {
      case 'Embauché': return 'success';
      case 'Offre': return 'success';
      case 'Entretien': return 'info';
      case 'Rejeté': return 'danger';
      case 'Screening': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
       {/* Toolbar */}
       <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4 items-center">
             <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                Candidats <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">{candidates.length}</span>
             </h3>
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
             <div className="flex gap-2 hidden lg:flex">
                <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-500/30">
                   Active ({candidates.filter(c => c.stage === 'Entretien' || c.stage === 'Screening').length})
                </button>
                <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-500">
                   Awaiting ({candidates.filter(c => c.stage === 'Candidature').length})
                </button>
                <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-500">
                   Reviewed ({candidates.filter(c => c.stage === 'Offre' || c.stage === 'Embauché').length})
                </button>
             </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <SearchBar placeholder="Rechercher candidat, poste..." containerClassName="flex-1 md:w-64" />
             <Button onClick={onAddClick} icon={UserPlus} className="shrink-0">Ajouter</Button>
          </div>
       </div>

       {/* Table Header Controls (Sort, Bulk Actions) */}
       <div className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 px-6 py-3 flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 cursor-pointer hover:text-slate-800 dark:hover:text-white">
             <ArrowUpDown size={14} /> Trier par Date
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-slate-800 dark:hover:text-white">
             <Filter size={14} /> Tous les status
          </div>
          <div className="ml-auto flex items-center gap-2">
             <Settings size={14} className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer" />
          </div>
       </div>

       {/* Table */}
       <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
                <tr>
                   <th className="px-6 py-4 w-12 bg-white dark:bg-slate-800"><Checkbox containerClassName="justify-center" /></th>
                   <th className="px-6 py-4 bg-white dark:bg-slate-800">Candidat</th>
                   <th className="px-6 py-4 bg-white dark:bg-slate-800">Poste (Job)</th>
                   <th className="px-6 py-4 bg-white dark:bg-slate-800">Étape</th>
                   <th className="px-6 py-4 bg-white dark:bg-slate-800">Score</th>
                   <th className="px-6 py-4 bg-white dark:bg-slate-800">Date</th>
                   <th className="px-6 py-4 text-right bg-white dark:bg-slate-800">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {candidates.map(candidate => (
                   <tr key={candidate.id} className="hover:bg-indigo-50/20 dark:hover:bg-slate-700/30 transition-all duration-500 group">
                      <td className="px-6 py-4"><Checkbox containerClassName="justify-center" /></td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <img src={candidate.avatar} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt={candidate.name} />
                            <div>
                               <div className="font-bold text-slate-900 dark:text-white">{candidate.name}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="font-medium text-slate-700 dark:text-slate-300">{candidate.role}</div>
                         <div className="text-[10px] text-slate-400">ID: #REQ-2024-{candidate.id}</div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge variant={getStageVariant(candidate.stage)} className="rounded-lg shadow-sm">
                            {candidate.stage}
                         </Badge>
                      </td>
                      <td className="px-6 py-4">
                         {candidate.score > 0 ? (
                            <div className="w-24">
                               <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{candidate.score}%</span>
                               </div>
                               <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${candidate.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${candidate.score}%`}}></div>
                               </div>
                            </div>
                         ) : <span className="text-xs text-slate-400 italic">En attente</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                         {new Date(candidate.appliedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500">
                            <div className="relative group">
                              <button className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-white transition-all duration-500 flex items-center gap-1 shadow-sm">
                                Status <ChevronDown size={14} />
                              </button>
                              <div className="absolute right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[150px]">
                                {STAGE_OPTIONS.map(stage => (
                                  <button
                                    key={stage.value}
                                    onClick={() => handleStageChange(candidate, stage.value as Candidate['stage'])}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                                  >
                                    {stage.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button 
                              onClick={() => onEdit(candidate)}
                              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-white transition-all duration-500 flex items-center justify-center shadow-sm"
                              title="Modifier"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(candidate)}
                              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-500 flex items-center justify-center shadow-sm"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                      </td>
                   </tr>
                ))}
                {candidates.length === 0 && (
                   <tr><td colSpan={7} className="text-center py-8 text-slate-400">Aucun candidat.</td></tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

interface TimeOffViewProps {
  onRequestLeave: () => void;
}

const TimeOffView: React.FC<TimeOffViewProps> = ({ onRequestLeave }) => {
   const { employees } = useApp();
   return (
   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto pb-6">
      {/* Balances Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[30px] p-8 text-white shadow-xl">
         <h3 className="font-bold text-xl mb-1">Mes Congés</h3>
         <p className="text-indigo-100 text-sm mb-8 opacity-80">Solde disponible pour l'année 2024</p>
         
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md border border-white/10">
               <span className="text-4xl font-extrabold block mb-2">-</span>
               <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Jours RTT</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md border border-white/10">
               <span className="text-4xl font-extrabold block mb-2">-</span>
               <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Maladie</span>
            </div>
         </div>
         
         <button 
           onClick={onRequestLeave}
           className="w-full mt-8 py-3.5 bg-white text-indigo-700 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-50 transition-all duration-500"
         >
            Faire une demande
         </button>
      </div>

      {/* Upcoming Leaves */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
         <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Absences à venir</h3>
            <div className="flex gap-2">
               <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg" aria-label="Calendrier"><Calendar size={20} /></button>
            </div>
         </div>
         <div className="divide-y divide-slate-100 dark:divide-slate-700 flex-1 overflow-y-auto">
            {employees.length === 0 && (
               <div className="p-8 text-center text-sm text-slate-400 italic bg-slate-50/30 dark:bg-slate-800 mt-auto">
                  Pas d'absences planifiées.
               </div>
            )}
            {employees.length > 0 && (
               <div className="p-8 text-center text-sm text-slate-400 italic bg-slate-50/30 dark:bg-slate-800 mt-auto">
                  Les absences seront affichées ici une fois les données de congés configurées.
               </div>
            )}
         </div>
      </div>
   </div>
   );
};

