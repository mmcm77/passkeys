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

// Helper function to get device info from request
function getDeviceInfo(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";

  // This is a very basic implementation
  // In a production app, you might want to use a proper user-agent parser
  return {
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
}

export async function POST(request: NextRequest) {
  try {
    const { credential, challengeId, browserInfo } = await request.json();

    // Verify challenge
    const challengeResult = await verifyChallenge(challengeId, "registration");
    if (!challengeResult.valid) {
      return NextResponse.json(
        { error: challengeResult.error },
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

    // Log detailed information about the credential for debugging
    console.log("=== REGISTRATION DATA ===");
    console.log("Credential ID:", verifiedCredential.id);
    console.log("Public Key Type:", typeof verifiedCredential.publicKey);
    console.log("Is buffer?", Buffer.isBuffer(verifiedCredential.publicKey));
    console.log("Public Key Length:", verifiedCredential.publicKey.length);

    // Check if publicKey exists and has at least one element
    if (
      verifiedCredential.publicKey &&
      verifiedCredential.publicKey.length > 0
    ) {
      // We can safely use non-null assertion since we've verified length > 0
      const firstByte = verifiedCredential.publicKey[0]!;
      console.log("First byte value:", firstByte.toString(16));
    } else {
      console.warn(
        "Public key is empty or doesn't have the expected structure"
      );
    }

    // Convert the public key to base64url format for storage
    const publicKeyBase64 = isoBase64URL.fromBuffer(
      verifiedCredential.publicKey
    );
    console.log("Public Key (base64url):", publicKeyBase64);
    console.log("========================");

    // First, check if this credential is already registered as a device credential
    // to avoid duplicate registrations
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
      transports: Array.isArray(credential.transports)
        ? credential.transports
        : [],
      deviceInfo: getDeviceInfo(request),
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    // Store or update device credential for device recognition
    try {
      console.log("Storing device credential for device recognition");

      // Use provided browserInfo or detect from request
      const detectedBrowserInfo = browserInfo || getBrowserInfo();

      // Make sure we have browser and OS information
      let browser = detectedBrowserInfo?.browser;
      let os = detectedBrowserInfo?.os;
      const deviceType = detectedBrowserInfo?.deviceType || detectDeviceType();

      // If browser detection failed, try to detect from user agent
      if (!browser || browser === "Unknown") {
        const userAgent = request.headers.get("user-agent") || "";
        console.log(`Detecting browser from user agent: ${userAgent}`);

        // Attempt to detect browser
        if (userAgent.includes("Chrome")) {
          browser = "Chrome";
        } else if (userAgent.includes("Safari")) {
          browser = "Safari";
        } else if (userAgent.includes("Firefox")) {
          browser = "Firefox";
        } else if (userAgent.includes("Edge")) {
          browser = "Edge";
        }

        // Attempt to detect OS
        if (userAgent.includes("Windows")) {
          os = "Windows";
        } else if (userAgent.includes("Mac")) {
          os = "macOS";
        } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
          os = "iOS";
        } else if (userAgent.includes("Android")) {
          os = "Android";
        } else if (userAgent.includes("Linux")) {
          os = "Linux";
        }
      }

      // Ensure we have some values
      browser = browser || "Unknown Browser";
      os = os || "Unknown OS";

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
