import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getCredentialById, deleteCredential } from "@/lib/db/credentials";
import { deleteDeviceCredential } from "@/lib/db/device-credentials";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Credential ID is required" },
        { status: 400 }
      );
    }

    // Check if this is a device credential deletion request
    const searchParams = request.nextUrl.searchParams;
    const isDeviceCredential = searchParams.get("type") === "device";

    if (isDeviceCredential) {
      // Delete device credential
      await deleteDeviceCredential(id);
      return NextResponse.json(
        { success: true, message: "Device credential deleted successfully" },
        { status: 200 }
      );
    } else {
      // Regular credential deletion - requires authentication
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session");

      if (!sessionCookie?.value) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }

      // Get session
      const session = await getSession(sessionCookie.value);
      if (!session) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }

      // Get credential
      const credential = await getCredentialById(id);
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
      await deleteCredential(id);

      return NextResponse.json({
        success: true,
        message: "Credential deleted successfully",
      });
    }
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}
