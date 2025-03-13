import { NextRequest, NextResponse } from "next/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

export async function POST(request: NextRequest) {
  try {
    const { credentialId } = await request.json();

    // Check various formats and conversions
    const isBase64URL = isoBase64URL.isBase64URL(credentialId);

    let standardBase64 = "";
    let base64URLFromStandard = "";
    let hexRepresentation = "";

    try {
      // Convert base64url to standard base64
      standardBase64 = credentialId
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(
          credentialId.length + ((4 - (credentialId.length % 4)) % 4),
          "="
        );

      // Convert standard base64 back to base64url
      const buffer = Buffer.from(standardBase64, "base64");
      base64URLFromStandard = isoBase64URL.fromBuffer(buffer);

      // Get hex representation
      hexRepresentation = buffer.toString("hex");
    } catch (error) {
      // Handle conversion errors
    }

    return NextResponse.json({
      original: credentialId,
      isBase64URL,
      standardBase64,
      base64URLFromStandard,
      hexRepresentation,
      roundTripMatches: credentialId === base64URLFromStandard,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
