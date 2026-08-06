-- Consolidate all public marketing leads into one table.
-- 1. Move any legacy waitlist rows into school_demo_requests.
-- 2. Keep created dates and status history where possible.
-- 3. Drop the old waitlist_signups table after migration.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'waitlist_signups'
  ) then
    insert into public.school_demo_requests (
      school_name,
      director_name,
      phone,
      email,
      agreed_to_contact,
      source,
      status,
      contacted_at,
      created_at
    )
    select
      ws.full_name as school_name,
      ws.full_name as director_name,
      ws.phone,
      ws.email,
      true as agreed_to_contact,
      case
        when coalesce(nullif(ws.source, ''), '') = '' then 'legacy_waitlist'
        else ws.source
      end as source,
      coalesce(nullif(ws.status, ''), 'new') as status,
      ws.contacted_at,
      ws.created_at
    from public.waitlist_signups ws
    where not exists (
      select 1
      from public.school_demo_requests sdr
      where coalesce(lower(sdr.email), '') = coalesce(lower(ws.email), '')
        and sdr.phone = ws.phone
        and sdr.created_at = ws.created_at
    );

    drop table if exists public.waitlist_signups cascade;
  end if;
end $$;
