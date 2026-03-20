/**
 * Dashboard dédié aux leads VIP
 * Affichage des leads VIP, suivi renforcé, alertes, rapports quotidiens
 */

import React, { useState, useEffect } from 'react';
import { Crown, AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp, Mail, Phone, Calendar, MessageSquare, Filter, Download, Bell } from 'lucide-react';
import { VIPLead, getVIPLeads, generateVIPDailyReport, checkVIPEscalation, recordVIPContactAttempt, isVIPLead } from '../../lib/services/vipLeadService';
import { Lead } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../../lib/supabase';

export const VIPLeadsDashboard: React.FC = () => {
  const { showToast, leads } = useApp();
  const [vipLeads, setVipLeads] = useState<VIPLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<VIPLead | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactData, setContactData] = useState({
    attemptType: 'email' as 'email' | 'call' | 'meeting' | 'sms',
    result: 'success' as 'success' | 'no_answer' | 'voicemail' | 'busy' | 'not_available',
    notes: '',
  });
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | VIPLead['status'],
    priority: 'all' as 'all' | VIPLead['priority'],
  });

  useEffect(() => {
    loadVIPLeads();
    loadDailyReport();
  }, [filters]);

  const loadVIPLeads = async () => {
    setLoading(true);
    try {
      const filterParams: any = {};
      if (filters.status !== 'all') filterParams.status = filters.status;
      if (filters.priority !== 'all') filterParams.priority = filters.priority;

      const vipLeadsData = await getVIPLeads(filterParams);
      setVipLeads(vipLeadsData);
    } catch (error: any) {
      showToast(`Erreur chargement leads VIP: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReport = async () => {
    try {
      const report = await generateVIPDailyReport();
      setDailyReport(report);
    } catch (error) {
      console.error('Erreur chargement rapport quotidien:', error);
    }
  };

  const handleRecordContact = async () => {
    if (!selectedLead) return;

    try {
      const currentUser = (window as any).user?.id; // TODO: Récupérer depuis AppContext
      if (!currentUser) {
        showToast('Utilisateur non identifié', 'error');
        return;
      }

      await recordVIPContactAttempt(
        selectedLead.leadId,
        currentUser,
        contactData.attemptType,
        {
          result: contactData.result,
          notes: contactData.notes,
          responseReceived: contactData.result === 'success',
        }
      );

      showToast('Tentative de contact enregistrée', 'success');
      setIsContactModalOpen(false);
      setContactData({
        attemptType: 'email',
        result: 'success',
        notes: '',
      });
      await loadVIPLeads();
      await loadDailyReport();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const getStatusColor = (status: VIPLead['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'contacted':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'negotiating':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'converted':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'lost':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: VIPLead['status']) => {
    switch (status) {
      case 'new':
        return 'Nouveau';
      case 'contacted':
        return 'Contacté';
      case 'negotiating':
        return 'En négociation';
      case 'converted':
        return 'Converti';
      case 'lost':
        return 'Perdu';
      default:
        return status;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'high_scoring':
        return 'Score élevé (≥90)';
      case 'high_value':
        return 'Valeur élevée (>50k€)';
      case 'vip_tag':
        return 'Tag VIP';
      case 'fortune_500':
        return 'Fortune 500';
      case 'c_level':
        return 'C-Level';
      default:
        return reason;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* En-tête avec KPIs */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Leads VIP</h2>
              <p className="text-slate-500 dark:text-slate-400">Suivi renforcé des leads prioritaires</p>
            </div>
          </div>
          <Button icon={Download} variant="secondary">
            Exporter rapport
          </Button>
        </div>

        {/* KPIs */}
        {dailyReport && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total VIP</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{dailyReport.totalVIPLeads}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Nouveaux (24h)</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dailyReport.newVIPLeads}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Contactés</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dailyReport.contactedVIPLeads}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sans réponse</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dailyReport.noResponseVIPLeads}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Escaladés</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{dailyReport.escalatedVIPLeads}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Convertis</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dailyReport.convertedVIPLeads}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Temps réponse moyen</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {dailyReport.averageResponseTime > 0 ? `${dailyReport.averageResponseTime}h` : '-'}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-4 items-center shrink-0">
        <Dropdown
          label="Statut"
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value as any })}
          options={[
            { label: 'Tous', value: 'all' },
            { label: 'Nouveau', value: 'new' },
            { label: 'Contacté', value: 'contacted' },
            { label: 'En négociation', value: 'negotiating' },
            { label: 'Converti', value: 'converted' },
            { label: 'Perdu', value: 'lost' },
          ]}
          containerClassName="w-48"
        />
        <Dropdown
          label="Priorité"
          value={filters.priority}
          onChange={(value) => setFilters({ ...filters, priority: value as any })}
          options={[
            { label: 'Toutes', value: 'all' },
            { label: 'Haute', value: 'high' },
            { label: 'Critique', value: 'critical' },
          ]}
          containerClassName="w-48"
        />
      </div>

      {/* Liste des leads VIP */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="space-y-4">
          {vipLeads.map((vipLead) => {
            const needsEscalation = vipLead.escalationLevel > 0 || 
              (vipLead.assignedTo && !vipLead.lastContactAt);
            
            return (
              <Card
                key={vipLead.leadId}
                className={`p-6 hover:shadow-lg transition-all ${
                  vipLead.priority === 'critical' ? 'border-2 border-red-300 dark:border-red-700' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Crown className={`h-5 w-5 ${
                        vipLead.priority === 'critical' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {vipLead.lead.name || vipLead.lead.company}
                      </h3>
                      {needsEscalation && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Escalade requise
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Raison VIP</div>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-xs">
                          {getReasonLabel(vipLead.reason)}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Statut</div>
                        <Badge className={`${getStatusColor(vipLead.status)} text-xs`}>
                          {getStatusLabel(vipLead.status)}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Score</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {vipLead.lead.scoring || 0}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Valeur</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {vipLead.lead.value ? `${vipLead.lead.value.toLocaleString()}€` : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{vipLead.contactAttempts} tentatives</span>
                      </div>
                      {vipLead.firstResponseTime !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Réponse en {vipLead.firstResponseTime.toFixed(1)}h</span>
                        </div>
                      )}
                      {vipLead.lastContactAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Dernier contact: {new Date(vipLead.lastContactAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {vipLead.escalationLevel > 0 && (
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Escalade niveau {vipLead.escalationLevel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Phone}
                      onClick={() => {
                        setSelectedLead(vipLead);
                        setIsContactModalOpen(true);
                      }}
                    >
                      Enregistrer contact
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {vipLeads.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <Crown className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">Aucun lead VIP trouvé</p>
            <p className="text-sm">Les leads avec score &gt;= 90, valeur &gt; 50k€ ou tag VIP apparaîtront ici</p>
          </div>
        )}
      </div>

      {/* Modal d'enregistrement de contact */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Enregistrer une tentative de contact"
      >
        {selectedLead && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Lead VIP</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedLead.lead.name || selectedLead.lead.company}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Score: {selectedLead.lead.scoring || 0}/100 - Valeur: {selectedLead.lead.value ? `${selectedLead.lead.value.toLocaleString()}€` : '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type de contact
              </label>
              <Dropdown
                value={contactData.attemptType}
                onChange={(value) => setContactData({ ...contactData, attemptType: value as any })}
                options={[
                  { label: 'Email', value: 'email' },
                  { label: 'Appel', value: 'call' },
                  { label: 'Rendez-vous', value: 'meeting' },
                  { label: 'SMS', value: 'sms' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Résultat
              </label>
              <Dropdown
                value={contactData.result}
                onChange={(value) => setContactData({ ...contactData, result: value as any })}
                options={[
                  { label: 'Succès (contacté)', value: 'success' },
                  { label: 'Pas de réponse', value: 'no_answer' },
                  { label: 'Répondeur', value: 'voicemail' },
                  { label: 'Occupé', value: 'busy' },
                  { label: 'Indisponible', value: 'not_available' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notes (optionnel)
              </label>
              <Textarea
                value={contactData.notes}
                onChange={(e) => setContactData({ ...contactData, notes: e.target.value })}
                placeholder="Notes sur le contact..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleRecordContact}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

