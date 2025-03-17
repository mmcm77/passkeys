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
    // Check if WebAuthn is available in the browser
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      console.log("Passkey support check: WebAuthn not available");
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

    // Check if conditional UI is supported
    const conditionalSupported =
      "conditional" in window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
        "function";

    if (!conditionalSupported) {
      console.log("Passkey support check: Conditional UI not supported");
      return false;
    }

    // Check if conditional mediation is available
    const isConditionalAvailable =
      await window.PublicKeyCredential.isConditionalMediationAvailable();

    if (!isConditionalAvailable) {
      console.log("Passkey support check: Conditional mediation not available");
      return false;
    }

    // Get additional WebAuthn capabilities
    const capabilities = await getWebAuthnCapabilities();
    console.log(
      "Passkey support check: Platform authenticator available:",
      capabilities.hasPlatformAuthenticator
    );

    // For full passkey support, we need platform authenticator
    return capabilities.hasPlatformAuthenticator;
  } catch (error) {
    console.error("Error checking passkey support:", error);
    return false;
  }
}
