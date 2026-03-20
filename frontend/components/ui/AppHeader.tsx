import React, { useState } from 'react';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { SearchResults } from '../SearchResults';
import { NotificationPanel } from '../NotificationPanel';
import { useApp } from '../contexts/AppContext';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../../lib/hooks/useRole';
import { getUserAvatar } from '../../lib/utils/avatar';
import { ViewState, SearchResultItem } from '../../types';

interface AppHeaderProps {
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  isMobile = false, 
  onMenuClick 
}) => {
  const { user } = useAuth();
  const { navigate, tasks, leads, employees, productionProjects, users, notifications } = useApp();
  const { isDarkMode, toggleDarkMode } = useAppStore();
  const { role: effectiveRole } = useRole();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Get current user from context or fallback if empty
  const currentUser = user && users.length > 0 
    ? users.find(u => u.id === user.id) || users[0]
    : users.length > 0 
    ? users[0] 
    : { name: 'Utilisateur', avatar: getUserAvatar('User') };
  
  // Récupérer l'avatar (priorité: avatar_url Supabase > avatar > génération par email)
  const userAvatar = (currentUser as any)?.avatar_url || (currentUser as any)?.avatar || 
    getUserAvatar(user?.email, 'User');
  
  // Utiliser le rôle effectif (SuperAdmin si UUID correspond, sinon le rôle de la DB)
  const displayRole = effectiveRole || (currentUser as any)?.role || 'Manager';
  const displayName = (currentUser as any)?.name || user?.email?.split('@')[0] || 'Admin';

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results: SearchResultItem[] = [];
    
    // Search Tasks (Real Data)
    tasks.forEach(t => {
       if (t.title.toLowerCase().includes(query.toLowerCase())) {
          results.push({ id: t.id, title: t.title, subtitle: `Task • ${t.client}`, type: 'Tâche' });
       }
    });

    // Search Leads (Real Data)
    leads.forEach(l => {
       if (l.name.toLowerCase().includes(query.toLowerCase()) || l.company.toLowerCase().includes(query.toLowerCase())) {
          results.push({ id: l.id, title: l.name, subtitle: `Lead • ${l.company}`, type: 'Lead' });
       }
    });

    // Search Employees (Real Data)
    employees.forEach(e => {
       if (e.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ id: e.id, title: e.name, subtitle: `Employee • ${e.position}`, type: 'Employé' });
       }
    });

    // Search Projects (Real Data)
    productionProjects.forEach(p => {
       if (p.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ id: p.id, title: p.name, subtitle: `Project • ${p.client}`, type: 'Projet' });
       }
    });

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleSearchResultSelect = (item: SearchResultItem) => {
     setShowSearchResults(false);
     setSearchQuery('');
     if (item.type === 'Tâche' || item.type === 'Projet') navigate(ViewState.PROJECTS);
     if (item.type === 'Lead') navigate(ViewState.CRM);
     if (item.type === 'Employé') navigate(ViewState.HR);
  };

  return (
    <header className="h-20 shrink-0 flex items-center justify-between px-4 mb-2">
      <div className="flex items-center gap-4 flex-1">
        {isMobile && onMenuClick && (
          <button 
            onClick={onMenuClick} 
            className="p-2 bg-white rounded-xl shadow-sm text-slate-500"
          >
            <Menu size={20} />
          </button>
        )}
        
        <div className="relative z-30 w-full max-w-md">
          <SearchBar 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher un projet, une tâche, un lead ... (Cmd+K)" 
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          {showSearchResults && (
            <>
              <SearchResults results={searchResults} onSelect={handleSearchResultSelect} />
              <div className="fixed inset-0 z-20" onClick={() => setShowSearchResults(false)}></div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleDarkMode}
          className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl text-slate-500 hover:text-amber-500 hover:bg-white shadow-sm transition-all duration-500"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl text-slate-500 hover:text-primary-600 hover:bg-white shadow-sm transition-all duration-500 group"
        >
          <Bell size={20} className="group-hover:animate-swing" />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
          )}
        </button>
        
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setShowNotifications(false)}></div>
            <NotificationPanel onClose={() => setShowNotifications(false)} />
          </>
        )}

        <div 
          onClick={() => navigate(ViewState.SETTINGS)}
          className="hidden md:flex items-center gap-3 pl-2 pr-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-primary-200 dark:hover:border-primary-500/30 hover:shadow-md transition-all duration-500 group"
        >
          <div className="relative">
            <img 
              src={userAvatar} 
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-primary-300 dark:group-hover:ring-primary-500/50 transition-all duration-500" 
              alt="Profile" 
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-all duration-500">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {displayRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

