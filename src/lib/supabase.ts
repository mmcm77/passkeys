import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables. Check your .env.local file."
  );
}

// Client for browser usage (with limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: "public",
  },
  // Add global headers for REST API requests to address 406 errors
  global: {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  },
});

// Test function to verify Supabase connection
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  data?: unknown;
  error?: unknown;
}> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      console.error("Supabase connection test failed:", error);
      return { success: false, error };
    }

    console.log("Supabase connection test successful:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Supabase connection test exception:", err);
    return { success: false, error: err };
  }
}

export default supabase;
