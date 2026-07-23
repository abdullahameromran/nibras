-- =====================================================================
-- SMART CLASS — STARTER SEED DATA
-- Safe to run after the schema migration.
-- =====================================================================

insert into subscription_plans (name, max_students, max_teachers, price_cents, billing_cycle, features)
select
  'Starter',
  150,
  15,
  4900,
  'monthly',
  '{"lessons": true, "homework": true, "monthly_tests": true, "messaging": true, "reports": false}'::jsonb
where not exists (
  select 1 from subscription_plans where lower(btrim(name)) = 'starter'
);

insert into subscription_plans (name, max_students, max_teachers, price_cents, billing_cycle, features)
select
  'Growth',
  600,
  60,
  14900,
  'monthly',
  '{"lessons": true, "homework": true, "monthly_tests": true, "messaging": true, "reports": true}'::jsonb
where not exists (
  select 1 from subscription_plans where lower(btrim(name)) = 'growth'
);

insert into subscription_plans (name, max_students, max_teachers, price_cents, billing_cycle, features)
select
  'Enterprise',
  null,
  null,
  39900,
  'monthly',
  '{"lessons": true, "homework": true, "monthly_tests": true, "messaging": true, "reports": true, "priority_support": true}'::jsonb
where not exists (
  select 1 from subscription_plans where lower(btrim(name)) = 'enterprise'
);

insert into platform_settings (key, value) values
  ('platform_name', '"Smart Class"'),
  ('support_email', '"support@smartclass.example"'),
  ('default_timezone', '"UTC"'),
  ('maintenance_mode', 'false')
on conflict (key) do nothing;
