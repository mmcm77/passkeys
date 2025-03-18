import supabase from "../supabase";
import { getDeviceFingerprint } from "@/lib/auth/device-utils";
import {
  getBrowserInfo,
  shouldUsePasskeyDiscovery,
} from "@/lib/auth/browser-detection";
import { detectDeviceType } from "@/lib/auth/device-utils";
import type { DeviceCredential } from "@/types/auth";
import type { Database } from "@/types/database";

type DbDeviceCredential =
  Database["public"]["Tables"]["device_credentials"]["Row"];
type DbDeviceCredentialInsert =
  Database["public"]["Tables"]["device_credentials"]["Insert"];
type DbDeviceCredentialUpdate =
  Database["public"]["Tables"]["device_credentials"]["Update"];

interface DeviceDetails {
  deviceType?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
  [key: string]: unknown;
}

// Add type for fingerprint response
interface DeviceFingerprintResponse {
  fingerprint: string;
  components: Record<string, unknown>;
}

// Store a device fingerprint associated with a user and credential
export async function storeDeviceCredential(
  userId: string,
  credentialId: string,
  deviceName?: string
): Promise<void> {
  try {
    // First, check if this credential already exists
    console.log(
      `Checking if credential ${credentialId} already exists for user ${userId}`
    );

    const { data: existingCredentials, error: checkError } = await supabase
      .from("device_credentials")
      .select("id, credential_id")
      .eq("user_id", userId)
      .eq("credential_id", credentialId)
      .returns<Pick<DbDeviceCredential, "id" | "credential_id">[]>();

    if (checkError) {
      console.error("Error checking for existing credential:", checkError);
      throw checkError;
    }

    if (existingCredentials && existingCredentials.length > 0) {
      console.log(
        `Credential ${credentialId} already exists, updating instead of creating`
      );

      // Get device fingerprint and components for the update
      const fingerprintResponse =
        (await getDeviceFingerprint()) as DeviceFingerprintResponse;
      const browserInfo = getBrowserInfo();
      const currentBrowserFingerprint = `${fingerprintResponse.fingerprint}-${browserInfo.browser}`;

      // Generate a readable device name if not provided
      const generatedDeviceName =
        deviceName || `${browserInfo.os} ${browserInfo.browser}`;

      // Update the existing credential
      const existingCredentialId = existingCredentials[0]?.id;

      if (!existingCredentialId) {
        throw new Error("Credential ID is undefined");
      }

      const deviceDetails: DeviceDetails = {
        browser: browserInfo.browser,
        version: browserInfo.version,
        os: browserInfo.os,
        deviceType: detectDeviceType(),
        deviceName: generatedDeviceName,
        ...fingerprintResponse.components,
      };

      const updateData: DbDeviceCredentialUpdate = {
        device_fingerprint: currentBrowserFingerprint,
        device_details: deviceDetails,
        last_used_at: Date.now(),
      };

      const { error: updateError } = await supabase
        .from("device_credentials")
        .update(updateData)
        .eq("id", existingCredentialId);

      if (updateError) {
        console.error("Error updating device credential:", updateError);
        throw updateError;
      }

      console.log(
        `Successfully updated device credential: ${generatedDeviceName}`
      );
      return;
    }

    // If we reach here, this is a new credential

    // Get device fingerprint and components
    const fingerprintResponse =
      (await getDeviceFingerprint()) as DeviceFingerprintResponse;

    // Browser-specific fingerprint to ensure each browser is treated as a separate device
    const browserInfo = getBrowserInfo();
    const currentBrowserFingerprint = `${fingerprintResponse.fingerprint}-${browserInfo.browser}`;

    // Generate a readable device name if not provided
    const generatedDeviceName =
      deviceName || `${browserInfo.os} ${browserInfo.browser}`;

    console.log(`Storing new device credential for user ${userId}`);
    console.log(`Credential ID: ${credentialId}`);
    console.log(`Device type: ${detectDeviceType()}`);
    console.log(`Browser info:`, JSON.stringify(browserInfo, null, 2));
    console.log(`Browser: ${browserInfo.browser} ${browserInfo.version}`);
    console.log(`OS: ${browserInfo.os}`);
    console.log(`Device name: ${generatedDeviceName}`);

    // Ensure we don't end up with "Unknown Unknown" by providing better defaults
    const finalDeviceName = generatedDeviceName.includes("Unknown Unknown")
      ? "Device " + credentialId.substring(0, 8)
      : generatedDeviceName;

    const deviceDetails: DeviceDetails = {
      browser:
        browserInfo.browser !== "Unknown" ? browserInfo.browser : "Browser",
      version: browserInfo.version !== "Unknown" ? browserInfo.version : "",
      os: browserInfo.os !== "Unknown" ? browserInfo.os : "Device",
      deviceType: detectDeviceType(),
      deviceName: finalDeviceName,
      ...fingerprintResponse.components,
    };

    const deviceCredential: DbDeviceCredentialInsert = {
      id: crypto.randomUUID(),
      user_id: userId,
      credential_id: credentialId,
      device_fingerprint: currentBrowserFingerprint,
      device_details: deviceDetails,
      created_at: Date.now(),
      last_used_at: Date.now(),
    };

    console.log("Saving credential to Supabase...");
    const { error } = await supabase
      .from("device_credentials")
      .insert(deviceCredential);

    if (error) {
      console.error("Error storing device credential:", error);
      throw error;
    }

    console.log("Successfully stored device credential");
  } catch (error) {
    console.error("Error storing device credential:", error);
    throw error;
  }
}

// Get credentials available on the current device
export async function getCredentialsForCurrentDevice(
  userId: string
): Promise<string[]> {
  console.log("Getting credentials for device - UserId:", userId);

  try {
    // Check if we're in a browser environment
    const isBrowser =
      typeof window !== "undefined" && typeof navigator !== "undefined";

    if (!isBrowser) {
      console.log("Running on server-side, cannot check browser fingerprint");
      return [];
    }

    // For Safari and Chrome, we'll rely on native passkey discovery instead of fingerprinting
    if (shouldUsePasskeyDiscovery()) {
      console.log(
        "Using native passkey discovery instead of fingerprinting for this browser"
      );

      // Return an empty array - the passkey selection will be handled by the browser
      // This prevents the device registration flow from showing when it's not needed
      return ["passkey-discovery-enabled"];
    }

    // For other browsers, continue with fingerprinting approach
    // Get device fingerprint for the current browser
    const fingerprintResponse =
      (await getDeviceFingerprint()) as DeviceFingerprintResponse;
    const browserInfo = getBrowserInfo();
    const currentBrowserFingerprint = `${fingerprintResponse.fingerprint}-${browserInfo.browser}`;

    console.log(
      `Checking for device fingerprint: ${currentBrowserFingerprint.substring(
        0,
        8
      )}...`
    );

    const { data, error } = await supabase
      .from("device_credentials")
      .select("credential_id")
      .eq("user_id", userId)
      .eq("device_fingerprint", currentBrowserFingerprint)
      .returns<Pick<DbDeviceCredential, "credential_id">[]>();

    if (error) {
      console.error("Error getting credentials for device:", error);
      return [];
    }

    const credentialIds = data.map((record) => record.credential_id);
    console.log(`Found ${credentialIds.length} credentials for this device`);

    return credentialIds;
  } catch (error) {
    console.error("Exception in getCredentialsForCurrentDevice:", error);
    return [];
  }
}

// Get all device credentials for a user
export async function getCredentialsForUser(
  userId: string
): Promise<DeviceCredential[]> {
  console.log(`Getting all credentials for user: ${userId}`);

  const { data, error } = await supabase
    .from("device_credentials")
    .select("*")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false })
    .returns<DbDeviceCredential[]>();

  if (error) {
    console.error("Error getting credentials for user:", error);
    return [];
  }

  console.log(`Found ${data.length} total credentials for user`);

  // Log the raw credential data for debugging
  if (data.length > 0) {
    console.log("Device credentials raw data:");
    data.forEach((cred, index) => {
      const details = cred.device_details as DeviceDetails;
      console.log(`Credential ${index + 1}:`, {
        id: cred.id,
        credential_id: cred.credential_id,
        device_name: details?.deviceName || "Unknown",
        device_fingerprint: cred.device_fingerprint
          ? cred.device_fingerprint.substring(0, 8) + "..."
          : "none",
        created_at: new Date(cred.created_at).toISOString(),
      });
    });
  }

  // Check if current device matches any of the credentials
  const fingerprintResponse =
    (await getDeviceFingerprint()) as DeviceFingerprintResponse;
  const browserInfo = getBrowserInfo();
  const currentBrowserFingerprint = `${fingerprintResponse.fingerprint}-${browserInfo.browser}`;

  // Transform the data into DeviceCredential objects
  const deviceCredentials = data.map((record): DeviceCredential => {
    const details = record.device_details as DeviceDetails;
    return {
      credentialId: record.credential_id,
      userId: record.user_id,
      deviceType: details?.deviceType || "unknown",
      deviceName:
        details?.deviceName ||
        `${details?.os || "Unknown"} ${details?.browser || "Device"}`,
      browser: details?.browser || "unknown",
      os: details?.os || "unknown",
      userAgent: details?.userAgent || "",
      createdAt: record.created_at,
      lastUsedAt: record.last_used_at,
      isCurrentDevice: record.device_fingerprint === currentBrowserFingerprint,
    };
  });

  console.log(
    `Returning ${deviceCredentials.length} mapped device credentials`
  );
  return deviceCredentials;
}

// Check if a device is recognized for a specific user
export async function isDeviceRecognizedForUser(
  userId: string
): Promise<boolean> {
  const credentials = await getCredentialsForCurrentDevice(userId);
  const recognized = credentials.length > 0;
  console.log(
    `Device recognition check for user ${userId}: ${
      recognized ? "Recognized" : "Not recognized"
    }`
  );
  return recognized;
}

// Update last_used_at timestamp for a device credential
export async function updateDeviceCredentialUsage(
  userId: string,
  credentialId: string
): Promise<boolean> {
  try {
    console.log(`Updating usage for credential: ${credentialId}`);

    const { error } = await supabase
      .from("device_credentials")
      .update({ last_used_at: Date.now() })
      .eq("user_id", userId)
      .eq("credential_id", credentialId);

    if (error) {
      console.error("Error updating device credential usage:", error);
      return false;
    }

    console.log("Successfully updated device credential usage");
    return true;
  } catch (error) {
    console.error("Exception updating device credential usage:", error);
    return false;
  }
}

// Delete a device credential
export async function deleteDeviceCredential(
  credentialId: string
): Promise<boolean> {
  console.log(`Deleting credential: ${credentialId}`);

  const { error } = await supabase
    .from("device_credentials")
    .delete()
    .eq("credential_id", credentialId);

  if (error) {
    console.error("Error deleting device credential:", error);
    throw new Error("Failed to delete device credential");
  }

  console.log("Successfully deleted credential");
  return true;
}

/**
 * Updates or creates a device credential in the database to ensure proper device recognition
 */
export async function updateOrCreateDeviceCredential(
  userId: string,
  credentialId: string,
  deviceInfo?: {
    browser?: string;
    os?: string;
    deviceType?: string;
    name?: string;
  }
): Promise<boolean> {
  try {
    console.log(
      `Updating/creating device credential for user ${userId}, credential ${credentialId}`
    );

    // Check if this credential already exists
    const existingCredential = await getDeviceCredential(userId, credentialId);

    if (existingCredential) {
      // Update existing credential with latest usage
      await updateDeviceCredentialUsage(userId, credentialId);
      console.log(`Updated existing device credential last used timestamp`);
      return true;
    } else {
      // Create new credential with a proper device name
      const deviceName =
        deviceInfo?.name ||
        `${deviceInfo?.os || "Unknown"} ${deviceInfo?.browser || "Device"}`;

      await storeDeviceCredential(userId, credentialId, deviceName);
      console.log(`Created new device credential: ${deviceName}`);
      return true;
    }
  } catch (error) {
    console.error("Error updating/creating device credential:", error);
    return false;
  }
}

// Get a specific device credential
export async function getDeviceCredential(
  userId: string,
  credentialId: string
): Promise<DeviceCredential | null> {
  const { data, error } = await supabase
    .from("device_credentials")
    .select()
    .eq("user_id", userId)
    .eq("credential_id", credentialId)
    .returns<DbDeviceCredential[]>()
    .maybeSingle();

  if (error || !data) {
    console.error("Error getting device credential:", error);
    return null;
  }

  const fingerprintResponse =
    (await getDeviceFingerprint()) as DeviceFingerprintResponse;
  const browserInfo = getBrowserInfo();
  const browserSpecificFingerprint = `${fingerprintResponse.fingerprint}-${browserInfo.browser}`;

  const details = data.device_details as DeviceDetails;
  return {
    credentialId: data.credential_id,
    userId: data.user_id,
    deviceType: details?.deviceType || "unknown",
    deviceName:
      details?.deviceName ||
      `${details?.os || "Unknown"} ${details?.browser || "Device"}`,
    browser: details?.browser || "unknown",
    os: details?.os || "unknown",
    userAgent: details?.userAgent || "",
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at,
    isCurrentDevice: data.device_fingerprint === browserSpecificFingerprint,
  };
}

// Generate and store a device token for a credential
export async function generateDeviceToken(
  userId: string,
  credentialId: string
): Promise<string> {
  try {
    // Generate a random token (32 bytes = 64 hex chars)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const deviceToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    console.log(
      `Generating device token for credential ${credentialId.substring(
        0,
        8
      )}...`
    );

    // Find the device credential
    const { data: deviceCredentials, error: findError } = await supabase
      .from("device_credentials")
      .select("id")
      .eq("user_id", userId)
      .eq("credential_id", credentialId)
      .returns<Pick<DbDeviceCredential, "id">[]>();

    if (findError) {
      console.error("Error finding device credential:", findError);
      throw findError;
    }

    if (!deviceCredentials || deviceCredentials.length === 0) {
      throw new Error("Device credential not found");
    }

    const deviceCredentialId = deviceCredentials[0]?.id;

    if (!deviceCredentialId) {
      throw new Error("Device credential ID is undefined");
    }

    // Update the device credential with the token
    const { error: updateError } = await supabase
      .from("device_credentials")
      .update({
        device_token: deviceToken,
        last_used_at: Date.now(),
      })
      .eq("id", deviceCredentialId);

    if (updateError) {
      console.error("Error updating device token:", updateError);
      throw updateError;
    }

    console.log("Successfully stored device token");
    return deviceToken;
  } catch (error) {
    console.error("Error generating device token:", error);
    throw error;
  }
}

// Find a credential by device token
export async function findCredentialByDeviceToken(
  deviceToken: string
): Promise<DeviceCredential | null> {
  try {
    console.log("Looking up credential by device token...");

    const { data: deviceCredentials, error } = await supabase
      .from("device_credentials")
      .select("*")
      .eq("device_token", deviceToken)
      .returns<DbDeviceCredential[]>();

    if (error) {
      console.error("Error finding credential by device token:", error);
      throw error;
    }

    if (!deviceCredentials || deviceCredentials.length === 0) {
      console.log("No credential found for device token");
      return null;
    }

    const deviceCred = deviceCredentials[0];
    if (!deviceCred) {
      console.log("Device credential is undefined");
      return null;
    }

    console.log(
      `Found credential for device token: ${deviceCred.credential_id.substring(
        0,
        8
      )}`
    );

    // Map DB credential to DeviceCredential type with proper null checks
    const details = (deviceCred.device_details as DeviceDetails) || {};

    return {
      credentialId: deviceCred.credential_id,
      userId: deviceCred.user_id,
      deviceType: details.deviceType || "desktop",
      deviceName: details.deviceName || "Unknown Device",
      browser: details.browser || "Unknown",
      os: details.os || "Unknown",
      userAgent: details.userAgent || "",
      createdAt: deviceCred.created_at,
      lastUsedAt: deviceCred.last_used_at,
      isCurrentDevice: true,
    };
  } catch (error) {
    console.error("Error finding credential by device token:", error);
    return null;
  }
}
