import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

/**
 * GET /api/projects
 * Récupère tous les projets de l'utilisateur
 */
async function getProjects(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const {
      page = '1',
      limit = '50',
      client_id,
      status,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, email),
        tasks:tasks(id, name, status, assigned_to),
        members:project_members(
          id,
          role,
          user:users(id, name, email)
        )
      `, { count: 'exact' })
      .eq('user_id', req.user!.id);

    // Filtres
    if (client_id) {
      query = query.eq('client_id', client_id);
    }
    if (status) {
      query = query.eq('status', status);
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
 * POST /api/projects
 * Crée un nouveau projet
 */
async function createProject(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { name, description, client_id, budget, start_date, end_date, status, members } = req.body;

    if (!name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name is required'
      });
      return;
    }

    // Créer le projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([{
        name,
        description,
        client_id,
        budget,
        start_date,
        end_date,
        status: status || 'En cours',
        user_id: req.user!.id,
      }])
      .select()
      .single();

    if (projectError) throw projectError;

    // Ajouter les membres si fournis
    if (members && Array.isArray(members) && members.length > 0) {
      const memberInserts = members.map((member: any) => ({
        project_id: project.id,
        user_id: typeof member === 'string' ? member : member.user_id,
        role: typeof member === 'string' ? 'member' : (member.role || 'member'),
      }));

      await supabase
        .from('project_members')
        .insert(memberInserts);
    }

    // Récupérer le projet complet
    const { data: fullProject, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, email),
        members:project_members(
          id,
          role,
          user:users(id, name, email)
        )
      `)
      .eq('id', project.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json({ data: fullProject });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * GET /api/projects/:id
 * Récupère un projet spécifique
 */
async function getProject(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, email),
        tasks:tasks(id, name, status, assigned_to, due_date),
        members:project_members(
          id,
          role,
          user:users(id, name, email)
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Project not found'
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
 * PUT /api/projects/:id
 * Met à jour un projet
 */
async function updateProject(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const { name, description, client_id, budget, start_date, end_date, status, members } = req.body;

    // Vérifier que le projet appartient à l'utilisateur
    const { data: existing, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (checkError || !existing) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (budget !== undefined) updateData.budget = budget;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour les membres si fournis
    if (members !== undefined && Array.isArray(members)) {
      // Supprimer les membres existants
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', id);

      // Ajouter les nouveaux membres
      if (members.length > 0) {
        const memberInserts = members.map((member: any) => ({
          project_id: id,
          user_id: typeof member === 'string' ? member : member.user_id,
          role: typeof member === 'string' ? 'member' : (member.role || 'member'),
        }));

        await supabase
          .from('project_members')
          .insert(memberInserts);
      }
    }

    // Récupérer le projet complet
    const { data: fullProject, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, email),
        tasks:tasks(id, name, status, assigned_to),
        members:project_members(
          id,
          role,
          user:users(id, name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.json({ data: fullProject });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * DELETE /api/projects/:id
 * Supprime un projet
 */
async function deleteProject(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que le projet appartient à l'utilisateur
    const { data: existing, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (checkError || !existing) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
      return;
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Project deleted successfully' });
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
      const method = req.method?.toUpperCase();
      const { id } = req.query;

      if (method === 'GET' && !id) {
        requireScope('projects:read')(req, res, () => {
          getProjects(req, res);
        });
      } else if (method === 'GET' && id) {
        requireScope('projects:read')(req, res, () => {
          getProject(req, res);
        });
      } else if (method === 'POST') {
        requireScope('projects:write')(req, res, () => {
          createProject(req, res);
        });
      } else if (method === 'PUT' && id) {
        requireScope('projects:write')(req, res, () => {
          updateProject(req, res);
        });
      } else if (method === 'DELETE' && id) {
        requireScope('projects:write')(req, res, () => {
          deleteProject(req, res);
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
