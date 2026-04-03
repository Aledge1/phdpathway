import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
let cloudEnabled = false;
let supabaseHost = "";

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseHost = new URL(supabaseUrl).host;
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    cloudEnabled = true;
  }
} catch {
  supabase = null;
  cloudEnabled = false;
  supabaseHost = "";
}

export { cloudEnabled, supabase, supabaseHost };
