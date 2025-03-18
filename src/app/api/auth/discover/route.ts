import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { prepareConditionalAuth } from "@/lib/auth/conditional-webauthn";
import { logger } from "@/lib/api/logger";
import { config } from "@/lib/config";

// Create a scoped logger for this route
const discoverLogger = logger.scope("WebAuthnDiscover");

interface DiscoverResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  error?: string;
}

/**
 * POST /api/auth/discover
 * Returns authentication options for credential discovery without prior email
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<DiscoverResponse>> {
  try {
    discoverLogger.log("Generating discovery options for conditional UI");

    // Check if browser supports platform authenticators
    const capabilities = await getWebAuthnCapabilities();
    discoverLogger.debug("WebAuthn capabilities detected:", capabilities);

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: config.webauthn.rpId || "localhost",
      userVerification: "preferred",
      allowCredentials: [], // Empty array enables credential discovery
      timeout: 120000, // 2 minute timeout for discovery
    });

    discoverLogger.debug("Authentication options generated");

    // Return the options directly since they already match the required type
    return NextResponse.json({ options });
  } catch (error) {
    discoverLogger.error("Error generating discovery options:", error);
    return NextResponse.json(
      {
        options: {} as PublicKeyCredentialRequestOptionsJSON,
        error: "Failed to generate discovery options",
      },
      { status: 500 }
    );
  }
}
