import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

/**
 * GET /api/tasks
 * Liste les tâches avec pagination et filtres
 */
async function getTasks(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const {
      page = '1',
      limit = '50',
      status,
      priority,
      assigned_to,
      project_id,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.id);

    // Filtres
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }
    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
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
 * GET /api/tasks/:id
 * Récupère une tâche spécifique
 */
async function getTask(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Task not found'
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
 * POST /api/tasks
 * Crée une nouvelle tâche
 */
async function createTask(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const taskData = {
      ...req.body,
      user_id: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
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
 * PUT /api/tasks/:id
 * Met à jour une tâche
 */
async function updateTask(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Task not found'
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
 * DELETE /api/tasks/:id
 * Supprime une tâche
 */
async function deleteTask(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { error } = await supabase
      .from('tasks')
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
  await authenticateApiToken(req, res, async () => {
    await rateLimitMiddleware(req, res, async () => {
      const method = req.method?.toUpperCase();
      const { id } = req.query;

      if (method === 'GET' && !id) {
        requireScope('tasks:read')(req, res, () => {
          getTasks(req, res);
        });
      } else if (method === 'GET' && id) {
        requireScope('tasks:read')(req, res, () => {
          getTask(req, res);
        });
      } else if (method === 'POST') {
        requireScope('tasks:write')(req, res, () => {
          createTask(req, res);
        });
      } else if (method === 'PUT' && id) {
        requireScope('tasks:write')(req, res, () => {
          updateTask(req, res);
        });
      } else if (method === 'DELETE' && id) {
        requireScope('tasks:write')(req, res, () => {
          deleteTask(req, res);
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

