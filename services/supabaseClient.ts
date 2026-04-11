import { createClient } from '@supabase/supabase-js';

// Your Supabase URL and Public (anon) Key
const supabaseUrl = 'https://ujsguoktdnrjxqlcrwge.supabase.co';
const supabaseAnonKey = 'sb_publishable_ylRXtGl4q_7lf_O1MW7Yew_PeO8XeNS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
