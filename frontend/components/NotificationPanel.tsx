
import React from 'react';
import { Bell, Check, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { useApp } from './contexts/AppContext';

interface NotificationPanelProps {
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAllNotificationsAsRead, showToast } = useApp();
  
  const handleMarkAllAsRead = async () => {
     try {
        await markAllNotificationsAsRead();
        showToast('Toutes les notifications ont été marquées comme lues', 'success');
     } catch (error) {
        showToast('Erreur lors du marquage des notifications', 'error');
     }
  };
  
  return (
    <div className="absolute top-20 right-4 lg:right-10 w-96 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 z-[70] animate-in slide-in-from-top-2 fade-in duration-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
         <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-indigo-600" /> Notifications
         </h3>
         {notifications.filter(n => !n.read).length > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="ghost" className="text-xs text-indigo-600 hover:underline p-0 h-auto">Tout marquer comme lu</Button>
         )}
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
         {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
               <p className="text-sm">Aucune nouvelle notification</p>
            </div>
         ) : (
            <div className="divide-y divide-slate-100/50">
               {notifications.map(note => (
                  <div key={note.id} className={`p-4 hover:bg-slate-50 transition-all duration-500 flex gap-3 ${!note.read ? 'bg-indigo-50/30' : ''}`}>
                     <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        note.type === 'alert' ? 'bg-indigo-100 text-indigo-600' :
                        note.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                        note.type === 'task' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                     }`}>
                        {note.type === 'alert' && <AlertTriangle size={14} />}
                        {note.type === 'success' && <CheckCircle size={14} />}
                        {note.type === 'task' && <Clock size={14} />}
                        {note.type === 'message' && <Bell size={14} />}
                     </div>
                     <div>
                        <div className="flex justify-between items-start">
                           <h4 className={`text-sm ${!note.read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{note.title}</h4>
                           <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{note.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{note.message}</p>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
         <Button variant="ghost" className="text-xs font-bold text-slate-500 hover:text-indigo-600 h-auto">Voir l'historique</Button>
      </div>
    </div>
  );
};
