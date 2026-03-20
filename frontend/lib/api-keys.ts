// Utility functions for managing API keys from localStorage or environment variables
// Priority: localStorage > environment variables

/**
 * Get API key for a specific service
 * @param service - The service name (e.g., 'gemini', 'openai', 'anthropic')
 * @returns The API key or null if not found
 */
export const getApiKey = (service: string): string | null => {
  // Check localStorage first (client-side only)
  if (typeof window !== 'undefined') {
    const serviceLower = service.toLowerCase();
    let storedKey = localStorage.getItem(`agencyos_api_key_${serviceLower}`);
    
    // Migration: si on cherche 'groq' mais qu'une clé existe sous 'gork', la récupérer et la migrer
    if (!storedKey && serviceLower === 'groq') {
      const oldKey = localStorage.getItem('agencyos_api_key_gork');
      if (oldKey) {
        // Migrer la clé vers le nouveau nom
        localStorage.setItem(`agencyos_api_key_${serviceLower}`, oldKey);
        localStorage.removeItem('agencyos_api_key_gork');
        storedKey = oldKey;
      }
    }
    
    if (storedKey) {
      return storedKey;
    }
  }

  // Fallback to environment variable (works in both server and client)
  // Access via process.env (defined in vite.config.ts) or import.meta.env
  try {
    const envKey = (process as any).env?.[`VITE_${service.toUpperCase()}_API_KEY`] || 
                   (import.meta as any).env?.[`VITE_${service.toUpperCase()}_API_KEY`];
    return envKey || null;
  } catch {
    return null;
  }
};

/**
 * Save API key for a specific service to localStorage
 * @param service - The service name (e.g., 'gemini', 'openai', 'anthropic')
 * @param key - The API key to save
 */
export const saveApiKey = (service: string, key: string): void => {
  if (typeof window === 'undefined') {
    console.warn('Cannot save API key: window is undefined (server-side)');
    return;
  }

  if (key) {
    localStorage.setItem(`agencyos_api_key_${service.toLowerCase()}`, key);
  } else {
    localStorage.removeItem(`agencyos_api_key_${service.toLowerCase()}`);
  }
};

/**
 * Remove API key for a specific service from localStorage
 * @param service - The service name
 */
export const removeApiKey = (service: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(`agencyos_api_key_${service.toLowerCase()}`);
};

/**
 * Get all saved API keys from localStorage
 * @returns Object with service names as keys and API keys as values
 */
export const getAllApiKeys = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const keys: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('agencyos_api_key_')) {
      const service = key.replace('agencyos_api_key_', '');
      keys[service] = localStorage.getItem(key) || '';
    }
  }
  return keys;
};

/**
 * Check if an API key is configured for a specific service
 * @param service - The service name
 * @returns true if an API key exists
 */
export const isApiKeyConfigured = (service: string): boolean => {
  return getApiKey(service) !== null;
};

