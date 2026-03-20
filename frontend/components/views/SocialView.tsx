
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Image, Send, Clock, Edit3, Plus, Heart, MessageCircle, LayoutGrid, CheckCircle, Share2, Copy, Sparkles, Inbox } from 'lucide-react';
import { SocialPost } from '../../types';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from '../../lib/api-keys';
import { PageLayout } from '../ui/PageLayout';
import { SocialInbox } from '../social/SocialInbox';

export const SocialView: React.FC = () => {
  const { showToast, socialPosts } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'calendar' | 'inbox'>('feed');
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  
  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [postPlatform, setPostPlatform] = useState('linkedin');
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    // In a real app, dispatch create action to Supabase here
    showToast('Post planifié avec succès', 'success');
  };

  const generateGuestLink = () => {
     showToast('Lien copié dans le presse-papier', 'success');
     setIsApprovalModalOpen(false);
  }

  const handleGenerateContent = async () => {
     if (!postPlatform) {
        showToast('Veuillez sélectionner une plateforme', 'error');
        return;
     }
     
     setIsGenerating(true);
     try {
        const apiKey = getApiKey('google');
        if (!apiKey) {
          showToast('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.', 'error');
          return;
        }
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert Social Media Manager. Write a creative, engaging post for ${postPlatform}. 
        Includes emojis and hashtags. If an image context is provided, describe it enthusiastically.`;
        
        const prompt = postContent ? `Refine this idea: ${postContent}` : `Write a viral post about a new Tech product launch.`;

        const response = await ai.models.generateContent({
           model: 'gemini-3-pro-preview',
           contents: prompt,
           config: { systemInstruction }
        });

        if (response.text) {
           setPostContent(response.text);
           showToast('Contenu généré par l\'IA', 'success');
        }
     } catch (error) {
        console.error(error);
        showToast('Erreur de génération IA', 'error');
     } finally {
        setIsGenerating(false);
     }
  };

  return (
    <PageLayout
      header={{
        icon: Share2,
        iconBgColor: "bg-blue-100 dark:bg-blue-900/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        title: "Réseaux Sociaux",
        description: "Planifiez et gérez votre contenu héroïque.",
        leftActions: [
          {
            element: (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex gap-1">
                <Button
                  onClick={() => setViewMode('feed')}
                  variant={viewMode === 'feed' ? 'secondary' : 'ghost'}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Feed
                </Button>
                <Button
                  onClick={() => setViewMode('calendar')}
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Calendrier
                </Button>
                <Button
                  onClick={() => setViewMode('inbox')}
                  variant={viewMode === 'inbox' ? 'secondary' : 'ghost'}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  icon={Inbox}
                >
                  Inbox
                </Button>
              </div>
            )
          }
        ],
        rightActions: [
          {
            label: "Approbation Client",
            icon: Share2,
            onClick: () => setIsApprovalModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Créer un Post",
            icon: Edit3,
            onClick: () => setIsModalOpen(true),
            variant: 'primary'
          }
        ]
      }}
      contentClassName="h-full flex flex-col min-h-0"
    >
      {viewMode === 'inbox' ? (
        <div className="flex-1 min-h-0">
          <SocialInbox />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden h-full">
            <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
               <h2 className="font-bold text-slate-800 dark:text-white">Calendrier Éditorial</h2>
               <div className="flex gap-2">
                 <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-xl transition-all duration-500 ${viewMode === 'calendar' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}><LayoutGrid size={18} /></button>
                 <button onClick={() => setViewMode('feed')} className={`p-2 rounded-xl transition-all duration-500 ${viewMode === 'feed' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}><CalendarIcon size={18} /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
               {viewMode === 'feed' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                    {socialPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                    {socialPosts.length === 0 && (
                        <div className="col-span-full p-8 text-center text-slate-400 dark:text-slate-500">Aucun post planifié.</div>
                    )}
                    <div 
                       onClick={() => setIsModalOpen(true)}
                       className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[30px] flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/10 dark:hover:bg-indigo-900/10 transition-all duration-500 cursor-pointer min-h-[200px] group"
                    >
                       <div className="w-14 h-14 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-500">
                         <Plus className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                       </div>
                       <span className="text-sm font-bold">Planifier un nouveau post</span>
                    </div>
                  </div>
               ) : (
                  <CalendarGrid posts={socialPosts} />
               )}
            </div>
        </div>

        {/* Quick Stats / Mini Calendar */}
        <div className="space-y-6 overflow-y-auto">
           <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Performance</h3>
              <div className="space-y-4">
                 <PlatformStat name="LinkedIn" followers="-" growth="0%" color="bg-blue-600" />
                 <PlatformStat name="Instagram" followers="-" growth="0%" color="bg-pink-600" />
                 <PlatformStat name="Twitter/X" followers="-" growth="0%" color="bg-slate-900 dark:bg-slate-700" />
              </div>
           </div>
           
           <div className="bg-indigo-900 dark:bg-indigo-950 p-8 rounded-[30px] shadow-xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-2">Assistant Contenu IA</h3>
                <p className="text-indigo-200 dark:text-indigo-300 text-sm mb-6 font-medium leading-relaxed">Générez des légendes et hashtags en quelques secondes.</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all duration-500 shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> Essayer le générateur
                </button>
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-[60px] opacity-30 -mr-10 -mt-10"></div>
           </div>
        </div>
        </div>
        </div>
      )}

      {/* Create Post Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer un Post Social">
         <form onSubmit={handleCreatePost} className="space-y-4">
            <Dropdown 
               label="Plateforme"
               value={postPlatform}
               onChange={(value) => setPostPlatform(value)}
               options={[
                  {value: 'linkedin', label: 'LinkedIn'},
                  {value: 'instagram', label: 'Instagram'},
                  {value: 'twitter', label: 'Twitter / X'},
                  {value: 'tiktok', label: 'TikTok'}
               ]}
            />
            
            <div className="relative">
               <Textarea 
                  label="Contenu" 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Écrivez votre post ou laissez l'IA générer une idée..." 
                  className="h-32" 
               />
               <button 
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="absolute bottom-3 right-3 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all duration-500"
               >
                  {isGenerating ? <span className="animate-spin">✨</span> : <Sparkles size={12} />}
                  {isGenerating ? 'Rédaction...' : 'Générer avec IA'}
               </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Input label="Date" type="date" required />
               <Input label="Heure" type="time" required />
            </div>
            
            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Image URL (Optionnel)</label>
               <div className="flex gap-2">
                 <Input 
                    containerClassName="flex-1" 
                    placeholder="https://..." 
                    className="w-full"
                    value={postImage}
                    onChange={(e) => setPostImage(e.target.value)}
                 />
                 <button type="button" className="px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-500 shadow-sm h-[46px] mt-auto">
                    <Image size={20} />
                 </button>
               </div>
            </div>

            <div className="flex justify-end pt-4 gap-3">
               <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
               <Button type="submit">Planifier</Button>
            </div>
         </form>
      </Modal>

      {/* Client Approval Modal */}
      <Modal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} title="Lien d'Approbation Guest" size="md">
         <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex gap-4">
               <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm h-fit">
                  <Share2 className="text-indigo-600 dark:text-indigo-400" size={24} />
               </div>
               <div>
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Partager pour validation</h4>
                  <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 mt-1">Créez un lien public sécurisé pour que votre client puisse valider les posts sans compte.</p>
               </div>
            </div>

            <div>
               <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Lien généré</label>
               <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 text-sm font-mono border border-slate-200 dark:border-slate-600 truncate">
                     https://agencyos.com/guest/approve/9f8s7d6f
                  </div>
                  <Button onClick={generateGuestLink} icon={Copy} variant="secondary">Copier</Button>
               </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
               <CheckCircle size={14} className="text-emerald-500 dark:text-emerald-400" />
               Lien valide pendant 7 jours
            </div>
         </div>
      </Modal>
    </PageLayout>
  );
};

interface PostCardProps {
  post: SocialPost;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => (
  <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-500 group">
     {post.image && (
       <div className="h-40 w-full bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
         <img src={post.image} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
            <span className="text-white text-xs font-bold px-3 py-1.5 bg-white/20 rounded-full border border-white/40">Voir Aperçu</span>
         </div>
       </div>
     )}
     <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${
            post.platform === 'linkedin' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 
            post.platform === 'instagram' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' : 
            'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {post.platform}
          </span>
          <span className={`text-[10px] font-bold flex items-center gap-1.5 ${
             post.status === 'Publié' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
             {post.status === 'Publié' ? <Send size={12} /> : <Clock size={12} />}
             {post.status}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 font-medium leading-relaxed">
          {post.content}
        </p>
        <div className="text-xs text-slate-400 dark:text-slate-500 flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
           <span className="font-medium">{post.date}</span>
           <div className="flex gap-4">
             <span className="flex items-center gap-1.5"><Heart size={14} className={post.likes ? "fill-slate-400 dark:fill-slate-500" : ""} /> <span className="font-bold text-slate-600 dark:text-slate-400">{post.likes || 0}</span></span>
             <span className="flex items-center gap-1.5"><MessageCircle size={14} /> <span className="font-bold text-slate-600 dark:text-slate-400">{post.comments || 0}</span></span>
           </div>
        </div>
     </div>
  </div>
);

const PlatformStat = ({ name, followers, growth, color }: any) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-all duration-500">
     <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-sm`}>
           {name[0]}
        </div>
        <div>
           <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
           <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{followers} Abonnés</p>
        </div>
     </div>
     <span className={`text-xs font-bold px-2 py-1 rounded-lg ${growth.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30'}`}>{growth}</span>
  </div>
);

const CalendarGrid: React.FC<{ posts: SocialPost[] }> = ({ posts }) => {
   const days = Array.from({length: 30}, (_, i) => i + 1);
   
   return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 p-6">
         <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
               <div key={d} className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{d}</div>
            ))}
         </div>
         <div className="grid grid-cols-7 auto-rows-[120px] gap-2">
            {days.map(day => {
               // Date matching logic
               const post = posts.find(p => parseInt(p.date.split('-')[2]) === day);
               
               return (
                  <div key={day} className="border border-slate-100 dark:border-slate-700 rounded-xl p-2 relative bg-slate-50/30 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all duration-500 group">
                     <span className={`text-xs font-bold ${post ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{day}</span>
                     {post && (
                        <div className="absolute inset-2 top-6 bg-white dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm cursor-pointer">
                           {post.image ? (
                              <img src={post.image} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400 dark:text-indigo-300 text-[10px] p-1 text-center">
                                 {post.content.substring(0, 20)}...
                              </div>
                           )}
                           <div className="absolute bottom-1 right-1">
                              <div className={`w-2 h-2 rounded-full ${post.platform === 'instagram' ? 'bg-pink-500' : post.platform === 'linkedin' ? 'bg-blue-600' : 'bg-slate-800 dark:bg-slate-600'}`}></div>
                           </div>
                        </div>
                     )}
                     {!post && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer">
                           <Plus className="text-slate-300 dark:text-slate-600" />
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
      </div>
   );
};
