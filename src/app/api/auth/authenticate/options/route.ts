import { NextRequest, NextResponse } from "next/server";
import { generateWebAuthnAuthenticationOptions } from "@/lib/auth/webauthn";
import { getUserByEmail } from "@/lib/db/users";
import { getCredentialsByUserId } from "@/lib/db/credentials";
import { storeChallenge } from "@/lib/auth/challenge-manager";
import { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // For conditional UI / browser autofill, we might not have an email yet
    if (!email) {
      // Generate authentication options without specifying credentials
      // This allows the browser to use any available passkey
      const options = await generateWebAuthnAuthenticationOptions([]);

      // Store challenge without user data
      const challengeId = await storeChallenge(
        "authentication",
        options.challenge,
        {} // No user data for now, will be resolved after authentication
      );

      return NextResponse.json({
        options,
        challengeId,
      });
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's credentials
    const credentials = await getCredentialsByUserId(user.id);

    // Format credentials for WebAuthn
    const allowCredentials = credentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    // Generate authentication options
    const options = await generateWebAuthnAuthenticationOptions(
      allowCredentials
    );

    // Store challenge
    const challengeId = await storeChallenge(
      "authentication",
      options.challenge,
      {
        userId: user.id,
        email: user.email,
      }
    );

    return NextResponse.json({
      options,
      challengeId,
    });
  } catch (error) {
    console.error("Authentication options error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
