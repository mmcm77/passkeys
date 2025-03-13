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

export async function POST(request: NextRequest) {
  try {
    const { credential, challengeId } = await request.json();

    // Verify challenge
    const challengeResult = await verifyChallenge(
      challengeId,
      "authentication"
    );
    if (!challengeResult.valid) {
      return NextResponse.json(
        { error: challengeResult.error },
        { status: 400 }
      );
    }

    // Get challenge data
    const { challenge, data } = challengeResult;

    // For conditional UI, we might not have user data in the challenge
    // In this case, we need to find the user based on the credential ID
    let userId: string;
    let user;

    if (data && typeof data.userId === "string") {
      // Standard flow with email provided
      userId = data.userId;

      // Get user
      user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else {
      // Conditional UI flow (no email provided)
      // We need to find the credential first, then get the user
      const normalizedCredentialId = isoBase64URL.isBase64URL(credential.id)
        ? credential.id
        : isoBase64URL.fromBuffer(Buffer.from(credential.id, "base64"));

      // Find the credential by ID
      const matchingCredential = await getCredentialByCredentialId(
        normalizedCredentialId
      );

      if (!matchingCredential) {
        return NextResponse.json(
          { error: "No matching credential found" },
          { status: 404 }
        );
      }

      userId = matchingCredential.userId;

      // Get user
      user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    // Clean up challenge
    await removeChallenge(challengeId);

    // Get user's credentials
    const credentials = await getCredentialsByUserId(userId);

    // Find matching credential
    let matchingCredential = credentials.find(
      (c) => c.credentialId === credential.id
    );

    // Try base64url normalized format if direct match fails
    if (!matchingCredential) {
      // Normalize the requested ID (handling different base64url variants)
      const normalizedId = isoBase64URL.isBase64URL(credential.id)
        ? credential.id
        : isoBase64URL.fromBuffer(Buffer.from(credential.id, "base64"));

      // Try matching with normalized ID
      matchingCredential = credentials.find(
        (c) =>
          c.credentialId === normalizedId ||
          isoBase64URL
            .fromBuffer(isoBase64URL.toBuffer(c.credentialId))
            .toString() ===
            isoBase64URL
              .fromBuffer(isoBase64URL.toBuffer(normalizedId))
              .toString()
      );
    }

    if (!matchingCredential) {
      return NextResponse.json(
        { error: "No matching credential found" },
        { status: 404 }
      );
    }

    // Ensure challenge is a string
    if (typeof challenge !== "string") {
      return NextResponse.json(
        { error: "Invalid challenge format" },
        { status: 400 }
      );
    }

    // Verify authentication
    try {
      // Log detailed information about the credential for debugging
      console.log("=== AUTHENTICATION DATA ===");
      console.log("Credential ID from request:", credential.id);
      console.log("Matching credential from DB:", {
        id: matchingCredential.id,
        credentialId: matchingCredential.credentialId,
        publicKeyType: typeof matchingCredential.credentialPublicKey,
        publicKeyLength: matchingCredential.credentialPublicKey.length,
        publicKey: matchingCredential.credentialPublicKey,
      });
      console.log("========================");

      const verification = await verifyWebAuthnAuthentication(
        credential,
        challenge,
        {
          credentialID: matchingCredential.credentialId,
          credentialPublicKey: matchingCredential.credentialPublicKey,
          counter: matchingCredential.counter,
        }
      );

      // Update credential counter
      if (
        verification.authenticationInfo.newCounter > matchingCredential.counter
      ) {
        await updateCredential(matchingCredential.id, {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: Date.now(),
        });
      }

      // Create session
      const session = await createSession(user.id);

      // Set session cookie
      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      });

      response.cookies.set({
        name: "session",
        value: session.id,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return response;
    } catch (error) {
      console.error("Authentication verification error:", error);

      // Log more details about the credential for debugging
      console.log("Credential details:", {
        id: matchingCredential.id,
        credentialId: matchingCredential.credentialId,
        publicKeyType: typeof matchingCredential.credentialPublicKey,
        publicKeyLength:
          typeof matchingCredential.credentialPublicKey === "string"
            ? matchingCredential.credentialPublicKey.length
            : "not a string",
      });

      return NextResponse.json(
        {
          error: (error as Error).message,
          stack: (error as Error).stack,
          credential: {
            id: credential.id,
            type: credential.type,
            // Don't include sensitive data
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Authentication verification error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
