import type { VercelResponse } from '@vercel/node';

/**
 * Format standardisé des réponses d'erreur
 */
export interface ApiError {
  error: string;
  message: string;
  details?: any;
}

/**
 * Envoie une réponse d'erreur standardisée
 */
export function sendError(
  res: VercelResponse,
  statusCode: number,
  error: string,
  message: string,
  details?: any
): void {
  res.status(statusCode).json({
    error,
    message,
    ...(details && { details }),
  });
}

/**
 * Envoie une réponse de succès standardisée
 */
export function sendSuccess<T>(
  res: VercelResponse,
  data: T,
  statusCode: number = 200
): void {
  res.status(statusCode).json({ data });
}

/**
 * Envoie une réponse avec pagination
 */
export function sendPaginated<T>(
  res: VercelResponse,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  }
): void {
  res.json({
    data,
    pagination,
  });
}

