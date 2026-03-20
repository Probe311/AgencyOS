import { supabase } from '../supabase';

export interface SAMLIdPConfiguration {
  id: string;
  name: string;
  description?: string;
  entity_id: string;
  sso_url: string;
  slo_url?: string;
  certificate: string;
  certificate_fingerprint?: string;
  signature_algorithm: string;
  digest_algorithm: string;
  name_id_format: string;
  attribute_mapping: Record<string, string>;
  jit_enabled: boolean;
  jit_default_role: string;
  jit_default_team_id?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SAMLSession {
  id: string;
  idp_config_id: string;
  user_id: string;
  saml_request_id: string;
  saml_response_id?: string;
  relay_state?: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface SAMLAttributeMapping {
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  team?: string;
  department?: string;
}

/**
 * Service pour gérer le SSO SAML
 */
export class SAMLService {
  /**
   * Récupère toutes les configurations IdP actives
   */
  static async getActiveIdPConfigurations(): Promise<SAMLIdPConfiguration[]> {
    const { data, error } = await supabase
      .from('saml_idp_configurations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupère une configuration IdP par ID
   */
  static async getIdPConfiguration(id: string): Promise<SAMLIdPConfiguration | null> {
    const { data, error } = await supabase
      .from('saml_idp_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Crée une configuration IdP
   */
  static async createIdPConfiguration(
    config: Omit<SAMLIdPConfiguration, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SAMLIdPConfiguration> {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('saml_idp_configurations')
      .insert([{
        ...config,
        created_by: user?.user?.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Met à jour une configuration IdP
   */
  static async updateIdPConfiguration(
    id: string,
    updates: Partial<SAMLIdPConfiguration>
  ): Promise<void> {
    const { error } = await supabase
      .from('saml_idp_configurations')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Supprime une configuration IdP
   */
  static async deleteIdPConfiguration(id: string): Promise<void> {
    const { error } = await supabase
      .from('saml_idp_configurations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Génère une requête SAML AuthnRequest
   * Cette fonction doit être appelée côté backend pour générer la requête signée
   */
  static async initiateSSO(idpConfigId: string, relayState?: string): Promise<{
    samlRequest: string;
    samlRequestId: string;
    redirectUrl: string;
  }> {
    // Appeler l'API backend pour générer la requête SAML
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/saml/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idp_config_id: idpConfigId,
        relay_state: relayState,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'initiation du SSO');
    }

    return await response.json();
  }

  /**
   * Traite une réponse SAML
   * Cette fonction doit être appelée côté backend après la redirection depuis l'IdP
   */
  static async processSAMLResponse(
    samlResponse: string,
    relayState?: string
  ): Promise<{
    user: any;
    session: SAMLSession;
  }> {
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/saml/assert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        SAMLResponse: samlResponse,
        RelayState: relayState,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors du traitement de la réponse SAML');
    }

    return await response.json();
  }

  /**
   * Crée une session SAML
   */
  static async createSAMLSession(
    idpConfigId: string,
    samlRequestId: string,
    relayState?: string
  ): Promise<SAMLSession> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Utilisateur non authentifié');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes d'expiration

    const { data, error } = await supabase
      .from('saml_sessions')
      .insert([{
        idp_config_id: idpConfigId,
        user_id: user.user.id,
        saml_request_id: samlRequestId,
        relay_state: relayState,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Met à jour une session SAML
   */
  static async updateSAMLSession(
    sessionId: string,
    updates: Partial<SAMLSession>
  ): Promise<void> {
    const { error } = await supabase
      .from('saml_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Récupère une session SAML par request ID
   */
  static async getSAMLSessionByRequestId(
    samlRequestId: string
  ): Promise<SAMLSession | null> {
    const { data, error } = await supabase
      .from('saml_sessions')
      .select('*')
      .eq('saml_request_id', samlRequestId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }

  /**
   * Nettoie les sessions expirées
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('saml_sessions')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now);

    if (error) throw error;
  }

  /**
   * Valide une configuration IdP
   */
  static validateIdPConfiguration(config: Partial<SAMLIdPConfiguration>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Le nom est requis');
    }

    if (!config.entity_id || config.entity_id.trim().length === 0) {
      errors.push('L\'Entity ID est requis');
    }

    if (!config.sso_url || config.sso_url.trim().length === 0) {
      errors.push('L\'URL SSO est requise');
    }

    if (!config.certificate || config.certificate.trim().length === 0) {
      errors.push('Le certificat est requis');
    }

    // Valider l'URL SSO
    if (config.sso_url) {
      try {
        new URL(config.sso_url);
      } catch {
        errors.push('L\'URL SSO n\'est pas valide');
      }
    }

    // Valider le certificat (format X.509)
    if (config.certificate) {
      const cert = config.certificate.trim();
      if (!cert.includes('-----BEGIN CERTIFICATE-----') || !cert.includes('-----END CERTIFICATE-----')) {
        errors.push('Le certificat doit être au format X.509 PEM');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extrait les attributs depuis une réponse SAML
   */
  static extractAttributesFromSAMLResponse(samlResponse: any): Record<string, any> {
    // Cette fonction sera utilisée côté backend pour extraire les attributs
    // depuis la réponse SAML décodée
    const attributes: Record<string, any> = {};

    if (samlResponse.attributes) {
      Object.entries(samlResponse.attributes).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          attributes[key] = value[0];
        } else {
          attributes[key] = value;
        }
      });
    }

    return attributes;
  }

  /**
   * Mappe les attributs SAML vers les champs utilisateur
   */
  static mapAttributesToUser(
    attributes: Record<string, any>,
    mapping: SAMLAttributeMapping
  ): {
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    team_id?: string;
  } {
    const user: any = {};

    // Email (requis)
    if (mapping.email && attributes[mapping.email]) {
      user.email = attributes[mapping.email];
    } else if (attributes.email) {
      user.email = attributes.email;
    }

    // Nom complet
    if (mapping.name && attributes[mapping.name]) {
      user.name = attributes[mapping.name];
    } else if (attributes.name) {
      user.name = attributes.name;
    }

    // Prénom
    if (mapping.first_name && attributes[mapping.first_name]) {
      user.first_name = attributes[mapping.first_name];
    } else if (attributes.firstName || attributes.first_name) {
      user.first_name = attributes.firstName || attributes.first_name;
    }

    // Nom de famille
    if (mapping.last_name && attributes[mapping.last_name]) {
      user.last_name = attributes[mapping.last_name];
    } else if (attributes.lastName || attributes.last_name || attributes.surname) {
      user.last_name = attributes.lastName || attributes.last_name || attributes.surname;
    }

    // Rôle
    if (mapping.role && attributes[mapping.role]) {
      user.role = attributes[mapping.role];
    } else if (attributes.role) {
      user.role = attributes.role;
    }

    // Équipe (sera géré séparément via JIT)
    if (mapping.team && attributes[mapping.team]) {
      user.team_id = attributes[mapping.team];
    }

    return user;
  }
}

