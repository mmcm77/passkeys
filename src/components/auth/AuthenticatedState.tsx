"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import type { DeviceCredential } from "@/types/auth";
import { apiRequest } from "@/lib/api/client-helpers";
import PasskeyList from "./PasskeyList";

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
  const [isLoading, setIsLoading] = useState(false);

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

        <PasskeyList userId={user.userId} />
      </div>
    </div>
  );
}
