import { NextRequest, NextResponse } from "next/server";
import { generateWebAuthnAuthenticationOptions } from "@/lib/auth/webauthn";
import { getUserByEmail } from "@/lib/db/users";
import {
  getCredentialsByUserId,
  getCredentialsByEmail,
} from "@/lib/db/credentials";
import { storeChallenge } from "@/lib/auth/challenge-manager";
import { type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server";
import { AuthenticatorTransportFuture } from "@/types/webauthn";
import { logger } from "@/lib/api/logger";

// Create a scoped logger for this route
const authLogger = logger.scope("AuthOptions");

interface RequestData {
  email?: string;
  credentialId?: string;
}

interface PasskeyOption {
  id: string;
  username: string;
  displayName: string;
}

interface AuthenticationOptionsResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeId: string;
  passkeyOptions?: PasskeyOption[];
}

interface AllowCredential {
  id: string;
  transports?: AuthenticatorTransportFuture[];
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AuthenticationOptionsResponse | { error: string }>> {
  try {
    authLogger.log("Authentication options request received");
    const { email, credentialId } = (await request.json()) as RequestData;
    authLogger.debug("Request data:", { email, credentialId });

    // For conditional UI / browser autofill, we might not have an email yet
    if (!email && !credentialId) {
      authLogger.log(
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
      authLogger.log("Using specific credential ID:", credentialId);
      const allowCredentials: AllowCredential[] = [{ id: credentialId }];
      const options = await generateWebAuthnAuthenticationOptions(
        allowCredentials
      );

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
    authLogger.log("Looking up user by email:", email);
    const user = await getUserByEmail(email!);
    authLogger.debug(
      "User lookup result:",
      user ? "User found" : "User not found"
    );

    if (!user) {
      // If no user found, check for credentials by email
      authLogger.log("No user found, checking for credentials by email");
      const credentials = await getCredentialsByEmail(email!);
      authLogger.debug("Credentials found:", credentials.length);

      const allowCredentials: AllowCredential[] = credentials.map((cred) => ({
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

      const passkeyOptions: PasskeyOption[] = credentials.map((cred) => ({
        id: cred.credentialId,
        username: email!,
        displayName: cred.name || `Device (${cred.deviceType || "Unknown"})`,
      }));

      authLogger.debug("Returning passkey options:", passkeyOptions);

      return NextResponse.json({
        options,
        challengeId,
        passkeyOptions,
      });
    }

    // Get user's credentials
    authLogger.log("Getting credentials for user:", user.id);
    const credentials = await getCredentialsByUserId(user.id);
    authLogger.debug("User credentials found:", credentials.length);

    // Format credentials for WebAuthn
    const allowCredentials: AllowCredential[] = credentials.map((cred) => ({
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

    const passkeyOptions: PasskeyOption[] = credentials.map((cred) => ({
      id: cred.credentialId,
      username: user.email,
      displayName: cred.name || `Device (${cred.deviceType || "Unknown"})`,
    }));

    authLogger.debug("Returning passkey options for user:", passkeyOptions);

    return NextResponse.json({
      options,
      challengeId,
      passkeyOptions,
    });
  } catch (error) {
    authLogger.error("Error in authentication options:", error);
    return NextResponse.json(
      { error: "Authentication options generation failed" },
      { status: 400 }
    );
  }
}
