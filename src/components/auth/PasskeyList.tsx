"use client";

import { useState, useEffect } from "react";
import { Credential } from "@/types/auth";

export default function PasskeyList() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredentials() {
      try {
        const response = await fetch("/api/auth/credentials");
        if (!response.ok) {
          throw new Error("Failed to fetch credentials");
        }
        const data = await response.json();
        setCredentials(data.credentials);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load passkeys"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredentials();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No passkeys found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map((credential) => (
        <div
          key={credential.id}
          className="bg-white p-4 rounded-lg shadow border border-gray-200"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {credential.deviceInfo?.browserFamily} on{" "}
                {credential.deviceInfo?.osFamily}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Created {new Date(credential.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {credential.deviceInfo?.isMobile && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Mobile
                  </span>
                )}
                {credential.deviceInfo?.isDesktop && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Desktop
                  </span>
                )}
                {credential.deviceInfo?.isTablet && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Tablet
                  </span>
                )}
                {credential.backedUp && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Backed Up
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last used:{" "}
                {new Date(credential.lastUsedAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    "Are you sure you want to remove this passkey? You won't be able to use it to sign in anymore."
                  )
                ) {
                  try {
                    const response = await fetch(
                      `/api/auth/credentials/${credential.id}`,
                      {
                        method: "DELETE",
                      }
                    );
                    if (!response.ok) {
                      throw new Error("Failed to delete credential");
                    }
                    setCredentials((prev) =>
                      prev.filter((c) => c.id !== credential.id)
                    );
                  } catch (err) {
                    alert("Failed to remove passkey. Please try again later.");
                  }
                }
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
