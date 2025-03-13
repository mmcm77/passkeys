-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Credentials table (updated to match SimpleWebAuthn recommendations)
CREATE TABLE credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key TEXT NOT NULL, -- Store as base64url encoded string
  webauthn_user_id TEXT NOT NULL, -- Added as recommended by SimpleWebAuthn
  counter BIGINT NOT NULL,
  device_type VARCHAR(32), -- Added as recommended by SimpleWebAuthn ('singleDevice' or 'multiDevice')
  backed_up BOOLEAN, -- Added as recommended by SimpleWebAuthn
  transports TEXT[],
  device_info JSONB,
  created_at BIGINT NOT NULL,
  last_used_at BIGINT NOT NULL,
  name TEXT
);

-- Create indexes as recommended by SimpleWebAuthn
CREATE INDEX idx_credentials_credential_id ON credentials(credential_id);
CREATE INDEX idx_credentials_webauthn_user_id ON credentials(webauthn_user_id);
CREATE UNIQUE INDEX idx_credentials_user_webauthn ON credentials(user_id, webauthn_user_id);

-- Challenges table
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create RLS policies for secure access

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Credentials policies
CREATE POLICY "Users can read their own credentials" ON credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Challenges policies
CREATE POLICY "Public can insert challenges" ON challenges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read challenges" ON challenges
  FOR SELECT USING (true);

CREATE POLICY "Public can update challenges" ON challenges
  FOR UPDATE USING (true);

CREATE POLICY "Public can delete challenges" ON challenges
  FOR DELETE USING (true);

-- Sessions policies
CREATE POLICY "Users can read their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create service role policies for server-side operations
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all credentials" ON credentials
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all challenges" ON challenges
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role'); 