import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET() {
  try {
    // Disable RLS for all tables
    const disableRlsQuery = `
      -- Disable RLS for all tables
      ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS credentials DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS challenges DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS sessions DISABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Users can read their own data" ON users;
      DROP POLICY IF EXISTS "Users can read their own credentials" ON credentials;
      DROP POLICY IF EXISTS "Users can insert their own credentials" ON credentials;
      DROP POLICY IF EXISTS "Users can update their own credentials" ON credentials;
      DROP POLICY IF EXISTS "Users can delete their own credentials" ON credentials;
      DROP POLICY IF EXISTS "Public can insert challenges" ON challenges;
      DROP POLICY IF EXISTS "Public can read challenges" ON challenges;
      DROP POLICY IF EXISTS "Public can update challenges" ON challenges;
      DROP POLICY IF EXISTS "Public can delete challenges" ON challenges;
      DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
      DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
      DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;
      DROP POLICY IF EXISTS "Service role can manage all users" ON users;
      DROP POLICY IF EXISTS "Service role can manage all credentials" ON credentials;
      DROP POLICY IF EXISTS "Service role can manage all challenges" ON challenges;
      DROP POLICY IF EXISTS "Service role can manage all sessions" ON sessions;
      DROP POLICY IF EXISTS "Allow public registration" ON users;
      DROP POLICY IF EXISTS "Allow public challenge creation" ON challenges;
      DROP POLICY IF EXISTS "Allow public challenge reading" ON challenges;
      DROP POLICY IF EXISTS "Allow public session creation" ON sessions;
    `;

    // Try to execute the SQL using RPC
    const { error } = await supabase.rpc("pgcrypto_setup", {
      sql: disableRlsQuery,
    });

    if (error) {
      console.error("Error disabling RLS via RPC:", error);

      // Return instructions for manual execution
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Please run the SQL directly in the Supabase SQL Editor",
          sql: disableRlsQuery,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "RLS disabled for all tables",
    });
  } catch (error) {
    console.error("Disable RLS API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        message: "Please run the SQL directly in the Supabase SQL Editor",
      },
      { status: 500 }
    );
  }
}
