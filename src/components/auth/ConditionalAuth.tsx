"use client";

import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { useRouter } from "next/navigation";

interface ConditionalAuthProps {
  onAuthSuccess?: (credential: any) => void;
  onAuthError?: (error: Error) => void;
  onNotSupported?: () => void;
}

export function ConditionalAuth({
  onAuthSuccess,
  onAuthError,
  onNotSupported,
}: ConditionalAuthProps) {
  const [isAttempting, setIsAttempting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const attemptAuth = async () => {
      try {
        // Only attempt once
        if (isAttempting) return;
        setIsAttempting(true);

        // Check browser capabilities
        const capabilities = await getWebAuthnCapabilities();
        if (!capabilities.hasConditionalMediation) {
          onNotSupported?.();
          return;
        }

        // Fetch conditional UI options
        const response = await fetch("/api/auth/conditional-ui", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to get authentication options");
        }

        const options = await response.json();

        // Attempt silent authentication
        const credential = await startAuthentication(options);

        // If component is still mounted and auth succeeded
        if (mounted) {
          // Verify the credential with your server
          const verificationResponse = await fetch("/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(credential),
          });

          if (!verificationResponse.ok) {
            throw new Error("Failed to verify credential");
          }

          const result = await verificationResponse.json();

          if (result.verified) {
            onAuthSuccess?.(credential);
            router.refresh();
          }
        }
      } catch (error: any) {
        // Only handle errors if component is still mounted
        if (mounted) {
          if (error.name === "NotAllowedError") {
            // User declined or dismissed the prompt
            return;
          }
          onAuthError?.(error);
        }
      } finally {
        if (mounted) {
          setIsAttempting(false);
        }
      }
    };

    attemptAuth();

    return () => {
      mounted = false;
    };
  }, [isAttempting, onAuthSuccess, onAuthError, onNotSupported, router]);

  // This component doesn't render anything
  return null;
}
