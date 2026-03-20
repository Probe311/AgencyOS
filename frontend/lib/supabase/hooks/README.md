# Hooks Supabase

Ce dossier contient les hooks React pour interagir avec Supabase.

## Hook générique : `useSupabaseCrud`

Un hook générique pour les opérations CRUD simples qui factorise les patterns répétés.

### Utilisation

```typescript
import { useSupabaseCrud } from './useSupabaseCrud';
import { mapSupabaseEntityToEntity, mapEntityToSupabaseEntity } from '../mappers';

const { data, loading, error, add, update, remove, refresh } = useSupabaseCrud({
  tableName: 'my_table',
  mapToEntity: mapSupabaseEntityToEntity,
  mapFromEntity: mapEntityToSupabaseEntity, // optionnel
  orderBy: { column: 'created_at', ascending: false },
  enableRealtime: true, // optionnel, true par défaut
  realtimeChannel: 'my-table-changes', // optionnel
});
```

### Quand l'utiliser

- Pour les tables simples avec des opérations CRUD standard
- Quand le mapping Supabase ↔ Entity est direct
- Quand vous n'avez pas besoin de logique métier complexe dans le hook

### Quand ne pas l'utiliser

- Quand vous avez besoin de jointures complexes
- Quand vous avez besoin de logique métier spécifique
- Quand vous devez charger des relations (ex: assignees, sub-items)

## Helpers CRUD : `supabaseCrudHelpers`

Des fonctions utilitaires pour créer des opérations CRUD sans hook.

### Utilisation

```typescript
import { createCrudHelpers } from './utils/supabaseCrudHelpers';

const crud = createCrudHelpers({
  tableName: 'my_table',
  mapToEntity: mapSupabaseEntityToEntity,
  mapFromEntity: mapEntityToSupabaseEntity,
  defaultOrderBy: { column: 'created_at', ascending: false },
});

// Utilisation dans un hook personnalisé
const fetch = async () => {
  const items = await crud.fetch();
  setData(items);
};
```

## Patterns communs

### Fetch avec loading et error

```typescript
const fetchData = useCallback(async () => {
  if (!isSupabaseConfigured || !supabase) {
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('table')
      .select('*');

    if (fetchError) throw fetchError;
    
    setData(data || []);
  } catch (err) {
    logError('Error fetching:', err);
    setError(err instanceof Error ? err.message : 'Erreur');
  } finally {
    setLoading(false);
  }
}, []);
```

### Subscription real-time

```typescript
useEffect(() => {
  fetchData();

  if (isSupabaseConfigured && supabase) {
    const channel = supabase
      .channel('table-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'table',
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}, [fetchData]);
```

### Utiliser le helper de subscription

```typescript
import { createRealtimeSubscription } from './utils/supabaseCrudHelpers';

useEffect(() => {
  fetchData();
  
  const cleanup = createRealtimeSubscription(
    'table',
    'table-changes',
    fetchData
  );
  
  return cleanup;
}, [fetchData]);
```

