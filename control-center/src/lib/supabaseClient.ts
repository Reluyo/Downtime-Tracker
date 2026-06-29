import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy control-center/.env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

/**
 * Shared Supabase client for the control center.
 * Admins authenticate against this client via Supabase Auth; all data access
 * is governed by the Row Level Security policies defined in
 * supabase/migrations/001_initial_schema.sql.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
