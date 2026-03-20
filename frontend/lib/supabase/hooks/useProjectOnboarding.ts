import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ProjectOnboarding {
  id: string;
  projectId: string;
  clientId: string;
  onboardingStatus: OnboardingStatus;
  welcomeEmailSent: boolean;
  kickoffScheduled: boolean;
  kickoffDate?: string;
  teamAssigned: boolean;
  projectTasksCreated: boolean;
  onboardingSteps: Array<{ id: string; name: string; completed: boolean }>;
  completedSteps: string[];
  assignedTeamMembers: string[];
  metadata: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const useProjectOnboarding = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startProjectOnboarding = async (
    projectId: string,
    clientId: string,
    projectData: {
      name: string;
      description?: string;
      budget?: number;
      startDate?: string;
      endDate?: string;
      projectType?: string;
    }
  ): Promise<ProjectOnboarding> => {
    try {
      setLoading(true);

      // Récupérer les informations du projet
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Projet non trouvé');

      // Récupérer les informations du client
      const { data: client } = await supabase
        .from('leads')
        .select('*')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client non trouvé');

      // Définir les étapes d'onboarding
      const steps = [
        { id: 'welcome_email', name: 'Email de bienvenue', completed: false },
        { id: 'team_assignment', name: 'Attribution équipe', completed: false },
        { id: 'tasks_creation', name: 'Création tâches projet', completed: false },
        { id: 'kickoff_scheduling', name: 'Planification kick-off', completed: false },
      ];

      // Créer l'onboarding
      const { data, error: insertError } = await supabase
        .from('project_onboarding')
        .insert({
          project_id: projectId,
          client_id: clientId,
          onboarding_status: 'in_progress',
          onboarding_steps: steps,
          metadata: {
            projectName: project.name,
            projectType: projectData.projectType,
            budget: projectData.budget,
          },
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const onboarding: ProjectOnboarding = {
        id: data.id,
        projectId: data.project_id,
        clientId: data.client_id,
        onboardingStatus: data.onboarding_status,
        welcomeEmailSent: data.welcome_email_sent,
        kickoffScheduled: data.kickoff_scheduled,
        kickoffDate: data.kickoff_date,
        teamAssigned: data.team_assigned,
        projectTasksCreated: data.project_tasks_created,
        onboardingSteps: data.onboarding_steps,
        completedSteps: data.completed_steps || [],
        assignedTeamMembers: data.assigned_team_members || [],
        metadata: data.metadata,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Exécuter les actions automatiques
      await executeOnboardingActions(onboarding, project, client, projectData);

      setError(null);
      return onboarding;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeOnboardingActions = async (
    onboarding: ProjectOnboarding,
    project: any,
    client: Lead,
    projectData: any
  ) => {
    try {
      // 1. Envoyer l'email de bienvenue
      await sendWelcomeEmail(onboarding, project, client);

      // 2. Attribuer l'équipe
      const teamMembers = await assignTeam(onboarding, project, projectData);

      // 3. Créer les tâches du projet
      await createProjectTasks(onboarding, project, client, teamMembers);

      // 4. Planifier le kick-off
      await scheduleKickoff(onboarding, project, client, teamMembers);
    } catch (err) {
      console.error('Error executing onboarding actions:', err);
    }
  };

  const sendWelcomeEmail = async (
    onboarding: ProjectOnboarding,
    project: any,
    client: Lead
  ) => {
    try {
      // TODO: Intégrer avec le système d'envoi d'emails
      // Pour l'instant, on marque juste comme envoyé
      await supabase
        .from('project_onboarding')
        .update({
          welcome_email_sent: true,
          completed_steps: [...onboarding.completedSteps, 'welcome_email'],
        })
        .eq('id', onboarding.id);
    } catch (err) {
      console.error('Error sending welcome email:', err);
    }
  };

  const assignTeam = async (
    onboarding: ProjectOnboarding,
    project: any,
    projectData: any
  ): Promise<string[]> => {
    try {
      // Récupérer les utilisateurs selon le type de projet
      let teamMembers: string[] = [];

      // Logique d'attribution selon le type de projet
      // Note: La table users n'a pas de champ department, on utilise les rôles
      if (projectData.projectType === 'marketing') {
        // Attribution aux utilisateurs avec rôle Manager ou Éditeur (équipe marketing)
        const { data: marketingTeam } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Manager', 'Éditeur', 'Admin'])
          .limit(3);

        teamMembers = marketingTeam?.map(u => u.id) || [];
      } else if (projectData.projectType === 'development') {
        // Attribution aux utilisateurs avec rôle Manager ou Éditeur (équipe dev)
        const { data: devTeam } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Manager', 'Éditeur', 'Admin'])
          .limit(3);

        teamMembers = devTeam?.map(u => u.id) || [];
      } else {
        // Attribution par défaut (round-robin ou selon disponibilité)
        const { data: availableUsers } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Manager', 'Éditeur', 'Admin'])
          .limit(3);

        teamMembers = availableUsers?.map(u => u.id) || [];
      }

      // Mettre à jour l'onboarding
      await supabase
        .from('project_onboarding')
        .update({
          team_assigned: true,
          assigned_team_members: teamMembers,
          completed_steps: [...onboarding.completedSteps, 'team_assignment'],
        })
        .eq('id', onboarding.id);

      // Notification équipe
      // TODO: Envoyer notification à l'équipe assignée

      return teamMembers;
    } catch (err) {
      console.error('Error assigning team:', err);
      return [];
    }
  };

  const createProjectTasks = async (
    onboarding: ProjectOnboarding,
    project: any,
    client: Lead,
    teamMembers: string[]
  ) => {
    try {
      const tasks = [
        {
          title: `Kick-off projet ${project.name}`,
          description: `Kick-off avec le client ${client.name || client.company}`,
          priority: 'Haute',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // J+3
          assignedTo: teamMembers[0] || null,
        },
        {
          title: `Brief client ${client.name || client.company}`,
          description: `Récupérer et documenter le brief client pour le projet ${project.name}`,
          priority: 'Haute',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // J+5
          assignedTo: teamMembers[0] || null,
        },
        {
          title: `Livrable 1 - ${project.name}`,
          description: `Premier livrable du projet ${project.name}`,
          priority: 'Moyenne',
          dueDate: project.end_date ? new Date(project.end_date) : null,
          assignedTo: teamMembers[1] || null,
        },
      ];

      for (const task of tasks) {
        await supabase
          .from('tasks')
          .insert({
            project_id: onboarding.projectId,
            title: task.title,
            description: task.description,
            status: 'À faire',
            priority: task.priority,
            assigned_to: task.assignedTo,
            due_date: task.dueDate?.toISOString().split('T')[0],
            tags: ['Onboarding', 'Nouveau Projet'],
          });
      }

      await supabase
        .from('project_onboarding')
        .update({
          project_tasks_created: true,
          completed_steps: [...onboarding.completedSteps, 'tasks_creation'],
        })
        .eq('id', onboarding.id);
    } catch (err) {
      console.error('Error creating project tasks:', err);
    }
  };

  const scheduleKickoff = async (
    onboarding: ProjectOnboarding,
    project: any,
    client: Lead,
    teamMembers: string[]
  ) => {
    try {
      // Planifier le kick-off pour J+3
      const kickoffDate = new Date();
      kickoffDate.setDate(kickoffDate.getDate() + 3);

      await supabase
        .from('project_onboarding')
        .update({
          kickoff_scheduled: true,
          kickoff_date: kickoffDate.toISOString(),
          completed_steps: [...onboarding.completedSteps, 'kickoff_scheduling'],
        })
        .eq('id', onboarding.id);

      // Créer une tâche pour planifier le kick-off
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: client.id,
          assigned_to: teamMembers[0],
          title: `Planifier kick-off : ${project.name}`,
          description: `Nouveau projet créé. Planifier le rendez-vous de kick-off avec ${client.name || client.company}.`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // J+1
          tags: ['Kick-off', 'Onboarding', 'Nouveau Projet'],
          metadata: {
            projectId: onboarding.projectId,
            suggestedDate: kickoffDate.toISOString(),
            duration: 60, // 1h
          },
        });

      // TODO: Créer un événement calendrier si intégré
    } catch (err) {
      console.error('Error scheduling kickoff:', err);
    }
  };

  return {
    loading,
    error,
    startProjectOnboarding,
  };
};

