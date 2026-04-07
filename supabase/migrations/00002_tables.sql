-- 1. profiles (depends on auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_name text,
  city text,
  goals jsonb DEFAULT '[]',
  voice_description text,
  voice_sample text,
  status profile_status NOT NULL DEFAULT 'onboarding',
  onboarding_step int NOT NULL DEFAULT 1,
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. platforms (seed data, no FK dependencies)
CREATE TABLE platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category platform_category NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '[]',
  auth_type platform_auth_type NOT NULL,
  icon_url text,
  color text,
  is_active boolean NOT NULL DEFAULT true
);

-- 3. platform_accounts
CREATE TABLE platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES platforms(id),
  username text,
  credentials_encrypted text,
  status platform_account_status NOT NULL DEFAULT 'connected',
  schedule_json jsonb,
  metadata jsonb DEFAULT '{}',
  connected_at timestamptz NOT NULL DEFAULT now()
);

-- 4. content_library
CREATE TABLE content_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type file_type NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  thumbnail_path text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. clients (must be before conversations and leads)
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  platforms jsonb DEFAULT '[]',
  total_bookings int NOT NULL DEFAULT 0,
  last_booking_at timestamptz,
  is_vip boolean NOT NULL DEFAULT false,
  preferences text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. content_calendar
CREATE TABLE content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_account_id uuid NOT NULL REFERENCES platform_accounts(id),
  caption text,
  media_ids uuid[] DEFAULT '{}',
  status content_status NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  posted_at timestamptz,
  post_url text,
  ai_generated boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. posts
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_item_id uuid REFERENCES content_calendar(id),
  platform_account_id uuid NOT NULL REFERENCES platform_accounts(id),
  post_url text,
  impressions int NOT NULL DEFAULT 0,
  engagement int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  fetched_at timestamptz
);

-- 8. conversations
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_account_id uuid NOT NULL REFERENCES platform_accounts(id),
  external_thread_id text,
  contact_name text,
  contact_handle text,
  status conversation_status NOT NULL DEFAULT 'new',
  priority conversation_priority NOT NULL DEFAULT 'cold',
  type conversation_type NOT NULL DEFAULT 'other',
  ai_summary text,
  client_id uuid REFERENCES clients(id),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  body text NOT NULL,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_approved boolean,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- 10. leads
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  client_id uuid REFERENCES clients(id),
  status lead_status NOT NULL DEFAULT 'new',
  requested_date timestamptz,
  requested_duration text,
  notes text,
  score int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. research_reports
CREATE TABLE research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type report_type NOT NULL,
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. analytics
CREATE TABLE analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_account_id uuid NOT NULL REFERENCES platform_accounts(id),
  date date NOT NULL,
  followers int NOT NULL DEFAULT 0,
  impressions int NOT NULL DEFAULT 0,
  engagement int NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'
);

-- 13. listings
CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_account_id uuid NOT NULL REFERENCES platform_accounts(id),
  listing_url text,
  status listing_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  renewal_status renewal_status NOT NULL DEFAULT 'none',
  performance jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. touring_trips
CREATE TABLE touring_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destination_city text NOT NULL,
  country text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status touring_status NOT NULL DEFAULT 'planned',
  auto_announce boolean NOT NULL DEFAULT true,
  auto_update_location boolean NOT NULL DEFAULT true,
  pricing_adjustment jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
