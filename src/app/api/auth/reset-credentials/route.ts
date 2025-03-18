import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { deleteAllCredentialsForUser } from "@/lib/db/credentials";
import { logger } from "@/lib/api/logger";

// Create a scoped logger for this route
const resetLogger = logger.scope("ResetCredentials");

interface ResetCredentialsResponse {
  success: boolean;
  error?: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<ResetCredentialsResponse>> {
  try {
    const { userId } = (await request.json()) as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Reset user's credentials in your database
    await deleteAllCredentialsForUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting credentials:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset credentials" },
      { status: 500 }
    );
  }
}
