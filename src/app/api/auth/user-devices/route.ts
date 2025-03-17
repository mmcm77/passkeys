import { NextRequest, NextResponse } from "next/server";
import { generateDeviceFingerprint } from "@/lib/auth/device-recognition";
import { getCurrentSession } from "@/lib/auth/session";
import supabase from "@/lib/supabase";

export async function GET() {
  try {
    // Get current user from session
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get devices for user
    const { data, error } = await supabase
      .from("device_credentials")
      .select("device_fingerprint, device_details, last_used_at, credential_id")
      .eq("user_id", session.userId)
      .order("last_used_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Get the current device fingerprint
    const { fingerprint } = await generateDeviceFingerprint();

    // Mark which devices are the current device
    const devicesWithCurrentFlag = data.map((device) => ({
      ...device,
      isCurrentDevice: device.device_fingerprint === fingerprint,
    }));

    return NextResponse.json({ devices: devicesWithCurrentFlag });
  } catch (_error) {
    console.error("Error fetching user devices:", _error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Endpoint to remove a device credential
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { deviceFingerprint } = await request.json();

    const { error } = await supabase
      .from("device_credentials")
      .delete()
      .eq("user_id", session.userId)
      .eq("device_fingerprint", deviceFingerprint);

    if (error) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    console.error("Error deleting device:", _error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
