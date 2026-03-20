/**
 * Composant helper pour afficher et insérer les variables de personnalisation
 * Aide les utilisateurs à utiliser les variables dynamiques dans les templates
 */

import React, { useState } from 'react';
import { HelpCircle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface Variable {
  name: string;
  description: string;
  example: string;
  category: 'contact' | 'entreprise' | 'contexte' | 'comportemental' | 'personnalisé';
}

const AVAILABLE_VARIABLES: Variable[] = [
  // Données contact
  { name: '{{nom}}', description: 'Nom complet du contact', example: 'Jean Dupont', category: 'contact' },
  { name: '{{prénom}}', description: 'Prénom du contact (extrait automatiquement)', example: 'Jean', category: 'contact' },
  { name: '{{nom_complet}}', description: 'Nom complet du contact', example: 'Jean Dupont', category: 'contact' },
  { name: '{{fonction}}', description: 'Fonction/poste du contact', example: 'Directeur Marketing', category: 'contact' },
  { name: '{{téléphone}}', description: 'Numéro de téléphone', example: '+33 6 12 34 56 78', category: 'contact' },
  { name: '{{email}}', description: 'Adresse email', example: 'jean.dupont@exemple.fr', category: 'contact' },
  
  // Données entreprise
  { name: '{{entreprise}}', description: 'Nom de l\'entreprise', example: 'Acme Corp', category: 'entreprise' },
  { name: '{{secteur}}', description: 'Secteur d\'activité', example: 'Technologie', category: 'entreprise' },
  { name: '{{taille_entreprise}}', description: 'Taille de l\'entreprise', example: 'PME (50-250 salariés)', category: 'entreprise' },
  { name: '{{localisation}}', description: 'Adresse complète', example: '123 Rue Example, 75001 Paris', category: 'entreprise' },
  { name: '{{ville}}', description: 'Ville', example: 'Paris', category: 'entreprise' },
  { name: '{{région}}', description: 'Région', example: 'Île-de-France', category: 'entreprise' },
  { name: '{{département}}', description: 'Département', example: '75', category: 'entreprise' },
  { name: '{{code_postal}}', description: 'Code postal', example: '75001', category: 'entreprise' },
  { name: '{{pays}}', description: 'Pays', example: 'France', category: 'entreprise' },
  
  // Données contexte
  { name: '{{scoring}}', description: 'Score du lead (0-100)', example: '75', category: 'contexte' },
  { name: '{{température}}', description: 'Température du lead (Chaud/Tiède/Froid)', example: '🔥 Chaud', category: 'contexte' },
  { name: '{{étape_pipeline}}', description: 'Étape dans le pipeline', example: 'Opportunité', category: 'contexte' },
  { name: '{{statut}}', description: 'Statut actuel', example: 'En cours', category: 'contexte' },
  { name: '{{valeur_potentielle}}', description: 'Valeur estimée du deal', example: '50000', category: 'contexte' },
  
  // Données comportementales
  { name: '{{dernière_interaction}}', description: 'Dernière interaction formatée', example: 'il y a 3 jours', category: 'comportemental' },
  { name: '{{dernière_interaction_date}}', description: 'Date de la dernière interaction', example: '15 décembre 2024', category: 'comportemental' },
  { name: '{{dernière_interaction_type}}', description: 'Type de la dernière interaction', example: 'Email envoyé', category: 'comportemental' },
  { name: '{{nombre_visites}}', description: 'Nombre de visites sur le site', example: '12', category: 'comportemental' },
  { name: '{{ressources_téléchargées}}', description: 'Ressources téléchargées', example: 'Guide PDF, Whitepaper', category: 'comportemental' },
  { name: '{{dernière_ressource_téléchargée}}', description: 'Dernière ressource téléchargée', example: 'Guide PDF', category: 'comportemental' },
  { name: '{{emails_ouverts}}', description: 'Nombre d\'emails ouverts', example: '8', category: 'comportemental' },
  { name: '{{emails_cliqués}}', description: 'Nombre d\'emails cliqués', example: '3', category: 'comportemental' },
  { name: '{{nombre_interactions_total}}', description: 'Nombre total d\'interactions', example: '25', category: 'comportemental' },
  { name: '{{score_engagement}}', description: 'Score d\'engagement (0-100)', example: '72', category: 'comportemental' },
  { name: '{{niveau_engagement}}', description: 'Niveau d\'engagement', example: 'Élevé', category: 'comportemental' },
  { name: '{{intérêts}}', description: 'Intérêts détectés (tags)', example: 'Marketing, IA', category: 'comportemental' },
  
  // Données personnalisées
  { name: '{{champ_custom_*}}', description: 'Champs personnalisés (remplacer * par le nom du champ)', example: '{{budget}}', category: 'personnalisé' },
];

const CATEGORY_LABELS: Record<Variable['category'], string> = {
  contact: 'Contact',
  entreprise: 'Entreprise',
  contexte: 'Contexte',
  comportemental: 'Comportemental',
  personnalisé: 'Personnalisé',
};

interface EmailVariableHelperProps {
  onInsertVariable?: (variable: string) => void;
  compact?: boolean;
}

export const EmailVariableHelper: React.FC<EmailVariableHelperProps> = ({
  onInsertVariable,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Variable['category'] | 'all'>('all');
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  const categories: Variable['category'][] = ['contact', 'entreprise', 'contexte', 'comportemental', 'personnalisé'];

  const filteredVariables = selectedCategory === 'all'
    ? AVAILABLE_VARIABLES
    : AVAILABLE_VARIABLES.filter(v => v.category === selectedCategory);

  const handleCopy = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);

    if (onInsertVariable) {
      onInsertVariable(variable);
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          icon={HelpCircle}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          Variables disponibles {isOpen ? <ChevronUp className="ml-2" size={16} /> : <ChevronDown className="ml-2" size={16} />}
        </Button>
        
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 max-h-[500px] overflow-y-auto">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Variables de personnalisation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cliquez sur une variable pour la copier et l'insérer dans votre template
              </p>
            </div>

            {/* Filtres par catégorie */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedCategory === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Toutes
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>

            {/* Liste des variables */}
            <div className="space-y-2">
              {filteredVariables.map((variable) => (
                <div
                  key={variable.name}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => handleCopy(variable.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                          {variable.name}
                        </code>
                        <Badge className="text-xs">
                          {CATEGORY_LABELS[variable.category]}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        {variable.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 italic">
                        Ex: {variable.example}
                      </p>
                    </div>
                    <div className="ml-4">
                      {copiedVariable === variable.name ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <Copy size={16} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle size={20} className="text-slate-400" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Variables de personnalisation</h4>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
        Utilisez ces variables dans vos templates pour personnaliser vos emails. Cliquez sur une variable pour la copier.
      </p>

      {/* Filtres par catégorie */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={selectedCategory === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          Toutes ({AVAILABLE_VARIABLES.length})
        </Button>
        {categories.map(cat => {
          const count = AVAILABLE_VARIABLES.filter(v => v.category === cat).length;
          return (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </Button>
          );
        })}
      </div>

      {/* Liste des variables */}
      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
        {filteredVariables.map((variable) => (
          <div
            key={variable.name}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={() => handleCopy(variable.name)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                    {variable.name}
                  </code>
                  <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {CATEGORY_LABELS[variable.category]}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {variable.description}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 italic">
                  Exemple: {variable.example}
                </p>
              </div>
              <div className="ml-4">
                {copiedVariable === variable.name ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} className="text-slate-400" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {copiedVariable && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-400">
          ✓ Variable <code className="font-mono font-bold">{copiedVariable}</code> copiée dans le presse-papier
        </div>
      )}
    </div>
  );
};

