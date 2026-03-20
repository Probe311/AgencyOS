import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Circle, X, Save } from 'lucide-react';
import { useProspectingZones, ProspectingZone } from '../../lib/supabase/hooks/useProspectingZones';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { Dropdown } from '../ui/Dropdown';

interface ProspectingZonesManagerProps {
  onZoneSelect?: (zone: ProspectingZone | null) => void;
  selectedZoneId?: string | null;
}

export const ProspectingZonesManager: React.FC<ProspectingZonesManagerProps> = ({
  onZoneSelect,
  selectedZoneId,
}) => {
  const { showToast } = useApp();
  const { zones, loading, createZone, updateZone, deleteZone } = useProspectingZones();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<ProspectingZone | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zoneType: 'circle' as 'circle' | 'polygon',
    centerLat: '',
    centerLng: '',
    radiusKm: '',
    color: '#3b82f6',
    isActive: true,
  });

  const activeZones = zones.filter(z => z.isActive);

  const handleCreateNew = () => {
    setIsEditing(null);
    setFormData({
      name: '',
      description: '',
      zoneType: 'circle',
      centerLat: '',
      centerLng: '',
      radiusKm: '',
      color: '#3b82f6',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (zone: ProspectingZone) => {
    setIsEditing(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      zoneType: zone.zoneType,
      centerLat: zone.centerLat?.toString() || '',
      centerLng: zone.centerLng?.toString() || '',
      radiusKm: zone.radiusKm?.toString() || '',
      color: zone.color,
      isActive: zone.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Le nom de la zone est requis', 'error');
      return;
    }

    if (formData.zoneType === 'circle') {
      if (!formData.centerLat || !formData.centerLng || !formData.radiusKm) {
        showToast('Veuillez remplir le centre (lat/lng) et le rayon', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      const zoneData: Omit<ProspectingZone, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
        name: formData.name,
        description: formData.description || undefined,
        zoneType: formData.zoneType,
        centerLat: formData.zoneType === 'circle' ? parseFloat(formData.centerLat) : undefined,
        centerLng: formData.zoneType === 'circle' ? parseFloat(formData.centerLng) : undefined,
        radiusKm: formData.zoneType === 'circle' ? parseFloat(formData.radiusKm) : undefined,
        coordinates: formData.zoneType === 'polygon' ? [] : undefined, // TODO: Implémenter le dessin de polygones
        color: formData.color,
        isActive: formData.isActive,
      };

      if (isEditing) {
        await updateZone(isEditing.id, zoneData);
        showToast('Zone mise à jour', 'success');
      } else {
        await createZone(zoneData);
        showToast('Zone créée', 'success');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone: ProspectingZone) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la zone "${zone.name}" ?`)) {
      return;
    }

    try {
      await deleteZone(zone.id);
      showToast('Zone supprimée', 'success');
      if (selectedZoneId === zone.id && onZoneSelect) {
        onZoneSelect(null);
      }
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleToggleActive = async (zone: ProspectingZone) => {
    try {
      await updateZone(zone.id, { isActive: !zone.isActive });
      showToast(`Zone ${!zone.isActive ? 'activée' : 'désactivée'}`, 'success');
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormData({
      name: '',
      description: '',
      zoneType: 'circle',
      centerLat: '',
      centerLng: '',
      radiusKm: '',
      color: '#3b82f6',
      isActive: true,
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Zones de prospection ({activeZones.length})
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateNew}
          icon={Plus}
        >
          Nouvelle zone
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader size={24} />
        </div>
      ) : zones.length === 0 ? (
        <p className="text-center text-slate-500 py-8 text-sm">
          Aucune zone de prospection. Créez-en une pour commencer.
        </p>
      ) : (
        <div className="space-y-2">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all cursor-pointer ${
                selectedZoneId === zone.id ? 'ring-2 ring-indigo-500' : ''
              }`}
              onClick={() => onZoneSelect?.(zone)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Circle size={16} style={{ color: zone.color }} />
                    <span className="font-medium text-sm text-slate-900 dark:text-white">
                      {zone.name}
                    </span>
                    {!zone.isActive && (
                      <Badge variant="default" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                    {zone.zoneType === 'circle' && zone.radiusKm && (
                      <Badge variant="info" className="text-xs">
                        {zone.radiusKm} km
                      </Badge>
                    )}
                  </div>
                  {zone.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {zone.description}
                    </p>
                  )}
                  {zone.zoneType === 'circle' && zone.centerLat && zone.centerLng && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Centre: {zone.centerLat.toFixed(4)}, {zone.centerLng.toFixed(4)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(zone);
                    }}
                    className="h-7 w-7 p-0"
                    title={zone.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {zone.isActive ? '✓' : '○'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(zone);
                    }}
                    icon={Edit2}
                    className="h-7 w-7 p-0"
                    title="Modifier"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(zone);
                    }}
                    icon={Trash2}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                    title="Supprimer"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={isEditing ? 'Modifier la zone' : 'Nouvelle zone de prospection'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la zone *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Zone Bordeaux Centre"
            required
          />

          <Textarea
            label="Description (optionnel)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de la zone..."
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type de zone
              </label>
              <Dropdown
                value={formData.zoneType}
                onChange={(value) => setFormData({ ...formData, zoneType: value as 'circle' | 'polygon' })}
                options={[
                  { value: 'circle', label: 'Cercle (rayon)' },
                  { value: 'polygon', label: 'Polygone (à venir)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Couleur
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>

          {formData.zoneType === 'circle' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Latitude du centre *"
                  type="number"
                  step="0.0001"
                  value={formData.centerLat}
                  onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                  placeholder="44.8378"
                  required
                />
                <Input
                  label="Longitude du centre *"
                  type="number"
                  step="0.0001"
                  value={formData.centerLng}
                  onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                  placeholder="-0.5792"
                  required
                />
              </div>

              <Input
                label="Rayon (km) *"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.radiusKm}
                onChange={(e) => setFormData({ ...formData, radiusKm: e.target.value })}
                placeholder="5"
                required
              />
            </>
          )}

          {formData.zoneType === 'polygon' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Le dessin de polygones sera disponible dans une prochaine version. Utilisez les cercles pour le moment.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
              Zone active
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              icon={Save}
              isLoading={saving}
            >
              {saving ? 'Sauvegarde...' : isEditing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

