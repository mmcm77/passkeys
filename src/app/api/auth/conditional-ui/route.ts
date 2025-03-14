import { NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { prepareConditionalAuth } from "@/lib/auth/conditional-webauthn";
import { storeChallenge } from "@/lib/auth/challenge-manager";

/**
 * POST /api/auth/conditional-ui
 * Returns authentication options optimized for conditional UI
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get email
    const { email } = await request.json();

    // Check browser capabilities first
    const capabilities = await getWebAuthnCapabilities();
    if (!capabilities.hasConditionalMediation) {
      return Response.json(
        { error: "Browser does not support conditional UI" },
        { status: 400 }
      );
    }

    // Generate base authentication options
    const options = await generateAuthenticationOptions({
      rpID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
      userVerification: "preferred",
      allowCredentials: [], // Empty for discovery
    });

    // Enhance options for conditional UI
    const enhancedOptions = await prepareConditionalAuth(options, {
      mediation: "conditional",
      timeout: 60000, // 1 minute timeout
    });

    // Store the challenge for later verification
    const challengeId = await storeChallenge(
      "authentication",
      options.challenge,
      {
        email,
      }
    );

    // Return both the options and challengeId
    return Response.json({
      options: enhancedOptions.optionsJSON,
      challengeId,
    });
  } catch (error: any) {
    console.error("Conditional UI authentication error:", error);
    return Response.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
