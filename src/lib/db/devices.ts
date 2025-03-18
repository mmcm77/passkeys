import supabase from "@/lib/supabase";
import { DeviceComponents } from "@/lib/auth/device-recognition";

interface DeviceInfo {
  name: string;
  fingerprint: string;
  components: DeviceComponents;
}

/**
 * Save a user device to the database
 */
export async function saveUserDevice(
  userId: string,
  deviceInfo: DeviceInfo
): Promise<void> {
  // Check if device already exists
  const { data: existingDevices } = await supabase
    .from("device_credentials")
    .select("id")
    .eq("user_id", userId)
    .eq("device_fingerprint", deviceInfo.fingerprint)
    .limit(1);

  // If device already exists, update it
  if (existingDevices && existingDevices.length > 0 && existingDevices[0]?.id) {
    await supabase
      .from("device_credentials")
      .update({
        name: deviceInfo.name,
        device_details: {
          components: deviceInfo.components,
          updatedAt: new Date().toISOString(),
        },
        last_used_at: new Date().toISOString(),
      })
      .eq("id", existingDevices[0].id);
  } else {
    // Otherwise, create a new device entry
    await supabase.from("device_credentials").insert({
      user_id: userId,
      name: deviceInfo.name,
      device_fingerprint: deviceInfo.fingerprint,
      device_details: {
        components: deviceInfo.components,
        createdAt: new Date().toISOString(),
      },
      last_used_at: new Date().toISOString(),
    });
  }
}
