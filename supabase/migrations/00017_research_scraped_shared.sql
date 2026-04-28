-- Make research_scraped shared (no per-user data)
-- Drop profile_id, add niche_tags and city for agent filtering

-- Remove existing data (only 2 test rows)
delete from research_scraped_posts;
delete from research_scraped;

-- Drop RLS policies that depend on profile_id
drop policy if exists "Users can read own scraped data" on research_scraped;
drop policy if exists "Users can read own scraped posts" on research_scraped_posts;
drop policy if exists "Authenticated users can read scraped data" on research_scraped;
drop policy if exists "Authenticated users can read scraped posts" on research_scraped_posts;
drop policy if exists "Service role can manage scraped data" on research_scraped;
drop policy if exists "Service role can manage scraped posts" on research_scraped_posts;

-- Drop profile_id
alter table research_scraped drop column if exists profile_id cascade;

-- Add niche and location tagging
alter table research_scraped add column if not exists niche_tags text[] not null default '{}';
alter table research_scraped add column if not exists city text;

-- New RLS: all authenticated users can read shared scraped data
create policy "Authenticated users can read scraped data" on research_scraped
  for select to authenticated using (true);

create policy "Authenticated users can read scraped posts" on research_scraped_posts
  for select to authenticated using (true);

-- Service role can insert/update (for scraper + webhooks)
create policy "Service role can manage scraped data" on research_scraped
  for all using (true) with check (true);

create policy "Service role can manage scraped posts" on research_scraped_posts
  for all using (true) with check (true);

-- Add indexes for agent queries
create index if not exists idx_research_scraped_platform on research_scraped(platform);
create index if not exists idx_research_scraped_data_type on research_scraped(data_type);
create index if not exists idx_research_scraped_niche_tags on research_scraped using gin(niche_tags);
create index if not exists idx_research_scraped_city on research_scraped(city);
create index if not exists idx_research_scraped_scraped_at on research_scraped(scraped_at);
