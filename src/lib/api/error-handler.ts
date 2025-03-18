import { NextResponse } from "next/server";

interface ApiErrorResponse {
  error: string;
  success: false;
  stack?: string;
}

/**
 * Standardized API error response handler
 * @param error The error that occurred
 * @param status The HTTP status code to return (default: 400)
 * @param includeStack Whether to include the error stack in development mode (default: false)
 * @returns NextResponse with standardized error format
 */
export function handleApiError(
  error: unknown,
  status = 400,
  includeStack = false
): NextResponse<ApiErrorResponse> {
  console.error(`API error (${status}):`, error);

  const errorMessage = error instanceof Error ? error.message : String(error);

  const response: ApiErrorResponse = {
    error: errorMessage,
    success: false,
  };

  // Include stack trace in development mode if requested
  if (
    includeStack &&
    process.env.NODE_ENV !== "production" &&
    error instanceof Error
  ) {
    response.stack = error.stack;
  }

  return NextResponse.json(response, { status });
}

/**
 * API route wrapper that handles common try/catch patterns
 * @param handler The API route handler function
 * @returns A wrapped handler function with error handling
 */
export function withErrorHandling<T>(
  handler: (req: Request, ...args: unknown[]) => Promise<NextResponse<T>>
): (
  req: Request,
  ...args: unknown[]
) => Promise<NextResponse<T | ApiErrorResponse>> {
  return async (req: Request, ...args: unknown[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return handleApiError(error, 500);
    }
  };
}
