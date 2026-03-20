import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware de logging des requêtes API
 */
export async function logApiRequest(
  req: AuthenticatedRequest,
  res: VercelResponse,
  startTime: number,
  statusCode: number,
  responseBody?: any,
  errorMessage?: string
): Promise<void> {
  try {
    if (!req.apiToken) return; // Ne logger que les requêtes authentifiées

    const responseTime = Date.now() - startTime;
    const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress) as string;
    const userAgent = req.headers['user-agent'] || '';

    // Extraire le body de la requête (limité à 10KB pour éviter les logs trop volumineux)
    let requestBody: any = {};
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      if (bodyStr.length <= 10000) {
        requestBody = req.body;
      } else {
        requestBody = { _truncated: true, size: bodyStr.length };
      }
    }

    // Extraire le body de la réponse (limité à 10KB)
    let loggedResponseBody: any = {};
    if (responseBody && typeof responseBody === 'object') {
      const responseStr = JSON.stringify(responseBody);
      if (responseStr.length <= 10000) {
        loggedResponseBody = responseBody;
      } else {
        loggedResponseBody = { _truncated: true, size: responseStr.length };
      }
    }

    await supabase
      .from('api_logs')
      .insert([{
        api_token_id: req.apiToken.id,
        user_id: req.user?.id,
        method: req.method,
        endpoint: req.url || '',
        status_code: statusCode,
        response_time_ms: responseTime,
        ip_address: clientIp,
        user_agent: userAgent,
        request_body: requestBody,
        response_body: loggedResponseBody,
        error_message: errorMessage
      }]);
  } catch (error) {
    // Ne pas faire échouer la requête en cas d'erreur de logging
    console.error('Error logging API request:', error);
  }
}

/**
 * Wrapper pour logger automatiquement les réponses
 */
export function withLogging(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    const startTime = Date.now();
    let statusCode = 200;
    let responseBody: any = null;
    let errorMessage: string | undefined = undefined;

    // Intercepter la réponse
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      responseBody = body;
      statusCode = res.statusCode || 200;
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = function(body: any) {
      responseBody = body;
      statusCode = res.statusCode || 200;
      return originalSend(body);
    };

    try {
      await handler(req, res);
    } catch (error: any) {
      statusCode = res.statusCode || 500;
      errorMessage = error.message;
      throw error;
    } finally {
      // Logger la requête après la réponse
      await logApiRequest(req, res, startTime, statusCode, responseBody, errorMessage);
    }
  };
}

