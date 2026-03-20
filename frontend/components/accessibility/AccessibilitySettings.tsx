import React, { useState, useEffect } from 'react';
import { Settings, Eye, Type, MousePointer2, Volume2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AccessibilityService, AccessibilityPreferences } from '../../lib/services/accessibilityService';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    AccessibilityService.getPreferences()
  );

  useEffect(() => {
    if (isOpen) {
      setPreferences(AccessibilityService.getPreferences());
    }
  }, [isOpen]);

  const handleToggle = (key: keyof AccessibilityPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
    AccessibilityService.updatePreferences(newPreferences);
  };

  const handleFontSizeChange = (size: 'normal' | 'large' | 'extra-large') => {
    const newPreferences = {
      ...preferences,
      fontSize: size,
    };
    setPreferences(newPreferences);
    AccessibilityService.updatePreferences(newPreferences);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paramètres d'accessibilité"
      size="md"
      aria-labelledby="accessibility-settings-title"
      aria-describedby="accessibility-settings-description"
    >
      <div className="space-y-6" id="accessibility-settings-description">
        {/* Contraste élevé */}
        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Eye className="text-slate-600 dark:text-slate-400" size={20} />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Contraste élevé</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Améliore la lisibilité pour les utilisateurs malvoyants
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.highContrast}
            aria-label="Activer le contraste élevé"
            onClick={() => handleToggle('highContrast')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.highContrast ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Mouvement réduit */}
        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center gap-3">
            <MousePointer2 className="text-slate-600 dark:text-slate-400" size={20} />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Mouvement réduit</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Réduit les animations pour les utilisateurs sensibles au mouvement
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.reducedMotion}
            aria-label="Activer le mouvement réduit"
            onClick={() => handleToggle('reducedMotion')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.reducedMotion ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.reducedMotion ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Taille de police */}
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Type className="text-slate-600 dark:text-slate-400" size={20} />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Taille de police</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ajustez la taille du texte pour une meilleure lisibilité
              </p>
            </div>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Taille de police">
            {(['normal', 'large', 'extra-large'] as const).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={preferences.fontSize === size}
                onClick={() => handleFontSizeChange(size)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  preferences.fontSize === size
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {size === 'normal' ? 'Normal' : size === 'large' ? 'Grand' : 'Très grand'}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation clavier */}
        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Settings className="text-slate-600 dark:text-slate-400" size={20} />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Navigation clavier</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active les raccourcis clavier et la navigation au clavier
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.keyboardNavigation}
            aria-label="Activer la navigation clavier"
            onClick={() => handleToggle('keyboardNavigation')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.keyboardNavigation ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Informations lecteur d'écran */}
        {preferences.screenReader && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="text-blue-600 dark:text-blue-400" size={20} />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Lecteur d'écran détecté
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Les annonces vocales sont activées pour vous guider
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

