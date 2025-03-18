"use client";

import { useState, useEffect } from "react";
import { Credential, EcosystemCredential } from "@/types/auth";
import { apiRequest } from "@/lib/api/client-helpers";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, X, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PasskeyList() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [ecosystemCredentials, setEcosystemCredentials] = useState<
    EcosystemCredential[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredentials() {
      try {
        const data = await apiRequest<{ credentials: Credential[] }>(
          "/api/auth/credentials"
        );
        setCredentials(data.credentials);

        // Group credentials by ecosystem provider
        const groupedCredentials = groupByEcosystem(data.credentials);
        setEcosystemCredentials(groupedCredentials);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load passkeys"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredentials();
  }, []);

  const groupByEcosystem = (
    credentials: Credential[]
  ): EcosystemCredential[] => {
    const ecosystemMap = new Map<string, Credential[]>();

    // Group credentials by browser and OS to detect ecosystem
    credentials.forEach((credential) => {
      let provider = "Other";
      const browser = credential.deviceInfo?.browserFamily?.toLowerCase() || "";
      const os = credential.deviceInfo?.osFamily?.toLowerCase() || "";

      if (
        browser.includes("safari") ||
        os.includes("ios") ||
        os.includes("macos")
      ) {
        provider = "iCloud Keychain";
      } else if (browser.includes("chrome") || os.includes("android")) {
        provider = "Google Password Manager";
      } else if (browser.includes("edge") || os.includes("windows")) {
        provider = "Microsoft Account";
      }

      if (!ecosystemMap.has(provider)) {
        ecosystemMap.set(provider, []);
      }

      ecosystemMap.get(provider)?.push(credential);
    });

    // Convert map to array of EcosystemCredential objects
    return Array.from(ecosystemMap.entries())
      .map(([provider, creds]) => {
        if (creds.length === 0) return null;

        const sortedCreds = [...creds].sort(
          (a, b) => b.lastUsedAt - a.lastUsedAt
        );
        const newestCred = sortedCreds[0];
        const lastUsedCred = sortedCreds.reduce((latest, current) => {
          return current.lastUsedAt > (latest?.lastUsedAt || 0)
            ? current
            : latest;
        }, sortedCreds[0]);

        return {
          provider: provider as
            | "iCloud Keychain"
            | "Google Password Manager"
            | "Microsoft Account"
            | "Other",
          credentials: sortedCreds,
          createdAt: newestCred?.createdAt || 0,
          lastUsedAt: lastUsedCred?.lastUsedAt || 0,
          isMultiDevice: sortedCreds.some(
            (c) => c.deviceType === "multiDevice"
          ),
          isBackedUp: sortedCreds.some((c) => c.backedUp === true),
        };
      })
      .filter(Boolean) as EcosystemCredential[];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (ecosystemCredentials.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No passkeys found.</p>
      </div>
    );
  }

  const getEcosystemIcon = (provider: string) => {
    switch (provider) {
      case "iCloud Keychain":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="black">
              <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
            </svg>
          </div>
        );
      case "Google Password Manager":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M12 11v2h2v2H9v-4h3z" />
              <path fill="#34A853" d="M13 17h2v-2h-2v2z" />
              <path fill="#FBBC05" d="M9 11v6h2v-6H9z" />
              <path fill="#EA4335" d="M17 6H7v2h10V6z" />
              <path fill="#4285F4" d="M12 6H7v9h2V8h3V6z" />
            </svg>
          </div>
        );
      case "Microsoft Account":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="#f25022" d="M1 1h10v10H1V1z" />
              <path fill="#00a4ef" d="M1 13h10v10H1V13z" />
              <path fill="#7fba00" d="M13 1h10v10H13V1z" />
              <path fill="#ffb900" d="M13 13h10v10H13V13z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-gray-500" />
          </div>
        );
    }
  };

  const handleDelete = async (provider: string) => {
    try {
      const ecosystem = ecosystemCredentials.find(
        (e) => e.provider === provider
      );
      if (!ecosystem) return;

      const credentialIds = ecosystem.credentials.map((c) => c.id);

      // Delete all credentials for this ecosystem
      for (const id of credentialIds) {
        await apiRequest<{ success: boolean }>(`/api/auth/credentials/${id}`, {
          method: "DELETE",
        });
      }

      // Update state
      setEcosystemCredentials((prev) =>
        prev.filter((e) => e.provider !== provider)
      );
    } catch (err) {
      alert("Failed to remove passkeys. Please try again later.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      {ecosystemCredentials.map((ecosystem) => (
        <Card key={ecosystem.provider} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                {getEcosystemIcon(ecosystem.provider)}
                <div className="space-y-1">
                  <h3 className="text-xl font-medium">{ecosystem.provider}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created: {formatDate(ecosystem.createdAt)}
                    {ecosystem.credentials[0]?.deviceInfo?.browserFamily &&
                      ` with ${
                        ecosystem.credentials[0].deviceInfo.browserFamily
                      } on ${
                        ecosystem.credentials[0].deviceInfo.osFamily ||
                        "unknown"
                      }`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last used: {formatDate(ecosystem.lastUsedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Synced
                  </Badge>

                  {ecosystem.isMultiDevice && (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Hybrid
                    </Badge>
                  )}
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove {ecosystem.provider} Passkey?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {ecosystem.credentials.length}{" "}
                        passkey(s) associated with {ecosystem.provider}. You'll
                        need to register a new passkey to use this device again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(ecosystem.provider)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
