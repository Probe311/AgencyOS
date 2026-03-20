-- AgencyOS Supabase Schema - Version ComplÃ¨te UnifiÃ©e
-- Ce fichier contient TOUTES les tables, vues, fonctions, triggers et politiques RLS nÃ©cessaires
-- Mis Ã  jour: 2025-01-XX
-- Description: Schema SQL consolidÃ© intÃ©grant toutes les migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for vector similarity search (if available)
-- Note: This extension may not be available in all Supabase instances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        BEGIN
            CREATE EXTENSION vector;
        EXCEPTION WHEN OTHERS THEN
            -- Extension not available, will skip vector columns
            RAISE NOTICE 'pgvector extension not available, semantic_vector columns will be skipped';
        END;
    END IF;
END $$;

-- Enable PostGIS extension for geospatial functions (if available)
-- Note: This extension may not be available in all Supabase instances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        BEGIN
            CREATE EXTENSION postgis;
        EXCEPTION WHEN OTHERS THEN
            -- Extension not available, will skip geospatial indexes
            RAISE NOTICE 'PostGIS extension not available, geospatial indexes will be skipped';
        END;
    END IF;
END $$;

-- =====================================================
-- TYPES PERSONNALISÉS
-- =====================================================

-- Enum for team member roles (doit être créé avant les tables qui l'utilisent)
DO $$ BEGIN
    CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- MIGRATIONS POUR COLONNES MANQUANTES
-- =====================================================

-- Migration préliminaire pour ajouter TOUTES les colonnes manquantes si la table leads existe déjà
-- Ces colonnes sont référencées dans les index et fonctions plus bas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        -- Colonnes de base
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'scoring') THEN
            ALTER TABLE leads ADD COLUMN scoring INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'value') THEN
            ALTER TABLE leads ADD COLUMN value DECIMAL(12, 2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'assigned_at') THEN
            ALTER TABLE leads ADD COLUMN assigned_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'tags') THEN
            ALTER TABLE leads ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
        END IF;
        -- Colonnes cycle de vie
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lifecycle_stage') THEN
            ALTER TABLE leads ADD COLUMN lifecycle_stage TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'probability') THEN
            ALTER TABLE leads ADD COLUMN probability DECIMAL(5, 2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'converted_at') THEN
            ALTER TABLE leads ADD COLUMN converted_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lost_at') THEN
            ALTER TABLE leads ADD COLUMN lost_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lost_reason') THEN
            ALTER TABLE leads ADD COLUMN lost_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'first_contact_date') THEN
            ALTER TABLE leads ADD COLUMN first_contact_date TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'last_activity_date') THEN
            ALTER TABLE leads ADD COLUMN last_activity_date TIMESTAMPTZ;
        END IF;
        -- Colonnes géolocalisation
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'latitude') THEN
            ALTER TABLE leads ADD COLUMN latitude DECIMAL(10, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'longitude') THEN
            ALTER TABLE leads ADD COLUMN longitude DECIMAL(11, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'geocoded_address') THEN
            ALTER TABLE leads ADD COLUMN geocoded_address TEXT;
        END IF;
        -- Colonnes VIP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'is_vip') THEN
            ALTER TABLE leads ADD COLUMN is_vip BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'vip_detected_at') THEN
            ALTER TABLE leads ADD COLUMN vip_detected_at TIMESTAMPTZ;
        END IF;
        -- Colonnes désabonnement
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unsubscribed') THEN
            ALTER TABLE leads ADD COLUMN unsubscribed BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unsubscribed_at') THEN
            ALTER TABLE leads ADD COLUMN unsubscribed_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unsubscribed_reason') THEN
            ALTER TABLE leads ADD COLUMN unsubscribed_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'reactivated_at') THEN
            ALTER TABLE leads ADD COLUMN reactivated_at TIMESTAMPTZ;
        END IF;
        -- Métadonnées
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'metadata') THEN
            ALTER TABLE leads ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;
END $$;

-- Migration globale pour ajouter lead_id à toutes les tables qui en ont besoin si elles existent déjà
-- Cette migration doit être AVANT toutes les créations de tables pour éviter les erreurs
DO $$
BEGIN
    -- vip_contact_attempts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts' AND column_name = 'lead_id') THEN
            ALTER TABLE vip_contact_attempts ADD COLUMN lead_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts' AND constraint_name = 'vip_contact_attempts_lead_id_fkey') THEN
                    ALTER TABLE vip_contact_attempts ADD CONSTRAINT vip_contact_attempts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- vip_response_tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vip_response_tracking') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_response_tracking' AND column_name = 'lead_id') THEN
            ALTER TABLE vip_response_tracking ADD COLUMN lead_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'vip_response_tracking' AND constraint_name = 'vip_response_tracking_lead_id_fkey') THEN
                    ALTER TABLE vip_response_tracking ADD CONSTRAINT vip_response_tracking_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- Migration supplémentaire pour ajouter lead_id aux autres tables qui peuvent en manquer
-- Note: La plupart de ces tables ont lead_id dans leur CREATE TABLE, mais si elles existent déjà sans cette colonne, cette migration l'ajoutera
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'mailing_list_members', 'mailing_list_exclusions', 'api_usage_logs',
        'campaign_workflow_triggers', 'assignment_decisions', 'appointments',
        'website_chat_messages', 'form_submissions', 'voip_calls',
        'sales_activities', 'email_tracking', 'quotes',
        'email_segment_members', 'invoices', 'email_sends',
        'action_executions', 'lifecycle_transitions', 'lead_enrichment_jobs',
        'automation_executions', 'automation_enrollments', 'field_visits'
    ];
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl_name AND column_name = 'lead_id') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN lead_id UUID', tbl_name);
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE table_schema = 'public' AND table_name = tbl_name 
                        AND constraint_name = tbl_name || '_lead_id_fkey'
                    ) THEN
                        EXECUTE format(
                            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE',
                            tbl_name, tbl_name || '_lead_id_fkey'
                        );
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Migration pour ajouter user_id aux tables qui peuvent en manquer si elles existent déjà
-- Note: La plupart de ces tables ont user_id dans leur CREATE TABLE, mais si elles existent déjà sans cette colonne, cette migration l'ajoutera
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'scraping_sessions', 'user_availability', 'vacation_periods',
        'vip_contact_attempts', 'scraping_configs', 'custom_reports',
        'user_dashboard_layouts', 'audit_logs', 'appointments',
        'appointment_availability', 'voip_calls', 'sales_activities',
        'quote_follow_ups', 'notifications', 'employees',
        'event_attendees', 'sales_goals', 'sales_forecasts',
        'sales_performance', 'user_clients', 'resource_permissions',
        'notification_subscriptions', 'social_accounts', 'social_posts',
        'social_bulk_imports', 'social_optimal_times', 'social_message_responses',
        'social_saved_responses', 'social_message_notes', 'social_listening_queries',
        'social_listening_alerts', 'social_influencers', 'social_voice_share',
        'analytics_predictions', 'analytics_insights', 'analytics_reports',
        'analytics_metrics_history', 'calendar_integrations', 'api_tokens',
        'api_logs', 'accounting_integrations', 'document_comments',
        'document_collaborators', 'search_history', 'field_visits',
        'user_devices', 'team_members', 'saml_sessions', 'intelligent_suggestions',
        'automation_notifications', 'workflow_execution_logs', 'workflow_executions'
    ];
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl_name AND column_name = 'user_id') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN user_id UUID', tbl_name);
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE table_schema = 'public' AND table_name = tbl_name 
                        AND constraint_name = tbl_name || '_user_id_fkey'
                    ) THEN
                        EXECUTE format(
                            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
                            tbl_name, tbl_name || '_user_id_fkey'
                        );
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Migration pour ajouter timezone aux tables users et leads si elles existent déjà
DO $$
BEGIN
    -- Ajouter timezone à users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'timezone') THEN
            ALTER TABLE users ADD COLUMN timezone TEXT;
        END IF;
    END IF;
    
    -- Ajouter timezone à leads
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'timezone') THEN
            ALTER TABLE leads ADD COLUMN timezone TEXT;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter started_at aux tables qui peuvent en manquer si elles existent déjà
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'scraping_sessions', 'voip_calls', 'action_executions',
        'automation_executions', 'accounting_sync_logs'
    ];
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl_name AND column_name = 'started_at') THEN
                -- Déterminer la valeur par défaut selon la table
                IF tbl_name = 'scraping_sessions' OR tbl_name = 'automation_executions' THEN
                    EXECUTE format('ALTER TABLE %I ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', tbl_name);
                ELSE
                    EXECUTE format('ALTER TABLE %I ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW()', tbl_name);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Migration pour ajouter status aux tables qui peuvent en manquer si elles existent déjà
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'scraping_sessions', 'campaigns', 'scheduled_email_executions',
        'appointments', 'voip_calls', 'ab_tests', 'quotes',
        'webhook_deliveries', 'invoices', 'payments', 'employees',
        'event_attendees', 'integrations', 'milestones', 'risks',
        'email_campaigns', 'action_executions', 'lead_enrichment_jobs',
        'automation_workflows', 'automation_executions', 'automation_rules',
        'automation_enrollments', 'clients', 'social_posts',
        'social_bulk_imports', 'social_message_responses'
    ];
    tbl_name TEXT;
    default_status TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl_name AND column_name = 'status') THEN
                -- Déterminer la valeur par défaut selon la table
                CASE tbl_name
                    WHEN 'scraping_sessions' THEN default_status := 'pending';
                    WHEN 'campaigns' THEN default_status := 'draft';
                    WHEN 'scheduled_email_executions' THEN default_status := 'pending';
                    WHEN 'appointments' THEN default_status := 'scheduled';
                    WHEN 'voip_calls' THEN default_status := 'initiated';
                    WHEN 'ab_tests' THEN default_status := 'draft';
                    WHEN 'quotes' THEN default_status := 'draft';
                    WHEN 'webhook_deliveries' THEN default_status := 'pending';
                    WHEN 'invoices' THEN default_status := 'draft';
                    WHEN 'payments' THEN default_status := 'pending';
                    WHEN 'email_campaigns' THEN default_status := 'draft';
                    WHEN 'action_executions' THEN default_status := 'pending';
                    WHEN 'automation_workflows' THEN default_status := 'draft';
                    WHEN 'automation_executions' THEN default_status := 'pending';
                    WHEN 'automation_rules' THEN default_status := 'active';
                    WHEN 'automation_enrollments' THEN default_status := 'active';
                    WHEN 'social_posts' THEN default_status := 'draft';
                    WHEN 'social_bulk_imports' THEN default_status := 'pending';
                    WHEN 'social_message_responses' THEN default_status := 'pending';
                    ELSE default_status := 'active';
                END CASE;
                EXECUTE format('ALTER TABLE %I ADD COLUMN status TEXT NOT NULL DEFAULT %L', tbl_name, default_status);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Migration pour ajouter phone_number aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- voip_calls
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voip_calls') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voip_calls' AND column_name = 'phone_number') THEN
            ALTER TABLE voip_calls ADD COLUMN phone_number TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;
END $$;

-- Migration pour ajouter campaign_id aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- scheduled_email_executions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions' AND column_name = 'campaign_id') THEN
            ALTER TABLE scheduled_email_executions ADD COLUMN campaign_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions' 
                    AND constraint_name = 'scheduled_email_executions_campaign_id_fkey'
                ) THEN
                    ALTER TABLE scheduled_email_executions ADD CONSTRAINT scheduled_email_executions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- campaign_workflow_triggers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers' AND column_name = 'campaign_id') THEN
            ALTER TABLE campaign_workflow_triggers ADD COLUMN campaign_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers' 
                    AND constraint_name = 'campaign_workflow_triggers_campaign_id_fkey'
                ) THEN
                    ALTER TABLE campaign_workflow_triggers ADD CONSTRAINT campaign_workflow_triggers_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- email_tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_tracking') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'campaign_id') THEN
            ALTER TABLE email_tracking ADD COLUMN campaign_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'email_tracking' 
                    AND constraint_name = 'email_tracking_campaign_id_fkey'
                ) THEN
                    ALTER TABLE email_tracking ADD CONSTRAINT email_tracking_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter email_address et autres colonnes aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- email_tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_tracking') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'email_address') THEN
            ALTER TABLE email_tracking ADD COLUMN email_address TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'opened') THEN
            ALTER TABLE email_tracking ADD COLUMN opened BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'opened_at') THEN
            ALTER TABLE email_tracking ADD COLUMN opened_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'clicked') THEN
            ALTER TABLE email_tracking ADD COLUMN clicked BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'clicked_at') THEN
            ALTER TABLE email_tracking ADD COLUMN clicked_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'clicked_url') THEN
            ALTER TABLE email_tracking ADD COLUMN clicked_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'sent_at') THEN
            ALTER TABLE email_tracking ADD COLUMN sent_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Migration pour ajouter template_type et autres colonnes manquantes aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- email_templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'template_type') THEN
            ALTER TABLE email_templates ADD COLUMN template_type TEXT NOT NULL DEFAULT 'marketing';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'category') THEN
            ALTER TABLE email_templates ADD COLUMN category TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'tags') THEN
            ALTER TABLE email_templates ADD COLUMN tags TEXT[] DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'variables') THEN
            ALTER TABLE email_templates ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'is_public') THEN
            ALTER TABLE email_templates ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'is_active') THEN
            ALTER TABLE email_templates ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'usage_count') THEN
            ALTER TABLE email_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'preview_image') THEN
            ALTER TABLE email_templates ADD COLUMN preview_image TEXT;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter scheduled_at aux tables qui en ont besoin si elles existent déjà
DO $$
BEGIN
    -- campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'scheduled_at') THEN
            ALTER TABLE campaigns ADD COLUMN scheduled_at TIMESTAMPTZ;
        END IF;
    END IF;
    
    -- scheduled_email_executions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions' AND column_name = 'scheduled_at') THEN
            ALTER TABLE scheduled_email_executions ADD COLUMN scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
    END IF;
    
    -- quote_follow_ups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_follow_ups') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quote_follow_ups' AND column_name = 'scheduled_at') THEN
            ALTER TABLE quote_follow_ups ADD COLUMN scheduled_at TIMESTAMPTZ;
        END IF;
    END IF;
    
    -- email_campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'scheduled_at') THEN
            ALTER TABLE email_campaigns ADD COLUMN scheduled_at TIMESTAMPTZ;
        END IF;
    END IF;
    
    -- social_posts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_posts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'scheduled_at') THEN
            ALTER TABLE social_posts ADD COLUMN scheduled_at TIMESTAMPTZ;
        END IF;
    END IF;
    
    -- social_responses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_responses') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_responses' AND column_name = 'scheduled_at') THEN
            ALTER TABLE social_responses ADD COLUMN scheduled_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter template_id aux tables qui en ont besoin si elles existent déjà
DO $$
BEGIN
    -- campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'template_id') THEN
            ALTER TABLE campaigns ADD COLUMN template_id UUID;
        END IF;
    END IF;
    
    -- ab_tests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ab_tests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'template_id') THEN
            ALTER TABLE ab_tests ADD COLUMN template_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'landing_page_id') THEN
            ALTER TABLE ab_tests ADD COLUMN landing_page_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'landing_pages') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'ab_tests' AND constraint_name = 'ab_tests_landing_page_id_fkey') THEN
                    ALTER TABLE ab_tests ADD CONSTRAINT ab_tests_landing_page_id_fkey FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'variant_ids') THEN
            ALTER TABLE ab_tests ADD COLUMN variant_ids UUID[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'distribution') THEN
            ALTER TABLE ab_tests ADD COLUMN distribution JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'traffic_split') THEN
            ALTER TABLE ab_tests ADD COLUMN traffic_split JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'conversion_goal') THEN
            ALTER TABLE ab_tests ADD COLUMN conversion_goal TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'duration') THEN
            ALTER TABLE ab_tests ADD COLUMN duration INTEGER DEFAULT 14;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'min_sample_size') THEN
            ALTER TABLE ab_tests ADD COLUMN min_sample_size INTEGER DEFAULT 100;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'minimum_sample_size') THEN
            ALTER TABLE ab_tests ADD COLUMN minimum_sample_size INTEGER DEFAULT 100;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'significance_level') THEN
            ALTER TABLE ab_tests ADD COLUMN significance_level DECIMAL(3, 2) DEFAULT 0.95;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'confidence_level') THEN
            ALTER TABLE ab_tests ADD COLUMN confidence_level DECIMAL(5, 2) DEFAULT 95.00;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'winner_id') THEN
            ALTER TABLE ab_tests ADD COLUMN winner_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'winner_variant_id') THEN
            ALTER TABLE ab_tests ADD COLUMN winner_variant_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'winner_detected_at') THEN
            ALTER TABLE ab_tests ADD COLUMN winner_detected_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'auto_deploy') THEN
            ALTER TABLE ab_tests ADD COLUMN auto_deploy BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
    
    -- automated_reports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automated_reports') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automated_reports' AND column_name = 'template_id') THEN
            ALTER TABLE automated_reports ADD COLUMN template_id UUID;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter segment_id aux tables qui en ont besoin si elles existent déjà
DO $$
BEGIN
    -- campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'segment_id') THEN
            ALTER TABLE campaigns ADD COLUMN segment_id UUID;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter mailing_list_id à la table campaigns si elle existe déjà
DO $$
BEGIN
    -- campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'mailing_list_id') THEN
            ALTER TABLE campaigns ADD COLUMN mailing_list_id UUID;
            
            -- Ajouter la contrainte de clé étrangère si la table mailing_lists existe
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mailing_lists') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'campaigns' AND constraint_name = 'campaigns_mailing_list_id_fkey') THEN
                    ALTER TABLE campaigns ADD CONSTRAINT campaigns_mailing_list_id_fkey FOREIGN KEY (mailing_list_id) REFERENCES mailing_lists(id) ON DELETE SET NULL;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter form_id aux tables qui en ont besoin si elles existent déjà
DO $$
BEGIN
    -- form_submissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_submissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'form_submissions' AND column_name = 'form_id') THEN
            ALTER TABLE form_submissions ADD COLUMN form_id UUID;
            
            -- Ajouter la contrainte de clé étrangère si la table forms existe
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forms') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'form_submissions' AND constraint_name = 'form_submissions_form_id_fkey') THEN
                    ALTER TABLE form_submissions ADD CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- internal_form_submissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_form_submissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'internal_form_submissions' AND column_name = 'form_id') THEN
            ALTER TABLE internal_form_submissions ADD COLUMN form_id UUID;
            
            -- Ajouter la contrainte de clé étrangère si la table internal_forms existe
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_forms') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'internal_form_submissions' AND constraint_name = 'internal_form_submissions_form_id_fkey') THEN
                    ALTER TABLE internal_form_submissions ADD CONSTRAINT internal_form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES internal_forms(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- =====================================================
-- USERS TABLE (avec colonnes supplÃ©mentaires)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'Lecteur' CHECK (role IN ('SuperAdmin', 'Admin', 'Manager', 'Ã‰diteur', 'Lecteur')),
    -- Colonnes gÃ©ographiques
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    city TEXT,
    postal_code TEXT,
    region TEXT,
    country TEXT DEFAULT 'France',
    timezone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour users
CREATE INDEX IF NOT EXISTS idx_users_latitude_longitude ON users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_postal_code ON users(postal_code) WHERE postal_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region) WHERE region IS NOT NULL;

-- =====================================================
-- WORKSPACES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FOLDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#8b5cf6',
    icon TEXT,
    position INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled', 'archived')),
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    position INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECT_SECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS project_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Ã€ faire' CHECK (status IN ('Ã€ faire', 'En cours', 'En revue', 'TerminÃ©')),
    priority TEXT NOT NULL DEFAULT 'Moyenne' CHECK (priority IN ('Basse', 'Moyenne', 'Haute', 'Urgente')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    start_date DATE,
    estimated_time TEXT,
    sub_tasks JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    attachments TEXT[] DEFAULT '{}',
    dependencies UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TASK_ASSIGNEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- =====================================================
-- TASK_COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMMENT_REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id, emoji)
);

-- =====================================================
-- TASK_REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reminder_date TIMESTAMPTZ NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'due_date' CHECK (reminder_type IN ('due_date', 'start_date', 'custom')),
    days_before INTEGER DEFAULT 0,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TASK_HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TIME_ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    billable BOOLEAN DEFAULT TRUE,
    hourly_rate DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TASK_DEPENDENCIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- =====================================================
-- CALENDARS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUTOMATED_REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS automated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL CHECK (report_type IN ('overview', 'time', 'crm', 'marketing', 'finance', 'custom')),
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
    schedule_config JSONB DEFAULT '{}'::jsonb,
    recipients UUID[] DEFAULT '{}'::uuid[],
    recipients_emails TEXT[] DEFAULT '{}'::text[],
    export_format TEXT[] DEFAULT '{pdf}'::text[] CHECK (array_length(export_format, 1) > 0),
    report_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUTOMATED_REPORT_EXECUTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS automated_report_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES automated_reports(id) ON DELETE CASCADE,
    execution_status TEXT NOT NULL CHECK (execution_status IN ('pending', 'running', 'completed', 'failed')),
    execution_started_at TIMESTAMPTZ DEFAULT NOW(),
    execution_completed_at TIMESTAMPTZ,
    export_files JSONB DEFAULT '[]'::jsonb,
    recipients_sent UUID[] DEFAULT '{}'::uuid[],
    recipients_failed UUID[] DEFAULT '{}'::uuid[],
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automated reports
CREATE INDEX IF NOT EXISTS idx_automated_reports_is_active ON automated_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_automated_reports_next_run_at ON automated_reports(next_run_at);
CREATE INDEX IF NOT EXISTS idx_automated_reports_created_by ON automated_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_automated_report_executions_report_id ON automated_report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_automated_report_executions_execution_status ON automated_report_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_automated_report_executions_execution_started_at ON automated_report_executions(execution_started_at DESC);

-- =====================================================
-- LEADS TABLE (Table CRM principale)
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    name TEXT,
    company TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    website TEXT,
    timezone TEXT,
    status TEXT DEFAULT 'Nouveau',
    temperature TEXT CHECK (temperature IN ('Froid', 'TiÃ¨de', 'Chaud')),
    scoring INTEGER DEFAULT 0,
    value DECIMAL(12, 2),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    -- Colonnes cycle de vie
    lifecycle_stage TEXT,
    probability DECIMAL(5, 2),
    converted_at TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,
    lost_reason TEXT,
    first_contact_date TIMESTAMPTZ,
    last_activity_date TIMESTAMPTZ,
    -- Colonnes géolocalisation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geocoded_address TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    family TEXT,
    sector TEXT,
    notes TEXT,
    source TEXT,
    -- Colonnes VIP
    is_vip BOOLEAN DEFAULT FALSE,
    vip_detected_at TIMESTAMPTZ,
    -- Colonnes dÃ©sabonnement
    unsubscribed BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    unsubscribed_reason TEXT,
    reactivated_at TIMESTAMPTZ,
    -- MÃ©tadonnÃ©es
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_scoring ON leads(scoring);
CREATE INDEX IF NOT EXISTS idx_leads_is_vip ON leads(is_vip);
CREATE INDEX IF NOT EXISTS idx_leads_vip_detected_at ON leads(vip_detected_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_lifecycle_stage ON leads(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_leads_probability ON leads(probability);
CREATE INDEX IF NOT EXISTS idx_leads_converted_at ON leads(converted_at);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity_date ON leads(last_activity_date);

-- Migration pour ajouter les colonnes manquantes à la table leads si elle existe déjà
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        -- Ajout de toutes les colonnes manquantes
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'scoring') THEN
            ALTER TABLE leads ADD COLUMN scoring INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lifecycle_stage') THEN
            ALTER TABLE leads ADD COLUMN lifecycle_stage TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'probability') THEN
            ALTER TABLE leads ADD COLUMN probability DECIMAL(5, 2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'converted_at') THEN
            ALTER TABLE leads ADD COLUMN converted_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lost_at') THEN
            ALTER TABLE leads ADD COLUMN lost_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lost_reason') THEN
            ALTER TABLE leads ADD COLUMN lost_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'first_contact_date') THEN
            ALTER TABLE leads ADD COLUMN first_contact_date TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'last_activity_date') THEN
            ALTER TABLE leads ADD COLUMN last_activity_date TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'latitude') THEN
            ALTER TABLE leads ADD COLUMN latitude DECIMAL(10, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'longitude') THEN
            ALTER TABLE leads ADD COLUMN longitude DECIMAL(11, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'geocoded_address') THEN
            ALTER TABLE leads ADD COLUMN geocoded_address TEXT;
        END IF;
        -- Colonnes VIP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'is_vip') THEN
            ALTER TABLE leads ADD COLUMN is_vip BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'vip_detected_at') THEN
            ALTER TABLE leads ADD COLUMN vip_detected_at TIMESTAMPTZ;
        END IF;
        -- Colonnes désabonnement
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unsubscribed') THEN
            ALTER TABLE leads ADD COLUMN unsubscribed BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unsubscribed_at') THEN
            ALTER TABLE leads ADD COLUMN unsubscribed_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unsubscribed_reason') THEN
            ALTER TABLE leads ADD COLUMN unsubscribed_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'reactivated_at') THEN
            ALTER TABLE leads ADD COLUMN reactivated_at TIMESTAMPTZ;
        END IF;
        -- Autres colonnes possibles
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'tags') THEN
            ALTER TABLE leads ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'metadata') THEN
            ALTER TABLE leads ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'assigned_at') THEN
            ALTER TABLE leads ADD COLUMN assigned_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

-- =====================================================
-- SCRAPING_SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraping_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    source TEXT NOT NULL,
    query TEXT,
    zone TEXT,
    activity TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    leads_found INTEGER DEFAULT 0,
    leads_added INTEGER DEFAULT 0,
    errors TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraping_sessions
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_source ON scraping_sessions(source);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_zone_activity ON scraping_sessions(zone, activity);
-- Index pour status (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraping_sessions' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scraping_sessions_status ON scraping_sessions(status)';
    END IF;
END $$;
-- Indexes pour user_id et started_at (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraping_sessions' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scraping_sessions_user_id ON scraping_sessions(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraping_sessions' AND column_name = 'started_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scraping_sessions_started_at ON scraping_sessions(started_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraping_sessions' AND column_name = 'user_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraping_sessions' AND column_name = 'started_at')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraping_sessions' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scraping_sessions_user_status_date ON scraping_sessions(user_id, status, started_at DESC)';
    END IF;
END $$;

-- =====================================================
-- USER_AVAILABILITY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('available', 'busy', 'on_vacation', 'sick', 'unavailable', 'out_of_office')),
    reason TEXT,
    start_date DATE,
    end_date DATE,
    auto_assign_back BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_availability_unique_active 
    ON user_availability(user_id) 
    WHERE is_active = TRUE;

-- =====================================================
-- VACATION_PERIODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vacation_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'training', 'other')),
    reason TEXT,
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Indexes for user availability
CREATE INDEX IF NOT EXISTS idx_user_availability_status ON user_availability(status);
CREATE INDEX IF NOT EXISTS idx_user_availability_is_active ON user_availability(is_active);
CREATE INDEX IF NOT EXISTS idx_user_availability_dates ON user_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_dates ON vacation_periods(start_date, end_date);
-- Indexes pour user_id (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_availability' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_availability_user_id ON user_availability(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vacation_periods' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vacation_periods_user_id ON vacation_periods(user_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_vacation_periods_approved ON vacation_periods(approved);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_type ON vacation_periods(type);

-- =====================================================
-- LEAD_PREFERENCES TABLE
-- =====================================================

-- Migration pour ajouter les colonnes manquantes à la table lead_preferences si elle existe déjà
-- IMPORTANT: Cette migration doit être AVANT le CREATE TABLE pour s'assurer que les colonnes existent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_preferences') THEN
        -- Colonne lead_id (doit être ajoutée en premier car référencée par d'autres éléments)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'lead_id') THEN
            -- Ajouter la colonne lead_id (sans NOT NULL car la table peut avoir des données)
            ALTER TABLE lead_preferences ADD COLUMN lead_id UUID;
            
            -- Ajouter la contrainte FOREIGN KEY si la table leads existe
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' 
                    AND table_name = 'lead_preferences' 
                    AND constraint_name = 'lead_preferences_lead_id_fkey'
                ) THEN
                    ALTER TABLE lead_preferences ADD CONSTRAINT lead_preferences_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'email') THEN
            ALTER TABLE lead_preferences ADD COLUMN email TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_email_marketing') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_email_marketing BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_email_transactional') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_email_transactional BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_sms') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_sms BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_whatsapp') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_whatsapp BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_at') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_reason') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_from') THEN
            ALTER TABLE lead_preferences ADD COLUMN unsubscribed_from TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'ip_address') THEN
            ALTER TABLE lead_preferences ADD COLUMN ip_address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'user_agent') THEN
            ALTER TABLE lead_preferences ADD COLUMN user_agent TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'reactivated_at') THEN
            ALTER TABLE lead_preferences ADD COLUMN reactivated_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'reactivated_by') THEN
            ALTER TABLE lead_preferences ADD COLUMN reactivated_by UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'pending_reactivation') THEN
            ALTER TABLE lead_preferences ADD COLUMN pending_reactivation BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'reactivation_token') THEN
            ALTER TABLE lead_preferences ADD COLUMN reactivation_token TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'frequency') THEN
            ALTER TABLE lead_preferences ADD COLUMN frequency TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'content_types') THEN
            ALTER TABLE lead_preferences ADD COLUMN content_types TEXT[] DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'consent_history') THEN
            ALTER TABLE lead_preferences ADD COLUMN consent_history JSONB DEFAULT '[]'::jsonb;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lead_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    -- Désabonnements par canal
    unsubscribed_email_marketing BOOLEAN DEFAULT FALSE,
    unsubscribed_email_transactional BOOLEAN DEFAULT FALSE,
    unsubscribed_sms BOOLEAN DEFAULT FALSE,
    unsubscribed_whatsapp BOOLEAN DEFAULT FALSE,
    -- Dates et raison
    unsubscribed_at TIMESTAMPTZ,
    unsubscribed_reason TEXT,
    unsubscribed_from TEXT,
    -- Métadonnées
    ip_address TEXT,
    user_agent TEXT,
    -- Réabonnement
    reactivated_at TIMESTAMPTZ,
    reactivated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    pending_reactivation BOOLEAN DEFAULT FALSE,
    reactivation_token TEXT,
    -- Préférences
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    content_types TEXT[] DEFAULT '{}',
    consent_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_preferences (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lead_preferences_lead_id ON lead_preferences(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_email_marketing') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lead_preferences_unsubscribed_email ON lead_preferences(unsubscribed_email_marketing)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_preferences' AND column_name = 'unsubscribed_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lead_preferences_unsubscribed_at ON lead_preferences(unsubscribed_at)';
    END IF;
END $$;

-- =====================================================
-- UNSUBSCRIBE_TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_ip_address TEXT
);

-- Indexes for unsubscribe_tokens
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON unsubscribe_tokens(token);
-- Index pour unsubscribe_tokens.lead_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'unsubscribe_tokens' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_lead_id ON unsubscribe_tokens(lead_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_expires_at ON unsubscribe_tokens(expires_at);

-- =====================================================
-- GDPR_DELETION_REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gdpr_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processing', 'completed', 'rejected')),
    verification_token TEXT UNIQUE,
    verified_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    requested_by TEXT,
    reason TEXT,
    keep_legal_data BOOLEAN DEFAULT FALSE,
    legal_basis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GDPR_EXPORT_REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gdpr_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'expired')),
    format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),
    export_url TEXT,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    requested_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for GDPR tables
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_status ON gdpr_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_email ON gdpr_deletion_requests(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_requested_at ON gdpr_deletion_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_export_requests_status ON gdpr_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_export_requests_email ON gdpr_export_requests(email);

-- =====================================================
-- VIP_CONTACT_ATTEMPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vip_contact_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('email', 'call', 'meeting', 'sms')),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result TEXT CHECK (result IN ('success', 'no_answer', 'voicemail', 'busy', 'not_available')),
    notes TEXT,
    response_received BOOLEAN DEFAULT FALSE,
    response_received_at TIMESTAMPTZ,
    response_time_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VIP_RESPONSE_TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vip_response_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL,
    first_contact_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    response_time_hours DECIMAL(10, 2),
    target_response_time_hours DECIMAL(10, 2) DEFAULT 24,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'overdue', 'escalated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for VIP tables (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_contact_attempts_lead_id ON vip_contact_attempts(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_contact_attempts_user_id ON vip_contact_attempts(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts' AND column_name = 'attempted_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_contact_attempts_attempted_at ON vip_contact_attempts(attempted_at)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_contact_attempts' AND column_name = 'response_received') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_contact_attempts_response_received ON vip_contact_attempts(response_received)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_response_tracking' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_response_tracking_lead_id ON vip_response_tracking(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_response_tracking' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_response_tracking_status ON vip_response_tracking(status)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vip_response_tracking' AND column_name = 'assigned_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vip_response_tracking_assigned_at ON vip_response_tracking(assigned_at)';
    END IF;
END $$;

-- =====================================================
-- MAILING_LISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mailing_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'dynamic', 'hybrid')),
    criteria JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MAILING_LIST_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mailing_list_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES mailing_lists(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'automatic', 'import', 'segment')),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(list_id, lead_id)
);

-- =====================================================
-- MAILING_LIST_EXCLUSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mailing_list_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES mailing_lists(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    excluded_at TIMESTAMPTZ DEFAULT NOW(),
    excluded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    UNIQUE(list_id, lead_id)
);

-- Indexes for mailing lists
CREATE INDEX IF NOT EXISTS idx_mailing_lists_created_by ON mailing_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_mailing_lists_is_active ON mailing_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_mailing_lists_is_public ON mailing_lists(is_public);
CREATE INDEX IF NOT EXISTS idx_mailing_lists_type ON mailing_lists(type);
CREATE INDEX IF NOT EXISTS idx_mailing_list_members_list_id ON mailing_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_mailing_list_members_added_at ON mailing_list_members(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailing_list_exclusions_list_id ON mailing_list_exclusions(list_id);
-- Indexes pour lead_id (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mailing_list_members' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_mailing_list_members_lead_id ON mailing_list_members(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mailing_list_exclusions' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_mailing_list_exclusions_lead_id ON mailing_list_exclusions(lead_id)';
    END IF;
END $$;

-- =====================================================
-- SCRAPING_CONFIGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraping_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sources JSONB NOT NULL DEFAULT '{}'::jsonb,
    limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    fields_to_extract JSONB NOT NULL DEFAULT '{}'::jsonb,
    advanced JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes for scraping_configs
CREATE INDEX IF NOT EXISTS idx_scraping_configs_user_id ON scraping_configs(user_id);

-- =====================================================
-- SCRAPING_ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scraping_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES scraping_sessions(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('error', 'warning', 'info', 'success')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    error_details JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraping_alerts
CREATE INDEX IF NOT EXISTS idx_scraping_alerts_session_id ON scraping_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_scraping_alerts_acknowledged ON scraping_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_scraping_alerts_severity ON scraping_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_scraping_alerts_alert_type ON scraping_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_scraping_alerts_created_at ON scraping_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_alerts_unacknowledged ON scraping_alerts(acknowledged, severity, created_at DESC) WHERE acknowledged = FALSE;

-- =====================================================
-- PROSPECTING_SEARCH_TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prospecting_search_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    zone TEXT NOT NULL,
    activity TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    is_official BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prospecting_search_templates
CREATE INDEX IF NOT EXISTS idx_prospecting_templates_created_by ON prospecting_search_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_prospecting_templates_public ON prospecting_search_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_prospecting_templates_official ON prospecting_search_templates(is_official) WHERE is_official = TRUE;
CREATE INDEX IF NOT EXISTS idx_prospecting_templates_usage ON prospecting_search_templates(usage_count DESC);

-- =====================================================
-- PROSPECTING_ZONES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prospecting_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('circle', 'polygon')),
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius_km DECIMAL(10, 2),
    coordinates JSONB,
    color TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prospecting_zones
CREATE INDEX IF NOT EXISTS idx_prospecting_zones_created_by ON prospecting_zones(created_by);
CREATE INDEX IF NOT EXISTS idx_prospecting_zones_is_active ON prospecting_zones(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_prospecting_zones_zone_type ON prospecting_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_prospecting_zones_created_at ON prospecting_zones(created_at DESC);

-- Trigger for prospecting_zones updated_at
DROP TRIGGER IF EXISTS update_prospecting_zones_updated_at ON prospecting_zones;
CREATE TRIGGER update_prospecting_zones_updated_at BEFORE UPDATE ON prospecting_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAVED_FILTERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('leads', 'tasks', 'projects', 'campaigns')),
    criteria JSONB DEFAULT '{}'::jsonb,
    is_shared BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for saved_filters
CREATE INDEX IF NOT EXISTS idx_saved_filters_created_by ON saved_filters(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_filters_resource_type ON saved_filters(resource_type);
CREATE INDEX IF NOT EXISTS idx_saved_filters_is_shared ON saved_filters(is_shared) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_saved_filters_updated_at ON saved_filters(updated_at DESC);

-- Trigger for saved_filters updated_at
DROP TRIGGER IF EXISTS update_saved_filters_updated_at ON saved_filters;
CREATE TRIGGER update_saved_filters_updated_at BEFORE UPDATE ON saved_filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- API_USAGE_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_provider TEXT NOT NULL CHECK (api_provider IN ('clearbit', 'fullcontact', 'hunter', 'sirene', 'gemini', 'groq', 'mistral', 'openrouter')),
    service_type TEXT NOT NULL CHECK (service_type IN ('enrichment', 'ai_generation', 'email_validation', 'phone_validation', 'other')),
    request_type TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    credits_used INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_usage_logs
-- Indexes pour api_provider et service_type (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'api_provider') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_logs(api_provider)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'service_type') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_api_usage_service_type ON api_usage_logs(service_type)';
    END IF;
END $$;
-- Index pour api_usage_logs.lead_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_api_usage_lead_id ON api_usage_logs(lead_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at);
-- Indexes composites pour api_provider (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'api_provider') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_api_usage_provider_created ON api_usage_logs(api_provider, created_at)';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'service_type') THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_api_usage_provider_service_date ON api_usage_logs(api_provider, service_type, created_at)';
        END IF;
    END IF;
END $$;

-- =====================================================
-- CUSTOM_REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    report_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON custom_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_public ON custom_reports(is_public) WHERE is_public = TRUE;

-- Trigger for custom_reports updated_at
DROP TRIGGER IF EXISTS update_custom_reports_updated_at ON custom_reports;
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports and public reports" ON custom_reports;
CREATE POLICY "Users can view own reports and public reports" ON custom_reports
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can create own reports" ON custom_reports;
CREATE POLICY "Users can create own reports" ON custom_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reports" ON custom_reports;
CREATE POLICY "Users can update own reports" ON custom_reports
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reports" ON custom_reports;
CREATE POLICY "Users can delete own reports" ON custom_reports
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- REPORT_WIDGETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES custom_reports(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL CHECK (widget_type IN ('metric', 'chart', 'table', 'text', 'kpi_card')),
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 4,
    height INTEGER NOT NULL DEFAULT 3,
    widget_config JSONB DEFAULT '{}'::jsonb,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_widgets_report_id ON report_widgets(report_id);
CREATE INDEX IF NOT EXISTS idx_report_widgets_order ON report_widgets(report_id, order_index);

-- Trigger for report_widgets updated_at
DROP TRIGGER IF EXISTS update_report_widgets_updated_at ON report_widgets;
CREATE TRIGGER update_report_widgets_updated_at BEFORE UPDATE ON report_widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE report_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view widgets of accessible reports" ON report_widgets;
CREATE POLICY "Users can view widgets of accessible reports" ON report_widgets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM custom_reports
            WHERE custom_reports.id = report_widgets.report_id
            AND (custom_reports.user_id = auth.uid() OR custom_reports.is_public = TRUE)
        )
    );

DROP POLICY IF EXISTS "Users can create widgets for own reports" ON report_widgets;
CREATE POLICY "Users can create widgets for own reports" ON report_widgets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_reports
            WHERE custom_reports.id = report_widgets.report_id
            AND custom_reports.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update widgets of own reports" ON report_widgets;
CREATE POLICY "Users can update widgets of own reports" ON report_widgets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM custom_reports
            WHERE custom_reports.id = report_widgets.report_id
            AND custom_reports.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete widgets of own reports" ON report_widgets;
CREATE POLICY "Users can delete widgets of own reports" ON report_widgets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM custom_reports
            WHERE custom_reports.id = report_widgets.report_id
            AND custom_reports.user_id = auth.uid()
        )
    );

-- =====================================================
-- USER_DASHBOARD_LAYOUTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    layout_name TEXT NOT NULL DEFAULT 'Default',
    is_default BOOLEAN DEFAULT FALSE,
    widget_configs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, layout_name)
);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_layouts_user_id ON user_dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_layouts_default ON user_dashboard_layouts(user_id, is_default) WHERE is_default = TRUE;

-- Trigger for user_dashboard_layouts updated_at
DROP TRIGGER IF EXISTS update_user_dashboard_layouts_updated_at ON user_dashboard_layouts;
CREATE TRIGGER update_user_dashboard_layouts_updated_at BEFORE UPDATE ON user_dashboard_layouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own layouts" ON user_dashboard_layouts;
CREATE POLICY "Users can view own layouts" ON user_dashboard_layouts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own layouts" ON user_dashboard_layouts;
CREATE POLICY "Users can create own layouts" ON user_dashboard_layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own layouts" ON user_dashboard_layouts;
CREATE POLICY "Users can update own layouts" ON user_dashboard_layouts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own layouts" ON user_dashboard_layouts;
CREATE POLICY "Users can delete own layouts" ON user_dashboard_layouts
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- ORGANIZATION_2FA_POLICIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_2fa_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    required_for_roles TEXT[] DEFAULT '{}',
    enforcement_date TIMESTAMPTZ,
    grace_period_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_2fa_policies_org ON organization_2fa_policies(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_2fa_policies_active ON organization_2fa_policies(is_active) WHERE is_active = TRUE;

-- Trigger for organization_2fa_policies updated_at
DROP TRIGGER IF EXISTS update_2fa_policies_updated_at ON organization_2fa_policies;
CREATE TRIGGER update_2fa_policies_updated_at BEFORE UPDATE ON organization_2fa_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organization_2fa_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view 2FA policies" ON organization_2fa_policies;
CREATE POLICY "Admins can view 2FA policies" ON organization_2fa_policies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Admins can create 2FA policies" ON organization_2fa_policies;
CREATE POLICY "Admins can create 2FA policies" ON organization_2fa_policies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update 2FA policies" ON organization_2fa_policies;
CREATE POLICY "Admins can update 2FA policies" ON organization_2fa_policies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete 2FA policies" ON organization_2fa_policies;
CREATE POLICY "Admins can delete 2FA policies" ON organization_2fa_policies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );

-- =====================================================
-- CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
    scheduled_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    workflow_triggers JSONB DEFAULT '[]'::jsonb,
    engagement_metrics JSONB,
    metrics_updated_at TIMESTAMPTZ,
    template_id UUID,
    segment_id UUID,
    mailing_list_id UUID REFERENCES mailing_lists(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
-- Index pour scheduled_at (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'scheduled_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at)';
    END IF;
    -- Index pour template_id (créé seulement si la colonne existe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'template_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON campaigns(template_id)';
    END IF;
    -- Index pour segment_id (créé seulement si la colonne existe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'segment_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaigns_segment_id ON campaigns(segment_id)';
    END IF;
    -- Index pour mailing_list_id (créé seulement si la colonne existe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'mailing_list_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaigns_mailing_list_id ON campaigns(mailing_list_id)';
    END IF;
END $$;

-- =====================================================
-- SCHEDULED_EMAIL_EXECUTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_email_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled_email_executions
CREATE INDEX IF NOT EXISTS idx_scheduled_email_executions_status ON scheduled_email_executions(status);
-- Indexes pour campaign_id et scheduled_at (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions' AND column_name = 'campaign_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scheduled_email_executions_campaign_id ON scheduled_email_executions(campaign_id)';
    END IF;
END $$;
-- Indexes pour scheduled_at (créés seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scheduled_email_executions' AND column_name = 'scheduled_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scheduled_email_executions_scheduled_at ON scheduled_email_executions(scheduled_at)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scheduled_email_executions_pending ON scheduled_email_executions(scheduled_at) WHERE status = ''pending''';
    END IF;
END $$;

-- =====================================================
-- WORKFLOW_TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    workflow_data JSONB NOT NULL,
    preview_image TEXT,
    estimated_leads TEXT,
    use_case TEXT,
    steps TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0
);

-- Indexes for workflow_templates
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_official ON workflow_templates(is_official);

-- =====================================================
-- WORKFLOW_VERSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    workflow_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    changelog TEXT,
    is_current_version BOOLEAN DEFAULT false,
    UNIQUE(workflow_id, version)
);

-- Indexes for workflow_versions
CREATE INDEX IF NOT EXISTS idx_workflow_versions_version ON workflow_versions(version);
-- Index pour workflow_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_versions' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id)';
    END IF;
END $$;

-- =====================================================
-- WORKFLOW_TEMPLATE_SHARES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_template_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);

-- =====================================================
-- CAMPAIGN_WORKFLOW_TRIGGERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_workflow_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB,
    triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaign_workflow_triggers
-- Index pour workflow_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaign_workflow_triggers_workflow ON campaign_workflow_triggers(workflow_id)';
    END IF;
END $$;
-- Indexes pour campaign_id et lead_id (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers' AND column_name = 'campaign_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaign_workflow_triggers_campaign ON campaign_workflow_triggers(campaign_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaign_workflow_triggers_lead ON campaign_workflow_triggers(lead_id)';
    END IF;
END $$;

-- =====================================================
-- WORKFLOW_ERROR_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    workflow_name TEXT NOT NULL,
    action_id UUID NOT NULL,
    action_name TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'resolved', 'ignored')),
    resolution_notes TEXT,
    occurrence_count INTEGER DEFAULT 1
);

-- Indexes for workflow_error_logs
CREATE INDEX IF NOT EXISTS idx_workflow_error_logs_error_type ON workflow_error_logs(error_type);
-- Index pour workflow_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_error_logs' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_error_logs_workflow_id ON workflow_error_logs(workflow_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workflow_error_logs_severity ON workflow_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_workflow_error_logs_resolution_status ON workflow_error_logs(resolution_status);
-- Index pour action_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_error_logs' AND column_name = 'action_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_error_logs_action_id ON workflow_error_logs(action_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workflow_error_logs_occurred_at ON workflow_error_logs(occurred_at DESC);

-- =====================================================
-- AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- =====================================================
-- ASSIGNMENT_DECISIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assignment_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    lead_name TEXT NOT NULL,
    assigned_from UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name TEXT NOT NULL,
    decision_type TEXT NOT NULL CHECK (decision_type IN ('initial', 'reassignment', 'escalation', 'transfer', 'automatic')),
    rules_applied TEXT[] DEFAULT '{}',
    rule_details JSONB DEFAULT '{}'::jsonb,
    reason TEXT,
    decision_timestamp TIMESTAMPTZ DEFAULT NOW(),
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    workflow_id UUID,
    is_vip BOOLEAN DEFAULT FALSE,
    scoring INTEGER,
    temperature TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for assignment_decisions
CREATE INDEX IF NOT EXISTS idx_assignment_decisions_lead_id ON assignment_decisions(lead_id);
CREATE INDEX IF NOT EXISTS idx_assignment_decisions_assigned_to ON assignment_decisions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignment_decisions_decision_type ON assignment_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_assignment_decisions_decision_timestamp ON assignment_decisions(decision_timestamp DESC);

-- =====================================================
-- APPOINTMENTS TABLE (Planificateur de rendez-vous)
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'Europe/Paris',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
    meeting_type TEXT NOT NULL DEFAULT 'call' CHECK (meeting_type IN ('call', 'video', 'in_person', 'other')),
    meeting_url TEXT,
    location TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    notes TEXT,
    recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly')),
    recurrence_end_date TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent ON appointments(reminder_sent) WHERE reminder_sent = FALSE;

-- =====================================================
-- APPOINTMENT_AVAILABILITY TABLE (Disponibilités)
-- =====================================================
CREATE TABLE IF NOT EXISTS appointment_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Indexes for appointment_availability
CREATE INDEX IF NOT EXISTS idx_appointment_availability_user_id ON appointment_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_availability_day ON appointment_availability(day_of_week);

-- =====================================================
-- MEETING_NOTES TABLE (Prise de notes de réunion)
-- =====================================================
CREATE TABLE IF NOT EXISTS meeting_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcription_text TEXT,
    manual_notes TEXT,
    ai_summary TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    insights JSONB DEFAULT '{}'::jsonb,
    audio_file_url TEXT,
    transcription_status TEXT NOT NULL DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'error')),
    language TEXT DEFAULT 'fr',
    duration_seconds INTEGER,
    word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for meeting_notes
CREATE INDEX IF NOT EXISTS idx_meeting_notes_appointment_id ON meeting_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_id ON meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_transcription_status ON meeting_notes(transcription_status);

-- =====================================================
-- MEETING_ACTION_ITEMS TABLE (Actions à faire depuis réunions)
-- =====================================================
CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_note_id UUID NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for meeting_action_items
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_note_id ON meeting_action_items(meeting_note_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assigned_to ON meeting_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_status ON meeting_action_items(status);

-- =====================================================
-- WEBSITE_CHAT_MESSAGES TABLE (Chat website)
-- =====================================================
CREATE TABLE IF NOT EXISTS website_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent', 'bot')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for website_chat_messages
CREATE INDEX IF NOT EXISTS idx_website_chat_messages_session_id ON website_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_website_chat_messages_lead_id ON website_chat_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_website_chat_messages_created_at ON website_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_chat_messages_is_read ON website_chat_messages(is_read) WHERE is_read = FALSE;

-- =====================================================
-- CHATBOT_CONFIGURATIONS TABLE (Configuration chatbot)
-- =====================================================
CREATE TABLE IF NOT EXISTS chatbot_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    welcome_message TEXT NOT NULL,
    fallback_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rules JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chatbot_configurations
CREATE INDEX IF NOT EXISTS idx_chatbot_configurations_is_active ON chatbot_configurations(is_active) WHERE is_active = TRUE;

-- =====================================================
-- LANDING_PAGES TABLE (Pages de destination)
-- =====================================================
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    custom_css TEXT,
    custom_js TEXT,
    conversion_goal TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for landing_pages
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_published ON landing_pages(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_by ON landing_pages(created_by);

-- =====================================================
-- LANDING_PAGE_VISITS TABLE (Visites landing pages)
-- =====================================================
CREATE TABLE IF NOT EXISTS landing_page_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    visitor_id TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for landing_page_visits
CREATE INDEX IF NOT EXISTS idx_landing_page_visits_landing_page_id ON landing_page_visits(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_visits_visited_at ON landing_page_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_page_visits_converted ON landing_page_visits(converted) WHERE converted = TRUE;

-- =====================================================
-- FORMS TABLE (Formulaires intégrés)
-- =====================================================
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    form_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    submit_message TEXT,
    redirect_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for forms
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_forms_is_public ON forms(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);

-- =====================================================
-- FORM_SUBMISSIONS TABLE (Soumissions formulaires)
-- =====================================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ
);

-- Indexes for form_submissions
-- Index pour form_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'form_submissions' AND column_name = 'form_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_id ON form_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_processed ON form_submissions(processed) WHERE processed = FALSE;

-- =====================================================
-- AB_TESTS TABLE (Tests A/B pour landing pages et templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID,
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    variant_ids UUID[],
    distribution JSONB DEFAULT '{}'::jsonb,
    traffic_split JSONB DEFAULT '{}'::jsonb, -- { variant_id: percentage }
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled', 'archived')),
    conversion_goal TEXT, -- 'form_submission', 'button_click', 'time_on_page', etc.
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    duration INTEGER DEFAULT 14,
    min_sample_size INTEGER DEFAULT 100,
    minimum_sample_size INTEGER DEFAULT 100,
    significance_level DECIMAL(3, 2) DEFAULT 0.95,
    confidence_level DECIMAL(5, 2) DEFAULT 95.00, -- 95% confidence level
    winner_id UUID,
    winner_variant_id UUID, -- Set when test is completed
    winner_detected_at TIMESTAMPTZ,
    auto_deploy BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ab_tests (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'template_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ab_tests_template_id ON ab_tests(template_id) WHERE template_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'landing_page_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ab_tests_landing_page_id ON ab_tests(landing_page_id) WHERE landing_page_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'created_by') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ab_tests_created_by ON ab_tests(created_by)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'start_date') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ab_tests_start_date ON ab_tests(start_date)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ab_tests' AND column_name = 'end_date') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ab_tests_end_date ON ab_tests(end_date)';
    END IF;
END $$;

-- =====================================================
-- AB_TEST_VARIANTS TABLE (Variantes d'un test A/B)
-- =====================================================
CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'A', 'B', 'Control', etc.
    description TEXT,
    landing_page_content JSONB NOT NULL DEFAULT '{}'::jsonb, -- Content of this variant
    is_control BOOLEAN DEFAULT FALSE, -- True for the original/control variant
    traffic_percentage DECIMAL(5, 2) DEFAULT 50.00, -- Percentage of traffic to this variant
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ab_test_variants
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_ab_test_id ON ab_test_variants(ab_test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_is_control ON ab_test_variants(is_control);

-- =====================================================
-- AB_TEST_ASSIGNMENTS TABLE (Assignation visiteurs aux variantes)
-- =====================================================
CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL, -- Cookie or session ID
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ab_test_id, visitor_id)
);

-- Indexes for ab_test_assignments
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_ab_test_id ON ab_test_assignments(ab_test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_variant_id ON ab_test_assignments(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_visitor_id ON ab_test_assignments(visitor_id);

-- =====================================================
-- AB_TEST_EVENTS TABLE (Événements de tracking A/B)
-- =====================================================
CREATE TABLE IF NOT EXISTS ab_test_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'visit', 'conversion', 'click', 'scroll', etc.
    event_data JSONB DEFAULT '{}'::jsonb, -- Additional event data
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ab_test_events
CREATE INDEX IF NOT EXISTS idx_ab_test_events_ab_test_id ON ab_test_events(ab_test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant_id ON ab_test_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_visitor_id ON ab_test_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_event_type ON ab_test_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_occurred_at ON ab_test_events(occurred_at DESC);

-- =====================================================
-- VOIP_CALLS TABLE (Appels VoIP)
-- =====================================================
CREATE TABLE IF NOT EXISTS voip_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no_answer', 'cancelled')),
    started_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    recording_url TEXT,
    transcript TEXT,
    notes TEXT,
    cost DECIMAL(10, 4),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voip_calls
CREATE INDEX IF NOT EXISTS idx_voip_calls_status ON voip_calls(status);
-- Indexes pour lead_id, user_id et started_at (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voip_calls' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_voip_calls_lead_id ON voip_calls(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voip_calls' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_voip_calls_user_id ON voip_calls(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voip_calls' AND column_name = 'started_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_voip_calls_started_at ON voip_calls(started_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voip_calls' AND column_name = 'phone_number') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_voip_calls_phone_number ON voip_calls(phone_number)';
    END IF;
END $$;

-- =====================================================
-- SALES_ACTIVITIES TABLE (Activités de vente)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'other')),
    subject TEXT,
    description TEXT,
    duration INTEGER,
    activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome TEXT,
    next_followup_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales_activities
CREATE INDEX IF NOT EXISTS idx_sales_activities_user_id ON sales_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_lead_id ON sales_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_activity_type ON sales_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_sales_activities_activity_date ON sales_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_activities_next_followup_date ON sales_activities(next_followup_date);

-- =====================================================
-- EMAIL_TRACKING TABLE (Suivi des emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    email_address TEXT NOT NULL,
    subject TEXT,
    opened BOOLEAN DEFAULT FALSE,
    opened_at TIMESTAMPTZ,
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ,
    clicked_url TEXT,
    bounced BOOLEAN DEFAULT FALSE,
    bounced_at TIMESTAMPTZ,
    bounce_reason TEXT,
    unsubscribed BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    tracking_pixel_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_tracking
-- Indexes pour email_address, lead_id et campaign_id (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'email_address') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_tracking_email_address ON email_tracking(email_address)';
    END IF;
END $$;
-- Indexes pour lead_id et campaign_id (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_tracking_lead_id ON email_tracking(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'campaign_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON email_tracking(campaign_id)';
    END IF;
END $$;
-- Indexes pour opened, clicked et sent_at (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'opened') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_tracking_opened ON email_tracking(opened) WHERE opened = TRUE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'clicked') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_tracking_clicked ON email_tracking(clicked) WHERE clicked = TRUE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'sent_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at DESC)';
    END IF;
END $$;

-- =====================================================
-- QUOTES TABLE (Devis)
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number TEXT UNIQUE NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    client_address_line1 TEXT,
    client_address_line2 TEXT,
    client_postal_code TEXT,
    client_city TEXT,
    client_country TEXT,
    client_company TEXT,
    client_siret TEXT,
    client_siren TEXT,
    client_vat_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
    valid_until DATE,
    payment_terms TEXT,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);

-- =====================================================
-- QUOTE_ITEMS TABLE (Lignes de devis)
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2),
    total DECIMAL(12, 2) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quote_items
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_position ON quote_items(quote_id, position);

-- =====================================================
-- QUOTE_FOLLOW_UPS TABLE (Suivi des devis)
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('sent', 'viewed', 'reminder', 'updated', 'accepted', 'rejected', 'expired')),
    notes TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quote_follow_ups
CREATE INDEX IF NOT EXISTS idx_quote_follow_ups_quote_id ON quote_follow_ups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_follow_ups_user_id ON quote_follow_ups(user_id);
-- Index pour scheduled_at (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quote_follow_ups' AND column_name = 'scheduled_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_quote_follow_ups_scheduled_at ON quote_follow_ups(scheduled_at)';
    END IF;
END $$;

-- =====================================================
-- EMAIL_TEMPLATES TABLE (Modèles d'emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('transactional', 'marketing', 'sales', 'automation', 'other')),
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    variables JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    preview_image TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
-- Indexes pour template_type, category, is_public, is_active (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'template_type') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_templates_template_type ON email_templates(template_type)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'category') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'is_public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_templates_is_public ON email_templates(is_public) WHERE is_public = TRUE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'is_active') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active) WHERE is_active = TRUE';
    END IF;
END $$;

-- Migration pour ajouter is_active et autres colonnes manquantes à email_segments si la table existe déjà
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_segments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_segments' AND column_name = 'is_active') THEN
            ALTER TABLE email_segments ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_segments' AND column_name = 'member_count') THEN
            ALTER TABLE email_segments ADD COLUMN member_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_segments' AND column_name = 'criteria') THEN
            ALTER TABLE email_segments ADD COLUMN criteria JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter setting_key et autres colonnes manquantes aux tables company_settings et settings si elles existent déjà
DO $$
BEGIN
    -- company_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'setting_key') THEN
            ALTER TABLE company_settings ADD COLUMN setting_key TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'setting_value') THEN
            ALTER TABLE company_settings ADD COLUMN setting_value JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'category') THEN
            ALTER TABLE company_settings ADD COLUMN category TEXT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'setting_key') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_schema = 'public' AND table_name = 'company_settings' 
                AND constraint_type = 'UNIQUE' 
                AND constraint_name LIKE '%setting_key%'
            ) THEN
                ALTER TABLE company_settings ADD CONSTRAINT company_settings_setting_key_key UNIQUE (setting_key);
            END IF;
        END IF;
    END IF;
    
    -- settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'setting_key') THEN
            ALTER TABLE settings ADD COLUMN setting_key TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'setting_value') THEN
            ALTER TABLE settings ADD COLUMN setting_value JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'category') THEN
            ALTER TABLE settings ADD COLUMN category TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'is_public') THEN
            ALTER TABLE settings ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'setting_key') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_schema = 'public' AND table_name = 'settings' 
                AND constraint_type = 'UNIQUE' 
                AND constraint_name LIKE '%setting_key%'
            ) THEN
                ALTER TABLE settings ADD CONSTRAINT settings_setting_key_key UNIQUE (setting_key);
            END IF;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter action_id et parent_action_id aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- workflow_error_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_error_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_error_logs' AND column_name = 'action_id') THEN
            ALTER TABLE workflow_error_logs ADD COLUMN action_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- action_executions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_executions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'action_executions' AND column_name = 'action_id') THEN
            ALTER TABLE action_executions ADD COLUMN action_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automated_actions') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'action_executions' 
                    AND constraint_name = 'action_executions_action_id_fkey'
                ) THEN
                    ALTER TABLE action_executions ADD CONSTRAINT action_executions_action_id_fkey FOREIGN KEY (action_id) REFERENCES automated_actions(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- automation_actions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_actions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_actions' AND column_name = 'parent_action_id') THEN
            ALTER TABLE automation_actions ADD COLUMN parent_action_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_actions') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_actions' 
                    AND constraint_name = 'automation_actions_parent_action_id_fkey'
                ) THEN
                    ALTER TABLE automation_actions ADD CONSTRAINT automation_actions_parent_action_id_fkey FOREIGN KEY (parent_action_id) REFERENCES automation_actions(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- automation_execution_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_execution_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'action_id') THEN
            ALTER TABLE automation_execution_logs ADD COLUMN action_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_actions') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' 
                    AND constraint_name = 'automation_execution_logs_action_id_fkey'
                ) THEN
                    ALTER TABLE automation_execution_logs ADD CONSTRAINT automation_execution_logs_action_id_fkey FOREIGN KEY (action_id) REFERENCES automation_actions(id) ON DELETE SET NULL;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter entity_type et local_entity_type aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- trigger_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trigger_events') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trigger_events' AND column_name = 'entity_type') THEN
            ALTER TABLE trigger_events ADD COLUMN entity_type TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trigger_events' AND column_name = 'entity_id') THEN
            ALTER TABLE trigger_events ADD COLUMN entity_id UUID NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trigger_events' AND column_name = 'event_type') THEN
            ALTER TABLE trigger_events ADD COLUMN event_type TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;
    
    -- analytics_predictions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_predictions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_predictions' AND column_name = 'entity_type') THEN
            ALTER TABLE analytics_predictions ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'lead';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_predictions' AND column_name = 'entity_id') THEN
            ALTER TABLE analytics_predictions ADD COLUMN entity_id UUID;
        END IF;
    END IF;
    
    -- search_index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'search_index') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_index' AND column_name = 'entity_type') THEN
            ALTER TABLE search_index ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'document';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_index' AND column_name = 'entity_id') THEN
            ALTER TABLE search_index ADD COLUMN entity_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- calendar_sync_mappings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_sync_mappings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_sync_mappings' AND column_name = 'local_entity_type') THEN
            ALTER TABLE calendar_sync_mappings ADD COLUMN local_entity_type TEXT NOT NULL DEFAULT 'appointment';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_sync_mappings' AND column_name = 'local_entity_id') THEN
            ALTER TABLE calendar_sync_mappings ADD COLUMN local_entity_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- accounting_sync_mappings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_sync_mappings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_sync_mappings' AND column_name = 'local_entity_type') THEN
            ALTER TABLE accounting_sync_mappings ADD COLUMN local_entity_type TEXT NOT NULL DEFAULT 'invoice';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_sync_mappings' AND column_name = 'local_entity_id') THEN
            ALTER TABLE accounting_sync_mappings ADD COLUMN local_entity_id UUID NOT NULL;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter provider et api_provider aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- api_usage_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_usage_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'api_provider') THEN
            ALTER TABLE api_usage_logs ADD COLUMN api_provider TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_logs' AND column_name = 'service_type') THEN
            ALTER TABLE api_usage_logs ADD COLUMN service_type TEXT;
        END IF;
    END IF;
    
    -- integrations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations' AND column_name = 'provider') THEN
            ALTER TABLE integrations ADD COLUMN provider TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations' AND column_name = 'category') THEN
            ALTER TABLE integrations ADD COLUMN category TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;
    
    -- lead_enrichment_jobs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_enrichment_jobs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_enrichment_jobs' AND column_name = 'provider') THEN
            ALTER TABLE lead_enrichment_jobs ADD COLUMN provider TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;
    
    -- calendar_integrations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_integrations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_integrations' AND column_name = 'provider') THEN
            ALTER TABLE calendar_integrations ADD COLUMN provider TEXT NOT NULL DEFAULT 'google';
        END IF;
    END IF;
    
    -- accounting_integrations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_integrations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_integrations' AND column_name = 'provider') THEN
            ALTER TABLE accounting_integrations ADD COLUMN provider TEXT NOT NULL DEFAULT 'quickbooks';
        END IF;
    END IF;
END $$;

-- Migration pour ajouter execution_id aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- workflow_versions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_versions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_versions' AND column_name = 'workflow_id') THEN
            ALTER TABLE workflow_versions ADD COLUMN workflow_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- campaign_workflow_triggers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign_workflow_triggers' AND column_name = 'workflow_id') THEN
            ALTER TABLE campaign_workflow_triggers ADD COLUMN workflow_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- workflow_error_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_error_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_error_logs' AND column_name = 'execution_id') THEN
            ALTER TABLE workflow_error_logs ADD COLUMN execution_id UUID NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_error_logs' AND column_name = 'workflow_id') THEN
            ALTER TABLE workflow_error_logs ADD COLUMN workflow_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- assignment_decisions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignment_decisions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignment_decisions' AND column_name = 'workflow_id') THEN
            ALTER TABLE assignment_decisions ADD COLUMN workflow_id UUID;
        END IF;
    END IF;
    
    -- automation_triggers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_triggers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_triggers' AND column_name = 'workflow_id') THEN
            ALTER TABLE automation_triggers ADD COLUMN workflow_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_workflows') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_triggers' 
                    AND constraint_name = 'automation_triggers_workflow_id_fkey'
                ) THEN
                    ALTER TABLE automation_triggers ADD CONSTRAINT automation_triggers_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- automation_actions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_actions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_actions' AND column_name = 'workflow_id') THEN
            ALTER TABLE automation_actions ADD COLUMN workflow_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_workflows') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_actions' 
                    AND constraint_name = 'automation_actions_workflow_id_fkey'
                ) THEN
                    ALTER TABLE automation_actions ADD CONSTRAINT automation_actions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- automation_executions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_executions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_executions' AND column_name = 'workflow_id') THEN
            ALTER TABLE automation_executions ADD COLUMN workflow_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_workflows') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_executions' 
                    AND constraint_name = 'automation_executions_workflow_id_fkey'
                ) THEN
                    ALTER TABLE automation_executions ADD CONSTRAINT automation_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- automation_enrollments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_enrollments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_enrollments' AND column_name = 'workflow_id') THEN
            ALTER TABLE automation_enrollments ADD COLUMN workflow_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_workflows') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_enrollments' 
                    AND constraint_name = 'automation_enrollments_workflow_id_fkey'
                ) THEN
                    ALTER TABLE automation_enrollments ADD CONSTRAINT automation_enrollments_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- workflow_errors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_errors') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_errors' AND column_name = 'workflow_id') THEN
            ALTER TABLE workflow_errors ADD COLUMN workflow_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- automation_execution_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_execution_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'execution_id') THEN
            ALTER TABLE automation_execution_logs ADD COLUMN execution_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_executions') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' 
                    AND constraint_name = 'automation_execution_logs_execution_id_fkey'
                ) THEN
                    ALTER TABLE automation_execution_logs ADD CONSTRAINT automation_execution_logs_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES automation_executions(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'log_type') THEN
            ALTER TABLE automation_execution_logs ADD COLUMN log_type TEXT NOT NULL DEFAULT 'info';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'message') THEN
            ALTER TABLE automation_execution_logs ADD COLUMN message TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'data') THEN
            ALTER TABLE automation_execution_logs ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter plan et autres colonnes manquantes à clients si la table existe déjà
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'plan') THEN
            ALTER TABLE clients ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
        END IF;
    END IF;
END $$;

-- Migration pour ajouter is_active et autres colonnes manquantes à automated_tasks si la table existe déjà
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automated_tasks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automated_tasks' AND column_name = 'is_active') THEN
            ALTER TABLE automated_tasks ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automated_tasks' AND column_name = 'task_type') THEN
            ALTER TABLE automated_tasks ADD COLUMN task_type TEXT;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter created_by et autres colonnes manquantes à campaigns si la table existe déjà
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'created_by') THEN
            ALTER TABLE campaigns ADD COLUMN created_by UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'campaigns' 
                    AND constraint_name = 'campaigns_created_by_fkey'
                ) THEN
                    ALTER TABLE campaigns ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- Migration pour ajouter social_account_id aux tables qui peuvent en manquer si elles existent déjà
DO $$
BEGIN
    -- social_posts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_posts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'social_account_id') THEN
            ALTER TABLE social_posts ADD COLUMN social_account_id UUID;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_accounts') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'social_posts' 
                    AND constraint_name = 'social_posts_social_account_id_fkey'
                ) THEN
                    ALTER TABLE social_posts ADD CONSTRAINT social_posts_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE SET NULL;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- social_post_publications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_post_publications') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_post_publications' AND column_name = 'social_account_id') THEN
            ALTER TABLE social_post_publications ADD COLUMN social_account_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_accounts') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'social_post_publications' 
                    AND constraint_name = 'social_post_publications_social_account_id_fkey'
                ) THEN
                    ALTER TABLE social_post_publications ADD CONSTRAINT social_post_publications_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- social_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_messages' AND column_name = 'social_account_id') THEN
            ALTER TABLE social_messages ADD COLUMN social_account_id UUID NOT NULL;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_accounts') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE table_schema = 'public' AND table_name = 'social_messages' 
                    AND constraint_name = 'social_messages_social_account_id_fkey'
                ) THEN
                    ALTER TABLE social_messages ADD CONSTRAINT social_messages_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- =====================================================
-- EMAIL_SEGMENTS TABLE (Segments d'emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    member_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_segments
CREATE INDEX IF NOT EXISTS idx_email_segments_created_by ON email_segments(created_by);
-- Index pour is_active (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_segments' AND column_name = 'is_active') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_segments_is_active ON email_segments(is_active) WHERE is_active = TRUE';
    END IF;
END $$;

-- =====================================================
-- EMAIL_SEGMENT_MEMBERS TABLE (Membres des segments)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_segment_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID NOT NULL REFERENCES email_segments(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'automatic', 'import')),
    UNIQUE(segment_id, lead_id),
    UNIQUE(segment_id, email)
);

-- Indexes for email_segment_members
CREATE INDEX IF NOT EXISTS idx_email_segment_members_segment_id ON email_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_email_segment_members_lead_id ON email_segment_members(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_segment_members_email ON email_segment_members(email);

-- =====================================================
-- NOTIFICATIONS TABLE (Notifications utilisateurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'task', 'lead', 'project', 'system')),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- WEBHOOKS TABLE (Webhooks)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    headers JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_created_by ON webhooks(created_by);

-- =====================================================
-- WEBHOOK_EVENTS TABLE (Types d'événements webhooks)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_category ON webhook_events(category);

-- =====================================================
-- WEBHOOK_DELIVERIES TABLE (Livraisons de webhooks)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- =====================================================
-- INVOICES TABLE (Factures)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    client_address_line1 TEXT,
    client_address_line2 TEXT,
    client_postal_code TEXT,
    client_city TEXT,
    client_country TEXT,
    client_company TEXT,
    client_siret TEXT,
    client_siren TEXT,
    client_vat_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_reference TEXT,
    payment_terms TEXT,
    legal_mentions TEXT,
    late_payment_penalties TEXT,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    terms TEXT,
    stripe_payment_intent_id TEXT,
    e_invoice_transmitted BOOLEAN DEFAULT FALSE,
    e_invoice_transmitted_at TIMESTAMPTZ,
    e_invoice_platform TEXT,
    e_invoice_hash TEXT,
    e_invoice_timestamp TEXT,
    e_invoice_format TEXT,
    e_invoice_file_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id ON invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- =====================================================
-- INVOICE_ITEMS TABLE (Lignes de facture)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2),
    total DECIMAL(12, 2) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_position ON invoice_items(invoice_id, position);

-- =====================================================
-- PAYMENTS TABLE (Paiements)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'bank_transfer', 'check', 'cash', 'paypal', 'stripe', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    reference TEXT,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

-- =====================================================
-- EMPLOYEES TABLE (Employés)
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    position TEXT NOT NULL,
    department TEXT,
    hire_date DATE,
    salary DECIMAL(12, 2),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- =====================================================
-- EVENTS TABLE (Événements)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- =====================================================
-- EVENT_ATTENDEES TABLE (Participants aux événements)
-- =====================================================
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'tentative')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Indexes for event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

-- =====================================================
-- DOCUMENTS TABLE (Documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    file_url TEXT, -- Optionnel pour documents créés dans l'éditeur
    file_type TEXT,
    file_size BIGINT,
    folder_path TEXT NOT NULL DEFAULT '/',
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Champs pour éditeur collaboratif
    content JSONB, -- Contenu structuré pour WYSIWYG
    html_content TEXT, -- Contenu HTML pour export/preview
    is_collaborative BOOLEAN DEFAULT FALSE, -- Document éditable collaborativement
    current_version INTEGER DEFAULT 1, -- Version actuelle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_folder_path ON documents(folder_path);

-- =====================================================
-- INTEGRATIONS TABLE (Intégrations)
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    enabled BOOLEAN DEFAULT TRUE,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}'::jsonb,
    account_id TEXT,
    account_name TEXT,
    account_avatar TEXT,
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled) WHERE enabled = TRUE;
-- Index pour provider (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations' AND column_name = 'provider') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider)';
    END IF;
END $$;

-- =====================================================
-- MILESTONES TABLE (Jalons de projet)
-- =====================================================
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    color TEXT DEFAULT '#6366f1',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for milestones
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

-- =====================================================
-- RISKS TABLE (Risques de projet)
-- =====================================================
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    probability INTEGER NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'monitoring', 'mitigated', 'resolved', 'accepted')),
    mitigation_plan TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_resolution_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for risks
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_task_id ON risks(task_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_impact ON risks(impact);
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);

-- =====================================================
-- EMAIL_CAMPAIGNS TABLE (Campagnes email - différente de campaigns)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    email_content TEXT NOT NULL,
    sender_name TEXT,
    sender_email TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
-- Index pour scheduled_at (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'scheduled_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);

-- =====================================================
-- EMAIL_SENDS TABLE (Envois d'emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced BOOLEAN DEFAULT FALSE,
    unsubscribed BOOLEAN DEFAULT FALSE,
    tracking_pixel_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_sends
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient_email ON email_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC);

-- =====================================================
-- EMAIL_CLICKS TABLE (Clics sur emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
    link_url TEXT NOT NULL,
    link_text TEXT,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    click_position_x INTEGER,
    click_position_y INTEGER,
    device_type TEXT,
    user_agent TEXT
);

-- Indexes for email_clicks
CREATE INDEX IF NOT EXISTS idx_email_clicks_send_id ON email_clicks(send_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_clicked_at ON email_clicks(clicked_at DESC);

-- =====================================================
-- CAMPAIGN_METRICS TABLE (Métriques de campagne)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    opens INTEGER DEFAULT 0,
    unique_opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    bounces INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    cost DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, metric_date)
);

-- Indexes for campaign_metrics
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_metric_date ON campaign_metrics(metric_date DESC);

-- =====================================================
-- CAMPAIGN_ROI TABLE (ROI de campagne)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_roi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    roi_percentage DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaign_roi
CREATE INDEX IF NOT EXISTS idx_campaign_roi_campaign_id ON campaign_roi(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roi_period ON campaign_roi(period_start, period_end);

-- =====================================================
-- SALES_GOALS TABLE (Objectifs de vente)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    target_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    target_leads INTEGER DEFAULT 0,
    target_conversions INTEGER DEFAULT 0,
    target_deals INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales_goals
CREATE INDEX IF NOT EXISTS idx_sales_goals_user_id ON sales_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_period ON sales_goals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_sales_goals_period_type ON sales_goals(period_type);

-- =====================================================
-- SALES_FORECASTS TABLE (Prévisions de vente)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    forecasted_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    forecasted_deals INTEGER DEFAULT 0,
    confidence_level INTEGER NOT NULL DEFAULT 50 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales_forecasts
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_user_id ON sales_forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_period ON sales_forecasts(period_start, period_end);

-- =====================================================
-- COMPANY_SETTINGS TABLE (Paramètres de l'entreprise)
-- =====================================================
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for company_settings
-- Indexes pour setting_key et category (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'setting_key') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'category') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_company_settings_category ON company_settings(category)';
    END IF;
END $$;

-- =====================================================
-- AUTOMATED_ACTIONS TABLE (Actions automatisées)
-- =====================================================
CREATE TABLE IF NOT EXISTS automated_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    action_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automated_actions
CREATE INDEX IF NOT EXISTS idx_automated_actions_action_type ON automated_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_automated_actions_is_active ON automated_actions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automated_actions_created_by ON automated_actions(created_by);

-- =====================================================
-- ACTION_EXECUTIONS TABLE (Exécutions d'actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS action_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES automated_actions(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    execution_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for action_executions
CREATE INDEX IF NOT EXISTS idx_action_executions_status ON action_executions(status);
-- Index pour action_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'action_executions' AND column_name = 'action_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_action_executions_action_id ON action_executions(action_id)';
    END IF;
END $$;
-- Indexes pour lead_id et started_at (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'action_executions' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_action_executions_lead_id ON action_executions(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'action_executions' AND column_name = 'started_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_action_executions_started_at ON action_executions(started_at DESC)';
    END IF;
END $$;

-- =====================================================
-- LEAD_ASSIGNMENT_RULES TABLE (Règles d'assignation des leads)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_assignment_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    conditions JSONB NOT NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('round_robin', 'load_balance', 'skill_based', 'manual', 'geographic')),
    assignment_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_assignment_rules
CREATE INDEX IF NOT EXISTS idx_lead_assignment_rules_priority ON lead_assignment_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_lead_assignment_rules_is_active ON lead_assignment_rules(is_active) WHERE is_active = TRUE;

-- =====================================================
-- SALES_PERFORMANCE TABLE (Performance des ventes)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    revenue DECIMAL(12, 2) DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 2),
    average_deal_size DECIMAL(12, 2),
    sales_activities_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_start, period_end)
);

-- Indexes for sales_performance
CREATE INDEX IF NOT EXISTS idx_sales_performance_user_id ON sales_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_performance_period ON sales_performance(period_start, period_end);

-- =====================================================
-- SETTINGS TABLE (Paramètres généraux)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for settings
-- Indexes pour setting_key et category (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'setting_key') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'category') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)';
    END IF;
END $$;

-- =====================================================
-- TRIGGER_EVENTS TABLE (Événements déclencheurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS trigger_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trigger_events
CREATE INDEX IF NOT EXISTS idx_trigger_events_event_type ON trigger_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trigger_events_processed ON trigger_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_trigger_events_created_at ON trigger_events(created_at DESC);
-- Index pour entity_type, entity_id (créé seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trigger_events' AND column_name = 'entity_type') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trigger_events' AND column_name = 'entity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trigger_events_entity ON trigger_events(entity_type, entity_id)';
    END IF;
END $$;

-- =====================================================
-- LIFECYCLE_TRANSITIONS TABLE (Transitions de cycle de vie)
-- =====================================================
CREATE TABLE IF NOT EXISTS lifecycle_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    transition_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lifecycle_transitions
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_lead_id ON lifecycle_transitions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_to_stage ON lifecycle_transitions(to_stage);
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_transition_date ON lifecycle_transitions(transition_date DESC);

-- =====================================================
-- LEAD_ENRICHMENT_JOBS TABLE (Jobs d'enrichissement des leads)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    enriched_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_enrichment_jobs
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_jobs_lead_id ON lead_enrichment_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_jobs_status ON lead_enrichment_jobs(status);
-- Index pour provider (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lead_enrichment_jobs' AND column_name = 'provider') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lead_enrichment_jobs_provider ON lead_enrichment_jobs(provider)';
    END IF;
END $$;

-- =====================================================
-- AUTOMATION_WORKFLOWS TABLE (Workflows d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    scenario_type TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    workflow_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_workflows
CREATE INDEX IF NOT EXISTS idx_automation_workflows_status ON automation_workflows(status);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_scenario_type ON automation_workflows(scenario_type);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_created_by ON automation_workflows(created_by);

-- =====================================================
-- AUTOMATION_TRIGGERS TABLE (Déclencheurs d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_triggers
-- Index pour workflow_id et position (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_triggers' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_triggers_workflow_id ON automation_triggers(workflow_id)';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_triggers' AND column_name = 'position') THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_triggers_position ON automation_triggers(workflow_id, position)';
        END IF;
    END IF;
END $$;

-- =====================================================
-- AUTOMATION_ACTIONS TABLE (Actions d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_config JSONB NOT NULL,
    position INTEGER DEFAULT 0,
    parent_action_id UUID REFERENCES automation_actions(id) ON DELETE CASCADE,
    delay_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_actions
-- Index pour workflow_id et position (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_actions' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_actions_workflow_id ON automation_actions(workflow_id)';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_actions' AND column_name = 'position') THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_actions_position ON automation_actions(workflow_id, position)';
        END IF;
    END IF;
END $$;
-- Index pour parent_action_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_actions' AND column_name = 'parent_action_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_actions_parent_action_id ON automation_actions(parent_action_id)';
    END IF;
END $$;

-- =====================================================
-- AUTOMATION_EXECUTIONS TABLE (Exécutions d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
    current_step INTEGER DEFAULT 0,
    execution_data JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Indexes for automation_executions
-- Index pour workflow_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_executions' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_executions_workflow_id ON automation_executions(workflow_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
-- Indexes pour lead_id et started_at (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_executions' AND column_name = 'lead_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_executions_lead_id ON automation_executions(lead_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_executions' AND column_name = 'started_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_executions_started_at ON automation_executions(started_at DESC)';
    END IF;
END $$;

-- =====================================================
-- AUTOMATION_EXECUTION_LOGS TABLE (Logs d'exécution d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
    action_id UUID REFERENCES automation_actions(id) ON DELETE SET NULL,
    trigger_id UUID REFERENCES automation_triggers(id) ON DELETE SET NULL,
    log_type TEXT NOT NULL CHECK (log_type IN ('info', 'warning', 'error', 'success')),
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_execution_logs
-- Index pour log_type (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'log_type') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_log_type ON automation_execution_logs(log_type)';
    END IF;
END $$;
-- Index pour execution_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'execution_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_execution_id ON automation_execution_logs(execution_id)';
    END IF;
END $$;
-- Index pour action_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'action_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_action_id ON automation_execution_logs(action_id)';
    END IF;
END $$;

-- =====================================================
-- AUTOMATION_RULES TABLE (Règles d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'workspace', 'project')),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL,
    conditions JSONB DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_status ON automation_rules(status);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type ON automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_project_id ON automation_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace_id ON automation_rules(workspace_id);

-- =====================================================
-- AUTOMATION_RULE_EXECUTIONS TABLE (Exécutions de règles d'automatisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_rule_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    trigger_data JSONB DEFAULT '{}'::jsonb,
    execution_result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for automation_rule_executions
CREATE INDEX IF NOT EXISTS idx_automation_rule_executions_rule_id ON automation_rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_rule_executions_task_id ON automation_rule_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_automation_rule_executions_executed_at ON automation_rule_executions(executed_at DESC);

-- =====================================================
-- AUTOMATION_ENROLLMENTS TABLE (Inscriptions aux automations)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, lead_id)
);

-- Indexes for automation_enrollments
-- Index pour workflow_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automation_enrollments' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automation_enrollments_workflow_id ON automation_enrollments(workflow_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_lead_id ON automation_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_status ON automation_enrollments(status);

-- =====================================================
-- CLIENTS TABLE (Multi-tenant)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    domain TEXT,
    company_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#6366f1',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
    max_users INTEGER DEFAULT 10,
    max_projects INTEGER DEFAULT 5,
    max_storage_gb INTEGER DEFAULT 10,
    trial_ends_at TIMESTAMPTZ,
    billing_email TEXT,
    billing_address TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_subdomain ON clients(subdomain);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
-- Index pour plan (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'plan') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clients_plan ON clients(plan)';
    END IF;
END $$;

-- =====================================================
-- USER_CLIENTS TABLE (Utilisateurs clients - Multi-tenant)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, client_id)
);

-- Indexes for user_clients
CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON user_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_client_id ON user_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_is_primary ON user_clients(is_primary) WHERE is_primary = TRUE;

-- =====================================================
-- NON_WORKING_DAYS TABLE (Jours non travaillés - Calendrier)
-- =====================================================
CREATE TABLE IF NOT EXISTS non_working_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(calendar_id, date)
);

-- Indexes for non_working_days
CREATE INDEX IF NOT EXISTS idx_non_working_days_calendar_id ON non_working_days(calendar_id);
CREATE INDEX IF NOT EXISTS idx_non_working_days_date ON non_working_days(date);

-- =====================================================
-- WORKING_HOURS TABLE (Heures de travail - Calendrier)
-- =====================================================
CREATE TABLE IF NOT EXISTS working_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working_day BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(calendar_id, day_of_week),
    CHECK (end_time > start_time)
);

-- Indexes for working_hours
CREATE INDEX IF NOT EXISTS idx_working_hours_calendar_id ON working_hours(calendar_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_day_of_week ON working_hours(day_of_week);

-- =====================================================
-- PERMISSIONS TABLE (Permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for permissions
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_type ON permissions(resource_type);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- =====================================================
-- ROLE_PERMISSIONS TABLE (Permissions par rôle)
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role TEXT NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- Indexes for role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- =====================================================
-- RESOURCE_PERMISSIONS TABLE (Permissions par ressource)
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, resource_type, resource_id, permission_id)
);

-- Indexes for resource_permissions
CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_permission_id ON resource_permissions(permission_id);

-- =====================================================
-- NOTIFICATION_SUBSCRIPTIONS TABLE (Abonnements aux notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    enabled BOOLEAN DEFAULT TRUE,
    channels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type, resource_type, resource_id)
);

-- Indexes for notification_subscriptions
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_event_type ON notification_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_project_id ON notification_subscriptions(project_id);

-- =====================================================
-- CHAT_CHANNELS TABLE (Canaux de chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('channel', 'dm', 'group')),
    unread INTEGER DEFAULT 0,
    status TEXT,
    avatar TEXT,
    last_message TEXT,
    last_time TIMESTAMPTZ,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_channels
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_project_id ON chat_channels(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_last_time ON chat_channels(last_time DESC);

-- =====================================================
-- AUTOMATED_TASKS TABLE (Tâches automatisées)
-- =====================================================
CREATE TABLE IF NOT EXISTS automated_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    task_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automated_tasks
CREATE INDEX IF NOT EXISTS idx_automated_tasks_created_by ON automated_tasks(created_by);
-- Indexes pour task_type et is_active (créés seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automated_tasks' AND column_name = 'task_type') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automated_tasks_task_type ON automated_tasks(task_type)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'automated_tasks' AND column_name = 'is_active') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_automated_tasks_is_active ON automated_tasks(is_active) WHERE is_active = TRUE';
    END IF;
END $$;

-- =====================================================
-- WORKFLOW_ERRORS TABLE (Erreurs de workflow - variante)
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    workflow_name TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for workflow_errors
CREATE INDEX IF NOT EXISTS idx_workflow_errors_error_type ON workflow_errors(error_type);
-- Index pour workflow_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_errors' AND column_name = 'workflow_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_errors_workflow_id ON workflow_errors(workflow_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workflow_errors_resolution_status ON workflow_errors(resolution_status);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_occurred_at ON workflow_errors(occurred_at DESC);

-- =====================================================
-- FONCTIONS
-- =====================================================

-- Fonction générique pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour updated_at pour user_availability
CREATE OR REPLACE FUNCTION update_user_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un tracking VIP
CREATE OR REPLACE FUNCTION create_vip_response_tracking()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.scoring >= 90 OR NEW.value > 50000 OR 
        EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(NEW.tags, '[]'::jsonb)) AS tag WHERE tag ILIKE '%vip%') OR
        NEW.is_vip = TRUE) THEN
        IF NEW.assigned_to IS NOT NULL AND NEW.assigned_at IS NOT NULL THEN
            INSERT INTO vip_response_tracking (lead_id, assigned_at, target_response_time_hours, status)
            VALUES (NEW.id, NEW.assigned_at, 24, 'pending')
            ON CONFLICT DO NOTHING;
            UPDATE leads
            SET is_vip = TRUE, vip_detected_at = COALESCE(leads.vip_detected_at, NOW())
            WHERE id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier la disponibilité d'un utilisateur
CREATE OR REPLACE FUNCTION check_user_availability(
    p_user_id UUID,
    p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_availability user_availability%ROWTYPE;
    v_vacation vacation_periods%ROWTYPE;
BEGIN
    SELECT * INTO v_availability
    FROM user_availability
    WHERE user_id = p_user_id
      AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_availability.start_date IS NOT NULL AND v_availability.end_date IS NOT NULL THEN
            IF p_check_date >= v_availability.start_date AND p_check_date <= v_availability.end_date THEN
                IF v_availability.status IN ('on_vacation', 'sick', 'unavailable', 'out_of_office') THEN
                    RETURN FALSE;
                END IF;
            END IF;
        ELSIF v_availability.status IN ('on_vacation', 'sick', 'unavailable', 'out_of_office') THEN
            RETURN FALSE;
        END IF;
    END IF;

    SELECT * INTO v_vacation
    FROM vacation_periods
    WHERE user_id = p_user_id
      AND approved = TRUE
      AND p_check_date >= start_date
      AND p_check_date <= end_date
    LIMIT 1;

    IF FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_unsubscribe_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM unsubscribe_tokens
    WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un utilisateur doit activer 2FA selon les politiques
CREATE OR REPLACE FUNCTION check_2fa_requirement(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    policy_exists BOOLEAN;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = user_id;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM organization_2fa_policies
        WHERE is_active = TRUE
        AND (enforcement_date IS NULL OR enforcement_date <= NOW())
        AND (user_role = ANY(required_for_roles))
    ) INTO policy_exists;
    
    RETURN policy_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour updated_at pour scheduled_email_executions
CREATE OR REPLACE FUNCTION update_scheduled_email_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour VIP tracking
DROP TRIGGER IF EXISTS trigger_create_vip_tracking ON leads;
CREATE TRIGGER trigger_create_vip_tracking
    AFTER INSERT OR UPDATE OF assigned_to, assigned_at, scoring, value, tags, is_vip ON leads
    FOR EACH ROW
    WHEN (NEW.assigned_to IS NOT NULL)
    EXECUTE FUNCTION create_vip_response_tracking();

-- Trigger pour user_availability
DROP TRIGGER IF EXISTS trigger_update_user_availability_updated_at ON user_availability;
CREATE TRIGGER trigger_update_user_availability_updated_at
    BEFORE UPDATE ON user_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_user_availability_updated_at();

-- Trigger pour vacation_periods
DROP TRIGGER IF EXISTS trigger_update_vacation_periods_updated_at ON vacation_periods;
CREATE TRIGGER trigger_update_vacation_periods_updated_at
    BEFORE UPDATE ON vacation_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_user_availability_updated_at();

-- Trigger pour scheduled_email_executions
DROP TRIGGER IF EXISTS trigger_update_scheduled_email_executions_updated_at ON scheduled_email_executions;
CREATE TRIGGER trigger_update_scheduled_email_executions_updated_at
    BEFORE UPDATE ON scheduled_email_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_email_executions_updated_at();

-- Trigger pour ab_tests
DROP TRIGGER IF EXISTS update_ab_tests_updated_at ON ab_tests;
CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour sales_activities
DROP TRIGGER IF EXISTS update_sales_activities_updated_at ON sales_activities;
CREATE TRIGGER update_sales_activities_updated_at
    BEFORE UPDATE ON sales_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour email_tracking
DROP TRIGGER IF EXISTS update_email_tracking_updated_at ON email_tracking;
CREATE TRIGGER update_email_tracking_updated_at
    BEFORE UPDATE ON email_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour quotes
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour email_templates
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour email_segments
DROP TRIGGER IF EXISTS update_email_segments_updated_at ON email_segments;
CREATE TRIGGER update_email_segments_updated_at
    BEFORE UPDATE ON email_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour webhooks
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour payments
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour employees
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour events
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour documents
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour integrations
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour milestones
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour risks
DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
CREATE TRIGGER update_risks_updated_at
    BEFORE UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour email_campaigns
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour campaign_roi
DROP TRIGGER IF EXISTS update_campaign_roi_updated_at ON campaign_roi;
CREATE TRIGGER update_campaign_roi_updated_at
    BEFORE UPDATE ON campaign_roi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour sales_goals
DROP TRIGGER IF EXISTS update_sales_goals_updated_at ON sales_goals;
CREATE TRIGGER update_sales_goals_updated_at
    BEFORE UPDATE ON sales_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour sales_forecasts
DROP TRIGGER IF EXISTS update_sales_forecasts_updated_at ON sales_forecasts;
CREATE TRIGGER update_sales_forecasts_updated_at
    BEFORE UPDATE ON sales_forecasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour company_settings
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour automated_actions
DROP TRIGGER IF EXISTS update_automated_actions_updated_at ON automated_actions;
CREATE TRIGGER update_automated_actions_updated_at
    BEFORE UPDATE ON automated_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour lead_assignment_rules
DROP TRIGGER IF EXISTS update_lead_assignment_rules_updated_at ON lead_assignment_rules;
CREATE TRIGGER update_lead_assignment_rules_updated_at
    BEFORE UPDATE ON lead_assignment_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour sales_performance
DROP TRIGGER IF EXISTS update_sales_performance_updated_at ON sales_performance;
CREATE TRIGGER update_sales_performance_updated_at
    BEFORE UPDATE ON sales_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour settings
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour automation_workflows
DROP TRIGGER IF EXISTS update_automation_workflows_updated_at ON automation_workflows;
CREATE TRIGGER update_automation_workflows_updated_at
    BEFORE UPDATE ON automation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour automation_rules
DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour automation_enrollments
DROP TRIGGER IF EXISTS update_automation_enrollments_updated_at ON automation_enrollments;
CREATE TRIGGER update_automation_enrollments_updated_at
    BEFORE UPDATE ON automation_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour resource_permissions
DROP TRIGGER IF EXISTS update_resource_permissions_updated_at ON resource_permissions;
CREATE TRIGGER update_resource_permissions_updated_at
    BEFORE UPDATE ON resource_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour notification_subscriptions
DROP TRIGGER IF EXISTS update_notification_subscriptions_updated_at ON notification_subscriptions;
CREATE TRIGGER update_notification_subscriptions_updated_at
    BEFORE UPDATE ON notification_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour chat_channels
DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON chat_channels;
CREATE TRIGGER update_chat_channels_updated_at
    BEFORE UPDATE ON chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour automated_tasks
DROP TRIGGER IF EXISTS update_automated_tasks_updated_at ON automated_tasks;
CREATE TRIGGER update_automated_tasks_updated_at
    BEFORE UPDATE ON automated_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour meeting_notes
DROP TRIGGER IF EXISTS update_meeting_notes_updated_at ON meeting_notes;
CREATE TRIGGER update_meeting_notes_updated_at
    BEFORE UPDATE ON meeting_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour meeting_action_items
DROP TRIGGER IF EXISTS update_meeting_action_items_updated_at ON meeting_action_items;
CREATE TRIGGER update_meeting_action_items_updated_at
    BEFORE UPDATE ON meeting_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VUES
-- =====================================================

-- Vue users_available (sans SECURITY DEFINER)
DROP VIEW IF EXISTS users_available CASCADE;
CREATE VIEW users_available AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    COALESCE(ua.status, 'available') as availability_status,
    ua.reason as availability_reason,
    ua.start_date as unavailability_start,
    ua.end_date as unavailability_end,
    CASE 
        WHEN ua.status IN ('on_vacation', 'sick', 'unavailable', 'out_of_office') 
             AND (ua.start_date IS NULL OR CURRENT_DATE >= ua.start_date)
             AND (ua.end_date IS NULL OR CURRENT_DATE <= ua.end_date)
        THEN FALSE
        ELSE TRUE
    END as is_available_now
FROM users u
LEFT JOIN user_availability ua ON u.id = ua.user_id AND ua.is_active = TRUE
WHERE u.role IN ('Manager', 'Éditeur', 'Admin');

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- User availability
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_availability;
CREATE POLICY "Enable read for authenticated users" ON user_availability
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own availability" ON user_availability;
CREATE POLICY "Users can manage own availability" ON user_availability
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT id FROM users WHERE role IN ('Admin', 'Manager')
    ));

-- Vacation periods
ALTER TABLE vacation_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON vacation_periods;
CREATE POLICY "Enable read for authenticated users" ON vacation_periods
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own vacations" ON vacation_periods;
CREATE POLICY "Users can manage own vacations" ON vacation_periods
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT id FROM users WHERE role IN ('Admin', 'Manager')
    ));

-- Scraping sessions
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read their own scraping sessions" ON scraping_sessions;
CREATE POLICY "Allow authenticated users to read their own scraping sessions"
    ON scraping_sessions FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated users to create scraping sessions" ON scraping_sessions;
CREATE POLICY "Allow authenticated users to create scraping sessions"
    ON scraping_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow users to update their own scraping sessions" ON scraping_sessions;
CREATE POLICY "Allow users to update their own scraping sessions"
    ON scraping_sessions FOR UPDATE
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow users to delete their own scraping sessions" ON scraping_sessions;
CREATE POLICY "Allow users to delete their own scraping sessions"
    ON scraping_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Scraping configs
ALTER TABLE scraping_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own scraping configs" ON scraping_configs;
CREATE POLICY "Users can read their own scraping configs"
    ON scraping_configs FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create their own scraping configs" ON scraping_configs;
CREATE POLICY "Users can create their own scraping configs"
    ON scraping_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own scraping configs" ON scraping_configs;
CREATE POLICY "Users can update their own scraping configs"
    ON scraping_configs FOR UPDATE
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own scraping configs" ON scraping_configs;
CREATE POLICY "Users can delete their own scraping configs"
    ON scraping_configs FOR DELETE
    USING (auth.uid() = user_id);

-- Scraping alerts
ALTER TABLE scraping_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read scraping alerts" ON scraping_alerts;
CREATE POLICY "Allow authenticated users to read scraping alerts"
    ON scraping_alerts FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated users to create scraping alerts" ON scraping_alerts;
CREATE POLICY "Allow authenticated users to create scraping alerts"
    ON scraping_alerts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow users to update their own acknowledged scraping alerts" ON scraping_alerts;
CREATE POLICY "Allow users to update their own acknowledged scraping alerts"
    ON scraping_alerts FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Mailing lists
ALTER TABLE mailing_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own mailing lists and public ones" ON mailing_lists;
CREATE POLICY "Users can read their own mailing lists and public ones"
    ON mailing_lists FOR SELECT
    USING (
        auth.uid() = created_by 
        OR is_public = TRUE 
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can create their own mailing lists" ON mailing_lists;
CREATE POLICY "Users can create their own mailing lists"
    ON mailing_lists FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own mailing lists" ON mailing_lists;
CREATE POLICY "Users can update their own mailing lists"
    ON mailing_lists FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own mailing lists" ON mailing_lists;
CREATE POLICY "Users can delete their own mailing lists"
    ON mailing_lists FOR DELETE
    USING (auth.uid() = created_by);

-- Mailing list members
ALTER TABLE mailing_list_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read mailing list members if they can read the list" ON mailing_list_members;
CREATE POLICY "Users can read mailing list members if they can read the list"
    ON mailing_list_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM mailing_lists 
            WHERE mailing_lists.id = mailing_list_members.list_id 
            AND (mailing_lists.created_by = auth.uid() OR mailing_lists.is_public = TRUE)
        )
    );
DROP POLICY IF EXISTS "Users can add members to lists they created or public lists" ON mailing_list_members;
CREATE POLICY "Users can add members to lists they created or public lists"
    ON mailing_list_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM mailing_lists 
            WHERE mailing_lists.id = mailing_list_members.list_id 
            AND (mailing_lists.created_by = auth.uid() OR mailing_lists.is_public = TRUE)
        )
    );
DROP POLICY IF EXISTS "Users can remove members from lists they created or public lists" ON mailing_list_members;
CREATE POLICY "Users can remove members from lists they created or public lists"
    ON mailing_list_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM mailing_lists 
            WHERE mailing_lists.id = mailing_list_members.list_id 
            AND (mailing_lists.created_by = auth.uid() OR mailing_lists.is_public = TRUE)
        )
    );

-- Mailing list exclusions
ALTER TABLE mailing_list_exclusions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read exclusions if they can read the list" ON mailing_list_exclusions;
CREATE POLICY "Users can read exclusions if they can read the list"
    ON mailing_list_exclusions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM mailing_lists 
            WHERE mailing_lists.id = mailing_list_exclusions.list_id 
            AND (mailing_lists.created_by = auth.uid() OR mailing_lists.is_public = TRUE)
        )
    );
DROP POLICY IF EXISTS "Users can create exclusions for lists they can modify" ON mailing_list_exclusions;
CREATE POLICY "Users can create exclusions for lists they can modify"
    ON mailing_list_exclusions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM mailing_lists 
            WHERE mailing_lists.id = mailing_list_exclusions.list_id 
            AND (mailing_lists.created_by = auth.uid() OR mailing_lists.is_public = TRUE)
        )
    );

-- Prospecting search templates
ALTER TABLE prospecting_search_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own templates and public/official templates" ON prospecting_search_templates;
CREATE POLICY "Users can view their own templates and public/official templates"
    ON prospecting_search_templates
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        is_public = TRUE OR
        is_official = TRUE
    );
DROP POLICY IF EXISTS "Users can create their own templates" ON prospecting_search_templates;
CREATE POLICY "Users can create their own templates"
    ON prospecting_search_templates
    FOR INSERT
    WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can update their own non-official templates" ON prospecting_search_templates;
CREATE POLICY "Users can update their own non-official templates"
    ON prospecting_search_templates
    FOR UPDATE
    USING (created_by = auth.uid() AND is_official = FALSE)
    WITH CHECK (created_by = auth.uid() AND is_official = FALSE);
DROP POLICY IF EXISTS "Users can delete their own non-official templates" ON prospecting_search_templates;
CREATE POLICY "Users can delete their own non-official templates"
    ON prospecting_search_templates
    FOR DELETE
    USING (created_by = auth.uid() AND is_official = FALSE);

-- Prospecting zones
ALTER TABLE prospecting_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own zones and active zones" ON prospecting_zones;
CREATE POLICY "Users can view their own zones and active zones"
    ON prospecting_zones
    FOR SELECT
    USING (created_by = auth.uid() OR is_active = TRUE);
DROP POLICY IF EXISTS "Users can create their own zones" ON prospecting_zones;
CREATE POLICY "Users can create their own zones"
    ON prospecting_zones
    FOR INSERT
    WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can update their own zones" ON prospecting_zones;
CREATE POLICY "Users can update their own zones"
    ON prospecting_zones
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own zones" ON prospecting_zones;
CREATE POLICY "Users can delete their own zones"
    ON prospecting_zones
    FOR DELETE
    USING (created_by = auth.uid());

-- Saved filters
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own filters and shared filters" ON saved_filters;
CREATE POLICY "Users can view their own filters and shared filters"
    ON saved_filters
    FOR SELECT
    USING (created_by = auth.uid() OR is_shared = TRUE);
DROP POLICY IF EXISTS "Users can create their own filters" ON saved_filters;
CREATE POLICY "Users can create their own filters"
    ON saved_filters
    FOR INSERT
    WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can update their own filters" ON saved_filters;
CREATE POLICY "Users can update their own filters"
    ON saved_filters
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own filters" ON saved_filters;
CREATE POLICY "Users can delete their own filters"
    ON saved_filters
    FOR DELETE
    USING (created_by = auth.uid());

-- API usage logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all API usage logs" ON api_usage_logs;
CREATE POLICY "Users can view all API usage logs"
    ON api_usage_logs
    FOR SELECT
    USING (true);
DROP POLICY IF EXISTS "Users can create API usage logs" ON api_usage_logs;
CREATE POLICY "Users can create API usage logs"
    ON api_usage_logs
    FOR INSERT
    WITH CHECK (true);

-- Workflow templates
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own templates and public/official templates" ON workflow_templates;
CREATE POLICY "Users can view their own templates and public/official templates"
    ON workflow_templates
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        is_public = TRUE OR
        is_official = TRUE OR
        auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can create their own templates" ON workflow_templates;
CREATE POLICY "Users can create their own templates"
    ON workflow_templates
    FOR INSERT
    WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can update their own non-official templates" ON workflow_templates;
CREATE POLICY "Users can update their own non-official templates"
    ON workflow_templates
    FOR UPDATE
    USING (created_by = auth.uid() AND is_official = FALSE)
    WITH CHECK (created_by = auth.uid() AND is_official = FALSE);
DROP POLICY IF EXISTS "Users can delete their own non-official templates" ON workflow_templates;
CREATE POLICY "Users can delete their own non-official templates"
    ON workflow_templates
    FOR DELETE
    USING (created_by = auth.uid() AND is_official = FALSE);

-- Workflow versions
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view workflow versions of accessible workflows" ON workflow_versions;
CREATE POLICY "Users can view workflow versions of accessible workflows"
    ON workflow_versions
    FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create workflow versions for their workflows" ON workflow_versions;
CREATE POLICY "Users can create workflow versions for their workflows"
    ON workflow_versions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update workflow versions of their workflows" ON workflow_versions;
CREATE POLICY "Users can update workflow versions of their workflows"
    ON workflow_versions
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Workflow template shares
ALTER TABLE workflow_template_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view shares of accessible templates" ON workflow_template_shares;
CREATE POLICY "Users can view shares of accessible templates"
    ON workflow_template_shares
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workflow_templates
            WHERE workflow_templates.id = workflow_template_shares.template_id
            AND (workflow_templates.created_by = auth.uid() OR workflow_templates.is_public = TRUE OR workflow_templates.is_official = TRUE)
        )
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Template creators can share templates" ON workflow_template_shares;
CREATE POLICY "Template creators can share templates"
    ON workflow_template_shares
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workflow_templates
            WHERE workflow_templates.id = workflow_template_shares.template_id
            AND workflow_templates.created_by = auth.uid()
        )
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can remove shares they created" ON workflow_template_shares;
CREATE POLICY "Users can remove shares they created"
    ON workflow_template_shares
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workflow_templates
            WHERE workflow_templates.id = workflow_template_shares.template_id
            AND workflow_templates.created_by = auth.uid()
        )
        OR user_id = auth.uid()
        OR auth.role() = 'authenticated'
    );

-- Campaign workflow triggers
ALTER TABLE campaign_workflow_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view triggers of their campaigns" ON campaign_workflow_triggers;
CREATE POLICY "Users can view triggers of their campaigns"
    ON campaign_workflow_triggers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_workflow_triggers.campaign_id
            AND campaigns.created_by = auth.uid()
        )
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can create triggers for their campaigns" ON campaign_workflow_triggers;
CREATE POLICY "Users can create triggers for their campaigns"
    ON campaign_workflow_triggers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_workflow_triggers.campaign_id
            AND campaigns.created_by = auth.uid()
        )
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can update triggers of their campaigns" ON campaign_workflow_triggers;
CREATE POLICY "Users can update triggers of their campaigns"
    ON campaign_workflow_triggers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_workflow_triggers.campaign_id
            AND campaigns.created_by = auth.uid()
        )
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can delete triggers of their campaigns" ON campaign_workflow_triggers;
CREATE POLICY "Users can delete triggers of their campaigns"
    ON campaign_workflow_triggers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_workflow_triggers.campaign_id
            AND campaigns.created_by = auth.uid()
        )
        OR auth.role() = 'authenticated'
    );

-- Workflow error logs
ALTER TABLE workflow_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view error logs of their workflows" ON workflow_error_logs;
CREATE POLICY "Users can view error logs of their workflows"
    ON workflow_error_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "System can create error logs" ON workflow_error_logs;
CREATE POLICY "System can create error logs"
    ON workflow_error_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update error logs of their workflows" ON workflow_error_logs;
CREATE POLICY "Users can update error logs of their workflows"
    ON workflow_error_logs
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can view audit logs"
    ON audit_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Assignment decisions
ALTER TABLE assignment_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view assignment decisions" ON assignment_decisions;
CREATE POLICY "Users can view assignment decisions"
    ON assignment_decisions
    FOR SELECT
    USING (
        assigned_to = auth.uid() OR
        assigned_from = auth.uid() OR
        auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can create assignment decisions" ON assignment_decisions;
CREATE POLICY "Users can create assignment decisions"
    ON assignment_decisions
    FOR INSERT
    WITH CHECK (triggered_by = auth.uid() OR triggered_by IS NULL OR auth.role() = 'authenticated');

-- Scheduled email executions
ALTER TABLE scheduled_email_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view scheduled executions of their campaigns" ON scheduled_email_executions;
CREATE POLICY "Users can view scheduled executions of their campaigns"
    ON scheduled_email_executions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = scheduled_email_executions.campaign_id
            AND campaigns.created_by = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can create scheduled executions for their campaigns" ON scheduled_email_executions;
CREATE POLICY "Users can create scheduled executions for their campaigns"
    ON scheduled_email_executions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = scheduled_email_executions.campaign_id
            AND campaigns.created_by = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can update scheduled executions of their campaigns" ON scheduled_email_executions;
CREATE POLICY "Users can update scheduled executions of their campaigns"
    ON scheduled_email_executions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = scheduled_email_executions.campaign_id
            AND campaigns.created_by = auth.uid()
        )
    );

-- AB tests
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own ab tests and public ones" ON ab_tests;
CREATE POLICY "Users can read their own ab tests and public ones"
    ON ab_tests FOR SELECT
    USING (
        auth.uid() = created_by 
        OR auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can create their own ab tests" ON ab_tests;
CREATE POLICY "Users can create their own ab tests"
    ON ab_tests FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own ab tests" ON ab_tests;
CREATE POLICY "Users can update their own ab tests"
    ON ab_tests FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own ab tests" ON ab_tests;
CREATE POLICY "Users can delete their own ab tests"
    ON ab_tests FOR DELETE
    USING (auth.uid() = created_by);

-- Sales activities
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sales activities" ON sales_activities;
CREATE POLICY "Users can view sales activities"
    ON sales_activities FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create sales activities" ON sales_activities;
CREATE POLICY "Users can create sales activities"
    ON sales_activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sales activities" ON sales_activities;
CREATE POLICY "Users can update their own sales activities"
    ON sales_activities FOR UPDATE
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sales activities" ON sales_activities;
CREATE POLICY "Users can delete their own sales activities"
    ON sales_activities FOR DELETE
    USING (auth.uid() = user_id);

-- Email tracking
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email tracking" ON email_tracking;
CREATE POLICY "Users can view email tracking"
    ON email_tracking FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "System can create email tracking" ON email_tracking;
CREATE POLICY "System can create email tracking"
    ON email_tracking FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "System can update email tracking" ON email_tracking;
CREATE POLICY "System can update email tracking"
    ON email_tracking FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view quotes" ON quotes;
CREATE POLICY "Users can view quotes"
    ON quotes FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create quotes" ON quotes;
CREATE POLICY "Users can create quotes"
    ON quotes FOR INSERT
    WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "Users can update quotes" ON quotes;
CREATE POLICY "Users can update quotes"
    ON quotes FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "Users can delete quotes" ON quotes;
CREATE POLICY "Users can delete quotes"
    ON quotes FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- Quote items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view quote items" ON quote_items;
CREATE POLICY "Users can view quote items"
    ON quote_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage quote items" ON quote_items;
CREATE POLICY "Users can manage quote items"
    ON quote_items FOR ALL
    USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND auth.role() = 'authenticated'))
    WITH CHECK (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND auth.role() = 'authenticated'));

-- Quote follow ups
ALTER TABLE quote_follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view quote follow ups" ON quote_follow_ups;
CREATE POLICY "Users can view quote follow ups"
    ON quote_follow_ups FOR SELECT
    USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_follow_ups.quote_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can create quote follow ups" ON quote_follow_ups;
CREATE POLICY "Users can create quote follow ups"
    ON quote_follow_ups FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update quote follow ups" ON quote_follow_ups;
CREATE POLICY "Users can update quote follow ups"
    ON quote_follow_ups FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Email templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email templates" ON email_templates;
CREATE POLICY "Users can view email templates"
    ON email_templates FOR SELECT
    USING (created_by = auth.uid() OR is_public = TRUE OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create email templates" ON email_templates;
CREATE POLICY "Users can create email templates"
    ON email_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own email templates" ON email_templates;
CREATE POLICY "Users can update their own email templates"
    ON email_templates FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own email templates" ON email_templates;
CREATE POLICY "Users can delete their own email templates"
    ON email_templates FOR DELETE
    USING (auth.uid() = created_by);

-- Email segments
ALTER TABLE email_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email segments" ON email_segments;
CREATE POLICY "Users can view email segments"
    ON email_segments FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create email segments" ON email_segments;
CREATE POLICY "Users can create email segments"
    ON email_segments FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own email segments" ON email_segments;
CREATE POLICY "Users can update their own email segments"
    ON email_segments FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own email segments" ON email_segments;
CREATE POLICY "Users can delete their own email segments"
    ON email_segments FOR DELETE
    USING (auth.uid() = created_by);

-- Email segment members
ALTER TABLE email_segment_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email segment members" ON email_segment_members;
CREATE POLICY "Users can view email segment members"
    ON email_segment_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM email_segments WHERE email_segments.id = email_segment_members.segment_id AND (email_segments.created_by = auth.uid() OR auth.role() = 'authenticated')));
DROP POLICY IF EXISTS "Users can manage email segment members" ON email_segment_members;
CREATE POLICY "Users can manage email segment members"
    ON email_segment_members FOR ALL
    USING (EXISTS (SELECT 1 FROM email_segments WHERE email_segments.id = email_segment_members.segment_id AND email_segments.created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM email_segments WHERE email_segments.id = email_segment_members.segment_id AND email_segments.created_by = auth.uid()));

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view webhooks" ON webhooks;
CREATE POLICY "Users can view webhooks"
    ON webhooks FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create webhooks" ON webhooks;
CREATE POLICY "Users can create webhooks"
    ON webhooks FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own webhooks" ON webhooks;
CREATE POLICY "Users can update their own webhooks"
    ON webhooks FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own webhooks" ON webhooks;
CREATE POLICY "Users can delete their own webhooks"
    ON webhooks FOR DELETE
    USING (auth.uid() = created_by);

-- Webhook events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view webhook events" ON webhook_events;
CREATE POLICY "Users can view webhook events"
    ON webhook_events FOR SELECT
    USING (auth.role() = 'authenticated');

-- Webhook deliveries
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view webhook deliveries" ON webhook_deliveries;
CREATE POLICY "Users can view webhook deliveries"
    ON webhook_deliveries FOR SELECT
    USING (EXISTS (SELECT 1 FROM webhooks WHERE webhooks.id = webhook_deliveries.webhook_id AND (webhooks.created_by = auth.uid() OR auth.role() = 'authenticated')));
DROP POLICY IF EXISTS "System can create webhook deliveries" ON webhook_deliveries;
CREATE POLICY "System can create webhook deliveries"
    ON webhook_deliveries FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "System can update webhook deliveries" ON webhook_deliveries;
CREATE POLICY "System can update webhook deliveries"
    ON webhook_deliveries FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
CREATE POLICY "Users can view invoices"
    ON invoices FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
CREATE POLICY "Users can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
CREATE POLICY "Users can update invoices"
    ON invoices FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;
CREATE POLICY "Users can delete invoices"
    ON invoices FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- Invoice items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view invoice items" ON invoice_items;
CREATE POLICY "Users can view invoice items"
    ON invoice_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage invoice items" ON invoice_items;
CREATE POLICY "Users can manage invoice items"
    ON invoice_items FOR ALL
    USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND auth.role() = 'authenticated'))
    WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND auth.role() = 'authenticated'));

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view payments" ON payments;
CREATE POLICY "Users can view payments"
    ON payments FOR SELECT
    USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can create payments" ON payments;
CREATE POLICY "Users can create payments"
    ON payments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update payments" ON payments;
CREATE POLICY "Users can update payments"
    ON payments FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view employees" ON employees;
CREATE POLICY "Users can view employees"
    ON employees FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
CREATE POLICY "Admins can manage employees"
    ON employees FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view events" ON events;
CREATE POLICY "Users can view events"
    ON events FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events"
    ON events FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events"
    ON events FOR DELETE
    USING (auth.uid() = created_by);

-- Event attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view event attendees" ON event_attendees;
CREATE POLICY "Users can view event attendees"
    ON event_attendees FOR SELECT
    USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_attendees.event_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage event attendees" ON event_attendees;
CREATE POLICY "Users can manage event attendees"
    ON event_attendees FOR ALL
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM events WHERE events.id = event_attendees.event_id AND events.created_by = auth.uid()))
    WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM events WHERE events.id = event_attendees.event_id AND events.created_by = auth.uid()));

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view documents" ON documents;
CREATE POLICY "Users can view documents"
    ON documents FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete their own documents"
    ON documents FOR DELETE
    USING (auth.uid() = uploaded_by);

-- Integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view integrations" ON integrations;
CREATE POLICY "Users can view integrations"
    ON integrations FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage integrations" ON integrations;
CREATE POLICY "Users can manage integrations"
    ON integrations FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Milestones
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view milestones" ON milestones;
CREATE POLICY "Users can view milestones"
    ON milestones FOR SELECT
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage milestones" ON milestones;
CREATE POLICY "Users can manage milestones"
    ON milestones FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Risks
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view risks" ON risks;
CREATE POLICY "Users can view risks"
    ON risks FOR SELECT
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = risks.project_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage risks" ON risks;
CREATE POLICY "Users can manage risks"
    ON risks FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Email campaigns
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email campaigns" ON email_campaigns;
CREATE POLICY "Users can view email campaigns"
    ON email_campaigns FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create email campaigns" ON email_campaigns;
CREATE POLICY "Users can create email campaigns"
    ON email_campaigns FOR INSERT
    WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own email campaigns" ON email_campaigns;
CREATE POLICY "Users can update their own email campaigns"
    ON email_campaigns FOR UPDATE
    USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can delete their own email campaigns" ON email_campaigns;
CREATE POLICY "Users can delete their own email campaigns"
    ON email_campaigns FOR DELETE
    USING (auth.uid() = created_by);

-- Email sends
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email sends" ON email_sends;
CREATE POLICY "Users can view email sends"
    ON email_sends FOR SELECT
    USING (EXISTS (SELECT 1 FROM email_campaigns WHERE email_campaigns.id = email_sends.campaign_id AND (email_campaigns.created_by = auth.uid() OR auth.role() = 'authenticated')));
DROP POLICY IF EXISTS "System can create email sends" ON email_sends;
CREATE POLICY "System can create email sends"
    ON email_sends FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Email clicks
ALTER TABLE email_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view email clicks" ON email_clicks;
CREATE POLICY "Users can view email clicks"
    ON email_clicks FOR SELECT
    USING (EXISTS (SELECT 1 FROM email_sends WHERE email_sends.id = email_clicks.send_id AND EXISTS (SELECT 1 FROM email_campaigns WHERE email_campaigns.id = email_sends.campaign_id AND (email_campaigns.created_by = auth.uid() OR auth.role() = 'authenticated'))));

-- Campaign metrics
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view campaign metrics" ON campaign_metrics;
CREATE POLICY "Users can view campaign metrics"
    ON campaign_metrics FOR SELECT
    USING (EXISTS (SELECT 1 FROM email_campaigns WHERE email_campaigns.id = campaign_metrics.campaign_id AND (email_campaigns.created_by = auth.uid() OR auth.role() = 'authenticated')));

-- Campaign ROI
ALTER TABLE campaign_roi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view campaign ROI" ON campaign_roi;
CREATE POLICY "Users can view campaign ROI"
    ON campaign_roi FOR SELECT
    USING (EXISTS (SELECT 1 FROM email_campaigns WHERE email_campaigns.id = campaign_roi.campaign_id AND (email_campaigns.created_by = auth.uid() OR auth.role() = 'authenticated')));

-- Sales goals
ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sales goals" ON sales_goals;
CREATE POLICY "Users can view sales goals"
    ON sales_goals FOR SELECT
    USING (user_id = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage their own sales goals" ON sales_goals;
CREATE POLICY "Users can manage their own sales goals"
    ON sales_goals FOR ALL
    USING (user_id = auth.uid() OR auth.uid() = created_by)
    WITH CHECK (user_id = auth.uid() OR auth.uid() = created_by);

-- Sales forecasts
ALTER TABLE sales_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sales forecasts" ON sales_forecasts;
CREATE POLICY "Users can view sales forecasts"
    ON sales_forecasts FOR SELECT
    USING (user_id = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage their own sales forecasts" ON sales_forecasts;
CREATE POLICY "Users can manage their own sales forecasts"
    ON sales_forecasts FOR ALL
    USING (user_id = auth.uid() OR auth.uid() = created_by)
    WITH CHECK (user_id = auth.uid() OR auth.uid() = created_by);

-- Company settings (RLS déjà défini dans le bloc DO $$ ci-dessous, mais on peut le déplacer)
-- On garde le bloc DO $$ pour la compatibilité

-- Automated actions
ALTER TABLE automated_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automated actions" ON automated_actions;
CREATE POLICY "Users can view automated actions"
    ON automated_actions FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage their own automated actions" ON automated_actions;
CREATE POLICY "Users can manage their own automated actions"
    ON automated_actions FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Action executions
ALTER TABLE action_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view action executions" ON action_executions;
CREATE POLICY "Users can view action executions"
    ON action_executions FOR SELECT
    USING (EXISTS (SELECT 1 FROM automated_actions WHERE automated_actions.id = action_executions.action_id AND (automated_actions.created_by = auth.uid() OR auth.role() = 'authenticated')));

-- Lead assignment rules
ALTER TABLE lead_assignment_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view lead assignment rules" ON lead_assignment_rules;
CREATE POLICY "Users can view lead assignment rules"
    ON lead_assignment_rules FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage lead assignment rules" ON lead_assignment_rules;
CREATE POLICY "Admins can manage lead assignment rules"
    ON lead_assignment_rules FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- Sales performance
ALTER TABLE sales_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sales performance" ON sales_performance;
CREATE POLICY "Users can view sales performance"
    ON sales_performance FOR SELECT
    USING (user_id = auth.uid() OR auth.role() = 'authenticated');

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view public settings" ON settings;
CREATE POLICY "Users can view public settings"
    ON settings FOR SELECT
    USING (is_public = TRUE OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings"
    ON settings FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- Trigger events
ALTER TABLE trigger_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage trigger events" ON trigger_events;
CREATE POLICY "System can manage trigger events"
    ON trigger_events FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Lifecycle transitions
ALTER TABLE lifecycle_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view lifecycle transitions" ON lifecycle_transitions;
CREATE POLICY "Users can view lifecycle transitions"
    ON lifecycle_transitions FOR SELECT
    USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lifecycle_transitions.lead_id AND auth.role() = 'authenticated'));

-- Lead enrichment jobs
ALTER TABLE lead_enrichment_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view lead enrichment jobs" ON lead_enrichment_jobs;
CREATE POLICY "Users can view lead enrichment jobs"
    ON lead_enrichment_jobs FOR SELECT
    USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_enrichment_jobs.lead_id AND auth.role() = 'authenticated'));

-- Automation workflows
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation workflows" ON automation_workflows;
CREATE POLICY "Users can view automation workflows"
    ON automation_workflows FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage their own automation workflows" ON automation_workflows;
CREATE POLICY "Users can manage their own automation workflows"
    ON automation_workflows FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Automation triggers
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation triggers" ON automation_triggers;
CREATE POLICY "Users can view automation triggers"
    ON automation_triggers FOR SELECT
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_triggers.workflow_id AND (automation_workflows.created_by = auth.uid() OR auth.role() = 'authenticated')));
DROP POLICY IF EXISTS "Users can manage automation triggers" ON automation_triggers;
CREATE POLICY "Users can manage automation triggers"
    ON automation_triggers FOR ALL
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_triggers.workflow_id AND automation_workflows.created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_triggers.workflow_id AND automation_workflows.created_by = auth.uid()));

-- Automation actions
ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation actions" ON automation_actions;
CREATE POLICY "Users can view automation actions"
    ON automation_actions FOR SELECT
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_actions.workflow_id AND (automation_workflows.created_by = auth.uid() OR auth.role() = 'authenticated')));
DROP POLICY IF EXISTS "Users can manage automation actions" ON automation_actions;
CREATE POLICY "Users can manage automation actions"
    ON automation_actions FOR ALL
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_actions.workflow_id AND automation_workflows.created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_actions.workflow_id AND automation_workflows.created_by = auth.uid()));

-- Automation executions
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation executions" ON automation_executions;
CREATE POLICY "Users can view automation executions"
    ON automation_executions FOR SELECT
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_executions.workflow_id AND (automation_workflows.created_by = auth.uid() OR auth.role() = 'authenticated')));

-- Automation execution logs
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation execution logs" ON automation_execution_logs;
CREATE POLICY "Users can view automation execution logs"
    ON automation_execution_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM automation_executions WHERE automation_executions.id = automation_execution_logs.execution_id AND EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_executions.workflow_id AND (automation_workflows.created_by = auth.uid() OR auth.role() = 'authenticated'))));

-- Automation rules
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation rules" ON automation_rules;
CREATE POLICY "Users can view automation rules"
    ON automation_rules FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage their own automation rules" ON automation_rules;
CREATE POLICY "Users can manage their own automation rules"
    ON automation_rules FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Automation rule executions
ALTER TABLE automation_rule_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation rule executions" ON automation_rule_executions;
CREATE POLICY "Users can view automation rule executions"
    ON automation_rule_executions FOR SELECT
    USING (EXISTS (SELECT 1 FROM automation_rules WHERE automation_rules.id = automation_rule_executions.rule_id AND (automation_rules.created_by = auth.uid() OR auth.role() = 'authenticated')));

-- Automation enrollments
ALTER TABLE automation_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation enrollments" ON automation_enrollments;
CREATE POLICY "Users can view automation enrollments"
    ON automation_enrollments FOR SELECT
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_enrollments.workflow_id AND (automation_workflows.created_by = auth.uid() OR auth.role() = 'authenticated')));
DROP POLICY IF EXISTS "Users can manage automation enrollments" ON automation_enrollments;
CREATE POLICY "Users can manage automation enrollments"
    ON automation_enrollments FOR ALL
    USING (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_enrollments.workflow_id AND automation_workflows.created_by = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM automation_workflows WHERE automation_workflows.id = automation_enrollments.workflow_id AND automation_workflows.created_by = auth.uid()));

-- RLS pour lead_quality_scores et company_settings (si elles existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_quality_scores') THEN
        ALTER TABLE lead_quality_scores ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view quality scores" ON lead_quality_scores;
        CREATE POLICY "Users can view quality scores"
            ON lead_quality_scores
            FOR SELECT
            USING (auth.role() = 'authenticated');
        DROP POLICY IF EXISTS "Users can create quality scores" ON lead_quality_scores;
        CREATE POLICY "Users can create quality scores"
            ON lead_quality_scores
            FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_settings') THEN
        -- Company settings RLS déjà défini ci-dessus, on ne fait rien ici pour éviter la duplication
        NULL;
    END IF;
END $$;

-- Company settings RLS (défini directement car la table existe maintenant)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON company_settings;
CREATE POLICY "Authenticated users can view company settings"
    ON company_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
CREATE POLICY "Admins can manage company settings"
    ON company_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );

-- Clients (multi-tenant)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view clients" ON clients;
CREATE POLICY "Users can view clients"
    ON clients FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_clients WHERE user_clients.client_id = clients.id AND user_clients.user_id = auth.uid()) OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;
CREATE POLICY "Admins can manage clients"
    ON clients FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- User clients
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own client associations" ON user_clients;
CREATE POLICY "Users can view their own client associations"
    ON user_clients FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));
DROP POLICY IF EXISTS "Admins can manage user clients" ON user_clients;
CREATE POLICY "Admins can manage user clients"
    ON user_clients FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- Non working days
ALTER TABLE non_working_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view non working days" ON non_working_days;
CREATE POLICY "Users can view non working days"
    ON non_working_days FOR SELECT
    USING (EXISTS (SELECT 1 FROM calendars WHERE calendars.id = non_working_days.calendar_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage non working days" ON non_working_days;
CREATE POLICY "Users can manage non working days"
    ON non_working_days FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Working hours
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view working hours" ON working_hours;
CREATE POLICY "Users can view working hours"
    ON working_hours FOR SELECT
    USING (EXISTS (SELECT 1 FROM calendars WHERE calendars.id = working_hours.calendar_id AND auth.role() = 'authenticated'));
DROP POLICY IF EXISTS "Users can manage working hours" ON working_hours;
CREATE POLICY "Users can manage working hours"
    ON working_hours FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Permissions
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view permissions" ON permissions;
CREATE POLICY "Users can view permissions"
    ON permissions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Role permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view role permissions" ON role_permissions;
CREATE POLICY "Users can view role permissions"
    ON role_permissions FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
CREATE POLICY "Admins can manage role permissions"
    ON role_permissions FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- Resource permissions
ALTER TABLE resource_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own resource permissions" ON resource_permissions;
CREATE POLICY "Users can view their own resource permissions"
    ON resource_permissions FOR SELECT
    USING (user_id = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage resource permissions" ON resource_permissions;
CREATE POLICY "Users can manage resource permissions"
    ON resource_permissions FOR ALL
    USING (granted_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')))
    WITH CHECK (granted_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SuperAdmin', 'Admin')));

-- Notification subscriptions
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notification subscriptions" ON notification_subscriptions;
CREATE POLICY "Users can view their own notification subscriptions"
    ON notification_subscriptions FOR SELECT
    USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can manage their own notification subscriptions" ON notification_subscriptions;
CREATE POLICY "Users can manage their own notification subscriptions"
    ON notification_subscriptions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Chat channels
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view chat channels" ON chat_channels;
CREATE POLICY "Users can view chat channels"
    ON chat_channels FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create chat channels" ON chat_channels;
CREATE POLICY "Users can create chat channels"
    ON chat_channels FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update chat channels" ON chat_channels;
CREATE POLICY "Users can update chat channels"
    ON chat_channels FOR UPDATE
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can delete chat channels" ON chat_channels;
CREATE POLICY "Users can delete chat channels"
    ON chat_channels FOR DELETE
    USING (auth.role() = 'authenticated');

-- Automated tasks
ALTER TABLE automated_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automated tasks" ON automated_tasks;
CREATE POLICY "Users can view automated tasks"
    ON automated_tasks FOR SELECT
    USING (created_by = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can manage their own automated tasks" ON automated_tasks;
CREATE POLICY "Users can manage their own automated tasks"
    ON automated_tasks FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Meeting notes
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view meeting notes for their appointments" ON meeting_notes;
CREATE POLICY "Users can view meeting notes for their appointments"
    ON meeting_notes FOR SELECT
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM appointments 
            WHERE appointments.id = meeting_notes.appointment_id 
            AND (appointments.user_id = auth.uid() OR appointments.created_by = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );
DROP POLICY IF EXISTS "Users can create meeting notes" ON meeting_notes;
CREATE POLICY "Users can create meeting notes"
    ON meeting_notes FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM appointments 
            WHERE appointments.id = meeting_notes.appointment_id 
            AND (appointments.user_id = auth.uid() OR appointments.created_by = auth.uid())
        )
    );
DROP POLICY IF EXISTS "Users can update their own meeting notes" ON meeting_notes;
CREATE POLICY "Users can update their own meeting notes"
    ON meeting_notes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own meeting notes" ON meeting_notes;
CREATE POLICY "Users can delete their own meeting notes"
    ON meeting_notes FOR DELETE
    USING (user_id = auth.uid());

-- Meeting action items
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view action items for their meeting notes" ON meeting_action_items;
CREATE POLICY "Users can view action items for their meeting notes"
    ON meeting_action_items FOR SELECT
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM meeting_notes 
            WHERE meeting_notes.id = meeting_action_items.meeting_note_id 
            AND meeting_notes.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SuperAdmin', 'Admin')
        )
    );
DROP POLICY IF EXISTS "Users can create action items" ON meeting_action_items;
CREATE POLICY "Users can create action items"
    ON meeting_action_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM meeting_notes 
            WHERE meeting_notes.id = meeting_action_items.meeting_note_id 
            AND meeting_notes.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can update action items" ON meeting_action_items;
CREATE POLICY "Users can update action items"
    ON meeting_action_items FOR UPDATE
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM meeting_notes 
            WHERE meeting_notes.id = meeting_action_items.meeting_note_id 
            AND meeting_notes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM meeting_notes 
            WHERE meeting_notes.id = meeting_action_items.meeting_note_id 
            AND meeting_notes.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can delete action items" ON meeting_action_items;
CREATE POLICY "Users can delete action items"
    ON meeting_action_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM meeting_notes 
            WHERE meeting_notes.id = meeting_action_items.meeting_note_id 
            AND meeting_notes.user_id = auth.uid()
        )
    );

-- Workflow errors
ALTER TABLE workflow_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view workflow errors" ON workflow_errors;
CREATE POLICY "Users can view workflow errors"
    ON workflow_errors FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update workflow errors" ON workflow_errors;
CREATE POLICY "Users can update workflow errors"
    ON workflow_errors FOR UPDATE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- SOCIAL_ACCOUNTS TABLE (Comptes réseaux sociaux connectés)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'tiktok')),
    account_name TEXT NOT NULL,
    account_id TEXT NOT NULL, -- ID du compte sur la plateforme
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb, -- Informations supplémentaires (followers, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, account_id)
);

-- Indexes for social_accounts
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_is_active ON social_accounts(is_active) WHERE is_active = TRUE;

-- =====================================================
-- SOCIAL_POSTS TABLE (Posts réseaux sociaux)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'tiktok')),
    content TEXT NOT NULL,
    media_urls TEXT[], -- URLs des médias (images, vidéos)
    scheduled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'cancelled')),
    published_at TIMESTAMPTZ,
    external_post_id TEXT, -- ID du post sur la plateforme externe
    hashtags TEXT[],
    mentions TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb, -- Données supplémentaires (engagement, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
-- Index pour scheduled_at (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'scheduled_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at) WHERE scheduled_at IS NOT NULL';
    END IF;
END $$;
-- Index pour social_account_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'social_account_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_social_posts_social_account_id ON social_posts(social_account_id)';
    END IF;
END $$;

-- =====================================================
-- SOCIAL_POST_PUBLICATIONS TABLE (Historique des publications)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_post_publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    publication_status TEXT NOT NULL CHECK (publication_status IN ('pending', 'success', 'failed')),
    published_at TIMESTAMPTZ,
    external_post_id TEXT,
    error_message TEXT,
    response_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_post_publications
CREATE INDEX IF NOT EXISTS idx_social_post_publications_post_id ON social_post_publications(social_post_id);
-- Index pour social_account_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_post_publications' AND column_name = 'social_account_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_social_post_publications_account_id ON social_post_publications(social_account_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_social_post_publications_status ON social_post_publications(publication_status);

-- =====================================================
-- SOCIAL_BULK_IMPORTS TABLE (Imports CSV bulk)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_bulk_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for social_bulk_imports
CREATE INDEX IF NOT EXISTS idx_social_bulk_imports_user_id ON social_bulk_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_social_bulk_imports_status ON social_bulk_imports(status);

-- =====================================================
-- SOCIAL_OPTIMAL_TIMES TABLE (Recommandations créneaux optimaux IA)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_optimal_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'tiktok')),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Dimanche
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    engagement_score DECIMAL(5, 2), -- Score d'engagement prédit (0-100)
    confidence_level DECIMAL(5, 2), -- Niveau de confiance de la prédiction
    based_on_posts_count INTEGER DEFAULT 0, -- Nombre de posts analysés pour cette prédiction
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, day_of_week, hour)
);

-- Indexes for social_optimal_times
CREATE INDEX IF NOT EXISTS idx_social_optimal_times_user_id ON social_optimal_times(user_id);
CREATE INDEX IF NOT EXISTS idx_social_optimal_times_platform ON social_optimal_times(platform);
CREATE INDEX IF NOT EXISTS idx_social_optimal_times_engagement_score ON social_optimal_times(engagement_score DESC);

-- =====================================================
-- SOCIAL_MESSAGES TABLE (Messages et commentaires réseaux sociaux)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'tiktok')),
    message_type TEXT NOT NULL CHECK (message_type IN ('comment', 'direct_message', 'mention', 'review', 'story_reply')),
    external_message_id TEXT NOT NULL, -- ID du message sur la plateforme
    external_post_id TEXT, -- ID du post associé (pour les commentaires)
    external_conversation_id TEXT, -- ID de la conversation (pour les DMs)
    sender_name TEXT NOT NULL,
    sender_username TEXT,
    sender_id TEXT, -- ID de l'expéditeur sur la plateforme
    sender_avatar_url TEXT,
    content TEXT NOT NULL,
    media_urls TEXT[], -- URLs des médias attachés
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    sentiment TEXT, -- 'positive', 'negative', 'neutral' (analysé par IA)
    metadata JSONB DEFAULT '{}'::jsonb, -- Données supplémentaires
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(social_account_id, platform, external_message_id)
);

-- Indexes for social_messages
-- Index pour social_account_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_messages' AND column_name = 'social_account_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_social_messages_account_id ON social_messages(social_account_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_social_messages_platform ON social_messages(platform);
CREATE INDEX IF NOT EXISTS idx_social_messages_type ON social_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_social_messages_is_read ON social_messages(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_messages_assigned_to ON social_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_social_messages_received_at ON social_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_messages_priority ON social_messages(priority);

-- =====================================================
-- SOCIAL_MESSAGE_RESPONSES TABLE (Réponses aux messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_message_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_message_id UUID NOT NULL REFERENCES social_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    external_response_id TEXT, -- ID de la réponse sur la plateforme
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'scheduled')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_message_responses
CREATE INDEX IF NOT EXISTS idx_social_message_responses_message_id ON social_message_responses(social_message_id);
CREATE INDEX IF NOT EXISTS idx_social_message_responses_user_id ON social_message_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_social_message_responses_status ON social_message_responses(status);

-- =====================================================
-- SOCIAL_SAVED_RESPONSES TABLE (Réponses enregistrées/templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_saved_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT, -- 'greeting', 'support', 'sales', 'complaint', 'custom'
    platform TEXT, -- NULL pour toutes les plateformes
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_saved_responses
CREATE INDEX IF NOT EXISTS idx_social_saved_responses_user_id ON social_saved_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_social_saved_responses_category ON social_saved_responses(category);
CREATE INDEX IF NOT EXISTS idx_social_saved_responses_platform ON social_saved_responses(platform);
CREATE INDEX IF NOT EXISTS idx_social_saved_responses_is_active ON social_saved_responses(is_active) WHERE is_active = TRUE;

-- =====================================================
-- SOCIAL_MESSAGE_NOTES TABLE (Notes internes sur les messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_message_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_message_id UUID NOT NULL REFERENCES social_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE, -- Note visible uniquement par l'équipe
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_message_notes
CREATE INDEX IF NOT EXISTS idx_social_message_notes_message_id ON social_message_notes(social_message_id);
CREATE INDEX IF NOT EXISTS idx_social_message_notes_user_id ON social_message_notes(user_id);

-- =====================================================
-- SOCIAL_LISTENING_QUERIES TABLE (Requêtes de monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_listening_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    query_type TEXT NOT NULL CHECK (query_type IN ('keyword', 'boolean', 'hashtag', 'mention', 'url')),
    query_string TEXT NOT NULL, -- Requête booléenne ou mots-clés
    platforms TEXT[] DEFAULT '{}', -- Plateformes à monitorer
    languages TEXT[] DEFAULT '{}', -- Langues à filtrer
    countries TEXT[] DEFAULT '{}', -- Pays à filtrer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_listening_queries
CREATE INDEX IF NOT EXISTS idx_social_listening_queries_user_id ON social_listening_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_social_listening_queries_is_active ON social_listening_queries(is_active) WHERE is_active = TRUE;

-- =====================================================
-- SOCIAL_MENTIONS TABLE (Mentions collectées)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listening_query_id UUID REFERENCES social_listening_queries(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'tiktok', 'web', 'news', 'blog', 'forum', 'reddit')),
    external_id TEXT NOT NULL, -- ID sur la plateforme
    author_name TEXT NOT NULL,
    author_username TEXT,
    author_id TEXT,
    author_avatar_url TEXT,
    author_followers_count INTEGER DEFAULT 0,
    author_influence_score DECIMAL(5, 2) DEFAULT 0, -- Score d'influence calculé
    content TEXT NOT NULL,
    url TEXT NOT NULL,
    media_urls TEXT[],
    engagement_metrics JSONB DEFAULT '{}'::jsonb, -- likes, shares, comments, etc.
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    sentiment_score DECIMAL(5, 2), -- Score de sentiment (-1 à 1)
    language TEXT,
    country TEXT,
    location JSONB, -- Coordonnées géographiques si disponibles
    is_crisis BOOLEAN DEFAULT FALSE, -- Détection de crise
    crisis_severity TEXT CHECK (crisis_severity IN ('low', 'medium', 'high', 'critical')),
    is_influencer BOOLEAN DEFAULT FALSE, -- Auteur identifié comme influenceur
    topic_tags TEXT[], -- Tags de sujets identifiés
    mentioned_brands TEXT[], -- Marques mentionnées
    mentioned_competitors TEXT[], -- Concurrents mentionnés
    metadata JSONB DEFAULT '{}'::jsonb,
    published_at TIMESTAMPTZ NOT NULL,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, external_id)
);

-- Indexes for social_mentions
CREATE INDEX IF NOT EXISTS idx_social_mentions_query_id ON social_mentions(listening_query_id);
CREATE INDEX IF NOT EXISTS idx_social_mentions_platform ON social_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_social_mentions_sentiment ON social_mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_social_mentions_is_crisis ON social_mentions(is_crisis) WHERE is_crisis = TRUE;
CREATE INDEX IF NOT EXISTS idx_social_mentions_is_influencer ON social_mentions(is_influencer) WHERE is_influencer = TRUE;
CREATE INDEX IF NOT EXISTS idx_social_mentions_published_at ON social_mentions(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_mentions_discovered_at ON social_mentions(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_mentions_author_influence_score ON social_mentions(author_influence_score DESC);

-- =====================================================
-- SOCIAL_LISTENING_ALERTS TABLE (Alertes de monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_listening_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listening_query_id UUID REFERENCES social_listening_queries(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('crisis', 'volume_spike', 'sentiment_shift', 'influencer_mention', 'competitor_mention', 'keyword_match', 'custom')),
    alert_name TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- Conditions de déclenchement
    is_active BOOLEAN DEFAULT TRUE,
    notification_channels TEXT[] DEFAULT '{}', -- 'email', 'in_app', 'webhook', 'sms'
    webhook_url TEXT,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_listening_alerts
CREATE INDEX IF NOT EXISTS idx_social_listening_alerts_user_id ON social_listening_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_listening_alerts_query_id ON social_listening_alerts(listening_query_id);
CREATE INDEX IF NOT EXISTS idx_social_listening_alerts_is_active ON social_listening_alerts(is_active) WHERE is_active = TRUE;

-- =====================================================
-- SOCIAL_LISTENING_ALERT_TRIGGERS TABLE (Historique des alertes déclenchées)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_listening_alert_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES social_listening_alerts(id) ON DELETE CASCADE,
    mention_id UUID REFERENCES social_mentions(id) ON DELETE SET NULL,
    trigger_reason TEXT NOT NULL,
    trigger_data JSONB DEFAULT '{}'::jsonb,
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_listening_alert_triggers
CREATE INDEX IF NOT EXISTS idx_social_listening_alert_triggers_alert_id ON social_listening_alert_triggers(alert_id);
CREATE INDEX IF NOT EXISTS idx_social_listening_alert_triggers_mention_id ON social_listening_alert_triggers(mention_id);
CREATE INDEX IF NOT EXISTS idx_social_listening_alert_triggers_created_at ON social_listening_alert_triggers(created_at DESC);

-- =====================================================
-- SOCIAL_INFLUENCERS TABLE (Base de données influenceurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'tiktok', 'youtube')),
    external_id TEXT NOT NULL,
    username TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    bio TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2), -- Taux d'engagement moyen
    influence_score DECIMAL(5, 2) DEFAULT 0, -- Score d'influence calculé
    category TEXT, -- Niche/catégorie
    location TEXT,
    verified BOOLEAN DEFAULT FALSE,
    contact_email TEXT,
    contact_phone TEXT,
    tags TEXT[],
    notes TEXT,
    is_tracked BOOLEAN DEFAULT TRUE,
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, external_id)
);

-- Indexes for social_influencers
CREATE INDEX IF NOT EXISTS idx_social_influencers_user_id ON social_influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_social_influencers_platform ON social_influencers(platform);
CREATE INDEX IF NOT EXISTS idx_social_influencers_influence_score ON social_influencers(influence_score DESC);
CREATE INDEX IF NOT EXISTS idx_social_influencers_is_tracked ON social_influencers(is_tracked) WHERE is_tracked = TRUE;

-- =====================================================
-- SOCIAL_VOICE_SHARE TABLE (Part de voix vs concurrents)
-- =====================================================
CREATE TABLE IF NOT EXISTS social_voice_share (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    competitor_names TEXT[] DEFAULT '{}',
    platform TEXT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    brand_mentions INTEGER DEFAULT 0,
    competitor_mentions JSONB DEFAULT '{}'::jsonb, -- {competitor_name: mention_count}
    total_mentions INTEGER DEFAULT 0,
    voice_share_percentage DECIMAL(5, 2), -- Part de voix de la marque
    engagement_share_percentage DECIMAL(5, 2), -- Part d'engagement
    sentiment_comparison JSONB DEFAULT '{}'::jsonb, -- Comparaison des sentiments
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social_voice_share
CREATE INDEX IF NOT EXISTS idx_social_voice_share_user_id ON social_voice_share(user_id);
CREATE INDEX IF NOT EXISTS idx_social_voice_share_platform ON social_voice_share(platform);
CREATE INDEX IF NOT EXISTS idx_social_voice_share_period ON social_voice_share(period_start, period_end);

-- =====================================================
-- ANALYTICS_PREDICTIONS TABLE (Prévisions et analyses prédictives)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_type TEXT NOT NULL CHECK (prediction_type IN ('engagement', 'growth', 'conversion', 'revenue', 'sentiment', 'crisis', 'influencer_impact')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('social_post', 'campaign', 'lead', 'project', 'overall')),
    entity_id UUID, -- ID de l'entité concernée
    metric_name TEXT NOT NULL, -- Nom de la métrique prédite
    current_value DECIMAL(12, 2),
    predicted_value DECIMAL(12, 2) NOT NULL,
    confidence_level DECIMAL(5, 2), -- Niveau de confiance (0-100)
    prediction_date TIMESTAMPTZ NOT NULL, -- Date de la prédiction
    target_date TIMESTAMPTZ NOT NULL, -- Date cible de la prédiction
    factors JSONB DEFAULT '{}'::jsonb, -- Facteurs influençant la prédiction
    model_version TEXT, -- Version du modèle IA utilisé
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_predictions
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_user_id ON analytics_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_type ON analytics_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_target_date ON analytics_predictions(target_date);
-- Index pour entity_type, entity_id (créé seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_predictions' AND column_name = 'entity_type') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_predictions' AND column_name = 'entity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_analytics_predictions_entity ON analytics_predictions(entity_type, entity_id)';
    END IF;
END $$;

-- =====================================================
-- ANALYTICS_INSIGHTS TABLE (Insights et suggestions IA)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('opportunity', 'risk', 'trend', 'recommendation', 'anomaly', 'optimization')),
    category TEXT NOT NULL, -- 'social_media', 'crm', 'marketing', 'project', 'general'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    impact_score DECIMAL(5, 2), -- Score d'impact potentiel (0-100)
    action_items JSONB DEFAULT '[]'::jsonb, -- Actions recommandées
    related_entities JSONB DEFAULT '{}'::jsonb, -- Entités liées
    is_read BOOLEAN DEFAULT FALSE,
    is_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Date d'expiration de l'insight
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_insights
CREATE INDEX IF NOT EXISTS idx_analytics_insights_user_id ON analytics_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_type ON analytics_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_category ON analytics_insights(category);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_is_read ON analytics_insights(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_analytics_insights_priority ON analytics_insights(priority);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_generated_at ON analytics_insights(generated_at DESC);

-- =====================================================
-- ANALYTICS_REPORTS TABLE (Rapports automatisés)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom', 'on_demand')),
    report_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Configuration du rapport (métriques, graphiques, etc.)
    template_id UUID, -- ID du template utilisé
    schedule_config JSONB DEFAULT '{}'::jsonb, -- Configuration de la planification
    recipients JSONB DEFAULT '[]'::jsonb, -- Liste des destinataires (emails)
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMPTZ,
    next_generation_at TIMESTAMPTZ,
    generation_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_reports
CREATE INDEX IF NOT EXISTS idx_analytics_reports_user_id ON analytics_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_is_active ON analytics_reports(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_analytics_reports_next_generation ON analytics_reports(next_generation_at) WHERE next_generation_at IS NOT NULL;

-- =====================================================
-- ANALYTICS_REPORT_GENERATIONS TABLE (Historique des générations)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_report_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES analytics_reports(id) ON DELETE CASCADE,
    generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT, -- URL du fichier PDF/Excel généré
    file_format TEXT CHECK (file_format IN ('pdf', 'excel', 'csv', 'pptx')),
    file_size_bytes INTEGER,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metrics_summary JSONB DEFAULT '{}'::jsonb, -- Résumé des métriques
    error_message TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for analytics_report_generations
CREATE INDEX IF NOT EXISTS idx_analytics_report_generations_report_id ON analytics_report_generations(report_id);
CREATE INDEX IF NOT EXISTS idx_analytics_report_generations_status ON analytics_report_generations(generation_status);
CREATE INDEX IF NOT EXISTS idx_analytics_report_generations_generated_at ON analytics_report_generations(generated_at DESC);

-- =====================================================
-- ANALYTICS_METRICS_HISTORY TABLE (Historique des métriques pour analyses)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_category TEXT NOT NULL, -- 'social_media', 'crm', 'marketing', 'project', 'overall'
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(12, 2) NOT NULL,
    metric_unit TEXT, -- 'count', 'percentage', 'currency', 'duration', etc.
    dimensions JSONB DEFAULT '{}'::jsonb, -- Dimensions additionnelles (platform, campaign_id, etc.)
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_metrics_history
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_history_user_id ON analytics_metrics_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_history_category ON analytics_metrics_history(metric_category);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_history_name ON analytics_metrics_history(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_history_recorded_at ON analytics_metrics_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_history_category_name_date ON analytics_metrics_history(metric_category, metric_name, recorded_at DESC);

-- =====================================================
-- CALENDAR_INTEGRATIONS TABLE (Intégrations calendriers externes)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple', 'ical')),
    account_email TEXT NOT NULL,
    account_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id TEXT NOT NULL, -- ID du calendrier sur le provider
    calendar_name TEXT NOT NULL,
    sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'to_external', 'from_external')),
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'partial')),
    last_sync_error TEXT,
    conflict_resolution TEXT DEFAULT 'agencyos_wins' CHECK (conflict_resolution IN ('agencyos_wins', 'external_wins', 'manual', 'newest_wins')),
    sync_frequency_minutes INTEGER DEFAULT 15, -- Fréquence de synchronisation
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, calendar_id)
);

-- Indexes for calendar_integrations
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_sync_enabled ON calendar_integrations(sync_enabled) WHERE sync_enabled = TRUE;
-- Index pour provider (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_integrations' AND column_name = 'provider') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON calendar_integrations(provider)';
    END IF;
END $$;

-- =====================================================
-- CALENDAR_SYNC_MAPPINGS TABLE (Mapping entre événements locaux et externes)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_sync_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    local_entity_type TEXT NOT NULL CHECK (local_entity_type IN ('appointment', 'task', 'project_event')),
    local_entity_id UUID NOT NULL, -- ID de l'entité locale (appointment, task, etc.)
    external_event_id TEXT NOT NULL, -- ID de l'événement sur le calendrier externe
    external_calendar_id TEXT NOT NULL,
    sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_external', 'from_external', 'bidirectional')),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
    conflict_details JSONB DEFAULT '{}'::jsonb, -- Détails en cas de conflit
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(calendar_integration_id, local_entity_type, local_entity_id),
    UNIQUE(calendar_integration_id, external_event_id)
);

-- Indexes for calendar_sync_mappings
CREATE INDEX IF NOT EXISTS idx_calendar_sync_mappings_integration_id ON calendar_sync_mappings(calendar_integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_mappings_external_event ON calendar_sync_mappings(external_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_mappings_sync_status ON calendar_sync_mappings(sync_status);
-- Index pour local_entity_type, local_entity_id (créé seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_sync_mappings' AND column_name = 'local_entity_type') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_sync_mappings' AND column_name = 'local_entity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_calendar_sync_mappings_local_entity ON calendar_sync_mappings(local_entity_type, local_entity_id)';
    END IF;
END $$;

-- =====================================================
-- CALENDAR_SYNC_CONFLICTS TABLE (Conflits de synchronisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    sync_mapping_id UUID REFERENCES calendar_sync_mappings(id) ON DELETE CASCADE,
    local_entity_type TEXT NOT NULL,
    local_entity_id UUID NOT NULL,
    external_event_id TEXT NOT NULL,
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('time_change', 'deletion', 'creation', 'update')),
    local_data JSONB DEFAULT '{}'::jsonb, -- Données locales
    external_data JSONB DEFAULT '{}'::jsonb, -- Données externes
    resolution TEXT CHECK (resolution IN ('local_wins', 'external_wins', 'merged', 'manual')),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for calendar_sync_conflicts
CREATE INDEX IF NOT EXISTS idx_calendar_sync_conflicts_integration_id ON calendar_sync_conflicts(calendar_integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_conflicts_mapping_id ON calendar_sync_conflicts(sync_mapping_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_conflicts_resolution ON calendar_sync_conflicts(resolution) WHERE resolution IS NULL;

-- =====================================================
-- CALENDAR_WEBHOOKS TABLE (Webhooks pour notifications de changements)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    webhook_id TEXT NOT NULL, -- ID du webhook sur le provider
    webhook_url TEXT NOT NULL, -- URL de notre endpoint
    resource_id TEXT, -- ID de la ressource surveillée (Google Calendar)
    expiration_time TIMESTAMPTZ, -- Date d'expiration du webhook
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(calendar_integration_id, webhook_id)
);

-- Indexes for calendar_webhooks
CREATE INDEX IF NOT EXISTS idx_calendar_webhooks_integration_id ON calendar_webhooks(calendar_integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_webhooks_is_active ON calendar_webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_calendar_webhooks_expiration ON calendar_webhooks(expiration_time) WHERE expiration_time IS NOT NULL;

-- =====================================================
-- API_TOKENS TABLE (Tokens d'authentification API)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Nom descriptif du token
    token_hash TEXT NOT NULL UNIQUE, -- Hash du token (SHA-256)
    token_prefix TEXT NOT NULL, -- Préfixe pour affichage (ex: "agsk_...")
    scopes TEXT[] DEFAULT '{}'::text[], -- Permissions du token (ex: ['leads:read', 'tasks:write'])
    rate_limit_per_minute INTEGER DEFAULT 60, -- Limite de requêtes par minute
    rate_limit_per_hour INTEGER DEFAULT 1000, -- Limite de requêtes par heure
    rate_limit_per_day INTEGER DEFAULT 10000, -- Limite de requêtes par jour
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Date d'expiration optionnelle
    is_active BOOLEAN DEFAULT TRUE,
    ip_whitelist TEXT[] DEFAULT '{}'::text[], -- Liste blanche d'IPs (optionnel)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_is_active ON api_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires_at ON api_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- API_RATE_LIMITS TABLE (Suivi des limites de taux)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(api_token_id, window_type, window_start)
);

-- Indexes for api_rate_limits
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_token_id ON api_rate_limits(api_token_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_type, window_start);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_token_window ON api_rate_limits(api_token_id, window_type, window_start);

-- =====================================================
-- API_LOGS TABLE (Logs des requêtes API)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_token_id UUID REFERENCES api_tokens(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    method TEXT NOT NULL, -- GET, POST, PUT, DELETE, etc.
    endpoint TEXT NOT NULL, -- /api/leads
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER, -- Temps de réponse en millisecondes
    ip_address INET,
    user_agent TEXT,
    request_body JSONB DEFAULT '{}'::jsonb,
    response_body JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_logs
CREATE INDEX IF NOT EXISTS idx_api_logs_token_id ON api_logs(api_token_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_token_created ON api_logs(api_token_id, created_at DESC);

-- =====================================================
-- ACCOUNTING_INTEGRATIONS TABLE (Intégrations comptables)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('sage', 'quickbooks', 'xero')),
    account_name TEXT NOT NULL, -- Nom du compte comptable
    company_id TEXT, -- ID de l'entreprise dans le système comptable
    company_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'to_accounting', 'from_accounting')),
    sync_enabled BOOLEAN DEFAULT TRUE,
    auto_sync BOOLEAN DEFAULT FALSE, -- Synchronisation automatique
    sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('manual', 'hourly', 'daily', 'weekly')),
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'partial')),
    last_sync_error TEXT,
    sync_invoices BOOLEAN DEFAULT TRUE,
    sync_customers BOOLEAN DEFAULT FALSE,
    sync_items BOOLEAN DEFAULT FALSE,
    sync_payments BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb, -- Configuration spécifique au provider
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, company_id)
);

-- Indexes for accounting_integrations
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_user_id ON accounting_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_sync_enabled ON accounting_integrations(sync_enabled) WHERE sync_enabled = TRUE;
-- Index pour provider (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_integrations' AND column_name = 'provider') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_accounting_integrations_provider ON accounting_integrations(provider)';
    END IF;
END $$;

-- =====================================================
-- ACCOUNTING_SYNC_MAPPINGS TABLE (Mapping entre factures locales et externes)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_sync_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accounting_integration_id UUID NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
    local_entity_type TEXT NOT NULL CHECK (local_entity_type IN ('invoice', 'customer', 'item', 'payment')),
    local_entity_id UUID NOT NULL, -- ID de l'entité locale (invoice, lead, etc.)
    external_entity_id TEXT NOT NULL, -- ID de l'entité dans le système comptable
    sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_accounting', 'from_accounting', 'bidirectional')),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
    conflict_details JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(accounting_integration_id, local_entity_type, local_entity_id),
    UNIQUE(accounting_integration_id, external_entity_id)
);

-- Indexes for accounting_sync_mappings
CREATE INDEX IF NOT EXISTS idx_accounting_sync_mappings_integration_id ON accounting_sync_mappings(accounting_integration_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_mappings_external_entity ON accounting_sync_mappings(external_entity_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_mappings_sync_status ON accounting_sync_mappings(sync_status);
-- Index pour local_entity_type, local_entity_id (créé seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_sync_mappings' AND column_name = 'local_entity_type') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_sync_mappings' AND column_name = 'local_entity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_accounting_sync_mappings_local_entity ON accounting_sync_mappings(local_entity_type, local_entity_id)';
    END IF;
END $$;

-- =====================================================
-- ACCOUNTING_SYNC_LOGS TABLE (Logs de synchronisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accounting_integration_id UUID NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'customer', 'item', 'payment', 'all')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    synced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for accounting_sync_logs
CREATE INDEX IF NOT EXISTS idx_accounting_sync_logs_integration_id ON accounting_sync_logs(accounting_integration_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_logs_status ON accounting_sync_logs(status);
-- Index pour started_at (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_sync_logs' AND column_name = 'started_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_accounting_sync_logs_started_at ON accounting_sync_logs(started_at DESC)';
    END IF;
END $$;

-- =====================================================
-- DOCUMENT_VERSIONS TABLE (Versions des documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL, -- Contenu du document (structure JSON pour WYSIWYG)
    html_content TEXT, -- Contenu HTML pour export/preview
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    change_summary TEXT, -- Résumé des changements
    is_current BOOLEAN DEFAULT FALSE, -- Version actuelle
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(document_id, version_number)
);

-- Indexes for document_versions
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_is_current ON document_versions(document_id, is_current) WHERE is_current = TRUE;

-- =====================================================
-- DOCUMENT_COMMENTS TABLE (Commentaires sur documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
    parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE, -- Pour les réponses
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    selection_start INTEGER, -- Position de début de sélection dans le document
    selection_end INTEGER, -- Position de fin de sélection
    selection_text TEXT, -- Texte sélectionné
    resolved BOOLEAN DEFAULT FALSE, -- Commentaire résolu
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for document_comments
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_version_id ON document_comments(version_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON document_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_resolved ON document_comments(resolved) WHERE resolved = FALSE;

-- =====================================================
-- DOCUMENT_COLLABORATORS TABLE (Collaborateurs actifs)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cursor_position INTEGER, -- Position du curseur dans le document
    selection_start INTEGER,
    selection_end INTEGER,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(document_id, user_id)
);

-- Indexes for document_collaborators
CREATE INDEX IF NOT EXISTS idx_document_collaborators_document_id ON document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_user_id ON document_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_last_active ON document_collaborators(document_id, last_active_at DESC);

-- =====================================================
-- DOCUMENT_TEMPLATES TABLE (Templates de documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- brief, contract, proposal, report, etc.
    content JSONB NOT NULL, -- Structure du template
    html_content TEXT, -- HTML du template
    thumbnail_url TEXT, -- URL de la miniature
    is_public BOOLEAN DEFAULT FALSE, -- Template public ou privé
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0, -- Nombre d'utilisations
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for document_templates
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_public ON document_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_usage_count ON document_templates(usage_count DESC);

-- =====================================================
-- INTERNAL_FORMS TABLE (Formulaires internes)
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('client_request', 'brief', 'approval', 'custom')),
    form_config JSONB NOT NULL, -- Configuration du formulaire (champs, validation, etc.)
    workflow_config JSONB DEFAULT '{}'::jsonb, -- Configuration du workflow d'approbation
    automation_config JSONB DEFAULT '{}'::jsonb, -- Configuration de l'automatisation (création tâches, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE, -- Formulaire accessible publiquement ou interne uniquement
    access_roles TEXT[] DEFAULT '{}'::text[], -- Rôles autorisés à utiliser ce formulaire
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for internal_forms
CREATE INDEX IF NOT EXISTS idx_internal_forms_category ON internal_forms(category);
CREATE INDEX IF NOT EXISTS idx_internal_forms_is_active ON internal_forms(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_internal_forms_created_by ON internal_forms(created_by);

-- =====================================================
-- INTERNAL_FORM_SUBMISSIONS TABLE (Soumissions de formulaires internes)
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES internal_forms(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Si soumis par un client/lead
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Si lié à un projet
    submission_data JSONB NOT NULL, -- Données soumises
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'completed', 'cancelled')),
    current_step INTEGER DEFAULT 0, -- Étape actuelle dans le workflow
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Personne assignée pour traitement
    notes TEXT, -- Notes internes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for internal_form_submissions
-- Index pour form_id (créé seulement si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'internal_form_submissions' AND column_name = 'form_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_internal_form_submissions_form_id ON internal_form_submissions(form_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_internal_form_submissions_submitted_by ON internal_form_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_internal_form_submissions_status ON internal_form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_internal_form_submissions_assigned_to ON internal_form_submissions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_internal_form_submissions_created_at ON internal_form_submissions(created_at DESC);

-- =====================================================
-- INTERNAL_FORM_APPROVALS TABLE (Approbations dans le workflow)
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_form_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES internal_form_submissions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL, -- Numéro de l'étape dans le workflow
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
    comments TEXT, -- Commentaires de l'approbateur
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, step_number, approver_id)
);

-- Indexes for internal_form_approvals
CREATE INDEX IF NOT EXISTS idx_internal_form_approvals_submission_id ON internal_form_approvals(submission_id);
CREATE INDEX IF NOT EXISTS idx_internal_form_approvals_approver_id ON internal_form_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_internal_form_approvals_status ON internal_form_approvals(status);

-- =====================================================
-- INTERNAL_FORM_AUTOMATIONS TABLE (Tâches créées automatiquement)
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_form_automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES internal_form_submissions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Tâche créée
    automation_type TEXT NOT NULL CHECK (automation_type IN ('create_task', 'create_project', 'send_notification', 'update_lead', 'custom')),
    automation_config JSONB DEFAULT '{}'::jsonb, -- Configuration de l'automatisation
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for internal_form_automations
CREATE INDEX IF NOT EXISTS idx_internal_form_automations_submission_id ON internal_form_automations(submission_id);
CREATE INDEX IF NOT EXISTS idx_internal_form_automations_task_id ON internal_form_automations(task_id);
CREATE INDEX IF NOT EXISTS idx_internal_form_automations_status ON internal_form_automations(status);

-- =====================================================
-- SEARCH_INDEX TABLE (Index de recherche full-text)
-- =====================================================
CREATE TABLE IF NOT EXISTS search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'task', 'lead', 'project', 'document', etc.
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT, -- Contenu indexé pour recherche full-text
    metadata JSONB DEFAULT '{}'::jsonb, -- Métadonnées supplémentaires
    search_vector tsvector, -- Vector pour recherche PostgreSQL full-text
    ocr_text TEXT, -- Texte extrait via OCR pour documents
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- Ajouter semantic_vector seulement si l'extension vector est disponible
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'search_index' 
            AND column_name = 'semantic_vector'
        ) THEN
            ALTER TABLE search_index ADD COLUMN semantic_vector vector(1536);
        END IF;
    END IF;
END $$;

-- Indexes for search_index
CREATE INDEX IF NOT EXISTS idx_search_index_search_vector ON search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_title ON search_index USING GIN(to_tsvector('french', title));
CREATE INDEX IF NOT EXISTS idx_search_index_content ON search_index USING GIN(to_tsvector('french', content));
-- Index pour semantic_vector (créé seulement si la colonne et l'extension existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_index' AND column_name = 'semantic_vector') THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_search_index_semantic_vector ON search_index USING ivfflat(semantic_vector vector_cosine_ops) WITH (lists = 100)';
        END IF;
    END IF;
END $$;
-- Index pour entity_type, entity_id (créé seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_index' AND column_name = 'entity_type') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_index' AND column_name = 'entity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_search_index_entity ON search_index(entity_type, entity_id)';
    END IF;
END $$;

-- Trigger pour mettre à jour automatiquement le search_vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('french', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(NEW.ocr_text, '')), 'C');
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER search_index_update_vector
    BEFORE INSERT OR UPDATE ON search_index
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();

-- =====================================================
-- SEARCH_HISTORY TABLE (Historique des recherches)
-- =====================================================
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    search_type TEXT DEFAULT 'fulltext' CHECK (search_type IN ('fulltext', 'semantic', 'ocr', 'hybrid')),
    filters JSONB DEFAULT '{}'::jsonb, -- Filtres appliqués
    results_count INTEGER DEFAULT 0,
    clicked_result_id UUID, -- Résultat sur lequel l'utilisateur a cliqué
    clicked_result_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search_history
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history USING GIN(to_tsvector('french', query));

-- =====================================================
-- SEARCH_SUGGESTIONS TABLE (Suggestions de recherche)
-- =====================================================
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    suggestion_type TEXT DEFAULT 'autocomplete' CHECK (suggestion_type IN ('autocomplete', 'related', 'popular', 'ai_generated')),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search_suggestions
CREATE INDEX IF NOT EXISTS idx_search_suggestions_query ON search_suggestions(query);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage_count ON search_suggestions(usage_count DESC);

-- =====================================================
-- DOCUMENT_OCR_RESULTS TABLE (Résultats OCR pour documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER DEFAULT 1,
    ocr_text TEXT NOT NULL,
    confidence_score DECIMAL(5, 2), -- Score de confiance OCR (0-100)
    bounding_boxes JSONB, -- Coordonnées des zones de texte
    language TEXT DEFAULT 'fr',
    ocr_provider TEXT, -- 'tesseract', 'google_vision', 'aws_textract', etc.
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, page_number)
);

-- Indexes for document_ocr_results
CREATE INDEX IF NOT EXISTS idx_document_ocr_results_document_id ON document_ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_document_ocr_results_ocr_text ON document_ocr_results USING GIN(to_tsvector('french', ocr_text));

-- =====================================================
-- FIELD_VISITS TABLE (Visites terrain avec géolocalisation)
-- =====================================================
CREATE TABLE IF NOT EXISTS field_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- Précision en mètres
    altitude DECIMAL(10, 2),
    heading DECIMAL(5, 2), -- Direction en degrés
    speed DECIMAL(5, 2), -- Vitesse en m/s
    notes TEXT,
    photos TEXT[] DEFAULT '{}'::text[], -- URLs des photos
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for field_visits
CREATE INDEX IF NOT EXISTS idx_field_visits_lead_id ON field_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_field_visits_user_id ON field_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_field_visits_visited_at ON field_visits(visited_at DESC);
-- Index géospatial (créé seulement si PostGIS est disponible et si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'field_visits' AND column_name = 'longitude') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'field_visits' AND column_name = 'latitude') THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_field_visits_location ON field_visits USING GIST(ST_MakePoint(longitude, latitude))';
        END IF;
    END IF;
END $$;

-- =====================================================
-- USER_DEVICES TABLE (Gestion des appareils)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL, -- Token pour notifications push
    device_id TEXT, -- Identifiant unique de l'appareil
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name TEXT, -- Nom de l'appareil
    app_version TEXT, -- Version de l'application
    os_version TEXT, -- Version du système d'exploitation
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

-- Indexes for user_devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_token ON user_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_user_devices_is_active ON user_devices(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_devices_platform ON user_devices(platform);

-- =====================================================
-- TEAMS TABLE (Groupes/Équipes)
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Couleur pour l'affichage
    icon TEXT, -- Icône pour l'affichage
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active) WHERE is_active = TRUE;

-- =====================================================
-- TEAM_MEMBERS TABLE (Membres d'équipe)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_member_role DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- =====================================================
-- TEAM_PERMISSIONS TABLE (Permissions d'équipe)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- 'project', 'lead', 'document', 'campaign', etc.
    resource_id UUID, -- ID de la ressource (NULL pour permissions globales)
    permission_type TEXT NOT NULL, -- 'read', 'write', 'delete', 'admin'
    granted_to_role team_member_role, -- Rôle requis pour cette permission
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, resource_type, resource_id, permission_type)
);

-- Indexes for team_permissions
CREATE INDEX IF NOT EXISTS idx_team_permissions_team_id ON team_permissions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_permissions_resource ON team_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_team_permissions_role ON team_permissions(granted_to_role);

-- =====================================================
-- TEAM_STATISTICS TABLE (Statistiques d'équipe)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metric_type TEXT NOT NULL, -- 'leads_created', 'tasks_completed', 'revenue', etc.
    metric_value DECIMAL(12, 2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, period_start, period_end, metric_type)
);

-- Indexes for team_statistics
CREATE INDEX IF NOT EXISTS idx_team_statistics_team_id ON team_statistics(team_id);
CREATE INDEX IF NOT EXISTS idx_team_statistics_period ON team_statistics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_team_statistics_metric ON team_statistics(metric_type);

-- RLS Policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_statistics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view teams they are members of
CREATE POLICY "Users can view teams they belong to" ON teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

-- Policy: Team owners and admins can update teams
CREATE POLICY "Team owners and admins can update teams" ON teams
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

-- Policy: Users can create teams
CREATE POLICY "Users can create teams" ON teams
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Team owners can delete teams
CREATE POLICY "Team owners can delete teams" ON teams
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND team_members.role = 'owner'
        )
    );

-- Policy: Users can view team members of their teams
CREATE POLICY "Users can view team members of their teams" ON team_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Policy: Team owners and admins can manage team members
CREATE POLICY "Team owners and admins can manage team members" ON team_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- SAML_IDP_CONFIGURATIONS TABLE (Configuration SSO SAML)
-- =====================================================
CREATE TABLE IF NOT EXISTS saml_idp_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    entity_id TEXT NOT NULL,
    sso_url TEXT NOT NULL,
    slo_url TEXT,
    certificate TEXT NOT NULL,
    certificate_fingerprint TEXT,
    signature_algorithm TEXT DEFAULT 'RSA-SHA256',
    digest_algorithm TEXT DEFAULT 'SHA256',
    name_id_format TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    attribute_mapping JSONB DEFAULT '{}'::jsonb,
    jit_enabled BOOLEAN DEFAULT TRUE,
    jit_default_role TEXT DEFAULT 'user',
    jit_default_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SAML_SESSIONS TABLE (Sessions SAML)
-- =====================================================
CREATE TABLE IF NOT EXISTS saml_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idp_config_id UUID REFERENCES saml_idp_configurations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    saml_request_id TEXT NOT NULL,
    saml_response_id TEXT,
    relay_state TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for SAML
CREATE INDEX IF NOT EXISTS idx_saml_idp_configurations_is_active ON saml_idp_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_saml_idp_configurations_entity_id ON saml_idp_configurations(entity_id);
CREATE INDEX IF NOT EXISTS idx_saml_sessions_saml_request_id ON saml_sessions(saml_request_id);
CREATE INDEX IF NOT EXISTS idx_saml_sessions_user_id ON saml_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saml_sessions_status ON saml_sessions(status);
CREATE INDEX IF NOT EXISTS idx_saml_sessions_expires_at ON saml_sessions(expires_at);

-- RLS Policies for SAML
ALTER TABLE saml_idp_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view SAML configurations" ON saml_idp_configurations;
CREATE POLICY "Users can view SAML configurations"
    ON saml_idp_configurations FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage SAML configurations" ON saml_idp_configurations;
CREATE POLICY "Admins can manage SAML configurations"
    ON saml_idp_configurations FOR ALL
    USING (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'
    ));

ALTER TABLE saml_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own SAML sessions" ON saml_sessions;
CREATE POLICY "Users can view their own SAML sessions"
    ON saml_sessions FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service can manage SAML sessions" ON saml_sessions;
CREATE POLICY "Service can manage SAML sessions"
    ON saml_sessions FOR ALL
    USING (true); -- Service role can manage all sessions

-- Trigger pour saml_idp_configurations
DROP TRIGGER IF EXISTS update_saml_idp_configurations_updated_at ON saml_idp_configurations;
CREATE TRIGGER update_saml_idp_configurations_updated_at
    BEFORE UPDATE ON saml_idp_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for user_devices
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own devices" ON user_devices;
CREATE POLICY "Users can view their own devices"
    ON user_devices FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own devices" ON user_devices;
CREATE POLICY "Users can manage their own devices"
    ON user_devices FOR ALL
    USING (auth.uid() = user_id);

-- Trigger pour user_devices
DROP TRIGGER IF EXISTS update_user_devices_updated_at ON user_devices;
CREATE TRIGGER update_user_devices_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INTELLIGENT_SUGGESTIONS TABLE (Suggestions intelligentes avancées)
-- =====================================================
CREATE TABLE IF NOT EXISTS intelligent_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('lead_management', 'task_optimization', 'workflow_improvement', 'content_optimization', 'timing_optimization', 'resource_allocation', 'communication', 'sales_strategy')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    impact_score INTEGER NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    action_items JSONB DEFAULT '[]'::jsonb,
    context JSONB DEFAULT '{}'::jsonb,
    related_entities JSONB DEFAULT '{}'::jsonb,
    is_applied BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for intelligent_suggestions
CREATE INDEX IF NOT EXISTS idx_intelligent_suggestions_user_id ON intelligent_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_intelligent_suggestions_category ON intelligent_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_intelligent_suggestions_priority ON intelligent_suggestions(priority);
CREATE INDEX IF NOT EXISTS idx_intelligent_suggestions_is_applied ON intelligent_suggestions(is_applied);
CREATE INDEX IF NOT EXISTS idx_intelligent_suggestions_is_dismissed ON intelligent_suggestions(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_intelligent_suggestions_created_at ON intelligent_suggestions(created_at);

-- RLS Policies for intelligent_suggestions
ALTER TABLE intelligent_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own suggestions" ON intelligent_suggestions;
CREATE POLICY "Users can view their own suggestions"
    ON intelligent_suggestions FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own suggestions" ON intelligent_suggestions;
CREATE POLICY "Users can manage their own suggestions"
    ON intelligent_suggestions FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- AUTOMATION_NOTIFICATIONS TABLE (Notifications pour automations)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('unsubscribe', 'error', 'sequence_interruption', 'workflow_paused', 'workflow_completed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_notifications
CREATE INDEX IF NOT EXISTS idx_automation_notifications_user_id ON automation_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_workflow_id ON automation_notifications(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_lead_id ON automation_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_type ON automation_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_severity ON automation_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_read_at ON automation_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_notifications_created_at ON automation_notifications(created_at);

-- RLS Policies for automation_notifications
ALTER TABLE automation_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON automation_notifications;
CREATE POLICY "Users can view their own notifications"
    ON automation_notifications FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own notifications" ON automation_notifications;
CREATE POLICY "Users can manage their own notifications"
    ON automation_notifications FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- WORKFLOW_EXECUTION_LOGS TABLE (Logs d'exécution des workflows)
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    execution_status TEXT NOT NULL CHECK (execution_status IN ('success', 'error', 'interrupted', 'pending')),
    error_message TEXT,
    error_details JSONB,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for workflow_execution_logs
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_workflow_id ON workflow_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_status ON workflow_execution_logs(execution_status);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_executed_at ON workflow_execution_logs(executed_at);

-- RLS Policies for workflow_execution_logs
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view workflow execution logs" ON workflow_execution_logs;
CREATE POLICY "Users can view workflow execution logs"
    ON workflow_execution_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflows
            WHERE workflows.id = workflow_execution_logs.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );

-- =====================================================
-- WORKFLOW_EXECUTIONS TABLE (Exécutions de workflows pour leads)
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'interrupted', 'paused')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    interrupted_at TIMESTAMPTZ,
    current_step INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_lead_id ON workflow_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);

-- RLS Policies for workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view workflow executions" ON workflow_executions;
CREATE POLICY "Users can view workflow executions"
    ON workflow_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflows
            WHERE workflows.id = workflow_executions.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );

-- =====================================================
-- WORKFLOW_ALERTS TABLE (Alertes pour workflows)
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('execution_rate', 'step_time', 'critical_error', 'low_performance')),
    threshold NUMERIC NOT NULL,
    current_value NUMERIC NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for workflow_alerts
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_workflow_id ON workflow_alerts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_type ON workflow_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_severity ON workflow_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_resolved_at ON workflow_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_triggered_at ON workflow_alerts(triggered_at);

-- RLS Policies for workflow_alerts
ALTER TABLE workflow_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view workflow alerts" ON workflow_alerts;
CREATE POLICY "Users can view workflow alerts"
    ON workflow_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflows
            WHERE workflows.id = workflow_alerts.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can manage workflow alerts" ON workflow_alerts;
CREATE POLICY "Users can manage workflow alerts"
    ON workflow_alerts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflows
            WHERE workflows.id = workflow_alerts.workflow_id
            AND workflows.user_id = auth.uid()
        )
    );

