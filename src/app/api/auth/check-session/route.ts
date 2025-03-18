import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/users";
import { logger } from "@/lib/api/logger";

// Create a scoped logger for this route
const sessionLogger = logger.scope("CheckSession");

interface SessionResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    displayName: string | undefined;
  } | null;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<SessionResponse>> {
  let sessionId: string | undefined;

  try {
    const sessionCookie = request.cookies.get("session");
    sessionId = sessionCookie?.value;

    sessionLogger.debug("Session cookie check:", !!sessionId);
  } catch (error) {
    sessionLogger.error("Error accessing cookies:", error);
  }

  if (!sessionId) {
    sessionLogger.debug("No session cookie found");
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    sessionLogger.debug("Retrieving session");
    const session = await getSession(sessionId);

    if (!session) {
      sessionLogger.debug("No valid session found for ID");
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Check if session is expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      sessionLogger.debug("Session expired", { expiresAt });
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Get user
    sessionLogger.debug(`Getting user data for user ID: ${session.userId}`);
    const user = await getUserById(session.userId);

    if (!user) {
      sessionLogger.warn(`User not found for ID: ${session.userId}`);
      return NextResponse.json({ authenticated: false, user: null });
    }

    sessionLogger.log(`User authenticated: ${user.email}`);
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email,
      },
    });
  } catch (error) {
    sessionLogger.error("Error checking session:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
