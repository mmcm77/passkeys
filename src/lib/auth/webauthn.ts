import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { StoredCredential } from "@/types/auth";
import { getUserById } from "@/lib/db/users";
import { getCredentialsByUserId } from "@/lib/db/credentials";
import { config } from "@/lib/config";
import { AuthenticatorTransportFuture } from "@/types/webauthn";

// Get the Relying Party ID based on environment
export function getRpId(): string {
  return process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_DOMAIN || "your-domain.com"
    : "localhost";
}

// Get the expected origin based on environment
export function getExpectedOrigin(): string {
  return process.env.NODE_ENV === "production"
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN || "your-domain.com"}`
    : "http://localhost:3000";
}

// Generate registration options
export async function generateWebAuthnRegistrationOptions(
  userId: string,
  userName: string,
  userDisplayName: string
): Promise<ReturnType<typeof generateRegistrationOptions>> {
  // Convert userId to Buffer as required by SimpleWebAuthn
  const userIdBuffer = new TextEncoder().encode(userId);

  const options: GenerateRegistrationOptionsOpts = {
    rpName: "Passkeys App",
    rpID: getRpId(),
    userID: userIdBuffer,
    userName,
    userDisplayName,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "preferred",
    },
    // Exclude Ed25519 for wider compatibility
    supportedAlgorithmIDs: [-7, -257],
  };

  return generateRegistrationOptions(options);
}

// Generate authentication options
export async function generateWebAuthnAuthenticationOptions(
  allowCredentials: {
    id: string;
    transports?: AuthenticatorTransportFuture[];
  }[] = []
): Promise<ReturnType<typeof generateAuthenticationOptions>> {
  const options: GenerateAuthenticationOptionsOpts = {
    rpID: getRpId(),
    allowCredentials,
    userVerification: "preferred",
  };

  return generateAuthenticationOptions(options);
}

// Verify registration response
export async function verifyWebAuthnRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<ReturnType<typeof verifyRegistrationResponse>> {
  const options: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(),
    expectedRPID: getRpId(),
  };

  return verifyRegistrationResponse(options);
}

// Verify authentication response
export async function verifyWebAuthnAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: StoredCredential
): Promise<ReturnType<typeof verifyAuthenticationResponse>> {
  try {
    console.log("=== WEBAUTHN AUTHENTICATION DETAILS ===");
    console.log("Original credentialID:", credential.credentialID);
    console.log(
      "Original publicKey type:",
      typeof credential.credentialPublicKey
    );

    // Ensure credential ID is properly formatted
    const credentialId = isoBase64URL.isBase64URL(credential.credentialID)
      ? credential.credentialID
      : isoBase64URL.fromBuffer(Buffer.from(credential.credentialID, "base64"));

    // Convert credentialPublicKey to the correct format if needed
    let publicKey: Uint8Array;
    if (typeof credential.credentialPublicKey === "string") {
      publicKey = isoBase64URL.toBuffer(credential.credentialPublicKey);
    } else if (
      credential.credentialPublicKey &&
      typeof credential.credentialPublicKey === "object" &&
      "buffer" in credential.credentialPublicKey
    ) {
      // Handle Uint8Array or array-like objects
      publicKey = new Uint8Array(credential.credentialPublicKey as ArrayBuffer);
    } else if (Buffer.isBuffer(credential.credentialPublicKey)) {
      publicKey = new Uint8Array(credential.credentialPublicKey);
    } else {
      // Default fallback (treat as base64 string)
      publicKey = isoBase64URL.toBuffer(
        isoBase64URL.fromBuffer(
          Buffer.from(String(credential.credentialPublicKey), "base64")
        )
      );
    }

    console.log("Formatted credentialId:", credentialId);
    console.log("Formatted publicKey type:", typeof publicKey);

    return verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: credentialId,
        publicKey: publicKey,
        counter: credential.counter,
      },
    });
  } catch (error) {
    console.error("Error in verifyWebAuthnAuthentication:", error);
    throw error;
  }
}

export async function generatePasskeyOptions(
  userId: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Get user details
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Get existing credentials
  const existingCredentials = await getCredentialsByUserId(userId);

  // Generate registration options
  const options = await generateRegistrationOptions({
    rpName: config.webauthn.rpName,
    rpID: config.webauthn.rpId,
    userID: new Uint8Array(Buffer.from(userId)),
    userName: user.email,
    userDisplayName: user.displayName || user.email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      type: "public-key",
      transports: ["internal"],
    })),
  });

  return options;
}
