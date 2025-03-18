import { NextRequest } from "next/server";

export interface DeviceInfo {
  browserFamily: string;
  browserVersion?: string;
  osFamily: string;
  osVersion?: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  deviceName: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Detect browser information from user agent
 * @param userAgent The user agent string
 * @returns Browser family and version
 */
export function detectBrowser(userAgent: string): {
  family: string;
  version?: string;
} {
  // Browser detection patterns
  if (userAgent.includes("Edg/")) {
    const match = userAgent.match(/Edg\/(\d+(\.\d+)?)/);
    return { family: "Edge", version: match?.[1] };
  } else if (userAgent.includes("Chrome/")) {
    const match = userAgent.match(/Chrome\/(\d+(\.\d+)?)/);
    return { family: "Chrome", version: match?.[1] };
  } else if (userAgent.includes("Firefox/")) {
    const match = userAgent.match(/Firefox\/(\d+(\.\d+)?)/);
    return { family: "Firefox", version: match?.[1] };
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    const match = userAgent.match(/Version\/(\d+(\.\d+)?)/);
    return { family: "Safari", version: match?.[1] };
  } else {
    return { family: "Unknown" };
  }
}

/**
 * Detect operating system information from user agent
 * @param userAgent The user agent string
 * @returns OS family and version
 */
export function detectOS(userAgent: string): {
  family: string;
  version?: string;
} {
  // OS detection patterns
  if (userAgent.includes("Windows")) {
    const match = userAgent.match(/Windows NT (\d+(\.\d+)?)/);
    const version = match?.[1];
    const versionMap: Record<string, string> = {
      "10.0": "10",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
      "6.0": "Vista",
      "5.2": "XP 64-bit",
      "5.1": "XP",
    };
    return {
      family: "Windows",
      version: version ? versionMap[version] || version : undefined,
    };
  } else if (userAgent.includes("Mac OS X")) {
    let match = userAgent.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/);
    if (!match) {
      match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    }
    const version = match?.[1]?.replace(/_/g, ".");
    return { family: "macOS", version };
  } else if (userAgent.includes("iPhone OS") || userAgent.includes("iPad")) {
    const match = userAgent.match(/OS (\d+[._]\d+([._]\d+)?)/);
    const version = match?.[1]?.replace(/_/g, ".");
    return { family: "iOS", version };
  } else if (userAgent.includes("Android")) {
    const match = userAgent.match(/Android (\d+(\.\d+)?)/);
    return { family: "Android", version: match?.[1] };
  } else if (userAgent.includes("Linux")) {
    return { family: "Linux" };
  } else {
    return { family: "Unknown" };
  }
}

/**
 * Detect device type from user agent
 * @param userAgent The user agent string
 * @returns Device type classification
 */
export function detectDeviceType(
  userAgent: string
): "mobile" | "tablet" | "desktop" | "unknown" {
  const lowerCaseUA = userAgent.toLowerCase();

  // Check for mobile devices
  if (
    lowerCaseUA.includes("iphone") ||
    (lowerCaseUA.includes("android") && !lowerCaseUA.includes("tablet")) ||
    lowerCaseUA.includes("mobile")
  ) {
    return "mobile";
  }

  // Check for tablets
  if (
    lowerCaseUA.includes("ipad") ||
    lowerCaseUA.includes("tablet") ||
    (lowerCaseUA.includes("android") && lowerCaseUA.includes("tablet"))
  ) {
    return "tablet";
  }

  // Default to desktop for most other cases
  if (
    lowerCaseUA.includes("windows") ||
    lowerCaseUA.includes("macintosh") ||
    lowerCaseUA.includes("linux")
  ) {
    return "desktop";
  }

  return "unknown";
}

/**
 * Extract browser and device information from request
 * @param request NextRequest or User-Agent string
 * @returns Comprehensive device information
 */
export function getDeviceInfo(request: NextRequest | string): DeviceInfo {
  const userAgent =
    typeof request === "string"
      ? request
      : request.headers.get("user-agent") || "";

  // Get browser details
  const browser = detectBrowser(userAgent);

  // Get OS details
  const os = detectOS(userAgent);

  // Get device type
  const deviceType = detectDeviceType(userAgent);

  // Generate a human-readable device name
  const deviceName = `${os.family}${os.version ? ` ${os.version}` : ""} ${
    browser.family
  }${browser.version ? ` ${browser.version}` : ""}`;

  return {
    browserFamily: browser.family,
    browserVersion: browser.version,
    osFamily: os.family,
    osVersion: os.version,
    deviceType,
    deviceName,
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
  };
}

/**
 * Alias for backward compatibility
 */
export const getBrowserInfo = getDeviceInfo;
