import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { prepareConditionalAuth } from "@/lib/auth/conditional-webauthn";
import { storeChallenge } from "@/lib/auth/challenge-manager";
import { logger } from "@/lib/api/logger";
import { config } from "@/lib/config";

// Create a scoped logger for this route
const condUiLogger = logger.scope("ConditionalUI");

interface ConditionalUIResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  error?: string;
}

/**
 * POST /api/auth/conditional-ui
 * Returns authentication options optimized for conditional UI
 */
export async function POST(
  request: Request
): Promise<NextResponse<ConditionalUIResponse>> {
  try {
    const body = (await request.json()) as {
      userId: string;
      userVerification?: "required" | "preferred" | "discouraged";
    };

    const options = await generateAuthenticationOptions({
      rpID: process.env.NEXT_PUBLIC_RP_ID!,
      userVerification: body.userVerification || "preferred",
      timeout: 60000,
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      {
        options: null as any,
        error: "Failed to generate authentication options",
      },
      { status: 500 }
    );
  }
}
