import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import supabase from "../supabase";
import { Session } from "@/types/auth";
import type { Database } from "@/types/database";

type DbSession = Database["public"]["Tables"]["sessions"]["Row"];
type DbSessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];

// Create a new session
export async function createSession(
  userId: string,
  expiresIn: number = 60 * 60 * 24 * 7 * 1000 // 1 week by default
): Promise<Session> {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresIn);

  // Create the session object with camelCase for TypeScript
  const sessionData: Session = {
    id: sessionId,
    userId,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Map to snake_case for the database
  const dbSessionData: DbSessionInsert = {
    id: sessionData.id,
    user_id: sessionData.userId,
    expires_at: sessionData.expiresAt,
    created_at: sessionData.createdAt,
  };

  const { error } = await supabase.from("sessions").insert(dbSessionData);

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return sessionData;
}

// Helper function to convert database session to app session
function mapDbSessionToSession(dbSession: DbSession): Session {
  return {
    id: dbSession.id,
    userId: dbSession.user_id,
    expiresAt: dbSession.expires_at,
    createdAt: dbSession.created_at,
  };
}

// Get a session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  const { data: dbSession, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", sessionId)
    .returns<DbSession>()
    .maybeSingle();

  if (error || !dbSession) {
    console.error("Error fetching session:", error);
    return null;
  }

  return mapDbSessionToSession(dbSession);
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Error deleting session:", error);
  }
}

// Get the current session from cookies
export async function getCurrentSession(): Promise<Session | null> {
  // Get the session cookie
  let sessionId: string | undefined;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    sessionId = sessionCookie?.value;
  } catch (error) {
    console.error("Error accessing cookies:", error);
    return null;
  }

  if (!sessionId) {
    return null;
  }

  const session = await getSession(sessionId);

  if (!session) {
    return null;
  }

  // Check if session is expired
  const expiresAt = new Date(session.expiresAt);
  if (expiresAt < new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  return session;
}

// Get the current user ID from session
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.userId || null;
}
