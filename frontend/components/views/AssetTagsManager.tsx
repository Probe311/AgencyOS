import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Edit2, Trash2, Search, Filter, CheckSquare, Square } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Dropdown } from '../ui/Dropdown';
import { Asset } from '../../types';
import { useApp } from '../contexts/AppContext';

interface AssetTagsManagerProps {
  assets: Asset[];
  onUpdateAssets: (updates: Array<{ id: string; tags: string[]; category?: string }>) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'Catégories' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Vidéos' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'template', label: 'Templates' },
  { value: 'brand', label: 'Brand' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'social', label: 'Social Media' },
];

export const AssetTagsManager: React.FC<AssetTagsManagerProps> = ({ assets, onUpdateAssets }) => {
  const { showToast } = useApp();
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  // Extraire tous les tags uniques depuis les assets
  useEffect(() => {
    const tagsSet = new Set<string>();
    assets.forEach(asset => {
      asset.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());
  }, [assets]);

  // Filtrer les assets selon la catégorie et la recherche
  const filteredAssets = assets.filter(asset => {
    const matchesCategory = selectedCategory === 'all' || asset.type === selectedCategory;
    const matchesSearch = !searchQuery || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      showToast('Veuillez entrer un nom de tag', 'error');
      return;
    }

    if (allTags.includes(newTagName.trim())) {
      showToast('Ce tag existe déjà', 'error');
      return;
    }

    setAllTags(prev => [...prev, newTagName.trim()].sort());
    setNewTagName('');
    setIsTagModalOpen(false);
    showToast('Tag créé avec succès', 'success');
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    if (!newTag.trim()) {
      showToast('Veuillez entrer un nom de tag', 'error');
      return;
    }

    if (allTags.includes(newTag.trim()) && newTag.trim() !== oldTag) {
      showToast('Ce tag existe déjà', 'error');
      return;
    }

    // Mettre à jour tous les assets qui utilisent ce tag
    const updates = assets
      .filter(asset => asset.tags?.includes(oldTag))
      .map(asset => ({
        id: asset.id,
        tags: asset.tags?.map(t => t === oldTag ? newTag.trim() : t) || [],
      }));

    if (updates.length > 0) {
      onUpdateAssets(updates);
    }

    setAllTags(prev => prev.map(t => t === oldTag ? newTag.trim() : t).sort());
    setEditingTag(null);
    showToast('Tag renommé avec succès', 'success');
  };

  const handleDeleteTag = (tag: string) => {
    // Retirer le tag de tous les assets qui l'utilisent
    const updates = assets
      .filter(asset => asset.tags?.includes(tag))
      .map(asset => ({
        id: asset.id,
        tags: asset.tags?.filter(t => t !== tag) || [],
      }));

    if (updates.length > 0) {
      onUpdateAssets(updates);
    }

    setAllTags(prev => prev.filter(t => t !== tag));
    setTagToDelete(null);
    showToast('Tag supprimé avec succès', 'success');
  };

  const handleToggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleAddTagsToSelected = (tags: string[]) => {
    if (selectedAssets.size === 0) {
      showToast('Veuillez sélectionner au moins un asset', 'error');
      return;
    }

    const updates = Array.from(selectedAssets).map(assetId => {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return null;
      
      const existingTags = asset.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];
      
      return {
        id: assetId,
        tags: newTags,
      };
    }).filter(Boolean) as Array<{ id: string; tags: string[] }>;

    onUpdateAssets(updates);
    setSelectedAssets(new Set());
    showToast(`${updates.length} asset(s) mis à jour`, 'success');
  };

  const handleRemoveTagsFromSelected = (tags: string[]) => {
    if (selectedAssets.size === 0) {
      showToast('Veuillez sélectionner au moins un asset', 'error');
      return;
    }

    const updates = Array.from(selectedAssets).map(assetId => {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return null;
      
      const existingTags = asset.tags || [];
      const newTags = existingTags.filter(t => !tags.includes(t));
      
      return {
        id: assetId,
        tags: newTags,
      };
    }).filter(Boolean) as Array<{ id: string; tags: string[] }>;

    onUpdateAssets(updates);
    setSelectedAssets(new Set());
    showToast(`${updates.length} asset(s) mis à jour`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Filtres et recherche */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>
        <Dropdown
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value)}
          options={CATEGORIES}
          containerClassName="w-48"
        />
        <Button
          size="sm"
          variant="outline"
          icon={Tag}
          onClick={() => setIsTagModalOpen(true)}
        >
          Gérer les tags
        </Button>
      </div>

      {/* Actions en masse */}
      {selectedAssets.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
              {selectedAssets.size} asset(s) sélectionné(s)
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedAssets(new Set())}
            >
              Annuler
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 10).map(tag => (
              <Badge
                key={tag}
                className="cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-800"
                onClick={() => handleAddTagsToSelected([tag])}
              >
                + {tag}
              </Badge>
            ))}
            {allTags.length > 10 && (
              <Badge
                className="cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-800"
                onClick={() => setIsTagModalOpen(true)}
              >
                + Plus...
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Liste des assets avec tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Button
            size="sm"
            variant="ghost"
            icon={selectedAssets.size === filteredAssets.length ? CheckSquare : Square}
            onClick={handleSelectAll}
          >
            Tout sélectionner
          </Button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredAssets.length} asset(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              className={`p-3 rounded-lg border transition-all duration-500 cursor-pointer ${
                selectedAssets.has(asset.id)
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
              onClick={() => handleToggleAssetSelection(asset.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {asset.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {asset.type.toUpperCase()} • {asset.size}
                  </p>
                </div>
                {selectedAssets.has(asset.id) && (
                  <div className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                    <CheckSquare size={16} />
                  </div>
                )}
              </div>
              {asset.tags && asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {asset.tags.map(tag => (
                    <Badge
                      key={tag}
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery(tag);
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de gestion des tags */}
      <Modal
        isOpen={isTagModalOpen}
        onClose={() => {
          setIsTagModalOpen(false);
          setNewTagName('');
          setEditingTag(null);
        }}
        title="Gérer les tags"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Créer un nouveau tag */}
          <div>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTag();
                  }
                }}
                className="flex-1"
              />
              <Button icon={Plus} onClick={handleCreateTag}>
                Ajouter
              </Button>
            </div>
          </div>

          {/* Liste des tags existants */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">
              Tags existants ({allTags.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTags.map(tag => {
                const assetCount = assets.filter(a => a.tags?.includes(tag)).length;
                return (
                  <div
                    key={tag}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Tag size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">{tag}</span>
                      <Badge variant="outline" className="text-xs">
                        {assetCount} asset(s)
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit2}
                        onClick={() => {
                          setEditingTag(tag);
                          setNewTagName(tag);
                        }}
                        title="Renommer"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => setTagToDelete(tag)}
                        className="text-rose-600"
                        title="Supprimer"
                      />
                    </div>
                  </div>
                );
              })}
              {allTags.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  Aucun tag créé. Créez votre premier tag ci-dessus.
                </p>
              )}
            </div>
          </div>

          {/* Édition de tag */}
          {editingTag && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                Renommer le tag "{editingTag}"
              </h3>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nouveau nom"
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    handleRenameTag(editingTag, newTagName);
                    setEditingTag(null);
                    setNewTagName('');
                  }}
                >
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTag(null);
                    setNewTagName('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsTagModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={tagToDelete !== null}
        onClose={() => setTagToDelete(null)}
        title="Supprimer le tag"
      >
        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300">
            Êtes-vous sûr de vouloir supprimer le tag "{tagToDelete}" ?
            Ce tag sera retiré de tous les assets qui l'utilisent.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTagToDelete(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => tagToDelete && handleDeleteTag(tagToDelete)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

