"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCcw,
  ArrowLeft,
} from "lucide-react";
import {
  startAuthentication,
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { RecentEmails } from "./RecentEmails";
import { addRecentEmail } from "@/lib/recentEmails";
import { ConditionalAuth } from "./ConditionalAuth";
import { PasskeyIndicator } from "../ui/PasskeyIndicator";
import type { ConditionalAuthState } from "@/types/auth";

type AuthState =
  | "initial"
  | "submitting"
  | "checking"
  | "success"
  | "error"
  | "authenticated"
  | "registering";

type AuthError = {
  code: string;
  message: string;
  action?: string;
};

// Enhanced response type to match the API
interface UserExistsResponse {
  exists: boolean;
  hasPasskeys: boolean;
  suggestedAction?: "authenticate" | "register" | "addPasskey";
  passkeyCount?: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

type ApiResponse = UserExistsResponse | ErrorResponse;

type AuthenticatedUser = {
  userId: string;
  email: string;
  hasPasskey: boolean;
  passkeyCount: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
};

interface AuthContainerProps {
  defaultMode?: "signin" | "register";
  onAuthSuccess?: (user: AuthenticatedUser) => void;
}

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// User verification status
type VerificationStatus = {
  exists: boolean;
  hasPasskeys: boolean;
  suggestedAction: "authenticate" | "register" | "addPasskey";
  passkeyCount: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
};

interface AuthenticationState {
  challengeId: string;
  options: any;
}

export default function AuthContainer({
  defaultMode = "signin",
  onAuthSuccess,
}: AuthContainerProps) {
  // Enhanced state management
  const [mode, setMode] = useState<"signin" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("initial");
  const [errorDetails, setErrorDetails] = useState<AuthError | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // New state variables for enhanced user status tracking
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);
  const [isNewUserRegistration, setIsNewUserRegistration] = useState(false);
  const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<
    number | null
  >(null);

  // Track API response timing for security
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);

  // Add authentication functions
  const [authenticationState, setAuthenticationState] =
    useState<AuthenticationState | null>(null);

  // Add effect to handle recent email selection
  const [selectedRecentEmail, setSelectedRecentEmail] = useState<string | null>(
    null
  );

  const [isConditionalAuthEnabled, setIsConditionalAuthEnabled] =
    useState(false);

  const [conditionalAuthState, setConditionalAuthState] =
    useState<ConditionalAuthState>({
      active: false,
      status: "idle",
    });

  // Handle animation states with transition tracking
  useEffect(() => {
    if (authState !== "initial") {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [authState]);

  // Add new effect to prevent animations during biometric confirmation
  useEffect(() => {
    if (authState === "registering") {
      setIsAnimating(false);
    }
  }, [authState]);

  // Reset verification status when mode changes
  useEffect(() => {
    if (mode === "signin" || !isNewUserRegistration) {
      setVerificationStatus(null);
      setAuthenticatedUser(null);
      setError(null);
      setErrorDetails(null);
      setTimeout(() => {
        setAuthState("initial");
      }, 300);
    }
  }, [mode]);

  // Handle API response timing
  useEffect(() => {
    if (lastAttemptTimestamp && apiResponseTime) {
      const responseDelay = Date.now() - lastAttemptTimestamp;
      // If response is too quick (< 500ms) or too slow (> 3000ms), show warning
      if (responseDelay < 500 || responseDelay > 3000) {
        console.warn("Unusual API response time detected:", responseDelay);
      }
    }
  }, [lastAttemptTimestamp, apiResponseTime]);

  // Add effect to handle recent email selection
  useEffect(() => {
    if (selectedRecentEmail) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      setSelectedRecentEmail(null); // Reset after handling
    }
  }, [selectedRecentEmail]);

  // Add effect to check for conditional auth support
  useEffect(() => {
    const checkConditionalSupport = async () => {
      const capabilities = await getWebAuthnCapabilities();
      setIsConditionalAuthEnabled(capabilities.hasConditionalMediation);
    };
    checkConditionalSupport();
  }, []);

  // Handle conditional auth state changes
  const handleConditionalAuthStateChange = useCallback(
    (state: ConditionalAuthState) => {
      console.log("Conditional auth state changed:", state);
      setConditionalAuthState(state);
    },
    []
  );

  // Effect to handle conditional auth state updates
  useEffect(() => {
    // Update UI state based on conditional auth status
    switch (conditionalAuthState.status) {
      case "authenticating":
        setAuthState("submitting");
        break;
      case "success":
        setAuthState("authenticated");
        break;
      case "error":
        if (conditionalAuthState.error) {
          handleError(new Error(conditionalAuthState.error));
        }
        break;
    }
  }, [conditionalAuthState]);

  const validateEmailFormat = (email: string): ValidationResult => {
    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email.trim()) {
      return {
        isValid: false,
        error: "Email is required",
      };
    }

    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: "Please enter a valid email address",
      };
    }

    // Additional checks for common mistakes
    if (email.includes("..")) {
      return {
        isValid: false,
        error: "Email cannot contain consecutive dots",
      };
    }

    if (email.length > 254) {
      return {
        isValid: false,
        error: "Email address is too long",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  };

  const validateEmail = (
    email: string,
    shouldSetError = true
  ): ValidationResult => {
    const result = validateEmailFormat(email);

    if (shouldSetError) {
      setError(result.error);
    }

    return result;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsDirty(true);

    // Only validate if the field is dirty and not empty
    if (newEmail.trim()) {
      validateEmail(newEmail, true);
    } else {
      setError(null);
    }

    // Ensure the input event is triggered for conditional UI
    e.target.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const handleError = (error: unknown) => {
    setAuthState("error");

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("network")) {
        setErrorDetails({
          code: "NETWORK_ERROR",
          message: "Unable to connect to the authentication service",
          action: "Please check your internet connection and try again",
        });
      } else if (error.message.includes("timeout")) {
        setErrorDetails({
          code: "TIMEOUT_ERROR",
          message: "The request took too long to complete",
          action: "Please try again. If the problem persists, contact support",
        });
      } else {
        setErrorDetails({
          code: "UNKNOWN_ERROR",
          message: error.message,
          action: "Please try again or contact support if the problem persists",
        });
      }
    } else {
      setErrorDetails({
        code: "UNEXPECTED_ERROR",
        message: "An unexpected error occurred",
        action: "Please try again later",
      });
    }
  };

  const handleRetry = () => {
    setAuthState("initial");
    setErrorDetails(null);
    setError(null);
    setIsDirty(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorDetails(null);
    setVerificationStatus(null);
    setAuthenticatedUser(null);
    setIsNewUserRegistration(false);
    setLastAttemptTimestamp(Date.now());

    // Use email state directly instead of form event
    const validationResult = validateEmail(email);
    if (!validationResult.isValid) {
      handleError(new Error(validationResult.error || "Invalid email"));
      return;
    }

    try {
      setAuthState("submitting");
      setIsSubmitting(true);

      const response = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      setApiResponseTime(Date.now());

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error);
      }

      const data = (await response.json()) as UserExistsResponse;
      setVerificationStatus({
        exists: data.exists,
        hasPasskeys: data.hasPasskeys,
        suggestedAction: data.suggestedAction || "register",
        passkeyCount: data.passkeyCount || 0,
        lastPasskeyAddedAt: data.lastPasskeyAddedAt,
        deviceTypes: data.deviceTypes,
      });

      setAuthState("checking");

      // Handle user state transitions
      if (data.exists) {
        if (mode === "register") {
          // User exists but trying to register
          handleError({
            code: "EMAIL_IN_USE",
            message: "This email is already registered",
            action: "Would you like to sign in instead?",
          });
          setTimeout(() => {
            setMode("signin");
            setTimeout(() => handleRetry(), 300);
          }, 2000);
          return;
        }

        // Update authenticated user state
        const user: AuthenticatedUser = {
          userId: crypto.randomUUID(), // Placeholder until actual user ID is available
          email,
          hasPasskey: data.hasPasskeys,
          passkeyCount: data.passkeyCount || 0,
          lastPasskeyAddedAt: data.lastPasskeyAddedAt,
          deviceTypes: data.deviceTypes,
        };
        setAuthenticatedUser(user);

        // Show brief checking message before transitioning
        setAuthState("checking");

        // Brief delay for UI feedback
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Transition based on passkey status
        if (data.hasPasskeys) {
          // Directly initiate authentication without success state
          initiateAuthentication(email);
        } else {
          setAuthState("success"); // Show passkey setup prompt for users without passkeys
        }
      } else {
        // New user case
        setIsNewUserRegistration(true);
        setAuthState("checking");

        // Brief delay for UI feedback
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Create new user object
        const newUser: AuthenticatedUser = {
          userId: crypto.randomUUID(),
          email,
          hasPasskey: false,
          passkeyCount: 0,
        };
        setAuthenticatedUser(newUser);

        // Directly transition to registration without mode change
        setAuthState("registering");
        initiateRegistration(email);
      }
    } catch (error) {
      console.error("Form submission failed:", error);
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeChange = () => {
    setMode(mode === "signin" ? "register" : "signin");
    setError(null);
    setErrorDetails(null);
    setIsDirty(false);
    setAuthState("initial");
    setAuthenticatedUser(null);
  };

  // Get input status classes
  const getInputStatusClasses = () => {
    if (!isDirty) return "w-full";
    if (error)
      return "w-full border-destructive focus-visible:ring-destructive";
    if (email && !error)
      return "w-full border-green-500 focus-visible:ring-green-500";
    return "w-full";
  };

  // Add authentication functions
  const initiateAuthentication = async (email: string) => {
    try {
      // Set registering state immediately to show full context UI
      setAuthState("registering");
      const response = await fetch("/api/auth/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to get authentication options");
      }

      const optionsData = await response.json();
      // Already in registering state, maintain UI context

      // Start browser authentication - UI context remains
      try {
        const authResponse = await startAuthentication(optionsData.options);

        // Send verification request - UI context still maintained
        const verifyResponse = await fetch("/api/auth/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: authResponse,
            challengeId: optionsData.challengeId,
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(
            errorData.error || "Authentication verification failed"
          );
        }

        const data = await verifyResponse.json();

        // Only change state after successful verification
        if (data.user) {
          const user: AuthenticatedUser = {
            userId: data.user.id,
            email: data.user.email,
            hasPasskey: true,
            passkeyCount: verificationStatus?.passkeyCount || 1,
            lastPasskeyAddedAt: verificationStatus?.lastPasskeyAddedAt,
            deviceTypes: verificationStatus?.deviceTypes,
          };
          setAuthenticatedUser(user);
          onAuthSuccess?.(user);
          addRecentEmail(email);
          setAuthState("authenticated");
        }
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          handleError(new Error("Authentication was cancelled"));
        } else {
          handleError(error);
        }
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      handleError(error);
    }
  };

  // Add registration function
  const initiateRegistration = async (email: string) => {
    try {
      // Set registering state immediately to show full context UI
      setAuthState("registering");

      // Get registration options
      const response = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName: email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get registration options");
      }

      const optionsData = await response.json();

      // Ensure we're still in registering state before proceeding
      setAuthState("registering");

      try {
        // Start registration - maintain the registering state and UI
        const authResponse = await startRegistration(optionsData);

        // Keep registering state during verification
        const verifyResponse = await fetch("/api/auth/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: authResponse,
            challengeId: optionsData.challengeId,
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(
            errorData.error || "Registration verification failed"
          );
        }

        const data = await verifyResponse.json();

        // Only change state after successful verification
        if (data.user) {
          const user: AuthenticatedUser = {
            userId: data.user.id,
            email: data.user.email,
            hasPasskey: true,
            passkeyCount: 1,
            lastPasskeyAddedAt: Date.now(),
            deviceTypes: ["platform"],
          };
          setAuthenticatedUser(user);
          onAuthSuccess?.(user);
          addRecentEmail(email);
          await new Promise((resolve) => setTimeout(resolve, 300));
          setAuthState("authenticated");
        }
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          handleError(new Error("Registration was cancelled"));
        } else {
          handleError(error);
        }
      }
    } catch (error) {
      console.error("Registration failed:", error);
      handleError(error);
    }
  };

  // Handle conditional auth success
  const handleConditionalAuthSuccess = async (credential: any) => {
    try {
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

      if (result.verified && result.user) {
        const user: AuthenticatedUser = {
          userId: result.user.id,
          email: result.user.email,
          hasPasskey: true,
          passkeyCount: result.user.passkeyCount || 1,
          lastPasskeyAddedAt: result.user.lastPasskeyAddedAt,
          deviceTypes: result.user.deviceTypes,
        };
        setAuthenticatedUser(user);
        onAuthSuccess?.(user);

        // Add to recent emails if not already present
        if (result.user.email) {
          addRecentEmail(result.user.email);
        }
      }
    } catch (error) {
      handleError(error);
    }
  };

  // Handle conditional auth error
  const handleConditionalAuthError = (error: Error) => {
    // Only show error if it's not a user dismissal
    if (error.name !== "NotAllowedError") {
      handleError(error);
    }
  };

  // Handle conditional auth not supported
  const handleConditionalAuthNotSupported = () => {
    setConditionalAuthState((prev) => ({ ...prev, active: false }));
  };

  // Update the handleEmailSelection function
  const handleEmailSelection = useCallback(
    (selectedEmail: string) => {
      console.log("Email selected:", selectedEmail);

      // Update state
      setEmail(selectedEmail);

      // Directly submit form after a brief delay to allow state update
      setTimeout(() => {
        // Find the actual form element
        const form = document.querySelector("form");
        if (form) {
          // Create a synthetic submit event
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });

          // Directly call the handleSubmit function bound to the form
          form.dispatchEvent(submitEvent);
        }
      }, 50);
    },
    [setEmail]
  );

  const renderAuthStateContent = () => {
    const baseTransition =
      "motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-in-out";

    // Remove animations for registering and authentication flows
    const fadeIn = `${baseTransition} ${
      isAnimating &&
      !isNewUserRegistration &&
      authState !== "registering" &&
      !(verificationStatus?.exists && verificationStatus.hasPasskeys)
        ? "opacity-0 scale-95"
        : "opacity-100 scale-100"
    }`;

    // Enhanced status messages based on verification status
    const getStatusMessage = () => {
      if (isNewUserRegistration) return "Welcome! Setting up your passkey...";
      if (verificationStatus?.exists) {
        return verificationStatus.hasPasskeys
          ? "Welcome back! Preparing your passkey..."
          : "Welcome back! Please set up your passkey...";
      }
      return mode === "signin"
        ? "Checking your account..."
        : "Setting up your account...";
    };

    switch (authState) {
      case "submitting":
        return (
          <div className={`text-center space-y-4 py-2 ${fadeIn}`}>
            <div className="relative inline-flex">
              <Loader2 className="h-8 w-8 motion-safe:animate-spin text-primary" />
              <div className="absolute inset-0 motion-safe:animate-ping opacity-50">
                <Loader2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground motion-safe:animate-fade-in">
              {mode === "signin"
                ? "Initiating sign in process..."
                : "Setting up your account..."}
            </p>
          </div>
        );

      case "checking":
        return (
          <div className={`text-center space-y-4 py-2 ${fadeIn}`}>
            <div className="relative inline-flex">
              <CheckCircle2 className="h-8 w-8 text-primary motion-safe:animate-bounce" />
            </div>
            <p className="text-sm text-muted-foreground motion-safe:animate-fade-in">
              {getStatusMessage()}
            </p>
            {verificationStatus?.exists && verificationStatus.hasPasskeys && (
              <div className="text-xs text-muted-foreground/80 motion-safe:animate-fade-in">
                <p>Found your passkey - preparing to authenticate...</p>
                {verificationStatus.passkeyCount > 0 && (
                  <p className="mt-1">
                    {verificationStatus.passkeyCount} registered passkey(s)
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case "error":
        return (
          <div className={`space-y-6 py-2 ${fadeIn}`}>
            <div className="text-center space-y-2">
              <div className="relative inline-flex">
                <XCircle className="h-12 w-12 text-destructive motion-safe:animate-shake" />
              </div>
              <h3 className="text-lg font-semibold text-destructive motion-safe:transition-colors">
                {errorDetails?.code === "NETWORK_ERROR"
                  ? "Connection Error"
                  : "Authentication Error"}
              </h3>
              <p className="text-sm text-destructive/90 motion-safe:animate-fade-in">
                {errorDetails?.message}
              </p>
              {errorDetails?.action && (
                <p className="text-sm text-muted-foreground mt-2 motion-safe:animate-fade-in">
                  {errorDetails.action}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                variant="default"
                onClick={handleRetry}
                className="w-full motion-safe:transition-transform motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
              >
                <RefreshCcw className="h-4 w-4 mr-2 motion-safe:transition-transform motion-safe:group-hover:rotate-180" />
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  handleRetry();
                  setEmail("");
                }}
                className="w-full motion-safe:transition-transform motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4 mr-2 motion-safe:transition-transform motion-safe:group-hover:-translate-x-1" />
                Start Over
              </Button>
            </div>

            {errorDetails?.code === "NETWORK_ERROR" && (
              <div className={`bg-muted p-3 rounded-md mt-4 ${fadeIn}`}>
                <h4 className="text-sm font-medium mb-2">
                  Troubleshooting steps:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li className="motion-safe:animate-fade-in-up [animation-delay:100ms]">
                    Check your internet connection
                  </li>
                  <li className="motion-safe:animate-fade-in-up [animation-delay:200ms]">
                    Ensure you're not using a VPN that might block access
                  </li>
                  <li className="motion-safe:animate-fade-in-up [animation-delay:300ms]">
                    Clear your browser cache and try again
                  </li>
                  <li className="motion-safe:animate-fade-in-up [animation-delay:400ms]">
                    If problems persist, contact support
                  </li>
                </ul>
              </div>
            )}
          </div>
        );

      case "success":
        // Skip rendering success state for new user registration
        if (isNewUserRegistration) {
          return renderAuthStateContent(); // Re-render current state without transition
        }
        return (
          <div className={`text-center space-y-4 py-2 ${fadeIn}`}>
            <div className="relative inline-flex">
              <CheckCircle2 className="h-12 w-12 text-green-500 motion-safe:animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-700 motion-safe:animate-fade-in">
                {verificationStatus?.exists
                  ? verificationStatus.hasPasskeys
                    ? "Welcome back!"
                    : "Set up your passkey"
                  : "Welcome! Let's secure your account"}
              </h3>
              <p className="text-sm text-muted-foreground motion-safe:animate-fade-in">
                {email}
              </p>
              {verificationStatus && (
                <div className="space-y-1 text-xs text-muted-foreground/80 motion-safe:animate-fade-in">
                  {verificationStatus.exists ? (
                    verificationStatus.hasPasskeys ? (
                      <>
                        <p>
                          Last used:{" "}
                          {new Date(
                            verificationStatus.lastPasskeyAddedAt || 0
                          ).toLocaleDateString()}
                        </p>
                        <p>
                          {verificationStatus.passkeyCount}{" "}
                          {verificationStatus.passkeyCount === 1
                            ? "passkey"
                            : "passkeys"}{" "}
                          registered
                        </p>
                        {!authenticationState && (
                          <Button
                            variant="default"
                            className="mt-4 w-full motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
                            onClick={() => initiateAuthentication(email)}
                            disabled={!browserSupportsWebAuthn()}
                          >
                            {browserSupportsWebAuthn()
                              ? "Sign in with Passkey"
                              : "Passkeys not supported"}
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <p>Enhance your security with a passkey</p>
                        <Button
                          variant="default"
                          className="mt-4 w-full motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
                          onClick={() => initiateRegistration(email)}
                          disabled={!browserSupportsWebAuthn()}
                        >
                          Create Passkey
                        </Button>
                      </>
                    )
                  ) : null}
                </div>
              )}
            </div>
          </div>
        );

      case "authenticated":
        return (
          <div className={`text-center space-y-4 py-2 ${fadeIn}`}>
            <div className="relative inline-flex">
              <CheckCircle2 className="h-12 w-12 text-green-500 motion-safe:animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-700 motion-safe:animate-fade-in">
                You did it!
              </h3>
              <p className="text-sm text-muted-foreground motion-safe:animate-fade-in">
                Successfully authenticated with passkey
              </p>
              {authenticatedUser && (
                <div className="text-xs text-muted-foreground/80 mt-2 motion-safe:animate-fade-in">
                  <p>Signed in as {authenticatedUser.email}</p>
                  <p className="mt-1">
                    {authenticatedUser.passkeyCount}{" "}
                    {authenticatedUser.passkeyCount === 1
                      ? "passkey"
                      : "passkeys"}{" "}
                    available
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "registering":
        return (
          <div className="text-center space-y-6 py-2 relative">
            {/* Add relative positioning to ensure content stays above modal overlay */}
            <div className="relative z-10">
              <div className="relative inline-flex">
                <Loader2 className="h-12 w-12 text-primary motion-safe:animate-spin" />
                <div className="absolute inset-0 motion-safe:animate-ping opacity-50">
                  <Loader2 className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">
                  Setting Up Your Passkey
                </h3>
                <p className="text-sm text-muted-foreground">
                  Follow your browser's prompts to create your passkey
                </p>

                <div className="space-y-3 text-sm text-muted-foreground/80 bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-primary/90">
                    What to expect:
                  </h4>
                  <ul className="space-y-2 text-left list-none">
                    <li className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        1
                      </div>
                      Your browser will ask for biometric verification
                      (fingerprint, face, etc.)
                    </li>
                    <li className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        2
                      </div>
                      You may need to set up a PIN if not already configured
                    </li>
                    <li className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        3
                      </div>
                      Your device will securely store the passkey
                    </li>
                  </ul>
                </div>

                <div className="text-xs text-muted-foreground/70 bg-muted/30 rounded-lg p-3">
                  <p className="font-medium mb-2">💡 Pro Tips:</p>
                  <ul className="space-y-1 text-left list-disc list-inside">
                    <li>Make sure your device's biometric sensors are clean</li>
                    <li>Keep your security key nearby if you're using one</li>
                    <li>Don't refresh or close this page during setup</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={fadeIn}>
            <div className="space-y-4">
              <RecentEmails onSelect={handleEmailSelection} />
              <div className="space-y-2">
                <Label
                  htmlFor="auth-email"
                  className={`motion-safe:transition-colors motion-safe:duration-200 ${
                    isSubmitting ? "text-muted-foreground" : ""
                  }`}
                >
                  Email address
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="auth-email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => {
                      setIsDirty(true);
                      if (email) validateEmail(email);
                    }}
                    required
                    autoComplete="webauthn"
                    className={`${getInputStatusClasses()} 
                      motion-safe:transition-all motion-safe:duration-200
                      ${isSubmitting ? "bg-muted text-muted-foreground" : ""}
                      motion-safe:focus:scale-[1.01]`}
                    aria-describedby={
                      error ? "auth-error" : "email-description"
                    }
                    aria-invalid={error ? "true" : "false"}
                    disabled={isSubmitting}
                  />
                  {isSubmitting && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 motion-safe:transition-opacity">
                      <Loader2 className="h-4 w-4 motion-safe:animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-h-[20px] motion-safe:transition-all motion-safe:duration-200">
                  {error ? (
                    <p
                      id="auth-error"
                      className="text-sm text-destructive motion-safe:animate-fade-in"
                    >
                      {error}
                    </p>
                  ) : (
                    <p
                      id="email-description"
                      className={`text-sm text-muted-foreground motion-safe:transition-opacity motion-safe:duration-200 ${
                        isSubmitting ? "opacity-50" : ""
                      }`}
                    >
                      Enter your email to continue
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
                disabled={isSubmitting || (isDirty && !!error)}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2 motion-safe:animate-fade-in">
                    <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <ConditionalAuth
          onAuthSuccess={handleConditionalAuthSuccess}
          onAuthError={handleConditionalAuthError}
          onNotSupported={handleConditionalAuthNotSupported}
          onStateChange={handleConditionalAuthStateChange}
          emailInputId="auth-email"
        />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </h2>
          <PasskeyIndicator />
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4 motion-safe:transition-all motion-safe:duration-300">
          {renderAuthStateContent()}
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <Button
          variant="ghost"
          onClick={handleModeChange}
          className="text-sm motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
          disabled={authState !== "initial"}
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign In"}
        </Button>
      </CardFooter>
    </Card>
  );
}
