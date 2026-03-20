import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { supabase } from '../utils/config';

export interface AuthenticatedRequest extends VercelRequest {
  apiToken?: {
    id: string;
    user_id: string;
    scopes: string[];
    rate_limit_per_minute: number;
    rate_limit_per_hour: number;
    rate_limit_per_day: number;
  };
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
}

/**
 * Hash un token API pour stockage sécurisé
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Génère un token API sécurisé
 */
export function generateApiToken(): { token: string; tokenHash: string; tokenPrefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const token = `agsk_${randomBytes.toString('base64url')}`;
  const tokenHash = hashToken(token);
  const tokenPrefix = token.substring(0, 12) + '...';
  
  return { token, tokenHash, tokenPrefix };
}

/**
 * Extrait le token depuis l'en-tête Authorization
 */
function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // Support Bearer token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Support API key dans header
  if (authHeader.startsWith('ApiKey ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Vérifie si un scope est autorisé
 */
export function hasScope(tokenScopes: string[], requiredScope: string): boolean {
  // Support wildcard
  if (tokenScopes.includes('*')) return true;
  
  // Support exact match
  if (tokenScopes.includes(requiredScope)) return true;
  
  // Support prefix match (ex: 'leads:*' pour 'leads:read')
  const scopeParts = requiredScope.split(':');
  if (scopeParts.length === 2) {
    const prefixScope = `${scopeParts[0]}:*`;
    if (tokenScopes.includes(prefixScope)) return true;
  }
  
  return false;
}

/**
 * Middleware d'authentification API
 */
export async function authenticateApiToken(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API token is required. Provide it in the Authorization header as: Bearer <token>'
      });
      return;
    }

    // Hash le token pour recherche
    const tokenHash = hashToken(token);

    // Rechercher le token dans la base de données
    const { data: apiToken, error: tokenError } = await supabase
      .from('api_tokens')
      .select('*, users(id, email, name)')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (tokenError || !apiToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired API token'
      });
      return;
    }

    // Vérifier l'expiration
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API token has expired'
      });
      return;
    }

    // Vérifier la whitelist IP si configurée
    if (apiToken.ip_whitelist && apiToken.ip_whitelist.length > 0) {
      const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress;
      const allowedIps = apiToken.ip_whitelist;
      
      if (!clientIp || !allowedIps.includes(clientIp as string)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'IP address not whitelisted'
        });
        return;
      }
    }

    // Attacher les informations du token à la requête
    req.apiToken = {
      id: apiToken.id,
      user_id: apiToken.user_id,
      scopes: apiToken.scopes || [],
      rate_limit_per_minute: apiToken.rate_limit_per_minute || 60,
      rate_limit_per_hour: apiToken.rate_limit_per_hour || 1000,
      rate_limit_per_day: apiToken.rate_limit_per_day || 10000
    };

    if (apiToken.users) {
      req.user = {
        id: apiToken.users.id,
        email: apiToken.users.email,
        name: apiToken.users.name
      };
    }

    // Mettre à jour last_used_at
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiToken.id);

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware de vérification de scope
 */
export function requireScope(requiredScope: string) {
  return (req: AuthenticatedRequest, res: VercelResponse, next: () => void) => {
    if (!req.apiToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    if (!hasScope(req.apiToken.scopes, requiredScope)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required scope: ${requiredScope}`
      });
      return;
    }

    next();
  };
}

