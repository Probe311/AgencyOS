
import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { AiAssistant } from './components/AiAssistant';
import { GlobalCreateModal } from './components/GlobalCreateModal';
import { CommandPalette } from './components/CommandPalette';
import { GlobalTimer } from './components/GlobalTimer';
import { ViewState } from './types';
import { Loader } from './components/ui/Loader';
import { AppHeader } from './components/ui/AppHeader';
import { AppProvider, useApp } from './components/contexts/AppContext';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { Auth } from './components/Auth';
import { isAiAddonActive } from './lib/utils';
import { ReminderService } from './lib/services/reminderService';
import { useRole } from './lib/hooks/useRole';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { AccessibilitySettings } from './components/accessibility/AccessibilitySettings';

// Lazy Load Views
const DashboardView = React.lazy(() => import('./components/views/DashboardView').then(module => ({ default: module.DashboardView })));
const ProjectsView = React.lazy(() => import('./components/views/ProjectsView').then(module => ({ default: module.ProjectsView })));
const WebAgileView = React.lazy(() => import('./components/views/WebAgileView').then(module => ({ default: module.WebAgileView })));
const MarketingView = React.lazy(() => import('./components/views/MarketingView').then(module => ({ default: module.MarketingView })));
const CrmView = React.lazy(() => import('./components/views/CrmView').then(module => ({ default: module.CrmView })));
const SocialView = React.lazy(() => import('./components/views/SocialView').then(module => ({ default: module.SocialView })));
const FinanceView = React.lazy(() => import('./components/views/FinanceView').then(module => ({ default: module.FinanceView })));
const AcquisitionView = React.lazy(() => import('./components/views/AcquisitionView').then(module => ({ default: module.AcquisitionView })));
const SettingsView = React.lazy(() => import('./components/views/SettingsView').then(module => ({ default: module.SettingsView })));
const HrView = React.lazy(() => import('./components/views/HrView').then(module => ({ default: module.HrView })));
const RoadmapView = React.lazy(() => import('./components/views/RoadmapView').then(module => ({ default: module.RoadmapView })));
const ProductionView = React.lazy(() => import('./components/views/ProductionView').then(module => ({ default: module.ProductionView })));
const InfluenceView = React.lazy(() => import('./components/views/InfluenceView').then(module => ({ default: module.InfluenceView })));
const EventsView = React.lazy(() => import('./components/views/EventsView').then(module => ({ default: module.EventsView })));
const ChatView = React.lazy(() => import('./components/views/ChatView').then(module => ({ default: module.ChatView })));
const AgendaView = React.lazy(() => import('./components/views/AgendaView').then(module => ({ default: module.AgendaView })));
const DriveView = React.lazy(() => import('./components/views/DriveView').then(module => ({ default: module.DriveView })));
const ReportingView = React.lazy(() => import('./components/views/ReportingView').then(module => ({ default: module.ReportingView })));
const ListeningView = React.lazy(() => import('./components/views/ListeningView').then(module => ({ default: module.ListeningView })));

const PageLoader = () => (
  <div className="w-full h-full flex items-center justify-center">
    <Loader size={40} />
  </div>
);

const InnerApp: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { role: effectiveRole } = useRole();
  const { currentView } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isGlobalCreateOpen, setIsGlobalCreateOpen] = useState(false);
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);

  // Démarrer le service de rappels automatiques
  useEffect(() => {
    if (!user || authLoading) {
      return;
    }
    const stopReminderChecker = ReminderService.startReminderChecker(60); // Vérifier toutes les heures
    return () => {
      stopReminderChecker();
    };
  }, [user, authLoading]);
  const [hasAiAddon, setHasAiAddon] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsMobile(true);
        setIsSidebarCollapsed(true);
      } else {
        setIsMobile(false);
        setIsSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Vérifier l'état de l'add-on IA au chargement et lors des changements
  useEffect(() => {
    setHasAiAddon(isAiAddonActive());
    
    // Écouter les changements de localStorage pour mettre à jour en temps réel
    const handleStorageChange = () => {
      setHasAiAddon(isAiAddonActive());
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Écouter aussi les événements personnalisés pour les changements dans le même onglet
    window.addEventListener('ai-addon-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ai-addon-changed', handleStorageChange);
    };
  }, []);

  useEffect(() => {
     const handleOpenCreate = () => setIsGlobalCreateOpen(true);
     window.addEventListener('open-global-create', handleOpenCreate);
     return () => window.removeEventListener('open-global-create', handleOpenCreate);
  }, []);

  // Raccourci clavier pour l'accessibilité (Alt + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        setIsAccessibilityModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case ViewState.DASHBOARD: return <DashboardView />;
      case ViewState.PROJECTS: return <ProjectsView />;
      case ViewState.WEB_AGILE: return <WebAgileView />;
      case ViewState.MARKETING: return <MarketingView />;
      case ViewState.CRM: return <CrmView />;
      case ViewState.SOCIAL: return <SocialView />;
      case ViewState.FINANCE: return <FinanceView />;
      case ViewState.ACQUISITION: return <AcquisitionView />;
      case ViewState.SETTINGS: return <SettingsView />;
      case ViewState.HR: return <HrView />;
      case ViewState.ROADMAP: return <RoadmapView />;
      case ViewState.PRODUCTION: return <ProductionView />;
      case ViewState.INFLUENCE: return <InfluenceView />;
      case ViewState.EVENTS: return <EventsView />;
      case ViewState.CHAT: return <ChatView />;
      case ViewState.AGENDA: return <AgendaView />;
      case ViewState.DRIVE: return <DriveView />;
      case ViewState.REPORTING: return <ReportingView />;
      case ViewState.LISTENING: return <ListeningView />;
      default: return <DashboardView />;
    }
  };

  // Afficher le loader pendant le chargement de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Loader size={40} />
      </div>
    );
  }

  // Afficher la page d'authentification si l'utilisateur n'est pas connecté
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-[#f0f7ff] dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 selection:bg-primary-100 selection:text-primary-900">
       <CommandPalette />
       <GlobalTimer />
       
       <aside 
          className={`
             fixed inset-y-0 left-0 z-50 transition-all duration-500
             ${isMobile 
                ? (isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0 w-64') 
                : (isSidebarCollapsed ? 'w-24' : 'w-72')
             }
             p-4 h-full
          `}
       >
          <Sidebar 
             isCollapsed={!isMobile && isSidebarCollapsed} 
             toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
             isMobile={isMobile}
             onOpenCreate={() => setIsGlobalCreateOpen(true)}
          />
       </aside>

       {isMobile && !isSidebarCollapsed && (
          <div 
             className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
             onClick={() => setIsSidebarCollapsed(true)}
          ></div>
       )}

       <main 
         className={`
            flex-1 h-full flex flex-col transition-all duration-500
            ${!isMobile ? (isSidebarCollapsed ? 'ml-24' : 'ml-72') : ''}
            p-4
         `}
         style={{ maxWidth: '-webkit-fill-available' }}
       >
          <AppHeader 
            isMobile={isMobile}
            onMenuClick={() => setIsSidebarCollapsed(false)}
          />

          <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2 relative">
             <Suspense fallback={<PageLoader />}>
                {renderView()}
             </Suspense>
          </div>
       </main>

       {hasAiAddon && <AiAssistant />}
       <GlobalCreateModal isOpen={isGlobalCreateOpen} onClose={() => setIsGlobalCreateOpen(false)} />
       <PWAInstallPrompt />
       <OfflineIndicator />
       <AccessibilitySettings isOpen={isAccessibilityModalOpen} onClose={() => setIsAccessibilityModalOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <InnerApp />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
