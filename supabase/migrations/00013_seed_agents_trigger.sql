-- Function to seed agents for a new user
CREATE OR REPLACE FUNCTION public.seed_agents_for_user(user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO agents (profile_id, name, slug, type, description) VALUES
    (user_id, 'Researcher', 'researcher', 'ai', 'Analyzes trends, competitors, and platform changes. Writes research reports.'),
    (user_id, 'Strategist', 'strategist', 'ai', 'Creates weekly content calendars. Plans what content goes where and when.'),
    (user_id, 'Content Writer', 'content-writer', 'ai', 'Writes posts in your voice, adapted per platform.'),
    (user_id, 'Ad Optimizer', 'ad-optimizer', 'ai', 'Manages directory listings, analyzes performance, suggests renewals.'),
    (user_id, 'Lead Qualifier', 'lead-qualifier', 'ai', 'Screens all DMs, qualifies leads, responds in your voice.'),
    (user_id, 'Content Poster', 'content-poster', 'script', 'Posts approved content at the scheduled time.'),
    (user_id, 'Profile Syncer', 'profile-syncer', 'script', 'Synchronizes your bio, photos, and availability across all platforms.'),
    (user_id, 'Inbox Manager', 'inbox-manager', 'script', 'Fetches messages from all platforms into your unified inbox.'),
    (user_id, 'Analytics Tracker', 'analytics-tracker', 'script', 'Collects engagement and revenue data from all platforms.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user trigger to also seed agents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  PERFORM public.seed_agents_for_user(new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed agents for existing users who don't have them yet
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE id NOT IN (SELECT DISTINCT profile_id FROM agents)
  LOOP
    PERFORM public.seed_agents_for_user(r.id);
  END LOOP;
END $$;
