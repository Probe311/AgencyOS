/**
 * API endpoint Vercel Serverless Function pour tracker les clics sur les liens dans les emails
 * Redirige vers l'URL originale après avoir tracké le clic
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAnon } from '../utils/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Accepter GET uniquement (pour les redirections)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, email_id, lead_id, link_id, type } = req.query;

    // Vérifier les paramètres requis
    if (!url || !email_id || !lead_id || type !== 'click') {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Décoder l'URL originale
    let originalUrl: string;
    try {
      originalUrl = decodeURIComponent(url as string);
    } catch (error) {
      originalUrl = url as string; // Fallback si le décodage échoue
    }

    // Valider que l'URL est valide
    try {
      new URL(originalUrl);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL' });
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
    const referer = req.headers['referer'] || '';

    // Vérifier si un tracking existe déjà pour cet email/lead
    const { data: existingTracking } = await supabaseAnon
      .from('email_tracking')
      .select('id, clicked_links, total_clicks, is_clicked')
      .eq('email_id', email_id)
      .eq('lead_id', lead_id)
      .maybeSingle();

    const clickedAt = new Date().toISOString();
    const linkData = {
      url: originalUrl,
      clicked_at: clickedAt,
      link_id: link_id || 'default',
      user_agent: userAgent,
      ip_address: ipAddress,
      referer: referer,
    };

    if (existingTracking) {
      // Mettre à jour le tracking existant
      const clickedLinks = existingTracking.clicked_links || [];
      
      // Vérifier si ce lien a déjà été cliqué
      const existingLinkIndex = clickedLinks.findIndex(
        (link: any) => link.url === originalUrl && link.link_id === (link_id || 'default')
      );

      let updatedClickedLinks: any[];
      if (existingLinkIndex >= 0) {
        // Incrémenter le compteur du lien existant
        updatedClickedLinks = [...clickedLinks];
        updatedClickedLinks[existingLinkIndex] = {
          ...updatedClickedLinks[existingLinkIndex],
          count: (updatedClickedLinks[existingLinkIndex].count || 1) + 1,
          last_clicked_at: clickedAt,
        };
      } else {
        // Ajouter un nouveau lien
        updatedClickedLinks = [...clickedLinks, { ...linkData, count: 1 }];
      }

      await supabaseAnon
        .from('email_tracking')
        .update({
          clicked_links: updatedClickedLinks,
          total_clicks: (existingTracking.total_clicks || 0) + 1,
          is_clicked: true,
          user_agent: userAgent,
          ip_address: ipAddress,
          metadata: {
            last_clicked_at: clickedAt,
            last_clicked_url: originalUrl,
            referer: referer,
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
        clicked_links: [{ ...linkData, count: 1 }],
        total_clicks: 1,
        is_clicked: true,
        user_agent: userAgent,
        ip_address: ipAddress,
        metadata: {
          first_clicked_at: clickedAt,
          first_clicked_url: originalUrl,
          referer: referer,
        },
      });
    }

    // Rediriger vers l'URL originale
    return res.redirect(302, originalUrl);
  } catch (error: any) {
    console.error('Error tracking email click:', error);
    
    // Si on a une URL, rediriger quand même vers elle
    const { url } = req.query;
    if (url) {
      try {
        const originalUrl = decodeURIComponent(url as string);
        new URL(originalUrl); // Valider l'URL
        return res.redirect(302, originalUrl);
      } catch (urlError) {
        // Si l'URL est invalide, retourner une erreur
      }
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}

