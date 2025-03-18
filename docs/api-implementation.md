# API Implementation Guide

This document provides technical details about how the API routes are implemented in the PassKeys application. It covers the refactoring patterns, utility libraries, and best practices used throughout the codebase.

## Table of Contents

1. [API Route Structure](#api-route-structure)
2. [Utility Libraries](#utility-libraries)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Authentication Flow](#authentication-flow)
6. [Logging Strategy](#logging-strategy)
7. [Device Recognition](#device-recognition)
8. [Client-Side Integration](#client-side-integration)

## API Route Structure

All API routes in the application follow a standard pattern using Next.js App Router API routes:

```typescript
import { createApiRoute } from "@/lib/api/route-handler";
import { apiResponse } from "@/lib/api/response";
import { logger } from "@/lib/api/logger";

// Create a scoped logger for this route
const routeLogger = logger.scope("RouteName");

export const { METHOD } = createApiRoute({
  METHOD: async (req, params) => {
    // Route implementation
    return apiResponse({
      /* response data */
    });
  },
});
```

This structure ensures consistency across all routes and provides built-in error handling, logging, and response formatting.

## Utility Libraries

### Route Handler (`src/lib/api/route-handler.ts`)

The `createApiRoute` function wraps Next.js route handlers with standardized error handling and logging:

```typescript
export function createApiRoute<T extends RouteHandlers>(handlers: T): T {
  const wrappedHandlers: any = {};

  for (const [method, handler] of Object.entries(handlers)) {
    wrappedHandlers[method] = async (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = await handler(...args);
        const duration = Date.now() - startTime;
        logger.debug(`${method} request completed in ${duration}ms`);
        return result;
      } catch (error) {
        return handleApiError(error);
      }
    };
  }

  return wrappedHandlers as T;
}
```

### Response Formatter (`src/lib/api/response.ts`)

The `apiResponse` function creates standardized API responses:

```typescript
export function apiResponse<T>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse {
  const { status = 200, headers = {}, cookies: cookiesToSet = [] } = options;

  // Create base response with success flag
  const responseData = {
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
```

### Logger (`src/lib/api/logger.ts`)

The logger utility provides environment-aware logging:

```typescript
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(...args);
    }
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
  scope: (name: string) => {
    return {
      log: (...args: any[]) => logger.log(`[${name}]`, ...args),
      debug: (...args: any[]) => logger.debug(`[${name}]`, ...args),
      warn: (...args: any[]) => logger.warn(`[${name}]`, ...args),
      error: (...args: any[]) => logger.error(`[${name}]`, ...args),
    };
  },
};
```

### Client Helpers (`src/lib/api/client-helpers.ts`)

Client-side utilities for consuming the API:

```typescript
export function extractApiData<T>(responseJson: any): T {
  if (
    responseJson &&
    responseJson.success === true &&
    responseJson.data !== undefined
  ) {
    return responseJson.data as T;
  }
  return responseJson as T;
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  const responseJson = await response.json();
  return extractApiData<T>(responseJson);
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  return handleApiResponse<T>(response);
}
```

## Response Format

All API responses follow a consistent structure:

```json
{
  "success": true,
  "data": {
    // Response-specific data
  }
}
```

Error responses use:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2023-01-01T00:00:00.000Z",
    "requestId": "request-id"
  }
}
```

## Error Handling

API error handling is centralized in the `handleApiError` function, which takes any thrown error and converts it to a standardized API error response:

```typescript
export function handleApiError(error: unknown): NextResponse {
  // Extract error info
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const code = error instanceof ApiError ? error.code : "SERVER_ERROR";
  const status = error instanceof ApiError ? error.status : 500;
  const details = error instanceof ApiError ? error.details : undefined;

  // Log the error in development
  if (process.env.NODE_ENV !== "production") {
    console.error("API Error:", message, stack);
  } else {
    console.error("API Error:", message);
  }

  // Create standardized error response
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        ...(process.env.NODE_ENV !== "production" && stack ? { stack } : {}),
      },
    },
    { status }
  );
}
```

## Authentication Flow

The authentication flow is implemented across several endpoints:

1. **Registration**:

   - `register/options` generates WebAuthn registration options
   - `register/verify` verifies the attestation and creates the user

2. **Authentication**:

   - `authenticate/options` generates WebAuthn authentication options
   - `authenticate/verify` verifies the assertion and creates a session

3. **Session Management**:

   - `check-session` verifies the session cookie
   - `logout` clears the session cookie

4. **Device Recognition**:
   - `device-passkeys` checks if the current device has passkeys for a user
   - `user-devices` manages the user's recognized devices

## Logging Strategy

The application uses a scoped logging strategy where each route creates its own logger instance:

```typescript
const authLogger = logger.scope("Authentication");
```

This allows for easily filtering logs by component and adjusting log verbosity based on environment:

- Development: Full logging (debug, log, warn, error)
- Production: Limited logging (warn, error only)

## Device Recognition

Device recognition is implemented using a combination of:

1. **Device Fingerprinting**: Stable hashing of device characteristics
2. **Browser Detection**: Identifying browser and OS details
3. **Credential Storage**: Associating device fingerprints with credentials

This enables features like:

- One-click login on recognized devices
- Device management in user settings
- Security enhancements based on device history

## Client-Side Integration

Client components should consume API endpoints using the `apiRequest` utility:

```typescript
// Before refactoring:
const response = await fetch("/api/auth/credentials");
if (!response.ok) {
  throw new Error("Failed to fetch credentials");
}
const data = await response.json();
setCredentials(data.credentials);

// After refactoring:
const data = await apiRequest<{ credentials: Credential[] }>(
  "/api/auth/credentials"
);
setCredentials(data.credentials);
```

This utility handles:

- Extracting data from the standardized response format
- Proper error handling
- Type safety through TypeScript generics

## Implementation Examples

### Simple GET Endpoint

```typescript
// src/app/api/auth/credentials/route.ts
export const { GET } = createApiRoute({
  GET: async () => {
    const credentialsLogger = logger.scope("Credentials");

    // Get session
    const session = await getCurrentSession();
    if (!session) {
      credentialsLogger.warn("No valid session found");
      throw new Error("Not authenticated");
    }

    credentialsLogger.debug(`Getting credentials for user: ${session.userId}`);

    // Get credentials
    const credentials = await getCredentialsForUser(session.userId);

    credentialsLogger.log(`Found ${credentials.length} credentials`);

    return apiResponse({ credentials });
  },
});
```

### Complex POST Endpoint with Cookie Setting

```typescript
// src/app/api/auth/authenticate/verify/route.ts
export const { POST } = createApiRoute({
  POST: async (req: NextRequest) => {
    const verifyLogger = logger.scope("AuthVerify");
    const { credential, challengeId } = await req.json();

    verifyLogger.log("Verifying authentication");

    // Verify credential
    const { user, verified } = await verifyWebAuthnAssertion(
      credential,
      challengeId
    );

    if (!verified) {
      verifyLogger.warn("Authentication verification failed");
      throw new Error("Authentication failed");
    }

    // Create session
    const session = await createSession(user.id);

    verifyLogger.log(`Authentication successful for user: ${user.email}`);

    // Return response with session cookie
    return apiResponse(
      { user },
      {
        cookies: [
          {
            name: "session",
            value: session.id,
            options: {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              maxAge: 60 * 60 * 24 * 7, // 1 week
              path: "/",
            },
          },
        ],
      }
    );
  },
});
```
