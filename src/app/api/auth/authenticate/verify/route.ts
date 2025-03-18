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
import { updateDeviceCredentialUsage } from "@/lib/db/device-credentials";
import { logger } from "@/lib/api/logger";
import { config } from "@/lib/config";
import { type AuthenticationResponseJSON } from "@simplewebauthn/browser";
import type { User, Credential } from "@/types/auth";
import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

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
): Promise<NextResponse<VerifyAuthResponse>> {
  try {
    const body = (await request.json()) as {
      response: AuthenticationResponseJSON;
      challenge: string;
      credential: {
        id: string;
        publicKey: string;
        counter: number;
      };
    };

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: body.challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID!,
      credential: {
        id: body.credential.id,
        publicKey: isoBase64URL.toBuffer(body.credential.publicKey),
        counter: body.credential.counter,
      },
    });

    return NextResponse.json({
      verified: verification.verified,
      authenticationInfo: verification,
    });
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      {
        verified: false,
        error: "Failed to verify authentication",
      },
      { status: 500 }
    );
  }
}
