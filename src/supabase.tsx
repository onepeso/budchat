import { createClient } from "@supabase/supabase-js";
import { invoke } from "@tauri-apps/api/core";

// Function to fetch Supabase credentials from the backend
async function fetchSupabaseCredentials() {
  try {
    const [supabaseUrl, supabaseKey] = (await invoke(
      "get_supabase_credentials"
    )) as [string, string];
    return { supabaseUrl, supabaseKey };
  } catch (error) {
    console.error("Failed to fetch Supabase credentials:", error);
    throw error;
  }
}

// Initialize Supabase client
let supabase;
const initializeSupabase = async () => {
  const { supabaseUrl, supabaseKey } = await fetchSupabaseCredentials();
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase client initialized:", !!supabase);
  return supabase;
};

// Export a promise that resolves to the initialized Supabase client
export const supabasePromise = initializeSupabase();
