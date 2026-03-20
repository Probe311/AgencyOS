/**
 * Cache pour mémoriser l'existence des tables Supabase
 * Évite les requêtes répétées vers des tables qui n'existent pas
 */
class TableExistsCache {
  private static cache: Map<string, boolean> = new Map();
  private static checking: Map<string, Promise<boolean>> = new Map();

  /**
   * Vérifie si une table existe en gérant l'erreur PGRST205
   * Retourne true si la table existe, false si elle n'existe pas, null si on ne sait pas encore
   */
  static getTableExists(tableName: string): boolean | null {
    return this.cache.get(tableName) ?? null;
  }

  /**
   * Mémorise qu'une table n'existe pas
   */
  static setTableDoesNotExist(tableName: string): void {
    this.cache.set(tableName, false);
  }

  /**
   * Mémorise qu'une table existe
   */
  static setTableExists(tableName: string): void {
    this.cache.set(tableName, true);
  }

  /**
   * Vérifie si une erreur Supabase indique que la table n'existe pas
   */
  static isTableNotFoundError(error: any): boolean {
    return error?.code === 'PGRST205' || 
           error?.message?.includes('Could not find the table') ||
           error?.message?.includes('does not exist');
  }

  /**
   * Gère une erreur de requête Supabase en vérifiant si c'est une erreur de table manquante
   * Retourne true si l'erreur a été gérée (table n'existe pas), false sinon
   */
  static handleTableError(tableName: string, error: any): boolean {
    if (this.isTableNotFoundError(error)) {
      this.setTableDoesNotExist(tableName);
      return true; // Erreur gérée
    }
    return false; // Erreur non gérée
  }

  /**
   * Vérifie si on doit faire une requête (si la table n'existe pas, on ne fait pas de requête)
   */
  static shouldSkipQuery(tableName: string): boolean {
    return this.getTableExists(tableName) === false;
  }

  /**
   * Wrapper pour exécuter une requête Supabase avec gestion automatique des erreurs de table manquante
   * @param tableName Nom de la table
   * @param queryFn Fonction qui exécute la requête Supabase
   * @param defaultValue Valeur par défaut à retourner si la table n'existe pas
   * @returns Résultat de la requête ou defaultValue si la table n'existe pas
   */
  static async executeQuery<T>(
    tableName: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    defaultValue: T | null = null
  ): Promise<{ data: T | null; error: any }> {
    // Si on sait que la table n'existe pas, retourner la valeur par défaut
    if (this.shouldSkipQuery(tableName)) {
      return { data: defaultValue, error: null };
    }

    try {
      const result = await queryFn();
      
      if (result.error) {
        // Si la table n'existe pas, mémoriser et retourner la valeur par défaut
        if (this.handleTableError(tableName, result.error)) {
          return { data: defaultValue, error: null };
        }
        // Sinon, propager l'erreur
        return result;
      }

      // Si la requête réussit, mémoriser que la table existe
      this.setTableExists(tableName);
      return result;
    } catch (error) {
      // Si la table n'existe pas, mémoriser et retourner la valeur par défaut
      if (this.handleTableError(tableName, error)) {
        return { data: defaultValue, error: null };
      }
      // Sinon, propager l'erreur
      throw error;
    }
  }
}

export default TableExistsCache;

