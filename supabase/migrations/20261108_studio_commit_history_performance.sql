-- Run after 20261027_studio_v2.sql. Function-only optimization: no history deletion.
-- Retains service-only access, exact immutable evidence and atomic version/secret writes.
begin;
create or replace function public.studio_commit(p_expected_version bigint,p_state jsonb,p_secret jsonb default null) returns bigint
language plpgsql security definer set search_path=public as $$
declare
 old_state jsonb; current_version bigint;
 package_map jsonb; audit_map jsonb; item_count bigint; unique_count bigint;
begin
 perform pg_advisory_xact_lock(72161027);
 select version,state into current_version,old_state from public.studio_workspace where id=true for update;
 if current_version is null then
  if p_expected_version<>-1 or (p_state->>'version')::bigint<>0 then raise exception 'studio_version_conflict' using errcode='40001'; end if;
 else
  if current_version<>p_expected_version or (p_state->>'version')::bigint<>current_version+1 then raise exception 'studio_version_conflict' using errcode='40001'; end if;
 end if;
 if jsonb_typeof(p_state->'members') is distinct from 'array' or jsonb_typeof(p_state->'packages') is distinct from 'array' or jsonb_typeof(p_state->'audit') is distinct from 'array' then raise exception 'Invalid Studio state'; end if;
 -- Key once instead of performing an array-containment scan for every old item.
 if exists(select 1 from jsonb_array_elements(p_state->'packages') a where jsonb_typeof(a.value->'id') is distinct from 'string' or a.value->>'id'='') or exists(select 1 from jsonb_array_elements(p_state->'audit') a where jsonb_typeof(a.value->'id') is distinct from 'string' or a.value->>'id'='') then raise exception 'Invalid evidence identity'; end if;
 select coalesce(jsonb_object_agg(value->>'id',value),'{}'::jsonb),count(*),count(distinct value->>'id') into package_map,item_count,unique_count from jsonb_array_elements(p_state->'packages');
 if item_count<>unique_count then raise exception 'Duplicate package identity'; end if;
 select coalesce(jsonb_object_agg(value->>'id',value),'{}'::jsonb),count(*),count(distinct value->>'id') into audit_map,item_count,unique_count from jsonb_array_elements(p_state->'audit');
 if item_count<>unique_count then raise exception 'Duplicate audit identity'; end if;
 if old_state is not null then
  if exists(select 1 from jsonb_array_elements(coalesce(old_state->'packages','[]'::jsonb)) a where package_map->(a.value->>'id') is distinct from a.value) then raise exception 'Cannot mutate or remove existing release package'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(old_state->'audit','[]'::jsonb)) a where audit_map->(a.value->>'id') is distinct from a.value) then raise exception 'Cannot mutate or remove audit evidence'; end if;
 end if;
 -- Set-based checks/inserts avoid one SQL statement per historical record.
 if exists(select 1 from jsonb_each(package_map) a join public.studio_release_packages p on p.id=a.key where p.payload<>a.value) then raise exception 'Release package conflict'; end if;
 if exists(select 1 from jsonb_each(audit_map) a join public.studio_audit p on p.id=a.key where p.payload<>a.value) then raise exception 'Audit conflict'; end if;
 insert into public.studio_release_packages(id,payload) select a.key,a.value from jsonb_each(package_map) a left join public.studio_release_packages p on p.id=a.key where p.id is null on conflict(id) do nothing;
 insert into public.studio_audit(id,payload) select a.key,a.value from jsonb_each(audit_map) a left join public.studio_audit p on p.id=a.key where p.id is null on conflict(id) do nothing;
 if p_secret is not null then
  insert into public.studio_secrets(id,ciphertext) values(p_secret->>'id',p_secret->>'ciphertext') on conflict(id) do update set ciphertext=excluded.ciphertext,updated_at=now();
 end if;
 insert into public.studio_workspace(id,version,state) values(true,(p_state->>'version')::bigint,p_state) on conflict(id) do update set version=excluded.version,state=excluded.state,updated_at=now();
 return (p_state->>'version')::bigint;
end; $$;
revoke all on function public.studio_commit(bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.studio_commit(bigint,jsonb,jsonb) to service_role;
commit;
