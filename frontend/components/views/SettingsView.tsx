
import React, { useState, useEffect } from 'react';
import { 
  User, Shield, CreditCard, Bell, Lock, Mail, Building, 
  MoreHorizontal, Plus, Search, Check, Trash2, Zap, Star, Briefcase, Plug, RefreshCw, HardDrive, Radio,
  BrainCircuit, Sparkles, CheckCircle2, Key, Eye, EyeOff, Copy, Database, Save, Camera, Link, Smartphone,
  Github, Slack, Linkedin, Instagram, Facebook, Twitter, MessageSquare, BarChart3, CloudLightning, Image as ImageIcon, Mic, FileText,
  ChevronUp, ChevronDown, Workflow, Network, Youtube, CircleDot, MessageCircle, ShoppingBag, ShoppingCart, Send
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../../lib/hooks/useRole';
import { isSuperAdmin as checkIsSuperAdmin } from '../../lib/config/roles';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Loader } from '../ui/Loader';
import { getApiKey, saveApiKey } from '../../lib/api-keys';
import { isAiAddonActive, setAiAddonActive } from '../../lib/utils';
import { LogOut, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarManager } from '../calendar/CalendarManager';
import { useIntegrations } from '../../lib/supabase/hooks';
import { createIntegrationService } from '../../lib/services/integrations';
import { TwoFactorAuth } from '../security/TwoFactorAuth';
import { ClientsView } from '../admin/ClientsView';
import { WebhooksView } from '../integrations/WebhooksView';
import { getUserAvatar, generateAvatar } from '../../lib/utils/avatar';
import { CompanySettingsForm } from '../settings/CompanySettingsForm';
import { PageLayout } from '../ui/PageLayout';
import { Settings } from 'lucide-react';
import { PermissionsManager } from '../admin/PermissionsManager';
import { AccessibilitySettings } from '../accessibility/AccessibilitySettings';
import { Accessibility } from 'lucide-react';
import { AccessibilityService } from '../../lib/services/accessibilityService';
import { TeamsManager } from '../admin/TeamsManager';
import { ActivityLogsView } from '../admin/ActivityLogsView';
import { SAMLConfiguration } from '../admin/SAMLConfiguration';
import { DeviceManager } from '../admin/DeviceManager';
import { IntelligentSuggestions } from '../ai/IntelligentSuggestions';
import { PredictiveAnalysis } from '../ai/PredictiveAnalysis';
import { Brain } from 'lucide-react';
import { PWASettings } from '../pwa/PWASettings';
import { TimezoneService, COMMON_TIMEZONES } from '../../lib/services/timezoneService';

// Provided defaults
const DEFAULT_SUPABASE_URL = 'https://kxxmfqxllkaezxxrsijz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eG1mcXhsbGthZXp4eHJzaWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjczMzQxNCwiZXhwIjoyMDgyMzA5NDE0fQ.XswvPm_NbfgZXGD07Xj7e7_Ndy_8l1K67gsd8_9RTg8';

export const SettingsView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'billing' | 'profile' | 'integrations' | 'api' | 'calendar' | 'security' | 'saml' | 'clients' | 'webhooks' | 'database' | 'data-management' | 'accessibility' | 'logs' | 'ai-suggestions' | 'predictive-analysis' | 'pwa'>('profile');
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);

  return (
    <PageLayout
      header={{
        icon: Settings,
        iconBgColor: "bg-slate-100 dark:bg-slate-900/20",
        iconColor: "text-slate-600 dark:text-slate-400",
        title: "Paramètres",
        description: "Gérez votre équipe, vos abonnements et les modules de l'agence"
      }}
      sidebar={
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
          <nav className="space-y-1">
              {/* Compte utilisateur */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Compte utilisateur</h3>
                <SettingsTab isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label="Mon profil" />
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 mx-4"></div>
              
              {/* Paramètres de l'agence */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Paramètres de l'agence</h3>
                <SettingsTab isActive={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={Building} label="Profil agence" />
                <SettingsTab isActive={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={User} label="Équipe & Rôles" />
                <SettingsTab isActive={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} icon={Shield} label="Permissions" />
                <SettingsTab isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={CalendarIcon} label="Calendriers" />
                <SettingsTab isActive={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={CreditCard} label="Offre & Facturation" />
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 mx-4"></div>
              
              {/* Intégrations & Services */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Intégrations & Services</h3>
                <SettingsTab isActive={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={BrainCircuit} label="Intelligences artificielles" />
                <SettingsTab isActive={activeTab === 'ai-suggestions'} onClick={() => setActiveTab('ai-suggestions')} icon={Sparkles} label="Suggestions intelligentes" />
                <SettingsTab isActive={activeTab === 'predictive-analysis'} onClick={() => setActiveTab('predictive-analysis')} icon={Brain} label="Analyse prédictive" />
                <SettingsTab isActive={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} icon={Plug} label="Services & Intégrations" />
                <SettingsTab isActive={activeTab === 'webhooks'} onClick={() => setActiveTab('webhooks')} icon={Zap} label="Webhooks" />
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 mx-4"></div>
              
              {/* Sécurité & Administration */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Sécurité & Administration</h3>
                <SettingsTab isActive={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={Shield} label="Sécurité & 2FA" />
                <SettingsTab isActive={activeTab === 'saml'} onClick={() => setActiveTab('saml')} icon={Shield} label="SSO SAML" />
                <SettingsTab isActive={activeTab === 'devices'} onClick={() => setActiveTab('devices')} icon={Smartphone} label="Appareils" />
                <SettingsTab isActive={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={Building} label="Clients (Multi-tenant)" />
                <SettingsTab isActive={activeTab === 'database'} onClick={() => setActiveTab('database')} icon={Database} label="Base de données" />
                <SettingsTab isActive={activeTab === 'data-management'} onClick={() => setActiveTab('data-management')} icon={Trash2} label="Gestion des données" />
                <SettingsTab isActive={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={FileText} label="Logs d'activité" />
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 mx-4"></div>
              
              {/* Accessibilité */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Accessibilité</h3>
                <SettingsTab isActive={activeTab === 'accessibility'} onClick={() => setActiveTab('accessibility')} icon={Accessibility} label="Accessibilité" />
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 mx-4"></div>
              
              {/* Application */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Application</h3>
                <SettingsTab isActive={activeTab === 'pwa'} onClick={() => setActiveTab('pwa')} icon={Smartphone} label="Application mobile" />
              </div>
            </nav>
        </div>
      }
      sidebarProps={{
        width: 'w-64'
      }}
      sidebarPosition="left"
      className="max-w-[1600px] mx-auto"
    >
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
          {activeTab === 'team' && <TeamsManager />}
          {activeTab === 'permissions' && <PermissionsManager />}
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'calendar' && <CalendarManager />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'profile' && <UserProfileSettings />}
          {activeTab === 'integrations' && <IntegrationsSettings />}
          {activeTab === 'api' && <ApiKeysSettings />}
          {activeTab === 'ai-suggestions' && <IntelligentSuggestions />}
          {activeTab === 'predictive-analysis' && <PredictiveAnalysis />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'clients' && <ClientsSettings />}
          {activeTab === 'webhooks' && <WebhooksSettings />}
          {activeTab === 'database' && <DatabaseSettings />}
          {activeTab === 'data-management' && <DataManagementSettings />}
          {activeTab === 'accessibility' && <AccessibilityTabContent onOpenModal={() => setIsAccessibilityModalOpen(true)} />}
          {activeTab === 'logs' && <ActivityLogsView />}
          {activeTab === 'saml' && <SAMLConfiguration />}
          {activeTab === 'devices' && <DeviceManager />}
          {activeTab === 'pwa' && <PWASettings />}
        </div>
        <AccessibilitySettings isOpen={isAccessibilityModalOpen} onClose={() => setIsAccessibilityModalOpen(false)} />
    </PageLayout>
  );
};

const AccessibilityTabContent: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const preferences = AccessibilityService.getPreferences();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Accessibilité</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Personnalisez l'interface pour une meilleure accessibilité selon vos besoins.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Contraste élevé</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {preferences.highContrast ? 'Activé' : 'Désactivé'}
          </p>
          <Button onClick={onOpenModal} variant="outline">
            Configurer
          </Button>
        </div>
        
        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Mouvement réduit</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {preferences.reducedMotion ? 'Activé' : 'Désactivé'}
          </p>
          <Button onClick={onOpenModal} variant="outline">
            Configurer
          </Button>
        </div>
        
        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Taille de police</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {preferences.fontSize === 'normal' ? 'Normal' : preferences.fontSize === 'large' ? 'Grand' : 'Très grand'}
          </p>
          <Button onClick={onOpenModal} variant="outline">
            Configurer
          </Button>
        </div>
        
        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Navigation clavier</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {preferences.keyboardNavigation ? 'Activé' : 'Désactivé'}
          </p>
          <Button onClick={onOpenModal} variant="outline">
            Configurer
          </Button>
        </div>
      </div>
      
      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Raccourci clavier</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          Appuyez sur <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-sm font-mono">Alt</kbd> + <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-sm font-mono">A</kbd> pour ouvrir les paramètres d'accessibilité.
        </p>
      </div>
    </div>
  );
};

const SettingsTab = ({ isActive, onClick, icon: Icon, label }: any) => (
  <Button
    onClick={onClick}
    variant="ghost"
    className={`w-full !justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-500 ${
      isActive 
        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700' 
        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <Icon size={18} className="shrink-0" />
    <span className="truncate flex-1 min-w-0 text-left">{label}</span>
  </Button>
);

const UserProfileSettings = () => {
   const { showToast, users, updateUser } = useApp();
   const { signOut, user: authUser } = useAuth();
   const { role: effectiveRole, isSuperAdmin } = useRole();
   const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   
   // Trouver l'utilisateur connecté dans la liste, ou utiliser le premier
   const currentUser = authUser && users.length > 0
      ? users.find(u => u.id === authUser.id) || users[0]
      : users.length > 0
      ? users[0]
      : { id: '1', name: 'Admin', email: 'admin@agency.os', avatar: getUserAvatar('Admin'), role: 'Admin' };

   // Utiliser le rôle effectif (SuperAdmin si UUID correspond, sinon le rôle de la DB)
   const currentRole = effectiveRole || (currentUser as any).role || 'Admin';

   // Récupérer l'avatar (priorité: avatar_url Supabase > avatar > génération par email)
   const getInitialAvatar = () => {
      if ((currentUser as any)?.avatar_url) return (currentUser as any).avatar_url;
      if ((currentUser as any)?.avatar) return (currentUser as any).avatar;
      return getUserAvatar(authUser?.email, 'Admin');
   };

   // State pour les champs contrôlés
   const [name, setName] = useState((currentUser as any).name || authUser?.email?.split('@')[0] || '');
   const [email, setEmail] = useState((currentUser as any).email || authUser?.email || '');
   const [phone, setPhone] = useState(''); // Le téléphone n'est pas dans le type User actuel, on le garde pour l'UI
   const [avatar, setAvatar] = useState(getInitialAvatar());
   const [timezone, setTimezone] = useState((currentUser as any).timezone || TimezoneService.detectBrowserTimezone());

   // Mettre à jour les états quand l'utilisateur change
   useEffect(() => {
      const userToUse = authUser && users.length > 0
         ? users.find(u => u.id === authUser.id) || users[0]
         : users.length > 0
         ? users[0]
         : null;
      
      if (userToUse) {
         setName(userToUse.name || authUser?.email?.split('@')[0] || '');
         setEmail(userToUse.email || authUser?.email || '');
         // Utiliser avatar_url si disponible (format Supabase) sinon avatar
         const newAvatar = (userToUse as any).avatar_url || userToUse.avatar || 
            getUserAvatar(authUser?.email, 'Admin');
         setAvatar(newAvatar);
         setTimezone((userToUse as any).timezone || TimezoneService.detectBrowserTimezone());
      }
   }, [users, authUser]);

   const avatarSeeds = ['Felix', 'Aneka', 'Bandit', 'Coco', 'Dixie', 'Bear', 'Gizmo', 'Harley', 'Loki', 'Mia', 'Oreo', 'Pepper'];

   const handleSelectAvatar = async (seed: string) => {
      const newAvatar = generateAvatar(seed, 'b6e3f4,c0aede,d1d4f9');
      setAvatar(newAvatar);
      
      if (users.length > 0) {
         try {
            // Sauvegarder l'avatar avec toutes les informations du profil (nom, email, rôle)
            // Le rôle est récupéré depuis la base de données via currentRole
            await updateUser({
               ...currentUser as any,
               name: name.trim() || (currentUser as any).name,
               email: email.trim() || (currentUser as any).email,
               avatar: newAvatar,
               avatar_url: newAvatar, // Synchroniser aussi avatar_url pour Supabase
               role: currentRole as any
            });
            showToast('Avatar mis à jour avec succès', 'success');
         } catch (error) {
            console.error('Erreur lors de la sauvegarde de l\'avatar:', error);
            showToast('Erreur lors de la sauvegarde de l\'avatar', 'error');
         }
      } else {
         showToast('Mode démo : avatar mis à jour localement', 'info');
      }
      setIsAvatarModalOpen(false);
   };

   const handleSaveProfile = async () => {
      if (!name.trim() || !email.trim()) {
         showToast('Veuillez remplir le nom et l\'email', 'error');
         return;
      }

      if (users.length === 0) {
         showToast('Aucun utilisateur trouvé', 'error');
         return;
      }

      setIsSaving(true);
      try {
         // Sauvegarder toutes les informations du profil : nom, email, avatar, timezone et rôle
         // Le rôle est récupéré depuis la base de données via currentRole
           await updateUser({
              ...currentUser as any,
              name: name.trim(),
              email: email.trim(),
              avatar: avatar,
              avatar_url: avatar, // Synchroniser aussi avatar_url pour Supabase
              timezone: timezone,
              role: currentRole as any
           });
         showToast('Profil mis à jour avec succès', 'success');
      } catch (error) {
         console.error('Erreur lors de la sauvegarde du profil:', error);
         showToast('Erreur lors de la sauvegarde du profil', 'error');
      } finally {
         setIsSaving(false);
      }
   };

   return (
     <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Mon profil</h2>
        <div className="flex items-start gap-6">
           <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <img src={avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-slate-700 object-cover bg-slate-100" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                 <Camera className="text-white" size={24} />
              </div>
           </div>
           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                 label="Nom complet" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 containerClassName="text-slate-900 dark:text-white" 
              />
              <Input 
                 label="Email" 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 containerClassName="text-slate-900 dark:text-white" 
              />
              <Dropdown
                 label="Fuseau horaire"
                 value={timezone}
                 onChange={(value) => setTimezone(value)}
                 options={COMMON_TIMEZONES.map(tz => ({
                    value: tz.timezone,
                    label: `${tz.name} (${tz.offset})`
                 }))}
                 helpText={`Fuseau horaire détecté : ${TimezoneService.detectBrowserTimezone()}`}
                 containerClassName="text-slate-900 dark:text-white"
              />
              <div className="flex flex-col gap-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Rôle</label>
                 <div className="flex items-center gap-2">
                    <Badge
                       className={`text-xs border ${
                          currentRole === 'SuperAdmin'
                             ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                             : currentRole === 'Admin'
                             ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                             : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                       }`}
                    >
                       {currentRole}
                    </Badge>
                    {isSuperAdmin && (
                       <span className="text-xs text-slate-500 dark:text-slate-400">(SuperAdmin unique)</span>
                    )}
                 </div>
              </div>
              <Input 
                 label="Téléphone" 
                 type="tel" 
                 placeholder="+33 1 23 45 67 89" 
                 value={phone}
                 onChange={(e) => setPhone(e.target.value)}
                 containerClassName="text-slate-900 dark:text-white" 
              />
           </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
           <Button 
              onClick={async () => {
                 try {
                    showToast('Déconnexion en cours...', 'info');
                    await signOut();
                    // La redirection vers la page de login se fera automatiquement via AuthContext
                 } catch (error) {
                    console.error('Erreur lors de la déconnexion:', error);
                    showToast('Erreur lors de la déconnexion', 'error');
                 }
              }}
              variant="danger"
              icon={LogOut}
           >
              Se déconnecter
           </Button>
           <Button 
              onClick={handleSaveProfile} 
              variant="secondary"
              disabled={isSaving}
           >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
           </Button>
        </div>

        {/* Avatar Modal */}
        <Modal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} title="Choisir un avatar" size="md">
           <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
              {avatarSeeds.map(seed => (
                 <button 
                   key={seed}
                   onClick={() => handleSelectAvatar(seed)}
                   className="rounded-full overflow-hidden border-4 border-transparent hover:border-indigo-500 hover:scale-105 transition-all duration-500 p-1"
                 >
                    <img 
                      src={generateAvatar(seed, 'b6e3f4,c0aede,d1d4f9')} 
                      alt={seed}
                      className="w-full h-auto bg-slate-100 rounded-full"
                    />
                 </button>
              ))}
           </div>
        </Modal>
     </div>
   );
}

const BillingSettings = () => {
   const { showToast, users } = useApp();
   const [userSeats, setUserSeats] = useState<{standard: number, pro: number, ai: number}>({ 
      standard: Math.max(0, users.length - 1), 
      pro: 1,
      ai: isAiAddonActive() ? 1 : 0
   });
   const [expandedLicenses, setExpandedLicenses] = useState<Set<'standard' | 'pro' | 'ai'>>(new Set(['standard', 'pro', 'ai']));
   
   const BASE_PRICE = 59;
   const USER_PRICE_STANDARD = 6;
   const USER_PRICE_PRO = 12;
   const USER_PRICE_AI = 6;

   const totalUsers = userSeats.standard + userSeats.pro;
   const totalAmount = BASE_PRICE + (userSeats.standard * USER_PRICE_STANDARD) + (userSeats.pro * USER_PRICE_PRO) + (userSeats.ai * USER_PRICE_AI);

   const standardFeatures = [
      'Gestion de projets & tâches',
      'Vues Kanban & Liste',
      'CRM & Pipeline commercial',
      'Chat interne & canaux',
      'Time tracker',
      'Calendrier & Agenda'
   ];

   const proFeatures = [
      'Toutes les fonctionnalités Standard',
      'Vue Gantt avancée',
      'Documents & Drive',
      'Dashboard & rapports avancés',
      'Export PDF/CSV',
      'Analytics & métriques détaillées',
      'Gestion avancée des permissions',
      'Workflows personnalisables'
   ];

   const aiFeatures = [
      'Chat IA (JARVIS) - Analyse & assistance',
      'Robot de prospection IA',
      'Génération de contenu IA',
      'Analyse de sentiment IA',
      'Génération d\'emails commerciaux IA',
      'Sous-tâches générées par IA',
      'Suggestions intelligentes de tâches',
      'Résumé automatique de documents'
   ];

   return (
      <div className="space-y-8">
         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Abonnement agence</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Facturation mensuelle centralisée</p>
               </div>
               <Badge variant="success">Actif</Badge>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-6 rounded-xl border border-slate-100 dark:border-slate-700 mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-xl flex items-center justify-center">
                     <Building size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 dark:text-white">Plan Agence (Base)</h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400">Inclus toutes les fonctionnalités cœur.</p>
                  </div>
               </div>
               <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{BASE_PRICE}€</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">/ mois</span>
               </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Licences utilisateurs</h3>
            <div className="space-y-4 mb-8">
               {/* Standard License */}
               <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800">
                  <div className="flex justify-between items-center mb-3">
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <User size={16} className="text-slate-400" />
                           <span className="font-bold text-slate-700 dark:text-slate-200">Utilisateur Standard</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Fonctionnalités essentielles de gestion</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                           <span className="block font-bold text-slate-900 dark:text-white">{USER_PRICE_STANDARD}€</span>
                           <span className="text-[10px] text-slate-500 dark:text-slate-400">/ user / mois</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                           <button onClick={() => setUserSeats(p => ({...p, standard: Math.max(0, p.standard - 1)}))} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300">-</button>
                           <span className="w-6 text-center font-bold text-sm dark:text-white">{userSeats.standard}</span>
                           <button onClick={() => setUserSeats(p => ({...p, standard: p.standard + 1}))} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300">+</button>
                        </div>
                        <button 
                           onClick={() => {
                              const newSet = new Set(expandedLicenses);
                              if (newSet.has('standard')) {
                                 newSet.delete('standard');
                              } else {
                                 newSet.add('standard');
                              }
                              setExpandedLicenses(newSet);
                           }}
                           className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                           {expandedLicenses.has('standard') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                     </div>
                  </div>
                  {expandedLicenses.has('standard') && (
                     <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Fonctionnalités incluses :</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {standardFeatures.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                 <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                 <span>{feature}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  )}
               </div>

               {/* Pro License */}
               <div className="p-4 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-xl bg-indigo-50/20 dark:bg-indigo-900/10">
                  <div className="flex justify-between items-center mb-3">
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                           <span className="font-bold text-indigo-900 dark:text-indigo-300">Utilisateur Pro</span>
                        </div>
                        <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70">Fonctionnalités avancées avec IA</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                           <span className="block font-bold text-indigo-900 dark:text-indigo-300">{USER_PRICE_PRO}€</span>
                           <span className="text-[10px] text-indigo-700/70 dark:text-indigo-400/70">/ user / mois</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg p-1 border border-indigo-100 dark:border-slate-600">
                           <button onClick={() => setUserSeats(p => ({...p, pro: Math.max(0, p.pro - 1)}))} className="w-6 h-6 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-slate-600 rounded text-indigo-600 dark:text-indigo-300">-</button>
                           <span className="w-6 text-center font-bold text-sm text-indigo-900 dark:text-indigo-300">{userSeats.pro}</span>
                           <button onClick={() => setUserSeats(p => ({...p, pro: p.pro + 1}))} className="w-6 h-6 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-slate-600 rounded text-indigo-600 dark:text-indigo-300">+</button>
                        </div>
                        <button 
                           onClick={() => {
                              const newSet = new Set(expandedLicenses);
                              if (newSet.has('pro')) {
                                 newSet.delete('pro');
                              } else {
                                 newSet.add('pro');
                              }
                              setExpandedLicenses(newSet);
                           }}
                           className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                        >
                           {expandedLicenses.has('pro') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                     </div>
                  </div>
                  {expandedLicenses.has('pro') && (
                     <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-700">
                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2 uppercase tracking-wider">Fonctionnalités incluses :</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {proFeatures.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-indigo-700 dark:text-indigo-400">
                                 <CheckCircle2 size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                                 <span>{feature}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  )}
               </div>

               {/* AI Add-on */}
               <div className="p-4 border border-purple-200 dark:border-purple-800/50 rounded-xl bg-purple-50/30 dark:bg-purple-900/10">
                  <div className="flex justify-between items-center mb-3">
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <BrainCircuit size={16} className="text-purple-600 dark:text-purple-400" />
                           <span className="font-bold text-purple-900 dark:text-purple-300">Add-on IA</span>
                        </div>
                        <p className="text-xs text-purple-700/70 dark:text-purple-400/70">Fonctionnalités d'intelligence artificielle</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                           <span className="block font-bold text-purple-900 dark:text-purple-300">{USER_PRICE_AI}€</span>
                           <span className="text-[10px] text-purple-700/70 dark:text-purple-400/70">/ user / mois</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg p-1 border border-purple-100 dark:border-slate-600">
                           <button onClick={() => {
                              const newSeats = { ...userSeats, ai: Math.max(0, userSeats.ai - 1) };
                              setUserSeats(newSeats);
                              setAiAddonActive(newSeats.ai > 0);
                           }} className="w-6 h-6 flex items-center justify-center hover:bg-purple-50 dark:hover:bg-slate-600 rounded text-purple-600 dark:text-purple-300">-</button>
                           <span className="w-6 text-center font-bold text-sm text-purple-900 dark:text-purple-300">{userSeats.ai}</span>
                           <button onClick={() => {
                              const newSeats = { ...userSeats, ai: userSeats.ai + 1 };
                              setUserSeats(newSeats);
                              setAiAddonActive(newSeats.ai > 0);
                           }} className="w-6 h-6 flex items-center justify-center hover:bg-purple-50 dark:hover:bg-slate-600 rounded text-purple-600 dark:text-purple-300">+</button>
                        </div>
                        <button 
                           onClick={() => {
                              const newSet = new Set(expandedLicenses);
                              if (newSet.has('ai')) {
                                 newSet.delete('ai');
                              } else {
                                 newSet.add('ai');
                              }
                              setExpandedLicenses(newSet);
                           }}
                           className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                        >
                           {expandedLicenses.has('ai') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                     </div>
                  </div>
                  {expandedLicenses.has('ai') && (
                     <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-700">
                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2 uppercase tracking-wider">Fonctionnalités incluses :</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {aiFeatures.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-purple-700 dark:text-purple-400">
                                 <CheckCircle2 size={14} className="text-purple-500 mt-0.5 shrink-0" />
                                 <span>{feature}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  )}
               </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
               <div className="mb-4 md:mb-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prochaine facture le <span className="font-bold text-slate-800 dark:text-white">1er octobre 2024</span></p>
                  <p className="text-xs text-slate-400 mt-1">{totalUsers} licence{totalUsers > 1 ? 's' : ''} active{totalUsers > 1 ? 's' : ''} {userSeats.ai > 0 && `+ ${userSeats.ai} add-on IA`}</p>
               </div>
               <div className="flex items-center gap-6">
                  <div className="text-right">
                     <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalAmount}€</span>
                     <span className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-1">/ mois</span>
                  </div>
                  <Button onClick={() => {
                     // Sauvegarder l'état de l'add-on IA
                     setAiAddonActive(userSeats.ai > 0);
                     showToast('Abonnement mis à jour', 'success');
                  }}>Enregistrer</Button>
               </div>
            </div>
         </div>
      </div>
   );
};

// ====================================================================
// NOUVEAUX COMPOSANTS POUR API & INTEGRATIONS
// ====================================================================

const SecuritySettings = () => {
  const { user: authUser } = useAuth();
  const { users } = useApp();
  const currentUser = authUser && users.length > 0
    ? users.find(u => u.id === authUser.id) || users[0]
    : users.length > 0
    ? users[0]
    : null;

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <Loader size={40} />
        <div className="text-slate-400 dark:text-slate-500">Chargement...</div>
      </div>
    );
  }

  return (
    <TwoFactorAuth userId={currentUser.id} userEmail={currentUser.email || ''} />
  );
};

const ClientsSettings = () => {
  return <ClientsView />;
};

const WebhooksSettings = () => {
  return <WebhooksView />;
};

const DatabaseSettings = () => {
   const { showToast } = useApp();
   const { isSuperAdmin: isUserSuperAdmin } = useRole();
   const [showKey, setShowKey] = useState<Record<string, boolean>>({});
   const [supabaseUrl, setSupabaseUrl] = useState('');
   const [supabaseKey, setSupabaseKey] = useState('');

   useEffect(() => {
      const storedUrl = localStorage.getItem('agencyos_supabase_url');
      const storedKey = localStorage.getItem('agencyos_supabase_key');
      setSupabaseUrl(storedUrl || DEFAULT_SUPABASE_URL);
      setSupabaseKey(storedKey || DEFAULT_SUPABASE_KEY);
   }, []);

   const handleSaveSupabase = () => {
      if (!isUserSuperAdmin) {
         showToast('Seul le SuperAdmin peut modifier la configuration Supabase', 'error');
         return;
      }
      
      if (supabaseUrl && supabaseKey) {
         localStorage.setItem('agencyos_supabase_url', supabaseUrl);
         localStorage.setItem('agencyos_supabase_key', supabaseKey);
         showToast('Configuration sauvegardée. Rechargement...', 'success');
         setTimeout(() => window.location.reload(), 1500);
      } else {
         showToast('Veuillez remplir l\'URL et la Clé', 'error');
      }
   };

   const toggleShow = (id: string) => {
      setShowKey(prev => ({...prev, [id]: !prev[id]}));
   };

   return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
               <Database size={24} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-900 dark:text-white">Base de données (Supabase)</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400">Infrastructure de l'application. Requis pour le stockage</p>
            </div>
         </div>

         {!isUserSuperAdmin && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
               <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ Seul le SuperAdmin peut modifier la configuration Supabase.
               </p>
            </div>
         )}
         <div className="space-y-4">
            <Input 
               label="Supabase URL" 
               placeholder="https://xyz.supabase.co" 
               value={supabaseUrl}
               onChange={(e) => setSupabaseUrl(e.target.value)}
               disabled={!isUserSuperAdmin}
            />
            <div className="relative">
               <Input 
                  label="Supabase Service Role / Anon Key" 
                  type={showKey['supabase'] ? "text" : "password"} 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  disabled={!isUserSuperAdmin}
               />
               <button 
                  onClick={() => toggleShow('supabase')}
                  className="absolute right-3 top-[38px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  disabled={!isUserSuperAdmin}
               >
                  {showKey['supabase'] ? <EyeOff size={16} /> : <Eye size={16} />}
               </button>
            </div>
            {isUserSuperAdmin && (
               <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveSupabase} icon={Save}>Enregistrer & Recharger</Button>
               </div>
            )}
         </div>
      </div>
   );
};

const DataManagementSettings = () => {
  const { showToast, leads, deleteAllLeads } = useApp();
  const { isSuperAdmin } = useRole();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteAllLeads = async () => {
    if (confirmText !== 'SUPPRIMER') {
      showToast('Veuillez taper "SUPPRIMER" pour confirmer', 'error');
      return;
    }

    setIsDeleting(true);
    const leadsCount = leads.length;
    try {
      await deleteAllLeads();
      showToast(`Tous les leads (${leadsCount}) ont été supprimés avec succès`, 'success');
      setIsDeleteModalOpen(false);
      setConfirmText('');
    } catch (error) {
      console.error('Erreur lors de la suppression des leads:', error);
      showToast('Erreur lors de la suppression des leads', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
            <Trash2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gestion des données</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Actions de gestion et de nettoyage des données</p>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ Seuls les administrateurs peuvent effectuer ces actions.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/20">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Supprimer tous les leads</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cette action supprimera définitivement tous les {leads.length} lead{leads.length > 1 ? 's' : ''} existant{leads.length > 1 ? 's' : ''}. Cette action est irréversible.
                </p>
              </div>
              <Button 
                onClick={() => setIsDeleteModalOpen(true)}
                variant="danger"
                disabled={!isSuperAdmin || leads.length === 0}
                icon={Trash2}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConfirmText('');
        }} 
        title="Confirmer la suppression de tous les leads"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400 font-bold mb-2">
              ⚠️ Attention : Cette action est irréversible !
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              Vous êtes sur le point de supprimer <strong>{leads.length} lead{leads.length > 1 ? 's' : ''}</strong> de manière permanente. 
              Toutes les données associées seront également supprimées.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Pour confirmer, tapez <strong className="text-red-600 dark:text-red-400">SUPPRIMER</strong> :
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setConfirmText('');
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAllLeads}
              disabled={isDeleting || confirmText !== 'SUPPRIMER'}
              icon={Trash2}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer tous les leads'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ApiKeysSettings = () => {
   const { showToast } = useApp();
   const [showKey, setShowKey] = useState<Record<string, boolean>>({});
   const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

   const aiModels = [
      { id: 'google', name: 'Google Gemini', desc: 'Moteur principal (Texte & Analyse)', icon: 'G', color: 'bg-blue-500', status: 'Actif' },
      { id: 'openai', name: 'OpenAI (GPT-4)', desc: 'Génération de contenu complexe', icon: 'O', color: 'bg-emerald-600', status: 'Connecté' },
      { id: 'anthropic', name: 'Anthropic (Claude)', desc: 'Analyse longue et raisonnement', icon: 'A', color: 'bg-amber-600', status: 'Déconnecté' },
      { id: 'midjourney', name: 'Midjourney', desc: 'Génération d\'images artistiques', icon: 'M', color: 'bg-indigo-600', status: 'Déconnecté' },
      { id: 'elevenlabs', name: 'ElevenLabs', desc: 'Synthèse vocale (TTS)', icon: 'E', color: 'bg-slate-700', status: 'Déconnecté' },
      { id: 'mistral', name: 'Mistral AI', desc: 'Modèles Open Source performants', icon: 'Mi', color: 'bg-orange-500', status: 'Déconnecté' },
      { id: 'groq', name: 'Groq', desc: 'Modèle IA performant (GRATUIT)', icon: 'Go', color: 'bg-purple-600', status: 'Déconnecté' },
      { id: 'openrouter', name: 'OpenRouter', desc: 'Accès à plusieurs modèles IA (GPT-4, Claude, etc.)', icon: 'OR', color: 'bg-cyan-600', status: 'Déconnecté' },
   ];

   useEffect(() => {
      // Load API keys from localStorage or env
      const keys: Record<string, string> = {};
      aiModels.forEach(model => {
         const stored = getApiKey(model.id);
         if (stored) keys[model.id] = stored;
      });
      setApiKeys(keys);
   }, []);

   const handleSaveApiKeys = () => {
      let savedCount = 0;
      Object.entries(apiKeys).forEach(([service, key]) => {
         if (key && typeof key === 'string' && key.trim()) {
            saveApiKey(service, key.trim());
            savedCount++;
         } else {
            // Remove key if empty
            localStorage.removeItem(`agencyos_api_key_${service.toLowerCase()}`);
         }
      });
      showToast(`${savedCount} clé(s) API sauvegardée(s)`, 'success');
   };

   const handleApiKeyChange = (serviceId: string, value: string) => {
      setApiKeys(prev => ({
         ...prev,
         [serviceId]: value
      }));
   };

   const toggleShow = (id: string) => {
      setShowKey(prev => ({...prev, [id]: !prev[id]}));
   };

   return (
      <div className="space-y-8">
         {/* AI Models Config */}
         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BrainCircuit size={24} />
               </div>
               <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Moteurs IA & Clés API</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Gérez les connexions aux services d'intelligence artificielle</p>
               </div>
            </div>

            <div className="space-y-6">
               {aiModels.map(model => (
                  <div key={model.id} className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-700/20">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm ${model.color}`}>
                              {model.icon}
                           </div>
                           <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                 {model.name}
                                 {model.status === 'Actif' && <Badge variant="success">Principal</Badge>}
                                 {model.status === 'Connecté' && <Badge variant="info">Connecté</Badge>}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{model.desc}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><RefreshCw size={14}/></Button>
                        </div>
                     </div>
                     <div className="relative">
                        <Input 
                           type={showKey[model.id] ? "text" : "password"} 
                           placeholder={`Clé API ${model.name}...`} 
                           className="bg-white dark:bg-slate-800 !py-2 !text-xs"
                           value={apiKeys[model.id] || ''}
                           onChange={(e) => handleApiKeyChange(model.id, e.target.value)}
                        />
                        <button 
                           onClick={() => toggleShow(model.id)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                        >
                           {showKey[model.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                     </div>
                  </div>
               ))}
               <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveApiKeys} icon={Save}>Enregistrer les clés</Button>
               </div>
            </div>
         </div>
      </div>
   );
};

const IntegrationsSettings = () => { 
   const { showToast, users } = useApp();
   const { integrations, loading, toggleIntegration, updateIntegration, addIntegration } = useIntegrations();
   
   const categories = [
      { id: 'Réseaux Sociaux', label: 'Réseaux Sociaux', icon: MessageSquare },
      { id: 'Publicité', label: 'Publicité', icon: CloudLightning },
      { id: 'Productivité & Dev', label: 'Productivité & Dev', icon: Zap },
      { id: 'Finance & CRM', label: 'Finance & CRM', icon: CreditCard },
      { id: 'Automatisation', label: 'Automatisation', icon: Workflow },
   ];

   const availableIntegrations = [
      // Réseaux Sociaux
      { provider: 'linkedin' as const, name: 'LinkedIn', category: 'Réseaux Sociaux' as const, icon: Linkedin, color: 'text-blue-700' },
      { provider: 'instagram' as const, name: 'Instagram', category: 'Réseaux Sociaux' as const, icon: Instagram, color: 'text-pink-600' },
      { provider: 'twitter' as const, name: 'X (Twitter)', category: 'Réseaux Sociaux' as const, icon: Twitter, color: 'text-slate-800 dark:text-white' },
      { provider: 'tiktok' as const, name: 'TikTok', category: 'Réseaux Sociaux' as const, icon: Smartphone, color: 'text-black dark:text-white' },
      { provider: 'youtube' as const, name: 'YouTube', category: 'Réseaux Sociaux' as const, icon: Youtube, color: 'text-red-600' },
      { provider: 'pinterest' as const, name: 'Pinterest', category: 'Réseaux Sociaux' as const, icon: CircleDot, color: 'text-red-500' },
      { provider: 'snapchat' as const, name: 'Snapchat', category: 'Réseaux Sociaux' as const, icon: Camera, color: 'text-yellow-500' },
      { provider: 'reddit' as const, name: 'Reddit', category: 'Réseaux Sociaux' as const, icon: MessageCircle, color: 'text-orange-600' },
      { provider: 'discord' as const, name: 'Discord', category: 'Réseaux Sociaux' as const, icon: MessageSquare, color: 'text-indigo-500' },
      { provider: 'telegram' as const, name: 'Telegram', category: 'Réseaux Sociaux' as const, icon: Send, color: 'text-blue-500' },
      // Publicité
      { provider: 'google_ads' as const, name: 'Google Ads', category: 'Publicité' as const, icon: Search, color: 'text-red-500' },
      { provider: 'meta_ads' as const, name: 'Meta Ads', category: 'Publicité' as const, icon: Facebook, color: 'text-blue-600' },
      { provider: 'microsoft_ads' as const, name: 'Microsoft Advertising', category: 'Publicité' as const, icon: Search, color: 'text-blue-700' },
      { provider: 'amazon_ads' as const, name: 'Amazon Ads', category: 'Publicité' as const, icon: ShoppingBag, color: 'text-orange-600' },
      { provider: 'linkedin_ads' as const, name: 'LinkedIn Ads', category: 'Publicité' as const, icon: Linkedin, color: 'text-blue-700' },
      { provider: 'twitter_ads' as const, name: 'Twitter Ads (X Ads)', category: 'Publicité' as const, icon: Twitter, color: 'text-slate-800 dark:text-white' },
      // Productivité & Dev
      { provider: 'slack' as const, name: 'Slack', category: 'Productivité & Dev' as const, icon: Slack, color: 'text-purple-600' },
      { provider: 'notion' as const, name: 'Notion', category: 'Productivité & Dev' as const, icon: FileText, color: 'text-slate-800 dark:text-white' },
      { provider: 'github' as const, name: 'GitHub', category: 'Productivité & Dev' as const, icon: Github, color: 'text-slate-900 dark:text-white' },
      // Finance & CRM
      { provider: 'stripe' as const, name: 'Stripe', category: 'Finance & CRM' as const, icon: CreditCard, color: 'text-indigo-600' },
      { provider: 'hubspot' as const, name: 'HubSpot', category: 'Finance & CRM' as const, icon: Database, color: 'text-orange-500' },
      // Automatisation
      { provider: 'zapier' as const, name: 'Zapier', category: 'Automatisation' as const, icon: Zap, color: 'text-orange-600' },
      { provider: 'make' as const, name: 'Make (Integromat)', category: 'Automatisation' as const, icon: Workflow, color: 'text-blue-500' },
   ];

   const [filterCat, setFilterCat] = useState('all');
   const [connecting, setConnecting] = useState<string | null>(null);

   // Merge available integrations with saved ones
   const integrationsList = availableIntegrations.map(avail => {
      const saved = integrations.find(i => i.provider === avail.provider);
      return {
         ...avail,
         id: saved?.id || avail.provider,
         status: saved?.status || 'Déconnecté',
         enabled: saved?.enabled || false,
         accountName: saved?.accountName,
      };
   });

   const filteredIntegrations = filterCat === 'all' 
      ? integrationsList 
      : integrationsList.filter(i => i.category === filterCat);

   const handleConnect = async (provider: typeof availableIntegrations[0]['provider']) => {
      const service = createIntegrationService(provider);
      if (!service) {
         showToast('Configuration OAuth manquante pour ce service', 'error');
         return;
      }

      setConnecting(provider);
      try {
         const state = `${provider}_${Date.now()}`;
         const authUrl = service.getAuthUrl(state);
         localStorage.setItem(`oauth_state_${provider}`, state);
         window.location.href = authUrl;
      } catch (error) {
         console.error('Error initiating OAuth:', error);
         showToast('Erreur lors de la connexion', 'error');
         setConnecting(null);
      }
   };

   const handleToggle = async (integrationId: string, currentEnabled: boolean, provider: typeof availableIntegrations[0]['provider']) => {
      if (!currentEnabled) {
         // Connect
         await handleConnect(provider);
      } else {
         // Disconnect
         try {
            await toggleIntegration(integrationId, false);
            showToast('Intégration désactivée', 'success');
         } catch (error) {
            console.error('Error toggling integration:', error);
            showToast('Erreur lors de la désactivation', 'error');
         }
      }
   };

   // Handle OAuth callback
   useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const provider = urlParams.get('provider') || state?.split('_')[0];

      if (code && provider && state) {
         const savedState = localStorage.getItem(`oauth_state_${provider}`);
         if (savedState === state) {
            handleOAuthCallback(provider, code);
            localStorage.removeItem(`oauth_state_${provider}`);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
         }
      }
   }, []);

   const handleOAuthCallback = async (provider: string, code: string) => {
      const service = createIntegrationService(provider as any);
      if (!service) {
         showToast('Service non disponible', 'error');
         return;
      }

      try {
         const tokenData = await service.exchangeCodeForToken(code);
         const existing = integrations.find(i => i.provider === provider);
         const currentUser = users[0]?.id;
         const avail = availableIntegrations.find(a => a.provider === provider);

         if (existing) {
            await updateIntegration(existing.id, {
               accessToken: tokenData.accessToken,
               refreshToken: tokenData.refreshToken,
               tokenExpiresAt: tokenData.expiresIn 
                  ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
                  : undefined,
               accountId: tokenData.accountId,
               accountName: tokenData.accountName,
               accountAvatar: tokenData.accountAvatar,
               status: 'Connecté',
               enabled: true,
            });
         } else if (avail) {
            await addIntegration({
               provider: avail.provider,
               name: avail.name,
               category: avail.category,
               status: 'Connecté',
               enabled: true,
               accessToken: tokenData.accessToken,
               refreshToken: tokenData.refreshToken,
               tokenExpiresAt: tokenData.expiresIn 
                  ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
                  : undefined,
               accountId: tokenData.accountId,
               accountName: tokenData.accountName,
               accountAvatar: tokenData.accountAvatar,
               createdBy: currentUser,
            });
         }
         showToast(`${avail?.name || provider} connecté avec succès`, 'success');
      } catch (error) {
         console.error('Error handling OAuth callback:', error);
         showToast('Erreur lors de la connexion', 'error');
      }
   };

   if (loading) {
      return (
         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col items-center gap-3">
               <Loader size={40} />
               <p className="text-slate-500 dark:text-slate-400">Chargement des intégrations...</p>
            </div>
         </div>
      );
   }

   return ( 
      <div className="space-y-6"> 
         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"> 
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Services tiers</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Connectez vos outils pour synchroniser les données</p>
               </div>
               <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-500 ${filterCat === 'all' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Tous</button>
                  {categories.map(c => (
                     <button key={c.id} onClick={() => setFilterCat(c.id)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-500 ${filterCat === c.id ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{c.label}</button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> 
               {filteredIntegrations.map((app) => {
                  const isConnected = app.status === 'Connecté' && app.enabled;
                  const isConnecting = connecting === app.provider;
                  
                  return (
                     <div key={app.id} className={`p-5 rounded-2xl border transition-all duration-500 flex flex-col justify-between h-32 ${isConnected ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-slate-600'}`}> 
                        <div className="flex justify-between items-start"> 
                           <div className="flex items-center gap-3"> 
                              <div className={`p-2 rounded-lg bg-white dark:bg-slate-700 shadow-sm ${app.color}`}> 
                                 <app.icon size={20} /> 
                              </div> 
                              <div> 
                                 <h3 className="font-bold text-slate-900 dark:text-white text-sm">{app.name}</h3> 
                                 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{app.category}</span> 
                              </div> 
                           </div> 
                           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                        </div> 
                        
                        <div className="flex justify-between items-center pt-2">
                           <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {isConnecting ? 'Connexion...' : (app.accountName || app.status)}
                           </span>
                           <div 
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-500 cursor-pointer ${isConnected ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              onClick={() => !isConnecting && handleToggle(app.id, app.enabled, app.provider)}
                           > 
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-500 ${isConnected ? 'translate-x-5' : 'translate-x-1'}`} /> 
                           </div> 
                        </div>
                     </div>
                  );
               })} 
            </div> 
         </div> 
      </div> 
   ); 
};

const TeamSettings = () => {
  const { showToast, users, updateUser } = useApp();
  const { user: authUser } = useAuth();
  const { role, canManageRoles, canModifyUserRole, getAvailableRoles, isSuperAdmin } = useRole();
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const availableRoles = getAvailableRoles();
  const canManage = canManageRoles();

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!canModifyUserRole(userId, newRole as any)) {
      showToast('Vous n\'avez pas les permissions pour modifier ce rôle', 'error');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      await updateUser({
        ...targetUser,
        role: newRole as any,
      });
      showToast('Rôle mis à jour avec succès', 'success');
      setEditingRole(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      showToast('Erreur lors de la mise à jour du rôle', 'error');
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'SuperAdmin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'Admin':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'Manager':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'Éditeur':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Membres Équipe</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {canManage ? 'Gérez les rôles et permissions des membres' : 'Consultez les membres de l\'équipe'}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => showToast('Invitation envoyée', 'success')} icon={Plus}>
            Inviter Membre
          </Button>
        )}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {users.map((user) => {
          const isCurrentUser = authUser?.id === user.id;
          const canModify = canModifyUserRole(user.id, user.role);
          const isEditing = editingRole === user.id;
          
          // Récupérer l'avatar (priorité: avatar_url Supabase > avatar > génération par email)
          const userAvatar = (user as any)?.avatar_url || user.avatar || getUserAvatar(user.email, user.name);

          return (
            <div key={user.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500">
              <div className="flex items-center gap-4 flex-1">
                <img
                  src={userAvatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover bg-slate-100"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    {isCurrentUser && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">(Vous)</span>
                    )}
                    {checkIsSuperAdmin(user.id) && (
                      <Badge variant="info" className="text-xs">SuperAdmin</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                    {user.email}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Dropdown
                        value={selectedRole}
                        onChange={(value) => setSelectedRole(value)}
                        className="text-xs"
                        options={availableRoles.map((r) => ({ value: r, label: r }))}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRoleChange(user.id, selectedRole)}
                        disabled={!selectedRole || selectedRole === user.role}
                      >
                        Enregistrer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRole(null);
                          setSelectedRole('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={`text-xs border ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role}
                      </Badge>
                      {canModify && !isCurrentUser && (
                        <button
                          onClick={() => {
                            setEditingRole(user.id);
                            setSelectedRole(user.role);
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!canManage && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠️ Seuls les administrateurs peuvent modifier les rôles des membres.
          </p>
        </div>
      )}
    </div>
  );
};
const GeneralSettings = () => { 
  const { showToast } = useApp();
  const [activeSection, setActiveSection] = useState<'agency' | 'company'>('agency');
  const [agencyName, setAgencyName] = useState('AgencyOS');
  const [contactEmail, setContactEmail] = useState('hello@agencyos.com');

  return ( 
    <div className="space-y-6"> 
      {/* Navigation des sections */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
        <button
          onClick={() => setActiveSection('agency')}
          className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-500 ${
            activeSection === 'agency'
              ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Détails Agence
        </button>
        <button
          onClick={() => setActiveSection('company')}
          className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-500 ${
            activeSection === 'company'
              ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Informations Entreprise
        </button>
      </div>

      {activeSection === 'agency' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"> 
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Détails Agence</h2> 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
            <Input 
              label="Nom Agence" 
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
            /> 
            <Input 
              label="Email Contact" 
              type="email" 
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div> 
          <div className="mt-6 flex justify-end"> 
            <Button onClick={() => showToast('Paramètres sauvegardés', 'success')} variant="secondary">Sauvegarder</Button> 
          </div> 
        </div>
      )}

      {activeSection === 'company' && <CompanySettingsForm />}
    </div> 
  ); 
}
