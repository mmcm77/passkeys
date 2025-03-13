import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET() {
  try {
    // Add policies for public registration
    const addPoliciesQuery = `
      -- Allow public registration
      CREATE POLICY IF NOT EXISTS "Allow public registration" ON users
        FOR INSERT WITH CHECK (true);
      
      -- Allow public challenge creation (needed for registration)
      CREATE POLICY IF NOT EXISTS "Allow public challenge creation" ON challenges
        FOR INSERT WITH CHECK (true);
        
      -- Allow public challenge reading (needed for registration)
      CREATE POLICY IF NOT EXISTS "Allow public challenge reading" ON challenges
        FOR SELECT USING (true);
        
      -- Allow public session creation (needed for login)
      CREATE POLICY IF NOT EXISTS "Allow public session creation" ON sessions
        FOR INSERT WITH CHECK (true);
    `;

    const { error } = await supabase.rpc("pgcrypto_setup", {
      sql: addPoliciesQuery,
    });

    if (error) {
      console.error("Error adding policies:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Please run the SQL directly in the Supabase SQL Editor",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Public registration policies added",
    });
  } catch (error) {
    console.error("Add policies API error:", error);
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
