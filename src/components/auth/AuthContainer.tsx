"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactElement } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type AuthenticatorTransport,
  type AuthenticatorAttachment,
  type UserVerificationRequirement,
  type AttestationConveyancePreference,
  startAuthentication,
} from "@simplewebauthn/browser";
import { getBrowserInfo, detectDeviceType } from "@/lib/auth/browser-detection";
import { addRecentEmail, getRecentEmails } from "@/lib/recentEmails";
import { PasskeyIndicator } from "../ui/PasskeyIndicator";
import {
  storeDeviceCredential,
  getCredentialsForCurrentDevice,
  updateDeviceCredentialUsage,
  findCredentialByDeviceToken,
} from "@/lib/db/device-credentials";
import { getUserWithCredentials, getUserByEmail } from "@/lib/db/users";
import { PasskeyLoginButton } from "./PasskeyLoginButton";
import { AccountSwitcher } from "./AccountSwitcher";
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
import { apiRequest } from "@/lib/api/client-helpers";
import { Smartphone } from "lucide-react";

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

type ApiResponse<T> = UserExistsResponse | ErrorResponse;

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
  options: PublicKeyCredentialRequestOptionsJSON;
}

// User interface for selected user
interface SelectedUser {
  id: string;
  email: string;
  displayName?: string;
  hasPasskeys?: boolean;
}

interface RegistrationOptions {
  challengeId: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  challenge: string;
  pubKeyCredParams: Array<{
    alg: number;
    type: "public-key";
  }>;
  timeout?: number;
  excludeCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: AuthenticatorTransport[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    requireResidentKey?: boolean;
    residentKey?: "discouraged" | "preferred" | "required";
    userVerification?: UserVerificationRequirement;
  };
  attestation?: AttestationConveyancePreference;
}

interface VerificationResponse {
  user: {
    id: string;
    email: string;
    passkeyCount: number;
    lastPasskeyAddedAt?: number;
    deviceTypes?: string[];
    credentialId?: string;
  };
}

interface DevicePasskeysResponse {
  hasPasskeysOnDevice: boolean;
  credentialCount: number;
  isServerSideCheck: boolean;
}

interface User {
  id: string;
  email: string;
  displayName?: string;
}

// Define proper types to replace 'any'
interface UserCredential {
  id: string;
  credentialId: string;
  name?: string;
  lastUsed?: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  passkeyCount: number;
  lastPasskeyAddedAt?: string;
  deviceTypes: string[];
  credentials: UserCredential[];
}

interface VerifiedUser {
  id: string;
  email: string;
  passkeyCount?: number;
  deviceTypes?: string[];
}

export default function AuthContainer({
  defaultMode = "signin",
  onAuthSuccess,
}: AuthContainerProps): ReactElement {
  // State variables
  const [mode, setMode] = useState<"signin" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>("initial");
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);

  // Auth flow state
  const [authFlow, setAuthFlow] = useState<
    "default" | "newDevice" | "passwordFallback"
  >("default");
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  // State for new device registration
  const [showNewDeviceRegistration, setShowNewDeviceRegistration] =
    useState(false);
  const [userForNewDevice, setUserForNewDevice] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  // Add state for tracking device recognition
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

    void checkDeviceCredentials();
  }, [email]);

  // Update the checkDeviceForRecentEmail function to handle Promise properly
  useEffect(() => {
    if (typeof window === "undefined") return;

    const recentEmails = getRecentEmails();
    if (recentEmails.length > 0) {
      const mostRecentEmail = recentEmails[0]?.email || "";

      if (mostRecentEmail) {
        console.log("Auto-populating with recent email:", mostRecentEmail);
        setEmail(mostRecentEmail);
        form.setValue("email", mostRecentEmail);

        const checkDeviceForRecentEmail = async () => {
          setIsCheckingDevice(true);
          try {
            const data = await apiRequest<DevicePasskeysResponse>(
              "/api/auth/device-passkeys",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: mostRecentEmail }),
              }
            );

            if (data.isServerSideCheck) {
              console.log(
                "Server-side check detected, performing client-side check"
              );
              const user = await getUserByEmail(mostRecentEmail);
              if (user) {
                const credentialIds = await getCredentialsForCurrentDevice(
                  user.id
                );
                setDeviceCredentials(credentialIds);
                setDeviceRecognized(credentialIds.length > 0);
              }
            } else {
              setDeviceRecognized(data.hasPasskeysOnDevice);
            }
          } catch (error) {
            console.error("Error checking device recognition:", error);
          } finally {
            setIsCheckingDevice(false);
          }
        };

        void checkDeviceForRecentEmail();
      }
    }
  }, [form]);

  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    setError(null);

    try {
      const email = data.email;
      const user = await getUserWithCredentials(email);

      if (!user) {
        setAuthState("registering");
        void initiateRegistration(email);
      } else {
        try {
          const data = await apiRequest<DevicePasskeysResponse>(
            "/api/auth/device-passkeys",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            }
          );

          let hasPasskeysOnDevice = data.hasPasskeysOnDevice;

          if (data.isServerSideCheck) {
            console.log(
              "Server-side check detected, performing client-side check"
            );
            const credentialIds = await getCredentialsForCurrentDevice(user.id);
            hasPasskeysOnDevice = credentialIds.length > 0;
            setDeviceCredentials(credentialIds);
          }

          if (hasPasskeysOnDevice) {
            setDeviceRecognized(true);
          } else {
            setSelectedUser(user);
            setAuthFlow("newDevice");
          }
        } catch (error) {
          console.error("Error checking device passkeys:", error);
          setSelectedUser(user);
          setAuthFlow("newDevice");
        }
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      setError("Failed to authenticate. Please try again.");
      handleError(error);
    }
  });

  // Handle mode change
  const handleModeChange = () => {
    // Reset error state when changing modes
    setError(null);

    // Set to initial auth state to ensure form is shown
    setAuthState("initial");

    // Reset auth flow to default
    setAuthFlow("default");

    // Toggle between signin and register modes
    setMode(mode === "signin" ? "register" : "signin");

    // Don't clear the email when switching modes if we want to preserve device recognition
    // Only reset other form state

    // Clear any selected user or specific states
    setSelectedUser(null);
    setShowNewDeviceRegistration(false);
    setUserForNewDevice(null);
  };

  // Handle error
  const handleError = (error: unknown) => {
    setAuthState("error");
    setError(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  };

  // Render auth state content
  const renderAuthStateContent = () => {
    // Show new device registration if needed
    if (showNewDeviceRegistration && userForNewDevice) {
      return (
        <NewDeviceRegistration
          email={userForNewDevice.email}
          userId={userForNewDevice.userId}
          onSuccess={(user: VerifiedUser) => {
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
            handleError(error);
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
      console.log(
        "Auth state: initial, Device recognized:",
        deviceRecognized,
        "Email:",
        email
      );

      return (
        <>
          <div className="space-y-4">
            {/* Always show email input field in registration mode regardless of device recognition */}
            {(mode === "register" || !deviceRecognized) && (
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

            {/* Show passkey login button if device is recognized and in sign-in mode */}
            {deviceRecognized && mode === "signin" && !isCheckingDevice && (
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
                          : deviceCredentials.length || 1,
                      lastPasskeyAddedAt:
                        typeof user.lastPasskeyAddedAt === "number"
                          ? user.lastPasskeyAddedAt
                          : Date.now(),
                      deviceTypes: Array.isArray(user.deviceTypes)
                        ? [...user.deviceTypes, detectDeviceType()]
                        : [detectDeviceType()],
                    };

                    // Update the usage timestamp of this credential
                    if (
                      user.credentialId &&
                      typeof user.credentialId === "string"
                    ) {
                      void updateDeviceCredentialUsage(
                        user.id,
                        user.credentialId
                      );
                    }

                    setAuthenticatedUser(authUser);
                    setAuthState("authenticated");
                    onAuthSuccess?.(authUser);

                    // Add to recent emails
                    addRecentEmail(user.email);
                  }}
                  onError={handleError}
                />

                <AccountSwitcher
                  currentEmail={email}
                  onSelect={(selectedEmail) => {
                    setEmail(selectedEmail);
                    form.setValue("email", selectedEmail);
                  }}
                />
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

  // Update the initiateRegistration function with proper types
  const initiateRegistration = async (email: string): Promise<void> => {
    try {
      setAuthState("registering");

      const optionsData = await apiRequest<RegistrationOptions>(
        "/api/auth/register/options",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            displayName: email,
          }),
        }
      );

      const { challengeId, ...webAuthnOptions } = optionsData;

      const authResponse = await startRegistration({
        optionsJSON: webAuthnOptions,
      });

      const verifyData = await apiRequest<VerificationResponse>(
        "/api/auth/register/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: authResponse,
            challengeId,
            deviceType: detectDeviceType(),
            browserInfo: getBrowserInfo(),
          }),
        }
      );

      if (verifyData.user) {
        await storeDeviceCredential(verifyData.user.id, authResponse.id);

        const authUser: AuthenticatedUser = {
          userId: verifyData.user.id,
          email: verifyData.user.email,
          hasPasskey: true,
          passkeyCount: verifyData.user.passkeyCount ?? 1,
          lastPasskeyAddedAt: Date.now(),
          deviceTypes: Array.isArray(verifyData.user.deviceTypes)
            ? [...verifyData.user.deviceTypes, detectDeviceType()]
            : [detectDeviceType()],
        };

        if (verifyData.user.credentialId) {
          void updateDeviceCredentialUsage(
            verifyData.user.id,
            verifyData.user.credentialId
          );
        }

        setAuthenticatedUser(authUser);
        onAuthSuccess?.(authUser);
        addRecentEmail(verifyData.user.email);
        setAuthState("authenticated");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      handleError(error);
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
  const renderAuthTitle = (): string => {
    if (authFlow === "newDevice") return "New Device Detected";
    if (authFlow === "passwordFallback") return "Alternative Sign In";

    if (authState === "authenticated") return "Welcome";
    if (authState === "registering") return "Create Account";

    // Show appropriate title based on mode and device recognition
    if (mode === "signin") {
      return deviceRecognized ? "Welcome back" : "Sign in";
    } else {
      return "Create an account";
    }
  };

  const renderAuthDescription = (): string => {
    if (authFlow === "newDevice")
      return "Set up this device for faster sign-in";
    if (authFlow === "passwordFallback") return "Choose another way to sign in";

    if (authState === "authenticated")
      return `Signed in as ${authenticatedUser?.email || ""}`;
    if (authState === "registering")
      return "Set up your passkey for secure access";

    // Show appropriate description based on mode and device recognition
    if (mode === "signin") {
      return deviceRecognized
        ? `Continue with your passkey for ${email}`
        : "Sign in to your account";
    } else {
      return "Create a new account with a passkey";
    }
  };

  // Add this function to check for device tokens
  const checkForDeviceToken = async (): Promise<boolean> => {
    try {
      // Try to get the device token from cookies
      const cookies = document.cookie.split(";");
      const deviceTokenCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("device_token=")
      );

      if (!deviceTokenCookie) {
        console.log("No device token cookie found");
        return false;
      }

      const deviceToken = deviceTokenCookie.split("=")[1]?.trim();
      if (!deviceToken) {
        console.log("Empty device token");
        return false;
      }

      console.log("Found device token, checking if valid...");

      // Check if the token is associated with a credential
      const credential = await findCredentialByDeviceToken(deviceToken);
      if (!credential) {
        console.log("No credential found for device token");
        return false;
      }

      console.log("Device recognized:", credential.deviceName);

      // Store information about the recognized device
      // The component should have state variables for these, or you can add them
      // setRecognizedDevice(true);
      // setRecognizedDeviceName(credential.deviceName);

      return true;
    } catch (error) {
      console.error("Error checking device token:", error);
      return false;
    }
  };

  // Add new state variables for device recognition
  const [isDeviceRecognized, setIsDeviceRecognized] = useState(false);
  const [recognizedDeviceName, setRecognizedDeviceName] = useState<
    string | null
  >(null);

  // Add useEffect to check for device token on component mount
  useEffect(() => {
    const checkDeviceToken = async () => {
      try {
        // Try to get the device token from cookies
        const cookies = document.cookie.split(";");
        const deviceTokenCookie = cookies.find((cookie) =>
          cookie.trim().startsWith("device_token=")
        );

        if (!deviceTokenCookie) {
          return;
        }

        const deviceToken = deviceTokenCookie.split("=")[1]?.trim();
        if (!deviceToken) {
          return;
        }

        console.log("Found device token, checking if valid...");

        // Check if the token is associated with a credential
        const credential = await findCredentialByDeviceToken(deviceToken);
        if (!credential) {
          return;
        }

        console.log("Device recognized:", credential.deviceName);

        // Update UI to show the recognized device
        setIsDeviceRecognized(true);
        setRecognizedDeviceName(credential.deviceName);

        // You can prefill the email if needed or auto-authenticate
        // if (currentFlow === "login" && !email) {
        //   setEmail(userEmail);
        // }
      } catch (error) {
        console.error("Error checking device token:", error);
      }
    };

    void checkDeviceToken();
  }, []);

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
