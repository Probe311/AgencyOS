/**
 * API endpoint Vercel Serverless Function pour tracker les ouvertures d'emails
 * Retourne un pixel transparent 1x1
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAnon } from '../utils/config';

// Pixel transparent 1x1 en PNG (base64)
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Accepter GET et HEAD (pour les pixels)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email_id, lead_id, type } = req.query;

    // Vérifier les paramètres requis
    if (!email_id || !lead_id || type !== 'open') {
      // Retourner quand même le pixel pour ne pas casser l'affichage
      return res
        .status(200)
        .setHeader('Content-Type', 'image/png')
        .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        .setHeader('Pragma', 'no-cache')
        .setHeader('Expires', '0')
        .send(TRANSPARENT_PIXEL);
    }

    if (!supabaseAnon) {
      throw new Error('Supabase anon key not configured');
    }

    // Extraire les métadonnées de la requête
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
      (req.headers['x-real-ip'] as string) || 
      req.socket?.remoteAddress || 
      '';
    const acceptLanguage = req.headers['accept-language'] || '';

    // Vérifier si un tracking existe déjà pour cet email/lead
    const { data: existingTracking } = await supabaseAnon
      .from('email_tracking')
      .select('id, open_count, first_opened_at, last_opened_at, is_opened')
      .eq('email_id', email_id)
      .eq('lead_id', lead_id)
      .maybeSingle();

    if (existingTracking) {
      // Mettre à jour le tracking existant
      const newOpenCount = (existingTracking.open_count || 0) + 1;
      const firstOpenedAt = existingTracking.first_opened_at || new Date().toISOString();

      await supabaseAnon
        .from('email_tracking')
        .update({
          open_count: newOpenCount,
          first_opened_at: firstOpenedAt,
          last_opened_at: new Date().toISOString(),
          is_opened: true,
          user_agent: userAgent,
          ip_address: ipAddress,
          metadata: {
            accept_language: acceptLanguage,
            last_opened_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTracking.id);
    } else {
      // Créer un nouveau tracking
      await supabaseAnon.from('email_tracking').insert({
        email_id,
        lead_id,
        email_type: 'manual', // Par défaut, peut être changé selon le contexte
        open_count: 1,
        first_opened_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
        is_opened: true,
        user_agent: userAgent,
        ip_address: ipAddress,
        metadata: {
          accept_language: acceptLanguage,
          first_opened_at: new Date().toISOString(),
        },
      });
    }

    // Retourner le pixel transparent
    return res
      .status(200)
      .setHeader('Content-Type', 'image/png')
      .setHeader('Content-Length', TRANSPARENT_PIXEL.length.toString())
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0')
      .send(TRANSPARENT_PIXEL);
  } catch (error: any) {
    console.error('Error tracking email open:', error);
    // Retourner quand même le pixel en cas d'erreur
    return res
      .status(200)
      .setHeader('Content-Type', 'image/png')
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .send(TRANSPARENT_PIXEL);
  }
}

