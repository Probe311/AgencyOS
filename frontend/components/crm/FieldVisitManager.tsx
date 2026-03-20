import React, { useState, useEffect } from 'react';
import { MapPin, Camera, FileText, Plus, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { FieldVisitService, FieldVisit, FieldVisitConflict } from '../../lib/services/fieldVisitService';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface FieldVisitManagerProps {
  leadId?: string;
  onVisitCreated?: (visit: FieldVisit) => void;
}

export const FieldVisitManager: React.FC<FieldVisitManagerProps> = ({ leadId, onVisitCreated }) => {
  const { user } = useAuth();
  const { showToast } = useApp();
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<FieldVisitConflict[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Formulaire
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    loadVisits();
    checkPendingSync();
    
    // Vérifier périodiquement les visites en attente
    const interval = setInterval(checkPendingSync, 5000);
    return () => clearInterval(interval);
  }, [leadId, user?.id]);

  const loadVisits = async () => {
    try {
      const allVisits = await FieldVisitService.getAllVisits(user?.id);
      const filteredVisits = leadId 
        ? allVisits.filter(v => v.lead_id === leadId)
        : allVisits;
      setVisits(filteredVisits);
    } catch (error) {
      console.error('Error loading visits:', error);
      showToast('Erreur lors du chargement des visites', 'error');
    }
  };

  const checkPendingSync = async () => {
    const localVisits = await FieldVisitService.getLocalVisits();
    const pending = localVisits.filter(v => !v.synced || v.sync_status === 'pending');
    setPendingCount(pending.length);
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await FieldVisitService.getCurrentLocation();
      setLatitude(location.latitude);
      setLongitude(location.longitude);

      // Récupérer l'adresse
      const addr = await FieldVisitService.reverseGeocode(location.latitude, location.longitude);
      if (addr) {
        setAddress(addr);
      }
    } catch (error: any) {
      showToast(`Erreur de géolocalisation: ${error.message}`, 'error');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCreateVisit = async () => {
    if (!latitude || !longitude || !user?.id) {
      showToast('Veuillez obtenir votre position', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const visit = await FieldVisitService.createVisit({
        lead_id: leadId || null,
        user_id: user.id,
        latitude,
        longitude,
        address: address || undefined,
        notes: notes || undefined,
        photos: photos.length > 0 ? photos : undefined,
        visited_at: new Date().toISOString(),
      });

      setVisits([visit, ...visits]);
      setIsModalOpen(false);
      resetForm();
      showToast('Visite créée avec succès', 'success');
      
      if (onVisitCreated) {
        onVisitCreated(visit);
      }

      // Synchroniser si en ligne
      if (navigator.onLine) {
        await syncVisits();
      }
    } catch (error: any) {
      showToast(`Erreur lors de la création: ${error.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await FieldVisitService.syncVisits();
      
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        showToast(`${result.conflicts.length} conflit(s) détecté(s)`, 'warning');
      } else {
        showToast(`${result.synced} visite(s) synchronisée(s)`, 'success');
        await loadVisits();
        await checkPendingSync();
      }

      if (result.errors.length > 0) {
        console.error('Sync errors:', result.errors);
      }
    } catch (error: any) {
      showToast(`Erreur de synchronisation: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (conflict: FieldVisitConflict, resolution: 'local' | 'remote' | 'merge') => {
    try {
      await FieldVisitService.resolveConflict(conflict, resolution);
      setConflicts(conflicts.filter(c => c !== conflict));
      showToast('Conflit résolu', 'success');
      await loadVisits();
    } catch (error: any) {
      showToast(`Erreur lors de la résolution: ${error.message}`, 'error');
    }
  };

  const resetForm = () => {
    setLatitude(null);
    setLongitude(null);
    setAddress('');
    setNotes('');
    setPhotos([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Visites terrain</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {visits.length} visite{visits.length > 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                ({pendingCount} en attente de synchronisation)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={handleSync}
              isLoading={isSyncing}
              disabled={!navigator.onLine}
            >
              Synchroniser
            </Button>
          )}
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Nouvelle visite
          </Button>
        </div>
      </div>

      {/* Liste des visites */}
      <div className="space-y-3">
        {visits.map((visit) => (
          <div
            key={visit.id}
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-primary-600" size={16} />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatDate(visit.visited_at)}
                  </span>
                  {visit.synced ? (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 size={12} className="mr-1" />
                      Synchronisé
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      <Clock size={12} className="mr-1" />
                      En attente
                    </Badge>
                  )}
                </div>
                
                {visit.address && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {visit.address}
                  </p>
                )}
                
                {visit.notes && (
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="text-slate-400 mt-0.5" size={14} />
                    <p className="text-sm text-slate-600 dark:text-slate-400">{visit.notes}</p>
                  </div>
                )}
                
                {visit.photos && visit.photos.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Camera className="text-slate-400" size={14} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {visit.photos.length} photo{visit.photos.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {visits.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <MapPin className="mx-auto mb-2" size={32} />
            <p>Aucune visite enregistrée</p>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Nouvelle visite terrain"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Position
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                icon={MapPin}
                onClick={handleGetLocation}
                isLoading={isGettingLocation}
                className="flex-1"
              >
                Obtenir ma position
              </Button>
            </div>
            {latitude && longitude && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>

          {address && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Adresse
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur la visite..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateVisit}
              isLoading={isCreating}
              disabled={!latitude || !longitude}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de résolution de conflits */}
      {conflicts.length > 0 && (
        <Modal
          isOpen={conflicts.length > 0}
          onClose={() => setConflicts([])}
          title="Résolution de conflits"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Des conflits ont été détectés lors de la synchronisation. Choisissez comment les résoudre.
            </p>
            
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-orange-600" size={16} />
                  <span className="font-medium text-slate-900 dark:text-white">
                    Conflit sur {conflict.field}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Version locale</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {String(conflict.localValue || 'Non défini')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Version distante</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {String(conflict.remoteValue || 'Non défini')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveConflict(conflict, 'local')}
                  >
                    Garder local
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveConflict(conflict, 'remote')}
                  >
                    Garder distant
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolveConflict(conflict, 'merge')}
                  >
                    Fusionner
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

