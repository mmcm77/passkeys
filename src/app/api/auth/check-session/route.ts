import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/users";

export async function GET() {
  let sessionId: string | undefined;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    sessionId = sessionCookie?.value;
  } catch (error) {
    console.error("Error accessing cookies:", error);
  }

  if (!sessionId) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Check if session is expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Get user
    const user = await getUserById(session.userId);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
