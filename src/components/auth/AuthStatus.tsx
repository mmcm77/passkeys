"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

export default function AuthStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a session cookie
        const response = await fetch("/api/auth/check-session");
        const data = await response.json();

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

    checkSession();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout");
    router.push("/");
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {user && (
        <span className="text-sm text-gray-600">Signed in as {user.email}</span>
      )}
      <button
        onClick={handleLogout}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Sign out
      </button>
    </div>
  );
}
