-- Additive, single-tenant Studio command store. Run AFTER schema.sql. Does not delete legacy content.
begin;
create table if not exists public.studio_workspace(id boolean primary key default true check(id), version bigint not null, state jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.studio_release_packages(id text primary key, payload jsonb not null, created_at timestamptz not null default now());
create table if not exists public.studio_audit(id text primary key, payload jsonb not null, created_at timestamptz not null default now());
create table if not exists public.studio_secrets(id text primary key, ciphertext text not null, updated_at timestamptz not null default now());
create table if not exists public.studio_assets(id uuid primary key default gen_random_uuid(),content_id text not null, object_path text unique not null, uploaded_by uuid not null references auth.users(id), mime text not null, name text not null, created_at timestamptz not null default now());
alter table public.studio_workspace enable row level security;
alter table public.studio_release_packages enable row level security;
alter table public.studio_audit enable row level security;
alter table public.studio_secrets enable row level security;
alter table public.studio_assets enable row level security;
revoke all on public.studio_workspace,public.studio_release_packages,public.studio_audit,public.studio_secrets,public.studio_assets from anon,authenticated;
grant select,insert,update,delete on public.studio_workspace,public.studio_release_packages,public.studio_audit,public.studio_secrets,public.studio_assets to service_role;
create or replace function public.studio_immutable() returns trigger language plpgsql set search_path=public as $$ begin raise exception 'Release packages and audit evidence are immutable'; end; $$;
drop trigger if exists studio_release_immutable on public.studio_release_packages;
create trigger studio_release_immutable before update or delete on public.studio_release_packages for each row execute function public.studio_immutable();
drop trigger if exists studio_audit_immutable on public.studio_audit;
create trigger studio_audit_immutable before update or delete on public.studio_audit for each row execute function public.studio_immutable();
create or replace function public.studio_commit(p_expected_version bigint,p_state jsonb,p_secret jsonb default null) returns bigint
language plpgsql security definer set search_path=public as $$
declare old_state jsonb; current_version bigint; item jsonb;
begin
 -- Service only. Never expose a user-callable replacement-state operation.
 perform pg_advisory_xact_lock(72161027);
 select version,state into current_version,old_state from public.studio_workspace where id=true for update;
 if current_version is null then
  if p_expected_version<>-1 or (p_state->>'version')::bigint<>0 then raise exception 'studio_version_conflict' using errcode='40001'; end if;
 else
  if current_version<>p_expected_version or (p_state->>'version')::bigint<>current_version+1 then raise exception 'studio_version_conflict' using errcode='40001'; end if;
  for item in select value from jsonb_array_elements(coalesce(old_state->'packages','[]')) loop
   if not (coalesce(p_state->'packages','[]') @> jsonb_build_array(item)) then raise exception 'Cannot mutate or remove existing release package'; end if;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(old_state->'audit','[]')) loop
   if not (coalesce(p_state->'audit','[]') @> jsonb_build_array(item)) then raise exception 'Cannot mutate or remove audit evidence'; end if;
  end loop;
 end if;
 if jsonb_typeof(p_state->'members')<>'array' or jsonb_typeof(p_state->'packages')<>'array' then raise exception 'Invalid Studio state'; end if;
 for item in select value from jsonb_array_elements(p_state->'packages') loop
  if exists(select 1 from public.studio_release_packages where id=item->>'id' and payload<>item) then raise exception 'Release package conflict'; end if;
  insert into public.studio_release_packages(id,payload) values(item->>'id',item) on conflict(id) do nothing;
 end loop;
 for item in select value from jsonb_array_elements(p_state->'audit') loop
  if exists(select 1 from public.studio_audit where id=item->>'id' and payload<>item) then raise exception 'Audit conflict'; end if;
  insert into public.studio_audit(id,payload) values(item->>'id',item) on conflict(id) do nothing;
 end loop;
 if p_secret is not null then
  insert into public.studio_secrets(id,ciphertext) values(p_secret->>'id',p_secret->>'ciphertext') on conflict(id) do update set ciphertext=excluded.ciphertext,updated_at=now();
 end if;
 insert into public.studio_workspace(id,version,state) values(true,(p_state->>'version')::bigint,p_state) on conflict(id) do update set version=excluded.version,state=excluded.state,updated_at=now();
 return (p_state->>'version')::bigint;
end; $$;
revoke all on function public.studio_commit(bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.studio_commit(bigint,jsonb,jsonb) to service_role;
revoke all on function public.studio_immutable() from public,anon,authenticated;
-- Close legacy mutation paths. The server imports these records into the new command store.
drop policy if exists "Team campaigns" on public.campaigns;
drop policy if exists "Team drafts" on public.drafts;
revoke insert,update,delete on public.campaigns,public.drafts from authenticated,anon;
-- Private immutable object keys, accessed through scoped server routes.
insert into storage.buckets(id,name,public,file_size_limit) values('studio-assets','studio-assets',false,52428800) on conflict(id) do nothing;
commit;
-- Notification outbox is separate from the canonical state so delivery claims remain atomic.
create table if not exists public.studio_deliveries(id text primary key,status text not null check(status in('claimed','sent','failed','unknown')),provider_id text,created_at timestamptz not null default now());
alter table public.studio_deliveries enable row level security;
revoke all on public.studio_deliveries from anon,authenticated;
grant select,insert,update on public.studio_deliveries to service_role;
