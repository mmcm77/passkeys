# Passkey Authentication System

A modern authentication system using passkeys for secure, passwordless login. Built with Next.js, TypeScript, Tailwind CSS, SimpleWebAuthn, and Supabase.

## Features

- Passwordless authentication using WebAuthn/Passkeys
- Device-aware authentication with device recognition
- New device registration flow for enhanced security
- Device management for users to control their authenticated devices
- Secure credential storage with Supabase
- Modern UI with Tailwind CSS
- TypeScript for type safety
- Next.js App Router for routing and API endpoints

## Prerequisites

- Node.js 18.x or later
- A Supabase account (free tier works fine)
- A modern browser that supports WebAuthn (Chrome, Firefox, Safari, Edge)

## Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd passkeys
```

2. Install dependencies:

```bash
npm install
```

3. Create a Supabase project:

   - Go to [Supabase](https://supabase.com/) and create a new project
   - Follow the instructions in `setup-supabase.md` to set up your database tables
   - Apply the migration in `supabase/migrations/20240601000000_device_credentials.sql` to create the device credentials table

4. Create a `.env.local` file in the root directory with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_DOMAIN=localhost # In production, use your domain name
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # In production, use your full URL
```

5. Run the development server:

```bash
# Using npm
npm run dev

# Or using the provided script
./start-dev.sh
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── api/               # API endpoints
│   │   └── auth/          # Auth-related endpoints
│   │       ├── authenticate/  # Authentication endpoints
│   │       ├── register/      # Registration endpoints
│   │       ├── credentials/   # Credential management endpoints
│   │       ├── device-passkeys/ # Device passkey endpoints
│   │       └── user-devices/  # User device management endpoints
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── auth/              # Authentication components
│   │   ├── AuthContainer.tsx  # Main authentication container
│   │   ├── AuthenticatedState.tsx # Authenticated user state
│   │   ├── DeviceList.tsx     # Device management component
│   │   └── NewDeviceRegistration.tsx # New device registration component
│   └── ui/                # UI components
├── lib/                   # Shared utilities
│   ├── auth/              # Authentication logic
│   │   ├── webauthn.ts    # WebAuthn utilities
│   │   ├── session.ts     # Session management
│   │   ├── device-recognition.ts # Device fingerprinting
│   │   └── device-utils.ts # Device type detection
│   ├── db/                # Database interactions
│   │   ├── device-credentials.ts # Device credential management
│   │   ├── credentials.ts # WebAuthn credential management
│   │   └── users.ts       # User management
│   ├── recentEmails.ts    # Recent email management
│   └── supabase.ts        # Supabase client
├── types/                 # TypeScript type definitions
│   ├── auth.ts            # Auth-related types
│   └── database.ts        # Database type definitions
└── docs/                  # Documentation
    └── device-credentials.md # Device credentials documentation
```

## Authentication Flow

The application implements a sophisticated authentication flow that adapts to different user scenarios:

### First-time User

1. User enters their email
2. System checks if the email exists
3. If not, user proceeds to registration
4. User creates a passkey on their device
5. System stores the passkey and device information
6. User is authenticated and can access the application

### Returning User on a Known Device

1. User enters their email
2. System recognizes the device has a passkey for this user
3. User is presented with a one-click login option
4. User authenticates with their passkey (biometrics/PIN)
5. User is immediately authenticated

### Returning User on a New Device

1. User enters their email
2. System recognizes the user but not the device
3. User authenticates with a passkey from another device
4. System prompts user to register a passkey on the new device
5. User creates a new passkey for this device
6. System stores the new device-passkey association
7. User is authenticated

### Device Management

1. Authenticated users can view all devices that have access to their account
2. Users can see when each device was last used
3. Users can remove access for specific devices (except the current one)
4. Device removal is immediate and secure

## Device Recognition

The system uses a combination of browser characteristics to create a device fingerprint:

- Platform information
- Screen resolution
- Language settings
- Timezone
- Browser type

This fingerprint is used to recognize returning devices and offer a streamlined authentication experience.

## Testing Scenarios

To fully test the application, go through these scenarios:

1. **First-time user**: Register a new account and create a passkey
2. **Returning user on same device**: Sign out and sign back in with the same email
3. **Returning user on new device**: Use a different browser or device to sign in with an existing account
4. **Account switching**: Try switching between different accounts on the login page
5. **Device management**: View and remove devices from the authenticated state
6. **Passkey removal**: Remove a passkey and verify it can no longer be used

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in the dashboard
3. Verify that your environment variables are correctly set
4. Make sure your tables are created with the correct structure
5. Ensure RLS policies are properly configured
6. Verify that the device credentials table is properly created

## Security Considerations

- Device fingerprints are not 100% reliable and can change
- Row Level Security (RLS) ensures users can only access their own device credentials
- The system uses secure WebAuthn protocols for authentication
- Passkeys never leave the user's device, enhancing security

## License

MIT
