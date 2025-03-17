"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  LogOut,
} from "lucide-react";
import {
  startAuthentication,
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  getWebAuthnCapabilities,
  detectDeviceType,
} from "@/lib/auth/browser-detection";
import { RecentEmails } from "./RecentEmails";
import { addRecentEmail } from "@/lib/recentEmails";
import { PasskeyIndicator } from "../ui/PasskeyIndicator";
import type { ConditionalAuthState } from "@/types/auth";
import {
  storeDeviceCredential,
  getCredentialsForCurrentDevice,
  isDeviceRecognizedForUser,
  updateDeviceCredentialUsage,
} from "@/lib/db/device-credentials";
import { getUserWithCredentials, getUserByEmail } from "@/lib/db/users";
import { PasskeyLoginButton } from "./PasskeyLoginButton";
import { AccountSwitcher } from "./AccountSwitcher";
import { DeviceList } from "./DeviceList";
import { AuthenticatedState } from "./AuthenticatedState";
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
  // State variables
  const [mode, setMode] = useState<"signin" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("initial");
  const [errorDetails, setErrorDetails] = useState<AuthError | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);
  const [isNewUserRegistration, setIsNewUserRegistration] = useState(false);
  const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<
    number | null
  >(null);
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);
  const [authenticationState, setAuthenticationState] =
    useState<AuthenticationState | null>(null);
  const [selectedRecentEmail, setSelectedRecentEmail] = useState<string | null>(
    null
  );
  const [isConditionalAuthEnabled, setIsConditionalAuthEnabled] =
    useState(false);
  const isInitializingConditional = useRef(false);
  const currentChallenge = useRef<{ options: any; challengeId: string } | null>(
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Add new state variables for device recognition
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

  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    // Your existing form submission logic
    console.log("Form submitted with:", data.email);
    // ... rest of your form submission logic
  });

  // Handle mode change
  const handleModeChange = () => {
    setMode(mode === "signin" ? "register" : "signin");
  };

  // Handle error
  const handleError = (error: unknown) => {
    setAuthState("error");
    // ... rest of your error handling logic
  };

  // Render auth state content
  const renderAuthStateContent = () => {
    if (authState === "initial") {
      return (
        <>
          <div className="space-y-4">
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

                {/* Show continue button only if device isn't recognized */}
                {!deviceRecognized && (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isCheckingDevice}
                  >
                    {isCheckingDevice ? "Checking..." : "Continue"}
                  </Button>
                )}
              </form>
            </Form>

            {/* Show passkey login button if device is recognized */}
            {deviceRecognized && !isCheckingDevice && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Signing in as:</span>
                  <span className="font-medium">{email}</span>
                </div>

                <PasskeyLoginButton
                  email={email}
                  onSuccess={(user) => {
                    // Update authenticated user
                    const authUser = {
                      userId: user.id,
                      email: user.email,
                      hasPasskey: true,
                      passkeyCount:
                        user.passkeyCount || deviceCredentials.length,
                      lastPasskeyAddedAt: user.lastPasskeyAddedAt,
                      deviceTypes: user.deviceTypes,
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

          {/* Show an enhanced PasskeyIndicator that knows about device credentials */}
          <div className="mt-4">
            <PasskeyIndicator hasDeviceCredentials={deviceRecognized} />
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

      // Start registration
      const authResponse = await startRegistration(optionsData);

      // Verify registration
      const verifyResponse = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: authResponse,
          challengeId: optionsData.challengeId,
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
        const authUser = {
          userId: data.user.id,
          email: data.user.email,
          hasPasskey: true,
          passkeyCount: 1,
          lastPasskeyAddedAt: Date.now(),
          deviceTypes: [detectDeviceType()],
        };

        setAuthenticatedUser(authUser);
        onAuthSuccess?.(authUser);
        addRecentEmail(email);
        setAuthState("authenticated");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      handleError(error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </h2>
          <PasskeyIndicator />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderAuthStateContent()}
      </CardContent>
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
    </Card>
  );
}
