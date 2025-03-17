import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { ErrorCode } from "@/app/api/auth/check-user/types";

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 5,
  WINDOW_MS: 60 * 1000, // 1 minute
  MIN_DELAY_MS: 500,
  MAX_DELAY_MS: 1500,
} as const;

// Simple in-memory store for rate limiting
// Note: In production, use Redis or similar distributed store
type RateLimit = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimit>();

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimitStore.entries()) {
    if (limit.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Rate limiting function
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || limit.resetAt <= now) {
    // First request or expired window
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }

  // Increment counter
  limit.count += 1;
  return true;
}

// Get rate limit remaining
function getRateLimitRemaining(identifier: string): number {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || limit.resetAt <= now) {
    return RATE_LIMIT.MAX_REQUESTS;
  }

  return Math.max(0, RATE_LIMIT.MAX_REQUESTS - limit.count);
}

// Consistent timing function
async function consistentTiming(): Promise<void> {
  const baseDelay = RATE_LIMIT.MIN_DELAY_MS;
  const variableDelay =
    Math.random() * (RATE_LIMIT.MAX_DELAY_MS - RATE_LIMIT.MIN_DELAY_MS);
  await new Promise((resolve) =>
    setTimeout(resolve, baseDelay + variableDelay)
  );
}

// API Contract Types
export interface UserExistsRequest {
  email: string;
}

export interface UserExistsResponse {
  exists: boolean;
  hasPasskeys: boolean;
  suggestedAction?: "authenticate" | "register" | "addPasskey";
  passkeyCount?: number;
  lastPasskeyAddedAt?: number;
  deviceTypes?: string[];
}

// Error messages mapping
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: "Invalid request parameters",
  [ErrorCode.INVALID_EMAIL]: "Invalid email format",
  [ErrorCode.SERVICE_UNAVAILABLE]:
    "Authentication service is temporarily unavailable",
  [ErrorCode.USER_NOT_FOUND]: "User not found",
  [ErrorCode.EMAIL_IN_USE]: "Email is already registered",
  [ErrorCode.INTERNAL_ERROR]: "An internal error occurred",
  [ErrorCode.CONNECTION_ERROR]: "Unable to connect to the database",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests, please try again later",
  [ErrorCode.DATABASE_ERROR]: "Database operation failed",
  [ErrorCode.UNAUTHORIZED]: "Unauthorized access",
} as const;

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

type ApiResponse = UserExistsResponse | ErrorResponse;

// Helper function to create error responses
function createErrorResponse(
  code: ErrorCode,
  details?: Record<string, unknown>,
  customMessage?: string
): ErrorResponse {
  return {
    error: customMessage || ERROR_MESSAGES[code],
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

// Check database connection
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);
    return !error && data !== null;
  } catch {
    return false;
  }
}

// Get user passkey information
async function getUserPasskeyInfo(userId: string) {
  const { data: credentials, error } = await supabase
    .from("credentials")
    .select("device_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  return {
    passkeyCount: credentials.length,
    lastPasskeyAddedAt: credentials[0]?.created_at || null,
    deviceTypes: Array.from(
      new Set(credentials.map((c) => c.device_type))
    ).filter(Boolean),
  };
}

// HTTP Status codes mapping
const HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_EMAIL]: 400,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.DATABASE_ERROR]: 503,
  [ErrorCode.CONNECTION_ERROR]: 503,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.EMAIL_IN_USE]: 409,
} as const;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  // Track request time for performance metrics and consistent timing
  try {
    // Get client identifier (IP address or other unique identifier)
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      const resetAfter = Math.ceil(
        (rateLimitStore.get(clientIp)?.resetAt || 0 - Date.now()) / 1000
      );

      // Ensure consistent timing even for rate limit responses
      await consistentTiming();

      const errorResponse = createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, {
        resetAfter,
        retryAfter: resetAfter,
      });
      return NextResponse.json(errorResponse, {
        status: HTTP_STATUS[ErrorCode.RATE_LIMIT_EXCEEDED],
        headers: {
          "X-RateLimit-Limit": RATE_LIMIT.MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(resetAfter).toString(),
          "Retry-After": Math.ceil(resetAfter).toString(),
        },
      });
    }

    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      await consistentTiming();
      const errorResponse = createErrorResponse(ErrorCode.CONNECTION_ERROR, {
        message: "Database connection failed",
      });
      return NextResponse.json(errorResponse, {
        status: HTTP_STATUS[ErrorCode.CONNECTION_ERROR],
      });
    }

    // Parse and validate request
    const body = await request.json();
    const { email } = body as UserExistsRequest;

    if (!email) {
      await consistentTiming();
      const errorResponse = createErrorResponse(ErrorCode.VALIDATION_ERROR, {
        field: "email",
        message: "Email is required",
      });
      return NextResponse.json(errorResponse, {
        status: HTTP_STATUS[ErrorCode.VALIDATION_ERROR],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await consistentTiming();
      const errorResponse = createErrorResponse(ErrorCode.INVALID_EMAIL, {
        value: email,
        message: "Invalid email format",
      });
      return NextResponse.json(errorResponse, {
        status: HTTP_STATUS[ErrorCode.INVALID_EMAIL],
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Check if user exists in Supabase with optimized query
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", normalizedEmail)
        .single();

      if (userError && userError.code !== "PGRST116") {
        throw new Error(`Database error: ${userError.message}`);
      }

      // Ensure consistent timing regardless of user existence
      await consistentTiming();

      const remaining = getRateLimitRemaining(clientIp);
      const headers = {
        "X-RateLimit-Limit": RATE_LIMIT.MAX_REQUESTS.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(
          (rateLimitStore.get(clientIp)?.resetAt || 0 - Date.now()) / 1000
        ).toString(),
      };

      if (user) {
        // Get passkey information
        const passKeyInfo = await getUserPasskeyInfo(user.id);
        const hasPasskeys = passKeyInfo.passkeyCount > 0;

        return NextResponse.json(
          {
            exists: true,
            hasPasskeys,
            suggestedAction: hasPasskeys ? "authenticate" : "addPasskey",
            ...passKeyInfo,
          },
          { headers }
        );
      }

      // New user case
      return NextResponse.json(
        {
          exists: false,
          hasPasskeys: false,
          suggestedAction: "register",
          passkeyCount: 0,
        },
        { headers }
      );
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      await consistentTiming();
      const errorResponse = createErrorResponse(ErrorCode.DATABASE_ERROR, {
        message:
          dbError instanceof Error
            ? dbError.message
            : "Database operation failed",
        errorCode: (dbError as Error & { code?: string })?.code,
      });
      return NextResponse.json(errorResponse, {
        status: HTTP_STATUS[ErrorCode.DATABASE_ERROR],
      });
    }
  } catch (error) {
    console.error("Auth error:", error);
    await consistentTiming();
    const errorResponse = createErrorResponse(ErrorCode.INTERNAL_ERROR, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(errorResponse, {
      status: HTTP_STATUS[ErrorCode.INTERNAL_ERROR],
    });
  }
}

// Health check endpoint with database connection status
export async function GET() {
  await consistentTiming();
  const isConnected = await checkDatabaseConnection();
  return NextResponse.json(
    {
      status: isConnected
        ? "Auth API is running"
        : "Auth API is running but database connection failed",
      version: "1.0.0",
      databaseConnected: isConnected,
    },
    { status: isConnected ? 200 : 503 }
  );
}
