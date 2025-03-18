import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";
import { logger } from "@/lib/api/logger";
import { config } from "@/lib/config";

// Create a scoped logger for this route
const logoutLogger = logger.scope("LogoutAPI");

interface LogoutResponse {
  success: boolean;
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<LogoutResponse>> {
  try {
    let sessionId: string | undefined;

    // Get session cookie from request
    const sessionCookie = request.cookies.get("session");
    sessionId = sessionCookie?.value;

    logoutLogger.debug("Session cookie found:", !!sessionId);

    if (sessionId) {
      logoutLogger.log(`Deleting session: ${sessionId.substring(0, 8)}...`);
      await deleteSession(sessionId);
    } else {
      logoutLogger.log("No session to delete");
    }

    // Create the redirect response
    const baseUrl = config.env.isProduction
      ? process.env.NEXT_PUBLIC_BASE_URL
      : "http://localhost:3000";

    const response = NextResponse.redirect(new URL("/", baseUrl));

    // Clear the session cookie
    response.cookies.set("session", "", {
      expires: new Date(0),
      path: "/",
    });

    // Also clear the activePasskey cookie if it exists
    response.cookies.set("activePasskey", "", {
      expires: new Date(0),
      path: "/",
    });

    logoutLogger.log("User logged out successfully");
    return NextResponse.json({ success: true }) as NextResponse<LogoutResponse>;
  } catch (error) {
    logoutLogger.error("Error during logout:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process logout" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<LogoutResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Delete session from your database
    await deleteSession(sessionId);

    const response = NextResponse.json({ success: true });

    // Clear session cookie
    response.cookies.delete("session");
    response.cookies.delete("activePasskey");

    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json(
      { success: false, error: "Failed to logout" },
      { status: 500 }
    );
  }
}
