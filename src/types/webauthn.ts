/**
 * This file provides type definitions from SimpleWebAuthn packages
 * for version 13+.
 */

// Import browser types directly from browser package (v13+)
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  AuthenticatorTransport,
  AuthenticatorAttachment,
  UserVerificationRequirement,
  AttestationConveyancePreference,
} from "@simplewebauthn/browser";

// Import server types directly from server package (v13+)
import type {
  VerifiedAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
  PublicKeyCredentialDescriptorJSON,
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";

// Type alias for compatibility with existing code
export type AuthenticatorTransportFuture = AuthenticatorTransport;
export type PublicKeyCredentialDescriptorFuture = {
  id: BufferSource;
  type: "public-key";
  transports?: AuthenticatorTransportFuture[];
};

// Re-export all types for use throughout the app
export {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  VerifiedAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
  PublicKeyCredentialDescriptorJSON,
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  AuthenticatorTransport,
  AuthenticatorAttachment,
  UserVerificationRequirement,
  AttestationConveyancePreference,
};
