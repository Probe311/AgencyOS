
import { createClient } from '@supabase/supabase-js';

// Configuration priorities:
// 1. LocalStorage (User settings override)
// 2. Hardcoded Credentials (Provided in prompt)
// 3. Environment Variables (Build time)

const DEFAULT_URL = 'https://kxxmfqxllkaezxxrsijz.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eG1mcXhsbGthZXp4eHJzaWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjczMzQxNCwiZXhwIjoyMDgyMzA5NDE0fQ.XswvPm_NbfgZXGD07Xj7e7_Ndy_8l1K67gsd8_9RTg8';

const getSupabaseConfig = () => {
  const envUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check LocalStorage (for dynamic user settings)
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('agencyos_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('agencyos_supabase_key') : null;

  return {
    url: localUrl || envUrl || DEFAULT_URL,
    key: localKey || envKey || DEFAULT_KEY
  };
};

const config = getSupabaseConfig();

export const supabase = (config.url && config.key) 
  ? createClient(config.url, config.key) 
  : null;

export const isSupabaseConfigured = !!supabase;
