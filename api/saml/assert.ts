/**
 * Endpoint pour traiter une assertion SAML (ACS - Assertion Consumer Service)
 * Reçoit la réponse SAML depuis l'IdP et authentifie l'utilisateur
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
    const { SAMLResponse, RelayState } = req.body;

    if (!SAMLResponse) {
      return res.status(400).json({ error: 'SAMLResponse is required' });
    }

    // Décoder la réponse SAML
    const samlResponse = Buffer.from(SAMLResponse, 'base64').toString('utf-8');

    // Extraire l'Entity ID de l'IdP depuis la réponse
    // Note: En production, il faudrait parser le XML pour extraire l'issuer
    // Pour simplifier, on suppose qu'on peut identifier l'IdP depuis RelayState ou la session

    // Récupérer toutes les configurations IdP actives
    const { data: idpConfigs, error: configsError } = await supabase
      .from('saml_idp_configurations')
      .select('*')
      .eq('is_active', true);

    if (configsError || !idpConfigs || idpConfigs.length === 0) {
      return res.status(500).json({ error: 'No active IdP configurations found' });
    }

    // Configuration du Service Provider
    const spOptions = {
      entity_id: process.env.SAML_SP_ENTITY_ID || `https://${req.headers.host}/saml/metadata`,
      private_key: process.env.SAML_SP_PRIVATE_KEY || '',
      certificate: process.env.SAML_SP_CERTIFICATE || '',
      assert_endpoint: `${process.env.SAML_SP_ACS_URL || `https://${req.headers.host}/api/saml/assert`}`,
    };

    let authenticatedUser: any = null;
    let idpConfig: any = null;

    // Essayer de valider la réponse avec chaque configuration IdP
    for (const config of idpConfigs) {
      try {
        const idpOptions = {
          sso_login_url: config.sso_url,
          sso_logout_url: config.slo_url,
          certificates: [config.certificate],
        };

        const sp = new saml2.ServiceProvider(spOptions);
        const idp = new saml2.IdentityProvider(idpOptions);

        // Valider et parser la réponse SAML
        sp.post_assert(idp, { SAMLResponse }, (err: any, samlAssertion: any) => {
          if (err) {
            console.error(`Error validating SAML response with IdP ${config.id}:`, err);
            return;
          }

          // Extraire les attributs
          const attributes = SAMLService.extractAttributesFromSAMLResponse(samlAssertion);
          
          // Mapper les attributs vers les champs utilisateur
          const userData = SAMLService.mapAttributesToUser(attributes, config.attribute_mapping || {});

          if (!userData.email) {
            throw new Error('Email not found in SAML attributes');
          }

          authenticatedUser = userData;
          idpConfig = config;
        });

        if (authenticatedUser) break;
      } catch (error) {
        console.error(`Error processing SAML response with IdP ${config.id}:`, error);
        continue;
      }
    }

    if (!authenticatedUser || !idpConfig) {
      return res.status(401).json({ error: 'Invalid SAML response' });
    }

    // JIT Provisioning : Créer ou mettre à jour l'utilisateur
    let user: any = null;

    if (idpConfig.jit_enabled) {
      // Vérifier si l'utilisateur existe
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authenticatedUser.email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (existingUser) {
        // Mettre à jour l'utilisateur
        const updateData: any = {};
        if (authenticatedUser.name) updateData.name = authenticatedUser.name;
        if (authenticatedUser.first_name) updateData.first_name = authenticatedUser.first_name;
        if (authenticatedUser.last_name) updateData.last_name = authenticatedUser.last_name;
        if (authenticatedUser.role) updateData.role = authenticatedUser.role;

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        user = updatedUser;
      } else {
        // Créer un nouvel utilisateur
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            email: authenticatedUser.email,
            name: authenticatedUser.name || authenticatedUser.email,
            first_name: authenticatedUser.first_name,
            last_name: authenticatedUser.last_name,
            role: authenticatedUser.role || idpConfig.jit_default_role || 'user',
            email_verified: true, // Les utilisateurs SAML sont considérés comme vérifiés
          }])
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;

        // Ajouter à l'équipe par défaut si configuré
        if (idpConfig.jit_default_team_id) {
          await supabase
            .from('team_members')
            .insert([{
              team_id: idpConfig.jit_default_team_id,
              user_id: user.id,
              role: 'member',
            }]);
        }
      }
    } else {
      // Pas de JIT : l'utilisateur doit exister
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authenticatedUser.email)
        .single();

      if (userError || !existingUser) {
        return res.status(403).json({ error: 'User not found. JIT provisioning is disabled.' });
      }

      user = existingUser;
    }

    // Créer une session Supabase pour l'utilisateur
    // Note: En production, il faudrait utiliser l'API Supabase Admin pour créer la session
    // Ici, on retourne les informations utilisateur et le frontend gérera l'authentification

    return res.status(200).json({
      user,
      session: {
        idp_config_id: idpConfig.id,
        user_id: user.id,
        status: 'completed',
      },
    });
  } catch (error: any) {
    console.error('Error processing SAML assertion:', error);
    return res.status(500).json({ error: error.message });
  }
}

