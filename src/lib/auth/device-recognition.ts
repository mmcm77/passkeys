export async function generateDeviceFingerprint(): Promise<{
  fingerprint: string;
  components: Record<string, any>;
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

  // Collect various device signals (only runs in browser)
  const components = {
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
      /Chrome|Firefox|Safari|Edge/.exec(components.userAgent)?.[0] || "",
  };

  // Create fingerprint
  const fingerprintString = JSON.stringify(stableComponents);
  const fingerprint = await crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(fingerprintString))
    .then((hashBuffer) =>
      Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );

  return { fingerprint, components };
}
