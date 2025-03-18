"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

// Replace any with proper types
interface PasskeyLoginProps {
  email: string;
  onSuccess: (user: UserData) => void;
  onError: (error: Error) => void;
  buttonStyle?: "default" | "simplified" | "embedded";
}

// Define a proper type for user data
interface UserData {
  id: string;
  email: string;
  passkeyCount?: number;
  deviceTypes?: string[];
  [key: string]: unknown; // Allow for additional properties
}

// Define types for authentication response
interface AuthResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeId: string;
}

export function PasskeyLoginButton({
  email,
  onSuccess,
  onError,
  buttonStyle = "default",
}: PasskeyLoginProps): ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  const handlePasskeyLogin = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Get authentication options from server
      const authResponse = await fetch(
        `/api/auth/authenticate/options?email=${encodeURIComponent(email)}`
      );

      if (!authResponse.ok) {
        throw new Error(
          `Failed to get authentication options: ${authResponse.status}`
        );
      }

      const { options, challengeId } =
        (await authResponse.json()) as AuthResponse;

      // Start authentication with proper options format
      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });

      // Verify authentication with server
      const verifyResponse = await fetch("/api/auth/authenticate/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: authenticationResponse,
          challengeId,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error(
          `Authentication verification failed: ${verifyResponse.status}`
        );
      }

      const userData = (await verifyResponse.json()) as {
        user: UserData;
        authenticated: boolean;
      };

      if (userData.authenticated && userData.user) {
        onSuccess(userData.user);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Passkey login error:", error);
      onError(
        error instanceof Error
          ? error
          : new Error("Unknown authentication error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Use the buttonStyle prop to customize the button appearance
  return (
    <Button
      className="w-full"
      variant="default"
      disabled={isLoading}
      onClick={() => void handlePasskeyLogin()}
    >
      {isLoading ? (
        "Authenticating..."
      ) : buttonStyle === "simplified" ? (
        "Continue with passkey"
      ) : (
        <>
          <KeyRound className="mr-2 h-4 w-4" />
          Sign in with passkey
        </>
      )}
    </Button>
  );
}
