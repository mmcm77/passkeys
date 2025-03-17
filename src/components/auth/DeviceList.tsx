"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Laptop, Smartphone, Tablet, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface DeviceCredential {
  credentialId: string;
  userId: string;
  deviceType: string;
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
  name?: string;
}

interface DeviceListProps {
  devices: DeviceCredential[];
  isLoading: boolean;
  onRemoveDevice: (credentialId: string) => Promise<void>;
}

export function DeviceList({
  devices,
  isLoading,
  onRemoveDevice,
}: DeviceListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (credentialId: string) => {
    setRemovingId(credentialId);
    try {
      await onRemoveDevice(credentialId);
    } finally {
      setRemovingId(null);
    }
  };

  const getDeviceIcon = (deviceType: string, userAgent: string) => {
    // Normalize device type to lowercase
    const type = deviceType.toLowerCase();

    // Check for mobile devices
    if (
      type === "mobile" ||
      type === "android" ||
      type === "ios" ||
      type.includes("phone")
    ) {
      return <Smartphone className="h-4 w-4" />;
    }
    // Check for tablets
    else if (type === "tablet" || type === "ipad") {
      return <Tablet className="h-4 w-4" />;
    }
    // All other devices (desktop, mac, windows, linux)
    else {
      return <Laptop className="h-4 w-4" />;
    }
  };

  const getDeviceName = (device: DeviceCredential) => {
    // If device has a custom name, use that
    if (device.name) return device.name;

    // Check device type first (from our detection logic)
    const deviceType = device.deviceType.toLowerCase();
    const ua = device.userAgent.toLowerCase();

    // Get browser info
    let browser = "Unknown browser";
    if (ua.includes("chrome")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari") && !ua.includes("chrome"))
      browser = "Safari";
    else if (ua.includes("edge") || ua.includes("edg/")) browser = "Edge";

    // Determine platform and device name
    if (
      deviceType === "mac" ||
      ua.includes("macintosh") ||
      ua.includes("mac os")
    ) {
      return `Mac ${browser}`;
    } else if (deviceType === "windows" || ua.includes("windows")) {
      return `Windows ${browser}`;
    } else if (deviceType === "linux" || ua.includes("linux")) {
      return `Linux ${browser}`;
    } else if (deviceType === "ios" || ua.includes("iphone")) {
      return "iPhone";
    } else if (deviceType === "ios" || ua.includes("ipad")) {
      return "iPad";
    } else if (deviceType === "android" || ua.includes("android")) {
      return "Android device";
    }

    // Generic fallback
    return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} device`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No devices registered
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {devices.map((device) => (
        <div
          key={device.credentialId}
          className="flex items-center justify-between p-3 border rounded-md"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-muted p-2 rounded-full">
              {getDeviceIcon(device.deviceType, device.userAgent)}
            </div>
            <div>
              <div className="font-medium">{getDeviceName(device)}</div>
              <div className="text-xs text-muted-foreground">
                Last used:{" "}
                {formatDistanceToNow(device.lastUsedAt, { addSuffix: true })}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(device.credentialId)}
            disabled={removingId === device.credentialId}
          >
            {removingId === device.credentialId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
