"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  startAuthentication,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { useRouter } from "next/navigation";
import type { ConditionalAuthState } from "@/types/auth";

interface ConditionalAuthProps {
  onAuthSuccess?: (credential: any) => void;
  onAuthError?: (error: Error) => void;
  onNotSupported?: () => void;
  onStateChange?: (state: ConditionalAuthState) => void;
  emailInputId?: string;
}

declare global {
  interface Window {
    PublicKeyCredential: {
      isConditionalMediationAvailable(): Promise<boolean>;
      prototype: PublicKeyCredential;
    };
  }
}

export function ConditionalAuth({
  onAuthSuccess,
  onAuthError,
  onNotSupported,
  onStateChange,
  emailInputId = "auth-email",
}: ConditionalAuthProps) {
  const [state, setState] = useState<ConditionalAuthState>({
    active: false,
    status: "idle",
  });
  const router = useRouter();
  const isMounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const updateState = useCallback(
    (newState: Partial<ConditionalAuthState>) => {
      if (!isMounted.current) return;
      setState((prev) => {
        const updated = { ...prev, ...newState };
        // Call onStateChange in microtask to avoid render phase updates
        if (onStateChange) {
          Promise.resolve().then(() => onStateChange(updated));
        }
        return updated;
      });
    },
    [onStateChange]
  );

  // Check for conditional mediation support
  useEffect(() => {
    async function checkConditionalSupport() {
      try {
        // Check if conditional mediation is available
        if (
          !window.PublicKeyCredential ||
          !window.PublicKeyCredential.isConditionalMediationAvailable ||
          !(await window.PublicKeyCredential.isConditionalMediationAvailable())
        ) {
          if (isMounted.current) {
            onNotSupported?.();
          }
          return;
        }

        const capabilities = await getWebAuthnCapabilities();
        if (!isMounted.current) return;

        if (!capabilities.hasConditionalMediation) {
          onNotSupported?.();
          return;
        }
        updateState({ active: true });
      } catch (error) {
        if (isMounted.current) {
          onNotSupported?.();
        }
      }
    }

    checkConditionalSupport();
  }, [updateState, onNotSupported]);

  // Set up input listeners for conditional UI
  useEffect(() => {
    const emailInput = document.getElementById(
      emailInputId
    ) as HTMLInputElement;
    if (!emailInput) return;

    async function setupConditionalAuth() {
      if (state.status !== "idle") return;

      updateState({ status: "waiting" });

      try {
        // Fetch conditional UI options
        const response = await fetch("/api/auth/conditional-ui", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput.value }),
        });

        if (!response.ok) {
          throw new Error("Failed to get authentication options");
        }

        const { options, challengeId } = await response.json();

        // Attempt conditional authentication
        updateState({ status: "authenticating" });
        const credential = await startAuthentication({
          optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
          useBrowserAutofill: true,
        });

        // Verify the credential
        const verificationResponse = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, challengeId }),
        });

        if (!verificationResponse.ok) {
          throw new Error("Failed to verify credential");
        }

        const result = await verificationResponse.json();

        if (result.verified && isMounted.current) {
          updateState({ status: "success" });
          onAuthSuccess?.(credential);
          router.refresh();
        }
      } catch (error: any) {
        if (!isMounted.current) return;

        if (error.name === "NotAllowedError") {
          // User declined or dismissed the prompt - reset state
          updateState({ status: "idle" });
          return;
        }
        updateState({
          status: "error",
          error: error.message || "Authentication failed",
        });
        onAuthError?.(error);
      }
    }

    // Debounced handler for input events
    function handleInput() {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(setupConditionalAuth, 300);
    }

    // Handle both focus and input events
    emailInput.addEventListener("focus", handleInput);
    emailInput.addEventListener("input", handleInput);

    return () => {
      emailInput.removeEventListener("focus", handleInput);
      emailInput.removeEventListener("input", handleInput);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    emailInputId,
    state.status,
    updateState,
    onAuthSuccess,
    onAuthError,
    router,
  ]);

  // This component doesn't render anything
  return null;
}
