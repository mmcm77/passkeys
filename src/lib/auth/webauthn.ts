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
  // In production, the RP ID must be the domain where the app is hosted
  if (process.env.NODE_ENV === "production") {
    // Use environment variable NEXT_PUBLIC_RP_ID if available
    if (process.env.NEXT_PUBLIC_RP_ID) {
      console.log(
        `Using RP ID from NEXT_PUBLIC_RP_ID: ${process.env.NEXT_PUBLIC_RP_ID}`
      );
      return process.env.NEXT_PUBLIC_RP_ID;
    }

    // Fall back to NEXT_PUBLIC_DOMAIN
    if (process.env.NEXT_PUBLIC_DOMAIN) {
      console.log(
        `Using RP ID from NEXT_PUBLIC_DOMAIN: ${process.env.NEXT_PUBLIC_DOMAIN}`
      );
      return process.env.NEXT_PUBLIC_DOMAIN;
    }

    // Get domain from window if available (client-side only)
    if (typeof window !== "undefined") {
      const domain = window.location.hostname;
      console.log(`Using RP ID from current hostname: ${domain}`);
      return domain;
    }

    // Last resort fallback
    console.warn(
      "⚠️ No RP ID available. Using default fallback, which will likely cause errors!"
    );
    return "your-domain.com";
  }

  // For development, localhost is fine
  return "localhost";
}

// Get the expected origin based on environment
export function getExpectedOrigin(): string {
  // In production, use proper origin
  if (process.env.NODE_ENV === "production") {
    // Use environment variable NEXT_PUBLIC_ORIGIN if available
    if (process.env.NEXT_PUBLIC_ORIGIN) {
      console.log(
        `Using origin from NEXT_PUBLIC_ORIGIN: ${process.env.NEXT_PUBLIC_ORIGIN}`
      );
      return process.env.NEXT_PUBLIC_ORIGIN;
    }

    // Fall back to constructing from domain
    if (process.env.NEXT_PUBLIC_DOMAIN) {
      const origin = `https://${process.env.NEXT_PUBLIC_DOMAIN}`;
      console.log(
        `Using constructed origin from NEXT_PUBLIC_DOMAIN: ${origin}`
      );
      return origin;
    }

    // Get origin from window if available (client-side only)
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      console.log(`Using origin from current window: ${origin}`);
      return origin;
    }

    // Last resort fallback
    console.warn(
      "⚠️ No origin available. Using default fallback, which will likely cause errors!"
    );
    return "https://your-domain.com";
  }

  // For development
  return "http://localhost:3000";
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
    allowCredentials: allowCredentials.map((cred) => ({
      id: cred.id,
      type: "public-key",
      // Ensure all possible transports are included if not specified
      transports: cred.transports?.length
        ? cred.transports
        : ["internal", "hybrid", "ble", "nfc", "usb"],
    })),
    userVerification: "preferred",
  };

  console.log(
    "Authentication options with enhanced transports:",
    JSON.stringify(options)
  );
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

  // Get RP ID and other configs
  const rpId = config.webauthn.rpId;
  const rpName = config.webauthn.rpName;

  console.log(`Generating passkey options with RP ID: ${rpId}`);
  console.log(`RP Name: ${rpName}`);

  if (!rpId) {
    console.error("No RP ID available for passkey generation");
    throw new Error("Missing RP ID configuration");
  }

  // Double-check that RP ID doesn't have https:// (common mistake)
  if (rpId.includes("://")) {
    console.error(
      `Invalid RP ID format: ${rpId}. RP ID should not include protocol.`
    );
    throw new Error(
      "Invalid RP ID format: should not include protocol (https://)"
    );
  }

  // Generate registration options
  const options = await generateRegistrationOptions({
    rpName: rpName,
    rpID: rpId,
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
      // Include all possible transports to maximize compatibility, especially for Safari
      transports: ["internal", "hybrid", "ble", "nfc", "usb"],
    })),
  });

  // Verify that RP ID was set correctly in the options
  if (options.rp.id && options.rp.id.includes("://")) {
    console.error(`Generated options contain invalid RP ID: ${options.rp.id}`);
    // Fix the RP ID in the options object
    options.rp.id = options.rp.id
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    console.log(`Corrected RP ID to: ${options.rp.id}`);
  }

  return options;
}
