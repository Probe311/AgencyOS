import { supabase } from '../supabase';

export interface InternalForm {
  id: string;
  name: string;
  description?: string;
  category: 'client_request' | 'brief' | 'approval' | 'custom';
  form_config: {
    fields: any[];
    submitButtonText?: string;
    submitMessage?: string;
    redirectUrl?: string;
  };
  workflow_config?: {
    steps: Array<{
      step_number: number;
      name: string;
      approvers: string[]; // User IDs
      required_approvals?: number; // Nombre d'approbations requises
      auto_approve?: boolean;
    }>;
  };
  automation_config?: {
    on_submit?: Array<{
      type: 'create_task' | 'create_project' | 'send_notification' | 'update_lead';
      config: any;
    }>;
    on_approval?: Array<{
      type: 'create_task' | 'create_project' | 'send_notification' | 'update_lead';
      config: any;
    }>;
  };
  is_active: boolean;
  is_public: boolean;
  access_roles: string[];
  created_by?: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  submitted_by?: string;
  lead_id?: string;
  project_id?: string;
  submission_data: Record<string, any>;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  current_step: number;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  internal_forms?: InternalForm;
  leads?: { id: string; name?: string; email?: string };
  projects?: { id: string; name?: string };
}

export interface FormApproval {
  id: string;
  submission_id: string;
  step_number: number;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comments?: string;
  approved_at?: string;
  users?: { id: string; name?: string; email?: string };
}

/**
 * Service de gestion des formulaires internes
 */
export class InternalFormService {
  /**
   * Récupère tous les formulaires internes
   */
  static async getForms(category?: string): Promise<InternalForm[]> {
    let query = supabase
      .from('internal_forms')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupère un formulaire par ID
   */
  static async getForm(formId: string): Promise<InternalForm | null> {
    const { data, error } = await supabase
      .from('internal_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Crée un nouveau formulaire interne
   */
  static async createForm(form: Partial<InternalForm>, userId?: string): Promise<InternalForm> {
    const { data, error } = await supabase
      .from('internal_forms')
      .insert([{
        ...form,
        created_by: userId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Met à jour un formulaire
   */
  static async updateForm(formId: string, updates: Partial<InternalForm>): Promise<InternalForm> {
    const { data, error } = await supabase
      .from('internal_forms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Soumet un formulaire
   */
  static async submitForm(
    formId: string,
    submissionData: Record<string, any>,
    userId?: string,
    leadId?: string,
    projectId?: string
  ): Promise<FormSubmission> {
    // Créer la soumission
    const { data: submission, error: submitError } = await supabase
      .from('internal_form_submissions')
      .insert([{
        form_id: formId,
        submitted_by: userId,
        lead_id: leadId,
        project_id: projectId,
        submission_data: submissionData,
        status: 'pending',
        current_step: 0
      }])
      .select()
      .single();

    if (submitError) throw submitError;

    // Récupérer le formulaire pour exécuter les automatisations
    const form = await this.getForm(formId);
    if (form && form.automation_config?.on_submit) {
      await this.executeAutomations(submission.id, form.automation_config.on_submit, submissionData);
    }

    // Démarrer le workflow d'approbation si configuré
    if (form && form.workflow_config?.steps && form.workflow_config.steps.length > 0) {
      await this.startApprovalWorkflow(submission.id, form.workflow_config.steps);
    }

    return submission;
  }

  /**
   * Démarre le workflow d'approbation
   */
  private static async startApprovalWorkflow(
    submissionId: string,
    steps: Array<{ step_number: number; approvers: string[]; required_approvals?: number }>
  ): Promise<void> {
    const firstStep = steps[0];
    if (!firstStep) return;

    // Créer les approbations pour la première étape
    const approvals = firstStep.approvers.map(approverId => ({
      submission_id: submissionId,
      step_number: firstStep.step_number,
      approver_id: approverId,
      status: 'pending' as const
    }));

    await supabase
      .from('internal_form_approvals')
      .insert(approvals);

    // Mettre à jour le statut de la soumission
    await supabase
      .from('internal_form_submissions')
      .update({
        status: 'in_review',
        current_step: firstStep.step_number
      })
      .eq('id', submissionId);
  }

  /**
   * Exécute les automatisations
   */
  private static async executeAutomations(
    submissionId: string,
    automations: Array<{ type: string; config: any }>,
    submissionData: Record<string, any>
  ): Promise<void> {
    for (const automation of automations) {
      try {
        let taskId: string | null = null;

        if (automation.type === 'create_task') {
          // Créer une tâche
          const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert([{
              title: automation.config.title || 'Tâche créée depuis formulaire',
              description: automation.config.description || JSON.stringify(submissionData),
              status: 'todo',
              priority: automation.config.priority || 'medium',
              assigned_to: automation.config.assigned_to,
              project_id: automation.config.project_id
            }])
            .select()
            .single();

          if (!taskError && task) {
            taskId = task.id;
          }
        }

        // Enregistrer l'automatisation
        await supabase
          .from('internal_form_automations')
          .insert([{
            submission_id: submissionId,
            task_id: taskId,
            automation_type: automation.type,
            automation_config: automation.config,
            status: taskId ? 'completed' : 'failed',
            executed_at: new Date().toISOString()
          }]);
      } catch (error: any) {
        // Enregistrer l'erreur
        await supabase
          .from('internal_form_automations')
          .insert([{
            submission_id: submissionId,
            automation_type: automation.type,
            automation_config: automation.config,
            status: 'failed',
            error_message: error.message,
            executed_at: new Date().toISOString()
          }]);
      }
    }
  }

  /**
   * Approuve ou rejette une soumission
   */
  static async approveSubmission(
    submissionId: string,
    approvalId: string,
    status: 'approved' | 'rejected' | 'changes_requested',
    comments?: string,
    userId?: string
  ): Promise<void> {
    // Mettre à jour l'approbation
    await supabase
      .from('internal_form_approvals')
      .update({
        status,
        comments,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId);

    // Vérifier si toutes les approbations de l'étape sont complètes
    const { data: submission } = await supabase
      .from('internal_form_submissions')
      .select('*, internal_forms(workflow_config)')
      .eq('id', submissionId)
      .single();

    if (!submission) return;

    const form = submission.internal_forms as any;
    const currentStep = form?.workflow_config?.steps?.find(
      (s: any) => s.step_number === submission.current_step
    );

    if (currentStep) {
      const requiredApprovals = currentStep.required_approvals || currentStep.approvers.length;
      
      // Compter les approbations approuvées
      const { data: approvals } = await supabase
        .from('internal_form_approvals')
        .select('*')
        .eq('submission_id', submissionId)
        .eq('step_number', submission.current_step)
        .eq('status', 'approved');

      if (approvals && approvals.length >= requiredApprovals) {
        // Passer à l'étape suivante ou finaliser
        const nextStep = form.workflow_config.steps.find(
          (s: any) => s.step_number > submission.current_step
        );

        if (nextStep) {
          // Créer les approbations pour l'étape suivante
          const nextApprovals = nextStep.approvers.map((approverId: string) => ({
            submission_id: submissionId,
            step_number: nextStep.step_number,
            approver_id: approverId,
            status: 'pending' as const
          }));

          await supabase
            .from('internal_form_approvals')
            .insert(nextApprovals);

          await supabase
            .from('internal_form_submissions')
            .update({
              current_step: nextStep.step_number
            })
            .eq('id', submissionId);
        } else {
          // Toutes les étapes sont complètes
          await supabase
            .from('internal_form_submissions')
            .update({
              status: 'approved',
              current_step: submission.current_step
            })
            .eq('id', submissionId);
        }
      }
    }
  }

  /**
   * Récupère les soumissions
   */
  static async getSubmissions(filters?: {
    formId?: string;
    status?: string;
    assignedTo?: string;
    submittedBy?: string;
  }): Promise<FormSubmission[]> {
    let query = supabase
      .from('internal_form_submissions')
      .select('*, internal_forms(*), leads(id, name, email), projects(id, name)')
      .order('created_at', { ascending: false });

    if (filters?.formId) {
      query = query.eq('form_id', filters.formId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters?.submittedBy) {
      query = query.eq('submitted_by', filters.submittedBy);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupère les approbations en attente pour un utilisateur
   */
  static async getPendingApprovals(userId: string): Promise<FormApproval[]> {
    const { data, error } = await supabase
      .from('internal_form_approvals')
      .select('*, users(id, name, email), internal_form_submissions(*)')
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

