import { useEffect, useRef } from 'react';

/**
 * Hook pour gérer le focus et le retour au focus
 */
export function useFocusManagement() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Sauvegarde l'élément actuellement focusé
   */
  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  /**
   * Restaure le focus sur l'élément précédent
   */
  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  };

  /**
   * Focus le premier élément focusable dans un conteneur
   */
  const focusFirst = (container: HTMLElement | null) => {
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    if (firstElement) {
      firstElement.focus();
    }
  };

  /**
   * Focus le dernier élément focusable dans un conteneur
   */
  const focusLast = (container: HTMLElement | null) => {
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const lastElement = focusableElements[focusableElements.length - 1];
    if (lastElement) {
      lastElement.focus();
    }
  };

  return {
    saveFocus,
    restoreFocus,
    focusFirst,
    focusLast,
  };
}

