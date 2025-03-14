import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

/**
 * Checks if the browser supports conditional UI/mediation for WebAuthn
 * This is used for auto-filling passkeys without user interaction
 */
export async function supportsConditionalMediation(): Promise<boolean> {
  try {
    // Check if PublicKeyCredential exists and has conditional mediation support
    if (
      typeof window !== "undefined" &&
      window.PublicKeyCredential &&
      // @ts-ignore - Type 'PublicKeyCredential' has no index signature
      PublicKeyCredential.isConditionalMediationAvailable
    ) {
      // @ts-ignore - Method may not exist in all browsers
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if the device has platform authenticator (biometric/PIN) capability
 */
export async function hasPlatformAuthenticator(): Promise<boolean> {
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/**
 * Detects the current browser and its WebAuthn implementation details
 */
export function getBrowserInfo(): {
  browser: string;
  version: string;
  isWebAuthnSupported: boolean;
  isMobile: boolean;
  isSecureContext: boolean;
} {
  if (typeof window === "undefined") {
    return {
      browser: "unknown",
      version: "unknown",
      isWebAuthnSupported: false,
      isMobile: false,
      isSecureContext: false,
    };
  }

  const ua = window.navigator.userAgent;
  let browser = "unknown";
  let version = "unknown";

  // Detect browser and version
  if (ua.includes("Chrome/")) {
    browser = "Chrome";
    version = ua.match(/Chrome\/(\d+)/)?.[1] || "unknown";
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    version = ua.match(/Firefox\/(\d+)/)?.[1] || "unknown";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
    version = ua.match(/Version\/(\d+)/)?.[1] || "unknown";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    version = ua.match(/Edg\/(\d+)/)?.[1] || "unknown";
  }

  return {
    browser,
    version,
    isWebAuthnSupported: browserSupportsWebAuthn(),
    isMobile: /iPhone|iPad|iPod|Android/i.test(ua),
    isSecureContext: window.isSecureContext,
  };
}

/**
 * Comprehensive check for WebAuthn support and capabilities
 */
export async function getWebAuthnCapabilities(): Promise<{
  isAvailable: boolean;
  hasConditionalMediation: boolean;
  hasPlatformAuthenticator: boolean;
  browserInfo: ReturnType<typeof getBrowserInfo>;
  recommendedAction?: string;
}> {
  const browserInfo = getBrowserInfo();
  const [conditionalMediation, platformAuth] = await Promise.all([
    supportsConditionalMediation(),
    hasPlatformAuthenticator(),
  ]);

  let recommendedAction: string | undefined;

  // Determine recommended action based on capabilities
  if (!browserInfo.isWebAuthnSupported) {
    recommendedAction = "Update to a modern browser that supports WebAuthn";
  } else if (!browserInfo.isSecureContext) {
    recommendedAction = "Access the site using HTTPS";
  } else if (!platformAuth) {
    recommendedAction = "Set up device biometrics or PIN for better security";
  }

  return {
    isAvailable: browserInfo.isWebAuthnSupported,
    hasConditionalMediation: conditionalMediation,
    hasPlatformAuthenticator: platformAuth,
    browserInfo,
    recommendedAction,
  };
}

/**
 * Checks if the current browser environment is optimal for WebAuthn
 */
export async function isOptimalWebAuthnEnvironment(): Promise<{
  isOptimal: boolean;
  missingFeatures: string[];
}> {
  const capabilities = await getWebAuthnCapabilities();
  const missingFeatures: string[] = [];

  if (!capabilities.isAvailable) {
    missingFeatures.push("WebAuthn Support");
  }
  if (!capabilities.browserInfo.isSecureContext) {
    missingFeatures.push("Secure Context (HTTPS)");
  }
  if (!capabilities.hasPlatformAuthenticator) {
    missingFeatures.push("Platform Authenticator");
  }
  if (!capabilities.hasConditionalMediation) {
    missingFeatures.push("Conditional Mediation");
  }

  return {
    isOptimal: missingFeatures.length === 0,
    missingFeatures,
  };
}
