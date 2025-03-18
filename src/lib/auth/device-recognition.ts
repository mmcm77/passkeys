export interface DeviceComponents {
  userAgent?: string;
  language?: string;
  platform?: string;
  screenResolution?: string;
  screenColorDepth?: number;
  timezone?: string;
  browserPluginsLength?: number;
  hasLocalStorage?: boolean;
  hasSessionStorage?: boolean;
  hasIndexedDB?: boolean;
  cpuCores?: number;
  isServer?: boolean;
  environment?: string;
  timestamp?: number;
  error?: boolean;
}

export async function generateDeviceFingerprint(): Promise<{
  fingerprint: string;
  components: DeviceComponents;
}> {
  // Check if we're running in a browser environment
  const isBrowser =
    typeof window !== "undefined" && typeof navigator !== "undefined";

  if (!isBrowser) {
    // Return a server-side placeholder when running on server
    console.log("Generating server-side placeholder fingerprint");
    return {
      fingerprint: "server-side-placeholder",
      components: {
        isServer: true,
        environment: "server",
        timestamp: Date.now(),
      },
    };
  }

  try {
    // Collect various device signals (only runs in browser)
    const components: DeviceComponents = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      screenColorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserPluginsLength: navigator.plugins?.length || 0,
      hasLocalStorage: !!window.localStorage,
      hasSessionStorage: !!window.sessionStorage,
      hasIndexedDB: !!window.indexedDB,
      cpuCores: navigator.hardwareConcurrency || 0,
    };

    // Create a stable hash based on the most reliable components
    const stableComponents = {
      platform: components.platform,
      screenResolution: components.screenResolution,
      language: components.language,
      timezone: components.timezone,
      userAgentBrowser:
        /Chrome|Firefox|Safari|Edge/.exec(components.userAgent ?? "")?.[0] ||
        "",
    };

    // Create fingerprint
    const fingerprintString = JSON.stringify(stableComponents);

    // Check if Web Crypto API is available
    if (window.crypto && window.crypto.subtle) {
      const fingerprint = await crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(fingerprintString))
        .then((hashBuffer) =>
          Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        );

      return { fingerprint, components };
    } else {
      // Fallback if crypto API is not available
      console.warn(
        "Web Crypto API not available, using simplified fingerprint"
      );
      // Simple string hash function as fallback
      let hash = 0;
      for (let i = 0; i < fingerprintString.length; i++) {
        const char = fingerprintString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      const fingerprint = Math.abs(hash).toString(16);

      return { fingerprint, components };
    }
  } catch (error) {
    console.error("Error generating device fingerprint:", error);
    // Return a fallback fingerprint in case of errors
    return {
      fingerprint: `fallback-${Date.now()}`,
      components: {
        error: true,
        timestamp: Date.now(),
      },
    };
  }
}
