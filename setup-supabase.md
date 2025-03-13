# Setting Up Supabase for Passkey Authentication

Follow these steps to set up your Supabase database for the passkey authentication system:

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in or create an account
2. Create a new project
3. Choose a name for your project and set a secure database password
4. Choose a region close to your users
5. Wait for your project to be created (this may take a few minutes)

## 2. Set Up Database Tables

1. In your Supabase project dashboard, go to the SQL Editor
2. Create a new query
3. Copy and paste the SQL from the `supabase-setup.sql` file
4. Run the query to create all the necessary tables and policies

## 3. Configure RLS (Row Level Security)

The SQL script already includes Row Level Security policies, but you should verify they are enabled:

1. Go to the "Authentication" section in your Supabase dashboard
2. Click on "Policies"
3. Verify that RLS is enabled for all tables (users, credentials, challenges, sessions)
4. Check that the policies are correctly applied

## 4. Configure CORS

1. Go to the "API" section in your Supabase dashboard
2. Under "Settings" > "API Settings", find the CORS configuration
3. Add your application URL to the allowed origins:
   - For development: `http://localhost:3000`
   - For production: Your production URL

## 5. Update Environment Variables

Make sure your `.env.local` file contains the correct Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DOMAIN=localhost # In production, use your domain name
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # In production, use your full URL
```

## 6. Test the Connection

Run your Next.js application and try to register a new user. Check the Supabase dashboard to see if the user is created in the database.

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in the dashboard
3. Verify that your environment variables are correctly set
4. Make sure your tables are created with the correct structure
5. Ensure RLS policies are properly configured

## Next Steps

Once your database is set up, you can:

1. Customize the authentication flow
2. Add additional user profile fields
3. Implement credential management features
4. Add multi-device support for passkeys
