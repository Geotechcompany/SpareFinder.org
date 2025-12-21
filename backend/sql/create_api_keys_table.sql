-- Create api_keys table (for Pro/Enterprise API access)
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}'::text[],
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own keys
DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
CREATE POLICY "Users can view own api keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own api keys" ON api_keys;
CREATE POLICY "Users can manage own api keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

