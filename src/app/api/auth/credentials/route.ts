import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCredentialsByUserId } from "@/lib/db/credentials";
import { logger } from "@/lib/api/logger";

// Create a scoped logger for this route
const credentialsLogger = logger.scope("CredentialsAPI");

interface Credential {
  id: string;
  name: string;
  type: string;
  lastUsed: string;
}

interface CredentialsResponse {
  credentials: Credential[];
  error?: string;
}

export async function GET(
  request: Request
): Promise<NextResponse<CredentialsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { credentials: [], error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get credentials from your database
    const dbCredentials = await getCredentialsByUserId(userId);

    // Map to expected response format
    const credentials: Credential[] = dbCredentials.map((cred) => ({
      id: cred.credentialId,
      name: cred.name || `Device ${cred.credentialId.slice(0, 6)}`,
      type: cred.deviceInfo?.isMobile
        ? "mobile"
        : cred.deviceInfo?.isTablet
        ? "tablet"
        : "desktop",
      lastUsed: new Date(cred.lastUsedAt).toISOString(),
    }));

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { credentials: [], error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}
