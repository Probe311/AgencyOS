import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneOff, 
  Mic, MicOff, Volume2, VolumeX, User, Clock, Calendar, 
  Download, Play, Pause, Trash2, Search, Filter, 
  CheckCircle2, XCircle, AlertCircle, History, Settings
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { Lead } from '../../types';

interface VoIPCall {
  id: string;
  lead_id?: string;
  user_id?: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer' | 'cancelled';
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  notes?: string;
  cost?: number;
  metadata: any;
  created_at: string;
  leads?: Lead;
  users?: { id: string; name?: string; email?: string };
}

interface CallStats {
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  total_duration: number;
  avg_duration: number;
  total_cost: number;
}

export const VoIPCall: React.FC = () => {
  const { showToast, user } = useApp();
  const [calls, setCalls] = useState<VoIPCall[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCall, setSelectedCall] = useState<VoIPCall | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'no_answer'>('all');
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentCallRef = useRef<VoIPCall | null>(null);

  useEffect(() => {
    loadCalls();
    loadLeads();
    loadStats();
    
    // S'abonner aux nouveaux appels
    const channel = supabase
      .channel('voip_calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voip_calls'
        },
        () => {
          loadCalls();
          loadStats();
        }
      )
      .subscribe();

    // Vérifier les appels entrants
    checkIncomingCalls();

    return () => {
      supabase.removeChannel(channel);
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
      }
    };
  }, []);

  const loadCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('voip_calls')
        .select(`
          *,
          leads:lead_id (*),
          users:user_id (id, name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCalls(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des appels', 'error');
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company')
        .order('name', { ascending: true })
        .limit(1000);

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error loading leads:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('voip_calls')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const totalCalls = data.length;
      const answeredCalls = data.filter(c => c.status === 'completed').length;
      const missedCalls = data.filter(c => c.status === 'no_answer' || c.status === 'failed').length;
      const totalDuration = data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      const avgDuration = answeredCalls > 0 ? totalDuration / answeredCalls : 0;
      const totalCost = data.reduce((sum, c) => sum + (parseFloat(c.cost?.toString() || '0') || 0), 0);

      setStats({
        total_calls: totalCalls,
        answered_calls: answeredCalls,
        missed_calls: missedCalls,
        total_duration: totalDuration,
        avg_duration: Math.round(avgDuration),
        total_cost: totalCost
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const checkIncomingCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('voip_calls')
        .select('*')
        .eq('direction', 'inbound')
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const incomingCall = data[0];
        showToast(`Appel entrant de ${incomingCall.phone_number}`, 'info');
        
        // Créer une notification
        await supabase.from('notifications').insert({
          user_id: user?.id,
          type: 'incoming_call',
          title: 'Appel entrant',
          message: `Appel de ${incomingCall.phone_number}`,
          metadata: { call_id: incomingCall.id }
        });
      }
    } catch (error: any) {
      console.error('Error checking incoming calls:', error);
    }
  };

  const initiateCall = async () => {
    if (!phoneNumber.trim()) {
      showToast('Veuillez entrer un numéro de téléphone', 'error');
      return;
    }

    setIsCalling(true);
    try {
      // Créer l'appel dans la base de données
      const { data: newCall, error } = await supabase
        .from('voip_calls')
        .insert([{
          phone_number: phoneNumber,
          direction: 'outbound',
          status: 'initiated',
          user_id: user?.id,
          lead_id: selectedLeadId || null,
          started_at: new Date().toISOString(),
          metadata: {}
        }])
        .select()
        .single();

      if (error) throw error;

      currentCallRef.current = newCall;

      // Simuler l'appel (dans un vrai projet, ceci appellerait l'API VoIP)
      setTimeout(async () => {
        await supabase
          .from('voip_calls')
          .update({ status: 'ringing' })
          .eq('id', newCall.id);
        
        setTimeout(async () => {
          await supabase
            .from('voip_calls')
            .update({ 
              status: 'answered',
              answered_at: new Date().toISOString()
            })
            .eq('id', newCall.id);
          
          setIsCalling(false);
          setIsInCall(true);
          startCallTimer(newCall.id);
        }, 2000);
      }, 1000);

      setIsCallModalOpen(false);
      setPhoneNumber('');
      setSelectedLeadId('');
    } catch (error: any) {
      showToast('Erreur lors de l\'initiation de l\'appel', 'error');
      setIsCalling(false);
    }
  };

  const startCallTimer = (callId: string) => {
    const startTime = Date.now();
    callDurationIntervalRef.current = setInterval(async () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setCallDuration(duration);
      
      // Mettre à jour la durée dans la base de données toutes les 10 secondes
      if (duration % 10 === 0) {
        await supabase
          .from('voip_calls')
          .update({ duration_seconds: duration })
          .eq('id', callId);
      }
    }, 1000);
  };

  const endCall = async () => {
    if (!currentCallRef.current) return;

    if (callDurationIntervalRef.current) {
      clearInterval(callDurationIntervalRef.current);
      callDurationIntervalRef.current = null;
    }

    try {
      await supabase
        .from('voip_calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration
        })
        .eq('id', currentCallRef.current.id);

      // Ajouter les notes si fournies
      if (callNotes.trim()) {
        await supabase
          .from('voip_calls')
          .update({ notes: callNotes })
          .eq('id', currentCallRef.current.id);
      }

      // Créer un événement dans la timeline du lead si applicable
      if (currentCallRef.current.lead_id) {
        await supabase.from('lead_events').insert({
          lead_id: currentCallRef.current.lead_id,
          type: 'call',
          title: `Appel ${currentCallRef.current.direction === 'inbound' ? 'entrant' : 'sortant'}`,
          description: `Appel avec ${currentCallRef.current.phone_number} - Durée: ${formatDuration(callDuration)}`,
          metadata: { call_id: currentCallRef.current.id }
        });
      }

      showToast('Appel terminé', 'success');
      setIsInCall(false);
      setCallDuration(0);
      setCallNotes('');
      currentCallRef.current = null;
      loadCalls();
    } catch (error: any) {
      showToast('Erreur lors de la fin de l\'appel', 'error');
    }
  };

  const answerCall = async (callId: string) => {
    try {
      await supabase
        .from('voip_calls')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('id', callId);

      const call = calls.find(c => c.id === callId);
      if (call) {
        currentCallRef.current = call;
        setIsInCall(true);
        startCallTimer(callId);
      }

      showToast('Appel répondu', 'success');
      loadCalls();
    } catch (error: any) {
      showToast('Erreur lors de la réponse', 'error');
    }
  };

  const rejectCall = async (callId: string) => {
    try {
      await supabase
        .from('voip_calls')
        .update({
          status: 'cancelled',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      showToast('Appel rejeté', 'info');
      loadCalls();
    } catch (error: any) {
      showToast('Erreur lors du rejet', 'error');
    }
  };

  const updateCallNotes = async (callId: string, notes: string) => {
    try {
      await supabase
        .from('voip_calls')
        .update({ notes })
        .eq('id', callId);

      showToast('Notes mises à jour', 'success');
      loadCalls();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour des notes', 'error');
    }
  };

  const deleteCall = async (callId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appel ?')) return;

    try {
      const { error } = await supabase
        .from('voip_calls')
        .delete()
        .eq('id', callId);

      if (error) throw error;

      showToast('Appel supprimé', 'success');
      loadCalls();
    } catch (error: any) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (phone: string) => {
    // Format simple : +33 1 23 45 67 89
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '+$1 $2 $3 $4 $5');
  };

  const getStatusBadge = (status: VoIPCall['status']) => {
    const statusConfig = {
      initiated: { label: 'Initiated', color: 'blue', icon: Phone },
      ringing: { label: 'Sonnerie', color: 'amber', icon: PhoneCall },
      answered: { label: 'En cours', color: 'green', icon: PhoneCall },
      completed: { label: 'Terminé', color: 'emerald', icon: CheckCircle2 },
      failed: { label: 'Échoué', color: 'red', icon: XCircle },
      busy: { label: 'Occupé', color: 'orange', icon: AlertCircle },
      no_answer: { label: 'Pas de réponse', color: 'red', icon: PhoneOff },
      cancelled: { label: 'Annulé', color: 'slate', icon: XCircle }
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchQuery ||
      call.phone_number.includes(searchQuery) ||
      call.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.leads?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDirection = filterDirection === 'all' || call.direction === filterDirection;
    const matchesStatus = filterStatus === 'all' || call.status === filterStatus;
    return matchesSearch && matchesDirection && matchesStatus;
  });

  return (
    <PageLayout
      header={{
        icon: Phone,
        title: "Appels VoIP",
        description: "Gérez vos appels téléphoniques",
        rightActions: [
          {
            label: "Historique",
            icon: History,
            onClick: () => setIsHistoryModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Paramètres",
            icon: Settings,
            onClick: () => setIsSettingsModalOpen(true),
            variant: 'outline'
          },
          {
            label: "Nouvel appel",
            icon: PhoneOutgoing,
            onClick: () => setIsCallModalOpen(true),
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="space-y-6">
        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_calls}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total appels</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.answered_calls}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Répondus</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.missed_calls}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Manqués</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatDuration(stats.total_duration)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Durée totale</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatDuration(stats.avg_duration)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Durée moyenne</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">€{stats.total_cost.toFixed(2)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Coût total</div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex gap-4">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="flex-1"
            />
            <Dropdown
              value={filterDirection}
              onChange={(value) => setFilterDirection(value as any)}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'inbound', label: 'Entrants' },
                { value: 'outbound', label: 'Sortants' }
              ]}
            />
            <Dropdown
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as any)}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'completed', label: 'Terminés' },
                { value: 'failed', label: 'Échoués' },
                { value: 'no_answer', label: 'Sans réponse' }
              ]}
            />
          </div>
        </div>

        {/* Liste des appels */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Appels récents ({filteredCalls.length})
            </h3>
            {filteredCalls.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Phone size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun appel trouvé</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500 cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming size={20} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <PhoneOutgoing size={20} className="text-blue-600 dark:text-blue-400" />
                          )}
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {formatPhoneNumber(call.phone_number)}
                            </h4>
                            {call.leads && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {call.leads.name} {call.leads.company ? `- ${call.leads.company}` : ''}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(call.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(call.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(call.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {call.duration_seconds && (
                            <span>Durée: {formatDuration(call.duration_seconds)}</span>
                          )}
                          {call.cost && (
                            <span>Coût: €{parseFloat(call.cost.toString()).toFixed(2)}</span>
                          )}
                        </div>
                        {call.notes && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">
                            {call.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {call.recording_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(call.recording_url, '_blank');
                            }}
                            icon={Play}
                          >
                            Écouter
                          </Button>
                        )}
                        {call.lead_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/crm?lead=${call.lead_id}`, '_blank');
                            }}
                          >
                            Voir lead
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'appel en cours */}
      {isInCall && currentCallRef.current && (
        <Modal
          isOpen={isInCall}
          onClose={() => {}}
          title="Appel en cours"
          size="md"
        >
          <div className="space-y-6 text-center">
            <div className="text-4xl font-bold text-slate-900 dark:text-white">
              {formatPhoneNumber(currentCallRef.current.phone_number)}
            </div>
            {currentCallRef.current.leads && (
              <div className="text-lg text-slate-600 dark:text-slate-400">
                {currentCallRef.current.leads.name}
                {currentCallRef.current.leads.company && ` - ${currentCallRef.current.leads.company}`}
              </div>
            )}
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatDuration(callDuration)}
            </div>
            <div className="flex justify-center gap-4">
              <Button
                variant={isMuted ? "danger" : "outline"}
                onClick={() => setIsMuted(!isMuted)}
                icon={isMuted ? MicOff : Mic}
              >
                {isMuted ? 'Activer micro' : 'Couper micro'}
              </Button>
              <Button
                variant={isSpeakerOn ? "primary" : "outline"}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                icon={isSpeakerOn ? Volume2 : VolumeX}
              >
                {isSpeakerOn ? 'Haut-parleur ON' : 'Haut-parleur OFF'}
              </Button>
            </div>
            <Textarea
              label="Notes d'appel"
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Notes pendant l'appel..."
              rows={4}
            />
            <Button
              variant="danger"
              fullWidth
              size="lg"
              onClick={endCall}
              icon={PhoneOff}
            >
              Raccrocher
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal nouveau appel */}
      <Modal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        title="Nouvel appel"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Numéro de téléphone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+33 1 23 45 67 89"
            required
          />
          <Dropdown
            label="Lead (optionnel)"
            value={selectedLeadId}
            onChange={(value) => setSelectedLeadId(value)}
            options={[
              { value: '', label: 'Aucun' },
              ...leads.map(lead => ({
                value: lead.id,
                label: `${lead.name || 'Sans nom'}${lead.company ? ` - ${lead.company}` : ''}${lead.phone ? ` (${lead.phone})` : ''}`
              }))
            ]}
          />
          {selectedLeadId && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                L'appel sera automatiquement lié au lead sélectionné et ajouté à sa timeline.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCallModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={initiateCall}
              disabled={isCalling}
              icon={PhoneOutgoing}
            >
              {isCalling ? 'Appel en cours...' : 'Appeler'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal détails appel */}
      {selectedCall && (
        <Modal
          isOpen={!!selectedCall}
          onClose={() => setSelectedCall(null)}
          title="Détails de l'appel"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Numéro</label>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formatPhoneNumber(selectedCall.phone_number)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Direction</label>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedCall.direction === 'inbound' ? 'Entrant' : 'Sortant'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Statut</label>
                <div className="mt-1">{getStatusBadge(selectedCall.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Durée</label>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedCall.duration_seconds ? formatDuration(selectedCall.duration_seconds) : 'N/A'}
                </p>
              </div>
            </div>
            {selectedCall.leads && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead associé</label>
                <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedCall.leads.name}
                  </p>
                  {selectedCall.leads.company && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedCall.leads.company}
                    </p>
                  )}
                </div>
              </div>
            )}
            <Textarea
              label="Notes"
              value={selectedCall.notes || ''}
              onChange={(e) => {
                setSelectedCall({ ...selectedCall, notes: e.target.value });
              }}
              onBlur={() => {
                if (selectedCall.notes !== undefined) {
                  updateCallNotes(selectedCall.id, selectedCall.notes);
                }
              }}
              rows={4}
            />
            {selectedCall.transcript && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transcription</label>
                <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedCall.transcript}
                  </p>
                </div>
              </div>
            )}
            {selectedCall.recording_url && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enregistrement</label>
                <div className="mt-1">
                  <audio controls className="w-full">
                    <source src={selectedCall.recording_url} type="audio/mpeg" />
                    Votre navigateur ne supporte pas l'élément audio.
                  </audio>
                </div>
              </div>
            )}
            <div className="flex justify-between pt-4">
              <Button
                variant="danger"
                onClick={() => {
                  deleteCall(selectedCall.id);
                  setSelectedCall(null);
                }}
                icon={Trash2}
              >
                Supprimer
              </Button>
              <div className="flex gap-3">
                {selectedCall.lead_id && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`/crm?lead=${selectedCall.lead_id}`, '_blank');
                    }}
                  >
                    Voir le lead
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedCall(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal historique */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Historique des appels"
        size="lg"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {calls.slice(0, 50).map((call) => (
              <div
                key={call.id}
                className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                onClick={() => {
                  setSelectedCall(call);
                  setIsHistoryModalOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatPhoneNumber(call.phone_number)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(call.created_at).toLocaleString('fr-FR')}
                      {call.duration_seconds && ` • ${formatDuration(call.duration_seconds)}`}
                    </p>
                  </div>
                  {getStatusBadge(call.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal paramètres */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Paramètres VoIP"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Note :</strong> Pour activer les appels VoIP, vous devez configurer une intégration avec un fournisseur VoIP (Twilio, Vonage, etc.) dans les paramètres de l'application.
            </p>
          </div>
          <Input
            label="Numéro VoIP"
            placeholder="+33 1 23 45 67 89"
            disabled
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={true}
              disabled
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Enregistrer automatiquement les appels (avec consentement)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={true}
              disabled
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Transcrire automatiquement les appels
            </label>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

