-- Add storage paths and metadata for scraped Explore images
alter table foxy_prompt_templates add column if not exists storage_path text;       -- path in Supabase storage bucket
alter table foxy_prompt_templates add column if not exists thumbnail_path text;     -- thumbnail in Supabase storage
alter table foxy_prompt_templates add column if not exists is_signature boolean not null default false;
alter table foxy_prompt_templates add column if not exists is_carousel boolean not null default false;
alter table foxy_prompt_templates add column if not exists scraped_at timestamptz;  -- when we last scraped this from foxy
