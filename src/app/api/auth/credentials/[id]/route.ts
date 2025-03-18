import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCredentialById, deleteCredential } from "@/lib/db/credentials";
import { deleteDeviceCredential } from "@/lib/db/device-credentials";
import { logger } from "@/lib/api/logger";

// Create a scoped logger for this route
const credentialLogger = logger.scope("CredentialDelete");

interface DeleteParams {
  id: string;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Next.js 15 compatible route handler with correct typing
export async function DELETE(
  request: NextRequest,
  { params }: { params: DeleteParams }
): Promise<NextResponse<DeleteResponse>> {
  try {
    const id = params.id;
    credentialLogger.log(`Processing deletion request for credential: ${id}`);

    if (!id) {
      credentialLogger.warn("No credential ID provided");
      return NextResponse.json(
        { success: false, error: "Credential ID is required" },
        { status: 400 }
      );
    }

    // Check if this is a device credential deletion request
    const searchParams = request.nextUrl.searchParams;
    const isDeviceCredential = searchParams.get("type") === "device";
    credentialLogger.debug(
      `Deletion type: ${
        isDeviceCredential ? "device credential" : "regular credential"
      }`
    );

    if (isDeviceCredential) {
      // Delete device credential
      credentialLogger.log(`Deleting device credential: ${id}`);
      await deleteDeviceCredential(id);
      credentialLogger.log("Device credential deleted successfully");

      return NextResponse.json({
        success: true,
        message: "Device credential deleted successfully",
      });
    } else {
      // Regular credential deletion - requires authentication
      credentialLogger.debug(
        "Regular credential deletion, verifying authentication"
      );
      const sessionCookie = request.cookies.get("session");

      if (!sessionCookie?.value) {
        credentialLogger.warn("No session cookie found");
        return NextResponse.json(
          { success: false, error: "Not authenticated" },
          { status: 401 }
        );
      }

      // Get session
      credentialLogger.debug("Validating session");
      const session = await getSession(sessionCookie.value);
      if (!session) {
        credentialLogger.warn("Invalid session");
        return NextResponse.json(
          { success: false, error: "Invalid session" },
          { status: 401 }
        );
      }

      // Get credential
      credentialLogger.debug(`Fetching credential: ${id}`);
      const credential = await getCredentialById(id);
      if (!credential) {
        credentialLogger.warn(`Credential not found: ${id}`);
        return NextResponse.json(
          { success: false, error: "Credential not found" },
          { status: 404 }
        );
      }

      // Verify ownership
      credentialLogger.debug("Verifying credential ownership");
      if (credential.userId !== session.userId) {
        credentialLogger.warn(
          `Unauthorized access attempt by user: ${session.userId}`
        );
        return NextResponse.json(
          { success: false, error: "Not authorized" },
          { status: 403 }
        );
      }

      // Delete credential
      credentialLogger.log(`Deleting credential: ${id}`);
      await deleteCredential(id);
      credentialLogger.log("Credential deleted successfully");

      return NextResponse.json({
        success: true,
        message: "Credential deleted successfully",
      });
    }
  } catch (error) {
    credentialLogger.error("Error deleting credential:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}
