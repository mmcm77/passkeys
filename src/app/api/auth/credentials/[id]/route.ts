import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getCredentialById, deleteCredential } from "@/lib/db/credentials";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get session
    const session = await getSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get credential
    const credential = await getCredentialById(params.id);
    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (credential.userId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Delete credential
    await deleteCredential(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}
