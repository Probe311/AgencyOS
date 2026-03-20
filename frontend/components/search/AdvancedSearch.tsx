import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, Filter, Sparkles, FileText, Clock, TrendingUp,
  Layers, User, Briefcase, Target, MessageSquare, Image, File,
  ChevronDown, ChevronUp, Calendar, Tag, UserCircle, CheckCircle2
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';
import { AdvancedSearchService, SearchResult, SearchSuggestion, SearchFilters } from '../../lib/services/advancedSearchService';

export const AdvancedSearch: React.FC = () => {
  const { showToast, user } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'fulltext' | 'semantic' | 'ocr' | 'hybrid'>('hybrid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      // Délai pour éviter trop de requêtes
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        loadSuggestions();
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const loadSearchHistory = async () => {
    if (!user?.id) return;
    try {
      const history = await AdvancedSearchService.getSearchHistory(user.id, 10);
      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const suggs = await AdvancedSearchService.getSuggestions(query, 5);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      let searchResults: SearchResult[] = [];

      switch (searchType) {
        case 'fulltext':
          searchResults = await AdvancedSearchService.fullTextSearch(query, filters);
          break;
        case 'semantic':
          searchResults = await AdvancedSearchService.semanticSearch(query, filters);
          break;
        case 'ocr':
          searchResults = await AdvancedSearchService.ocrSearch(query, filters);
          break;
        case 'hybrid':
        default:
          searchResults = await AdvancedSearchService.hybridSearch(query, filters);
          break;
      }

      setResults(searchResults);
      loadSearchHistory();
    } catch (error: any) {
      showToast('Erreur lors de la recherche', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getEntityIcon = (entityType: string) => {
    const icons: Record<string, any> = {
      task: Layers,
      lead: Target,
      project: Briefcase,
      document: FileText,
      user: User,
      message: MessageSquare,
      image: Image,
      file: File
    };
    return icons[entityType] || FileText;
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      task: 'Tâche',
      lead: 'Lead',
      project: 'Projet',
      document: 'Document',
      user: 'Utilisateur',
      message: 'Message',
      image: 'Image',
      file: 'Fichier'
    };
    return labels[entityType] || entityType;
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    setIsResultModalOpen(true);

    // Enregistrer le clic dans l'historique
    if (user?.id) {
      AdvancedSearchService.saveSearchHistory(
        query,
        searchType,
        filters,
        results.length,
        user.id
      );
    }
  };

  return (
    <PageLayout
      header={{
        icon: Search,
        title: "Recherche Avancée",
        description: "Recherche full-text, sémantique et OCR dans tous vos contenus"
      }}
    >
      <div className="space-y-6">
        {/* Barre de recherche */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Rechercher dans tous les contenus..."
                icon={Search}
                className="pr-12"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setSuggestions([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && query.length > 2 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => {
                        setQuery(suggestion.suggestion);
                        setSuggestions([]);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"
                    >
                      <Sparkles size={14} className="text-blue-500" />
                      <span>{suggestion.suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Dropdown
              value={searchType}
              onChange={(value) => setSearchType(value as any)}
              options={[
                { value: 'hybrid', label: 'Hybride (recommandé)' },
                { value: 'fulltext', label: 'Full-text' },
                { value: 'semantic', label: 'Sémantique IA' },
                { value: 'ocr', label: 'OCR Documents' }
              ]}
            />
            <Button
              variant="primary"
              icon={Search}
              onClick={handleSearch}
              isLoading={isSearching}
              disabled={!query.trim()}
            >
              Rechercher
            </Button>
            <Button
              variant="outline"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
            </Button>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Types d'entités
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['task', 'lead', 'project', 'document'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.entity_types?.includes(type)}
                          onChange={(e) => {
                            const types = filters.entity_types || [];
                            if (e.target.checked) {
                              setFilters({ ...filters, entity_types: [...types, type] });
                            } else {
                              setFilters({ ...filters, entity_types: types.filter(t => t !== type) });
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {getEntityLabel(type)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date de création
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.date_from || ''}
                      onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                      placeholder="De"
                    />
                    <Input
                      type="date"
                      value={filters.date_to || ''}
                      onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                      placeholder="À"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Statut
                  </label>
                  <Input
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    placeholder="Filtrer par statut"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {results.map((result) => {
                const Icon = getEntityIcon(result.entity_type);
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <Icon className="text-blue-600 dark:text-blue-400" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {result.title}
                          </h4>
                          <Badge variant="slate">{getEntityLabel(result.entity_type)}</Badge>
                          {result.relevance_score && (
                            <Badge variant="blue">
                              {(result.relevance_score * 100).toFixed(0)}% pertinence
                            </Badge>
                          )}
                        </div>
                        {result.content && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                            {result.content.substring(0, 200)}...
                          </p>
                        )}
                        {result.highlights && result.highlights.length > 0 && (
                          <div className="space-y-1">
                            {result.highlights.map((highlight, idx) => (
                              <p key={idx} className="text-xs text-slate-500 dark:text-slate-400 italic">
                                ...{highlight}...
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Historique de recherche */}
        {results.length === 0 && searchHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock size={18} />
              Recherches récentes
            </h3>
            <div className="space-y-2">
              {searchHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setQuery(item.query);
                    setSearchType(item.search_type);
                    handleSearch();
                  }}
                  className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.query}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.results_count} résultats
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Détails Résultat */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title={selectedResult?.title || 'Détails'}
        size="lg"
      >
        {selectedResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="slate">{getEntityLabel(selectedResult.entity_type)}</Badge>
              {selectedResult.relevance_score && (
                <Badge variant="blue">
                  {(selectedResult.relevance_score * 100).toFixed(0)}% pertinence
                </Badge>
              )}
            </div>
            {selectedResult.content && (
              <div>
                <h5 className="font-medium text-slate-900 dark:text-white mb-2">Contenu:</h5>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedResult.content}
                </p>
              </div>
            )}
            {selectedResult.metadata && Object.keys(selectedResult.metadata).length > 0 && (
              <div>
                <h5 className="font-medium text-slate-900 dark:text-white mb-2">Métadonnées:</h5>
                <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded overflow-auto">
                  {JSON.stringify(selectedResult.metadata, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  // Navigation vers l'entité
                  window.location.href = `/${selectedResult.entity_type}/${selectedResult.entity_id}`;
                }}
              >
                Voir les détails
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

