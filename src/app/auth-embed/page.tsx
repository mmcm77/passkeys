"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageType } from "@/sdk/types";
import AuthContainer from "@/components/auth/AuthContainer";

// Define types for user and error
interface AuthenticatedUser {
  userId: string;
  email: string;
  hasPasskey: boolean;
  passkeyCount: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
  token?: string;
}

// Content component that uses search params
function AuthEmbedContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams?.get("merchantId");
  const sessionId = searchParams?.get("sessionId");
  const theme = searchParams?.get("theme") || "light";
  const parentOrigin = searchParams?.get("origin") || "*";
  const apiToken = searchParams?.get("apiToken");

  // Handle successful authentication
  const handleAuthSuccess = (user: AuthenticatedUser) => {
    // Send successful authentication message back to parent
    // Since we're using token-based auth, we can communicate with any origin
    if (window.parent && sessionId) {
      const targetOrigin = apiToken ? "*" : parentOrigin;

      window.parent.postMessage(
        {
          type: MessageType.AUTH_SUCCESS,
          sessionId,
          payload: {
            userId: user.userId,
            email: user.email,
            passkeyCount: user.passkeyCount || 1,
            token: user.token, // This will be provided by AuthContainer
            expiresAt: Date.now() + 3600000, // 1 hour expiration
          },
        },
        targetOrigin
      );

      // Also send legacy message type for backwards compatibility
      window.parent.postMessage(
        {
          type: MessageType.AUTH_RESPONSE,
          sessionId,
          payload: {
            userId: user.userId,
            email: user.email,
            passkeyCount: user.passkeyCount || 1,
            token: user.token,
            expiresAt: Date.now() + 3600000,
          },
        },
        targetOrigin
      );
    }
  };

  // Handle authentication error
  const handleAuthError = (error: Error) => {
    // Send error message back to parent
    if (window.parent && sessionId) {
      const targetOrigin = apiToken ? "*" : parentOrigin;

      window.parent.postMessage(
        {
          type: MessageType.ERROR,
          sessionId,
          payload: {
            message: error.message || "Authentication failed",
          },
        },
        targetOrigin
      );
    }
  };

  // Handle auth cancellation
  const handleCancel = () => {
    // Send cancel message back to parent
    if (window.parent && sessionId) {
      const targetOrigin = apiToken ? "*" : parentOrigin;

      window.parent.postMessage(
        {
          type: MessageType.AUTH_CANCEL,
          sessionId,
        },
        targetOrigin
      );
    }
  };

  // Send ready message to parent when component mounts
  useEffect(() => {
    if (window.parent && sessionId) {
      const targetOrigin = apiToken ? "*" : parentOrigin;

      window.parent.postMessage(
        {
          type: MessageType.AUTH_READY,
          sessionId,
        },
        targetOrigin
      );

      if (apiToken) {
        console.log("Auth iframe ready, using token-based authentication");
      } else {
        console.log(
          "Auth iframe ready, notifying parent origin:",
          parentOrigin
        );
      }
    }
  }, [sessionId, parentOrigin, apiToken]);

  return (
    <div className="w-full">
      {merchantId ? (
        <AuthContainer
          defaultMode="signin"
          onAuthSuccess={handleAuthSuccess}
          onAuthError={handleAuthError}
          isEmbedded={true}
        />
      ) : (
        <div className="text-center text-red-500">
          <p>Missing merchant ID</p>
        </div>
      )}
    </div>
  );
}

// Main page component with Suspense
export default function AuthEmbedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="p-8 text-center">Loading authentication...</div>
          }
        >
          <AuthEmbedContent />
        </Suspense>
      </div>
    </div>
  );
}
