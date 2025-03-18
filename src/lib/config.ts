/**
 * Application configuration
 * Centralizes environment variables and other configuration settings
 */
export const config = {
  /**
   * Environment settings
   */
  env: {
    /** Current environment (development, test, production) */
    nodeEnv: process.env.NODE_ENV || "development",
    /** Whether the app is running in production mode */
    isProduction: process.env.NODE_ENV === "production",
    /** Whether the app is running in development mode */
    isDevelopment: process.env.NODE_ENV === "development",
    /** Whether the app is running in test mode */
    isTest: process.env.NODE_ENV === "test",
  },

  /**
   * API settings
   */
  api: {
    /** Base URL for API endpoints */
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
    /** Whether to enable detailed logging in production */
    enableProductionLogging: process.env.ENABLE_PROD_LOGGING === "true",
  },

  /**
   * Authentication settings
   */
  auth: {
    /** Session cookie name */
    sessionCookieName: "session",
    /** Session cookie max age in seconds (default: 7 days) */
    sessionMaxAge: parseInt(
      process.env.SESSION_MAX_AGE || String(60 * 60 * 24 * 7)
    ),
    /** Whether to enable debug mode for authentication */
    debugMode: process.env.AUTH_DEBUG === "true",
  },

  /**
   * Firebase configuration
   */
  firebase: {
    /** Firebase API key */
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    /** Firebase auth domain */
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    /** Firebase project ID */
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    /** Firebase storage bucket */
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    /** Firebase messaging sender ID */
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    /** Firebase app ID */
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  },

  /**
   * WebAuthn settings
   */
  webauthn: {
    /** The relying party ID (typically the domain name) */
    get rpId() {
      // Client-side runtime detection when env var is not available
      if (!process.env.NEXT_PUBLIC_RP_ID && typeof window !== "undefined") {
        return window.location.hostname;
      }
      return process.env.NEXT_PUBLIC_RP_ID || "";
    },
    /** The relying party name (shown to users) */
    rpName: process.env.NEXT_PUBLIC_RP_NAME || "Passkeys App",
    /** The origin for WebAuthn operations */
    get origin() {
      // Client-side runtime detection when env var is not available
      if (!process.env.NEXT_PUBLIC_ORIGIN && typeof window !== "undefined") {
        return window.location.origin;
      }
      return process.env.NEXT_PUBLIC_ORIGIN || "";
    },
    /** Whether to enforce cross-platform authenticators */
    requireCrossPlatform: process.env.REQUIRE_CROSS_PLATFORM === "true",
  },
};
