import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, MoreHorizontal, Clock, LayoutGrid, List as ListIcon, Tags, 
  Megaphone, Share2, Layout, Users, Calendar as CalendarIcon, 
  CheckSquare, MessageSquare, Paperclip, ChevronRight, User as UserIcon, Trash2,
  Columns, CalendarDays, Timer, Play, AlignLeft, Sparkles, Wand2, Table2, BarChart3,
  History, Bell, Upload, X, FileText, Layers, ChevronDown, ChevronUp, ZoomIn, ZoomOut
} from 'lucide-react';
import { ProjectStatus, Priority, Task, Department, SubTask } from '../../types';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import { useAppStore } from '../../store/useAppStore';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { generateUniqueId } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Checkbox } from '../ui/Checkbox';
import { FileInput } from '../ui/FileInput';
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from '../../lib/api-keys';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { useTaskAssignees } from '../../lib/supabase/hooks/useTaskAssignees';
import { useTaskComments } from '../../lib/supabase/hooks/useTaskComments';
import { useTaskReminders } from '../../lib/supabase/hooks/useTaskReminders';
import { useTaskHistory } from '../../lib/supabase/hooks/useTaskHistory';
import { MultiUserSelect } from '../tasks/MultiUserSelect';
import { getUserAvatar } from '../../lib/utils/avatar';
import { TaskComments } from '../tasks/TaskComments';
import { TaskHistory } from '../tasks/TaskHistory';
import { TaskAttachments } from '../tasks/TaskAttachments';
import { TaskDependencies } from '../tasks/TaskDependencies';
import { uploadFile } from '../../lib/utils/upload';
import { ReminderService } from '../../lib/services/reminderService';
import { useWorkspaces } from '../../lib/supabase/hooks/useWorkspaces';
import { useFolders } from '../../lib/supabase/hooks/useFolders';
import { useProjectsHierarchy } from '../../lib/supabase/hooks/useProjectsHierarchy';
import { useProjectSections } from '../../lib/supabase/hooks/useProjectSections';
import { useTaskDependencies } from '../../lib/supabase/hooks/useTaskDependencies';
import { ProjectHierarchy } from '../projects/ProjectHierarchy';
import { Project } from '../../types';
import { ManualTimeEntry } from '../time/ManualTimeEntry';
import { PageLayout } from '../ui/PageLayout';
import { useKanbanColumns, hexToRgba } from '../../lib/hooks/useKanbanColumns';
import { KanbanColumnSettings } from '../ui/KanbanColumnSettings';
import { Settings } from 'lucide-react';
import { KanbanColumn } from '../../types';

export const ProjectsView: React.FC = () => {
  const { showToast, projectFilter, addTask, updateTask, deleteTask, tasks } = useApp();
  const { startTimer } = useAppStore();
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'gantt' | 'table' | 'workload'>('board');
  const [filterDept, setFilterDept] = useState<Department | 'Tous'>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  
  // Hooks for new features
  const { users } = useUsers();
  const { getTaskAssignees, setTaskAssignees } = useTaskAssignees();
  const { getTaskComments } = useTaskComments();
  const { getTaskReminders, addTaskReminder } = useTaskReminders();
  const { addTaskHistoryEntry } = useTaskHistory();
  const { projects: hierarchyProjects, archiveProject, restoreProject } = useProjectsHierarchy();
  const { sections, addSection, getSectionsByProject } = useProjectSections();
  const { getDependenciesByTask } = useTaskDependencies();
  
  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
     if (projectFilter) {
        setFilterDept(projectFilter as Department);
     } else {
        setFilterDept('Tous');
     }
  }, [projectFilter]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [newSubtask, setNewSubtask] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history' | 'attachments' | 'dependencies'>('details');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const { columns: kanbanColumns, addColumn, updateColumn, deleteColumn, reorderColumns, resetToDefault } = useKanbanColumns('default');

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

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT: return 'danger';
      case Priority.HIGH: return 'warning';
      case Priority.MEDIUM: return 'info';
      default: return 'default';
    }
  };

  const getDeptIcon = (dept: string) => {
     if (dept.includes('Tech') || dept.includes('Web')) return <Layout size={12} />;
     if (dept.includes('Marketing') || dept.includes('RP')) return <Megaphone size={12} />;
     if (dept.includes('Design') || dept.includes('Costumes')) return <Share2 size={12} />;
     if (dept.includes('Événements')) return <CalendarIcon size={12} />;
     return <Users size={12} />;
  }

  const filteredTasks = tasks.filter(task => {
    const matchesDept = filterDept === 'Tous' || task.department === filterDept;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.client.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

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

  const departments: Department[] = ['R&D & Tech', 'Design & Costumes', 'Marketing & RP', 'Missions & Ops', 'Événements', 'Stratégie', 'Renseignement'];

  const handleOpenCreate = async () => {
    setEditingTask({
      status: ProjectStatus.TODO,
      priority: Priority.MEDIUM,
      department: 'R&D & Tech',
      assignee: 'https://i.pravatar.cc/150?u=tony',
      subTasks: [],
      assignees: []
    });
    setSelectedAssignees([]);
    setActiveTab('details');
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (task: Task) => {
    setEditingTask({ ...task });
    setActiveTab('details');
    
    if (task.id) {
      const assignees = await getTaskAssignees(task.id);
      setSelectedAssignees(assignees);
    }
    
    setIsModalOpen(true);
  };

  const handleGenerateSubtasks = async () => {
    if (!editingTask.title) {
       showToast("Veuillez saisir un titre de tâche", 'error');
       return;
    }
    
    setIsGeneratingSubtasks(true);
    try {
       const apiKey = getApiKey('google');
       if (!apiKey) {
         showToast('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.', 'error');
         return;
       }
       const ai = new GoogleGenAI({ apiKey });
       const prompt = `Act as a Project Manager. Break down the task "${editingTask.title}" (Description: ${editingTask.description || 'No description'}) into 3 to 5 actionable subtasks.
       Return strictly a JSON array of strings. Example: ["Research competitors", "Draft outline"].`;
       
       const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
       });

       if (response.text) {
          const tasks = JSON.parse(response.text);
          const newSubTasks: SubTask[] = tasks.map((t: string) => ({
             id: generateUniqueId(),
             title: t,
             completed: false
          }));
          
          setEditingTask(prev => ({
             ...prev,
             subTasks: [...(prev.subTasks || []), ...newSubTasks]
          }));
          showToast(`${newSubTasks.length} sous-tâche${newSubTasks.length > 1 ? 's' : ''} générée${newSubTasks.length > 1 ? 's' : ''}`, 'success');
       }
    } catch (e) {
       console.error(e);
       showToast("Erreur lors de la génération", 'error');
    } finally {
       setIsGeneratingSubtasks(false);
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

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
     e.preventDefault();
     const taskId = e.dataTransfer.getData('taskId');
     if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
           updateTask({ ...task, status });
        }
        setDraggedTaskId(null);
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = !!editingTask.id;
    const oldTask = isUpdate ? tasks.find(t => t.id === editingTask.id) : null;
    
    if (isUpdate) {
      if (oldTask) {
        if (oldTask.status !== editingTask.status) {
          await addTaskHistoryEntry(editingTask.id!, 'status_changed', 'status', oldTask.status, editingTask.status);
        }
        if (oldTask.priority !== editingTask.priority) {
          await addTaskHistoryEntry(editingTask.id!, 'priority_changed', 'priority', oldTask.priority, editingTask.priority);
        }
        if (oldTask.title !== editingTask.title) {
          await addTaskHistoryEntry(editingTask.id!, 'title_changed', 'title', oldTask.title, editingTask.title);
        }
      }
      
      updateTask({ ...editingTask, assignees: selectedAssignees } as Task);
      
      if (editingTask.id) {
        await setTaskAssignees(editingTask.id, selectedAssignees);
      }
      
      showToast('Tâche mise à jour', 'success');
    } else {
      const newTask: Task = {
        id: generateUniqueId(),
        title: editingTask.title || 'Nouveau Projet',
        client: editingTask.client || 'Interne',
        department: editingTask.department || 'R&D & Tech',
        status: editingTask.status || ProjectStatus.TODO,
        priority: editingTask.priority || Priority.MEDIUM,
        assignee: selectedAssignees.length > 0 ? selectedAssignees[0] : '',
        assignees: selectedAssignees,
        dueDate: editingTask.dueDate || new Date().toISOString().split('T')[0],
        startDate: editingTask.startDate || new Date().toISOString().split('T')[0],
        estimatedTime: editingTask.estimatedTime || '0h',
        tags: [],
        subTasks: editingTask.subTasks || []
      };
      await addTask(newTask);
      
      await setTaskAssignees(newTask.id, selectedAssignees);
      
      if (newTask.dueDate && selectedAssignees.length > 0) {
        await ReminderService.createDefaultReminders(newTask.id, newTask.dueDate, selectedAssignees);
      }
      
      await addTaskHistoryEntry(newTask.id, 'created');
      
      showToast('Tâche créée', 'success');
    }
    setIsModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFile(file, 'task-attachments');
        if (result.url) {
          uploadedUrls.push(result.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const currentAttachments = editingTask.attachments || [];
        setEditingTask({
          ...editingTask,
          attachments: [...currentAttachments, ...uploadedUrls]
        });
        showToast(`${uploadedUrls.length} fichier(s) uploadé(s)`, 'success');
      }
    } catch (error) {
      showToast('Erreur lors de l\'upload', 'error');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (index: number) => {
    const attachments = editingTask.attachments || [];
    setEditingTask({
      ...editingTask,
      attachments: attachments.filter((_, i) => i !== index)
    });
  };

  const addManualSubtask = () => {
     if (!newSubtask.trim()) return;
     const sub: SubTask = {
        id: generateUniqueId(),
        title: newSubtask,
        completed: false
     };
     setEditingTask(prev => ({ ...prev, subTasks: [...(prev.subTasks || []), sub] }));
     setNewSubtask('');
  };

  const toggleSubtask = (id: string) => {
     setEditingTask(prev => ({
        ...prev,
        subTasks: prev.subTasks?.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
     }));
  };

  return (
    <>
    <PageLayout
      header={{
        icon: Layers,
        iconBgColor: "bg-blue-100 dark:bg-blue-900/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        title: "Projets & Missions",
        description: `${filteredTasks.length} actif${filteredTasks.length > 1 ? 's' : ''}`,
        viewToggle: {
          value: viewMode,
          options: [
            { value: 'board', icon: LayoutGrid, title: 'Board' },
            { value: 'list', icon: ListIcon, title: 'List' },
            { value: 'gantt', icon: AlignLeft, title: 'Gantt' },
            { value: 'table', icon: Table2, title: 'Tableau' },
            { value: 'workload', icon: BarChart3, title: 'Charge de travail' }
          ],
          onChange: (value) => setViewMode(value as any)
        },
        rightActions: [
          {
            label: "Colonnes",
            icon: Settings,
            onClick: () => setIsColumnSettingsOpen(true),
            variant: 'outline'
          },
          {
            label: "Créer",
            icon: Plus,
            onClick: handleOpenCreate,
            variant: 'primary'
          }
        ]
      }}
      sidebar={
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <ProjectHierarchy
              projects={hierarchyProjects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onArchiveProject={archiveProject}
              onRestoreProject={restoreProject}
              showArchived={showArchived}
            />
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <Checkbox
              label="Afficher les archives"
              checked={showArchived}
              onChange={(checked) => setShowArchived(checked)}
            />
          </div>
        </div>
      }
      sidebarProps={{ width: 'w-64' }}
      sidebarPosition="left"
      contentClassName="h-full flex flex-col min-h-0"
    >
      {/* Zone de filtres fixe en haut */}
      <div className="shrink-0 w-full mb-6 space-y-3">
        {/* Recherche */}
        <div className="w-full max-w-md">
          <SearchBar 
            placeholder="Rechercher..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Filtres par département */}
        <div className="flex gap-2 items-center flex-wrap">
          <button 
            onClick={() => setFilterDept('Tous')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
              filterDept === 'Tous' 
                ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-900 dark:border-slate-200' 
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            Tous
          </button>
          {departments.map(dept => (
            <button 
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                filterDept === dept 
                  ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-900 dark:border-slate-200' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Zone de contenu scrollable - reste dans le viewport */}
      <div className="flex-1 min-h-0 overflow-hidden w-full">
        {viewMode === 'board' ? (
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
                const columnTasks = filteredTasks.filter(t => taskMatchesColumn(t, col));
                const bgColor = hexToRgba(col.color, 0.1);
                
                return (
                <div 
                  key={col.id} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, columnStatus as ProjectStatus)}
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
                          icon={getDeptIcon(task.department)}
                          onStartTimer={(e:any) => { e.stopPropagation(); startTimer(task.id, task.title); showToast(`Timer lancé: ${task.title}`, 'info'); }}
                          users={users}
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
        ) : viewMode === 'table' ? (
          <div className="h-full overflow-hidden">
            <TableView tasks={filteredTasks} onTaskClick={handleOpenEdit} getPriorityColor={getPriorityColor} />
          </div>
        ) : viewMode === 'workload' ? (
          <div className="h-full overflow-hidden">
            <WorkloadView tasks={filteredTasks} users={users} />
          </div>
        ) : viewMode === 'list' ? (
          <div className="h-full overflow-hidden">
            <ListView 
              tasks={filteredTasks} 
              onTaskClick={handleOpenEdit} 
              getPriorityColor={getPriorityColor}
              getDeptIcon={getDeptIcon}
              users={users}
              onStartTimer={(taskId, taskTitle) => {
                startTimer(taskId, taskTitle);
                showToast(`Timer lancé: ${taskTitle}`, 'info');
              }}
            />
          </div>
        ) : viewMode === 'gantt' ? (
          <div className="h-full overflow-hidden">
            <GanttView 
              tasks={filteredTasks} 
              onTaskClick={handleOpenEdit}
              getPriorityColor={getPriorityColor}
              users={users}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400">
            <p>Vue non disponible</p>
          </div>
        )}
      </div>
    </PageLayout>

    {/* Modals */}
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask.id ? "Détails de la tâche" : "Nouvelle tâche"} size="xl">
       <form onSubmit={handleSubmit} className="flex flex-col h-[700px]">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 shrink-0">
             <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
                   activeTab === 'details'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
             >
                Détails
             </button>
             {editingTask.id && (
                <>
                   <button
                      type="button"
                      onClick={() => setActiveTab('comments')}
                      className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
                         activeTab === 'comments'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                   >
                      Commentaires
                   </button>
                   <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
                         activeTab === 'history'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                   >
                      Historique
                   </button>
                   <button
                      type="button"
                      onClick={() => setActiveTab('attachments')}
                      className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
                         activeTab === 'attachments'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                   >
                      Pièces jointes
                   </button>
                   <button
                      type="button"
                      onClick={() => setIsTimeEntryModalOpen(true)}
                      className="px-4 py-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors flex items-center gap-2"
                   >
                      <Clock size={14} />
                      Ajouter temps
                   </button>
                   <button
                      type="button"
                      onClick={() => setActiveTab('dependencies')}
                      className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
                         activeTab === 'dependencies'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                   >
                      Dépendances
                   </button>
                </>
             )}
          </div>

          <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
             {/* Left: Main Content */}
             <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                {activeTab === 'details' && (
                   <>
                      <Input label="Titre" value={editingTask.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} required placeholder="Nom de la tâche" />
                      <div className="grid grid-cols-2 gap-4">
                         <Input label="Client" value={editingTask.client || ''} onChange={e => setEditingTask({...editingTask, client: e.target.value})} placeholder="Nom du client" />
                         <Dropdown label="Département" value={editingTask.department} onChange={value => setEditingTask({...editingTask, department: value as Department})} options={departments.map(d => ({label: d, value: d}))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <Input label="Date de début" type="date" value={editingTask.startDate} onChange={e => setEditingTask({...editingTask, startDate: e.target.value})} />
                         <Input label="Date d'échéance" type="date" value={editingTask.dueDate} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} />
                      </div>
                      <Textarea label="Description" placeholder="Détails, objectifs, contexte..." value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} />
                      
                      {/* Multi-assignation */}
                      <MultiUserSelect
                         users={users}
                         selectedUserIds={selectedAssignees}
                         onChange={setSelectedAssignees}
                         label="Assigné à"
                         placeholder="Sélectionner des utilisateurs..."
                      />
                      
                      {/* Subtasks Section */}
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"><CheckSquare size={16} /> Sous-tâches</h4>
                            <button 
                               type="button" 
                               onClick={handleGenerateSubtasks}
                               disabled={isGeneratingSubtasks}
                               className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/20 px-2 py-1 rounded hover:bg-primary-100 dark:hover:bg-primary-500/30 flex items-center gap-1 transition-colors"
                            >
                               {isGeneratingSubtasks ? <span className="animate-spin">✨</span> : <Wand2 size={12} />}
                               {isGeneratingSubtasks ? 'Génération en cours...' : 'Générer avec IA'}
                            </button>
                         </div>
                         <div className="space-y-2 mb-3">
                            {editingTask.subTasks?.map(st => (
                               <div key={st.id} className="flex items-center gap-2 group">
                                  <Checkbox 
                                     checked={st.completed} 
                                     onChange={() => toggleSubtask(st.id)}
                                  />
                                  <span className={`text-sm ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{st.title}</span>
                                  <button type="button" onClick={() => setEditingTask(prev => ({...prev, subTasks: prev.subTasks?.filter(s => s.id !== st.id)}))} className="ml-auto text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                     <Trash2 size={14} />
                                  </button>
                               </div>
                            ))}
                         </div>
                         <div className="flex gap-2">
                            <Input 
                               type="text" 
                               value={newSubtask} 
                               onChange={e => setNewSubtask(e.target.value)} 
                               placeholder="Ajouter une sous-tâche..."
                               containerClassName="flex-1"
                               className="text-sm"
                               onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addManualSubtask())}
                            />
                            <Button type="button" size="sm" variant="secondary" onClick={addManualSubtask}><Plus size={16} /></Button>
                         </div>
                      </div>
                   </>
                )}

                {activeTab === 'comments' && editingTask.id && (
                   <TaskComments taskId={editingTask.id} />
                )}

                {activeTab === 'history' && editingTask.id && (
                   <TaskHistory taskId={editingTask.id} />
                )}

                {activeTab === 'attachments' && editingTask.id && (
                   <TaskAttachments
                      taskId={editingTask.id}
                      attachments={editingTask.attachments || []}
                      onAttachmentsChange={(attachments) => {
                         setEditingTask({ ...editingTask, attachments });
                      }}
                   />
                )}

                {activeTab === 'dependencies' && editingTask.id && (
                   <TaskDependencies
                      taskId={editingTask.id}
                      tasks={tasks}
                      onTaskClick={(taskId) => {
                         const task = tasks.find(t => t.id === taskId);
                         if (task) {
                            setEditingTask(task);
                            setIsEditModalOpen(true);
                         }
                      }}
                   />
                )}

                {activeTab === 'attachments' && editingTask.id && (
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                         <Paperclip size={18} className="text-slate-600 dark:text-slate-400" />
                         <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                            Pièces jointes
                         </h4>
                      </div>
                      <FileInput
                         label="Ajouter des fichiers"
                         onChange={handleFileUpload}
                         accept="*/*"
                         multiple
                         disabled={uploadingFiles}
                      />
                      {editingTask.attachments && editingTask.attachments.length > 0 && (
                         <div className="space-y-2 mt-4">
                            {editingTask.attachments.map((url, index) => (
                               <div key={index} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                  <FileText size={16} className="text-slate-400" />
                                  <a
                                     href={url}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex-1 text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                                  >
                                     {url.split('/').pop()}
                                  </a>
                                  <button
                                     type="button"
                                     onClick={() => removeAttachment(index)}
                                     className="text-slate-400 hover:text-red-500"
                                  >
                                     <X size={16} />
                                  </button>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                )}

                {activeTab === 'dependencies' && editingTask.id && (
                   <TaskDependencies
                      taskId={editingTask.id}
                      tasks={tasks}
                      onTaskClick={(taskId) => {
                         const task = tasks.find(t => t.id === taskId);
                         if (task) {
                            handleOpenEdit(task);
                            setActiveTab('details');
                         }
                      }}
                   />
                )}
             </div>

             {/* Right: Meta & Actions */}
             <div className="w-72 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex flex-col gap-6 shrink-0">
                <Dropdown 
                  label="Statut" 
                  value={editingTask.status} 
                  onChange={value => setEditingTask({...editingTask, status: value as ProjectStatus})} 
                  options={kanbanColumns.map(col => ({label: col.title, value: getStatusForColumn(col) as string}))} 
                />
                <Dropdown label="Priorité" value={editingTask.priority} onChange={value => setEditingTask({...editingTask, priority: value as Priority})} options={Object.values(Priority).map(p => ({label: p, value: p}))} />
                
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                   <Button type="submit" fullWidth>Sauvegarder</Button>
                </div>
             </div>
          </div>
       </form>
    </Modal>

      {/* Time Entry Modal */}
      <ManualTimeEntry
        isOpen={isTimeEntryModalOpen}
        onClose={() => setIsTimeEntryModalOpen(false)}
        task={editingTask.id ? editingTask as Task : undefined}
        projectId={editingTask.id ? undefined : undefined}
        userId={undefined}
        onSave={() => {
          showToast('Temps enregistré', 'success');
        }}
      />

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
    </>
  );
};

const TaskCard: React.FC<any> = ({ task, getPriorityColor, onClick, icon, onStartTimer, users = [] }) => {
   const assignees = task.assignees && task.assignees.length > 0 
      ? users.filter((u: any) => task.assignees.includes(u.id))
      : task.assignee ? [{ avatar: task.assignee, name: 'User' }] : [];

   return (
      <div onClick={onClick} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500 transition-all cursor-pointer group relative">
         <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.client}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={onStartTimer} className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded" title="Démarrer Timer">
                  <Play size={14} />
               </button>
               <MoreHorizontal size={16} className="text-slate-300" />
            </div>
         </div>
         <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 leading-snug pr-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{task.title}</h4>
         {task.subTasks && task.subTasks.length > 0 && (
            <div className="mb-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
               <div className="bg-primary-500 h-full" style={{width: `${(task.subTasks.filter((s:any)=>s.completed).length / task.subTasks.length) * 100}%`}}></div>
            </div>
         )}
         <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
            <div className="flex items-center gap-2">
               {assignees.length > 0 ? (
                  <div className="flex items-center -space-x-2">
                     {assignees.slice(0, 3).map((user: any, idx: number) => (
                        <img
                           key={idx}
                           src={user.avatar || getUserAvatar(user.email, user.id || String(idx))}
                           alt={user.name}
                           className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 shadow-sm object-cover"
                           title={user.name}
                        />
                     ))}
                     {assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                           +{assignees.length - 3}
                        </div>
                     )}
                  </div>
               ) : (
                  <img src={task.assignee || getUserAvatar('default')} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 shadow-sm object-cover" />
               )}
               <div className={`p-1 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-400 border border-slate-100 dark:border-slate-600`}>{icon}</div>
            </div>
            <Badge variant={getPriorityColor(task.priority)} className="rounded-md px-1.5 py-0.5 text-[10px]">{task.priority}</Badge>
         </div>
      </div>
   );
};

// Table View Component
const TableView: React.FC<any> = ({ tasks, onTaskClick, getPriorityColor }) => {
   const [sortField, setSortField] = useState<string>('title');
   const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
   const [visibleColumns, setVisibleColumns] = useState<string[]>(['title', 'client', 'status', 'priority', 'assignees', 'dueDate']);

   const columns = [
      { id: 'title', label: 'Titre' },
      { id: 'client', label: 'Client' },
      { id: 'status', label: 'Statut' },
      { id: 'priority', label: 'Priorité' },
      { id: 'assignees', label: 'Assigné à' },
      { id: 'dueDate', label: 'Échéance' },
      { id: 'department', label: 'Département' },
   ];

   const handleSort = (field: string) => {
      if (sortField === field) {
         setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
         setSortField(field);
         setSortDirection('asc');
      }
   };

   const sortedTasks = [...tasks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'dueDate') {
         aVal = aVal ? new Date(aVal).getTime() : 0;
         bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
   });

   return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center justify-between">
               <h3 className="font-bold text-slate-800 dark:text-slate-200">Vue Tableau</h3>
               <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">Colonnes:</span>
                  {columns.map(col => (
                     <Checkbox
                        key={col.id}
                        label={col.label}
                        checked={visibleColumns.includes(col.id)}
                        onChange={(checked) => {
                           if (checked) {
                              setVisibleColumns([...visibleColumns, col.id]);
                           } else {
                              setVisibleColumns(visibleColumns.filter(c => c !== col.id));
                           }
                        }}
                        size="sm"
                        labelClassName="text-xs"
                        containerClassName="text-xs"
                     />
                  ))}
               </div>
            </div>
         </div>
         <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full">
               <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <tr>
                     {visibleColumns.includes('title') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('title')}>
                           Titre {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                     )}
                     {visibleColumns.includes('client') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('client')}>
                           Client {sortField === 'client' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                     )}
                     {visibleColumns.includes('status') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('status')}>
                           Statut {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                     )}
                     {visibleColumns.includes('priority') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('priority')}>
                           Priorité {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                     )}
                     {visibleColumns.includes('assignees') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">
                           Assigné à
                        </th>
                     )}
                     {visibleColumns.includes('dueDate') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('dueDate')}>
                           Échéance {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                     )}
                     {visibleColumns.includes('department') && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('department')}>
                           Département {sortField === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                     )}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sortedTasks.map((task: Task) => (
                     <tr key={task.id} onClick={() => onTaskClick(task)} className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                        {visibleColumns.includes('title') && (
                           <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{task.title}</td>
                        )}
                        {visibleColumns.includes('client') && (
                           <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{task.client}</td>
                        )}
                        {visibleColumns.includes('status') && (
                           <td className="px-4 py-3">
                              <Badge variant="default" className="text-xs">{task.status}</Badge>
                           </td>
                        )}
                        {visibleColumns.includes('priority') && (
                           <td className="px-4 py-3">
                              <Badge variant={getPriorityColor(task.priority)} className="text-xs">{task.priority}</Badge>
                           </td>
                        )}
                        {visibleColumns.includes('assignees') && (
                           <td className="px-4 py-3">
                              {task.assignees && task.assignees.length > 0 ? (
                                 <span className="text-xs text-slate-600 dark:text-slate-400">{task.assignees.length} utilisateur{task.assignees.length > 1 ? 's' : ''}</span>
                              ) : (
                                 <span className="text-xs text-slate-400">Non assigné</span>
                              )}
                           </td>
                        )}
                        {visibleColumns.includes('dueDate') && (
                           <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '-'}
                           </td>
                        )}
                        {visibleColumns.includes('department') && (
                           <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{task.department}</td>
                        )}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

// Workload View Component
const WorkloadView: React.FC<any> = ({ tasks, users }) => {
   const workloadData = users.map((user: any) => {
      const userTasks = tasks.filter((task: Task) => 
         (task.assignees && task.assignees.includes(user.id)) || task.assignee === user.id
      );
      const todoTasks = userTasks.filter((t: Task) => t.status === ProjectStatus.TODO).length;
      const inProgressTasks = userTasks.filter((t: Task) => t.status === ProjectStatus.IN_PROGRESS).length;
      const reviewTasks = userTasks.filter((t: Task) => t.status === ProjectStatus.REVIEW).length;
      const doneTasks = userTasks.filter((t: Task) => t.status === ProjectStatus.DONE).length;
      
      return {
         user,
         totalTasks: userTasks.length,
         todoTasks,
         inProgressTasks,
         reviewTasks,
         doneTasks,
      };
   });

   return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Charge de travail</h3>
         </div>
         <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="space-y-4">
               {workloadData.map((data: any) => (
                  <div key={data.user.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                     <div className="flex items-center gap-3 mb-4">
                        <img
                           src={data.user.avatar}
                           alt={data.user.name}
                           className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-600"
                        />
                        <div className="flex-1">
                           <h4 className="font-bold text-slate-800 dark:text-slate-200">{data.user.name}</h4>
                           <p className="text-xs text-slate-400">{data.user.email}</p>
                        </div>
                        <div className="text-right">
                           <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{data.totalTasks}</div>
                           <div className="text-xs text-slate-400">tâche{data.totalTasks > 1 ? 's' : ''}</div>
                        </div>
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2 text-center">
                           <div className="text-lg font-bold text-slate-600 dark:text-slate-400">{data.todoTasks}</div>
                           <div className="text-xs text-slate-500 dark:text-slate-500">À faire</div>
                        </div>
                        <div className="bg-primary-100 dark:bg-primary-500/20 rounded-lg p-2 text-center">
                           <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{data.inProgressTasks}</div>
                           <div className="text-xs text-indigo-500 dark:text-indigo-500">En cours</div>
                        </div>
                        <div className="bg-amber-100 dark:bg-amber-500/20 rounded-lg p-2 text-center">
                           <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{data.reviewTasks}</div>
                           <div className="text-xs text-amber-500 dark:text-amber-500">En révision</div>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-500/20 rounded-lg p-2 text-center">
                           <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{data.doneTasks}</div>
                           <div className="text-xs text-emerald-500 dark:text-emerald-500">Terminé</div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

// List View Component
const ListView: React.FC<any> = ({ tasks, onTaskClick, getPriorityColor, getDeptIcon, users, onStartTimer }) => {
   const [sortField, setSortField] = useState<string>('title');
   const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
   const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

   const columns = [
      { id: 'title', label: 'Titre', sortable: true },
      { id: 'client', label: 'Client', sortable: true },
      { id: 'status', label: 'Statut', sortable: true },
      { id: 'priority', label: 'Priorité', sortable: true },
      { id: 'assignees', label: 'Assigné à', sortable: false },
      { id: 'dueDate', label: 'Échéance', sortable: true },
      { id: 'department', label: 'Département', sortable: true },
   ];

   const handleSort = (field: string) => {
      if (sortField === field) {
         setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
         setSortField(field);
         setSortDirection('asc');
      }
   };

   const sortedTasks = [...tasks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'dueDate' || sortField === 'startDate') {
         aVal = aVal ? new Date(aVal).getTime() : 0;
         bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === 'string') {
         aVal = aVal.toLowerCase();
         bVal = (bVal || '').toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
   });

   const toggleExpand = (taskId: string) => {
      const newExpanded = new Set(expandedTasks);
      if (newExpanded.has(taskId)) {
         newExpanded.delete(taskId);
      } else {
         newExpanded.add(taskId);
      }
      setExpandedTasks(newExpanded);
   };

   const getTaskAssignees = (task: Task) => {
      if (task.assignees && task.assignees.length > 0) {
         return users.filter((u: any) => task.assignees?.includes(u.id));
      }
      if (task.assignee) {
         return [{ avatar: task.assignee, name: 'User', id: task.assignee }];
      }
      return [];
   };

   return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Vue Liste</h3>
         </div>
         <div className="flex-1 min-h-0 overflow-auto">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
               {sortedTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                     <p>Aucune tâche trouvée</p>
                  </div>
               ) : (
                  sortedTasks.map((task: Task) => {
                     const assignees = getTaskAssignees(task);
                     const isExpanded = expandedTasks.has(task.id);
                     const completedSubtasks = task.subTasks?.filter(s => s.completed).length || 0;
                     const totalSubtasks = task.subTasks?.length || 0;
                     
                     return (
                        <div 
                           key={task.id} 
                           className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                           <div 
                              className="p-4 flex items-center gap-4 cursor-pointer"
                              onClick={() => onTaskClick(task)}
                           >
                              {/* Expand/Collapse button */}
                              {task.subTasks && task.subTasks.length > 0 && (
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       toggleExpand(task.id);
                                    }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                                 >
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                 </button>
                              )}
                              
                              {/* Title and Client */}
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                       {task.title}
                                    </h4>
                                    {getDeptIcon && getDeptIcon(task.department)}
                                 </div>
                                 <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="truncate">{task.client}</span>
                                    {task.subTasks && task.subTasks.length > 0 && (
                                       <span className="flex items-center gap-1">
                                          <CheckSquare size={12} />
                                          {completedSubtasks}/{totalSubtasks}
                                       </span>
                                    )}
                                    {task.dueDate && (
                                       <span className="flex items-center gap-1">
                                          <CalendarIcon size={12} />
                                          {new Date(task.dueDate).toLocaleDateString('fr-FR', {
                                             day: 'numeric',
                                             month: 'short'
                                          })}
                                       </span>
                                    )}
                                    {task.estimatedTime && (
                                       <span className="flex items-center gap-1">
                                          <Clock size={12} />
                                          {task.estimatedTime}
                                       </span>
                                    )}
                                 </div>
                              </div>

                              {/* Assignees */}
                              <div className="flex items-center gap-2 shrink-0">
                                 {assignees.length > 0 ? (
                                    <div className="flex items-center -space-x-2">
                                       {assignees.slice(0, 3).map((user: any, idx: number) => (
                                          <img
                                             key={idx}
                                             src={user.avatar || getUserAvatar(user.email, user.id)}
                                             alt={user.name}
                                             className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-600 shadow-sm object-cover"
                                             title={user.name}
                                          />
                                       ))}
                                       {assignees.length > 3 && (
                                          <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                             +{assignees.length - 3}
                                          </div>
                                       )}
                                    </div>
                                 ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                       <UserIcon size={14} className="text-slate-400" />
                                    </div>
                                 )}
                              </div>

                              {/* Status and Priority */}
                              <div className="flex items-center gap-2 shrink-0">
                                 <Badge variant="default" className="text-xs">{task.status}</Badge>
                                 <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                 </Badge>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       onStartTimer(task.id, task.title);
                                    }}
                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded-lg transition-colors"
                                    title="Démarrer Timer"
                                 >
                                    <Play size={16} />
                                 </button>
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       onTaskClick(task);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                                 >
                                    <MoreHorizontal size={16} />
                                 </button>
                              </div>
                           </div>

                           {/* Expanded Subtasks */}
                           {isExpanded && task.subTasks && task.subTasks.length > 0 && (
                              <div className="px-4 pb-4 pl-12 bg-slate-50 dark:bg-slate-800/50">
                                 <div className="space-y-2">
                                    {task.subTasks.map((subtask) => (
                                       <div 
                                          key={subtask.id} 
                                          className="flex items-center gap-2 text-sm py-1.5 px-3 bg-white dark:bg-slate-700 rounded-lg"
                                       >
                                          <Checkbox 
                                             checked={subtask.completed} 
                                             onChange={() => {}}
                                             disabled
                                          />
                                          <span className={subtask.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}>
                                             {subtask.title}
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     );
                  })
               )}
            </div>
         </div>
      </div>
   );
};

// Gantt View Component
const GanttView: React.FC<any> = ({ tasks, onTaskClick, getPriorityColor, users }) => {
   const [zoomLevel, setZoomLevel] = useState<number>(7); // days per unit
   const [startDate, setStartDate] = useState<Date>(() => {
      const today = new Date();
      today.setDate(today.getDate() - 7);
      return today;
   });
   const ganttContainerRef = useRef<HTMLDivElement>(null);

   // Calculate date range
   const calculateDateRange = () => {
      if (tasks.length === 0) {
         return { minDate: new Date(), maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      }

      let minDate = new Date();
      let maxDate = new Date();

      tasks.forEach((task: Task) => {
         if (task.startDate) {
            const start = new Date(task.startDate);
            if (start < minDate) minDate = start;
         }
         if (task.dueDate) {
            const due = new Date(task.dueDate);
            if (due > maxDate) maxDate = due;
         }
      });

      // Add some padding
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 14);

      return { minDate, maxDate };
   };

   const { minDate, maxDate } = calculateDateRange();
   const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
   const visibleDays = Math.min(totalDays, zoomLevel * 20); // Show ~20 units at current zoom

   // Generate date headers
   const generateDateHeaders = () => {
      const headers = [];
      const currentDate = new Date(minDate);
      
      for (let i = 0; i < Math.min(visibleDays, totalDays); i++) {
         headers.push(new Date(currentDate));
         currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return headers;
   };

   const dateHeaders = generateDateHeaders();

   // Calculate task position and width
   const getTaskPosition = (task: Task) => {
      if (!task.startDate || !task.dueDate) {
         return { left: 0, width: 0 };
      }

      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.dueDate);
      
      const startDiff = Math.max(0, (taskStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
      
      const left = (startDiff / totalDays) * 100;
      const width = (duration / totalDays) * 100;
      
      return { left, width };
   };

   const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 1, 14));
   };

   const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev - 1, 1));
   };

   const getTaskAssignees = (task: Task) => {
      if (task.assignees && task.assignees.length > 0) {
         return users.filter((u: any) => task.assignees?.includes(u.id));
      }
      return [];
   };

   return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Vue Gantt</h3>
            <div className="flex items-center gap-2">
               <button
                  onClick={handleZoomOut}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Zoom arrière"
               >
                  <ZoomOut size={16} />
               </button>
               <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
                  {zoomLevel}j
               </span>
               <button
                  onClick={handleZoomIn}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Zoom avant"
               >
                  <ZoomIn size={16} />
               </button>
            </div>
         </div>
         
         <div className="flex-1 min-h-0 overflow-auto" ref={ganttContainerRef}>
            <div className="min-w-full">
               {/* Timeline Header */}
               <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex">
                     <div className="w-64 shrink-0 p-3 border-r border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Tâche</span>
                     </div>
                     <div className="flex-1 overflow-x-auto">
                        <div className="flex" style={{ width: `${totalDays * 40}px` }}>
                           {dateHeaders.map((date, idx) => (
                              <div
                                 key={idx}
                                 className="w-10 shrink-0 text-center border-r border-slate-200 dark:border-slate-700 p-2"
                              >
                                 <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {date.getDate()}
                                 </div>
                                 <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Tasks */}
               <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {tasks.length === 0 ? (
                     <div className="p-8 text-center text-slate-400">
                        <p>Aucune tâche trouvée</p>
                     </div>
                  ) : (
                     tasks.map((task: Task) => {
                        const { left, width } = getTaskPosition(task);
                        const assignees = getTaskAssignees(task);
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                        
                        return (
                           <div
                              key={task.id}
                              className="relative group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                           >
                              <div className="flex">
                                 {/* Task Info */}
                                 <div 
                                    className="w-64 shrink-0 p-3 border-r border-slate-200 dark:border-slate-700 cursor-pointer"
                                    onClick={() => onTaskClick(task)}
                                 >
                                    <div className="flex items-start justify-between gap-2">
                                       <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate mb-1">
                                             {task.title}
                                          </h4>
                                          <div className="flex items-center gap-2 flex-wrap">
                                             <Badge variant="default" className="text-[10px]">
                                                {task.status}
                                             </Badge>
                                             <Badge variant={getPriorityColor(task.priority)} className="text-[10px]">
                                                {task.priority}
                                             </Badge>
                                          </div>
                                          <div className="flex items-center gap-2 mt-2">
                                             {assignees.length > 0 && (
                                                <div className="flex items-center -space-x-1">
                                                   {assignees.slice(0, 2).map((user: any, idx: number) => (
                                                      <img
                                                         key={idx}
                                                         src={user.avatar || getUserAvatar(user.email, user.id)}
                                                         alt={user.name}
                                                         className="w-5 h-5 rounded-full border border-white dark:border-slate-600"
                                                         title={user.name}
                                                      />
                                                   ))}
                                                </div>
                                             )}
                                             {task.dueDate && (
                                                <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                   {new Date(task.dueDate).toLocaleDateString('fr-FR', {
                                                      day: 'numeric',
                                                      month: 'short'
                                                   })}
                                                </span>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Gantt Bar */}
                                 <div className="flex-1 relative overflow-hidden">
                                    <div className="absolute inset-0" style={{ width: `${totalDays * 40}px` }}>
                                       {task.startDate && task.dueDate && (
                                          <div
                                             className="absolute top-1/2 -translate-y-1/2 h-8 rounded-lg cursor-pointer transition-all hover:shadow-md hover:h-10"
                                             style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                minWidth: '20px',
                                                backgroundColor: isOverdue 
                                                   ? 'rgb(239 68 68)' 
                                                   : task.status === ProjectStatus.DONE
                                                   ? 'rgb(34 197 94)'
                                                   : task.status === ProjectStatus.IN_PROGRESS
                                                   ? 'rgb(59 130 246)'
                                                   : task.status === ProjectStatus.REVIEW
                                                   ? 'rgb(234 179 8)'
                                                   : 'rgb(148 163 184)',
                                             }}
                                             onClick={() => onTaskClick(task)}
                                             title={`${task.title} - ${new Date(task.startDate).toLocaleDateString('fr-FR')} au ${new Date(task.dueDate).toLocaleDateString('fr-FR')}`}
                                          >
                                             {width > 5 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold px-2 truncate pointer-events-none">
                                                   {task.title}
                                                </div>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};
