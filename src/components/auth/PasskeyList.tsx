"use client";

import { useState, useEffect } from "react";
import { Credential } from "@/types/auth";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  if (credentials.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No passkeys found.</p>
      </div>
    );
  }

  const handleDelete = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/auth/credentials/${credentialId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete credential");
      }
      setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
    } catch (err) {
      alert("Failed to remove passkey. Please try again later.");
    }
  };

  return (
    <div className="space-y-4">
      {credentials.map((credential) => (
        <Card key={credential.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="font-medium">
                  {credential.deviceInfo?.browserFamily} on{" "}
                  {credential.deviceInfo?.osFamily}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(credential.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {credential.deviceInfo?.isMobile && (
                    <Badge variant="secondary">Mobile</Badge>
                  )}
                  {credential.deviceInfo?.isDesktop && (
                    <Badge variant="secondary">Desktop</Badge>
                  )}
                  {credential.deviceInfo?.isTablet && (
                    <Badge variant="secondary">Tablet</Badge>
                  )}
                  {credential.backedUp && (
                    <Badge variant="outline">Backed Up</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last used:{" "}
                  {new Date(credential.lastUsedAt).toLocaleDateString()}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive/90"
                  >
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Passkey</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this passkey? You
                      won&apos;t be able to use it to sign in anymore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(credential.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
