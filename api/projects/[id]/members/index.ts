import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { authenticateRequest } from '../../../middleware/auth';
import { rateLimit } from '../../../middleware/rateLimit';
import { logRequest } from '../../../middleware/logging';

/**
 * GET /api/projects/[id]/members
 * Récupère tous les membres d'un projet
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

    await logRequest(request, userId, 'GET', `/api/projects/${params.id}/members`);

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

    // Récupérer les membres
    const { data: members, error } = await supabase
      .from('project_members')
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `)
      .eq('project_id', params.id);

    if (error) throw error;

    return NextResponse.json({ members: members || [] });
  } catch (error: any) {
    console.error('Error fetching project members:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/members
 * Ajoute un membre à un projet
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

    await logRequest(request, userId, 'POST', `/api/projects/${params.id}/members`);

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
    const { user_id, role } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Vérifier si le membre existe déjà
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', params.id)
      .eq('user_id', user_id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Member already exists' }, { status: 400 });
    }

    // Ajouter le membre
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .insert([{
        project_id: params.id,
        user_id,
        role: role || 'member',
      }])
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `)
      .single();

    if (memberError) throw memberError;

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding project member:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/members/[memberId]
 * Retire un membre d'un projet
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId?: string } }
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

    const memberId = params.memberId || new URL(request.url).searchParams.get('user_id');
    if (!memberId) {
      return NextResponse.json({ error: 'memberId or user_id is required' }, { status: 400 });
    }

    await logRequest(request, userId, 'DELETE', `/api/projects/${params.id}/members/${memberId}`);

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

    // Supprimer le membre
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', params.id)
      .eq('user_id', memberId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Error removing project member:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

