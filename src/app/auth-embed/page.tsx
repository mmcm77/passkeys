"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageType } from "@/sdk/types";

// Content component that uses search params
function AuthEmbedContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const merchantId = searchParams?.get("merchantId");
  const sessionId = searchParams?.get("sessionId");
  const theme = searchParams?.get("theme") || "light";
  const parentOrigin = searchParams?.get("origin") || "*";
  const apiToken = searchParams?.get("apiToken");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Include API token in authentication request if provided
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiToken && { Authorization: `Bearer ${apiToken}` }),
        },
        body: JSON.stringify({
          email,
          merchantId,
          apiToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setSuccess(true);
      setAuthToken(data.token);

      // Send successful authentication message back to parent
      // Since we're using token-based auth, we can communicate with any origin
      if (window.parent && sessionId) {
        const targetOrigin = apiToken ? "*" : parentOrigin;

        window.parent.postMessage(
          {
            type: MessageType.AUTH_SUCCESS,
            sessionId,
            payload: {
              userId: data.userId,
              email: email,
              passkeyCount: data.passkeyCount || 1,
              token: data.token,
              expiresAt: data.expiresAt,
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
              userId: data.userId,
              email: email,
              passkeyCount: data.passkeyCount || 1,
              token: data.token,
              expiresAt: data.expiresAt,
            },
          },
          targetOrigin
        );
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");

      // Send error message back to parent
      if (window.parent && sessionId) {
        const targetOrigin = apiToken ? "*" : parentOrigin;

        window.parent.postMessage(
          {
            type: MessageType.ERROR,
            sessionId,
            payload: {
              message:
                err instanceof Error ? err.message : "Authentication failed",
            },
          },
          targetOrigin
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="w-full p-8">
      <h1 className="text-2xl font-bold mb-6">Authenticate with Passkey</h1>

      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded bg-white text-black"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 p-2 bg-red-50 rounded">{error}</div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Authenticate"}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-xl mb-4">
            Authentication successful!
          </div>
          <p>You can now close this window.</p>
          {authToken && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">Token (for debugging):</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {authToken}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main page component with Suspense
export default function AuthEmbedPage() {
  return (
    <div className="min-h-screen bg-blue-600 text-white flex items-center justify-center">
      <div className="bg-blue-600 rounded-lg shadow-lg w-full max-w-md">
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
