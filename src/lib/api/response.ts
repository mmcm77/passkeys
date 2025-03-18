import { NextResponse } from "next/server";

/**
 * Options for creating an API response
 */
export interface ApiResponseOptions {
  /** HTTP status code (default: 200) */
  status?: number;
  /** Custom headers to include in the response */
  headers?: Record<string, string>;
  /** Cookies to set in the response */
  cookies?: Array<{
    name: string;
    value: string;
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "strict" | "lax" | "none";
      path?: string;
      maxAge?: number;
      expires?: Date;
    };
  }>;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Create a standardized successful API response
 * @param data The data to include in the response
 * @param options Response options
 * @returns A NextResponse object with standardized format
 */
export function apiResponse<T>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { status = 200, headers = {}, cookies: cookiesToSet = [] } = options;

  // Create base response with success flag
  const responseData: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  // Create response object
  const response = NextResponse.json(responseData, {
    status,
    headers,
  });

  // Set cookies if provided
  for (const cookie of cookiesToSet) {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      ...cookie.options,
    });
  }

  return response;
}

/**
 * Utility for setting authentication session cookies
 * @param response NextResponse object to modify
 * @param sessionId Session ID to set in the cookie
 * @param options Additional cookie options
 * @returns The modified response
 */
export function setSessionCookie<T>(
  response: NextResponse<T>,
  sessionId: string,
  options: {
    maxAge?: number;
    path?: string;
  } = {}
): NextResponse<T> {
  const maxAge = options.maxAge || 60 * 60 * 24 * 7; // 1 week default
  const path = options.path || "/";

  response.cookies.set({
    name: "session",
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path,
    maxAge,
  });

  return response;
}

/**
 * Clear the session cookie (for logout)
 * @param response NextResponse object to modify
 * @returns The modified response
 */
export function clearSessionCookie<T>(
  response: NextResponse<T>
): NextResponse<T> {
  response.cookies.set({
    name: "session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });

  return response;
}
