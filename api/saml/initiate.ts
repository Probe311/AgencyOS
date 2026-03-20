/**
 * Endpoint pour initier une requête SSO SAML
 * Génère une AuthnRequest signée et redirige vers l'IdP
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SAMLService } from '../../frontend/lib/services/samlService';
import { supabase } from '../utils/config';
import * as saml2 from 'saml2-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idp_config_id, relay_state } = req.body;

    if (!idp_config_id) {
      return res.status(400).json({ error: 'idp_config_id is required' });
    }

    // Récupérer la configuration IdP
    const { data: idpConfig, error: configError } = await supabase
      .from('saml_idp_configurations')
      .select('*')
      .eq('id', idp_config_id)
      .eq('is_active', true)
      .single();

    if (configError || !idpConfig) {
      return res.status(404).json({ error: 'IdP configuration not found' });
    }

    // Configuration du Service Provider (notre application)
    const spOptions = {
      entity_id: process.env.SAML_SP_ENTITY_ID || `https://${req.headers.host}/saml/metadata`,
      private_key: process.env.SAML_SP_PRIVATE_KEY || '', // À configurer
      certificate: process.env.SAML_SP_CERTIFICATE || '', // À configurer
      assert_endpoint: `${process.env.SAML_SP_ACS_URL || `https://${req.headers.host}/api/saml/assert`}`,
      force_authn: true,
      auth_context: {
        comparison: 'exact',
        class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'],
      },
      nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      sign_get_request: false,
      allow_unencrypted_assertion: false,
    };

    // Configuration de l'Identity Provider
    const idpOptions = {
      sso_login_url: idpConfig.sso_url,
      sso_logout_url: idpConfig.slo_url,
      certificates: [idpConfig.certificate],
      force_authn: true,
      sign_get_request: false,
      allow_unencrypted_assertion: false,
    };

    const sp = new saml2.ServiceProvider(spOptions);
    const idp = new saml2.IdentityProvider(idpOptions);

    // Générer la requête SAML
    sp.create_login_request_url(idp, {}, (err: any, loginUrl: string, requestId: string) => {
      if (err) {
        console.error('Error creating SAML request:', err);
        return res.status(500).json({ error: 'Error creating SAML request' });
      }

      // Créer une session SAML
      const sessionData = {
        idp_config_id: idp_config_id,
        saml_request_id: requestId,
        relay_state: relay_state,
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      };

      // Note: La création de session devrait être faite côté frontend après réception de la réponse
      // Ici on retourne juste l'URL de redirection

      return res.status(200).json({
        samlRequest: loginUrl,
        samlRequestId: requestId,
        redirectUrl: loginUrl,
      });
    });
  } catch (error: any) {
    console.error('Error initiating SAML SSO:', error);
    return res.status(500).json({ error: error.message });
  }
}

