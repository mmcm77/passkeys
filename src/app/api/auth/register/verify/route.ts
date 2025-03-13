import { NextRequest, NextResponse } from "next/server";
import { verifyWebAuthnRegistration } from "@/lib/auth/webauthn";
import { getUserById } from "@/lib/db/users";
import { storeCredential } from "@/lib/db/credentials";
import { verifyChallenge, removeChallenge } from "@/lib/auth/challenge-manager";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

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
    const { credential, challengeId } = await request.json();

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
    console.log(
      "Public Key is Buffer:",
      Buffer.isBuffer(verifiedCredential.publicKey)
    );
    console.log("Public Key Length:", verifiedCredential.publicKey.length);
    console.log(
      "First byte value:",
      verifiedCredential.publicKey[0].toString(16)
    );

    // Convert the public key to base64url format for storage
    const publicKeyBase64 = isoBase64URL.fromBuffer(
      verifiedCredential.publicKey
    );
    console.log("Public Key (base64url):", publicKeyBase64);
    console.log("========================");

    // Store credential with base64url encoded public key
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
