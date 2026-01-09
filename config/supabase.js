import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use direct Supabase URL for Vercel (has IPv4 support)
const supabaseUrl = process.env.SUPABASE_URL || 'https://arqeiadudzbmzdhqkit.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

console.log('Supabase initialized successfully');

export { supabase, supabaseAnon };