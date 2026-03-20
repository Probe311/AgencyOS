# Design System AgencyOS

## 🎨 Vue d'ensemble

Le design system d'AgencyOS est construit autour d'une palette de couleurs bleues inspirée du logo principal, créant une identité visuelle cohérente et moderne.

## 🎯 Principes de design

### Cohérence
- Utilisation systématique des couleurs de la palette principale
- Standards de spacing et de typographie uniformes
- Composants réutilisables et modulaires

### Accessibilité
- Contraste suffisant pour la lisibilité (WCAG AA minimum)
- Support du mode sombre (dark mode)
- Tailles de texte et espacements adaptés

### Modernité
- Interface épurée et minimaliste
- Animations subtiles et fluides
- Design glassmorphism pour certains éléments

## 🎨 Palette de couleurs

### Couleurs principales (basées sur le logo)

#### Bleu primaire (Primary Blue)
Le bleu principal du logo `#4f46e5` (indigo-600) est la couleur d'accent principale.

```css
--blue-50:  #eef2ff
--blue-100: #e0e7ff
--blue-200: #c7d2fe
--blue-300: #a5b4fc
--blue-400: #818cf8
--blue-500: #6366f1
--blue-600: #4f46e5  /* Couleur principale du logo */
--blue-700: #4338ca
--blue-800: #3730a3
--blue-900: #312e81
--blue-950: #1e1b4b
```

#### Violet secondaire (Secondary Purple)
Le violet du logo `#9333ea` (violet-600) est utilisé pour les accents et les dégradés.

```css
--violet-50:  #f5f3ff
--violet-100: #ede9fe
--violet-200: #ddd6fe
--violet-300: #c4b5fd
--violet-400: #a78bfa
--violet-500: #8b5cf6
--violet-600: #9333ea  /* Couleur secondaire du logo */
--violet-700: #7c3aed
--violet-800: #6d28d9
--violet-900: #5b21b6
--violet-950: #4c1d95
```

### Couleurs sémantiques

#### Succès (Success)
```css
--emerald-50:  #ecfdf5
--emerald-100: #d1fae5
--emerald-500: #10b981
--emerald-600: #059669
--emerald-700: #047857
```

#### Avertissement (Warning)
```css
--amber-50:  #fffbeb
--amber-100: #fef3c7
--amber-500: #f59e0b
--amber-600: #d97706
--amber-700: #b45309
```

#### Erreur (Error)
```css
--rose-50:  #fff1f2
--rose-100: #ffe4e6
--rose-500: #f43f5e
--rose-600: #e11d48
--rose-700: #be123c
```

#### Information (Info)
```css
--sky-50:  #f0f9ff
--sky-100: #e0f2fe
--sky-500: #0ea5e9
--sky-600: #0284c7
--sky-700: #0369a1
```

### Couleurs neutres

#### Gris (Grays)
```css
--slate-50:  #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-300: #cbd5e1
--slate-400: #94a3b8
--slate-500: #64748b
--slate-600: #475569
--slate-700: #334155
--slate-800: #1e293b
--slate-900: #0f172a
--slate-950: #020617
```

### Dégradés

#### Dégradé principal (Logo Gradient)
```css
background: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
```

#### Dégradés secondaires
```css
/* Bleu doux */
background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);

/* Bleu-violet */
background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
```

## 📐 Typographie

### Famille de polices
- **Principale**: `Inter` (sans-serif)
- **Fallback**: `system-ui, -apple-system, sans-serif`

### Hiérarchie typographique

#### Titres
```css
/* H1 - Titre principal */
font-size: 2.25rem; /* 36px */
font-weight: 800;
line-height: 1.2;
letter-spacing: -0.02em;

/* H2 - Titre de section */
font-size: 1.875rem; /* 30px */
font-weight: 700;
line-height: 1.3;
letter-spacing: -0.01em;

/* H3 - Sous-titre */
font-size: 1.5rem; /* 24px */
font-weight: 700;
line-height: 1.4;

/* H4 - Titre de carte */
font-size: 1.25rem; /* 20px */
font-weight: 600;
line-height: 1.5;
```

#### Corps de texte
```css
/* Body Large */
font-size: 1.125rem; /* 18px */
font-weight: 400;
line-height: 1.6;

/* Body */
font-size: 1rem; /* 16px */
font-weight: 400;
line-height: 1.5;

/* Body Small */
font-size: 0.875rem; /* 14px */
font-weight: 400;
line-height: 1.5;

/* Caption */
font-size: 0.75rem; /* 12px */
font-weight: 500;
line-height: 1.4;
letter-spacing: 0.05em;
text-transform: uppercase;
```

## 📏 Espacements (Spacing)

Système d'espacement basé sur une échelle de 4px :

```css
--spacing-0:  0px
--spacing-1:  4px
--spacing-2:  8px
--spacing-3:  12px
--spacing-4:  16px
--spacing-5:  20px
--spacing-6:  24px
--spacing-8:  32px
--spacing-10: 40px
--spacing-12: 48px
--spacing-16: 64px
--spacing-20: 80px
--spacing-24: 96px
```

## 🔲 Bordures et rayons

### Rayons de bordure (Border Radius)
```css
--radius-sm:   4px
--radius-md:   8px
--radius-lg:   12px
--radius-xl:   16px
--radius-2xl:  20px
--radius-3xl:  30px
--radius-full: 9999px
```

### Épaisseurs de bordure
```css
--border-thin:  1px
--border-base:  2px
--border-thick: 4px
```

## 🎭 Ombres (Shadows)

### Ombres légères
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

### Ombres colorées (pour les éléments bleus)
```css
--shadow-blue-sm:  0 1px 2px 0 rgb(79 70 229 / 0.1);
--shadow-blue-md:  0 4px 6px -1px rgb(79 70 229 / 0.2), 0 2px 4px -2px rgb(79 70 229 / 0.1);
--shadow-blue-lg:  0 10px 15px -3px rgb(79 70 229 / 0.3), 0 4px 6px -4px rgb(79 70 229 / 0.2);
```

## 🧩 Composants

### Boutons (Buttons)

#### Variantes
1. **Primary** (Principal)
   - Fond: `blue-600` (#4f46e5)
   - Texte: blanc
   - Hover: `blue-700`
   - Ombre: `shadow-blue-lg`

2. **Secondary** (Secondaire)
   - Fond: `slate-900` (mode clair) / `slate-800` (mode sombre)
   - Texte: blanc
   - Hover: `slate-800` / `slate-700`

3. **Outline** (Contour)
   - Fond: transparent
   - Bordure: `slate-200` / `slate-700`
   - Texte: `slate-700` / `slate-200`
   - Hover: `slate-50` / `slate-800`

4. **Ghost** (Fantôme)
   - Fond: transparent
   - Texte: `slate-500` / `slate-400`
   - Hover: `blue-50` / `blue-900/40`
   - Texte hover: `blue-600` / `blue-400`

5. **Danger** (Danger)
   - Fond: `rose-50` / `rose-900/30`
   - Texte: `rose-600` / `rose-400`
   - Bordure: `rose-200` / `rose-800`

#### Tailles
- **Small**: `px-3 py-1.5 text-xs`
- **Medium**: `px-4 py-2.5 text-sm`
- **Large**: `px-6 py-3 text-base`

### Cartes (Cards)

#### Variantes
1. **Default**
   - Fond: `white` / `slate-800`
   - Bordure: `slate-100` / `slate-700`
   - Ombre: `shadow-sm`

2. **Elevated**
   - Fond: `white/70` / `slate-800/70` avec `backdrop-blur-xl`
   - Bordure: `white/40` / `slate-700/40`
   - Ombre: `shadow-xl`

3. **Outlined**
   - Fond: transparent
   - Bordure: `slate-200` / `slate-700` (2px)

4. **Interactive**
   - Même style que Default
   - Hover: `shadow-md` et `-translate-y-1`
   - Cursor: pointer

#### Rayon de bordure
- Par défaut: `rounded-3xl` (30px)

### Badges

#### Variantes
1. **Success**: `emerald-50` / `emerald-500/20` avec texte `emerald-600` / `emerald-400`
2. **Warning**: `amber-50` / `amber-500/20` avec texte `amber-600` / `amber-400`
3. **Error**: `rose-50` / `rose-500/20` avec texte `rose-600` / `rose-400`
4. **Info**: `sky-50` / `sky-500/20` avec texte `sky-600` / `sky-400`
5. **Primary**: `blue-50` / `blue-500/20` avec texte `blue-600` / `blue-400`

### Inputs

#### Style de base
- Fond: `white` / `slate-800`
- Bordure: `slate-200` / `slate-700`
- Focus: bordure `blue-500` et ombre `shadow-blue-sm`
- Rayon: `rounded-xl`

### Sidebar

#### Style
- Fond: `white/90` / `slate-900/90` avec `backdrop-blur-3xl`
- Bordure: `slate-200` / `slate-700`
- Rayon: `rounded-[30px]`

#### Éléments actifs
- Fond: `blue-50` / `blue-900/40`
- Texte: `blue-600` / `blue-300`
- Indicateur: barre verticale `blue-600` à gauche

## 🌓 Mode sombre (Dark Mode)

### Principes
- Utilisation de la classe `dark:` de Tailwind
- Contraste maintenu pour l'accessibilité
- Couleurs adaptées pour réduire la fatigue visuelle

### Couleurs de fond
- **Principal**: `slate-950` (#020617)
- **Secondaire**: `slate-900` (#0f172a)
- **Cartes**: `slate-800` (#1e293b)

### Couleurs de texte
- **Principal**: `slate-100` (#f1f5f9)
- **Secondaire**: `slate-300` (#cbd5e1)
- **Tertiaire**: `slate-400` (#94a3b8)

## ✨ Animations

### Transitions
Toutes les transitions utilisent la norme standardisée suivante :

**Norme standard** : `transition-all duration-500`

Cette norme s'applique à tous les éléments interactifs de l'interface :
- Propriétés animées : toutes les propriétés CSS (`transition-all`)
- Durée : 500ms (`duration-500`)
- Fonction de timing : par défaut (ease)

```css
/* Utilisation Tailwind */
transition-all duration-500
```

### Animations personnalisées
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from { 
    transform: translateY(10px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

/* Scale */
@keyframes scale {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}
```

## 📱 Responsive Design

### Breakpoints
```css
--breakpoint-sm:  640px
--breakpoint-md:  768px
--breakpoint-lg:  1024px
--breakpoint-xl:  1280px
--breakpoint-2xl: 1536px
```

### Principes
- Mobile-first approach
- Sidebar collapsible sur mobile
- Grilles adaptatives
- Typographie responsive

## 🎯 Utilisation des couleurs

### Règles d'utilisation

1. **Bleu primaire** (`blue-600`)
   - Éléments actifs (navigation, boutons principaux)
   - Liens et actions principales
   - Indicateurs de focus

2. **Violet secondaire** (`violet-600`)
   - Accents et dégradés
   - Éléments décoratifs
   - Utilisé en combinaison avec le bleu

3. **Couleurs sémantiques**
   - Utilisées uniquement pour leur signification (succès, erreur, etc.)
   - Ne pas utiliser comme couleurs principales

4. **Neutres**
   - Pour les arrière-plans et les bordures
   - Pour les textes secondaires
   - Pour créer de la hiérarchie visuelle

## 🔧 Implémentation Tailwind

### Configuration recommandée

```javascript
// tailwind.config.cjs
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          // ... jusqu'à 950
          600: '#4f46e5', // Couleur principale
        },
        secondary: {
          600: '#9333ea', // Couleur secondaire
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '30px',
      },
      boxShadow: {
        'blue-sm': '0 1px 2px 0 rgb(79 70 229 / 0.1)',
        'blue-md': '0 4px 6px -1px rgb(79 70 229 / 0.2)',
        'blue-lg': '0 10px 15px -3px rgb(79 70 229 / 0.3)',
      },
    },
  },
}
```

## 📚 Ressources

### Icônes
- **Lucide React**: Bibliothèque d'icônes principale
- Taille standard: 18-20px pour les éléments de navigation
- Taille standard: 16px pour les boutons et actions

### Illustrations
- Style minimaliste et moderne
- Couleurs alignées avec la palette principale
- Support du mode sombre

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2024  
**Maintenu par**: Équipe AgencyOS

