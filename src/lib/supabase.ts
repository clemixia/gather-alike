import { createClient } from '@supabase/supabase-js';

// Vite uses import.meta.env, NOT process.env!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);