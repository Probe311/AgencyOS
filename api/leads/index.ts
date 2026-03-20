import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

/**
 * GET /api/leads
 * Liste les leads avec pagination et filtres
 */
async function getLeads(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const {
      page = '1',
      limit = '50',
      status,
      stage,
      assigned_to,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.id);

    // Filtres
    if (status) {
      query = query.eq('status', status);
    }
    if (stage) {
      query = query.eq('stage', stage);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
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
 * GET /api/leads/:id
 * Récupère un lead spécifique
 */
async function getLead(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Lead not found'
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
 * POST /api/leads
 * Crée un nouveau lead
 */
async function createLead(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const leadData = {
      ...req.body,
      user_id: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (error: any) {
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
}

/**
 * PUT /api/leads/:id
 * Met à jour un lead
 */
async function updateLead(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Lead not found'
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
 * DELETE /api/leads/:id
 * Supprime un lead
 */
async function deleteLead(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { error } = await supabase
      .from('leads')
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
 * Handler principal avec middleware
 */
export default withLogging(async (req: AuthenticatedRequest, res: VercelResponse) => {
  // Authentification
  await authenticateApiToken(req, res, async () => {
    // Rate limiting
    await rateLimitMiddleware(req, res, async () => {
      const method = req.method?.toUpperCase();
      const { id } = req.query;

      if (method === 'GET' && !id) {
        // Liste des leads
        requireScope('leads:read')(req, res, () => {
          getLeads(req, res);
        });
      } else if (method === 'GET' && id) {
        // Un lead spécifique
        requireScope('leads:read')(req, res, () => {
          getLead(req, res);
        });
      } else if (method === 'POST') {
        // Créer un lead
        requireScope('leads:write')(req, res, () => {
          createLead(req, res);
        });
      } else if (method === 'PUT' && id) {
        // Mettre à jour un lead
        requireScope('leads:write')(req, res, () => {
          updateLead(req, res);
        });
      } else if (method === 'DELETE' && id) {
        // Supprimer un lead
        requireScope('leads:write')(req, res, () => {
          deleteLead(req, res);
        });
      } else {
        res.status(405).json({
          error: 'Method Not Allowed',
          message: `${method} is not allowed on this endpoint`
        });
      }
    });
  });
});

