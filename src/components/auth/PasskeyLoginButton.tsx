"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound, Smartphone } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { cn } from "@/lib/utils";
import { UserIcon, KeyIcon, ChevronRightIcon } from "lucide-react";

// Replace any with proper types
interface PasskeyLoginProps {
  email: string;
  onSuccess: (user: UserData) => void;
  onError: (error: Error) => void;
  buttonStyle?: "default" | "simplified" | "embedded";
  useBrowserAutofill?: boolean;
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
  useBrowserAutofill = false,
}: PasskeyLoginProps): ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  const handlePasskeyLogin = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Get authentication options from server
      const authResponse = await fetch(`/api/auth/authenticate/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

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
        useBrowserAutofill: useBrowserAutofill,
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
    <button
      className={cn(
        "w-full flex items-center justify-between rounded-md py-4 px-5 bg-card hover:bg-card/80 border border-border transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        buttonStyle === "embedded" ? "py-3 px-4" : ""
      )}
      disabled={isLoading}
      onClick={() => void handlePasskeyLogin()}
    >
      {isLoading ? (
        <div className="flex items-center justify-center w-full">
          <span className="animate-pulse">Authenticating...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center justify-center h-8 w-8 bg-muted rounded-full">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5">
                <KeyIcon className="h-3 w-3" />
              </div>
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="font-medium text-sm">Login with Passkey</span>
              <span className="text-muted-foreground text-xs">{email}</span>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
        </>
      )}
    </button>
  );
}
