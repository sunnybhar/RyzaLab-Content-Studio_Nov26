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
 if p_kind not in ('worker','maintenance','notifications') or p_lease is null or length(p_lease)>150 then raise exception 'Invalid poll'; end if;
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
commit;
