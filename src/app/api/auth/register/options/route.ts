import { NextRequest, NextResponse } from "next/server";
import { generateWebAuthnRegistrationOptions } from "@/lib/auth/webauthn";
import { createUser, getUserByEmail } from "@/lib/db/users";
import { storeChallenge } from "@/lib/auth/challenge-manager";
import { logger } from "@/lib/api/logger";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";

// Create a scoped logger for this route
const registerLogger = logger.scope("RegisterOptions");

type RegistrationOptionsResponse = PublicKeyCredentialCreationOptionsJSON & {
  challengeId: string;
};

interface RegistrationRequestBody {
  email: string;
  displayName: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<RegistrationOptionsResponse | { error: string }>> {
  try {
    const body = (await request.json()) as RegistrationRequestBody;
    const { email, displayName } = body;
    registerLogger.log(`Processing registration for email: ${email}`);

    // Check if user exists
    let user = await getUserByEmail(email);
    if (!user) {
      registerLogger.log("User does not exist, creating new user");
      // Create new user
      user = await createUser({ email, displayName });
      registerLogger.debug(`Created new user with ID: ${user.id}`);
    } else {
      registerLogger.log(`User already exists with ID: ${user.id}`);
    }

    // Generate registration options
    registerLogger.debug("Generating WebAuthn registration options");
    const options = await generateWebAuthnRegistrationOptions(
      user.id,
      user.email,
      user.displayName || user.email
    );

    // Store challenge
    registerLogger.debug("Storing challenge");
    const challengeId = await storeChallenge(
      "registration",
      options.challenge,
      {
        userId: user.id,
        email: user.email,
      }
    );

    registerLogger.log("Registration options created successfully");

    // Return the options using NextResponse
    return NextResponse.json({
      ...options,
      challengeId,
    });
  } catch (error) {
    registerLogger.error("Error creating registration options:", error);
    return NextResponse.json(
      { error: "Failed to create registration options" },
      { status: 500 }
    );
  }
}
