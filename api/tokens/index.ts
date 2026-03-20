import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest, generateApiToken, hashToken } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

/**
 * GET /api/tokens
 * Liste les tokens API de l'utilisateur
 */
async function getTokens(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, name, token_prefix, scopes, rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, last_used_at, expires_at, is_active, created_at')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * POST /api/tokens
 * Crée un nouveau token API
 */
async function createToken(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const {
      name,
      scopes = [],
      rate_limit_per_minute = 60,
      rate_limit_per_hour = 1000,
      rate_limit_per_day = 10000,
      expires_at,
      ip_whitelist = []
    } = req.body;

    if (!name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Token name is required'
      });
      return;
    }

    // Générer le token
    const { token, tokenHash, tokenPrefix } = generateApiToken();

    // Créer le token dans la base de données
    const { data, error } = await supabase
      .from('api_tokens')
      .insert([{
        user_id: req.user!.id,
        name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        scopes: scopes,
        rate_limit_per_minute,
        rate_limit_per_hour,
        rate_limit_per_day,
        expires_at: expires_at || null,
        ip_whitelist,
        is_active: true
      }])
      .select('id, name, token_prefix, scopes, rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, expires_at, created_at')
      .single();

    if (error) throw error;

    // Retourner le token complet (seulement à la création)
    res.status(201).json({
      data: {
        ...data,
        token // Le token complet n'est retourné qu'une seule fois
      },
      warning: 'Save this token securely. It will not be shown again.'
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
}

/**
 * DELETE /api/tokens/:id
 * Supprime un token API
 */
async function deleteToken(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { error } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user!.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * PATCH /api/tokens/:id
 * Met à jour un token API (activer/désactiver, scopes, etc.)
 */
async function updateToken(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Permettre la mise à jour de certains champs
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.scopes !== undefined) updateData.scopes = req.body.scopes;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
    if (req.body.rate_limit_per_minute !== undefined) updateData.rate_limit_per_minute = req.body.rate_limit_per_minute;
    if (req.body.rate_limit_per_hour !== undefined) updateData.rate_limit_per_hour = req.body.rate_limit_per_hour;
    if (req.body.rate_limit_per_day !== undefined) updateData.rate_limit_per_day = req.body.rate_limit_per_day;
    if (req.body.ip_whitelist !== undefined) updateData.ip_whitelist = req.body.ip_whitelist;

    const { data, error } = await supabase
      .from('api_tokens')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .select('id, name, token_prefix, scopes, rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, expires_at, is_active, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Token not found'
        });
        return;
      }
      throw error;
    }

    res.json({ data });
  } catch (error: any) {
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
}

/**
 * Handler principal avec middleware
 */
export default withLogging(async (req: AuthenticatedRequest, res: VercelResponse) => {
  // Authentification (nécessite un token valide pour gérer ses propres tokens)
  await authenticateApiToken(req, res, async () => {
    // Rate limiting
    await rateLimitMiddleware(req, res, async () => {
      const method = req.method?.toUpperCase();
      const { id } = req.query;

      if (method === 'GET' && !id) {
        // Liste des tokens
        getTokens(req, res);
      } else if (method === 'POST') {
        // Créer un token
        createToken(req, res);
      } else if (method === 'PATCH' && id) {
        // Mettre à jour un token
        updateToken(req, res);
      } else if (method === 'DELETE' && id) {
        // Supprimer un token
        deleteToken(req, res);
      } else {
        res.status(405).json({
          error: 'Method Not Allowed',
          message: `${method} is not allowed on this endpoint`
        });
      }
    });
  });
});

