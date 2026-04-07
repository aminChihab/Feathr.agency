CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL DEFAULT 'ai',
  description text,
  status text NOT NULL DEFAULT 'idle',
  last_activity_at timestamptz,
  last_activity_description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON agents FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update own agents"
  ON agents FOR UPDATE USING (auth.uid() = profile_id);
