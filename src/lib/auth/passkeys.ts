/**
 * Utility functions for passkey support detection
 */

import { getWebAuthnCapabilities } from "./browser-detection";

/**
 * Checks if the current browser supports passkeys
 * @returns Promise<boolean> - true if passkeys are supported
 */
export async function isPasskeySupported(): Promise<boolean> {
  try {
    console.log("Checking passkey support with current configuration...");

    // Check if WebAuthn is available in the browser
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      console.error("Passkey support check: WebAuthn not available");
      return false;
    }

    // For development environments, consider passkeys supported if WebAuthn is available
    const isDevelopment =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (isDevelopment) {
      console.log(
        "Development environment detected, relaxing passkey requirements"
      );
      return true;
    }

    // Check runtime configuration
    if (typeof window !== "undefined") {
      console.log("Current hostname:", window.location.hostname);
      console.log("Current origin:", window.location.origin);
    }

    // Get browser info for special cases
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMajorBrowser = isChrome || isSafari;

    console.log("Browser is Chrome:", isChrome);
    console.log("Browser is Safari:", isSafari);

    // Check if conditional UI is supported
    // Chrome and Safari have great passkey support, but detection can fail
    let conditionalSupported = false;

    if (isMajorBrowser) {
      // For Chrome and Safari, don't rely on property type checks that can fail
      conditionalSupported = true;
      console.log(
        `${
          isChrome ? "Chrome" : "Safari"
        } detected: assuming conditional UI is supported`
      );
    } else {
      conditionalSupported =
        "conditional" in window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
          "function";
    }

    if (!conditionalSupported) {
      console.error("Passkey support check: Conditional UI not supported");
      return false;
    }

    // Check if conditional mediation is available
    try {
      const isConditionalAvailable =
        await window.PublicKeyCredential.isConditionalMediationAvailable();

      if (!isConditionalAvailable) {
        console.error(
          "Passkey support check: Conditional mediation not available"
        );
        return false;
      }
    } catch (error) {
      // If there's an error checking conditional mediation but we're on Chrome or Safari,
      // we'll still proceed and assume it's supported
      if (!isMajorBrowser) {
        console.error("Error checking conditional mediation:", error);
        return false;
      }
      console.warn(
        `Error checking conditional mediation, but continuing for ${
          isChrome ? "Chrome" : "Safari"
        }`
      );
    }

    // Get additional WebAuthn capabilities
    const capabilities = await getWebAuthnCapabilities();
    console.log(
      "Platform authenticator available:",
      capabilities.hasPlatformAuthenticator
    );

    // For full passkey support, we need platform authenticator
    const supported = capabilities.hasPlatformAuthenticator;
    if (!supported) {
      console.error(
        "Passkey support check: Platform authenticator not available"
      );
    } else {
      console.log(
        "Passkey support check: All conditions met, passkeys are supported"
      );
    }

    // For Safari and Chrome, we'll explicitly return true even if some checks might fail
    // These browsers have proven passkey support
    if (isMajorBrowser && capabilities.hasPlatformAuthenticator) {
      console.log(
        `Enabling passkey support for ${isChrome ? "Chrome" : "Safari"}`
      );
      return true;
    }

    return supported;
  } catch (error) {
    console.error("Error checking passkey support:", error);
    return false;
  }
}
