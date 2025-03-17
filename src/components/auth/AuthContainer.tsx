"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addRecentEmail, getRecentEmails } from "@/lib/recentEmails";
import { PasskeyIndicator } from "../ui/PasskeyIndicator";
import {
  storeDeviceCredential,
  getCredentialsForCurrentDevice,
  updateDeviceCredentialUsage,
} from "@/lib/db/device-credentials";
import { getUserWithCredentials, getUserByEmail } from "@/lib/db/users";
import { PasskeyLoginButton } from "./PasskeyLoginButton";
import { AuthenticatedState } from "./AuthenticatedState";
import { NewDeviceRegistration } from "./NewDeviceRegistration";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { getBrowserInfo, detectDeviceType } from "@/lib/auth/browser-detection";

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
  details?: Record<string, unknown>;
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
  options: Record<string, unknown>;
}

// User interface for selected user
interface SelectedUser {
  id: string;
  email: string;
  displayName?: string;
  hasPasskeys?: boolean;
}

export default function AuthContainer({
  defaultMode = "signin",
  onAuthSuccess,
}: AuthContainerProps) {
  // State variables
  const [mode, setMode] = useState<"signin" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>("initial");
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);

  // Add state for new device registration
  const [showNewDeviceRegistration, setShowNewDeviceRegistration] =
    useState(false);
  const [userForNewDevice, setUserForNewDevice] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  // Add a new state for tracking the authentication flow
  const [authFlow, setAuthFlow] = useState<
    "default" | "newDevice" | "passwordFallback"
  >("default");
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  // Add a new state for tracking device recognition
  const [deviceRecognized, setDeviceRecognized] = useState(false);
  const [deviceCredentials, setDeviceCredentials] = useState<string[]>([]);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);

  // Add form schema for email validation
  const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
  });

  // Add form hook
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email || "",
    },
  });

  // Update form value when email changes
  useEffect(() => {
    if (email) {
      form.setValue("email", email);
    }
  }, [email, form]);

  // Add a new effect for device recognition when email changes
  useEffect(() => {
    const checkDeviceCredentials = async () => {
      if (!email) return;
      setIsCheckingDevice(true);

      try {
        const user = await getUserByEmail(email);
        if (!user) {
          setDeviceRecognized(false);
          setDeviceCredentials([]);
          setIsCheckingDevice(false);
          return;
        }

        const credentialIds = await getCredentialsForCurrentDevice(user.id);
        setDeviceCredentials(credentialIds);
        setDeviceRecognized(credentialIds.length > 0);
      } catch (error) {
        console.error("Error checking device credentials:", error);
        setDeviceRecognized(false);
      } finally {
        setIsCheckingDevice(false);
      }
    };

    checkDeviceCredentials();
  }, [email]);

  // Add useEffect to initialize device check with most recent email
  useEffect(() => {
    // This effect only runs in the browser
    if (typeof window === "undefined") return;

    // Check for recent emails on component mount
    const recentEmails = getRecentEmails();
    if (recentEmails.length > 0) {
      const mostRecentEmail = recentEmails[0]?.email || "";

      // Only proceed if we have an email
      if (mostRecentEmail) {
        console.log("Auto-populating with recent email:", mostRecentEmail);
        setEmail(mostRecentEmail);
        form.setValue("email", mostRecentEmail);

        // Check if this device is recognized for the most recent email
        const checkDeviceForRecentEmail = async () => {
          setIsCheckingDevice(true);
          try {
            const response = await fetch("/api/auth/device-passkeys", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: mostRecentEmail }),
            });

            if (response.ok) {
              const data = await response.json();

              // If it was a server-side check, we need to verify on client-side
              if (data.isServerSideCheck) {
                console.log(
                  "Server-side check detected, performing client-side check"
                );
                // Directly check device credentials using the client-side functionality
                const user = await getUserByEmail(mostRecentEmail);
                if (user) {
                  const credentialIds = await getCredentialsForCurrentDevice(
                    user.id
                  );
                  setDeviceCredentials(credentialIds);
                  setDeviceRecognized(credentialIds.length > 0);
                }
              } else {
                console.log(
                  "Device recognition check:",
                  data.hasPasskeysOnDevice
                );
                setDeviceRecognized(data.hasPasskeysOnDevice);
              }
            }
          } catch (error) {
            console.error("Error checking device recognition:", error);
          } finally {
            setIsCheckingDevice(false);
          }
        };

        checkDeviceForRecentEmail();
      }
    }
  }, [form]);

  // Update the form submission handler
  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const email = data.email;

      // Get user and check if they exist
      const user = await getUserWithCredentials(email);

      if (!user) {
        // User doesn't exist, continue with registration
        setAuthState("registering");
        initiateRegistration(email);
      } else {
        // User exists, check if they have passkeys on this device
        try {
          const response = await fetch("/api/auth/device-passkeys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          if (!response.ok) {
            throw new Error("Failed to check device passkeys");
          }

          const data = await response.json();

          let hasPasskeysOnDevice = data.hasPasskeysOnDevice;

          // If it was a server-side check, verify on client-side
          if (data.isServerSideCheck) {
            console.log(
              "Server-side check detected, performing client-side check"
            );
            const credentialIds = await getCredentialsForCurrentDevice(user.id);
            hasPasskeysOnDevice = credentialIds.length > 0;
            setDeviceCredentials(credentialIds);
          }

          if (hasPasskeysOnDevice) {
            // Device is recognized, show one-click login
            setDeviceRecognized(true);
          } else {
            // Device is not recognized, show new device flow
            setSelectedUser(user);
            setAuthFlow("newDevice");
          }
        } catch (error) {
          console.error("Error checking device passkeys:", error);
          // Fall back to new device flow on error
          setSelectedUser(user);
          setAuthFlow("newDevice");
        }
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      setError("Failed to authenticate. Please try again.");
      handleError();
    } finally {
      setIsSubmitting(false);
    }
  });

  // Handle mode change
  const handleModeChange = () => {
    setMode(mode === "signin" ? "register" : "signin");
  };

  // Handle error
  const handleError = () => {
    setAuthState("error");
    // ... rest of your error handling logic
  };

  // Render auth state content
  const renderAuthStateContent = () => {
    // Show new device registration if needed
    if (showNewDeviceRegistration && userForNewDevice) {
      return (
        <NewDeviceRegistration
          email={userForNewDevice.email}
          userId={userForNewDevice.userId}
          onSuccess={(user) => {
            // Update authenticated user
            const authUser: AuthenticatedUser = {
              userId: user.id,
              email: user.email,
              hasPasskey: true,
              passkeyCount:
                typeof user.passkeyCount === "number" ? user.passkeyCount : 1,
              lastPasskeyAddedAt: Date.now(),
              deviceTypes: Array.isArray(user.deviceTypes)
                ? [...user.deviceTypes, detectDeviceType()]
                : [detectDeviceType()],
            };

            setAuthenticatedUser(authUser);
            setAuthState("authenticated");
            onAuthSuccess?.(authUser);
            addRecentEmail(user.email);
            setShowNewDeviceRegistration(false);
            setUserForNewDevice(null);
          }}
          onError={(error) => {
            handleError();
            setShowNewDeviceRegistration(false);
            setUserForNewDevice(null);
          }}
          onCancel={() => {
            setShowNewDeviceRegistration(false);
            setUserForNewDevice(null);
            setAuthState("initial");
          }}
        />
      );
    }

    if (authState === "initial") {
      return (
        <>
          <div className="space-y-4">
            {!deviceRecognized && (
              // Show standard form when device is not recognized
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            type="email"
                            autoComplete="email webauthn"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isCheckingDevice}
                  >
                    {isCheckingDevice ? "Checking..." : "Continue"}
                  </Button>
                </form>
              </Form>
            )}

            {/* Show passkey login button if device is recognized - similar to example screenshot */}
            {deviceRecognized && !isCheckingDevice && (
              <div className="space-y-4">
                <PasskeyLoginButton
                  email={email}
                  onSuccess={(user) => {
                    // Update authenticated user
                    const authUser: AuthenticatedUser = {
                      userId: user.id,
                      email: user.email,
                      hasPasskey: true,
                      passkeyCount:
                        typeof user.passkeyCount === "number"
                          ? user.passkeyCount
                          : 1,
                      lastPasskeyAddedAt: Date.now(),
                      deviceTypes: Array.isArray(user.deviceTypes)
                        ? [...user.deviceTypes, detectDeviceType()]
                        : [detectDeviceType()],
                    };

                    // Update the usage timestamp of this credential
                    if (user.credentialId) {
                      updateDeviceCredentialUsage(user.id, user.credentialId);
                    }

                    setAuthenticatedUser(authUser);
                    setAuthState("authenticated");
                    onAuthSuccess?.(authUser);

                    // Add to recent emails
                    addRecentEmail(user.email);
                  }}
                  onError={handleError}
                  buttonStyle="simplified"
                />

                <div className="text-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeviceRecognized(false);
                    }}
                    className="text-sm"
                  >
                    Not you? Use a different account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      );
    }

    // Add the authenticated state case
    if (authState === "authenticated" && authenticatedUser) {
      return (
        <AuthenticatedState
          user={authenticatedUser}
          onSignOut={() => {
            setAuthState("initial");
            setAuthenticatedUser(null);
            setEmail("");
          }}
        />
      );
    }

    // Default case
    return (
      <div className="text-center">
        <p>Loading...</p>
      </div>
    );
  };

  // Update the initiateRegistration function to store device credential
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

      // Extract challengeId and use the rest as options
      const { challengeId, ...options } = optionsData;

      // Start registration with the correct options structure
      const authResponse = await startRegistration(options);

      // Verify registration
      const verifyResponse = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: authResponse,
          challengeId: challengeId,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Registration verification failed");
      }

      const data = await verifyResponse.json();

      // Store the credential-device association
      if (data.user) {
        await storeDeviceCredential(data.user.id, authResponse.id);

        // Continue with existing code...
        const authUser: AuthenticatedUser = {
          userId: data.user.id,
          email: data.user.email,
          hasPasskey: true,
          passkeyCount:
            typeof data.user.passkeyCount === "number"
              ? data.user.passkeyCount
              : 1,
          lastPasskeyAddedAt: Date.now(),
          deviceTypes: Array.isArray(data.user.deviceTypes)
            ? [...data.user.deviceTypes, detectDeviceType()]
            : [detectDeviceType()],
        };

        setAuthenticatedUser(authUser);
        onAuthSuccess?.(authUser);
        addRecentEmail(email);
        setAuthState("authenticated");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      handleError();
    }
  };

  // Add a new rendering function for different auth flows
  const renderAuthFlow = () => {
    switch (authFlow) {
      case "newDevice":
        if (!selectedUser) return renderAuthStateContent();

        return (
          <NewDeviceRegistration
            email={selectedUser.email}
            userId={selectedUser.id}
            onSuccess={(user) => {
              const authUser: AuthenticatedUser = {
                userId: user.id,
                email: user.email,
                hasPasskey: true,
                passkeyCount:
                  typeof user.passkeyCount === "number" ? user.passkeyCount : 1,
                lastPasskeyAddedAt: Date.now(),
                deviceTypes: Array.isArray(user.deviceTypes)
                  ? [...user.deviceTypes, detectDeviceType()]
                  : [detectDeviceType()],
              };

              setAuthenticatedUser(authUser);
              setAuthState("authenticated");
              onAuthSuccess?.(authUser);

              // Add to recent emails
              addRecentEmail(user.email);

              // Reset auth flow
              setAuthFlow("default");
              setSelectedUser(null);
            }}
            onError={(error) => {
              setError(error.message);
              setAuthFlow("passwordFallback");
            }}
            onCancel={() => {
              setAuthFlow("passwordFallback");
            }}
          />
        );

      case "passwordFallback":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                You can continue with password authentication or try another
                method.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // Reset to default flow
                setAuthFlow("default");
                setSelectedUser(null);
                setAuthState("initial");
              }}
            >
              Back to Sign In
            </Button>
          </div>
        );

      default:
        return renderAuthStateContent();
    }
  };

  // Helper functions for title and description
  const renderAuthTitle = () => {
    if (authFlow === "newDevice") return "New Device Detected";
    if (authFlow === "passwordFallback") return "Alternative Sign In";

    if (authState === "authenticated") return "Welcome";
    if (authState === "registering") return "Create Account";

    return mode === "signin" ? "Welcome back" : "Create an account";
  };

  const renderAuthDescription = () => {
    if (authFlow === "newDevice")
      return "Set up this device for faster sign-in";
    if (authFlow === "passwordFallback") return "Choose another way to sign in";

    if (authState === "authenticated")
      return `Signed in as ${authenticatedUser?.email}`;
    if (authState === "registering")
      return "Set up your passkey for secure access";

    return mode === "signin"
      ? "Sign in to your account"
      : "Create a new account with a passkey";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {renderAuthTitle()}
          </h2>
          <PasskeyIndicator hasDeviceCredentials={deviceRecognized} />
        </div>
        <p className="text-sm text-muted-foreground">
          {renderAuthDescription()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        {renderAuthFlow()}
      </CardContent>
      {authFlow === "default" && authState === "initial" && (
        <CardFooter className="flex justify-center">
          <Button
            variant="ghost"
            onClick={handleModeChange}
            className="text-sm"
            disabled={authState !== "initial"}
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign In"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
