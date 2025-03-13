"use client";

import { useEffect } from "react";
import { browserSupportsWebAuthnAutofill } from "@simplewebauthn/browser";

// This component initializes WebAuthn as early as possible
// It's recommended to include this in the layout for Chrome
export default function WebAuthnInit() {
  useEffect(() => {
    // Check if the browser supports WebAuthn autofill
    const checkWebAuthnSupport = async () => {
      try {
        const supported = await browserSupportsWebAuthnAutofill();
        if (supported) {
          // Log support for debugging
          console.log("Browser supports WebAuthn autofill");

          // Pre-warm the WebAuthn API
          // This helps Chrome prepare for WebAuthn requests
          if (window.PublicKeyCredential) {
            try {
              // Check if conditional mediation is available
              // This is what enables the autofill experience
              const available = await (
                window.PublicKeyCredential as any
              ).isConditionalMediationAvailable?.();

              if (available) {
                console.log("Conditional mediation is available");
              }
            } catch (e) {
              console.log("Error checking conditional mediation:", e);
            }
          }
        }
      } catch (err) {
        console.error("Error checking WebAuthn support:", err);
      }
    };

    checkWebAuthnSupport();
  }, []);

  // This component doesn't render anything
  return null;
}
