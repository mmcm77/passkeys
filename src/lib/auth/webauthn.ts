import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { StoredCredential } from "@/types/auth";

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
) {
  // Convert userId to Buffer as required by SimpleWebAuthn
  const userIdBuffer = new TextEncoder().encode(userId);

  return generateRegistrationOptions({
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
  });
}

// Generate authentication options
export async function generateWebAuthnAuthenticationOptions(
  allowCredentials: {
    id: string;
    transports?: AuthenticatorTransportFuture[];
  }[] = []
) {
  return generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials,
    userVerification: "preferred",
  });
}

// Verify registration response
export async function verifyWebAuthnRegistration(
  response: any,
  expectedChallenge: string
) {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(),
    expectedRPID: getRpId(),
  });
}

// Verify authentication response
export async function verifyWebAuthnAuthentication(
  response: any,
  expectedChallenge: string,
  credential: StoredCredential
) {
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

    // Convert the public key to a Buffer
    let publicKey: Buffer;

    try {
      // Decode the base64url-encoded public key
      publicKey = Buffer.from(
        isoBase64URL.toBuffer(credential.credentialPublicKey)
      );

      // Log the key details for debugging
      console.log("Decoded public key length:", publicKey.length);

      // Check if the public key has at least one byte
      if (publicKey.length > 0) {
        // Use non-null assertion for type safety since we've verified length is > 0
        const firstByte = publicKey[0]!;
        console.log("First byte value:", firstByte.toString(16));

        // Verify the key starts with the expected COSE_Key header (0xA5)
        if (firstByte !== 0xa5) {
          throw new Error("Invalid public key format: Expected COSE key type");
        }
      } else {
        throw new Error("Invalid public key: Empty buffer");
      }
    } catch (error) {
      console.error("Error decoding public key:", error);
      throw new Error(
        `Failed to decode credential public key: ${(error as Error).message}`
      );
    }

    // Log the final values
    console.log("Final credentialId:", credentialId);
    console.log("Final publicKey length:", publicKey.length);

    // Check if publicKey has bytes before accessing them
    if (publicKey.length > 0) {
      // We can safely use non-null assertion since we've verified length > 0
      const firstByte = publicKey[0]!;
      console.log("First byte (hex):", firstByte.toString(16));
    } else {
      console.warn("Public key buffer is empty");
    }

    console.log("======================================");

    return verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: credentialId,
        publicKey,
        counter: credential.counter,
      },
      requireUserVerification: true,
    });
  } catch (error) {
    console.error("WebAuthn Authentication Error:", error);
    throw error;
  }
}
