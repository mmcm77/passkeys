import React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LaptopIcon, SmartphoneIcon, TabletIcon } from "lucide-react";
import { detectDeviceType } from "@/lib/auth/device-utils";
import { getBrowserInfo } from "@/lib/auth/browser-detection";
import {
  safariStartRegistration,
  shouldUseSafariWebAuthn,
  chromeStartRegistration,
  shouldUseChromeWebAuthn,
  WebAuthnOptions,
} from "@/lib/auth/safari-webauthn";
import { startRegistration } from "@simplewebauthn/browser";
import { apiRequest } from "@/lib/api/client-helpers";
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

interface User {
  id: string;
  email: string;
  displayName?: string;
  [key: string]: unknown; // For any additional properties
}

interface RegistrationOptions extends PublicKeyCredentialCreationOptionsJSON {
  challengeId?: string;
  [key: string]: unknown;
}

interface NewDeviceRegistrationProps {
  email: string;
  userId: string;
  onSuccess: (user: User) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
}

export function NewDeviceRegistration({
  email,
  userId,
  onSuccess,
  onError,
  onCancel,
}: NewDeviceRegistrationProps): React.ReactElement {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPreparingOptions, setIsPreparingOptions] = useState(false);
  const [registrationOptions, setRegistrationOptions] =
    useState<RegistrationOptions | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const deviceType = detectDeviceType();
  const browserInfo = getBrowserInfo();
  const isSafari = shouldUseSafariWebAuthn();
  const isChrome = shouldUseChromeWebAuthn();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getDeviceIcon = (): React.ReactElement => {
    switch (deviceType) {
      case "mobile":
        return <SmartphoneIcon size={32} />;
      case "tablet":
        return <TabletIcon size={32} />;
      default:
        return <LaptopIcon size={32} />;
    }
  };

  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    let os = "device";

    if (/Windows/.test(ua)) os = "Windows device";
    else if (/Macintosh/.test(ua)) os = "Mac device";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS device";
    else if (/Android/.test(ua)) os = "Android device";
    else if (/Linux/.test(ua)) os = "Linux device";

    return os;
  };

  // Step 1: Fetch registration options - separate from the WebAuthn call
  useEffect(() => {
    let mounted = true;

    const fetchOptions = async (): Promise<void> => {
      if (registrationOptions) return; // Already have options

      setIsPreparingOptions(true);
      try {
        console.log(
          "Pre-fetching registration options for browser:",
          browserInfo.browser,
          browserInfo.version
        );

        // Request registration options from the server using the new utility
        const data = await apiRequest<
          { challengeId: string } & RegistrationOptions
        >("/api/auth/register/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, userId }),
        });

        // Extract challenge ID first
        const extractedChallengeId = data.challengeId;

        // Create proper options object - remove challengeId as it's not part of WebAuthn options
        const { challengeId: _, ...extractedOptions } = data;

        console.log(
          "Registration options pre-fetched:",
          JSON.stringify(extractedOptions)
        );

        // Store options for later use (on user gesture for Safari)
        setRegistrationOptions(extractedOptions as RegistrationOptions);
        setChallengeId(extractedChallengeId);
      } catch (error) {
        console.error("Error pre-fetching registration options:", error);
        if (mounted) {
          onError(
            error instanceof Error
              ? error
              : new Error("Failed to fetch registration options")
          );
        }
      } finally {
        if (mounted) {
          setIsPreparingOptions(false);
        }
      }
    };

    void fetchOptions();

    return () => {
      mounted = false;
    };
  }, [
    email,
    userId,
    registrationOptions,
    browserInfo.browser,
    browserInfo.version,
    onError,
  ]);

  // Step 2: Complete registration using the pre-fetched options
  const completeRegistration = async (
    options: PublicKeyCredentialCreationOptionsJSON,
    chId: string
  ): Promise<void> => {
    if (!options || !chId) {
      console.error("Registration options or challengeId missing");
      onError(new Error("Registration options or challengeId missing"));
      setIsRegistering(false);
      return;
    }

    try {
      console.log("Starting new device registration flow");
      setIsRegistering(true);
      setIsPreparingOptions(true);

      // We already have options and challengeId passed to this function,
      // so we don't need to fetch them again
      console.log("Using provided registration options");

      console.log("Browser info:", getBrowserInfo());
      const { browser } = getBrowserInfo();

      console.log("Preparing WebAuthn options for browser:", browser);

      // Log the actual options
      console.log("WebAuthn options:", {
        rp: options.rp,
        user: {
          id: options.user?.id,
          name: options.user?.name,
        },
        challenge: options.challenge
          ? options.challenge.substring(0, 10) + "..."
          : "undefined",
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        authenticatorSelection: options.authenticatorSelection,
      });

      setIsPreparingOptions(false);
      setIsRegistering(true);

      let credential;

      console.log("Initializing WebAuthn registration", { browser });

      // Ensure options has the required properties for WebAuthn
      const webAuthnOptions: WebAuthnOptions = {
        ...options,
        rp: {
          ...options.rp,
          id: options.rp?.id || window.location.hostname,
        },
        challenge: options.challenge || "",
        user: {
          ...options.user,
          id: options.user?.id || "",
          name: options.user?.name || "",
          displayName: options.user?.displayName || "",
        },
        pubKeyCredParams:
          options.pubKeyCredParams?.map((param) => ({
            type: "public-key" as const,
            alg: param.alg,
          })) || [],
      };

      if (browser === "Safari") {
        console.log("Using Safari-specific implementation");
        credential = await safariStartRegistration(webAuthnOptions);
      } else if (browser === "Chrome") {
        console.log("Using Chrome-specific implementation");
        credential = await chromeStartRegistration(webAuthnOptions);
      } else {
        console.log("Using generic WebAuthn implementation");
        credential = await startRegistration({
          optionsJSON: options,
        });
      }

      console.log(
        "WebAuthn registration successful:",
        credential ? "Yes" : "No"
      );
      console.log("Credential ID:", credential?.id?.substring(0, 10) + "...");

      if (!credential) {
        throw new Error("No credential returned from WebAuthn API");
      }

      console.log("Sending verification to server...");
      const verificationResponse = await apiRequest<{ user: User }>(
        "/api/auth/register/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            challengeId: chId,
            credential: credential,
            deviceType,
            browserInfo: getBrowserInfo(),
          }),
        }
      );

      console.log("Verification response:", verificationResponse);

      // Assuming the server returns { user: User } on success
      if (!verificationResponse?.user) {
        console.error("Verification failed:", verificationResponse);
        throw new Error("Verification failed on server");
      }

      console.log("Registration complete");
      onSuccess(verificationResponse.user);
    } catch (error) {
      setIsPreparingOptions(false);
      setIsRegistering(false);

      // Detailed error logging
      console.error("Registration error:", error);

      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        // Check for specific WebAuthn errors
        if (error.name === "NotAllowedError") {
          onError(
            new Error(
              "Registration was cancelled or timed out. Please try again."
            )
          );
        } else if (error.name === "SecurityError") {
          onError(
            new Error(
              "A security error occurred. Please ensure you're using HTTPS."
            )
          );
        } else if (error.name === "NotSupportedError") {
          onError(
            new Error(
              "Your browser or device doesn't support WebAuthn. Please try a different browser."
            )
          );
        } else {
          onError(error);
        }
      } else {
        onError(new Error("An unknown error occurred during registration"));
      }
    }
  };

  // Button click handler - critical for Safari
  const handleButtonClick = async (): Promise<void> => {
    if (isRegistering) return;
    setIsRegistering(true);

    try {
      if (!registrationOptions || !challengeId) {
        console.error("No registration options available");
        throw new Error("Registration options not available");
      }

      await completeRegistration(registrationOptions, challengeId);
    } catch (error) {
      console.error("Error in button click handler:", error);
      onError(
        error instanceof Error ? error : new Error("Registration failed")
      );
      setIsRegistering(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto rounded-full bg-primary/10 p-3 mb-4">
          {getDeviceIcon()}
        </div>
        <CardTitle>Add this {getDeviceName()}</CardTitle>
        <CardDescription>
          You haven&apos;t used a passkey on this device before. Set up a
          passkey to make signing in faster next time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          You&apos;re signing in as <span className="font-medium">{email}</span>
        </div>

        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleButtonClick}
            disabled={
              isRegistering || isPreparingOptions || !registrationOptions
            }
            className="w-full"
            {...{ ref: buttonRef }}
          >
            {isRegistering
              ? "Setting up..."
              : isPreparingOptions
              ? "Preparing..."
              : "Set up passkey on this device"}
          </Button>

          <Button variant="outline" onClick={onCancel} disabled={isRegistering}>
            Try another way
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
