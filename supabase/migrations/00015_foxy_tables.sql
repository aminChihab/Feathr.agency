-- Foxy.ai image generation queue
-- Prompt Writer agent writes prompts here, cron crawler processes them

create table foxy_prompt_queue (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  draft_id uuid references content_calendar(id),
  prompt text not null default '',
  example_id text,                          -- foxy.ai signature exampleId (if using curated prompt)
  aspect_ratio text not null default '4/5', -- "4/5" (Portrait) or "9/16" (Stories)
  status text not null default 'pending' check (status in ('pending', 'generating', 'completed', 'failed')),
  content_library_id uuid references content_library(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_foxy_prompt_queue_status on foxy_prompt_queue(status);
create index idx_foxy_prompt_queue_profile on foxy_prompt_queue(profile_id);

-- Prompt templates that produce good results
-- Used by the Prompt Writer agent as reference/inspiration

create table foxy_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- short label, e.g. "mirror selfie bathroom"
  category text not null default 'general', -- lifestyle, editorial, artistic, signature, etc.
  prompt text not null,                     -- the full prompt text
  example_id text,                          -- foxy.ai signature exampleId (if this is a signature reference)
  aspect_ratio text not null default '4/5',
  quality_rating int check (quality_rating between 1 and 5), -- how good the results are
  notes text,                               -- what makes this prompt work well
  created_at timestamptz not null default now()
);

create index idx_foxy_prompt_templates_category on foxy_prompt_templates(category);
