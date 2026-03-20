import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

/**
 * GET /api/campaigns
 * Liste les campagnes avec pagination et filtres
 */
async function getCampaigns(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const {
      page = '1',
      limit = '50',
      status,
      type,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.id);

    // Filtres
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Tri
    const order = sort_order === 'asc' ? { ascending: true } : { ascending: false };
    query = query.order(sort_by as string, order);

    // Pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * POST /api/campaigns
 * Crée une nouvelle campagne
 */
async function createCampaign(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { name, description, type, status, budget, start_date, end_date, target_audience, settings } = req.body;

    if (!name || !type) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name and type are required'
      });
      return;
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([{
        name,
        description,
        type,
        status: status || 'draft',
        budget,
        start_date,
        end_date,
        target_audience,
        settings,
        user_id: req.user!.id,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data: campaign });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * GET /api/campaigns/:id
 * Récupère une campagne spécifique
 */
async function getCampaign(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Campaign not found'
        });
        return;
      }
      throw error;
    }

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * PUT /api/campaigns/:id
 * Met à jour une campagne
 */
async function updateCampaign(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const { name, description, status, budget, start_date, end_date, target_audience, settings } = req.body;

    // Vérifier que la campagne appartient à l'utilisateur
    const { data: existing, error: checkError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (checkError || !existing) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (budget !== undefined) updateData.budget = budget;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (settings !== undefined) updateData.settings = settings;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data: campaign });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * DELETE /api/campaigns/:id
 * Supprime une campagne
 */
async function deleteCampaign(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que la campagne appartient à l'utilisateur
    const { data: existing, error: checkError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (checkError || !existing) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
      return;
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * GET /api/campaigns/:id/stats
 * Récupère les statistiques d'une campagne
 */
async function getCampaignStats(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que la campagne appartient à l'utilisateur
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (campaignError || !campaign) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
      return;
    }

    // Calculer les statistiques selon le type de campagne
    let stats: any = {
      total_sent: 0,
      total_opened: 0,
      total_clicked: 0,
      total_converted: 0,
      open_rate: 0,
      click_rate: 0,
      conversion_rate: 0,
    };

    if (campaign.type === 'email') {
      // Statistiques email
      const { data: emailCampaigns } = await supabase
        .from('email_campaigns')
        .select('sent_count, open_count, click_count, conversion_count')
        .eq('campaign_id', id);

      if (emailCampaigns) {
        stats.total_sent = emailCampaigns.reduce((sum, ec) => sum + (ec.sent_count || 0), 0);
        stats.total_opened = emailCampaigns.reduce((sum, ec) => sum + (ec.open_count || 0), 0);
        stats.total_clicked = emailCampaigns.reduce((sum, ec) => sum + (ec.click_count || 0), 0);
        stats.total_converted = emailCampaigns.reduce((sum, ec) => sum + (ec.conversion_count || 0), 0);
        stats.open_rate = stats.total_sent > 0 ? (stats.total_opened / stats.total_sent) * 100 : 0;
        stats.click_rate = stats.total_sent > 0 ? (stats.total_clicked / stats.total_sent) * 100 : 0;
        stats.conversion_rate = stats.total_sent > 0 ? (stats.total_converted / stats.total_sent) * 100 : 0;
      }
    } else if (campaign.type === 'social') {
      // Statistiques réseaux sociaux
      const { data: socialPosts } = await supabase
        .from('social_posts')
        .select('likes_count, comments_count, shares_count, reach')
        .eq('campaign_id', id);

      if (socialPosts) {
        stats.total_engagement = socialPosts.reduce((sum, sp) => 
          sum + (sp.likes_count || 0) + (sp.comments_count || 0) + (sp.shares_count || 0), 0
        );
        stats.total_reach = socialPosts.reduce((sum, sp) => sum + (sp.reach || 0), 0);
        stats.engagement_rate = stats.total_reach > 0 ? (stats.total_engagement / stats.total_reach) * 100 : 0;
      }
    }

    res.json({ data: stats });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * POST /api/campaigns/:id/send
 * Envoie une campagne
 */
async function sendCampaign(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que la campagne appartient à l'utilisateur
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (campaignError || !campaign) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
      return;
    }

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Campaign already sent or currently sending'
      });
      return;
    }

    // Mettre à jour le statut
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'sending',
        sent_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // TODO: Implémenter l'envoi réel selon le type de campagne
    // Pour l'instant, on simule juste la mise à jour du statut

    res.json({ 
      data: updatedCampaign,
      message: 'Campaign sending initiated'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

export default withLogging(async (req: AuthenticatedRequest, res: VercelResponse) => {
  await rateLimitMiddleware(req, res, async () => {
    await authenticateApiToken(req, res, async () => {
      const method = req.method;
      const { id } = req.query;

      if (id) {
        // Route avec ID
        if (req.url?.includes('/stats')) {
          if (method === 'GET') {
            await getCampaignStats(req, res);
          } else {
            res.status(405).json({
              error: 'Method Not Allowed',
              message: `${method} is not allowed on this endpoint`
            });
          }
        } else if (req.url?.includes('/send')) {
          if (method === 'POST') {
            await sendCampaign(req, res);
          } else {
            res.status(405).json({
              error: 'Method Not Allowed',
              message: `${method} is not allowed on this endpoint`
            });
          }
        } else {
          // CRUD sur une campagne spécifique
          switch (method) {
            case 'GET':
              await getCampaign(req, res);
              break;
            case 'PUT':
              await requireScope('campaigns:write')(req, res, () => updateCampaign(req, res));
              break;
            case 'DELETE':
              await requireScope('campaigns:write')(req, res, () => deleteCampaign(req, res));
              break;
            default:
              res.status(405).json({
                error: 'Method Not Allowed',
                message: `${method} is not allowed on this endpoint`
              });
          }
        }
      } else {
        // Route sans ID
        switch (method) {
          case 'GET':
            await requireScope('campaigns:read')(req, res, () => getCampaigns(req, res));
            break;
          case 'POST':
            await requireScope('campaigns:write')(req, res, () => createCampaign(req, res));
            break;
          default:
            res.status(405).json({
              error: 'Method Not Allowed',
              message: `${method} is not allowed on this endpoint`
            });
        }
      }
    });
  });
});

