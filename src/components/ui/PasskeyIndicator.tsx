"use client";

import { useEffect, useState } from "react";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { cn } from "@/lib/utils";

type PasskeyStatus = "available" | "in-use" | "not-supported" | "loading";

interface PasskeyIndicatorProps {
  className?: string;
}

export function PasskeyIndicator({ className }: PasskeyIndicatorProps) {
  const [status, setStatus] = useState<PasskeyStatus>("loading");

  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const capabilities = await getWebAuthnCapabilities();

        // Check if passkeys are being actively used
        const hasActiveSession = document.cookie.includes("activePasskey=true");

        if (hasActiveSession) {
          setStatus("in-use");
        } else if (
          capabilities.hasConditionalMediation &&
          capabilities.hasPlatformAuthenticator
        ) {
          setStatus("available");
        } else {
          setStatus("not-supported");
        }
      } catch (error) {
        setStatus("not-supported");
      }
    };

    checkCapabilities();
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm",
        status === "available" && "bg-green-50 text-green-700",
        status === "in-use" && "bg-blue-50 text-blue-700",
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
          status === "not-supported" && "bg-gray-400",
          status === "loading" && "bg-gray-300"
        )}
      />
      <span>
        {status === "available" && "Passkeys Available"}
        {status === "in-use" && "Using Passkey"}
        {status === "not-supported" && "Passkeys Not Supported"}
        {status === "loading" && "Checking Passkey Support..."}
      </span>
    </div>
  );
}
