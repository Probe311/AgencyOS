
import React, { useState } from 'react';
import { 
  X, Briefcase, Megaphone, Share2, Users, Calendar, 
  ArrowRight, ArrowLeft, CheckCircle2, Layout, Smartphone, PenTool, Layers
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { useApp } from './contexts/AppContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

interface GlobalCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProjectType = 'web' | 'ads' | 'social' | 'influence' | 'event' | 'content' | 'mixed';

export const GlobalCreateModal: React.FC<GlobalCreateModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useApp();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    deadline: '',
    budget: '',
    description: ''
  });

  const projectTypes = [
    { id: 'web', label: 'R&D & Tech', icon: Layout, desc: 'Armure, Gadget, Site', color: 'bg-blue-500' },
    { id: 'ads', label: 'Acquisition', icon: Megaphone, desc: 'Campagne Pub, SEO', color: 'bg-rose-500' },
    { id: 'content', label: 'Contenu', icon: PenTool, desc: 'Articles, Vidéos, Graphisme', color: 'bg-emerald-500' }, // New
    { id: 'social', label: 'Social Media', icon: Share2, desc: 'Gestion Réseaux, Posts', color: 'bg-pink-500' },
    { id: 'mixed', label: 'Projet Mixte', icon: Layers, desc: 'Multi-départements', color: 'bg-slate-800' }, // New
    { id: 'influence', label: 'Influence', icon: Users, desc: 'Partenariat, Cadeaux', color: 'bg-purple-500' },
    { id: 'event', label: 'Événement', icon: Calendar, desc: 'Lancement, Fête, Meetup', color: 'bg-amber-500' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel = projectTypes.find(t => t.id === selectedType)?.label;
    showToast(`Projet "${formData.name}" créé dans ${typeLabel}`, 'success');
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    setFormData({ name: '', client: '', deadline: '', budget: '', description: '' });
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${!isOpen && 'hidden'}`}>
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-all duration-500" onClick={handleClose}></div>
      
      <div className="modal-content bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Nouveau projet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Étape {step} sur 2 : {step === 1 ? 'Sélectionner la catégorie' : 'Détails du projet'}</p>
          </div>
          <Button onClick={handleClose} variant="ghost" className="p-2 h-auto text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full" icon={X} />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          {step === 1 ? (
            <div className="p-8">
              <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-6 text-center">Quel type de projet souhaitez-vous créer ?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <div 
                      key={type.id}
                      onClick={() => setSelectedType(type.id as ProjectType)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-500 flex flex-col items-center text-center gap-3 group ${
                        isSelected 
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20 ring-4 ring-indigo-50 dark:ring-indigo-900/30' 
                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-all duration-500 group-hover:scale-110 ${type.color}`}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 dark:text-white">{type.label}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{type.desc}</p>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-700 rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                     label="Nom du projet" 
                     value={formData.name} 
                     onChange={e => setFormData({...formData, name: e.target.value})} 
                     required
                     placeholder="ex: Campagne été 2024"
                  />
                  <Input 
                     label="Client" 
                     value={formData.client} 
                     onChange={e => setFormData({...formData, client: e.target.value})} 
                     placeholder="ex: Stark Industries"
                  />
                  <Input 
                     label="Date de fin" 
                     type="date"
                     value={formData.deadline} 
                     onChange={e => setFormData({...formData, deadline: e.target.value})} 
                  />
                  <Input 
                     label="Budget estimé" 
                     type="number"
                     value={formData.budget} 
                     onChange={e => setFormData({...formData, budget: e.target.value})} 
                     placeholder="ex: 50000"
                  />
               </div>
               <Textarea 
                  label="Description / Brief" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Décrivez les objectifs et livrables"
               />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          {step === 2 ? (
            <Button variant="ghost" onClick={() => setStep(1)} icon={ArrowLeft}>
               Retour
            </Button>
          ) : (
            <div></div> // Spacer
          )}
          
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!selectedType} icon={ArrowRight}>
               Suivant
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
               Créer le projet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
