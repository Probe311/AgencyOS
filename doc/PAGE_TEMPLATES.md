# Documentation des Templates de Page

Ce document décrit le système de templates de page utilisé dans AgencyOS. Ce système permet de créer des pages cohérentes avec une structure standardisée : **entête**, **sidebar optionnelle**, et **corps**.

## Architecture

Le système de templates est composé de trois composants principaux :

1. **PageLayout** : Conteneur principal qui orchestre l'entête, le corps et la sidebar
2. **PageHeader** : Entête flexible avec icône, titre, description et actions
3. **PageSidebar** : Sidebar optionnelle pour les éléments complémentaires

## Utilisation de base

### Structure minimale

```tsx
import { PageLayout } from '../ui/PageLayout';
import { Database } from 'lucide-react';

export const MaPage: React.FC = () => {
  return (
    <PageLayout
      header={{
        icon: Database,
        title: "Ma Page",
        description: "Description de la page"
      }}
    >
      {/* Contenu de la page */}
      <div>Mon contenu</div>
    </PageLayout>
  );
};
```

## PageHeader

Le composant `PageHeader` est l'entête flexible de toutes les pages. Il accepte les propriétés suivantes :

### Propriétés

```typescript
interface PageHeaderProps {
  icon?: LucideIcon;                    // Icône à afficher (optionnel)
  iconBgColor?: string;                 // Couleur de fond de l'icône (défaut: 'bg-indigo-100 dark:bg-indigo-900/20')
  iconColor?: string;                   // Couleur de l'icône (défaut: 'text-indigo-600 dark:text-indigo-400')
  title: string;                        // Titre de la page (requis)
  description?: string;                 // Description sous le titre (optionnel)
  leftActions?: PageHeaderAction[];     // Actions à gauche (optionnel)
  rightActions?: PageHeaderAction[];    // Actions à droite (optionnel)
  viewToggle?: ViewToggleConfig;        // Toggle de vues (optionnel)
  className?: string;                   // Classes CSS personnalisées
  titleClassName?: string;              // Classes CSS pour le titre
  descriptionClassName?: string;        // Classes CSS pour la description
}
```

### Actions

Les actions (leftActions et rightActions) sont des tableaux d'objets `PageHeaderAction` :

```typescript
interface PageHeaderAction {
  label?: string;                       // Libellé du bouton
  icon?: LucideIcon;                    // Icône du bouton
  onClick?: () => void;                 // Handler de clic
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  title?: string;                       // Tooltip
  disabled?: boolean;                   // État désactivé
  element?: React.ReactNode;            // Élément custom (pour cas complexes)
  className?: string;                   // Classes CSS personnalisées
}
```

### ViewToggle

Le `viewToggle` permet de créer un sélecteur de vues avec icônes :

```typescript
interface ViewToggleConfig {
  value: string;                        // Valeur actuellement sélectionnée
  options: ViewToggleOption[];          // Options disponibles
  onChange: (value: string) => void;    // Handler de changement
}

interface ViewToggleOption {
  value: string;                        // Valeur de l'option
  icon?: LucideIcon;                    // Icône de l'option
  title: string;                        // Tooltip
}
```

### Exemples d'utilisation

#### Exemple simple

```tsx
<PageLayout
  header={{
    icon: Database,
    title: "Base Contacts & Leads",
    description: "Gestion centralisée des opportunités et clients."
  }}
>
  {/* Contenu */}
</PageLayout>
```

#### Exemple avec actions

```tsx
<PageLayout
  header={{
    icon: Database,
    iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    title: "Base Contacts & Leads",
    description: "Gestion centralisée des opportunités et clients.",
    leftActions: [
      {
        label: "Détecter doublons",
        icon: AlertTriangle,
        onClick: () => handleDetectDuplicates(),
        variant: 'outline'
      },
      {
        icon: RefreshCcw,
        onClick: () => handleRefresh(),
        variant: 'outline'
      }
    ],
    rightActions: [
      {
        label: "Importer",
        icon: Upload,
        onClick: handleImport,
        variant: 'outline',
        title: "Importer des leads depuis un fichier JSON"
      },
      {
        label: "Ajouter",
        icon: Plus,
        onClick: handleCreate,
        variant: 'primary'
      }
    ]
  }}
>
  {/* Contenu */}
</PageLayout>
```

#### Exemple avec ViewToggle

```tsx
const [viewMode, setViewMode] = useState<'table' | 'pipeline' | 'map'>('table');

<PageLayout
  header={{
    icon: Database,
    title: "Base Contacts & Leads",
    description: "Gestion centralisée des opportunités et clients.",
    viewToggle: {
      value: viewMode,
      options: [
        { value: 'table', icon: List, title: 'Liste' },
        { value: 'pipeline', icon: LayoutGrid, title: 'Pipeline ventes' },
        { value: 'map', icon: Map, title: 'Carte' }
      ],
      onChange: setViewMode
    },
    rightActions: [
      {
        label: "Ajouter",
        icon: Plus,
        onClick: handleCreate,
        variant: 'primary'
      }
    ]
  }}
>
  {/* Contenu avec switch selon viewMode */}
</PageLayout>
```

#### Exemple complet (comme CrmView)

```tsx
<PageLayout
  header={{
    icon: Database,
    iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    title: "Base Contacts & Leads",
    description: "Gestion centralisée des opportunités et clients.",
    leftActions: [
      {
        label: "Détecter doublons",
        icon: AlertTriangle,
        onClick: () => setIsDuplicateDetectionOpen(true),
        variant: 'outline'
      },
      {
        icon: RefreshCcw,
        onClick: () => setIsConnectModalOpen(true),
        variant: 'outline'
      }
    ],
    viewToggle: {
      value: viewMode,
      options: [
        { value: 'table', icon: List, title: 'Liste' },
        { value: 'lifecycle', icon: BrainCircuit, title: 'Cycle de vie' },
        { value: 'pipeline', icon: LayoutGrid, title: 'Pipeline ventes' },
        { value: 'map', icon: Map, title: 'Carte' },
        { value: 'prospecting', icon: Bot, title: 'Prospection' }
      ],
      onChange: setViewMode
    },
    rightActions: [
      {
        label: "Importer",
        icon: Upload,
        onClick: handleImportJSON,
        variant: 'outline',
        title: "Importer des leads depuis un fichier JSON"
      },
      {
        label: "Ajouter",
        icon: Plus,
        onClick: handleOpenCreate,
        variant: 'primary'
      }
    ]
  }}
>
  {/* Contenu de la page */}
</PageLayout>
```

## PageSidebar

Le composant `PageSidebar` permet d'ajouter une sidebar optionnelle à droite du contenu principal.

### Propriétés

```typescript
interface PageSidebarProps {
  children: React.ReactNode;            // Contenu de la sidebar
  width?: string;                       // Largeur (défaut: 'w-72')
  className?: string;                   // Classes CSS personnalisées
  sticky?: boolean;                     // Si true, reste fixe lors du scroll
}
```

### Utilisation

```tsx
<PageLayout
  header={{ /* ... */ }}
  sidebar={
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <h3>Filtres</h3>
      {/* Contenu de la sidebar */}
    </div>
  }
  sidebarProps={{
    width: 'w-80',
    sticky: true,
    className: 'my-custom-class'
  }}
>
  {/* Contenu principal */}
</PageLayout>
```

## PageLayout

Le composant `PageLayout` est le conteneur principal qui orchestre tous les éléments.

### Propriétés

```typescript
interface PageLayoutProps {
  header: PageHeaderProps;              // Configuration de l'entête (requis)
  sidebar?: React.ReactNode;            // Contenu de la sidebar (optionnel)
  sidebarProps?: PageSidebarProps;      // Props pour la sidebar (optionnel)
  children: React.ReactNode;            // Contenu principal (requis)
  className?: string;                   // Classes CSS pour le conteneur
  contentClassName?: string;            // Classes CSS pour le contenu principal
  bodyClassName?: string;               // Classes CSS pour le conteneur body
}
```

### Structure HTML générée

```html
<div class="space-y-6 animate-in fade-in duration-500 h-full flex flex-col min-w-0">
  <!-- PageHeader -->
  <div class="shrink-0 min-w-0">
    <!-- Header content -->
  </div>

  <!-- Body avec sidebar optionnelle -->
  <div class="flex-1 flex gap-6 min-h-0 min-w-0">
    <!-- Contenu principal -->
    <div class="flex-1 min-w-0">
      {children}
    </div>

    <!-- Sidebar optionnelle -->
    {sidebar && (
      <aside class="w-72 flex-shrink-0">
        {sidebar}
      </aside>
    )}
  </div>
</div>
```

## Bonnes pratiques

### 1. Toujours utiliser PageLayout

Utilisez `PageLayout` pour toutes les pages principales pour garantir une cohérence visuelle.

### 2. Icônes cohérentes

Utilisez des icônes appropriées et cohérentes avec le thème de la page. Les couleurs par défaut sont indigo, mais vous pouvez les personnaliser.

### 3. Actions groupées logiquement

- **leftActions** : Actions contextuelles, filtres, outils
- **rightActions** : Actions principales (Ajouter, Créer, etc.)
- **viewToggle** : Sélection de vues/modes d'affichage

### 4. Responsive

Le système est responsive par défaut :
- Sur mobile, l'entête passe en colonne
- Les actions passent en scroll horizontal si nécessaire
- La sidebar peut être masquée sur mobile si nécessaire

### 5. Performance

- Utilisez `element` dans les actions uniquement pour des cas complexes nécessitant un composant custom
- Préférez les boutons standards pour les actions simples

## Exemples complets

### Page avec sidebar

```tsx
export const MaPageAvecSidebar: React.FC = () => {
  const [filter, setFilter] = useState('tous');

  return (
    <PageLayout
      header={{
        icon: Database,
        title: "Ma Page",
        description: "Description",
        rightActions: [
          {
            label: "Ajouter",
            icon: Plus,
            onClick: () => console.log('Ajouter'),
            variant: 'primary'
          }
        ]
      }}
      sidebar={
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Filtres</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="tous">Tous</option>
            <option value="actifs">Actifs</option>
          </select>
        </div>
      }
      sidebarProps={{
        width: 'w-72',
        sticky: true
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        Contenu principal
      </div>
    </PageLayout>
  );
};
```

### Page avec ViewToggle

```tsx
export const MaPageAvecVues: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <PageLayout
      header={{
        icon: LayoutGrid,
        title: "Ma Page",
        description: "Description",
        viewToggle: {
          value: viewMode,
          options: [
            { value: 'grid', icon: Grid, title: 'Grille' },
            { value: 'list', icon: List, title: 'Liste' }
          ],
          onChange: setViewMode
        },
        rightActions: [
          {
            label: "Ajouter",
            icon: Plus,
            onClick: () => console.log('Ajouter'),
            variant: 'primary'
          }
        ]
      }}
    >
      {viewMode === 'grid' ? (
        <div>Vue grille</div>
      ) : (
        <div>Vue liste</div>
      )}
    </PageLayout>
  );
};
```

## Migration depuis l'ancien système

Si vous avez une page existante, voici comment la migrer :

### Avant

```tsx
export const MaPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Ma Page</h1>
          <p className="text-slate-500">Description</p>
        </div>
        <Button icon={Plus}>Ajouter</Button>
      </div>
      <div className="flex-1">
        Contenu
      </div>
    </div>
  );
};
```

### Après

```tsx
import { PageLayout } from '../ui/PageLayout';
import { Plus } from 'lucide-react';

export const MaPage: React.FC = () => {
  return (
    <PageLayout
      header={{
        title: "Ma Page",
        description: "Description",
        rightActions: [
          {
            label: "Ajouter",
            icon: Plus,
            onClick: () => console.log('Ajouter'),
            variant: 'primary'
          }
        ]
      }}
    >
      Contenu
    </PageLayout>
  );
};
```

## Référence complète des types

Voir les fichiers TypeScript :
- `frontend/components/ui/PageLayout.tsx`
- `frontend/components/ui/PageHeader.tsx`
- `frontend/components/ui/PageSidebar.tsx`
