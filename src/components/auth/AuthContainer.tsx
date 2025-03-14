"use client";

import { useState, useEffect } from "react";
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
} from "@simplewebauthn/browser";

type AuthState =
  | "initial"
  | "submitting"
  | "checking"
  | "success"
  | "error"
  | "authenticated";

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

  // Handle animation states with transition tracking
  useEffect(() => {
    if (authState !== "initial") {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [authState]);

  // Reset verification status when mode changes
  useEffect(() => {
    setVerificationStatus(null);
    setAuthenticatedUser(null);
    setIsNewUserRegistration(false);
    setError(null);
    setErrorDetails(null);
    setAuthState("initial");
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
            handleRetry();
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

        // Transition based on passkey status
        if (data.hasPasskeys) {
          setAuthState("success");
          onAuthSuccess?.(user);
        } else {
          setAuthState("success"); // Show passkey setup prompt
        }
      } else {
        // New user case
        if (mode === "signin") {
          setIsNewUserRegistration(true);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setTimeout(() => {
            setMode("register");
            setAuthState("initial");
            setIsSubmitting(false);
            setIsNewUserRegistration(false);
          }, 2000);
        } else {
          setAuthState("success");
          const newUser: AuthenticatedUser = {
            userId: crypto.randomUUID(), // Placeholder until actual user ID is available
            email,
            hasPasskey: false,
            passkeyCount: 0,
          };
          setAuthenticatedUser(newUser);
          onAuthSuccess?.(newUser);
        }
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
      setAuthState("submitting");
      const response = await fetch("/api/auth/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to get authentication options");
      }

      const optionsData = await response.json();

      // Start browser authentication
      try {
        const authResponse = await startAuthentication(optionsData.options);

        // Send verification request
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

        // Update authenticated user state
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
          setAuthState("authenticated"); // Set to authenticated state
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

  const renderAuthStateContent = () => {
    const baseTransition =
      "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-in-out";
    const fadeIn = `${baseTransition} ${
      isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
    }`;

    // Enhanced status messages based on verification status
    const getStatusMessage = () => {
      if (isNewUserRegistration)
        return "Welcome! Setting up your registration...";
      if (verificationStatus?.exists) {
        return verificationStatus.hasPasskeys
          ? "Welcome back! Verifying your credentials..."
          : "Welcome back! Please set up your passkey...";
      }
      return mode === "signin"
        ? "Verifying your credentials..."
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
            {verificationStatus && (
              <div className="text-xs text-muted-foreground/80 motion-safe:animate-fade-in">
                {verificationStatus.passkeyCount > 0 && (
                  <p>
                    Found {verificationStatus.passkeyCount} registered
                    passkey(s)
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
                  : "Create your account"}
              </h3>
              <p className="text-sm text-muted-foreground motion-safe:animate-fade-in">
                {email}
              </p>
              {verificationStatus && (
                <div className="space-y-1 text-xs text-muted-foreground/80 motion-safe:animate-fade-in">
                  {verificationStatus.hasPasskeys ? (
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
                        onClick={() => {
                          // Handle passkey creation
                          console.log("Creating passkey for:", email);
                        }}
                      >
                        Create Passkey
                      </Button>
                    </>
                  )}
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

      default:
        return (
          <div className={fadeIn}>
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
                  aria-describedby={error ? "auth-error" : "email-description"}
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
                    {mode === "signin"
                      ? "Enter your email to sign in with passkey"
                      : "Enter your email to create a new account"}
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
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center motion-safe:transition-all motion-safe:duration-300">
          {mode === "signin" ? "Sign In" : "Register"}
        </h2>
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
            ? "Don't have an account? Register"
            : "Already have an account? Sign In"}
        </Button>
      </CardFooter>
    </Card>
  );
}
