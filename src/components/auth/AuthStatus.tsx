"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client-helpers";
import type { ReactNode } from "react";

export default function AuthStatus(): ReactNode {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a session cookie using our new utility
        const data = await apiRequest<{
          authenticated: boolean;
          user: { email: string } | null;
        }>("/api/auth/check-session");

        setIsAuthenticated(data.authenticated);
        setUser(data.user);
      } catch (error) {
        console.error("Error checking session:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <div className="flex items-center gap-4"></div>;
}
