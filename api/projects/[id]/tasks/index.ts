import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { authenticateRequest } from '../../../middleware/auth';
import { rateLimit } from '../../../middleware/rateLimit';
import { logRequest } from '../../../middleware/logging';

/**
 * GET /api/projects/[id]/tasks
 * Récupère toutes les tâches d'un projet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const userId = authResult.userId;

    const rateLimitResult = await rateLimit(request, userId);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await logRequest(request, userId, 'GET', `/api/projects/${params.id}/tasks`);

    // Vérifier que le projet appartient à l'utilisateur
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Récupérer les tâches
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, name, email)
      `)
      .eq('project_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/tasks
 * Crée une nouvelle tâche pour un projet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const userId = authResult.userId;

    const rateLimitResult = await rateLimit(request, userId);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await logRequest(request, userId, 'POST', `/api/projects/${params.id}/tasks`);

    // Vérifier que le projet appartient à l'utilisateur
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, assigned_to, due_date, status, priority } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Créer la tâche
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert([{
        name,
        description,
        project_id: params.id,
        assigned_to,
        due_date,
        status: status || 'À faire',
        priority: priority || 'medium',
        created_by: userId,
      }])
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, name, email)
      `)
      .single();

    if (taskError) throw taskError;

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project task:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

