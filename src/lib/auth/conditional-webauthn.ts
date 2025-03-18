import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import {
  getBrowserInfo,
  supportsConditionalMediation,
} from "./browser-detection";

// Add proper type imports for authenticator properties
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

interface WebAuthnError extends Error {
  name: string;
  message: string;
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
  const enhancedOptions: PublicKeyCredentialRequestOptionsJSON = {
    ...options,
    userVerification: "preferred",
    timeout: timeout,
  };

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
  const enhancedOptions: PublicKeyCredentialCreationOptionsJSON = {
    ...options,
    authenticatorSelection: {
      ...options.authenticatorSelection,
      authenticatorAttachment:
        authOptions.authenticatorAttachment || "platform",
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "preferred",
    },
    timeout: authOptions.timeout || 30000,
  };

  // Safari-specific adjustments
  if (browserInfo.browser === "Safari") {
    if (enhancedOptions.authenticatorSelection) {
      enhancedOptions.authenticatorSelection.userVerification = "preferred";
    }
    // Ensure timeout is not too long for Safari
    enhancedOptions.timeout = Math.min(authOptions.timeout || 30000, 120000);
  }

  // Chrome-specific adjustments
  if (browserInfo.browser === "Chrome") {
    if (enhancedOptions.authenticatorSelection) {
      enhancedOptions.authenticatorSelection.userVerification = "required";
    }
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
): Promise<AuthenticationResponseJSON> {
  try {
    const enhancedOptions = await prepareConditionalAuth(options, authOptions);
    return await startAuthentication(enhancedOptions);
  } catch (error) {
    const webAuthnError = error as WebAuthnError;
    // Handle specific error cases
    if (
      webAuthnError.name === "NotAllowedError" &&
      webAuthnError.message.includes("concurrent")
    ) {
      // Handle concurrent operation error (common in some browsers)
      throw new Error("Another authentication operation is in progress");
    }
    if (webAuthnError.name === "NotSupportedError") {
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
): Promise<RegistrationResponseJSON> {
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
        const safariOptions: EnhancedRegistrationOptions = {
          optionsJSON: {
            ...enhancedOptions.optionsJSON,
            authenticatorSelection: {
              ...enhancedOptions.optionsJSON.authenticatorSelection,
              userVerification: "preferred",
              residentKey: "required",
              requireResidentKey: true,
            },
            timeout: Math.min(authOptions.timeout || 60000, 120000),
          },
        };

        console.log(
          "Safari registration options:",
          JSON.stringify(safariOptions, null, 2)
        );

        // Start registration with the Safari-specific options
        const regResult = await startRegistration(safariOptions);
        return regResult;
      } catch (error) {
        const safariError = error as WebAuthnError;
        console.error("Safari-specific registration error:", safariError);

        // Try a simpler approach as fallback for Safari
        const fallbackOptions: EnhancedRegistrationOptions = {
          optionsJSON: {
            ...options,
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              requireResidentKey: true,
              residentKey: "required",
              userVerification: "preferred",
            },
            timeout: 60000,
          },
          useAutoRegister: false,
        };

        console.log(
          "Trying Safari fallback options:",
          JSON.stringify(fallbackOptions, null, 2)
        );
        return await startRegistration(fallbackOptions);
      }
    } else {
      // For other browsers, use the normal flow
      return await startRegistration(enhancedOptions);
    }
  } catch (error) {
    const webAuthnError = error as WebAuthnError;
    console.error("Registration error details:", webAuthnError);

    // Handle specific error cases
    if (
      webAuthnError.name === "NotAllowedError" &&
      webAuthnError.message.includes("concurrent")
    ) {
      throw new Error("Another registration operation is in progress");
    }

    if (webAuthnError.name === "NotSupportedError") {
      throw new Error(
        `WebAuthn registration not supported: ${webAuthnError.message}`
      );
    }

    // For any other error, throw with a descriptive message
    throw new Error(
      `WebAuthn registration failed: ${webAuthnError.message || String(error)}`
    );
  }
}

/**
 * Check if the environment supports optimal conditional WebAuthn
 */
export async function supportsOptimalConditionalWebAuthn(): Promise<{
  isSupported: boolean;
  limitations: string[];
}> {
  const browserInfo = getBrowserInfo();
  const hasConditionalSupport = await supportsConditionalMediation();
  const limitations: string[] = [];

  if (!hasConditionalSupport) {
    limitations.push("Conditional mediation not supported");
  }

  if (browserInfo.browser === "Safari") {
    limitations.push("Safari has limited conditional UI support");
  }

  if (browserInfo.browser === "Firefox") {
    limitations.push("Firefox has partial conditional UI support");
  }

  return {
    isSupported: hasConditionalSupport && browserInfo.browser === "Chrome",
    limitations,
  };
}
