import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

export async function GET() {
  let sessionId: string | undefined;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    sessionId = sessionCookie?.value;
  } catch (error) {
    console.error("Error accessing cookies:", error);
  }

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
  );

  response.cookies.set({
    name: "session",
    value: "",
    expires: new Date(0),
    path: "/",
  });

  return response;
}
