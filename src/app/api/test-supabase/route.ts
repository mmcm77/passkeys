import { NextResponse } from "next/server";
import { testSupabaseConnection } from "@/lib/supabase";

export async function GET() {
  try {
    const result = await testSupabaseConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test Supabase API error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
