import { useEffect, useState } from "react";
import { KeyIcon, XIcon } from "lucide-react";
import { isPasskeySupported } from "@/lib/auth/passkeys";

interface PasskeyIndicatorProps {
  userId?: string;
  hasDeviceCredentials?: boolean;
}

export function PasskeyIndicator({
  userId,
  hasDeviceCredentials,
}: PasskeyIndicatorProps) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPasskeySupport = async () => {
      const isSupported = await isPasskeySupported();
      setSupported(isSupported);
    };

    checkPasskeySupport();
  }, []);

  if (supported === null) {
    return (
      <div className="text-xs text-muted-foreground">
        Checking passkey support...
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="flex items-center text-xs text-amber-500 gap-1">
        <XIcon size={12} />
        <span>Passkeys not supported on this device</span>
      </div>
    );
  }

  // For recognized devices with credentials
  if (userId && hasDeviceCredentials) {
    return (
      <div className="flex items-center text-xs text-green-500 gap-1">
        <KeyIcon size={12} />
        <span>Passkeys available for this account</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-xs text-muted-foreground gap-1">
      <KeyIcon size={12} />
      <span>Passkeys supported on this device</span>
    </div>
  );
}
