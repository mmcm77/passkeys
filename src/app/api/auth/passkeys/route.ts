import { NextRequest, NextResponse } from "next/server";
import { getCredentialsForUser } from "@/lib/db/device-credentials";
import { logger } from "@/lib/api/logger";
import { type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { generateWebAuthnRegistrationOptions } from "@/lib/auth/webauthn";
import { getUserById } from "@/lib/db/users";

// Create a scoped logger for this route
const passkeyLogger = logger.scope("PasskeysAPI");

interface PasskeyResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
  error?: string;
}

export async function GET(
  request: Request
): Promise<NextResponse<PasskeyResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          options: {} as PublicKeyCredentialCreationOptionsJSON,
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    passkeyLogger.log(`Retrieving passkeys for user ${userId}`);

    // Get all passkeys for the user
    const passkeys = await getCredentialsForUser(userId);

    passkeyLogger.log(
      `Retrieved ${passkeys.length} passkeys for user ${userId}`
    );

    // Log some details about the passkeys for debugging
    passkeys.forEach((passkey, index) => {
      passkeyLogger.debug(`Passkey ${index + 1}:`, {
        id: passkey.credentialId.substring(0, 8) + "...",
        deviceName: passkey.deviceName,
        browser: passkey.browser,
        os: passkey.os,
        isCurrentDevice: passkey.isCurrentDevice,
        createdAt: new Date(passkey.createdAt).toISOString(),
        lastUsedAt: new Date(passkey.lastUsedAt).toISOString(),
      });
    });

    // Check for duplicates to help with debugging
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
      passkeyLogger.warn(
        `Found ${duplicates.length} duplicate credential IDs:`,
        duplicates.map((id) => id.substring(0, 8) + "...")
      );
    } else {
      passkeyLogger.debug("No duplicate credential IDs found");
    }

    // Generate passkey options
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const options = await generateWebAuthnRegistrationOptions(
      userId,
      user.email,
      user.displayName || user.email
    );

    return NextResponse.json({ options });
  } catch (error) {
    passkeyLogger.error("Error retrieving passkeys:", error);
    return NextResponse.json(
      {
        options: {} as PublicKeyCredentialCreationOptionsJSON,
        error: "Failed to generate passkey options",
      },
      { status: 500 }
    );
  }
}
