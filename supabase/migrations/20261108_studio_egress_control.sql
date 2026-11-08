-- Service-only compact worker polling; no workspace/data deletion.
begin;
create table if not exists public.studio_poll_checkpoints(kind text primary key check(kind='maintenance'),version bigint,lease text,lease_until timestamptz);
alter table public.studio_poll_checkpoints enable row level security;
revoke all on public.studio_poll_checkpoints from public,anon,authenticated;
grant select,insert,update on public.studio_poll_checkpoints to service_role;
create or replace function public.studio_poll_status(p_kind text,p_lease text,p_docs_enabled boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s jsonb; v bigint; due boolean; point public.studio_poll_checkpoints%rowtype; stamp text; trash_before text;
begin
 if p_kind is null or p_kind not in ('worker','maintenance','notifications') or p_lease is null or length(p_lease)<1 or length(p_lease)>150 then raise exception 'Invalid poll'; end if;
 select version,state into v,s from public.studio_workspace where id=true;
 if s is null then raise exception 'Initialize Studio first'; end if;
 stamp=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 if p_kind='worker' then
  select exists(select 1 from jsonb_array_elements(coalesce(s->'jobs','[]')) j where j->>'state'='queued' or (j->>'state'='running' and j->>'leaseUntil'<stamp)) into due;
 elsif p_kind='notifications' then
  due=coalesce((s->'settings'->>'emailEnabled')::boolean,false) and exists(select 1 from jsonb_array_elements(coalesce(s->'notices','[]')) n where not exists(select 1 from public.studio_deliveries d where d.id=(n->>'eventId')||':'||(n->>'user')) and exists(select 1 from jsonb_array_elements(s->'members') m where m->>'email'=n->>'user' and not coalesce((m->>'revoked')::boolean,false)));
 else
  insert into public.studio_poll_checkpoints(kind) values('maintenance') on conflict do nothing;
  select * into point from public.studio_poll_checkpoints where kind='maintenance' for update;
  if point.lease_until>now() then return jsonb_build_object('version',v,'due',false); end if;
  due=point.version is distinct from v;
  -- Time-based work must wake even when workspace version has not changed.
  due=due or exists(select 1 from jsonb_array_elements(coalesce(s->'planningTasks','[]')) t where t->>'state'='planned' and t->>'at'<=stamp and not exists(select 1 from jsonb_array_elements(coalesce(s->'notices','[]')) n where n->>'eventId'='planning-due:'||(t->>'id')||':'||(t->>'at')));
  due=due or exists(select 1 from jsonb_array_elements(coalesce(s->'schedules','[]')) t where t->>'state'='planned' and t->>'at'<=stamp and not exists(select 1 from jsonb_array_elements(coalesce(s->'notices','[]')) n where n->>'eventId' in ('due-ready:'||(t->>'id')||':'||(t->>'at'),'due-blocked:'||(t->>'id')||':'||(t->>'at'))));
  due=due or exists(select 1 from jsonb_array_elements(coalesce(s->'recurrences','[]')) r where r->>'state'='active' and ((r->>'nextAt'<=stamp and r->>'lastOccurrence' is distinct from r->>'nextAt') or (r->>'nextAt'>stamp and (r->>'nextAt')::timestamptz<now()+interval '24 hours' and not exists(select 1 from jsonb_array_elements(coalesce(s->'notices','[]')) n where n->>'eventId'='research-choice:'||(r->>'id')||':'||(r->>'nextAt')))));
  if p_docs_enabled and s->'settings'->>'docsMode'='automatic' then
   due=due or exists(select 1 from jsonb_array_elements(coalesce(s->'contents','[]')) c where nullif(c->>'deletedAt','') is null and nullif(c->>'docId','') is not null and nullif(c->>'docsOwnerId','') is not null and nullif(c->>'docsOwnerEmail','') is not null and coalesce(c->>'docsLastCheckedAt',c->>'docsFetchedAt') is not null and coalesce(c->>'docsLastCheckedAt',c->>'docsFetchedAt')::timestamptz<now()-interval '5 minutes');
  end if;
  trash_before=to_char((now()-make_interval(days=>coalesce((s->'settings'->>'trashDays')::int,30))) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  due=due or exists(select 1 from jsonb_array_elements(coalesce(s->'contents','[]')) c where c->>'deletedAt'<=trash_before and not exists(select 1 from jsonb_array_elements(coalesce(s->'packages','[]')) p where p->>'contentId'=c->>'id') and not exists(select 1 from jsonb_array_elements(coalesce(s->'schedules','[]')) p where p->>'contentId'=c->>'id') and not exists(select 1 from jsonb_array_elements(coalesce(s->'planningTasks','[]')) p where p->>'contentId'=c->>'id' and p->>'state'='planned'));
  if due then update public.studio_poll_checkpoints set lease=p_lease,lease_until=now()+interval '3 minutes' where kind='maintenance'; end if;
 end if;
 return jsonb_build_object('version',v,'due',due);
end; $$;
create or replace function public.studio_finish_maintenance_poll(p_lease text,p_version bigint) returns void
language plpgsql security definer set search_path=public as $$
begin
 if p_version>(select version from public.studio_workspace where id=true) then raise exception 'Invalid checkpoint version'; end if;
 update public.studio_poll_checkpoints set version=p_version,lease=null,lease_until=null where kind='maintenance' and lease=p_lease;
 if not found then raise exception 'Maintenance lease changed' using errcode='40001'; end if;
end; $$;
revoke all on function public.studio_poll_status(text,text,boolean),public.studio_finish_maintenance_poll(text,bigint) from public,anon,authenticated;
grant execute on function public.studio_poll_status(text,text,boolean),public.studio_finish_maintenance_poll(text,bigint) to service_role;
create or replace function public.studio_job_status(p_job_id text,p_actor_email text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s jsonb; v bigint; j jsonb; m jsonb; assigned text;
begin
 select version,state into v,s from public.studio_workspace where id=true;
 select value into m from jsonb_array_elements(coalesce(s->'members','[]')) where value->>'email'=p_actor_email and not coalesce((value->>'revoked')::boolean,false) limit 1;
 if m is null then raise exception 'Workspace access revoked' using errcode='42501'; end if;
 select value into j from jsonb_array_elements(coalesce(s->'jobs','[]')) where value->>'id'=p_job_id and value->>'createdBy'=p_actor_email limit 1;
 if j is null then return null; end if;
 select value->>'assignedTo' into assigned from jsonb_array_elements(coalesce(s->'contents','[]')) where value->>'id'=j->>'contentId' limit 1;
 return jsonb_build_object('version',v,'member',m,'assignedTo',assigned,'job',jsonb_build_object('id',j->>'id','kind',j->>'kind','channel',j->>'channel','account',j->>'account','contentId',j->>'contentId','createdBy',j->>'createdBy','state',j->>'state','leaseId',j->>'leaseId','leaseUntil',j->>'leaseUntil'));
end; $$;
revoke all on function public.studio_job_status(text,text) from public,anon,authenticated;
grant execute on function public.studio_job_status(text,text) to service_role;

-- Include the earlier immutable-history save optimization.

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
