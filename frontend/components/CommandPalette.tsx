
import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, Layout, Plus, User, FileText, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useApp } from './contexts/AppContext';
import { ViewState } from '../types';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, isDarkMode, toggleDarkMode } = useAppStore();
  const { navigate, openGlobalCreate } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const actions = [
    { label: 'Aller au tableau de bord', icon: Layout, action: () => navigate(ViewState.DASHBOARD) },
    { label: 'Créer un projet', icon: Plus, action: () => openGlobalCreate() },
    { label: 'Voir les projets', icon: FileText, action: () => navigate(ViewState.PROJECTS) },
    { label: 'Annuaire équipe', icon: User, action: () => navigate(ViewState.HR) },
    { label: isDarkMode ? 'Mode clair' : 'Mode sombre', icon: isDarkMode ? Sun : Moon, action: () => toggleDarkMode() },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)}></div>
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="text-slate-400 w-5 h-5 mr-3" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400"
            placeholder="Tapez une commande..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">ESC</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
             <div className="p-4 text-center text-slate-500 text-sm">Aucun résultat</div>
          ) : (
             filtered.map((action, i) => (
                <button
                   key={i}
                   onClick={() => { action.action(); setCommandPaletteOpen(false); }}
                   className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-500 group text-left"
                >
                   <div className="flex items-center gap-3">
                      <action.icon size={16} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      <span>{action.label}</span>
                   </div>
                   <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                </button>
             ))
          )}
        </div>
      </div>
    </div>
  );
};
