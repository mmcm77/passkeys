import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { getCredentialsForCurrentDevice } from "@/lib/db/device-credentials";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ hasPasskeysOnDevice: false });
    }

    try {
      // Check if user has passkeys on this device
      // Note: On server-side, this will use the placeholder fingerprint
      const credentials = await getCredentialsForCurrentDevice(user.id);

      // When running on server, we'll always get an empty array since we can't
      // actually check browser fingerprints server-side
      // The client-side code will re-check this with the real fingerprint
      return NextResponse.json({
        hasPasskeysOnDevice: credentials.length > 0,
        credentialCount: credentials.length,
        // Add additional flag to indicate if this was a server-side check
        isServerSideCheck: typeof window === "undefined",
      });
    } catch (error) {
      console.error("Error checking device credentials:", error);
      // Return false for server-side errors, client will handle actual check
      return NextResponse.json({
        hasPasskeysOnDevice: false,
        error: "Server-side error checking credentials",
      });
    }
  } catch (error) {
    console.error("Error checking device passkeys:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
