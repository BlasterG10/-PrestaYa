// Presta Ya — Supabase client
// Publishable/anon keys are safe for browser use when RLS is correctly configured.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://qchzgjhbhnkxkmvebkgw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_P25yjBAHPfz4zaFzhTZKag_jknlwGKI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
