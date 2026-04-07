-- Profile & auth
CREATE TYPE profile_status AS ENUM ('onboarding', 'setup', 'active', 'paused');

-- Platforms
CREATE TYPE platform_category AS ENUM ('social', 'content_income', 'directory', 'communication');
CREATE TYPE platform_auth_type AS ENUM ('oauth', 'credentials', 'api_key', 'manual');
CREATE TYPE platform_account_status AS ENUM ('connected', 'expired', 'disconnected', 'error');

-- Content
CREATE TYPE content_status AS ENUM ('draft', 'approved', 'scheduled', 'posted', 'failed');
CREATE TYPE file_type AS ENUM ('photo', 'video', 'audio');

-- Conversations
CREATE TYPE conversation_status AS ENUM ('new', 'active', 'qualified', 'archived', 'spam');
CREATE TYPE conversation_priority AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE conversation_type AS ENUM ('booking', 'fan', 'returning_client', 'spam', 'other');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

-- Leads
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'confirmed', 'completed', 'cancelled');

-- Research
CREATE TYPE report_type AS ENUM ('trend', 'competitor', 'market', 'algorithm', 'performance');

-- Listings
CREATE TYPE listing_status AS ENUM ('active', 'expiring', 'expired', 'renewing', 'paused');
CREATE TYPE renewal_status AS ENUM ('none', 'pending', 'renewed', 'failed');

-- Touring
CREATE TYPE touring_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
