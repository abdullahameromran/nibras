-- Clean up duplicate subscription plans that are not being used.
-- 1. Make common plan names user-friendly.
-- 2. Keep one plan per normalized name.
-- 3. Delete duplicate plans only when they have no subscriptions.
-- 4. Add a normalized unique index when no duplicates remain.

begin;

update public.subscription_plans
set name = case
  when lower(btrim(name)) = 'starter' then 'Starter'
  when lower(btrim(name)) = 'growth' then 'Growth'
  when lower(btrim(name)) = 'enterprise' then 'Enterprise'
  when lower(btrim(name)) = 'quota_demo' then 'Quota Demo'
  else regexp_replace(btrim(name), '\s+', ' ', 'g')
end
where name is not null;

with plan_usage as (
  select
    sp.id,
    lower(btrim(sp.name)) as normalized_name,
    sp.created_at,
    count(ss.id) as subscription_count
  from public.subscription_plans sp
  left join public.school_subscriptions ss on ss.plan_id = sp.id
  group by sp.id, sp.name, sp.created_at
),
keepers as (
  select distinct on (normalized_name)
    id,
    normalized_name
  from plan_usage
  order by normalized_name, subscription_count desc, created_at asc, id asc
),
deletable as (
  select pu.id
  from plan_usage pu
  join keepers k on k.normalized_name = pu.normalized_name
  where pu.id <> k.id
    and pu.subscription_count = 0
)
delete from public.subscription_plans sp
using deletable d
where sp.id = d.id;

do $$
begin
  if exists (
    select 1
    from (
      select lower(btrim(name)) as normalized_name
      from public.subscription_plans
      group by lower(btrim(name))
      having count(*) > 1
    ) duplicates
  ) then
    raise notice 'Some duplicate plan names still exist because they are already used by subscriptions. Clean those manually before adding a DB-level unique index.';
  else
    execute 'create unique index if not exists uq_subscription_plans_name_normalized on public.subscription_plans ((lower(btrim(name))))';
  end if;
end $$;

commit;
