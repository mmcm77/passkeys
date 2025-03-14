"use client";

import { useState, useEffect, useRef } from "react";
import {
  startAuthentication,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "authenticating" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [supportsAutofill, setSupportsAutofill] = useState(false);
  // Use a ref to track if we're currently in an authentication process
  const isAuthenticating = useRef(false);
  // Ref for the email input element
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Check if browser supports WebAuthn autofill on component mount
  useEffect(() => {
    let mounted = true;
    const checkAutofillSupport = async () => {
      try {
        const supported = await browserSupportsWebAuthnAutofill();
        if (!mounted) return;
        setSupportsAutofill(supported);

        // If autofill is supported, we can initialize it right away
        if (supported && !isAuthenticating.current) {
          try {
            // Get authentication options with no email (for conditional UI)
            const optionsResponse = await fetch(
              "/api/auth/authenticate/options",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "" }), // Empty email for conditional UI
              }
            );

            if (!mounted) return;
            if (optionsResponse.ok) {
              const { options, challengeId } = await optionsResponse.json();

              // Initialize conditional UI (this won't show a modal)
              // Add a small delay to ensure the DOM is fully loaded
              setTimeout(() => {
                if (!mounted || isAuthenticating.current) return;

                // Focus the email input to help trigger Chrome's autofill UI
                if (emailInputRef.current) {
                  emailInputRef.current.focus();
                }

                startAuthentication({
                  optionsJSON: options,
                  useBrowserAutofill: true,
                  // Don't verify the input element to avoid the error
                  verifyBrowserAutofillInput: false,
                })
                  .then(async (credential) => {
                    if (!mounted) return;
                    // Handle successful autofill authentication
                    isAuthenticating.current = true;
                    await verifyAuthentication(credential, challengeId);
                    isAuthenticating.current = false;
                  })
                  .catch((err) => {
                    // Silently handle errors for conditional UI
                    console.log("Conditional UI not triggered:", err);
                  });
              }, 300); // Reduced delay for better responsiveness
            }
          } catch (err) {
            // Silently handle errors for conditional UI initialization
            console.log("Error initializing conditional UI:", err);
          }
        }
      } catch (err) {
        console.error("Error checking WebAuthn support:", err);
      }
    };

    checkAutofillSupport();

    return () => {
      mounted = false;
    };
  }, []);

  // Add a separate effect to focus the input field when the component mounts
  useEffect(() => {
    // Focus the email input after a short delay to ensure the browser is ready
    const timer = setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // Don't start a new authentication if one is already in progress
    if (isAuthenticating.current) return;

    isAuthenticating.current = true;
    setStatus("authenticating");
    setError(null);

    try {
      // Get authentication options
      const optionsResponse = await fetch("/api/auth/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.error || "Failed to get authentication options");
      }

      const { options, challengeId } = await optionsResponse.json();

      // Start authentication with improved options
      const credential = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: supportsAutofill,
        verifyBrowserAutofillInput: false,
      });

      await verifyAuthentication(credential, challengeId);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Authentication failed");
      console.error(err);
      isAuthenticating.current = false;
    }
  }

  // Helper function to verify authentication
  async function verifyAuthentication(credential: any, challengeId: string) {
    try {
      // Verify authentication
      const verificationResponse = await fetch(
        "/api/auth/authenticate/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, challengeId }),
        }
      );

      if (!verificationResponse.ok) {
        const error = await verificationResponse.json();
        throw new Error(error.error || "Failed to verify authentication");
      }

      setStatus("success");

      // Redirect to dashboard after successful login
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Authentication failed");
      console.error(err);
      isAuthenticating.current = false;
    }
  }

  // Function to reset credentials for a user
  async function handleResetCredentials() {
    if (!email) {
      setError("Please enter your email address to reset credentials");
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset credentials");
      }

      // Show success message
      setStatus("idle");
      alert("Your credentials have been reset. Please register again.");

      // Redirect to register page
      window.location.href = "/register";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset credentials"
      );
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Sign In with Passkey</h2>
      </CardHeader>

      {status === "idle" && (
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                type="email"
                id="email"
                name="email"
                autoComplete="webauthn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
              {supportsAutofill && (
                <p className="text-xs text-muted-foreground">
                  Click in the field above to see your saved passkeys
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Sign In
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResetCredentials}
                className="text-sm text-muted-foreground hover:text-primary underline"
              >
                Reset Credentials
              </button>
            </div>
          </CardContent>
        </form>
      )}

      {status === "authenticating" && (
        <CardContent className="text-center py-4">
          <div className="animate-pulse">Authenticating...</div>
        </CardContent>
      )}

      {status === "success" && (
        <CardContent className="text-center py-4">
          <div className="text-green-600">Successfully authenticated!</div>
        </CardContent>
      )}

      {status === "error" && (
        <CardContent className="text-center py-4">
          <div className="text-destructive">{error}</div>
        </CardContent>
      )}
    </Card>
  );
}
