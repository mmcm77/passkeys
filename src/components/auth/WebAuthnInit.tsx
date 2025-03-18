"use client";

import { useEffect } from "react";
import { browserSupportsWebAuthnAutofill } from "@simplewebauthn/browser";
import type { FC } from "react";

// This component initializes WebAuthn as early as possible
// It's recommended to include this in the layout for Chrome
const WebAuthnInit: FC = () => {
  useEffect(() => {
    // Check if the browser supports WebAuthn autofill
    const checkWebAuthnSupport = async (): Promise<void> => {
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
              const isAvailable =
                "isConditionalMediationAvailable" in window.PublicKeyCredential;
              if (isAvailable) {
                const available =
                  await window.PublicKeyCredential.isConditionalMediationAvailable();
                if (available) {
                  console.log("Conditional mediation is available");
                }
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

    // Void the promise to satisfy the no-floating-promises rule
    void checkWebAuthnSupport();
  }, []);

  // This component doesn't render anything
  return null;
};

export default WebAuthnInit;
