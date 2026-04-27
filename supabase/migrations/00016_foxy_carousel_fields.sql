-- Add carousel support to foxy_prompt_queue
alter table foxy_prompt_queue add column if not exists slide_type text not null default 'single' check (slide_type in ('single', 'hero', 'broll'));
alter table foxy_prompt_queue add column if not exists slide_order int not null default 0;
