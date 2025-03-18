"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, LaptopIcon } from "lucide-react";
import { DeviceList } from "./DeviceList";
import { getCredentialsForUser } from "@/lib/db/device-credentials";
import type { DeviceCredential } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api/client-helpers";

interface AuthenticatedUser {
  userId: string;
  email: string;
  hasPasskey: boolean;
  passkeyCount: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
}

interface AuthenticatedStateProps {
  user: AuthenticatedUser;
  onSignOut: () => void;
}

export function AuthenticatedState({
  user,
  onSignOut,
}: AuthenticatedStateProps): ReactNode {
  const [devices, setDevices] = useState<DeviceCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [passkeys, setPasskeys] = useState<DeviceCredential[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setIsLoading(true);
        const credentials = await getCredentialsForUser(user.userId);
        setDevices(credentials);
      } catch (error) {
        console.error("Error fetching device credentials:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDevices();
  }, [user.userId]);

  useEffect(() => {
    const loadPasskeys = async () => {
      if (!user || !user.userId) return;

      setIsLoading(true);
      try {
        // Fetch all passkeys for the user using the new utility
        const data = await apiRequest<{
          passkeys: DeviceCredential[];
          count: number;
          uniqueCount: number;
          hasDuplicates: boolean;
        }>(`/api/auth/passkeys?userId=${user.userId}`);

        // Check if passkeys exist in the data
        if (data.passkeys && Array.isArray(data.passkeys)) {
          setPasskeys(data.passkeys);
          console.log(`Loaded ${data.passkeys.length} passkeys for user`);
        } else {
          console.warn("No passkeys found in response data:", data);
          setPasskeys([]);
        }
      } catch (error) {
        console.error("Error loading passkeys:", error);
        setPasskeys([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPasskeys();
  }, [user]);

  const handleRemoveDevice = async (credentialId: string): Promise<void> => {
    // Update the local state first for immediate UI feedback
    setDevices(
      devices.filter((device) => device.credentialId !== credentialId)
    );

    // Then update the database
    try {
      // Use the new utility for a cleaner implementation
      const result = await apiRequest<{ success: boolean; message: string }>(
        `/api/auth/credentials/${credentialId}?type=device`,
        { method: "DELETE" }
      );

      console.log("Device removed successfully:", result.message);
    } catch (error) {
      console.error("Error removing device:", error);

      // If the API call fails, revert the UI change by refetching
      try {
        const credentials = await getCredentialsForUser(user.userId);
        setDevices(credentials);
      } catch (refetchError) {
        console.error("Error refetching devices:", refetchError);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Account</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <h4 className="font-medium">Security</h4>
          </div>
          <div className="text-sm text-muted-foreground">
            {user.passkeyCount} passkey{user.passkeyCount !== 1 ? "s" : ""}
          </div>
        </div>

        <DeviceList
          devices={devices}
          isLoading={isLoading}
          onRemoveDevice={handleRemoveDevice}
        />

        {passkeys.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">
              Your registered passkeys
            </h3>
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div
                  key={passkey.credentialId}
                  className="flex items-center justify-between bg-muted/40 rounded-md p-2"
                >
                  <div className="flex items-center space-x-2">
                    <LaptopIcon size={18} className="text-primary" />
                    <div>
                      <div className="text-sm font-medium">
                        {passkey.deviceName ||
                          `${passkey.os} ${passkey.browser}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last used:{" "}
                        {new Date(passkey.lastUsedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {passkey.isCurrentDevice && (
                    <Badge variant="outline" className="text-xs bg-primary/10">
                      Current device
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
