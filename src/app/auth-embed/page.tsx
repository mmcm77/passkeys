"use client";

import { useState, useEffect, Suspense } from "react";
import AuthContainer from "@/components/auth/AuthContainer";
import { useSearchParams } from "next/navigation";
import { MessageType } from "@/sdk/types";
import { AuthenticatedUser } from "@/app/types";

// Create a client component that uses the search params
function AuthEmbedContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchantId");
  const sessionId = searchParams.get("sessionId");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Listen for messages from parent
    const messageHandler = (event: MessageEvent) => {
      // In production, you should validate against allowed origins
      // For cross-domain iframe scenarios, we need careful origin validation
      // const allowedOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [];
      // if (allowedOrigins.length > 0 && !allowedOrigins.includes(event.origin)) {
      //   console.warn(`Message origin not allowed: ${event.origin}`);
      //   return;
      // }

      // For development/demo: log the origin but accept all
      console.log(`Auth iframe received message from: ${event.origin}`);

      const message = event.data;

      // Check for valid message with type
      if (!message || !message.type) return;

      if (message.type === MessageType.AUTH_INIT) {
        if (message.payload?.theme) {
          setTheme(message.payload.theme);
        }

        // Store session info if needed
        if (message.sessionId) {
          sessionStorage.setItem("auth_session_id", message.sessionId);
        }
      }
    };

    window.addEventListener("message", messageHandler);

    // Send ready message to parent
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: MessageType.AUTH_READY,
          sessionId: sessionId,
        },
        "*" // In production, you should restrict this to specific origins
      );
    }

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, [sessionId]);

  // Handle successful authentication
  const handleAuthSuccess = (user: AuthenticatedUser) => {
    // Send success message to parent
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: MessageType.AUTH_SUCCESS,
          sessionId: sessionStorage.getItem("auth_session_id"),
          payload: {
            email: user.email,
            userId: user.userId,
            passkeyCount: user.passkeyCount,
          },
        },
        "*" // In production, you should restrict this to specific origins
      );
    }
  };

  // Handle authentication error
  const handleError = (error: Error) => {
    // Send error message to parent
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: MessageType.ERROR,
          sessionId: sessionStorage.getItem("auth_session_id"),
          payload: {
            message: error.message,
          },
        },
        "*" // In production, you should restrict this to specific origins
      );
    }
  };

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center p-4 ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      }`}
    >
      <div className="w-full max-w-md">
        {merchantId ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">
                Authenticate to complete payment
              </h1>
              <p className="text-sm text-muted-foreground">
                Merchant ID: {merchantId}
              </p>
            </div>

            <AuthContainer
              defaultMode="signin"
              onAuthSuccess={handleAuthSuccess}
              onAuthError={handleError}
              isEmbedded={true}
            />
          </>
        ) : (
          <div className="text-center text-red-500">
            <p>Missing merchant ID</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AuthEmbedPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <AuthEmbedContent />
    </Suspense>
  );
}
