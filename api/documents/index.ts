import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/config';
import { authenticateApiToken, requireScope, AuthenticatedRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { withLogging } from '../middleware/logging';

/**
 * GET /api/documents
 * Liste les documents avec pagination et filtres
 */
async function getDocuments(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const {
      page = '1',
      limit = '50',
      project_id,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('uploaded_by', req.user!.id);

    // Filtres
    if (project_id) {
      query = query.eq('project_id', project_id);
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
 * POST /api/documents
 * Crée un nouveau document
 */
async function createDocument(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { name, description, project_id, file_url, file_type, file_size, content, html_content, is_collaborative } = req.body;

    if (!name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name is required'
      });
      return;
    }

    const { data: document, error } = await supabase
      .from('documents')
      .insert([{
        name,
        description,
        project_id,
        file_url,
        file_type,
        file_size,
        content,
        html_content,
        is_collaborative: is_collaborative || false,
        current_version: 1,
        uploaded_by: req.user!.id,
      }])
      .select()
      .single();

    if (error) throw error;

    // Créer la version initiale si contenu fourni
    if (content || html_content) {
      await supabase
        .from('document_versions')
        .insert([{
          document_id: document.id,
          version_number: 1,
          content: content || {},
          html_content: html_content || '',
          change_summary: 'Version initiale',
          created_by: req.user!.id,
          is_current: true,
        }]);
    }

    res.status(201).json({ data: document });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * GET /api/documents/:id
 * Récupère un document spécifique
 */
async function getDocument(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('uploaded_by', req.user!.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Document not found'
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
 * PUT /api/documents/:id
 * Met à jour un document
 */
async function updateDocument(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const { name, description, content, html_content } = req.body;

    // Vérifier que le document appartient à l'utilisateur
    const { data: existing, error: checkError } = await supabase
      .from('documents')
      .select('id, current_version')
      .eq('id', id)
      .eq('uploaded_by', req.user!.id)
      .single();

    if (checkError || !existing) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (html_content !== undefined) updateData.html_content = html_content;

    // Créer une nouvelle version si le contenu change
    if (content !== undefined || html_content !== undefined) {
      const newVersion = (existing.current_version || 1) + 1;
      updateData.current_version = newVersion;

      // Marquer l'ancienne version comme non courante
      await supabase
        .from('document_versions')
        .update({ is_current: false })
        .eq('document_id', id);

      // Créer la nouvelle version
      await supabase
        .from('document_versions')
        .insert([{
          document_id: id,
          version_number: newVersion,
          content: content || {},
          html_content: html_content || '',
          change_summary: 'Mise à jour via API',
          created_by: req.user!.id,
          is_current: true,
        }]);
    }

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data: document });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * DELETE /api/documents/:id
 * Supprime un document
 */
async function deleteDocument(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que le document appartient à l'utilisateur
    const { data: existing, error: checkError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('uploaded_by', req.user!.id)
      .single();

    if (checkError || !existing) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
      return;
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * GET /api/documents/:id/versions
 * Récupère toutes les versions d'un document
 */
async function getDocumentVersions(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que le document appartient à l'utilisateur
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('uploaded_by', req.user!.id)
      .single();

    if (docError || !document) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
      return;
    }

    const { data: versions, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', id)
      .order('version_number', { ascending: false });

    if (error) throw error;

    res.json({ data: versions || [] });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * GET /api/documents/:id/comments
 * Récupère tous les commentaires d'un document
 */
async function getDocumentComments(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;

    // Vérifier que le document appartient à l'utilisateur
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('uploaded_by', req.user!.id)
      .single();

    if (docError || !document) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
      return;
    }

    const { data: comments, error } = await supabase
      .from('document_comments')
      .select(`
        *,
        user:users!document_comments_created_by_fkey(id, name, email)
      `)
      .eq('document_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data: comments || [] });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * POST /api/documents/:id/comments
 * Ajoute un commentaire à un document
 */
async function createDocumentComment(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  try {
    const { id } = req.query;
    const { content, position } = req.body;

    if (!content) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
      return;
    }

    // Vérifier que le document appartient à l'utilisateur
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('uploaded_by', req.user!.id)
      .single();

    if (docError || !document) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
      return;
    }

    const { data: comment, error } = await supabase
      .from('document_comments')
      .insert([{
        document_id: id,
        content,
        position,
        created_by: req.user!.id,
      }])
      .select(`
        *,
        user:users!document_comments_created_by_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ data: comment });
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
        if (req.url?.includes('/versions')) {
          if (method === 'GET') {
            await requireScope('documents:read')(req, res, () => getDocumentVersions(req, res));
          } else {
            res.status(405).json({
              error: 'Method Not Allowed',
              message: `${method} is not allowed on this endpoint`
            });
          }
        } else if (req.url?.includes('/comments')) {
          if (method === 'GET') {
            await requireScope('documents:read')(req, res, () => getDocumentComments(req, res));
          } else if (method === 'POST') {
            await requireScope('documents:write')(req, res, () => createDocumentComment(req, res));
          } else {
            res.status(405).json({
              error: 'Method Not Allowed',
              message: `${method} is not allowed on this endpoint`
            });
          }
        } else {
          // CRUD sur un document spécifique
          switch (method) {
            case 'GET':
              await requireScope('documents:read')(req, res, () => getDocument(req, res));
              break;
            case 'PUT':
              await requireScope('documents:write')(req, res, () => updateDocument(req, res));
              break;
            case 'DELETE':
              await requireScope('documents:write')(req, res, () => deleteDocument(req, res));
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
            await requireScope('documents:read')(req, res, () => getDocuments(req, res));
            break;
          case 'POST':
            await requireScope('documents:write')(req, res, () => createDocument(req, res));
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

