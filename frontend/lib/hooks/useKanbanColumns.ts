import { useState, useEffect, useCallback } from 'react';
import { KanbanColumn } from '../../types';
import { ProjectStatus } from '../../types';

const STORAGE_KEY = 'kanban_columns';
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: '1', title: 'À faire', color: '#64748b', position: 0, statusValue: ProjectStatus.TODO },
  { id: '2', title: 'En cours', color: '#6366f1', position: 1, statusValue: ProjectStatus.IN_PROGRESS },
  { id: '3', title: 'En révision', color: '#f59e0b', position: 2, statusValue: ProjectStatus.REVIEW },
  { id: '4', title: 'Terminé', color: '#10b981', position: 3, statusValue: ProjectStatus.DONE },
];

export const useKanbanColumns = (boardType: 'default' | 'agile' = 'default') => {
  const storageKey = `${STORAGE_KEY}_${boardType}`;
  
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading kanban columns:', e);
    }
    
    // Return default columns based on board type
    if (boardType === 'agile') {
      return [
        { id: '1', title: 'Backlog', color: '#64748b', position: 0, statusValue: ProjectStatus.TODO },
        { id: '2', title: 'Sprint en cours', color: '#6366f1', position: 1, statusValue: ProjectStatus.IN_PROGRESS },
        { id: '3', title: 'Code Review', color: '#f59e0b', position: 2, statusValue: ProjectStatus.REVIEW },
        { id: '4', title: 'Production', color: '#10b981', position: 3, statusValue: ProjectStatus.DONE },
      ];
    }
    
    return DEFAULT_COLUMNS;
  });

  const saveColumns = useCallback((newColumns: KanbanColumn[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newColumns));
      setColumns(newColumns);
    } catch (e) {
      console.error('Error saving kanban columns:', e);
    }
  }, [storageKey]);

  const addColumn = useCallback((column: Omit<KanbanColumn, 'id' | 'position'>) => {
    const maxPosition = Math.max(...columns.map(c => c.position), -1);
    const newColumn: KanbanColumn = {
      ...column,
      id: Date.now().toString(),
      position: maxPosition + 1,
    };
    saveColumns([...columns, newColumn].sort((a, b) => a.position - b.position));
    return newColumn;
  }, [columns, saveColumns]);

  const updateColumn = useCallback((id: string, updates: Partial<KanbanColumn>) => {
    const updated = columns.map(col => 
      col.id === id ? { ...col, ...updates } : col
    );
    saveColumns(updated.sort((a, b) => a.position - b.position));
  }, [columns, saveColumns]);

  const deleteColumn = useCallback((id: string) => {
    const filtered = columns.filter(col => col.id !== id);
    // Reorder positions
    const reordered = filtered.map((col, index) => ({ ...col, position: index }));
    saveColumns(reordered);
  }, [columns, saveColumns]);

  const reorderColumns = useCallback((columnIds: string[]) => {
    const reordered = columnIds.map((id, index) => {
      const col = columns.find(c => c.id === id);
      return col ? { ...col, position: index } : null;
    }).filter((col): col is KanbanColumn => col !== null);
    saveColumns(reordered);
  }, [columns, saveColumns]);

  const resetToDefault = useCallback(() => {
    const defaultCols = boardType === 'agile' ? [
      { id: '1', title: 'Backlog', color: '#64748b', position: 0, statusValue: ProjectStatus.TODO },
      { id: '2', title: 'Sprint en cours', color: '#6366f1', position: 1, statusValue: ProjectStatus.IN_PROGRESS },
      { id: '3', title: 'Code Review', color: '#f59e0b', position: 2, statusValue: ProjectStatus.REVIEW },
      { id: '4', title: 'Production', color: '#10b981', position: 3, statusValue: ProjectStatus.DONE },
    ] : DEFAULT_COLUMNS;
    saveColumns(defaultCols);
  }, [boardType, saveColumns]);

  return {
    columns: columns.sort((a, b) => a.position - b.position),
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    resetToDefault,
  };
};

// Helper function to convert hex to RGB with alpha
export const hexToRgba = (hex: string, alpha: number = 0.1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

