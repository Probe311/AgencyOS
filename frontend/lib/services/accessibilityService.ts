/**
 * Service d'accessibilité pour WCAG 2.1
 */

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export class AccessibilityService {
  private static preferences: AccessibilityPreferences = {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'normal',
    screenReader: false,
    keyboardNavigation: true,
  };

  /**
   * Initialise le service d'accessibilité
   */
  static initialize(): void {
    // Charger les préférences depuis localStorage
    this.loadPreferences();

    // Appliquer les préférences
    this.applyPreferences();

    // Détecter les préférences système
    this.detectSystemPreferences();

    // Écouter les changements de préférences système
    if (window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion.addEventListener('change', () => {
        this.preferences.reducedMotion = prefersReducedMotion.matches;
        this.applyPreferences();
      });

      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      prefersHighContrast.addEventListener('change', () => {
        this.preferences.highContrast = prefersHighContrast.matches;
        this.applyPreferences();
      });
    }
  }

  /**
   * Charge les préférences depuis localStorage
   */
  private static loadPreferences(): void {
    try {
      const stored = localStorage.getItem('accessibility-preferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading accessibility preferences:', error);
    }
  }

  /**
   * Sauvegarde les préférences dans localStorage
   */
  private static savePreferences(): void {
    try {
      localStorage.setItem('accessibility-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving accessibility preferences:', error);
    }
  }

  /**
   * Détecte les préférences système
   */
  private static detectSystemPreferences(): void {
    if (window.matchMedia) {
      // Détecter reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (prefersReducedMotion.matches) {
        this.preferences.reducedMotion = true;
      }

      // Détecter high contrast
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      if (prefersHighContrast.matches) {
        this.preferences.highContrast = true;
      }
    }

    // Détecter screen reader (approximation)
    if (navigator.userAgent.includes('NVDA') || 
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver')) {
      this.preferences.screenReader = true;
    }
  }

  /**
   * Applique les préférences au document
   */
  private static applyPreferences(): void {
    const root = document.documentElement;

    // Contraste élevé
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Mouvement réduit
    if (this.preferences.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Taille de police
    root.classList.remove('font-normal', 'font-large', 'font-extra-large');
    root.classList.add(`font-${this.preferences.fontSize}`);

    // Navigation clavier
    if (this.preferences.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }

  /**
   * Met à jour les préférences
   */
  static updatePreferences(updates: Partial<AccessibilityPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    this.applyPreferences();
  }

  /**
   * Récupère les préférences actuelles
   */
  static getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  /**
   * Vérifie si le contraste est élevé
   */
  static isHighContrast(): boolean {
    return this.preferences.highContrast;
  }

  /**
   * Vérifie si le mouvement est réduit
   */
  static isReducedMotion(): boolean {
    return this.preferences.reducedMotion;
  }

  /**
   * Vérifie si un lecteur d'écran est détecté
   */
  static isScreenReaderActive(): boolean {
    return this.preferences.screenReader;
  }

  /**
   * Vérifie si la navigation clavier est activée
   */
  static isKeyboardNavigation(): boolean {
    return this.preferences.keyboardNavigation;
  }

  /**
   * Annonce une information aux lecteurs d'écran
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Retirer après l'annonce
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Vérifie le contraste entre deux couleurs (ratio WCAG)
   */
  static checkContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      const rgb = this.hexToRgb(color);
      if (!rgb) return 0;

      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Convertit une couleur hex en RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Vérifie si un ratio de contraste est conforme WCAG
   */
  static isContrastCompliant(ratio: number, level: 'AA' | 'AAA' = 'AA'): boolean {
    if (level === 'AA') {
      return ratio >= 4.5; // Texte normal
    } else {
      return ratio >= 7; // Texte normal AAA
    }
  }

  /**
   * Crée un ID unique pour les labels ARIA
   */
  static generateAriaId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

