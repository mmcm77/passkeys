import supabase from "../supabase";
import { getDeviceFingerprint } from "@/lib/auth/device-utils";
import { getBrowserInfo } from "@/lib/auth/browser-detection";
import { detectDeviceType } from "@/lib/auth/device-utils";
import type { DeviceCredential } from "@/types/auth";

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
      .eq("credential_id", credentialId);

    if (checkError) {
      console.error("Error checking for existing credential:", checkError);
      throw checkError;
    }

    if (existingCredentials && existingCredentials.length > 0) {
      console.log(
        `Credential ${credentialId} already exists, updating instead of creating`
      );

      // Get device fingerprint and components for the update
      const { fingerprint, components } = await getDeviceFingerprint();
      const browserInfo = getBrowserInfo();
      const browserSpecificFingerprint = `${fingerprint}-${browserInfo.browser}`;

      // Generate a readable device name if not provided
      const generatedDeviceName =
        deviceName || `${browserInfo.os} ${browserInfo.browser}`;

      // Update the existing credential
      // We're certain that existingCredentials has at least one element and existingCredentials[0] exists
      // because we checked length > 0 above
      const existingCredentialId = existingCredentials[0]?.id;

      if (!existingCredentialId) {
        throw new Error("Credential ID is undefined");
      }

      const { error: updateError } = await supabase
        .from("device_credentials")
        .update({
          device_fingerprint: browserSpecificFingerprint,
          device_name: generatedDeviceName,
          device_details: {
            browser: browserInfo.browser,
            version: browserInfo.version,
            os: browserInfo.os,
            deviceType: detectDeviceType(),
            ...components,
          },
          last_used_at: Date.now(),
        })
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
    const { fingerprint, components } = await getDeviceFingerprint();

    // Browser-specific fingerprint to ensure each browser is treated as a separate device
    const browserInfo = getBrowserInfo();
    const browserSpecificFingerprint = `${fingerprint}-${browserInfo.browser}`;

    // Generate a readable device name if not provided
    const generatedDeviceName =
      deviceName || `${browserInfo.os} ${browserInfo.browser}`;

    console.log(`Storing new device credential for user ${userId}`);
    console.log(`Credential ID: ${credentialId}`);
    console.log(`Device type: ${detectDeviceType()}`);
    console.log(`Browser: ${browserInfo.browser} ${browserInfo.version}`);
    console.log(`Device name: ${generatedDeviceName}`);

    const deviceCredential = {
      id: crypto.randomUUID(), // Generate a UUID for the id column
      user_id: userId,
      credential_id: credentialId,
      device_fingerprint: browserSpecificFingerprint,
      device_name: generatedDeviceName, // Use the dedicated column now
      device_details: {
        browser: browserInfo.browser,
        version: browserInfo.version,
        os: browserInfo.os,
        deviceType: detectDeviceType(),
        ...components,
      },
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
    // Get device fingerprint for the current browser
    const { fingerprint } = await getDeviceFingerprint();
    const browserInfo = getBrowserInfo();
    const browserSpecificFingerprint = `${fingerprint}-${browserInfo.browser}`;

    console.log(
      `Checking for device fingerprint: ${browserSpecificFingerprint.substring(
        0,
        8
      )}...`
    );

    const { data, error } = await supabase
      .from("device_credentials")
      .select("credential_id")
      .eq("user_id", userId)
      .eq("device_fingerprint", browserSpecificFingerprint);

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
    .order("last_used_at", { ascending: false });

  if (error) {
    console.error("Error getting credentials for user:", error);
    return [];
  }

  console.log(`Found ${data.length} total credentials for user`);

  // Log the raw credential data for debugging
  if (data.length > 0) {
    console.log("Device credentials raw data:");
    data.forEach((cred, index) => {
      console.log(`Credential ${index + 1}:`, {
        id: cred.id,
        credential_id: cred.credential_id,
        device_name: cred.device_name,
        device_fingerprint: cred.device_fingerprint
          ? cred.device_fingerprint.substring(0, 8) + "..."
          : "none",
        created_at: new Date(cred.created_at).toISOString(),
      });
    });
  }

  // Check if current device matches any of the credentials
  const { fingerprint } = await getDeviceFingerprint();
  const browserInfo = getBrowserInfo();
  const browserSpecificFingerprint = `${fingerprint}-${browserInfo.browser}`;

  // Transform the data into DeviceCredential objects
  const deviceCredentials = data.map((record) => ({
    credentialId: record.credential_id,
    userId: record.user_id,
    deviceType: record.device_details?.deviceType || "unknown",
    deviceName:
      record.device_name ||
      `${record.device_details?.os || "Unknown"} ${
        record.device_details?.browser || "Device"
      }`,
    browser: record.device_details?.browser || "unknown",
    os: record.device_details?.os || "unknown",
    userAgent: record.device_details?.userAgent || "",
    createdAt: record.created_at,
    lastUsedAt: record.last_used_at,
    isCurrentDevice: record.device_fingerprint === browserSpecificFingerprint,
  }));

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

    const { fingerprint } = await getDeviceFingerprint();
    const browserInfo = getBrowserInfo();
    const browserSpecificFingerprint = `${fingerprint}-${browserInfo.browser}`;

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

/**
 * Gets a specific device credential by ID
 */
export async function getDeviceCredential(
  userId: string,
  credentialId: string
): Promise<any | null> {
  try {
    console.log(
      `Getting device credential: user=${userId}, credential=${credentialId}`
    );

    // Use Supabase to query for the credential
    const { data, error } = await supabase
      .from("device_credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("credential_id", credentialId)
      .single();

    if (error) {
      console.error("Error fetching device credential:", error);
      return null;
    }

    if (!data) {
      console.log("No matching credential found");
      return null;
    }

    console.log("Found credential: ", data.id);
    return data;
  } catch (error) {
    console.error("Error fetching device credential:", error);
    return null;
  }
}
