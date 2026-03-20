import React, { useState } from 'react';
import { KanbanColumn } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import { hexToRgba } from '../../lib/hooks/useKanbanColumns';

interface KanbanColumnSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  columns: KanbanColumn[];
  onAddColumn: (column: Omit<KanbanColumn, 'id' | 'position'>) => void;
  onUpdateColumn: (id: string, updates: Partial<KanbanColumn>) => void;
  onDeleteColumn: (id: string) => void;
  onReorderColumns: (columnIds: string[]) => void;
  onReset: () => void;
}

export const KanbanColumnSettings: React.FC<KanbanColumnSettingsProps> = ({
  isOpen,
  onClose,
  columns,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onReset,
}) => {
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [newColumn, setNewColumn] = useState({ title: '', color: '#6366f1' });
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const handleAddColumn = () => {
    if (newColumn.title.trim()) {
      onAddColumn({
        title: newColumn.title,
        color: newColumn.color,
      });
      setNewColumn({ title: '', color: '#6366f1' });
    }
  };

  const handleSaveEdit = () => {
    if (editingColumn && editingColumn.title.trim()) {
      onUpdateColumn(editingColumn.id, {
        title: editingColumn.title,
        color: editingColumn.color,
      });
      setEditingColumn(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetId) {
      setDraggedColumnId(null);
      return;
    }

    const draggedIndex = columns.findIndex(c => c.id === draggedColumnId);
    const targetIndex = columns.findIndex(c => c.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumnId(null);
      return;
    }

    const newColumns = [...columns];
    const [removed] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, removed);
    
    onReorderColumns(newColumns.map(c => c.id));
    setDraggedColumnId(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration des colonnes"
      size="lg"
    >
      <div className="space-y-6">
        {/* Liste des colonnes existantes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Colonnes existantes</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              Réinitialiser
            </Button>
          </div>
          
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-move ${
                draggedColumnId === column.id ? 'opacity-50' : ''
              }`}
            >
              <GripVertical size={18} className="text-slate-400 cursor-grab" />
              
              {editingColumn?.id === column.id ? (
                <>
                  <Input
                    value={editingColumn.title}
                    onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                    className="flex-1"
                    containerClassName="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <div className="relative group">
                    <div 
                      className="w-10 h-10 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-500 transition-colors shadow-sm flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: editingColumn.color,
                      }}
                    >
                      <input
                        type="color"
                        value={editingColumn.color}
                        onChange={(e) => setEditingColumn({ ...editingColumn, color: e.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Couleur"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSaveEdit}>
                    Sauver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingColumn(null)}
                  >
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-600 shadow-sm"
                    style={{ backgroundColor: column.color }}
                  />
                  <div
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium dark:bg-slate-800"
                    style={{
                      backgroundColor: hexToRgba(column.color, 0.1),
                      color: column.color,
                    }}
                  >
                    {column.title}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingColumn(column)}
                  >
                    Modifier
                  </Button>
                  {columns.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteColumn(column.id)}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter une nouvelle colonne */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Ajouter une colonne</h3>
          <div className="flex gap-3">
            <Input
              placeholder="Nom de la colonne"
              value={newColumn.title}
              onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              containerClassName="flex-1"
            />
            <div className="relative group">
              <div 
                className="w-10 h-10 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-500 transition-colors shadow-sm flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: newColumn.color,
                }}
              >
                <input
                  type="color"
                  value={newColumn.color}
                  onChange={(e) => setNewColumn({ ...newColumn, color: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Couleur"
                />
              </div>
            </div>
            <Button
              onClick={handleAddColumn}
              disabled={!newColumn.title.trim()}
              icon={Plus}
            >
              Ajouter
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

