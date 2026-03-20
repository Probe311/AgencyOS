
import React, { useState, useRef } from 'react';
import { Plus, MoreHorizontal, Clock, AlertCircle, Code2, Bug, Rocket, CheckCircle2, Layout } from 'lucide-react';
import { ProjectStatus, Priority, Task } from '../../types';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { generateUniqueId } from '../../lib/utils';
import { PageLayout } from '../ui/PageLayout';
import { useKanbanColumns, hexToRgba } from '../../lib/hooks/useKanbanColumns';
import { KanbanColumnSettings } from '../ui/KanbanColumnSettings';
import { Settings } from 'lucide-react';
import { KanbanColumn } from '../../types';

export const WebAgileView: React.FC = () => {
  const { showToast, tasks, addTask, updateTask, deleteTask } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Filter for Web & Tech
  const agileTasks = tasks.filter(t => t.department === 'R&D & Tech');

  const { columns: kanbanColumns, addColumn, updateColumn, deleteColumn, reorderColumns, resetToDefault } = useKanbanColumns('agile');

  // Map columns to status values for backward compatibility
  const getStatusForColumn = (column: KanbanColumn): ProjectStatus | string => {
    if (column.statusValue) return column.statusValue;
    // Try to match by title
    const titleLower = column.title.toLowerCase();
    if (titleLower.includes('faire') || titleLower.includes('backlog')) return ProjectStatus.TODO;
    if (titleLower.includes('cours') || titleLower.includes('sprint')) return ProjectStatus.IN_PROGRESS;
    if (titleLower.includes('révision') || titleLower.includes('review')) return ProjectStatus.REVIEW;
    if (titleLower.includes('terminé') || titleLower.includes('production') || titleLower.includes('done')) return ProjectStatus.DONE;
    return column.title; // Use title as status value if no match
  };

  // Helper to check if task matches column status
  const taskMatchesColumn = (task: Task, column: KanbanColumn): boolean => {
    const columnStatus = getStatusForColumn(column);
    return task.status === columnStatus || task.status === column.title;
  };

  // Drag to scroll handlers
  const handleKanbanMouseDown = (e: React.MouseEvent) => {
    if (!kanbanScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - kanbanScrollRef.current.offsetLeft);
    setScrollLeft(kanbanScrollRef.current.scrollLeft);
    kanbanScrollRef.current.style.cursor = 'grabbing';
  };

  const handleKanbanMouseLeave = () => {
    setIsDragging(false);
    if (kanbanScrollRef.current) {
      kanbanScrollRef.current.style.cursor = 'grab';
    }
  };

  const handleKanbanMouseUp = () => {
    setIsDragging(false);
    if (kanbanScrollRef.current) {
      kanbanScrollRef.current.style.cursor = 'grab';
    }
  };

  const handleKanbanMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !kanbanScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    kanbanScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Touch handlers for mobile
  const handleKanbanTouchStart = (e: React.TouchEvent) => {
    if (!kanbanScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - kanbanScrollRef.current.offsetLeft);
    setScrollLeft(kanbanScrollRef.current.scrollLeft);
  };

  const handleKanbanTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !kanbanScrollRef.current) return;
    const x = e.touches[0].pageX - kanbanScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    kanbanScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleKanbanTouchEnd = () => {
    setIsDragging(false);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT: return 'danger';
      case Priority.HIGH: return 'warning';
      case Priority.MEDIUM: return 'info';
      default: return 'default';
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, status: ProjectStatus | string) => {
     e.preventDefault();
     const taskId = e.dataTransfer.getData('taskId');
     if (taskId) {
        const task = agileTasks.find(t => t.id === taskId);
        if (task) {
           updateTask({ ...task, status: status as ProjectStatus });
        }
        setDraggedTaskId(null);
     }
  };

  const handleOpenCreate = () => {
    setEditingTask({
      status: ProjectStatus.TODO,
      priority: Priority.MEDIUM,
      department: 'R&D & Tech',
      assignee: 'https://i.pravatar.cc/150?u=tony'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask({ ...task });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
     if(confirm('Supprimer ce ticket du sprint ?')) {
        deleteTask(id);
        setIsModalOpen(false);
        showToast('Ticket supprimé', 'error');
     }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask.id) {
       updateTask(editingTask as Task);
       showToast('Ticket mis à jour', 'success');
    } else {
       const newTask: Task = {
          id: generateUniqueId(),
          title: editingTask.title || 'Nouvelle Feature',
          client: editingTask.client || 'Interne',
          department: 'R&D & Tech',
          status: editingTask.status || ProjectStatus.TODO,
          priority: editingTask.priority || Priority.MEDIUM,
          assignee: editingTask.assignee || 'https://i.pravatar.cc/150?u=tony',
          dueDate: editingTask.dueDate || new Date().toISOString().split('T')[0],
          estimatedTime: editingTask.estimatedTime || '0 SP',
          tags: ['Feature']
       };
       addTask(newTask);
       showToast('Ticket ajouté au Backlog', 'success');
    }
    setIsModalOpen(false);
  };

  return (
    <PageLayout
      header={{
        icon: Code2,
        iconBgColor: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        title: "Sprint Board",
        description: "Sprint 24 • Semaine 45 • Vélocité stable",
        rightActions: [
          {
            label: "Colonnes",
            icon: Settings,
            onClick: () => setIsColumnSettingsOpen(true),
            variant: 'outline'
          },
          {
            label: "Nouveau Ticket",
            icon: Plus,
            onClick: handleOpenCreate,
            variant: 'primary'
          }
        ]
      }}
      contentClassName="h-full flex flex-col min-h-0"
    >
      {/* Zone de contenu scrollable - reste dans le viewport */}
      <div className="flex-1 min-h-0 overflow-hidden w-full">
        <div 
          ref={kanbanScrollRef}
          className="h-full w-full overflow-x-auto overflow-y-hidden cursor-grab kanban-horizontal-scroll select-none"
          onMouseDown={handleKanbanMouseDown}
          onMouseLeave={handleKanbanMouseLeave}
          onMouseUp={handleKanbanMouseUp}
          onMouseMove={handleKanbanMouseMove}
          onTouchStart={handleKanbanTouchStart}
          onTouchMove={handleKanbanTouchMove}
          onTouchEnd={handleKanbanTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="inline-flex gap-6 h-full pb-4 min-w-max">
            {kanbanColumns.map((col) => {
              const columnStatus = getStatusForColumn(col);
              const columnTasks = agileTasks.filter(t => taskMatchesColumn(t, col));
              const bgColor = hexToRgba(col.color, 0.1);
              
              return (
              <div 
                key={col.id} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, columnStatus)}
                className="w-80 flex-shrink-0 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 h-full"
                style={{ backgroundColor: bgColor }}
              >
                {/* Header de colonne */}
                <div className="p-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    ></div>
                    <h3 
                      className="font-bold text-sm"
                      style={{ color: col.color }}
                    >
                      {col.title}
                    </h3>
                    <span className="text-xs text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button 
                    onClick={handleOpenCreate} 
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Liste des tâches - scroll vertical uniquement */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
                    >
                      <TaskCard 
                        task={task} 
                        getPriorityColor={getPriorityColor} 
                        onClick={() => handleOpenEdit(task)} 
                        icon={<Layout size={12} />}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={handleOpenCreate}
                    className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 text-xs font-bold hover:border-primary-300 dark:hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-500/10 transition-all"
                  >
                    + Ajouter une tâche
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

    {/* Modal */}
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask.id ? "Modifier Ticket" : "Créer Ticket"} size="lg">
         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div className="col-span-2">
                  <Input 
                     label="Titre du Ticket" 
                     value={editingTask.title || ''}
                     onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                     placeholder="ex: Intégration API"
                     required
                  />
               </div>
               
               <Input 
                  label="Projet / Client" 
                  value={editingTask.client || ''}
                  onChange={e => setEditingTask({...editingTask, client: e.target.value})}
               />
               
               <Dropdown 
                  label="Statut"
                  value={editingTask.status}
                  onChange={value => setEditingTask({...editingTask, status: value as ProjectStatus})}
                  options={kanbanColumns.map(col => ({label: col.title, value: getStatusForColumn(col) as string}))}
               />

               <Dropdown 
                  label="Priorité"
                  value={editingTask.priority}
                  onChange={value => setEditingTask({...editingTask, priority: value as Priority})}
                  options={[
                     { value: Priority.LOW, label: 'Low' },
                     { value: Priority.MEDIUM, label: 'Medium' },
                     { value: Priority.HIGH, label: 'High' },
                     { value: Priority.URGENT, label: 'Urgent' },
                  ]}
               />

               <Input 
                  label="Deadline"
                  type="date"
                  value={editingTask.dueDate}
                  onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
               />

               <Input 
                   label="Story Points / Temps"
                   value={editingTask.estimatedTime || ''}
                   onChange={e => setEditingTask({...editingTask, estimatedTime: e.target.value})}
                   placeholder="ex: 5 SP"
                />
            </div>
            
            <Textarea 
               label="Description Technique"
               placeholder="Critères d'acceptation, détails techniques..."
            />

            <div className="flex justify-between pt-4 border-t border-slate-100">
               {editingTask.id && (
                  <Button type="button" variant="danger" onClick={() => handleDelete(editingTask.id!)} icon={MoreHorizontal}>
                     Supprimer
                  </Button>
               )}
               <div className="flex gap-3 ml-auto">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                  <Button type="submit">
                     {editingTask.id ? 'Sauvegarder' : 'Créer Ticket'}
                  </Button>
               </div>
            </div>
         </form>
      </Modal>

      {/* Column Settings Modal */}
      <KanbanColumnSettings
        isOpen={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        columns={kanbanColumns}
        onAddColumn={addColumn}
        onUpdateColumn={updateColumn}
        onDeleteColumn={deleteColumn}
        onReorderColumns={reorderColumns}
        onReset={resetToDefault}
      />
    </PageLayout>
  );
};

// TaskCard Component - Même structure que ProjectsView
const TaskCard: React.FC<any> = ({ task, getPriorityColor, onClick, icon }) => {
   return (
      <div onClick={onClick} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500 transition-all cursor-pointer group relative">
         <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.client}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <MoreHorizontal size={16} className="text-slate-300" />
            </div>
         </div>
         <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 leading-snug pr-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{task.title}</h4>
         {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
               {task.tags.map((tag: string) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] rounded border border-slate-100 dark:border-slate-600 font-medium">
                     #{tag}
                  </span>
               ))}
            </div>
         )}
         {task.subTasks && task.subTasks.length > 0 && (
            <div className="mb-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
               <div className="bg-primary-500 h-full" style={{width: `${(task.subTasks.filter((s:any)=>s.completed).length / task.subTasks.length) * 100}%`}}></div>
            </div>
         )}
         <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
            <div className="flex items-center gap-2">
               {task.assignee && (
                  <img src={task.assignee} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 shadow-sm object-cover" alt="Assignee" />
               )}
               <div className={`p-1 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-400 border border-slate-100 dark:border-slate-600`}>{icon}</div>
            </div>
            <div className="flex items-center gap-2">
               {task.estimatedTime && (
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                     <Clock size={10} /> {task.estimatedTime}
                  </span>
               )}
               <Badge variant={getPriorityColor(task.priority)} className="rounded-md px-1.5 py-0.5 text-[10px]">{task.priority}</Badge>
            </div>
         </div>
      </div>
   );
};