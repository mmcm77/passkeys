# Passkey Authentication System

A modern authentication system using passkeys for secure, passwordless login. Built with Next.js, TypeScript, Tailwind CSS, SimpleWebAuthn, and Supabase.

## Features

- Passwordless authentication using WebAuthn/Passkeys
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
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── page.tsx           # Main page
├── components/            # React components
│   └── auth/              # Authentication components
├── lib/                   # Shared utilities
│   ├── auth/              # Authentication logic
│   │   ├── webauthn.ts    # WebAuthn utilities
│   │   └── session.ts     # Session management
│   ├── db/                # Database interactions
│   └── supabase.ts        # Supabase client
└── types/                 # TypeScript type definitions
    └── auth.ts            # Auth-related types
```

## Deployment

This project is ready to be deployed to Vercel:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

## How Passkeys Work

Passkeys (WebAuthn) use public-key cryptography for authentication:

1. **Registration**:

   - The server generates a challenge
   - The client creates a new key pair on the device
   - The public key is sent to the server
   - The private key stays on the device, protected by biometrics or PIN

2. **Authentication**:
   - The server sends a challenge
   - The client signs the challenge with the private key
   - The server verifies the signature with the stored public key

This approach is more secure than passwords because:

- No shared secrets are stored on the server
- Phishing is impossible as authentication is tied to the origin
- No password reuse across sites
- Biometric protection for the private key

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in the dashboard
3. Verify that your environment variables are correctly set
4. Make sure your tables are created with the correct structure
5. Ensure RLS policies are properly configured

## License

MIT
