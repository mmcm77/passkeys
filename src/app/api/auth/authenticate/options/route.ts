import { NextRequest, NextResponse } from "next/server";
import { generateWebAuthnAuthenticationOptions } from "@/lib/auth/webauthn";
import { getUserByEmail } from "@/lib/db/users";
import {
  getCredentialsByUserId,
  getCredentialsByEmail,
} from "@/lib/db/credentials";
import { storeChallenge } from "@/lib/auth/challenge-manager";
import { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export async function POST(request: NextRequest) {
  try {
    console.log("Authentication options request received");
    const { email, credentialId } = await request.json();
    console.log("Request data:", { email, credentialId });

    // For conditional UI / browser autofill, we might not have an email yet
    if (!email && !credentialId) {
      console.log(
        "No email or credentialId provided, generating generic options"
      );
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

    // If a specific credential ID is provided, use it for authentication
    if (credentialId) {
      console.log("Using specific credential ID:", credentialId);
      const options = await generateWebAuthnAuthenticationOptions([
        { id: credentialId },
      ]);

      // Store challenge with minimal data
      const challengeId = await storeChallenge(
        "authentication",
        options.challenge,
        { credentialId }
      );

      return NextResponse.json({
        options,
        challengeId,
      });
    }

    // Get user
    console.log("Looking up user by email:", email);
    const user = await getUserByEmail(email);
    console.log("User lookup result:", user ? "User found" : "User not found");

    if (!user) {
      // If no user found, check for credentials by email
      console.log("No user found, checking for credentials by email");
      const credentials = await getCredentialsByEmail(email);
      console.log("Credentials found:", credentials.length);

      const allowCredentials = credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransportFuture[],
      }));

      // Generate authentication options
      const options = await generateWebAuthnAuthenticationOptions(
        allowCredentials.length > 0 ? allowCredentials : []
      );

      // Store challenge
      const challengeId = await storeChallenge(
        "authentication",
        options.challenge,
        { email }
      );

      const passkeyOptions = credentials.map((cred) => ({
        id: cred.credentialId,
        username: email,
        displayName: cred.name || `Device (${cred.deviceType || "Unknown"})`,
      }));

      console.log("Returning passkey options:", passkeyOptions);

      return NextResponse.json({
        options,
        challengeId,
        passkeyOptions,
      });
    }

    // Get user's credentials
    console.log("Getting credentials for user:", user.id);
    const credentials = await getCredentialsByUserId(user.id);
    console.log("User credentials found:", credentials.length);

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

    const passkeyOptions = credentials.map((cred) => ({
      id: cred.credentialId,
      username: user.email,
      displayName: cred.name || `Device (${cred.deviceType || "Unknown"})`,
    }));

    console.log("Returning passkey options for user:", passkeyOptions);

    return NextResponse.json({
      options,
      challengeId,
      passkeyOptions,
    });
  } catch (error) {
    console.error("Authentication options error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
