import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * SQL Schema for Supabase Setup:
 * 
 * CREATE TABLE user_progress (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   word_id TEXT NOT NULL,
 *   repetitions INT DEFAULT 0,
 *   interval INT DEFAULT 0,
 *   ease_factor FLOAT DEFAULT 2.5,
 *   last_reviewed_date TIMESTAMPTZ,
 *   next_review_date TIMESTAMPTZ DEFAULT now(),
 *   status TEXT DEFAULT 'new',
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(user_id, word_id)
 * );
 * 
 * -- Enable RLS
 * ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
 * 
 * CREATE POLICY "Users can manage their own progress" ON user_progress
 *   FOR ALL USING (auth.uid() = user_id);
 */
