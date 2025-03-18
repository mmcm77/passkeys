import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "./error-handler";
import { logger } from "./logger";

type ApiRouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string | string[]> }
) => Promise<NextResponse>;

type ApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Options for creating an API route
 */
interface ApiRouteOptions {
  /** Whether to log requests to this route */
  logRequests?: boolean;
  /** Whether to log responses from this route */
  logResponses?: boolean;
}

/**
 * Create a handler for a single HTTP method
 * @param method The HTTP method to handle
 * @param handler The handler function for this method
 * @param options Options for the route
 * @returns A wrapped handler function
 */
function createMethodHandler(
  method: ApiMethod,
  handler: ApiRouteHandler,
  options: ApiRouteOptions = {}
): ApiRouteHandler {
  const { logRequests = true, logResponses = true } = options;
  const routeLogger = logger.scope(`API:${method}`);

  return async (
    req: NextRequest,
    context: { params: Record<string, string | string[]> }
  ) => {
    try {
      // Log request if enabled
      if (logRequests) {
        const url = new URL(req.url);
        routeLogger.log(`${method} ${url.pathname}`);
      }

      // Call the handler
      const response = await handler(req, context);

      // Log response if enabled
      if (logResponses && process.env.NODE_ENV !== "production") {
        routeLogger.debug(`Response status: ${response.status}`);
      }

      return response;
    } catch (error) {
      routeLogger.error(`Error handling ${method} request:`, error);
      return handleApiError(error);
    }
  };
}

/**
 * Create an API route with one or more method handlers
 * @param handlers Object mapping HTTP methods to handler functions
 * @param options Options for all routes
 * @returns Object with handler functions for each method
 */
export function createApiRoute(
  handlers: Partial<Record<ApiMethod, ApiRouteHandler>>,
  options: ApiRouteOptions = {}
): Record<string, ApiRouteHandler> {
  const result: Record<string, ApiRouteHandler> = {};

  // Create a wrapped handler for each method
  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      result[method] = createMethodHandler(
        method as ApiMethod,
        handler,
        options
      );
    }
  }

  return result;
}

/**
 * Example usage:
 *
 * export const { GET, POST } = createApiRoute({
 *   GET: async (req) => {
 *     // Handle GET request
 *     return NextResponse.json({ data: "Success" });
 *   },
 *   POST: async (req) => {
 *     // Handle POST request
 *     const body = await req.json();
 *     return NextResponse.json({ data: "Created" });
 *   }
 * });
 */
