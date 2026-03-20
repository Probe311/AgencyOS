import React, { useState } from 'react';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, Plus, MoreHorizontal, 
  Edit2, Trash2, Archive, ArchiveRestore, FolderPlus, Briefcase
} from 'lucide-react';
import { Workspace, Folder as FolderType, Project } from '../../types';
import { useWorkspaces } from '../../lib/supabase/hooks/useWorkspaces';
import { useFolders } from '../../lib/supabase/hooks/useFolders';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface ProjectHierarchyProps {
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
  onArchiveProject?: (projectId: string) => void;
  onRestoreProject?: (projectId: string) => void;
  showArchived?: boolean;
}

export const ProjectHierarchy: React.FC<ProjectHierarchyProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onArchiveProject,
  onRestoreProject,
  showArchived = false,
}) => {
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaces();
  const { folders, addFolder, updateFolder, deleteFolder, getFoldersTree } = useFolders();
  
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ type: 'workspace' | 'folder' | 'project', id: string, x: number, y: number } | null>(null);
  
  // Modal states
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Partial<Workspace>>({});
  const [editingFolder, setEditingFolder] = useState<Partial<FolderType & { workspaceId?: string, parentFolderId?: string }>>({});

  const toggleWorkspace = (workspaceId: string) => {
    const newExpanded = new Set(expandedWorkspaces);
    if (newExpanded.has(workspaceId)) {
      newExpanded.delete(workspaceId);
    } else {
      newExpanded.add(workspaceId);
    }
    setExpandedWorkspaces(newExpanded);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateWorkspace = () => {
    setEditingWorkspace({ name: '', color: '#6366f1' });
    setIsWorkspaceModalOpen(true);
  };

  const handleCreateFolder = (workspaceId?: string, parentFolderId?: string) => {
    setEditingFolder({ name: '', workspaceId, parentFolderId, color: '#8b5cf6' });
    setIsFolderModalOpen(true);
  };

  const handleSaveWorkspace = async () => {
    if (!editingWorkspace.name) return;
    
    if (editingWorkspace.id) {
      await updateWorkspace(editingWorkspace.id, editingWorkspace);
    } else {
      await addWorkspace({
        name: editingWorkspace.name,
        description: editingWorkspace.description,
        color: editingWorkspace.color || '#6366f1',
        icon: editingWorkspace.icon,
      });
    }
    setIsWorkspaceModalOpen(false);
    setEditingWorkspace({});
  };

  const handleSaveFolder = async () => {
    if (!editingFolder.name) return;
    
    if (editingFolder.id) {
      await updateFolder(editingFolder.id, editingFolder);
    } else {
      await addFolder({
        name: editingFolder.name,
        description: editingFolder.description,
        workspaceId: editingFolder.workspaceId,
        parentFolderId: editingFolder.parentFolderId,
        color: editingFolder.color || '#8b5cf6',
        icon: editingFolder.icon,
        position: 0,
      });
    }
    setIsFolderModalOpen(false);
    setEditingFolder({});
  };

  const getProjectsByFolder = (folderId: string) => {
    return projects.filter(p => p.folderId === folderId && (!p.archived || showArchived));
  };

  const getProjectsByWorkspace = (workspaceId: string) => {
    return projects.filter(p => p.workspaceId === workspaceId && !p.folderId && (!p.archived || showArchived));
  };

  const renderFolder = (folder: FolderType, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderProjects = getProjectsByFolder(folder.id);
    const childFolders = folders.filter(f => f.parentFolderId === folder.id);

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
            selectedProjectId && folderProjects.some(p => p.id === selectedProjectId) ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <button
            onClick={() => toggleFolder(folder.id)}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Folder size={16} className="text-slate-500" style={{ color: folder.color }} />
          <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {folder.name}
          </span>
          <span className="text-xs text-slate-400">{folderProjects.length}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateFolder(undefined, folder.id);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
              title="Créer un sous-dossier"
            >
              <FolderPlus size={12} />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="ml-4">
            {childFolders.map(child => renderFolder(child, level + 1))}
            {folderProjects.map(project => renderProject(project, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderProject = (project: Project, level: number = 0) => {
    const isSelected = project.id === selectedProjectId;
    
    return (
      <div
        key={project.id}
        onClick={() => onSelectProject(project.id)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
          isSelected ? 'bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <Briefcase size={14} className="text-slate-400" />
        <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
          {project.name}
        </span>
        {project.archived && (
          <Archive size={12} className="text-slate-400" />
        )}
      </div>
    );
  };

  const renderWorkspace = (workspace: Workspace) => {
    const isExpanded = expandedWorkspaces.has(workspace.id);
    const workspaceProjects = getProjectsByWorkspace(workspace.id);
    const workspaceFolders = getFoldersTree(workspace.id);

    return (
      <div key={workspace.id} className="mb-2">
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer group"
          style={{ backgroundColor: isExpanded ? `${workspace.color}15` : undefined }}
        >
          <button
            onClick={() => toggleWorkspace(workspace.id)}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: workspace.color }}
          />
          <span className="flex-1 font-bold text-sm text-slate-800 dark:text-slate-200">
            {workspace.name}
          </span>
          <span className="text-xs text-slate-400">
            {workspaceProjects.length + workspaceFolders.reduce((acc, f) => acc + getProjectsByFolder(f.id).length, 0)}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateFolder(workspace.id);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
              title="Créer un dossier"
            >
              <FolderPlus size={12} />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {workspaceFolders.map(folder => renderFolder(folder, 0))}
            {workspaceProjects.map(project => renderProject(project, 0))}
          </div>
        )}
      </div>
    );
  };

  // Projets sans workspace ni folder
  const rootProjects = projects.filter(p => !p.workspaceId && !p.folderId && (!p.archived || showArchived));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Organisation</h3>
        <Button size="sm" icon={Plus} onClick={handleCreateWorkspace}>
          Espace
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
        {workspaces.map(workspace => renderWorkspace(workspace))}
        
        {rootProjects.length > 0 && (
          <div className="mt-4">
            <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase mb-1">
              Projets non organisés
            </div>
            {rootProjects.map(project => renderProject(project, 0))}
          </div>
        )}
      </div>

      {/* Workspace Modal */}
      <Modal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        title={editingWorkspace.id ? "Modifier l'espace" : "Nouvel espace"}
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={editingWorkspace.name || ''}
            onChange={(e) => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
            placeholder="Nom de l'espace"
            required
          />
          <Textarea
            label="Description"
            value={editingWorkspace.description || ''}
            onChange={(e) => setEditingWorkspace({ ...editingWorkspace, description: e.target.value })}
            placeholder="Description (optionnel)"
          />
          <Input
            label="Couleur"
            type="color"
            value={editingWorkspace.color || '#6366f1'}
            onChange={(e) => setEditingWorkspace({ ...editingWorkspace, color: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsWorkspaceModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveWorkspace}>
              {editingWorkspace.id ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title={editingFolder.id ? "Modifier le dossier" : "Nouveau dossier"}
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={editingFolder.name || ''}
            onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
            placeholder="Nom du dossier"
            required
          />
          <Textarea
            label="Description"
            value={editingFolder.description || ''}
            onChange={(e) => setEditingFolder({ ...editingFolder, description: e.target.value })}
            placeholder="Description (optionnel)"
          />
          <Input
            label="Couleur"
            type="color"
            value={editingFolder.color || '#8b5cf6'}
            onChange={(e) => setEditingFolder({ ...editingFolder, color: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsFolderModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveFolder}>
              {editingFolder.id ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

