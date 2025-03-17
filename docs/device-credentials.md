# Device Credentials

This document explains how the device credentials feature works and how to set it up.

## Overview

The device credentials feature allows users to register passkeys on specific devices and manage them. This provides several benefits:

1. **Enhanced Security**: Users can see which devices have access to their account
2. **Improved UX**: Users can sign in faster on recognized devices
3. **Device Management**: Users can revoke access for specific devices

## Database Schema

The feature uses a `device_credentials` table with the following schema:

```sql
CREATE TABLE device_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_details JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  last_used_at BIGINT NOT NULL
);
```

## Setup Instructions

### 1. Apply Database Migration

Apply the migration by running the SQL script through the Supabase dashboard:

1. Go to your Supabase project
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/20240601000000_device_credentials.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration

## How It Works

### Device Recognition

When a user signs in, the system:

1. Generates a device fingerprint based on browser characteristics
2. Checks if the device has been used before with the user's passkeys
3. If recognized, offers a one-click sign-in
4. If not recognized, prompts the user to register the new device

### New Device Registration

When a user signs in on a new device:

1. They authenticate using an existing passkey from another device
2. They're prompted to register a passkey on the new device
3. The system stores the association between the user, passkey, and device

### Device Management

Users can:

1. View all devices that have access to their account
2. See when each device was last used
3. Remove access for specific devices

## Components

The feature consists of several components:

- `DeviceList`: Displays and manages registered devices
- `NewDeviceRegistration`: Handles registration of passkeys on new devices
- `AuthContainer`: Integrates device recognition into the authentication flow

## API Endpoints

- `POST /api/auth/device-passkeys`: Checks if a user has passkeys on the current device
- `DELETE /api/auth/credentials/[credentialId]`: Removes a device credential

## TypeScript Types

The feature includes TypeScript types for type safety:

```typescript
interface DeviceCredential {
  credentialId: string;
  userId: string;
  deviceType: string;
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
  isCurrentDevice?: boolean;
  name?: string;
}
```

## Security Considerations

- Device fingerprints are not 100% reliable and can change
- Row Level Security (RLS) ensures users can only access their own device credentials
- The system uses secure WebAuthn protocols for authentication
