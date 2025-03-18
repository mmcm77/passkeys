import { NextRequest, NextResponse } from "next/server";
import {
  generateDeviceFingerprint,
  type DeviceComponents,
} from "@/lib/auth/device-recognition";
import { getCurrentSession } from "@/lib/auth/session";
import supabase from "@/lib/supabase";
import { logger } from "@/lib/api/logger";
import { saveUserDevice } from "@/lib/db/devices";

// Create a scoped logger for this route
const devicesLogger = logger.scope("UserDevices");

interface UserDevice {
  id: string;
  name: string;
  type: string;
  lastUsed: string;
  components: DeviceComponents;
  isCurrentDevice?: boolean;
  device_fingerprint?: string;
  device_details?: any;
  last_used_at?: string;
  credential_id?: string;
}

interface UserDevicesResponse {
  devices: UserDevice[];
  error?: string;
}

export async function GET(): Promise<NextResponse<UserDevicesResponse>> {
  try {
    // Get current user from session
    devicesLogger.log("Fetching user devices");
    const session = await getCurrentSession();

    if (!session) {
      devicesLogger.warn("No active session found");
      return NextResponse.json(
        { devices: [], error: "Not authenticated" },
        { status: 401 }
      );
    }

    devicesLogger.debug(`User authenticated with ID: ${session.userId}`);

    // Get devices for user
    devicesLogger.debug("Querying database for user devices");
    const { data, error } = await supabase
      .from("device_credentials")
      .select("device_fingerprint, device_details, last_used_at, credential_id")
      .eq("user_id", session.userId)
      .order("last_used_at", { ascending: false });

    if (error) {
      devicesLogger.error("Database error:", error);
      return NextResponse.json(
        { devices: [], error: "Database error" },
        { status: 500 }
      );
    }

    // Get the current device fingerprint
    devicesLogger.debug("Generating current device fingerprint");
    const { fingerprint } = await generateDeviceFingerprint();

    // Mark which devices are the current device
    devicesLogger.debug(`Found ${data.length} devices, marking current device`);
    const devicesWithCurrentFlag = data.map((device) => ({
      id: device.credential_id || "",
      name:
        device.device_details?.name ||
        `Device ${device.credential_id?.substring(0, 6) || ""}`,
      type: device.device_details?.deviceType || "unknown",
      lastUsed: device.last_used_at || new Date().toISOString(),
      components: device.device_details?.components || {},
      isCurrentDevice: device.device_fingerprint === fingerprint,
      device_fingerprint: device.device_fingerprint,
      device_details: device.device_details,
      credential_id: device.credential_id,
      last_used_at: device.last_used_at,
    })) as UserDevice[];

    devicesLogger.log("User devices retrieved successfully");
    return NextResponse.json({ devices: devicesWithCurrentFlag });
  } catch (error) {
    devicesLogger.error("Error fetching user devices:", error);
    return NextResponse.json(
      { devices: [], error: "Failed to fetch user devices" },
      { status: 500 }
    );
  }
}

// Endpoint to remove a device credential
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    devicesLogger.log("Processing device deletion request");

    const session = await getCurrentSession();
    if (!session) {
      devicesLogger.warn("No active session found");
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    devicesLogger.debug(`User authenticated with ID: ${session.userId}`);

    const { deviceFingerprint } = await request.json();
    devicesLogger.debug(
      `Deleting device with fingerprint: ${deviceFingerprint.substring(
        0,
        8
      )}...`
    );

    const { error } = await supabase
      .from("device_credentials")
      .delete()
      .eq("user_id", session.userId)
      .eq("device_fingerprint", deviceFingerprint);

    if (error) {
      devicesLogger.error("Database error when deleting device:", error);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    devicesLogger.log("Device deleted successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    devicesLogger.error("Error deleting device:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete device" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const { userId, deviceName } = (await request.json()) as {
      userId: string;
      deviceName: string;
    };

    if (!userId || !deviceName) {
      return NextResponse.json(
        { success: false, error: "User ID and device name are required" },
        { status: 400 }
      );
    }

    const deviceInfo = await generateDeviceFingerprint();
    const truncatedName = deviceName.substring(0, 50); // Limit device name length

    // Save device to your database
    await saveUserDevice(userId, {
      name: truncatedName,
      ...deviceInfo,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving user device:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save device" },
      { status: 500 }
    );
  }
}
