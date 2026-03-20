
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Briefcase, Users, Megaphone, Settings, Wallet,
  Hexagon, LogOut, Factory, ChevronLeft, ChevronRight, Calendar, Map, Plus,
  ChevronDown, Layout, Share2, Target, Video, Star, MessageSquare, Code2,
  Activity, BarChart3, Database, HardDrive, Radio, Layers
} from 'lucide-react';
import { ViewState } from '../types';
import { useApp } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import { Tooltip } from './ui/Tooltip';
import { Button } from './ui/Button';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile?: boolean;
  onOpenCreate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse, isMobile, onOpenCreate }) => {
  const { currentView, navigate, showToast, setProjectFilter } = useApp();
  const { signOut } = useAuth();
  const [studioExpanded, setStudioExpanded] = useState(false);
  const [gestionExpanded, setGestionExpanded] = useState(false);
  
  const studioItems = [
     { id: ViewState.PROJECTS, label: 'Tous les projets', icon: Layers },
     { id: ViewState.WEB_AGILE, label: 'Web & Tech', icon: Code2 },
     { id: ViewState.MARKETING, label: 'Marketing', icon: Target },
     { id: ViewState.ACQUISITION, label: 'Acquisition', icon: Megaphone },
     { id: ViewState.SOCIAL, label: 'Réseaux', icon: Share2 },
     { id: ViewState.LISTENING, label: 'Veille', icon: Radio },
     { id: ViewState.INFLUENCE, label: 'Influence', icon: Star },
     { id: ViewState.EVENTS, label: 'Événements', icon: Video },
  ];

  const gestionItems = [
    { id: ViewState.CRM, label: 'CRM & Ventes', icon: Database },
    { id: ViewState.PRODUCTION, label: 'Production', icon: Factory },
    { id: ViewState.FINANCE, label: 'Finance', icon: Wallet },
    { id: ViewState.HR, label: 'RH & Talents', icon: Users },
    { id: ViewState.ROADMAP, label: 'Feuille de route', icon: Map },
    { id: ViewState.REPORTING, label: 'Rapports', icon: BarChart3 },
  ];

  // Ouvrir automatiquement l'accordéon si un élément de la section est actif
  useEffect(() => {
    if (studioItems.some(i => i.id === currentView)) {
      setStudioExpanded(true);
    }
    if (gestionItems.some(i => i.id === currentView)) {
      setGestionExpanded(true);
    }
  }, [currentView]);
  
  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Déconnexion effectuée', 'success');
      // La redirection vers la page de login se fera automatiquement via AuthContext
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      showToast('Erreur lors de la déconnexion', 'error');
    }
  };

  const handleNav = (view: ViewState, filter?: string) => {
    if (filter) setProjectFilter(filter);
    else setProjectFilter(null);
    navigate(view);
    if (isMobile) toggleCollapse();
  };

  const dailyItems = [
     { id: ViewState.DASHBOARD, label: 'Tableau de bord', icon: LayoutDashboard },
     { id: ViewState.CHAT, label: 'Messagerie', icon: MessageSquare },
     { id: ViewState.AGENDA, label: 'Calendrier', icon: Calendar },
  ];

  const resourceItems = [
     { id: ViewState.DRIVE, label: 'Drive', icon: HardDrive },
  ];

  return (
    <div className="w-full h-full relative">
      <div className="w-full h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[30px] flex flex-col items-center border border-slate-200 dark:border-slate-700 shadow-md transition-all duration-500 overflow-hidden">
        
        {/* HEADER LOGO */}
        <div className={`${isCollapsed ? 'px-4 py-6' : 'p-6'} shrink-0 w-full flex flex-col items-center gap-6`}>
         <div 
           className="w-12 h-12 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center shadow-blue-lg text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 group"
           onClick={() => handleNav(ViewState.DASHBOARD)}
         >
            <Hexagon className="fill-white/20 group-hover:rotate-180 transition-all duration-500" size={24} />
         </div>

         {/* Global Create Button */}
         {isCollapsed ? (
            <Tooltip content="Nouveau projet" position="right">
               <Button 
                  onClick={onOpenCreate}
                  variant="secondary"
                  className="w-10 h-10 p-0 rounded-xl flex items-center justify-center"
               >
                  <Plus size={20} className="group-hover:rotate-90 transition-all duration-500" />
               </Button>
            </Tooltip>
         ) : (
            <Button 
               onClick={onOpenCreate}
               variant="secondary"
               fullWidth
               icon={Plus}
               className="rounded-xl"
            >
               Nouveau projet
            </Button>
         )}
      </div>

      {/* NAVIGATION LIST */}
      <div className="flex-1 w-full px-4 flex flex-col gap-1.5 overflow-y-auto overflow-x-visible custom-scrollbar pt-2 pb-4">
         
         {/* QUOTIDIEN */}
         {dailyItems.map((item) => (
            <SidebarItem key={item.id} item={item} isActive={currentView === item.id} isCollapsed={isCollapsed} onClick={() => handleNav(item.id)} />
         ))}

         {/* STUDIO (Operations) */}
         <div className="mt-4 mb-1">
            <button 
               onClick={() => !isCollapsed && setStudioExpanded(!studioExpanded)}
               className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-500 outline-none ${
                   studioItems.some(i => i.id === currentView) && !isCollapsed ? '' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
               }`}
            >
               {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Studio</span>}
               {isCollapsed && <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-2"></div>}
               {!isCollapsed && (
                  <ChevronDown size={12} className={`transition-all duration-500 ${studioExpanded ? 'rotate-180' : ''}`} />
               )}
            </button>

            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${studioExpanded || isCollapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
               <div className={`flex flex-col gap-1.5 ${isCollapsed ? 'items-center pt-2' : 'pl-1'}`}>
                  {studioItems.map(item => (
                     <SidebarItem key={item.id} item={item} isActive={currentView === item.id} isCollapsed={isCollapsed} onClick={() => handleNav(item.id)} />
                  ))}
               </div>
            </div>
         </div>

         {/* PILOTAGE */}
         <div className="mt-2 mb-1">
            <button 
               onClick={() => !isCollapsed && setGestionExpanded(!gestionExpanded)}
               className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-500 outline-none ${
                   gestionItems.some(i => i.id === currentView) && !isCollapsed ? '' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
               }`}
            >
               {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilotage</span>}
               {isCollapsed && <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-2"></div>}
               {!isCollapsed && (
                  <ChevronDown size={12} className={`transition-all duration-500 ${gestionExpanded ? 'rotate-180' : ''}`} />
               )}
            </button>

            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${gestionExpanded || isCollapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
               <div className={`flex flex-col gap-1.5 ${isCollapsed ? 'items-center pt-2' : 'pl-1'}`}>
                  {gestionItems.map(item => (
                     <SidebarItem key={item.id} item={item} isActive={currentView === item.id} isCollapsed={isCollapsed} onClick={() => handleNav(item.id)} />
                  ))}
               </div>
            </div>
         </div>

         {/* RESSOURCES */}
         <div className="mt-2 mb-1">
             {!isCollapsed && <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Ressources</div>}
             {isCollapsed && <div className="px-3 py-2"><div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-2"></div></div>}
             {resourceItems.map((item) => (
                <SidebarItem key={item.id} item={item} isActive={currentView === item.id} isCollapsed={isCollapsed} onClick={() => handleNav(item.id)} />
             ))}
         </div>

         <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
            <SidebarItem item={{ id: ViewState.SETTINGS, label: 'Paramètres', icon: Settings }} isActive={currentView === ViewState.SETTINGS} isCollapsed={isCollapsed} onClick={() => handleNav(ViewState.SETTINGS)} />
         </div>
      </div>

        {/* FOOTER */}
        <div className={`${isCollapsed ? 'px-4 py-4' : 'p-4'} w-full mt-auto shrink-0`}>
         {isCollapsed ? (
            <Tooltip content="Déconnexion" position="right">
               <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 dark:hover:text-rose-600 transition-all duration-500"
               >
                  <LogOut size={18} strokeWidth={2} />
               </button>
            </Tooltip>
         ) : (
            <Button onClick={handleLogout} variant="ghost" className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-400 group !justify-start">
               <LogOut size={20} className="group-hover:-translate-x-1 transition-all duration-500" />
               <span className="text-sm font-bold">Déconnexion</span>
            </Button>
         )}
        </div>
      </div>

      {/* TOGGLE BUTTON FIX: Added z-50, shadow-lg, and explicit styling */}
      {!isMobile && (
        <button 
           onClick={toggleCollapse}
           className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md z-50 flex items-center justify-center text-slate-500 hover:text-primary-600 hover:scale-110 transition-all duration-500 cursor-pointer"
           aria-label="Toggle Sidebar"
        >
           {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </div>
  );
};

const SidebarItem = ({ item, isActive, isCollapsed, onClick }: any) => {
   const ButtonContent = (
      <Button 
         onClick={onClick}
         variant="ghost"
         className={`relative group flex items-center ${isCollapsed ? 'justify-center' : '!justify-start'} gap-3 px-3 py-2.5 rounded-2xl transition-all duration-500 w-full overflow-visible focus:outline-none ${
            isActive 
            ? 'bg-primary-50 text-primary-600 shadow-sm dark:bg-primary-900/40 dark:text-primary-300' 
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80'
         }`}
      >
         <div className={`shrink-0 transition-all duration-500 ${isCollapsed ? '' : 'ml-0.5'} ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
           <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
         </div>
         
         {!isCollapsed && (
            <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-500 flex-1 min-w-0 pr-1 ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300'}`}>
               {item.label}
            </span>
         )}

         {isActive && !isCollapsed && (
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full"></div>
         )}
      </Button>
   );

   return isCollapsed ? (
      <Tooltip content={item.label} position="right">
         {ButtonContent}
      </Tooltip>
   ) : (
      ButtonContent
   );
};
