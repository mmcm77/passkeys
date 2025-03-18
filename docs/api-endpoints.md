# API Endpoints Documentation

This document provides a comprehensive overview of all API endpoints in the PassKeys application. Each endpoint is documented with its purpose, request/response format, authentication requirements, and examples.

## Table of Contents

1. [Authentication](#authentication)

   - [Register Options](#register-options)
   - [Register Verify](#register-verify)
   - [Authenticate Options](#authenticate-options)
   - [Authenticate Verify](#authenticate-verify)
   - [Logout](#logout)
   - [Check Session](#check-session)
   - [Conditional UI](#conditional-ui)
   - [Reset Credentials](#reset-credentials)
   - [Discover](#discover)

2. [Credentials Management](#credentials-management)

   - [List Credentials](#list-credentials)
   - [Delete Credential](#delete-credential)
   - [User Devices](#user-devices)
   - [Device Passkeys](#device-passkeys)
   - [Passkeys](#passkeys)

3. [User Management](#user-management)
   - [Check User](#check-user)

## Authentication

### Register Options

Get WebAuthn registration options for creating a new user account with a passkey.

- **URL**: `/api/auth/register/options`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "displayName": "User Name"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "challengeId": "uuid-of-challenge",
      "rp": {
        "name": "Passkeys App",
        "id": "yourdomain.com"
      },
      "user": {
        "id": "base64-encoded-user-id",
        "name": "user@example.com",
        "displayName": "User Name"
      },
      "pubKeyCredParams": [...],
      "timeout": 60000,
      "attestation": "direct"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing required fields
  - `409 Conflict`: User already exists

### Register Verify

Verify a WebAuthn attestation response to complete user registration.

- **URL**: `/api/auth/register/verify`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "credential": {
      "id": "credential-id",
      "rawId": "base64-raw-id",
      "response": {
        "clientDataJSON": "base64-client-data",
        "attestationObject": "base64-attestation"
      },
      "type": "public-key"
    },
    "challengeId": "uuid-of-challenge",
    "deviceType": "desktop",
    "browserInfo": {
      "browser": "Chrome",
      "version": "105.0.0.0",
      "os": "macOS",
      "deviceType": "desktop",
      "userAgent": "user-agent-string"
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "displayName": "User Name",
        "passkeyCount": 1
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid request data
  - `500 Server Error`: Verification failed

### Authenticate Options

Get WebAuthn authentication options for signing in with a passkey.

- **URL**: `/api/auth/authenticate/options`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "challengeId": "uuid-of-challenge",
      "options": {
        "challenge": "base64-challenge",
        "rpId": "yourdomain.com",
        "allowCredentials": [...],
        "timeout": 60000,
        "userVerification": "preferred"
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid email
  - `404 Not Found`: User not found

### Authenticate Verify

Verify a WebAuthn assertion response to complete user authentication.

- **URL**: `/api/auth/authenticate/verify`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "credential": {
      "id": "credential-id",
      "rawId": "base64-raw-id",
      "response": {
        "clientDataJSON": "base64-client-data",
        "authenticatorData": "base64-authenticator-data",
        "signature": "base64-signature",
        "userHandle": "base64-user-handle"
      },
      "type": "public-key"
    },
    "challengeId": "uuid-of-challenge"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "displayName": "User Name",
        "passkeyCount": 1,
        "credentialId": "credential-id"
      }
    }
  }
  ```
- **Sets Cookie**: `session` (HttpOnly, Secure)
- **Error Responses**:
  - `400 Bad Request`: Invalid request data
  - `401 Unauthorized`: Authentication failed

### Logout

Log out the current user by clearing their session cookie.

- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Authentication Required**: Yes
- **Request Body**: None
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```
- **Clears Cookie**: `session`
- **Error Responses**:
  - `401 Unauthorized`: Not authenticated

### Check Session

Check if the current user has a valid session.

- **URL**: `/api/auth/check-session`
- **Method**: `GET`
- **Authentication Required**: No
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "authenticated": true,
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "displayName": "User Name"
      }
    }
  }
  ```
- **Error Responses**:
  - `500 Server Error`: Server error

### Conditional UI

Get authentication options optimized for conditional UI (Chrome's autofill).

- **URL**: `/api/auth/conditional-ui`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "options": {
        "mediation": "conditional",
        "challenge": "base64-challenge",
        "rpId": "yourdomain.com",
        "timeout": 60000
      },
      "challengeId": "uuid-of-challenge"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Browser doesn't support conditional UI
  - `404 Not Found`: User not found

### Reset Credentials

Reset all credentials for a user.

- **URL**: `/api/auth/reset-credentials`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "All credentials have been reset for this user"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing email
  - `404 Not Found`: User not found

### Discover

Get authentication options for credential discovery without prior email.

- **URL**: `/api/auth/discover`
- **Method**: `POST`
- **Authentication Required**: No
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "mediation": "conditional",
      "challenge": "base64-challenge",
      "rpId": "yourdomain.com",
      "timeout": 120000,
      "userVerification": "preferred",
      "authenticatorAttachment": "platform"
    }
  }
  ```
- **Error Responses**:
  - `500 Server Error`: Server error

## Credentials Management

### List Credentials

Get a list of all credentials belonging to the authenticated user.

- **URL**: `/api/auth/credentials`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "credentials": [
        {
          "id": "credential-id",
          "createdAt": 1630000000000,
          "lastUsedAt": 1630000000000,
          "backedUp": true,
          "deviceInfo": {
            "browserFamily": "Chrome",
            "osFamily": "macOS",
            "isDesktop": true,
            "isMobile": false,
            "isTablet": false
          }
        }
      ]
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Not authenticated

### Delete Credential

Delete a specific credential by ID.

- **URL**: `/api/auth/credentials/[id]`
- **Method**: `DELETE`
- **Authentication Required**: Yes
- **URL Parameters**:
  - `id`: Credential ID
- **Query Parameters**:
  - `type`: Set to "device" for device credentials
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Credential deleted successfully"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Not authenticated
  - `403 Forbidden`: Not authorized to delete this credential
  - `404 Not Found`: Credential not found

### User Devices

Manage devices associated with the current user.

- **URL**: `/api/auth/user-devices`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Response**:

  ```json
  {
    "success": true,
    "data": {
      "devices": [
        {
          "device_fingerprint": "fingerprint",
          "device_details": {
            "browser": "Chrome",
            "os": "macOS",
            "deviceType": "desktop"
          },
          "last_used_at": 1630000000000,
          "credential_id": "credential-id",
          "isCurrentDevice": true
        }
      ]
    }
  }
  ```

- **URL**: `/api/auth/user-devices`
- **Method**: `DELETE`
- **Authentication Required**: Yes
- **Request Body**:
  ```json
  {
    "deviceFingerprint": "fingerprint"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "success": true
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Not authenticated
  - `500 Server Error`: Database error

### Device Passkeys

Check if a user has passkeys on the current device.

- **URL**: `/api/auth/device-passkeys`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "hasPasskeysOnDevice": true,
      "credentialCount": 1,
      "isServerSideCheck": false
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing email
  - `500 Server Error`: Server error

### Passkeys

Get all passkeys for a specific user.

- **URL**: `/api/auth/passkeys`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Query Parameters**:
  - `userId`: User ID
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "passkeys": [
        {
          "credentialId": "credential-id",
          "userId": "user-id",
          "deviceType": "desktop",
          "deviceName": "Chrome on macOS",
          "browser": "Chrome",
          "os": "macOS",
          "createdAt": 1630000000000,
          "lastUsedAt": 1630000000000,
          "isCurrentDevice": true
        }
      ],
      "count": 1,
      "uniqueCount": 1,
      "hasDuplicates": false
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing userId
  - `401 Unauthorized`: Not authenticated

## User Management

### Check User

Check if a user exists and get information about their passkeys.

- **URL**: `/api/auth/check-user`
- **Method**: `POST`
- **Authentication Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "exists": true,
      "hasPasskeys": true,
      "suggestedAction": "authenticate",
      "passkeyCount": 1,
      "lastPasskeyAddedAt": 1630000000000,
      "deviceTypes": ["desktop", "mobile"]
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing email
  - `500 Server Error`: Server error

## Best Practices for API Consumption

When consuming these APIs from client-side code, we recommend using our client helpers utility functions:

```typescript
import { apiRequest } from "@/lib/api/client-helpers";

// Example: Authenticate a user
async function loginUser(email: string) {
  try {
    // Get authentication options
    const { options, challengeId } = await apiRequest<{
      options: any;
      challengeId: string;
    }>("/api/auth/authenticate/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Use the options with WebAuthn...

    // Verify authentication
    const userData = await apiRequest<{ user: any }>(
      "/api/auth/authenticate/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, challengeId }),
      }
    );

    return userData.user;
  } catch (error) {
    console.error("Authentication failed:", error);
    throw error;
  }
}
```

These helpers handle the API response format, extract data properly, and provide consistent error handling.

## Error Handling

All API endpoints return errors in a consistent format:

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

Common error codes:

- `INVALID_REQUEST`: Missing or invalid parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `SERVER_ERROR`: Internal server error

## Authentication

Most endpoints require authentication via a session cookie. The session cookie is set after a successful authentication with `/api/auth/authenticate/verify` and can be cleared with `/api/auth/logout`.

The `/api/auth/check-session` endpoint can be used to verify if a user is authenticated.
