import { isDeviceRecognizedForUser } from "./db/device-credentials";
import { getUserByEmail } from "./db/users";

const STORAGE_KEY = "recent_emails";
const DEBUG_LOG_KEY = "recent_emails_debug_log";
const MAX_EMAILS = 3;
const EMAILS_UPDATED_EVENT = "recent-emails-updated";

interface RecentEmail {
  email: string;
  lastUsed: number;
  // Optional metadata for future use
  displayName?: string;
  avatarUrl?: string;
}

// Define a type for debug log entries
export interface DebugLogEntry {
  timestamp: string;
  action: string;
  data?: unknown;
  stored?: string | null;
}

// Debug logging function that persists across refreshes
const debugLog = (action: string, data?: unknown) => {
  if (typeof window === "undefined") return;

  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const logEntry: DebugLogEntry = {
      timestamp,
      action,
      data,
      stored: localStorage.getItem(STORAGE_KEY),
    };

    // Get existing logs
    const existingLogs = JSON.parse(
      localStorage.getItem(DEBUG_LOG_KEY) || "[]"
    ) as DebugLogEntry[];

    // Add new log and keep only last 20 entries
    const newLogs = [logEntry, ...existingLogs].slice(0, 20);

    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(newLogs));
    console.log(`[${timestamp}] ${action}:`, data);
  } catch (error) {
    console.error("Debug logging failed:", error);
  }
};

// Function to view debug logs
export const getDebugLogs = (): DebugLogEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem(DEBUG_LOG_KEY) || "[]"
    ) as DebugLogEntry[];
  } catch (error) {
    console.error("Failed to retrieve debug logs:", error);
    return [];
  }
};

export const getRecentEmails = (): RecentEmail[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      debugLog("GET_EMAILS", { status: "empty" });
      return [];
    }

    const emails = JSON.parse(stored) as RecentEmail[];
    const sorted = emails.sort((a, b) => b.lastUsed - a.lastUsed);
    debugLog("GET_EMAILS", { emails: sorted });
    return sorted;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    debugLog("GET_EMAILS_ERROR", { error: errorMessage });
    // Try to recover by clearing storage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      debugLog("CLEAR_STORAGE_ERROR", { error: errMsg });
    }
    return [];
  }
};

export const addRecentEmail = (email: string): void => {
  if (typeof window === "undefined") return;

  try {
    debugLog("ADD_EMAIL_START", { email });
    const emails = getRecentEmails();
    const now = Date.now();

    // Remove existing entry if present
    const filtered = emails.filter((e) => e.email !== email);
    debugLog("ADD_EMAIL_FILTERED", { filtered });

    // Add new entry at the beginning
    const newEmails = [{ email, lastUsed: now }, ...filtered].slice(
      0,
      MAX_EMAILS
    );
    debugLog("ADD_EMAIL_NEW_LIST", { newEmails });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEmails));

    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent(EMAILS_UPDATED_EVENT));
    debugLog("ADD_EMAIL_COMPLETE", { email, totalEmails: newEmails.length });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    debugLog("ADD_EMAIL_ERROR", {
      error: errorMessage,
      email,
    });
    // Try to recover by clearing storage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      debugLog("CLEAR_STORAGE_ERROR", { error: errMsg });
    }
  }
};

export const removeRecentEmail = (email: string): void => {
  if (typeof window === "undefined") return;

  try {
    debugLog("REMOVE_EMAIL_START", { email });
    const emails = getRecentEmails();
    const filtered = emails.filter((e) => e.email !== email);
    debugLog("REMOVE_EMAIL_FILTERED", { filtered });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent(EMAILS_UPDATED_EVENT));
    debugLog("REMOVE_EMAIL_COMPLETE", {
      email,
      remainingEmails: filtered.length,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    debugLog("REMOVE_EMAIL_ERROR", {
      error: errorMessage,
      email,
    });
    // Try to recover by clearing storage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      debugLog("CLEAR_STORAGE_ERROR", { error: errMsg });
    }
  }
};

export const clearRecentEmails = (): void => {
  if (typeof window === "undefined") return;

  try {
    debugLog("CLEAR_EMAILS_START");
    localStorage.removeItem(STORAGE_KEY);

    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent(EMAILS_UPDATED_EVENT));
    debugLog("CLEAR_EMAILS_COMPLETE");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    debugLog("CLEAR_EMAILS_ERROR", {
      error: errorMessage,
    });
  }
};

// Export the event name for components to listen to
export const RECENT_EMAILS_UPDATED = EMAILS_UPDATED_EVENT;

// Add a function to check if an email has passkeys on this device
export async function checkEmailsWithPasskeysOnDevice(
  emails: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    emails.map(async (email) => {
      try {
        const user = await getUserByEmail(email);
        if (!user) {
          results[email] = false;
          return;
        }

        const hasPasskeys = await isDeviceRecognizedForUser(user.id);
        results[email] = hasPasskeys;
      } catch (error) {
        console.error(`Error checking passkeys for ${email}:`, error);
        results[email] = false;
      }
    })
  );

  return results;
}
