import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

/**
 * Utils for detecting browser capabilities for WebAuthn
 */

export interface BrowserInfo {
  browser: string;
  version: string;
  os: string;
  mobile: boolean;
  isWebAuthnSupported: boolean;
  isSecureContext: boolean;
}

/**
 * Gets detailed browser information
 */
export function getBrowserInfo(): BrowserInfo {
  let browser = "Unknown";
  let version = "Unknown";
  let os = "Unknown";
  let mobile = false;
  let isWebAuthnSupported = false;
  let isSecureContext = false;

  if (typeof window === "undefined") {
    return {
      browser,
      version,
      os,
      mobile,
      isWebAuthnSupported,
      isSecureContext,
    };
  }

  // Platform detection
  const ua = navigator.userAgent;
  isWebAuthnSupported = typeof window.PublicKeyCredential !== "undefined";
  isSecureContext = window.isSecureContext;

  // OS detection
  if (/Windows/.test(ua)) {
    os = "Windows";
  } else if (/Macintosh/.test(ua)) {
    os = "macOS";
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = "iOS";
    mobile = true;
  } else if (/Android/.test(ua)) {
    os = "Android";
    mobile = true;
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  // Browser detection
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browser = "Safari";
    const match = ua.match(/Version\/(\d+\.\d+)/);
    version = match?.[1] || "Unknown";
  } else if (/Firefox/.test(ua)) {
    browser = "Firefox";
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    version = match?.[1] || "Unknown";
  } else if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
    browser = "Chrome";
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    version = match?.[1] || "Unknown";
  } else if (/Edg/.test(ua)) {
    browser = "Edge";
    const match = ua.match(/Edg\/(\d+\.\d+)/);
    version = match?.[1] || "Unknown";
  }

  console.log(`Device detection - UserAgent: "${ua}"`);
  console.log(`Device detection - Platform: "${navigator.platform}"`);

  return {
    browser,
    version,
    os,
    mobile,
    isWebAuthnSupported,
    isSecureContext,
  };
}

/**
 * Detects the current device type based on user agent
 */
export function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const ua = navigator.userAgent;

  // Check if mobile
  if (
    /iPhone|Android.*Mobile|Mobile.*Android|Mobile Safari|Opera Mobi|Opera Mini|BlackBerry/.test(
      ua
    )
  ) {
    return "mobile";
  }

  // Check if tablet
  if (/iPad|Android(?!.*Mobile)|Tablet|PlayBook/.test(ua)) {
    return "tablet";
  }

  // Default to desktop
  return "desktop";
}

/**
 * Gets basic WebAuthn capabilities for the current browser
 * A synchronous version that doesn't perform any async checks
 */
export function getBasicWebAuthnCapabilities() {
  const browserInfo = getBrowserInfo();
  const isAvailable =
    typeof window !== "undefined" && "PublicKeyCredential" in window;

  // Check for conditional UI (autofill)
  const hasConditionalMediation =
    isAvailable &&
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    "conditional" in (window.PublicKeyCredential as any) &&
    "mediation" in (window.PublicKeyCredential as any).conditional;

  // Check for platform authenticator
  const hasPlatformAuthenticator =
    isAvailable &&
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    "isUserVerifyingPlatformAuthenticatorAvailable" in
      window.PublicKeyCredential;

  // Determine recommended action based on capabilities
  let recommendedAction;

  // Safari on iOS and macOS handles passkeys best
  if (
    browserInfo.browser === "Safari" &&
    (browserInfo.os === "macOS" || browserInfo.os === "iOS")
  ) {
    recommendedAction = "Use native passkey flow";
  }
  // Chrome has good passkey support
  else if (browserInfo.browser === "Chrome") {
    recommendedAction = "Use standard WebAuthn with platform authenticator";
  }
  // Firefox has limited support
  else if (browserInfo.browser === "Firefox") {
    recommendedAction = "Consider security key as fallback";
  }

  return {
    isAvailable,
    hasConditionalMediation,
    hasPlatformAuthenticator,
    browserInfo,
    recommendedAction,
  };
}

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
    console.log("Checking platform authenticator availability...");
    const result = await platformAuthenticatorIsAvailable();
    console.log("Platform authenticator available:", result);
    return result;
  } catch (error) {
    console.error("Error checking platform authenticator:", error);
    return false;
  }
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
