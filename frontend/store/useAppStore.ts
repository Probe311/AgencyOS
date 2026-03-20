
import { create } from 'zustand';
import { Task, ProjectStatus, ViewState } from '../types';

interface AppState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Timer State
  activeTimer: { taskId: string; startTime: number; taskTitle: string } | null;
  startTimer: (taskId: string, taskTitle: string) => void;
  stopTimer: () => void;

  // Command Palette
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (isOpen: boolean) => void;

  // Tasks (Migrating from Context slowly)
  tasks: Task[];
  updateTaskStatus: (taskId: string, newStatus: ProjectStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  toggleDarkMode: () => set((state) => {
    if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark');
    }
    return { isDarkMode: !state.isDarkMode };
  }),

  activeTimer: null,
  startTimer: (taskId, taskTitle) => set({ activeTimer: { taskId, startTime: Date.now(), taskTitle } }),
  stopTimer: () => set({ activeTimer: null }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),

  tasks: [],
  updateTaskStatus: (taskId, newStatus) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
  })),
}));
