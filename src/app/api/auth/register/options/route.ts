import { NextRequest, NextResponse } from "next/server";
import { generateWebAuthnRegistrationOptions } from "@/lib/auth/webauthn";
import { createUser, getUserByEmail } from "@/lib/db/users";
import { storeChallenge } from "@/lib/auth/challenge-manager";

export async function POST(request: NextRequest) {
  try {
    const { email, displayName } = await request.json();

    // Check if user exists
    let user = await getUserByEmail(email);
    if (!user) {
      // Create new user
      user = await createUser({ email, displayName });
    }

    // Generate registration options
    const options = await generateWebAuthnRegistrationOptions(
      user.id,
      user.email,
      user.displayName || user.email
    );

    // Store challenge
    const challengeId = await storeChallenge(
      "registration",
      options.challenge,
      {
        userId: user.id,
        email: user.email,
      }
    );

    // Return the options directly in the response, along with the challengeId
    return NextResponse.json({
      ...options, // Spread the registration options at the top level
      challengeId, // Include challengeId as an additional field
    });
  } catch (error) {
    console.error("Registration options error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
