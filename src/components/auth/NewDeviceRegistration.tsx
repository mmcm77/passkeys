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
} from "@/lib/auth/safari-webauthn";
import { startRegistration } from "@simplewebauthn/browser";

interface User {
  id: string;
  email: string;
  displayName?: string;
  [key: string]: unknown; // For any additional properties
}

interface RegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: string;
    alg: number;
  }>;
  timeout?: number;
  excludeCredentials?: unknown[];
  authenticatorSelection?: Record<string, unknown>;
  attestation?: string;
  extensions?: Record<string, unknown>;
  [key: string]: unknown; // For any additional properties
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
}: NewDeviceRegistrationProps) {
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

  const getDeviceIcon = () => {
    switch (deviceType) {
      case "mobile":
        return <SmartphoneIcon size={32} />;
      case "tablet":
        return <TabletIcon size={32} />;
      default:
        return <LaptopIcon size={32} />;
    }
  };

  const getDeviceName = () => {
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
    const fetchOptions = async () => {
      if (registrationOptions) return; // Already have options

      setIsPreparingOptions(true);
      try {
        console.log(
          "Pre-fetching registration options for browser:",
          browserInfo.browser,
          browserInfo.version
        );

        // Request registration options from the server
        const response = await fetch("/api/auth/register/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, userId }),
        });

        if (!response.ok) {
          throw new Error("Failed to get registration options");
        }

        const data = await response.json();

        // Extract challenge ID first
        const extractedChallengeId = data.challengeId;

        // Create proper options object - remove challengeId as it's not part of WebAuthn options
        // Using _ to explicitly indicate we're destructuring this property but not using it
        const { challengeId: _, ...extractedOptions } = data;

        console.log(
          "Registration options pre-fetched:",
          JSON.stringify(extractedOptions)
        );

        // Store options for later use (on user gesture for Safari)
        setRegistrationOptions(extractedOptions);
        setChallengeId(extractedChallengeId);
      } catch (error) {
        console.error("Error pre-fetching registration options:", error);
      } finally {
        setIsPreparingOptions(false);
      }
    };

    fetchOptions();
  }, [
    email,
    userId,
    registrationOptions,
    browserInfo.browser,
    browserInfo.version,
  ]);

  // Step 2: Complete registration using the pre-fetched options
  const completeRegistration = async (options: any, chId: string) => {
    if (!options || !chId) {
      console.error("Registration options or challengeId missing");
      onError(new Error("Registration options or challengeId missing"));
      setIsRegistering(false);
      return;
    }

    try {
      console.log("Starting registration with browser-specific implementation");
      console.log(
        "Browser detected:",
        isSafari ? "Safari" : isChrome ? "Chrome" : "Other"
      );

      // Use browser-specific implementations
      let attResp;

      // For Safari, we need to call the WebAuthn function directly within the click handler
      if (isSafari) {
        console.log(
          "Using Safari-specific registration flow - direct WebAuthn call"
        );
        attResp = await safariStartRegistration(options);
      } else if (isChrome) {
        console.log("Using Chrome-specific registration flow");
        attResp = await chromeStartRegistration(options);
      } else {
        console.log("Using standard registration flow");
        attResp = await startRegistration(options);
      }

      console.log("Registration successful, verifying with server");
      console.log("Credential response type:", typeof attResp);
      console.log("Credential ID:", attResp.id);
      console.log("Browser/Device:", browserInfo.browser, deviceType);

      // Prepare detailed browser and device info for accurate device recognition
      const deviceDetails = {
        browser: browserInfo.browser,
        version: browserInfo.version,
        os: browserInfo.os,
        deviceType: deviceType,
        userAgent: navigator.userAgent,
        name: getDeviceName(),
      };

      // Verify the registration with the server
      const verifyResponse = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          challengeId: chId,
          credential: attResp,
          deviceType,
          browserInfo: deviceDetails,
        }),
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error("Verification failed:", errorText);
        throw new Error(`Registration verification failed: ${errorText}`);
      }

      const data = await verifyResponse.json();
      console.log("Registration verification successful:", data);

      // Ensure we're passing the updated passkey count and device information
      if (data.user) {
        // Make sure we have the latest passkey count and device information
        onSuccess({
          ...data.user,
          // Ensure credential ID is included for device tracking
          credentialId: attResp.id,
          // Include specific device info for better display
          deviceInfo: deviceDetails,
        });
      } else {
        onSuccess(data.user);
      }
    } catch (error) {
      console.error("Registration error:", error);
      onError(
        error instanceof Error ? error : new Error("Registration failed")
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // Button click handler - critical for Safari
  const handleButtonClick = async () => {
    if (isRegistering) return;
    setIsRegistering(true);

    try {
      if (!registrationOptions || !challengeId) {
        console.error("No registration options available");
        throw new Error("Registration options not available");
      }

      // This is the critical part for Safari - we call the WebAuthn function directly from the click handler
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
            ref={buttonRef}
            onClick={handleButtonClick}
            disabled={
              isRegistering || isPreparingOptions || !registrationOptions
            }
            className="w-full"
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
