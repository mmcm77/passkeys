/**
 * Safari-specific WebAuthn helpers to work around Safari's unique implementation
 * of WebAuthn and base64URL encoding issues.
 */
import {
  startRegistration,
  startAuthentication,
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  PublicKeyCredentialDescriptorJSON,
  PublicKeyCredentialParameters,
} from "@simplewebauthn/browser";
import { AuthenticatorTransportFuture } from "@/types/webauthn";
import { getBrowserInfo } from "./browser-detection";

// Define the proper types
type AuthenticatorAttachment = "platform" | "cross-platform";
type ResidentKeyRequirement = "discouraged" | "preferred" | "required";
type UserVerificationRequirement = "required" | "preferred" | "discouraged";
type AttestationConveyancePreference =
  | "none"
  | "indirect"
  | "direct"
  | "enterprise";

interface WebAuthnUser {
  id: string;
  name: string;
  displayName: string;
}

interface WebAuthnRP {
  name: string;
  id: string;
}

export interface WebAuthnOptions {
  challenge: string;
  rp: WebAuthnRP;
  user: WebAuthnUser;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    requireResidentKey?: boolean;
    residentKey?: ResidentKeyRequirement;
    userVerification?: UserVerificationRequirement;
  };
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[];
}

/**
 * Checks if the current browser is Safari and needs special handling
 */
export function shouldUseSafariWebAuthn(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua);
}

/**
 * Checks if the current browser is Chrome and needs special handling
 */
export function shouldUseChromeWebAuthn(): boolean {
  const ua = navigator.userAgent;
  return /Chrome/.test(ua);
}

/**
 * Safari-specific implementation of startRegistration that handles user gesture requirements
 * This function should be called directly within a click handler
 */
export async function safariStartRegistration(
  options: WebAuthnOptions
): Promise<RegistrationResponseJSON> {
  console.log(
    "Using Safari-specific registration flow with direct user gesture handling"
  );

  try {
    return await startRegistration({
      optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
    });
  } catch (error) {
    console.error("Safari registration error:", error);
    throw error;
  }
}

/**
 * Chrome-specific implementation of startRegistration
 */
export async function chromeStartRegistration(
  options: WebAuthnOptions
): Promise<RegistrationResponseJSON> {
  console.log("Using Chrome-specific registration flow");
  return await startRegistration({
    optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
  });
}

/**
 * Safari-specific implementation of startAuthentication
 */
export async function safariStartAuthentication(
  options: WebAuthnOptions
): Promise<AuthenticationResponseJSON> {
  console.log(
    "Using Safari-specific authentication flow with direct user gesture handling"
  );

  try {
    return await startAuthentication({
      optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
    });
  } catch (error) {
    console.error("Safari authentication error:", error);
    throw error;
  }
}

/**
 * Handles the base64URLString.replace error in Safari by providing special handling
 * for Safari's unique implementation of WebAuthn.
 */
export async function safariStartRegistrationFallback(
  options: WebAuthnOptions
): Promise<RegistrationResponseJSON> {
  const browserInfo = getBrowserInfo();
  console.log(
    `Safari WebAuthn: Using specialized registration for ${browserInfo.browser} ${browserInfo.version}`
  );

  // Validate incoming options
  if (!options) {
    console.error("Options object is undefined");
    throw new Error("Registration options are undefined");
  }

  if (!options.challenge) {
    console.error("Challenge is missing from options", options);
    throw new Error("Challenge is required for WebAuthn registration");
  }

  if (!options.user?.id) {
    console.error("User ID is missing from options", options);
    throw new Error("User ID is required for WebAuthn registration");
  }

  // Debug Safari WebAuthn options
  console.log("Safari WebAuthn options keys:", Object.keys(options));
  console.log("Safari WebAuthn challenge type:", typeof options.challenge);
  console.log("Safari WebAuthn user.id type:", typeof options.user.id);

  try {
    // Prepare a challenge that Safari can handle
    console.log("Parsing challenge and userId for Safari...");
    const challenge = parseBase64URLChallenge(options.challenge);
    const userId = parseBase64URLId(options.user.id);

    console.log("Challenge and userId parsed successfully");
    console.log(
      "Challenge type:",
      challenge instanceof Uint8Array ? "Uint8Array" : typeof challenge
    );
    console.log("Challenge length:", challenge.length);
    console.log(
      "UserId type:",
      userId instanceof Uint8Array ? "Uint8Array" : typeof userId
    );
    console.log("UserId length:", userId.length);

    // Create a PublicKeyCredentialCreationOptions object for Safari
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
      {
        challenge,
        rp: {
          name: options.rp.name,
          id: options.rp.id,
        },
        user: {
          id: userId,
          name: options.user.name || "",
          displayName: options.user.displayName || options.user.name || "",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        timeout: options.timeout || 60000,
        attestation: options.attestation || "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          requireResidentKey: true,
          residentKey: "required",
          userVerification: "required",
        },
      };

    console.log("Requesting credential creation from Safari WebAuthn API...");
    console.log(
      "Options prepared:",
      JSON.stringify(
        {
          rp: publicKeyCredentialCreationOptions.rp,
          authenticatorSelection:
            publicKeyCredentialCreationOptions.authenticatorSelection,
          timeout: publicKeyCredentialCreationOptions.timeout,
          attestation: publicKeyCredentialCreationOptions.attestation,
          pubKeyCredParams: publicKeyCredentialCreationOptions.pubKeyCredParams,
        },
        null,
        2
      )
    );

    // Safari requires a direct user gesture to create credentials
    const credential = await new Promise<PublicKeyCredential>(
      (resolve, reject) => {
        void (async () => {
          try {
            console.log("Calling navigator.credentials.create...");
            const cred = await navigator.credentials.create({
              publicKey: publicKeyCredentialCreationOptions,
            });

            if (!cred) {
              reject(new Error("No credential returned"));
              return;
            }

            resolve(cred as PublicKeyCredential);
          } catch (err) {
            console.error("Error in credentials.create:", err);
            reject(err);
          }
        })();
      }
    );

    console.log("Credential created successfully:", credential.id);

    // Format the credential response in a way that our server expects
    const credentialResponse: RegistrationResponseJSON = {
      id: credential.id,
      rawId: credential.id,
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: credential.getClientExtensionResults
        ? credential.getClientExtensionResults()
        : {},
      response: {
        attestationObject: arrayBufferToBase64(
          (credential.response as AuthenticatorAttestationResponse)
            .attestationObject
        ),
        clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
        transports: getTransports(
          credential.response as AuthenticatorAttestationResponse
        ),
      },
    };

    console.log("Successfully created credential with Safari native API");
    console.log("Credential response shape:", {
      id: credentialResponse.id,
      type: credentialResponse.type,
      response: {
        hasAttestationObject: !!credentialResponse.response.attestationObject,
        hasClientDataJSON: !!credentialResponse.response.clientDataJSON,
        transports: credentialResponse.response.transports,
      },
    });

    return credentialResponse;
  } catch (error) {
    console.error("Error in safariStartRegistration:", error);
    console.log("Trying fallback approach for Safari...");

    // Try with SimpleWebAuthn as a fallback
    try {
      console.log(
        "Creating simplified options structure for SimpleWebAuthn..."
      );
      // Try with a simplified structure for SimpleWebAuthn
      const fallbackOptions: PublicKeyCredentialCreationOptionsJSON = {
        challenge: options.challenge,
        rp: options.rp,
        user: {
          id: options.user.id,
          name: options.user.name,
          displayName: options.user.displayName || options.user.name,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout || 60000,
        attestation: options.attestation || "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform" as AuthenticatorAttachment,
          requireResidentKey: true,
          residentKey: "required" as ResidentKeyRequirement,
          userVerification: "preferred" as UserVerificationRequirement,
        },
        excludeCredentials: options.excludeCredentials || [],
      };

      console.log("Calling SimpleWebAuthn startRegistration...");
      const regResult = await startRegistration({
        optionsJSON: fallbackOptions,
      });

      console.log("SimpleWebAuthn registration successful");
      return regResult;
    } catch (fallbackError) {
      console.error("All fallback approaches failed:", fallbackError);

      // Make one final attempt with direct approach
      console.log(
        "Making one final attempt with direct PublicKeyCredential creation..."
      );
      try {
        // Ensure we have ArrayBuffer for challenge and user ID
        const rawChallenge = base64URLToUint8Array(options.challenge);
        const rawUserId = base64URLToUint8Array(options.user.id);

        const finalCredential = (await navigator.credentials.create({
          publicKey: {
            challenge: rawChallenge,
            rp: options.rp,
            user: {
              id: rawUserId,
              name: options.user.name,
              displayName: options.user.displayName || options.user.name,
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 }, // ES256
              { type: "public-key", alg: -257 }, // RS256
            ],
            timeout: 120000, // Longer timeout for final attempt
            authenticatorSelection: {
              authenticatorAttachment: "platform" as AuthenticatorAttachment,
              requireResidentKey: true,
              residentKey: "required" as ResidentKeyRequirement,
              userVerification: "required" as UserVerificationRequirement,
            },
            attestation: "none",
          },
        })) as PublicKeyCredential;

        if (!finalCredential) {
          throw new Error("Final attempt failed: No credential returned");
        }

        // Format response
        return {
          id: finalCredential.id,
          rawId: finalCredential.id,
          type: "public-key" as const,
          clientExtensionResults:
            finalCredential.getClientExtensionResults?.() || {},
          response: {
            attestationObject: arrayBufferToBase64(
              (finalCredential.response as AuthenticatorAttestationResponse)
                .attestationObject
            ),
            clientDataJSON: arrayBufferToBase64(
              finalCredential.response.clientDataJSON
            ),
            transports: getTransports(
              finalCredential.response as AuthenticatorAttestationResponse
            ),
          },
        };
      } catch (finalError) {
        console.error("All registration approaches failed:", finalError);
        throw new Error(
          `Safari WebAuthn registration failed: ${
            finalError instanceof Error
              ? finalError.message
              : String(finalError)
          }`
        );
      }
    }
  }
}

/**
 * Parse a base64URL-encoded challenge into a Uint8Array
 */
function parseBase64URLChallenge(challenge: string): Uint8Array {
  if (typeof challenge !== "string") {
    throw new Error("Challenge must be a string");
  }
  return base64URLToUint8Array(challenge);
}

/**
 * Convert a base64URL string to a Uint8Array
 */
function base64URLToUint8Array(base64url: string): Uint8Array {
  console.log("Converting base64url to Uint8Array, length:", base64url.length);
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Padded = base64 + padding;

  // Create binary string from base64
  const binary = atob(base64Padded);

  // Convert to Uint8Array
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  console.log("Converted to Uint8Array, length:", bytes.length);
  return bytes;
}

/**
 * Parse a base64URL-encoded ID into a Uint8Array
 */
function parseBase64URLId(id: string): Uint8Array {
  if (typeof id !== "string") {
    throw new Error("ID must be a string");
  }
  return base64URLToUint8Array(id);
}

/**
 * Get the transports from an authenticator response
 */
function getTransports(
  response: AuthenticatorAttestationResponse
): AuthenticatorTransportFuture[] {
  const transports = response.getTransports?.() || [];
  return transports.filter(
    (transport): transport is AuthenticatorTransportFuture =>
      ["ble", "hybrid", "internal", "nfc", "usb"].includes(transport)
  );
}

/**
 * Convert an ArrayBuffer to a base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
