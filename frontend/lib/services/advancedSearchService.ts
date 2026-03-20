import { supabase } from '../supabase';
import { generateEmbedding } from '../ai-client';

export interface SearchFilters {
  entity_types?: string[];
  date_from?: string;
  date_to?: string;
  created_by?: string;
  assigned_to?: string;
  status?: string;
  tags?: string[];
  project_id?: string;
}

export interface SearchResult {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  content?: string;
  metadata?: Record<string, any>;
  relevance_score?: number;
  highlights?: string[];
}

export interface SearchSuggestion {
  id: string;
  query: string;
  suggestion: string;
  suggestion_type: 'autocomplete' | 'related' | 'popular' | 'ai_generated';
  usage_count: number;
}

/**
 * Service de recherche avancée
 */
export class AdvancedSearchService {
  /**
   * Recherche full-text avec PostgreSQL
   */
  static async fullTextSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<SearchResult[]> {
    try {
      // Construire la requête full-text
      let searchQuery = supabase
        .from('search_index')
        .select('*')
        .limit(limit);

      // Recherche full-text PostgreSQL
      if (query.trim()) {
        const searchTerm = query.trim().split(' ').map(term => `%${term}%`).join(' & ');
        searchQuery = searchQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%,ocr_text.ilike.%${query}%`);
      }

      // Appliquer les filtres
      if (filters?.entity_types && filters.entity_types.length > 0) {
        searchQuery = searchQuery.in('entity_type', filters.entity_types);
      }

      if (filters?.date_from) {
        searchQuery = searchQuery.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        searchQuery = searchQuery.lte('created_at', filters.date_to);
      }

      const { data, error } = await searchQuery.order('updated_at', { ascending: false });

      if (error) throw error;

      // Enregistrer la recherche dans l'historique
      await this.saveSearchHistory(query, 'fulltext', filters, data?.length || 0);

      return (data || []).map(item => ({
        id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        title: item.title,
        content: item.content,
        metadata: item.metadata,
        highlights: this.highlightMatches(query, item.content || '')
      }));
    } catch (error: any) {
      console.error('Full-text search error:', error);
      return [];
    }
  }

  /**
   * Recherche sémantique avec embeddings IA
   */
  static async semanticSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<SearchResult[]> {
    try {
      // Générer l'embedding de la requête
      const queryEmbedding = await generateEmbedding(query);
      if (!queryEmbedding) {
        // Fallback sur full-text si l'embedding échoue
        return this.fullTextSearch(query, filters, limit);
      }

      // Recherche par similarité cosinus (nécessite l'extension pgvector)
      // Note: Cette requête nécessite une fonction PostgreSQL personnalisée
      // Pour l'instant, simulation avec recherche full-text améliorée
      const { data, error } = await supabase
        .rpc('semantic_search', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: limit,
          filter_entity_types: filters?.entity_types || null
        });

      if (error) {
        // Fallback sur full-text
        return this.fullTextSearch(query, filters, limit);
      }

      // Enregistrer la recherche
      await this.saveSearchHistory(query, 'semantic', filters, data?.length || 0);

      return (data || []).map((item: any) => ({
        id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        title: item.title,
        content: item.content,
        metadata: item.metadata,
        relevance_score: item.similarity,
        highlights: this.highlightMatches(query, item.content || '')
      }));
    } catch (error: any) {
      console.error('Semantic search error:', error);
      return this.fullTextSearch(query, filters, limit);
    }
  }

  /**
   * Recherche dans les documents OCR
   */
  static async ocrSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('document_ocr_results')
        .select('*, documents(id, name, file_url)')
        .or(`ocr_text.ilike.%${query}%`)
        .order('confidence_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Enregistrer la recherche
      await this.saveSearchHistory(query, 'ocr', filters, data?.length || 0);

      return (data || []).map((item: any) => ({
        id: item.id,
        entity_type: 'document',
        entity_id: item.document_id,
        title: item.documents?.name || 'Document',
        content: item.ocr_text,
        metadata: {
          page_number: item.page_number,
          confidence_score: item.confidence_score,
          file_url: item.documents?.file_url
        },
        highlights: this.highlightMatches(query, item.ocr_text)
      }));
    } catch (error: any) {
      console.error('OCR search error:', error);
      return [];
    }
  }

  /**
   * Recherche hybride (full-text + sémantique)
   */
  static async hybridSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<SearchResult[]> {
    try {
      // Exécuter les deux recherches en parallèle
      const [fullTextResults, semanticResults] = await Promise.all([
        this.fullTextSearch(query, filters, limit),
        this.semanticSearch(query, filters, limit)
      ]);

      // Fusionner et dédupliquer les résultats
      const resultsMap = new Map<string, SearchResult>();

      // Ajouter les résultats full-text avec poids 0.4
      fullTextResults.forEach(result => {
        const key = `${result.entity_type}_${result.entity_id}`;
        resultsMap.set(key, {
          ...result,
          relevance_score: (result.relevance_score || 0) * 0.4
        });
      });

      // Ajouter les résultats sémantiques avec poids 0.6
      semanticResults.forEach(result => {
        const key = `${result.entity_type}_${result.entity_id}`;
        const existing = resultsMap.get(key);
        if (existing) {
          existing.relevance_score = (existing.relevance_score || 0) + (result.relevance_score || 0) * 0.6;
        } else {
          resultsMap.set(key, {
            ...result,
            relevance_score: (result.relevance_score || 0) * 0.6
          });
        }
      });

      // Trier par score de pertinence
      const results = Array.from(resultsMap.values())
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, limit);

      // Enregistrer la recherche
      await this.saveSearchHistory(query, 'hybrid', filters, results.length);

      return results;
    } catch (error: any) {
      console.error('Hybrid search error:', error);
      return this.fullTextSearch(query, filters, limit);
    }
  }

  /**
   * Obtient les suggestions de recherche
   */
  static async getSuggestions(
    query: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('search_suggestions')
        .select('*')
        .ilike('query', `%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Si pas assez de suggestions, générer avec IA
      if ((data || []).length < 3 && query.length > 2) {
        const aiSuggestions = await this.generateAISuggestions(query);
        return [...(data || []), ...aiSuggestions].slice(0, limit);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * Génère des suggestions avec IA
   */
  private static async generateAISuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      // TODO: Utiliser l'IA pour générer des suggestions basées sur l'historique
      // Pour l'instant, retourner des suggestions basiques
      return [
        {
          id: `ai_${Date.now()}`,
          query: query,
          suggestion: `${query} dans les projets`,
          suggestion_type: 'ai_generated',
          usage_count: 0
        },
        {
          id: `ai_${Date.now() + 1}`,
          query: query,
          suggestion: `${query} dans les tâches`,
          suggestion_type: 'ai_generated',
          usage_count: 0
        }
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Enregistre une recherche dans l'historique
   */
  private static async saveSearchHistory(
    query: string,
    searchType: 'fulltext' | 'semantic' | 'ocr' | 'hybrid',
    filters?: SearchFilters,
    resultsCount: number = 0,
    userId?: string
  ): Promise<void> {
    try {
      await supabase
        .from('search_history')
        .insert([{
          user_id: userId,
          query,
          search_type: searchType,
          filters: filters || {},
          results_count: resultsCount
        }]);
    } catch (error) {
      // Ne pas faire échouer la recherche en cas d'erreur d'historique
      console.error('Save search history error:', error);
    }
  }

  /**
   * Met en évidence les correspondances dans le texte
   */
  private static highlightMatches(query: string, text: string): string[] {
    if (!text || !query) return [];

    const terms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const highlights: string[] = [];
    const lowerText = text.toLowerCase();

    terms.forEach(term => {
      const index = lowerText.indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + term.length + 50);
        highlights.push(text.substring(start, end));
      }
    });

    return highlights.slice(0, 3); // Maximum 3 highlights
  }

  /**
   * Indexe une entité pour la recherche
   */
  static async indexEntity(
    entityType: string,
    entityId: string,
    title: string,
    content?: string,
    metadata?: Record<string, any>,
    ocrText?: string
  ): Promise<void> {
    try {
      // Générer l'embedding sémantique si possible
      let semanticVector: number[] | null = null;
      try {
        const embeddingText = `${title} ${content || ''}`.substring(0, 8000);
        semanticVector = await generateEmbedding(embeddingText);
      } catch (error) {
        // Ignorer les erreurs d'embedding
      }

      await supabase
        .from('search_index')
        .upsert([{
          entity_type: entityType,
          entity_id: entityId,
          title,
          content: content || null,
          metadata: metadata || {},
          semantic_vector: semanticVector,
          ocr_text: ocrText || null,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'entity_type,entity_id'
        });
    } catch (error: any) {
      console.error('Index entity error:', error);
    }
  }

  /**
   * Récupère l'historique de recherche d'un utilisateur
   */
  static async getSearchHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Get search history error:', error);
      return [];
    }
  }
}

