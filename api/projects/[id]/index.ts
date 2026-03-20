import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { authenticateRequest } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { logRequest } from '../../middleware/logging';

/**
 * GET /api/projects/[id]
 * Récupère un projet par ID
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

    await logRequest(request, userId, 'GET', `/api/projects/${params.id}`);

    const { data: project, error } = await supabase
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
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]
 * Met à jour un projet
 */
export async function PUT(
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

    await logRequest(request, userId, 'PUT', `/api/projects/${params.id}`);

    const body = await request.json();
    const { name, description, client_id, budget, start_date, end_date, status, members } = body;

    // Vérifier que le projet appartient à l'utilisateur
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Mettre à jour le projet
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (budget !== undefined) updateData.budget = budget;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;

    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Mettre à jour les membres si fournis
    if (members !== undefined && Array.isArray(members)) {
      // Supprimer les membres existants
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', params.id);

      // Ajouter les nouveaux membres
      if (members.length > 0) {
        const memberInserts = members.map((member: any) => ({
          project_id: params.id,
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
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ project: fullProject });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]
 * Supprime un projet
 */
export async function DELETE(
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

    await logRequest(request, userId, 'DELETE', `/api/projects/${params.id}`);

    // Vérifier que le projet appartient à l'utilisateur
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Supprimer le projet (les membres et tâches seront supprimés en cascade)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

