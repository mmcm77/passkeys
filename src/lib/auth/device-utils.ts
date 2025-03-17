/**
 * Utilities for device detection and fingerprinting for passkey authentication
 */

import { getBrowserInfo } from "./browser-detection";
import { createHash } from "crypto";

/**
 * Detects the current device type based on user agent
 */
export function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const ua = navigator.userAgent;

  // Check if mobile
  if (
    /iPhone|Android.*Mobile|Mobile.*Android|Mobile Safari|Opera Mobi|Opera Mini|BlackBerry/.test(
      ua
    )
  ) {
    return "mobile";
  }

  // Check if tablet
  if (/iPad|Android(?!.*Mobile)|Tablet|PlayBook/.test(ua)) {
    return "tablet";
  }

  // Default to desktop
  return "desktop";
}

/**
 * Gets a readable name for the current device
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let os = "device";

  if (/Windows/.test(ua)) os = "Windows device";
  else if (/Macintosh/.test(ua)) os = "Mac device";
  else if (/iPhone/.test(ua)) os = "iPhone";
  else if (/iPad/.test(ua)) os = "iPad";
  else if (/iPod/.test(ua)) os = "iPod";
  else if (/Android/.test(ua)) os = "Android device";
  else if (/Linux/.test(ua)) os = "Linux device";

  const browserInfo = getBrowserInfo();
  return `${os} (${browserInfo.browser})`;
}

// Add deviceMemory to Navigator interface
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
}

/**
 * Generates a consistent device fingerprint based on available browser information
 * This is used to identify the same device across sessions for passkey usage
 */
export async function getDeviceFingerprint(): Promise<{
  fingerprint: string;
  components: any;
}> {
  if (typeof window === "undefined") {
    return {
      fingerprint: "server-side-rendering",
      components: { environment: "server" },
    };
  }

  try {
    const extendedNavigator = navigator as ExtendedNavigator;

    // Collect various signals that help identify the device
    const components = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      deviceMemory: extendedNavigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      gpu: getGPUInfo(),
      timezone: getTimeZoneInfo(),
      browser: getBrowserInfo().browser,
      os: getBrowserInfo().os,
    };

    // Create a text version of all signals for fingerprinting
    const signalText = Object.values(components).filter(Boolean).join("|||");

    // Use browser's SubtleCrypto if available for a secure hash
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(signalText);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      console.log(
        "Device fingerprint generated:",
        hashHex.substring(0, 8) + "..."
      );

      return {
        fingerprint: hashHex,
        components,
      };
    }

    // Fallback to a basic string hash
    let hash = 0;
    for (let i = 0; i < signalText.length; i++) {
      const char = signalText.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const fingerprint = Math.abs(hash).toString(16);
    return { fingerprint, components };
  } catch (error) {
    console.error("Error generating device fingerprint:", error);
    // Return a fallback based on UA only
    return {
      fingerprint: hash(navigator.userAgent || "unknown"),
      components: { userAgent: navigator.userAgent },
    };
  }
}

/**
 * Gets GPU information if available
 */
function getGPUInfo(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;

    if (gl) {
      // Type assertion for the debug info extension
      interface WebGLDebugRendererInfo {
        UNMASKED_VENDOR_WEBGL: number;
        UNMASKED_RENDERER_WEBGL: number;
      }

      const debugInfo = gl.getExtension(
        "WEBGL_debug_renderer_info"
      ) as WebGLDebugRendererInfo | null;
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
    return "";
  } catch (e) {
    return "";
  }
}

/**
 * Gets timezone information
 */
function getTimeZoneInfo(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return "";
  }
}

/**
 * Simple string hash function
 */
function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}
