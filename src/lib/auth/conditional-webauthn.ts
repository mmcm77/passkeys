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

type ResidentKeyRequirement = "discouraged" | "preferred" | "required";

interface ConditionalAuthOptions {
  mediation?: "conditional" | "optional" | "required" | "silent";
  timeout?: number;
  userVerification?: "required" | "preferred" | "discouraged";
  authenticatorAttachment?: "platform" | "cross-platform";
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
  try {
    const enhancedOptions = await prepareConditionalRegistration(
      options,
      authOptions
    );
    return await startRegistration(enhancedOptions);
  } catch (error: any) {
    // Handle specific error cases
    if (
      error.name === "NotAllowedError" &&
      error.message.includes("concurrent")
    ) {
      throw new Error("Another registration operation is in progress");
    }
    if (error.name === "NotSupportedError") {
      // Fall back to regular registration with non-resident key
      const fallbackOptions = {
        ...options,
        authenticatorSelection: {
          ...options.authenticatorSelection,
          requireResidentKey: false,
          residentKey: "preferred",
        },
      };
      return await startRegistration({
        optionsJSON: fallbackOptions,
        useAutoRegister: false,
      });
    }
    throw error;
  }
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
