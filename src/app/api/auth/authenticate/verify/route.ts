import { NextRequest, NextResponse } from "next/server";
import { verifyWebAuthnAuthentication } from "@/lib/auth/webauthn";
import { getUserById } from "@/lib/db/users";
import {
  getCredentialsByUserId,
  getCredentialByCredentialId,
  updateCredential,
} from "@/lib/db/credentials";
import { verifyChallenge, removeChallenge } from "@/lib/auth/challenge-manager";
import { createSession } from "@/lib/auth/session";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import {
  updateDeviceCredentialUsage,
  generateDeviceToken,
} from "@/lib/db/device-credentials";
import { logger } from "@/lib/api/logger";
import { config } from "@/lib/config";
import { type AuthenticationResponseJSON } from "@simplewebauthn/browser";
import type { User, Credential } from "@/types/auth";
import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";

// Create a scoped logger
const authVerifyLogger = logger.scope("AuthVerify");

interface VerifyRequestData {
  credential: AuthenticationResponseJSON;
  challengeId: string;
}

interface VerifyResponseData {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    displayName?: string;
    credentialId: string;
  };
}

interface VerifyErrorResponse {
  error: string;
  stack?: string;
  credential?: {
    id: string;
    type: string;
  };
}

interface ChallengeData {
  userId?: string;
  email?: string;
  credentialId?: string;
}

interface VerificationDebugInfo {
  credentialId: string;
  matchingCredential: {
    id: string;
    credentialId: string;
    publicKeyType: string;
    publicKeyLength: number;
  };
}

interface VerifyAuthResponse {
  verified: boolean;
  authenticationInfo?: VerifiedAuthenticationResponse;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyResponseData | VerifyErrorResponse>> {
  try {
    // Parse the request body
    const { credential, challengeId } =
      (await request.json()) as VerifyRequestData;

    authVerifyLogger.log("Authentication verification request received");
    authVerifyLogger.debug("Request data:", {
      credentialId: credential.id,
      challengeId,
    });

    // Verify challenge
    const challengeResult = await verifyChallenge(challengeId);
    if (!challengeResult || !challengeResult.challenge) {
      authVerifyLogger.warn("Challenge verification failed", { challengeId });
      return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
    }

    // Extract challenge data
    const challengeData = (challengeResult.data as ChallengeData) || {};
    authVerifyLogger.debug("Challenge data:", challengeData);

    // Get user information from challenge data or credential
    let user: User | null = null;
    if (challengeData.userId) {
      user = await getUserById(challengeData.userId);
    }

    // Get credential from database
    const credentialId = credential.id;
    const existingCredential = await getCredentialByCredentialId(credentialId);

    if (!existingCredential) {
      authVerifyLogger.warn("Credential not found", { credentialId });
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 400 }
      );
    }

    // If we found a credential but no user, get the user from the credential
    if (!user && existingCredential.userId) {
      user = await getUserById(existingCredential.userId);
    }

    if (!user) {
      authVerifyLogger.warn("User not found for credential", {
        credentialId,
        userId: existingCredential.userId,
      });
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    // Adapt credential to StoredCredential format
    const storedCredential = {
      credentialID: existingCredential.credentialId,
      credentialPublicKey: existingCredential.credentialPublicKey,
      counter: existingCredential.counter,
    };

    // Verify the authentication
    const verification = await verifyWebAuthnAuthentication(
      credential,
      challengeResult.challenge,
      storedCredential
    );

    // Update usage info
    if (verification.verified) {
      await updateDeviceCredentialUsage(user.id, credentialId);

      // Create a new session
      await createSession(user.id);

      // Generate a device token and store it
      try {
        const deviceToken = await generateDeviceToken(user.id, credentialId);

        // Create response with the token in a cookie
        const response = NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            credentialId: existingCredential.credentialId,
          },
        });

        // Set secure HTTP-only cookie with the device token
        response.cookies.set({
          name: "device_token",
          value: deviceToken,
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          // 30 days expiration
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });

        // Clean up the challenge
        await removeChallenge(challengeId);

        authVerifyLogger.log("Authentication successful with device token", {
          userId: user.id,
          email: user.email,
        });

        return response;
      } catch (tokenError) {
        // Log but continue if token generation fails
        authVerifyLogger.error("Failed to generate device token:", tokenError);

        // Clean up the challenge
        await removeChallenge(challengeId);

        // Return success without device token
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            credentialId: existingCredential.credentialId,
          },
        });
      }
    } else {
      authVerifyLogger.warn("Authentication failed", {
        verification,
        userId: user.id,
      });

      return NextResponse.json(
        { error: "Authentication failed", authenticated: false },
        { status: 400 }
      );
    }
  } catch (error) {
    const err = error as Error;
    authVerifyLogger.error("Error in authentication verification:", err);

    return NextResponse.json(
      {
        error: err.message,
        stack: config.env.isDevelopment ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
