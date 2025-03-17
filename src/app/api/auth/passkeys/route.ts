import { NextResponse } from "next/server";
import { getCredentialsForUser } from "@/lib/db/device-credentials";

export async function GET(request: Request) {
  try {
    // Get the userId from the query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log(`API: Retrieving passkeys for user ${userId}`);

    // Get all passkeys for the user
    const passkeys = await getCredentialsForUser(userId);

    console.log(
      `API: Retrieved ${passkeys.length} passkeys for user ${userId}`
    );

    // Log some details about the passkeys for debugging
    passkeys.forEach((passkey, index) => {
      console.log(`Passkey ${index + 1}:`, {
        id: passkey.credentialId.substring(0, 8) + "...",
        deviceName: passkey.deviceName,
        browser: passkey.browser,
        os: passkey.os,
        isCurrentDevice: passkey.isCurrentDevice,
        createdAt: new Date(passkey.createdAt).toISOString(),
        lastUsedAt: new Date(passkey.lastUsedAt).toISOString(),
      });
    });

    // Also check for duplicates to help with debugging
    const credentialIds = new Set<string>();
    const duplicates: string[] = [];

    passkeys.forEach((passkey) => {
      if (credentialIds.has(passkey.credentialId)) {
        duplicates.push(passkey.credentialId);
      } else {
        credentialIds.add(passkey.credentialId);
      }
    });

    if (duplicates.length > 0) {
      console.log(
        `Found ${duplicates.length} duplicate credential IDs:`,
        duplicates.map((id) => id.substring(0, 8) + "...")
      );
    } else {
      console.log("No duplicate credential IDs found");
    }

    // Return the passkeys
    return NextResponse.json(
      {
        passkeys,
        count: passkeys.length,
        uniqueCount: credentialIds.size,
        hasDuplicates: duplicates.length > 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching passkeys:", error);
    return NextResponse.json(
      { error: "Failed to fetch passkeys" },
      { status: 500 }
    );
  }
}
