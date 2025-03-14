"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "registering" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus("registering");
    setError(null);

    try {
      // Get registration options
      const optionsResponse = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.error || "Failed to get registration options");
      }

      const { challengeId, ...options } = await optionsResponse.json();

      // Start registration with the options directly
      const credential = await startRegistration({
        optionsJSON: options,
      });

      // Verify registration
      const verificationResponse = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, challengeId }),
      });

      if (!verificationResponse.ok) {
        const error = await verificationResponse.json();
        throw new Error(error.error || "Failed to verify registration");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Registration failed");
      console.error(err);
    }
  }

  // Function to reset credentials for a user
  async function handleResetCredentials() {
    if (!email) {
      setError("Please enter your email address to reset credentials");
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset credentials");
      }

      // Show success message
      alert("Your credentials have been reset. You can now register again.");
      setStatus("idle");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset credentials"
      );
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">
          Register with Passkey
        </h2>
      </CardHeader>

      {status === "idle" && (
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Register
            </Button>
          </CardContent>
        </form>
      )}

      {status === "registering" && (
        <CardContent className="text-center py-8 space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary" />
          </div>
          <p>Creating your passkey...</p>
          <p className="text-sm text-muted-foreground">
            Follow the prompts from your browser or device.
          </p>
        </CardContent>
      )}

      {status === "success" && (
        <CardContent className="text-center py-8 space-y-4">
          <div className="text-green-600 text-lg">Registration successful!</div>
          <p className="text-muted-foreground">
            You can now sign in with your passkey.
          </p>
          <Button
            onClick={() => (window.location.href = "/login")}
            className="w-full"
          >
            Go to Login
          </Button>
        </CardContent>
      )}

      {status === "error" && (
        <CardContent className="text-center py-8 space-y-4">
          <div className="text-destructive text-lg">Registration failed</div>
          <p className="text-destructive">{error}</p>
          <Button onClick={() => setStatus("idle")} className="w-full">
            Try Again
          </Button>

          {error && error.includes("duplicate key") && (
            <Button
              onClick={handleResetCredentials}
              variant="outline"
              className="w-full mt-2"
            >
              Reset Existing Credentials
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
