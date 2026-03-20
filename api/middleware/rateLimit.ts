import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { AuthenticatedRequest } from './auth';

interface RateLimitWindow {
  window_type: 'minute' | 'hour' | 'day';
  window_start: Date;
  limit: number;
}

/**
 * Obtient le début de la fenêtre de temps
 */
function getWindowStart(windowType: 'minute' | 'hour' | 'day'): Date {
  const now = new Date();
  const windowStart = new Date(now);

  switch (windowType) {
    case 'minute':
      windowStart.setSeconds(0, 0);
      break;
    case 'hour':
      windowStart.setMinutes(0, 0, 0);
      break;
    case 'day':
      windowStart.setHours(0, 0, 0, 0);
      break;
  }

  return windowStart;
}

/**
 * Vérifie et incrémente le compteur de rate limit
 */
async function checkAndIncrementRateLimit(
  apiTokenId: string,
  windowType: 'minute' | 'hour' | 'day',
  limit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = getWindowStart(windowType);
  
  // Rechercher ou créer l'entrée de rate limit
  const { data: existing, error: fetchError } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('api_token_id', apiTokenId)
    .eq('window_type', windowType)
    .eq('window_start', windowStart.toISOString())
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
    throw fetchError;
  }

  let requestCount = 0;
  let rateLimitId: string;

  if (existing) {
    rateLimitId = existing.id;
    requestCount = existing.request_count || 0;
  } else {
    // Créer une nouvelle entrée
    const { data: newEntry, error: insertError } = await supabase
      .from('api_rate_limits')
      .insert([{
        api_token_id: apiTokenId,
        window_type: windowType,
        window_start: windowStart.toISOString(),
        request_count: 0
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    rateLimitId = newEntry.id;
  }

  // Vérifier si la limite est atteinte
  if (requestCount >= limit) {
    // Calculer la date de reset
    const resetAt = new Date(windowStart);
    switch (windowType) {
      case 'minute':
        resetAt.setMinutes(resetAt.getMinutes() + 1);
        break;
      case 'hour':
        resetAt.setHours(resetAt.getHours() + 1);
        break;
      case 'day':
        resetAt.setDate(resetAt.getDate() + 1);
        break;
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }

  // Incrémenter le compteur
  const { error: updateError } = await supabase
    .from('api_rate_limits')
    .update({
      request_count: requestCount + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', rateLimitId);

  if (updateError) throw updateError;

  return {
    allowed: true,
    remaining: limit - (requestCount + 1),
    resetAt: getWindowStart(windowType)
  };
}

/**
 * Middleware de rate limiting
 */
export async function rateLimitMiddleware(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): Promise<void> {
  try {
    if (!req.apiToken) {
      // Pas de rate limit si pas authentifié (sera géré par auth middleware)
      next();
      return;
    }

    const { rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day } = req.apiToken;

    // Vérifier les limites dans l'ordre: minute, heure, jour
    const checks: RateLimitWindow[] = [
      { window_type: 'minute', window_start: getWindowStart('minute'), limit: rate_limit_per_minute },
      { window_type: 'hour', window_start: getWindowStart('hour'), limit: rate_limit_per_hour },
      { window_type: 'day', window_start: getWindowStart('day'), limit: rate_limit_per_day }
    ];

    for (const check of checks) {
      const result = await checkAndIncrementRateLimit(
        req.apiToken.id,
        check.window_type,
        check.limit
      );

      if (!result.allowed) {
        // Ajouter les headers de rate limit
        res.setHeader('X-RateLimit-Limit', check.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));
        res.setHeader('Retry-After', Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${check.window_type}. Limit: ${check.limit} requests per ${check.window_type}`,
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
        });
        return;
      }

      // Ajouter les headers de rate limit même en cas de succès
      res.setHeader(`X-RateLimit-${check.window_type.charAt(0).toUpperCase() + check.window_type.slice(1)}-Limit`, check.limit);
      res.setHeader(`X-RateLimit-${check.window_type.charAt(0).toUpperCase() + check.window_type.slice(1)}-Remaining`, result.remaining);
      res.setHeader(`X-RateLimit-${check.window_type.charAt(0).toUpperCase() + check.window_type.slice(1)}-Reset`, Math.floor(result.resetAt.getTime() / 1000));
    }

    next();
  } catch (error: any) {
    console.error('Rate limit error:', error);
    // En cas d'erreur, autoriser la requête pour éviter de bloquer le service
    next();
  }
}

