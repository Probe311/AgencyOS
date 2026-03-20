/**
 * Generate a unique ID
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp + random
 */
export const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random number + counter to ensure uniqueness
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * AI Add-on subscription management
 */
const AI_ADDON_STORAGE_KEY = 'agencyos_ai_addon_active';

export const isAiAddonActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(AI_ADDON_STORAGE_KEY);
  return stored === 'true';
};

export const setAiAddonActive = (active: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_ADDON_STORAGE_KEY, active.toString());
  // Déclencher un événement personnalisé pour mettre à jour l'UI en temps réel
  window.dispatchEvent(new CustomEvent('ai-addon-changed'));
};

