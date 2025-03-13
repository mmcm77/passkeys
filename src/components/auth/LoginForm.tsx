"use client";

import { useState, useEffect, useRef } from "react";
import {
  startAuthentication,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";

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
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Sign In with Passkey
      </h2>

      {status === "idle" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              name="email"
              autoComplete="webauthn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {supportsAutofill && (
              <p className="text-xs text-gray-500 mt-1">
                Click in the field above to see your saved passkeys
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In
          </button>

          <div className="text-center mt-4">
            <a
              href="/register"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Don't have a passkey? Register
            </a>
          </div>
        </form>
      )}

      {status === "authenticating" && (
        <div className="text-center py-8 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-700">Looking for your passkey...</p>
          <p className="text-sm text-gray-500">
            Follow the prompts from your browser or device.
          </p>
          <button
            onClick={() => {
              isAuthenticating.current = false;
              setStatus("idle");
            }}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Authentication successful!
          </p>
          <p className="text-gray-500">Redirecting to dashboard...</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Authentication failed
          </p>
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => {
              isAuthenticating.current = false;
              setStatus("idle");
            }}
            className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>

          {/* Add Reset Credentials button */}
          <button
            onClick={handleResetCredentials}
            className="mt-2 w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reset Credentials
          </button>

          <a
            href="/register"
            className="block mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            Register a New Passkey
          </a>
        </div>
      )}
    </div>
  );
}
