-- Run once in the Supabase SQL editor. Safe to rerun.
create extension if not exists pgcrypto;
create table if not exists public.members (
 email text primary key check (email = lower(email)),
 role text not null default 'member' check (role in ('admin','member')),
 invited_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.members where email=lower(auth.jwt()->>'email') and revoked_at is null); $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.members where email=lower(auth.jwt()->>'email') and role='admin' and revoked_at is null); $$;
revoke all on function public.is_member() from public,anon;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_member(), public.is_admin() to authenticated;
alter table public.members enable row level security;
drop policy if exists "Members can see team" on public.members;
create policy "Members can see team" on public.members for select to authenticated using (public.is_member());
-- No browser INSERT/UPDATE/DELETE on membership. Admin API uses server-only service role.
create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(), title text not null, theme text not null,
 brief text not null default '', week date not null, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.drafts (
 id uuid primary key default gen_random_uuid(), title text not null,
 channel text not null check(channel in ('YouTube','LinkedIn','Instagram','TikTok','Facebook','Hub','Reddit')),
 audience text not null check(audience in ('general','family','elder','renter','diy','trade')),
 format text not null, content text not null default '', slides jsonb not null default '[]',
 status text not null default 'Draft' check(status in ('Draft','Needs changes','Ryan review')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
alter table public.drafts enable row level security;
drop policy if exists "Team campaigns" on public.campaigns;
create policy "Team campaigns" on public.campaigns for all to authenticated using(public.is_member()) with check(public.is_member() and created_by=auth.uid());
drop policy if exists "Team drafts" on public.drafts;
create policy "Team drafts" on public.drafts for all to authenticated using(public.is_member()) with check(public.is_member() and created_by=auth.uid());
-- Atomic hourly counters, shared across serverless instances. Not accessible from browsers.
create table if not exists public.usage_limits (
 user_id uuid not null references auth.users(id), kind text not null, window_start timestamptz not null,
 used integer not null default 0, primary key(user_id,kind,window_start)
);
alter table public.usage_limits enable row level security;
create or replace function public.consume_quota(p_user_id uuid,p_kind text,p_limit integer) returns boolean
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into public.usage_limits(user_id,kind,window_start,used)
 values(p_user_id,p_kind,date_trunc('hour',now()),1)
 on conflict(user_id,kind,window_start) do update set used=usage_limits.used+1 where usage_limits.used<p_limit
 returning used into n;
 return n is not null;
end; $$;
revoke all on function public.consume_quota(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.consume_quota(uuid,text,integer) to service_role;
-- Bootstrap (replace the email):
-- 1. Run npm run account:password -- your-email@example.com to create an email/password account.
-- 2. insert into public.members(email,role) values ('your-email@example.com','admin');
