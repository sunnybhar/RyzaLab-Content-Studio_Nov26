create table if not exists public.studio_newsletter_templates (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

alter table public.studio_newsletter_templates enable row level security;
revoke all on public.studio_newsletter_templates from public, anon, authenticated;
grant select, insert on public.studio_newsletter_templates to service_role;
