import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type AuthenticatorSelectionCriteria,
} from "@simplewebauthn/browser";
import {
  getBrowserInfo,
  supportsConditionalMediation,
} from "./browser-detection";

// Add proper type imports for authenticator properties
type ResidentKeyRequirement = "discouraged" | "preferred" | "required";
type AuthenticatorAttachment = "platform" | "cross-platform";
type UserVerificationRequirement = "required" | "preferred" | "discouraged";

interface ConditionalAuthOptions {
  mediation?: "conditional" | "optional" | "required" | "silent";
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  authenticatorAttachment?: AuthenticatorAttachment;
}

/**
 * Enhanced authentication options for conditional WebAuthn
 */
interface EnhancedAuthenticationOptions {
  optionsJSON: PublicKeyCredentialRequestOptionsJSON;
  useBrowserAutofill?: boolean;
  verifyBrowserAutofillInput?: boolean;
}

/**
 * Enhanced registration options for conditional WebAuthn
 */
interface EnhancedRegistrationOptions {
  optionsJSON: PublicKeyCredentialCreationOptionsJSON;
  useAutoRegister?: boolean;
}

/**
 * Prepares authentication options for conditional WebAuthn
 * Handles browser-specific requirements and limitations
 */
export async function prepareConditionalAuth(
  options: PublicKeyCredentialRequestOptionsJSON,
  authOptions: ConditionalAuthOptions = {}
): Promise<EnhancedAuthenticationOptions> {
  const browserInfo = getBrowserInfo();
  const hasConditionalSupport = await supportsConditionalMediation();

  // Default timeout (30 seconds)
  const timeout = authOptions.timeout || 30000;

  // Clone options to avoid mutating the original
  const enhancedOptions = { ...options };

  // Set default mediation based on browser support
  const mediation = hasConditionalSupport ? "conditional" : "optional";

  // Safari-specific adjustments
  if (browserInfo.browser === "Safari") {
    // Safari has specific requirements for conditional UI
    enhancedOptions.userVerification = "preferred";
    // Ensure timeout is not too long for Safari
    enhancedOptions.timeout = Math.min(timeout, 120000); // Max 2 minutes
  }

  // Chrome-specific adjustments
  if (browserInfo.browser === "Chrome") {
    // Chrome works best with these settings for conditional UI
    enhancedOptions.userVerification = "required";
    enhancedOptions.timeout = timeout;
  }

  // Firefox-specific adjustments
  if (browserInfo.browser === "Firefox") {
    // Firefox may need different settings
    enhancedOptions.userVerification = "preferred";
    enhancedOptions.timeout = timeout;
  }

  return {
    optionsJSON: enhancedOptions,
    useBrowserAutofill: hasConditionalSupport,
    verifyBrowserAutofillInput: true,
  };
}

/**
 * Prepares registration options for conditional WebAuthn
 * Handles browser-specific requirements and limitations
 */
export async function prepareConditionalRegistration(
  options: PublicKeyCredentialCreationOptionsJSON,
  authOptions: ConditionalAuthOptions = {}
): Promise<EnhancedRegistrationOptions> {
  const browserInfo = getBrowserInfo();

  // Clone options to avoid mutating the original
  const enhancedOptions = { ...options };

  // Set default authenticator selection if not provided
  if (!enhancedOptions.authenticatorSelection) {
    enhancedOptions.authenticatorSelection = {};
  }

  // Default to platform authenticator for better user experience
  enhancedOptions.authenticatorSelection.authenticatorAttachment =
    authOptions.authenticatorAttachment || "platform";

  // Set resident key requirement (needed for conditional UI)
  enhancedOptions.authenticatorSelection.residentKey = "required";
  enhancedOptions.authenticatorSelection.requireResidentKey = true;

  // Safari-specific adjustments
  if (browserInfo.browser === "Safari") {
    enhancedOptions.authenticatorSelection.userVerification = "preferred";
    // Ensure timeout is not too long for Safari
    enhancedOptions.timeout = Math.min(authOptions.timeout || 30000, 120000);
  }

  // Chrome-specific adjustments
  if (browserInfo.browser === "Chrome") {
    enhancedOptions.authenticatorSelection.userVerification = "required";
    enhancedOptions.timeout = authOptions.timeout || 30000;
  }

  return {
    optionsJSON: enhancedOptions,
    useAutoRegister: true,
  };
}

/**
 * Attempts conditional authentication with fallback to regular authentication
 */
export async function attemptConditionalAuth(
  options: PublicKeyCredentialRequestOptionsJSON,
  authOptions: ConditionalAuthOptions = {}
): Promise<any> {
  try {
    const enhancedOptions = await prepareConditionalAuth(options, authOptions);
    return await startAuthentication(enhancedOptions);
  } catch (error: any) {
    // Handle specific error cases
    if (
      error.name === "NotAllowedError" &&
      error.message.includes("concurrent")
    ) {
      // Handle concurrent operation error (common in some browsers)
      throw new Error("Another authentication operation is in progress");
    }
    if (error.name === "NotSupportedError") {
      // Fall back to regular authentication
      return await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: false,
      });
    }
    throw error;
  }
}

/**
 * Attempts conditional registration with fallback to regular registration
 */
export async function attemptConditionalRegistration(
  options: PublicKeyCredentialCreationOptionsJSON,
  authOptions: ConditionalAuthOptions = {}
): Promise<any> {
  const browserInfo = getBrowserInfo();
  console.log(
    `Attempting registration with browser: ${browserInfo.browser} ${browserInfo.version}`
  );

  try {
    const enhancedOptions = await prepareConditionalRegistration(
      options,
      authOptions
    );

    // For Safari, we need special handling
    if (browserInfo.browser === "Safari") {
      console.log("Using Safari-specific registration flow");
      try {
        // Ensure the options are properly structured for Safari
        const safariOptions = {
          ...enhancedOptions,
          // Ensure these Safari-specific settings are set
          optionsJSON: {
            ...enhancedOptions.optionsJSON,
            authenticatorSelection: {
              ...enhancedOptions.optionsJSON.authenticatorSelection,
              userVerification: "preferred" as UserVerificationRequirement,
              residentKey: "required" as ResidentKeyRequirement,
              requireResidentKey: true,
            },
            timeout: Math.min(authOptions.timeout || 60000, 120000), // Ensure timeout is reasonable
          },
        };

        console.log(
          "Safari registration options:",
          JSON.stringify(safariOptions, null, 2)
        );

        // Start registration with the Safari-specific options
        const regResult = await startRegistration(safariOptions);

        // Safari sometimes returns data in different formats, normalize it
        return sanitizeCredentialResponse(regResult);
      } catch (safariError) {
        console.error("Safari-specific registration error:", safariError);

        // Try a simpler approach as fallback for Safari
        const fallbackOptions = {
          optionsJSON: {
            ...options,
            authenticatorSelection: {
              authenticatorAttachment: "platform" as AuthenticatorAttachment,
              requireResidentKey: true,
              residentKey: "required" as ResidentKeyRequirement,
              userVerification: "preferred" as UserVerificationRequirement,
            },
            timeout: 60000,
          },
          useAutoRegister: false,
        };

        console.log(
          "Trying Safari fallback options:",
          JSON.stringify(fallbackOptions, null, 2)
        );
        return sanitizeCredentialResponse(
          await startRegistration(fallbackOptions)
        );
      }
    } else {
      // For other browsers, use the normal flow
      return await startRegistration(enhancedOptions);
    }
  } catch (error: any) {
    console.error("Registration error details:", error);

    // Handle specific error cases
    if (
      error.name === "NotAllowedError" &&
      error.message.includes("concurrent")
    ) {
      throw new Error("Another registration operation is in progress");
    }

    if (
      error.name === "NotSupportedError" ||
      (error.message && error.message.includes("base64URLString.replace"))
    ) {
      console.log(
        "Using fallback registration approach due to:",
        error.message
      );

      // Fall back to regular registration with non-resident key
      const fallbackOptions = {
        optionsJSON: {
          ...options,
          authenticatorSelection: {
            authenticatorAttachment: "platform" as AuthenticatorAttachment,
            requireResidentKey: false,
            residentKey: "preferred" as ResidentKeyRequirement,
            userVerification: "preferred" as UserVerificationRequirement,
          },
          timeout: 60000,
        },
        useAutoRegister: false,
      };

      return sanitizeCredentialResponse(
        await startRegistration(fallbackOptions)
      );
    }

    throw error;
  }
}

/**
 * Ensures credential data is properly formatted before sending to the server
 * This is important for Safari which may handle base64URL differently
 */
function sanitizeCredentialResponse(credential: any): any {
  if (!credential) return credential;

  // Clone to avoid modifying the original
  const sanitized = { ...credential };

  // Ensure response data is present and properly formatted
  if (sanitized.response) {
    // Handle clientDataJSON
    if (
      sanitized.response.clientDataJSON &&
      typeof sanitized.response.clientDataJSON === "string"
    ) {
      try {
        // Ensure it's properly parsed
        JSON.parse(atob(sanitized.response.clientDataJSON));
      } catch (e) {
        console.warn("Fixing malformed clientDataJSON");
        // If parsing fails, it might not be properly base64 encoded
        sanitized.response.clientDataJSON = btoa(
          sanitized.response.clientDataJSON
        );
      }
    }

    // Handle other binary fields that might need encoding
    ["attestationObject", "authenticatorData"].forEach((field) => {
      if (
        sanitized.response[field] &&
        typeof sanitized.response[field] === "object" &&
        !ArrayBuffer.isView(sanitized.response[field])
      ) {
        console.warn(`Converting ${field} to ArrayBuffer`);
        // Convert to proper ArrayBuffer if needed
        sanitized.response[field] = new Uint8Array(
          Object.values(sanitized.response[field])
        ).buffer;
      }
    });
  }

  return sanitized;
}

/**
 * Checks if the current browser environment supports optimal conditional WebAuthn
 */
export async function supportsOptimalConditionalWebAuthn(): Promise<{
  isSupported: boolean;
  limitations: string[];
}> {
  const browserInfo = getBrowserInfo();
  const hasConditionalSupport = await supportsConditionalMediation();
  const limitations: string[] = [];

  if (!hasConditionalSupport) {
    limitations.push("No conditional UI support");
  }

  // Browser-specific limitations
  switch (browserInfo.browser) {
    case "Safari":
      if (parseInt(browserInfo.version) < 16) {
        limitations.push("Safari version below optimal support (16+)");
      }
      break;
    case "Chrome":
      if (parseInt(browserInfo.version) < 108) {
        limitations.push("Chrome version below optimal support (108+)");
      }
      break;
    case "Firefox":
      limitations.push("Limited conditional UI support in Firefox");
      break;
    default:
      limitations.push("Browser support unknown");
  }

  return {
    isSupported: limitations.length === 0,
    limitations,
  };
}
