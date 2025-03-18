export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Credential {
  id: string;
  userId: string;
  // Always store in base64url format
  credentialId: string;
  // Store as base64url string in database
  credentialPublicKey: string;
  // Added for SimpleWebAuthn compatibility
  webauthnUserId: string;
  counter: number;
  // Added for SimpleWebAuthn compatibility
  deviceType?: "singleDevice" | "multiDevice";
  // Added for SimpleWebAuthn compatibility
  backedUp?: boolean;
  transports?: string[];
  deviceInfo?: DeviceInfo;
  createdAt: number;
  lastUsedAt: number;
  name?: string;
}

export interface DeviceInfo {
  browserFamily?: string;
  osFamily?: string;
  isMobile?: boolean;
  isDesktop?: boolean;
  isTablet?: boolean;
  [key: string]: unknown;
}

export interface Challenge {
  id: string;
  challenge: string;
  type: "registration" | "authentication";
  data: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface StoredCredential {
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
}

export interface BrowserCapabilities {
  supportsWebAuthn: boolean;
  supportsConditionalUI: boolean;
  platformAuthenticator: boolean;
  isMobile: boolean;
  browserName: string;
}

export interface ConditionalAuthState {
  status: "available" | "unavailable" | "pending" | "error";
  error?: string;
}

export interface DeviceCredential {
  credentialId: string;
  userId: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  os: string;
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
  isCurrentDevice: boolean;
}

export interface EcosystemCredential {
  provider:
    | "iCloud Keychain"
    | "Google Password Manager"
    | "Microsoft Account"
    | "Other";
  credentials: Credential[];
  createdAt: number;
  lastUsedAt: number;
  isMultiDevice: boolean;
  isBackedUp: boolean;
}
