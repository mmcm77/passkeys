"use client";

import { useEffect, useState } from "react";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { cn } from "@/lib/utils";
import { isPasskeySupported } from "@/lib/auth/passkeys";

type PasskeyStatus =
  | "available"
  | "in-use"
  | "not-supported"
  | "loading"
  | "device-recognized";

interface PasskeyIndicatorProps {
  className?: string;
  hasDeviceCredentials?: boolean;
}

export function PasskeyIndicator({
  className,
  hasDeviceCredentials,
}: PasskeyIndicatorProps) {
  const [status, setStatus] = useState<PasskeyStatus>("loading");

  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        // If device is recognized, show that status
        if (hasDeviceCredentials) {
          setStatus("device-recognized");
          return;
        }

        const capabilities = await getWebAuthnCapabilities();
        const passkeySupported = await isPasskeySupported();

        // Debug logging
        console.log("WebAuthn capabilities:", capabilities);
        console.log("Passkey supported:", passkeySupported);
        console.log(
          "Conditional mediation:",
          capabilities.hasConditionalMediation
        );
        console.log(
          "Platform authenticator:",
          capabilities.hasPlatformAuthenticator
        );

        // Check if passkeys are being actively used
        const hasActiveSession = document.cookie.includes("activePasskey=true");
        console.log("Active passkey session:", hasActiveSession);

        // For development purposes, consider passkeys available if WebAuthn is supported
        // This is less strict than the production check
        const isDevelopment =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";

        if (hasActiveSession) {
          setStatus("in-use");
        } else if (isDevelopment && capabilities.isAvailable) {
          // In development, only check if WebAuthn is available
          setStatus("available");
        } else if (
          passkeySupported &&
          capabilities.hasConditionalMediation &&
          capabilities.hasPlatformAuthenticator
        ) {
          // In production, use the full check
          setStatus("available");
        } else {
          setStatus("not-supported");
          // Log the specific reason why passkeys are not supported
          if (!passkeySupported) {
            console.log(
              "Passkeys not supported: isPasskeySupported() returned false"
            );
          }
          if (!capabilities.hasConditionalMediation) {
            console.log("Passkeys not supported: No conditional mediation");
          }
          if (!capabilities.hasPlatformAuthenticator) {
            console.log("Passkeys not supported: No platform authenticator");
          }
        }
      } catch (error) {
        console.error("Error checking passkey capabilities:", error);
        setStatus("not-supported");
      }
    };

    checkCapabilities();
  }, [hasDeviceCredentials]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm",
        status === "available" && "bg-green-50 text-green-700",
        status === "in-use" && "bg-blue-50 text-blue-700",
        status === "device-recognized" && "bg-purple-50 text-purple-700",
        status === "not-supported" && "bg-gray-50 text-gray-700",
        status === "loading" && "bg-gray-50 text-gray-500",
        className
      )}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          status === "available" && "bg-green-500 animate-pulse",
          status === "in-use" && "bg-blue-500",
          status === "device-recognized" && "bg-purple-500",
          status === "not-supported" && "bg-gray-400",
          status === "loading" && "bg-gray-300"
        )}
      />
      <span>
        {status === "available" && "Passkeys Available"}
        {status === "in-use" && "Using Passkey"}
        {status === "device-recognized" && "Device Recognized"}
        {status === "not-supported" && "Passkeys Not Supported"}
        {status === "loading" && "Checking Passkey Support..."}
      </span>
    </div>
  );
}
