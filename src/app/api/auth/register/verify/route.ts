import { NextRequest, NextResponse } from "next/server";
import { verifyWebAuthnRegistration } from "@/lib/auth/webauthn";
import { getUserById } from "@/lib/db/users";
import { storeCredential } from "@/lib/db/credentials";
import { verifyChallenge, removeChallenge } from "@/lib/auth/challenge-manager";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import {
  storeDeviceCredential,
  getDeviceCredential,
} from "@/lib/db/device-credentials";
import { getBrowserInfo, detectDeviceType } from "@/lib/auth/browser-detection";
import type { DeviceInfo } from "@/types/auth";
import type { AuthenticatorTransport } from "@simplewebauthn/browser";

interface VerifyResponse {
  registered: boolean;
  user: {
    id: string;
    email: string;
    displayName: string | undefined;
  };
}

interface CredentialRequest {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
  };
  transports?: AuthenticatorTransport[];
  clientExtensionResults: Record<string, unknown>;
  type: "public-key";
}

interface VerifyRequestBody {
  credential: CredentialRequest;
  challengeId: string;
  browserInfo?: {
    browser?: string;
    os?: string;
    deviceType?: string;
  };
}

// Helper function to get device info from request
function getDeviceInfo(request: NextRequest): DeviceInfo {
  const userAgent = request.headers.get("user-agent") || "";

  const deviceInfo: DeviceInfo = {
    browserFamily: userAgent.includes("Chrome")
      ? "Chrome"
      : userAgent.includes("Firefox")
      ? "Firefox"
      : userAgent.includes("Safari")
      ? "Safari"
      : "Unknown",
    osFamily: userAgent.includes("Windows")
      ? "Windows"
      : userAgent.includes("Mac")
      ? "Mac"
      : userAgent.includes("Linux")
      ? "Linux"
      : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iOS")
      ? "iOS"
      : "Unknown",
    isMobile: userAgent.includes("Mobile"),
    isTablet: userAgent.includes("Tablet"),
    isDesktop: !userAgent.includes("Mobile") && !userAgent.includes("Tablet"),
  };

  return deviceInfo;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyResponse | { error: string }>> {
  try {
    const body = (await request.json()) as VerifyRequestBody;
    const { credential, challengeId, browserInfo } = body;

    // Verify challenge
    const challengeResult = await verifyChallenge(challengeId, "registration");
    if (!challengeResult.valid) {
      return NextResponse.json(
        { error: challengeResult.error || "Invalid challenge" },
        { status: 400 }
      );
    }

    // Get challenge data
    const { challenge, data } = challengeResult;

    // Ensure data exists and has userId
    if (!data || typeof data.userId !== "string") {
      return NextResponse.json(
        { error: "Invalid challenge data" },
        { status: 400 }
      );
    }

    const userId = data.userId;

    // Clean up challenge
    await removeChallenge(challengeId);

    // Get user
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify registration
    const verification = await verifyWebAuthnRegistration(
      credential,
      challenge as string
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    // According to SimpleWebAuthn docs, registrationInfo contains the credential data
    const { registrationInfo } = verification;

    if (!registrationInfo) {
      return NextResponse.json(
        { error: "Missing registration info" },
        { status: 400 }
      );
    }

    // Extract credential data from registrationInfo
    const {
      credential: verifiedCredential,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;

    // Convert the public key to base64url format for storage
    const publicKeyBase64 = isoBase64URL.fromBuffer(
      verifiedCredential.publicKey
    );

    // First, check if this credential is already registered as a device credential
    const existingDeviceCredential = await getDeviceCredential(
      userId,
      verifiedCredential.id
    );

    // Determine which registration approach to use
    const registrationType = existingDeviceCredential ? "update" : "create";
    console.log(`Registration type: ${registrationType}`);

    // For WebAuthn to work properly, we need to always store the credential with the public key
    await storeCredential({
      userId: user.id,
      credentialId: verifiedCredential.id,
      credentialPublicKey: publicKeyBase64,
      webauthnUserId: user.id,
      counter: verifiedCredential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports || [],
      deviceInfo: getDeviceInfo(request),
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    // Store or update device credential for device recognition
    try {
      // Use provided browserInfo or detect from request
      const detectedBrowserInfo = browserInfo || getBrowserInfo();

      // Make sure we have browser and OS information
      const browser = detectedBrowserInfo?.browser || "Unknown Browser";
      const os = detectedBrowserInfo?.os || "Unknown OS";
      const deviceType = detectDeviceType();

      // Generate a readable device name based on OS and browser
      const deviceName = `${os} ${browser}`;

      console.log(`Detected device: ${deviceName} (${deviceType})`);

      // Store device credential (update will happen automatically if it exists)
      await storeDeviceCredential(user.id, verifiedCredential.id, deviceName);

      console.log(
        `Device credential ${registrationType}d successfully: ${deviceName}`
      );
    } catch (deviceError) {
      // Log but don't fail the registration if device credential storage fails
      console.error("Error storing device credential:", deviceError);
    }

    return NextResponse.json({
      registered: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Registration verification error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
