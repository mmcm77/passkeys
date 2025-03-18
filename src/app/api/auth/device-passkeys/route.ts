import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { getCredentialsForCurrentDevice } from "@/lib/db/device-credentials";
import { logger } from "@/lib/api/logger";
import { generateDeviceFingerprint } from "@/lib/auth/device-recognition";
import type { DeviceComponents } from "@/lib/auth/device-recognition";

// Create a scoped logger for this route
const devicePasskeysLogger = logger.scope("DevicePasskeys");

interface DevicePasskeyResponse {
  fingerprint: string;
  components: DeviceComponents;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      devicePasskeysLogger.warn("Request missing email");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    devicePasskeysLogger.log(`Checking passkeys for email: ${email}`);

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      devicePasskeysLogger.debug("User not found");
      return NextResponse.json({
        hasPasskeysOnDevice: false,
        isServerSideCheck: typeof window === "undefined",
      });
    }

    devicePasskeysLogger.debug(`User found with ID: ${user.id}`);

    try {
      // Check if user has passkeys on this device
      // Note: On server-side, this will use the placeholder fingerprint
      const credentials = await getCredentialsForCurrentDevice(user.id);

      devicePasskeysLogger.debug(
        `Found ${credentials.length} credentials for current device`
      );

      // Determine if we're running on the server-side
      const isServerSide = typeof window === "undefined";
      devicePasskeysLogger.debug(
        `Check environment: ${isServerSide ? "Server-side" : "Client-side"}`
      );

      // Return the response with all required fields
      return NextResponse.json({
        hasPasskeysOnDevice: credentials.length > 0,
        credentialCount: credentials.length,
        isServerSideCheck: isServerSide,
      });
    } catch (error) {
      devicePasskeysLogger.error("Error checking device credentials:", error);
      // Return false for errors but ensure the hasPasskeysOnDevice field is present
      return NextResponse.json({
        hasPasskeysOnDevice: false,
        error: "Error checking credentials",
        isServerSideCheck: typeof window === "undefined",
      });
    }
  } catch (error) {
    devicePasskeysLogger.error("Error in device passkeys route:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request
): Promise<NextResponse<DevicePasskeyResponse>> {
  try {
    const { fingerprint, components } = await generateDeviceFingerprint();

    return NextResponse.json({
      fingerprint,
      components,
    });
  } catch (error) {
    console.error("Error generating device fingerprint:", error);
    return NextResponse.json(
      {
        fingerprint: "",
        components: {},
        error: "Failed to generate device fingerprint",
      },
      { status: 500 }
    );
  }
}
