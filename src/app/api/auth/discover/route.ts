import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getWebAuthnCapabilities } from "@/lib/auth/browser-detection";
import { prepareConditionalAuth } from "@/lib/auth/conditional-webauthn";

/**
 * POST /api/auth/discover
 * Returns authentication options for credential discovery without prior email
 */
export async function POST() {
  try {
    // Generate base authentication options for discovery
    const options = await generateAuthenticationOptions({
      rpID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
      userVerification: "preferred",
      allowCredentials: [], // Empty array enables credential discovery
    });

    // Check if browser supports platform authenticators
    const capabilities = await getWebAuthnCapabilities();

    // Enhance options for discovery flow
    const enhancedOptions = await prepareConditionalAuth(options, {
      mediation: capabilities.hasConditionalMediation
        ? "conditional"
        : "optional",
      timeout: 120000, // 2 minute timeout for discovery
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    });

    return Response.json(enhancedOptions);
  } catch (error: unknown) {
    console.error("Credential discovery error:", error);
    return Response.json(
      { error: "Failed to generate discovery options" },
      { status: 500 }
    );
  }
}
