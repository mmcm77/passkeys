import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { KeyIcon, ChevronRight } from "lucide-react";

interface PasskeyLoginButtonProps {
  email: string;
  onSuccess: (user: any) => void;
  onError: (error: Error) => void;
  buttonStyle?: "standard" | "simplified";
}

export function PasskeyLoginButton({
  email,
  onSuccess,
  onError,
  buttonStyle = "standard",
}: PasskeyLoginButtonProps) {
  const initiateAuthentication = useCallback(async () => {
    try {
      // Get authentication options
      const response = await fetch("/api/auth/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to get authentication options");
      }

      const { options, challengeId } = await response.json();

      // Start authentication
      const credential = await startAuthentication(options);

      // Verify authentication
      const verifyResponse = await fetch("/api/auth/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, challengeId }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Authentication verification failed");
      }

      const data = await verifyResponse.json();
      onSuccess(data.user);
    } catch (error) {
      console.error("Authentication error:", error);
      onError(
        error instanceof Error ? error : new Error("Authentication failed")
      );
    }
  }, [email, onSuccess, onError]);

  if (buttonStyle === "simplified") {
    return (
      <button
        className="w-full flex items-center justify-between p-4 border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer text-left"
        onClick={initiateAuthentication}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <KeyIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-medium">Login with Passkey</p>
            <p className="text-sm opacity-90">{email}</p>
          </div>
        </div>
        <div>
          <ChevronRight className="h-5 w-5" />
        </div>
      </button>
    );
  }

  return (
    <Button
      className="w-full flex items-center justify-center gap-2"
      onClick={initiateAuthentication}
    >
      <KeyIcon size={16} />
      <span>Login with Passkey</span>
    </Button>
  );
}
