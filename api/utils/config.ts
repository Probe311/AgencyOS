import { createClient } from '@supabase/supabase-js';

/**
 * Configuration centralisée pour les endpoints API
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  throw new Error('Supabase URL must be configured (VITE_SUPABASE_URL or SUPABASE_URL)');
}

/**
 * Client Supabase avec service role key (pour les opérations admin)
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Client Supabase avec anon key (pour les opérations publiques)
 */
export const supabaseAnon = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Variables d'environnement
 */
export const config = {
  supabaseUrl,
  supabaseServiceKey: supabaseServiceKey || undefined,
  supabaseAnonKey: supabaseAnonKey || undefined,
};

