-- =====================================================================
-- SMART CLASS — SCHOOL MANAGEMENT SaaS
-- Supabase / PostgreSQL schema
-- Multi-tenant (schools), RBAC (5 roles), RLS-first design
-- =====================================================================
-- Notes:
--  * pgcrypto is enabled by default on Supabase (gen_random_uuid()).
--  * Every tenant-owned table carries school_id for isolation + RLS.
--  * RLS uses auth.uid() + EXISTS-checks against user_school_roles.
--    No session/config variables are used, so this is safe under
--    pgbouncer transaction pooling.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ENUM TYPES
-- ---------------------------------------------------------------------
create type user_role as enum ('super_admin','school_admin','teacher','student','parent');
create type attendance_status as enum ('present','absent','late','excused');
create type announcement_target_type as enum ('school','grade_level','class','role');
create type grade_status as enum ('draft','submitted','approved');
create type subscription_status as enum ('trialing','active','past_due','canceled','suspended');
create type file_kind as enum ('image','video','pdf','doc','other');
create type student_academic_status as enum ('active','graduated','transferred','withdrawn','suspended');
create type exam_type as enum ('monthly','final');

-- ---------------------------------------------------------------------
-- 1. CORE / TENANCY
-- ---------------------------------------------------------------------

create table schools (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(255) not null,
  slug          varchar(100) not null unique,
  logo_url      text,
  timezone      varchar(100) not null default 'UTC',
  is_active     boolean not null default true,
  settings      jsonb not null default '{}'::jsonb, -- School Admin "Settings" module config
  deleted_at    timestamptz, -- soft delete (Super Admin only, per permission matrix)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- single-row-per-key platform config, Super Admin "Full System Config"
create table platform_settings (
  key           varchar(100) primary key,
  value         jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

create table subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(100) not null,
  max_students  integer,
  max_teachers  integer,
  price_cents   integer not null default 0,
  billing_cycle varchar(20) not null default 'monthly', -- monthly|yearly
  features      jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index uq_subscription_plans_name_normalized
  on subscription_plans ((lower(btrim(name))));

create table school_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  plan_id       uuid not null references subscription_plans(id),
  status        subscription_status not null default 'trialing',
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  external_ref  text, -- e.g. Stripe subscription id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_school_subscriptions_school on school_subscriptions(school_id);

-- profiles extends Supabase auth.users 1:1
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         varchar(255) not null,
  first_name    varchar(100),
  last_name     varchar(100),
  avatar_url    text,
  phone         varchar(20),
  is_active     boolean not null default true,
  notification_preferences jsonb not null default '{}'::jsonb, -- personal "Settings" module
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- role assignment: a user can hold different roles in different schools.
-- super_admin rows have school_id = NULL (platform-wide).
create table user_school_roles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  school_id     uuid references schools(id) on delete cascade,
  role          user_role not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint chk_super_admin_no_school
    check ( (role = 'super_admin' and school_id is null) or (role <> 'super_admin' and school_id is not null) ),
  unique (user_id, school_id, role)
);
create index idx_usr_user on user_school_roles(user_id);
create index idx_usr_school_role on user_school_roles(school_id, role);

-- ---------------------------------------------------------------------
-- 2. ACADEMIC STRUCTURE
-- ---------------------------------------------------------------------

create table academic_years (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  name          varchar(100) not null,
  start_date    date not null,
  end_date      date not null,
  is_current    boolean not null default false,
  created_at    timestamptz not null default now()
);
create index idx_ay_school on academic_years(school_id);
-- only one "current" year per school
create unique index uq_ay_current on academic_years(school_id) where is_current;

create table working_days (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  label         varchar(20) not null
);
create index idx_wd_school on working_days(school_id);

create table time_slots (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  label         varchar(50) not null,
  start_time    time not null,
  end_time      time not null,
  sort_order    smallint not null default 0
);
create index idx_ts_school on time_slots(school_id);

-- renamed from "grades" in the source ER diagram to avoid clashing with
-- final_grades / scores. This table = grade LEVELS (Grade 1, Grade 2 ...).
create table grade_levels (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  name          varchar(100) not null,
  sort_order    smallint not null default 0
);
create index idx_gl_school on grade_levels(school_id);

create table classes (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references schools(id) on delete cascade,
  academic_year_id  uuid not null references academic_years(id) on delete cascade,
  grade_level_id    uuid not null references grade_levels(id) on delete cascade,
  name              varchar(100) not null, -- e.g. "Section A"
  created_at        timestamptz not null default now()
);
create index idx_classes_school on classes(school_id);
create index idx_classes_year on classes(academic_year_id);

create table subjects (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  name          varchar(150) not null,
  code          varchar(50),
  created_at    timestamptz not null default now()
);
create index idx_subjects_school on subjects(school_id);

create table class_enrollments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  class_id      uuid not null references classes(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  enrolled_at   timestamptz not null default now(),
  status        student_academic_status not null default 'active', -- الحالة الدراسية
  status_changed_at timestamptz,
  unique (class_id, student_id)
);
create index idx_ce_school on class_enrollments(school_id);
create index idx_ce_student on class_enrollments(student_id);

-- ملفات الطلاب: student documents (ID copies, certificates, medical forms...)
create table student_documents (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  label         varchar(150) not null,
  file_url      text not null, -- Supabase Storage path
  file_kind     file_kind not null default 'other',
  uploaded_by   uuid not null references profiles(id),
  uploaded_at   timestamptz not null default now()
);
create index idx_sd_school on student_documents(school_id);
create index idx_sd_student on student_documents(student_id);

-- Which teacher teaches which subject, optionally scoped to a class.
create table teacher_subject_assignments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  teacher_id    uuid not null references profiles(id) on delete cascade,
  subject_id    uuid not null references subjects(id) on delete cascade,
  class_id      uuid references classes(id) on delete cascade,
  unique (teacher_id, subject_id, class_id)
);
create index idx_tsa_school on teacher_subject_assignments(school_id);
create index idx_tsa_teacher on teacher_subject_assignments(teacher_id);
create index idx_tsa_class on teacher_subject_assignments(class_id);

create table timetable_entries (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references schools(id) on delete cascade,
  academic_year_id  uuid not null references academic_years(id) on delete cascade,
  working_day_id    uuid not null references working_days(id) on delete cascade,
  time_slot_id      uuid not null references time_slots(id) on delete cascade,
  class_id          uuid not null references classes(id) on delete cascade,
  subject_id        uuid not null references subjects(id) on delete cascade,
  teacher_id        uuid not null references profiles(id) on delete cascade,
  unique (class_id, working_day_id, time_slot_id)
);
create index idx_tte_school on timetable_entries(school_id);
create index idx_tte_class on timetable_entries(class_id);
create index idx_tte_teacher on timetable_entries(teacher_id);

-- ---------------------------------------------------------------------
-- 3. LMS: LESSONS & ATTENDANCE
-- ---------------------------------------------------------------------

create table lessons (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  class_id      uuid not null references classes(id) on delete cascade,
  subject_id    uuid not null references subjects(id) on delete cascade,
  teacher_id    uuid not null references profiles(id) on delete cascade,
  title         varchar(255) not null,
  description   text,
  video_url     text,
  lesson_date   date not null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_lessons_school on lessons(school_id);
create index idx_lessons_class on lessons(class_id);
create index idx_lessons_teacher on lessons(teacher_id);

create table lesson_attachments (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references lessons(id) on delete cascade,
  file_name     varchar(255) not null,
  file_url      text not null,       -- Supabase Storage path
  file_kind     file_kind not null default 'other',
  uploaded_at   timestamptz not null default now()
);
create index idx_la_lesson on lesson_attachments(lesson_id);

create table student_lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);
create index idx_slp_school on student_lesson_progress(school_id);
create index idx_slp_lesson on student_lesson_progress(lesson_id);
create index idx_slp_student on student_lesson_progress(student_id);

create table attendance_records (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  status        attendance_status not null default 'present',
  recorded_by   uuid not null references profiles(id),
  recorded_at   timestamptz not null default now(),
  unique (lesson_id, student_id)
);
create index idx_ar_school on attendance_records(school_id);
create index idx_ar_student on attendance_records(student_id);
create index idx_ar_lesson on attendance_records(lesson_id);

-- Teacher attendance (doc mentions this as a later-phase option; included here
-- as a standalone daily record, independent of the lesson/timetable structure).
create table teacher_attendance_records (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  teacher_id    uuid not null references profiles(id) on delete cascade,
  attendance_date date not null,
  status        attendance_status not null default 'present',
  recorded_by   uuid not null references profiles(id),
  recorded_at   timestamptz not null default now(),
  unique (teacher_id, attendance_date)
);
create index idx_tar_school on teacher_attendance_records(school_id);
create index idx_tar_teacher on teacher_attendance_records(teacher_id);

-- ---------------------------------------------------------------------
-- 4. ASSESSMENTS: HOMEWORK, MONTHLY TESTS, FINAL GRADES
-- ---------------------------------------------------------------------

create table homework (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  title         varchar(255) not null,
  due_date      timestamptz not null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index idx_hw_school on homework(school_id);
create index idx_hw_lesson on homework(lesson_id);

create table homework_questions (
  id            uuid primary key default gen_random_uuid(),
  homework_id   uuid not null references homework(id) on delete cascade,
  question_text text not null,
  sort_order    smallint not null default 0
);
create index idx_hwq_hw on homework_questions(homework_id);

create table homework_choices (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references homework_questions(id) on delete cascade,
  choice_text   text not null,
  is_correct    boolean not null default false,
  sort_order    smallint not null default 0
);
create index idx_hwc_q on homework_choices(question_id);

create table homework_submissions (
  id            uuid primary key default gen_random_uuid(),
  homework_id   uuid not null references homework(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  score         decimal(5,2),
  graded_at     timestamptz,
  unique (homework_id, student_id)
);
create index idx_hws_student on homework_submissions(student_id);

create table homework_answers (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid not null references homework_submissions(id) on delete cascade,
  question_id         uuid not null references homework_questions(id) on delete cascade,
  selected_choice_id  uuid references homework_choices(id),
  is_correct          boolean,
  unique (submission_id, question_id)
);

create table monthly_tests (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  subject_id      uuid not null references subjects(id) on delete cascade,
  teacher_id      uuid not null references profiles(id) on delete cascade,
  title           varchar(255) not null,
  test_date       date not null,
  duration_minutes smallint not null default 60,
  kind            exam_type not null default 'monthly', -- monthly vs. final exam
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index idx_mt_school on monthly_tests(school_id);
create index idx_mt_class on monthly_tests(class_id);

create table test_questions (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid not null references monthly_tests(id) on delete cascade,
  question_text text not null,
  sort_order    smallint not null default 0
);
create table test_choices (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references test_questions(id) on delete cascade,
  choice_text   text not null,
  is_correct    boolean not null default false,
  sort_order    smallint not null default 0
);
create table test_submissions (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid not null references monthly_tests(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  score         decimal(5,2),
  graded_at     timestamptz,
  unique (test_id, student_id)
);
create index idx_ts_student on test_submissions(student_id);
create table test_answers (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid not null references test_submissions(id) on delete cascade,
  question_id         uuid not null references test_questions(id) on delete cascade,
  selected_choice_id  uuid references test_choices(id),
  is_correct          boolean,
  unique (submission_id, question_id)
);

-- Final grades: teacher submits, school admin approves & locks.
create table final_grades (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references schools(id) on delete cascade,
  academic_year_id  uuid not null references academic_years(id) on delete cascade,
  class_id          uuid not null references classes(id) on delete cascade,
  subject_id        uuid not null references subjects(id) on delete cascade,
  student_id        uuid not null references profiles(id) on delete cascade,
  grade_value       decimal(5,2),
  grade_letter      varchar(5),
  remarks           text,
  status            grade_status not null default 'draft',
  submitted_by      uuid references profiles(id),
  submitted_at      timestamptz,
  approved_by       uuid references profiles(id),
  approved_at       timestamptz,
  deleted_at        timestamptz,
  unique (academic_year_id, class_id, subject_id, student_id)
);
create index idx_fg_school on final_grades(school_id);
create index idx_fg_student on final_grades(student_id);

-- ---------------------------------------------------------------------
-- 5. COMMUNICATION
-- ---------------------------------------------------------------------

create table announcements (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  author_id     uuid not null references profiles(id),
  title         varchar(255) not null,
  body          text not null,
  is_published  boolean not null default false,
  published_at  timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index idx_ann_school on announcements(school_id);

create table announcement_targets (
  id                uuid primary key default gen_random_uuid(),
  announcement_id   uuid not null references announcements(id) on delete cascade,
  target_type       announcement_target_type not null,
  target_id         uuid,        -- grade_level_id or class_id; null for 'school' and 'role'
  target_role       user_role,   -- populated only when target_type = 'role' (e.g. all teachers)
  constraint chk_target_shape check (
    (target_type = 'school'      and target_id is null and target_role is null) or
    (target_type = 'grade_level' and target_id is not null and target_role is null) or
    (target_type = 'class'       and target_id is not null and target_role is null) or
    (target_type = 'role'        and target_id is null and target_role is not null)
  )
);
create index idx_at_ann on announcement_targets(announcement_id);

create table messages (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  sender_id     uuid not null references profiles(id),
  subject       varchar(255),
  body          text not null,
  is_broadcast  boolean not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index idx_msg_school on messages(school_id);
create index idx_msg_sender on messages(sender_id);

create table message_recipients (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references messages(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  is_read       boolean not null default false,
  read_at       timestamptz,
  unique (message_id, recipient_id)
);
create index idx_mr_recipient on message_recipients(recipient_id);

-- ---------------------------------------------------------------------
-- 6. RELATIONSHIPS
-- ---------------------------------------------------------------------

create table parent_student_links (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  parent_id     uuid not null references profiles(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  relationship  varchar(50) not null default 'parent',
  created_at    timestamptz not null default now(),
  unique (parent_id, student_id)
);
create index idx_psl_parent on parent_student_links(parent_id);
create index idx_psl_student on parent_student_links(student_id);

-- ---------------------------------------------------------------------
-- 7. SUPPORT: AUDIT LOG + NOTIFICATION QUEUE
-- ---------------------------------------------------------------------

create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references schools(id) on delete set null,
  actor_id      uuid references profiles(id),
  action        varchar(50) not null,   -- e.g. 'export_data','delete_record','approve_grades'
  entity_type   varchar(100) not null,
  entity_id     uuid,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index idx_audit_school on audit_logs(school_id);
create index idx_audit_actor on audit_logs(actor_id);

-- outbound notification queue, drained by an edge function / cron job
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references schools(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  channel       varchar(20) not null default 'push', -- push|email|sms
  title         varchar(255),
  body          text,
  payload       jsonb not null default '{}'::jsonb,
  status        varchar(20) not null default 'pending', -- pending|sent|failed
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index idx_notif_status on notifications(status) where status = 'pending';
create index idx_notif_recipient on notifications(recipient_id);

-- Push notification device tokens (FCM/APNs), used by dispatch-notifications
create table device_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  token         text not null,
  platform      varchar(20) not null default 'web', -- ios|android|web
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (user_id, token)
);
create index idx_dt_user on device_tokens(user_id);

-- Public website marketing leads submitted from the landing page demo form.
create table school_demo_requests (
  id                uuid primary key default gen_random_uuid(),
  school_name       varchar(255) not null,
  director_name     varchar(255) not null,
  phone             varchar(30) not null,
  email             varchar(255),
  address           text,
  governorate       varchar(100),
  student_count     varchar(50),
  school_type       varchar(50),
  message           text,
  agreed_to_contact boolean not null default false,
  source            varchar(50) not null default 'landing_page_modal',
  status            varchar(20) not null default 'new', -- new|contacted|qualified|closed
  contacted_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_school_demo_requests_status on school_demo_requests(status);
create index idx_school_demo_requests_created on school_demo_requests(created_at desc);
create index idx_school_demo_requests_email on school_demo_requests(email);
grant insert on school_demo_requests to anon, authenticated;
grant select on school_demo_requests to authenticated, service_role;

-- =====================================================================
-- 8. HELPER FUNCTIONS (used everywhere in RLS)
-- =====================================================================

create or replace function is_super_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from user_school_roles
    where user_id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

create or replace function user_has_school_role(p_school_id uuid, p_roles user_role[])
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from user_school_roles
    where user_id = auth.uid()
      and school_id = p_school_id
      and role = any(p_roles)
      and is_active
  ) or is_super_admin();
$$;

create or replace function is_teacher_of_class(p_class_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from teacher_subject_assignments tsa
    join classes c on c.id = p_class_id
    where tsa.teacher_id = auth.uid()
      and (tsa.class_id = p_class_id or tsa.class_id is null)
  ) or is_super_admin();
$$;

create or replace function is_parent_of_student(p_student_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from parent_student_links
    where parent_id = auth.uid() and student_id = p_student_id
  ) or is_super_admin();
$$;

-- =====================================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================================

-- Enable RLS everywhere
alter table schools enable row level security;
alter table subscription_plans enable row level security;
alter table school_subscriptions enable row level security;
alter table profiles enable row level security;
alter table user_school_roles enable row level security;
alter table academic_years enable row level security;
alter table working_days enable row level security;
alter table time_slots enable row level security;
alter table grade_levels enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table class_enrollments enable row level security;
alter table teacher_subject_assignments enable row level security;
alter table timetable_entries enable row level security;
alter table lessons enable row level security;
alter table lesson_attachments enable row level security;
alter table student_lesson_progress enable row level security;
alter table attendance_records enable row level security;
alter table homework enable row level security;
alter table homework_questions enable row level security;
alter table homework_choices enable row level security;
alter table homework_submissions enable row level security;
alter table homework_answers enable row level security;
alter table monthly_tests enable row level security;
alter table test_questions enable row level security;
alter table test_choices enable row level security;
alter table test_submissions enable row level security;
alter table test_answers enable row level security;
alter table final_grades enable row level security;
alter table announcements enable row level security;
alter table announcement_targets enable row level security;
alter table messages enable row level security;
alter table message_recipients enable row level security;
alter table parent_student_links enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table student_documents enable row level security;
alter table platform_settings enable row level security;
alter table teacher_attendance_records enable row level security;
alter table device_tokens enable row level security;
alter table school_demo_requests enable row level security;

-- schools: super admin full; members of the school can read it
create policy schools_select on schools for select
  using ( is_super_admin() or (id in (select school_id from user_school_roles where user_id = auth.uid()) and deleted_at is null) );
create policy schools_write on schools for all
  using (is_super_admin()) with check (is_super_admin());

-- subscription plans: readable by everyone authenticated, writable only by super admin
create policy plans_select on subscription_plans for select using (true);
create policy plans_write on subscription_plans for all using (is_super_admin()) with check (is_super_admin());

create policy school_subs_select on school_subscriptions for select
  using ( is_super_admin() or user_has_school_role(school_id, array['school_admin']::user_role[]) );
create policy school_subs_write on school_subscriptions for all
  using (is_super_admin()) with check (is_super_admin());

-- profiles: everyone can see their own; school members can see co-members in same school
create policy profiles_self on profiles for select using ( id = auth.uid() );
create policy profiles_same_school on profiles for select using (
  exists (
    select 1 from user_school_roles a
    join user_school_roles b on a.school_id = b.school_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  ) or is_super_admin()
);
create policy profiles_update_self on profiles for update using ( id = auth.uid() ) with check ( id = auth.uid() );

-- user_school_roles: super/school admin manage; users can see their own rows
create policy usr_select on user_school_roles for select
  using ( user_id = auth.uid() or is_super_admin()
          or user_has_school_role(school_id, array['school_admin']::user_role[]) );
create policy usr_write on user_school_roles for all
  using ( is_super_admin() or user_has_school_role(school_id, array['school_admin']::user_role[]) )
  with check ( is_super_admin() or user_has_school_role(school_id, array['school_admin']::user_role[]) );

-- generic pattern macro (repeated per table below):
--  SELECT: any active member of that school
--  WRITE : school_admin or super_admin

create policy ay_select on academic_years for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy ay_write on academic_years for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy wd_select on working_days for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy wd_write on working_days for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy tslot_select on time_slots for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy tslot_write on time_slots for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy gl_select on grade_levels for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy gl_write on grade_levels for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy classes_select on classes for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy classes_write on classes for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy subjects_select on subjects for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy subjects_write on subjects for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

-- class enrollments: admin full; teacher of class can view; student sees own; parent sees child's
create policy ce_select on class_enrollments for select using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
  or is_teacher_of_class(class_id)
  or student_id = auth.uid()
  or is_parent_of_student(student_id)
);
create policy ce_write on class_enrollments for all
  using ( user_has_school_role(school_id, array['school_admin']::user_role[]) )
  with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy tsa_select on teacher_subject_assignments for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy tsa_write on teacher_subject_assignments for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy tte_select on timetable_entries for select using ( user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[]) );
create policy tte_write on timetable_entries for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) ) with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

-- lessons: teacher owns (create/edit); class students + their parents + admin can read
create policy lessons_select on lessons for select using (
  (deleted_at is null or is_super_admin()) and (
    user_has_school_role(school_id, array['school_admin']::user_role[])
    or teacher_id = auth.uid()
    or exists (select 1 from class_enrollments ce where ce.class_id = lessons.class_id and (ce.student_id = auth.uid() or is_parent_of_student(ce.student_id)))
  )
);
create policy lessons_write on lessons for all
  using ( user_has_school_role(school_id, array['school_admin']::user_role[]) or teacher_id = auth.uid() )
  with check ( user_has_school_role(school_id, array['school_admin']::user_role[]) or teacher_id = auth.uid() );

create policy la_select on lesson_attachments for select using (
  exists (
    select 1
    from lessons l
    where l.id = lesson_attachments.lesson_id
      and (
        user_has_school_role(l.school_id, array['school_admin']::user_role[])
        or l.teacher_id = auth.uid()
        or exists (
          select 1
          from class_enrollments ce
          where ce.class_id = l.class_id
            and (ce.student_id = auth.uid() or is_parent_of_student(ce.student_id))
        )
      )
  )
);
create policy la_write on lesson_attachments for all using (
  exists (
    select 1
    from lessons l
    where l.id = lesson_attachments.lesson_id
      and (l.teacher_id = auth.uid() or user_has_school_role(l.school_id, array['school_admin']::user_role[]))
  )
) with check (
  exists (
    select 1
    from lessons l
    where l.id = lesson_attachments.lesson_id
      and (l.teacher_id = auth.uid() or user_has_school_role(l.school_id, array['school_admin']::user_role[]))
  )
);

create policy slp_select on student_lesson_progress for select using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
  or exists (select 1 from lessons l where l.id = student_lesson_progress.lesson_id and l.teacher_id = auth.uid())
  or student_id = auth.uid()
  or is_parent_of_student(student_id)
);
create policy slp_insert on student_lesson_progress for insert with check (
  student_id = auth.uid()
  and exists (
    select 1
    from lessons l
    join class_enrollments ce on ce.class_id = l.class_id
    where l.id = student_lesson_progress.lesson_id
      and l.school_id = student_lesson_progress.school_id
      and ce.school_id = student_lesson_progress.school_id
      and ce.student_id = student_lesson_progress.student_id
  )
);
create policy slp_update on student_lesson_progress for update using (
  student_id = auth.uid() or user_has_school_role(school_id, array['school_admin']::user_role[])
) with check (
  student_id = auth.uid() or user_has_school_role(school_id, array['school_admin']::user_role[])
);

-- attendance: teacher of the lesson's class records it; student/parent read own; admin reads all
create policy attendance_select on attendance_records for select using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
  or recorded_by = auth.uid()
  or student_id = auth.uid()
  or is_parent_of_student(student_id)
);
create policy attendance_write on attendance_records for all
  using ( exists (select 1 from lessons l where l.id = attendance_records.lesson_id and l.teacher_id = auth.uid()) or user_has_school_role(school_id, array['school_admin']::user_role[]) )
  with check ( exists (select 1 from lessons l where l.id = attendance_records.lesson_id and l.teacher_id = auth.uid()) or user_has_school_role(school_id, array['school_admin']::user_role[]) );

-- homework family: teacher owns; students see/submit only their own class's homework
create policy hw_select on homework for select using (
  (deleted_at is null or is_super_admin()) and (
    user_has_school_role(school_id, array['school_admin']::user_role[])
    or exists (select 1 from lessons l where l.id = homework.lesson_id and (l.teacher_id = auth.uid()
        or exists (select 1 from class_enrollments ce where ce.class_id = l.class_id and (ce.student_id = auth.uid() or is_parent_of_student(ce.student_id)))))
  )
);
create policy hw_write on homework for all using (
  exists (select 1 from lessons l where l.id = homework.lesson_id and l.teacher_id = auth.uid())
  or user_has_school_role(school_id, array['school_admin']::user_role[])
);

create policy hwq_select on homework_questions for select using ( exists (select 1 from homework h where h.id = homework_questions.homework_id) );
create policy hwq_write on homework_questions for all using ( exists (select 1 from homework h join lessons l on l.id = h.lesson_id where h.id = homework_questions.homework_id and l.teacher_id = auth.uid()) );

create policy hwc_select on homework_choices for select using ( exists (select 1 from homework_questions q where q.id = homework_choices.question_id) );
create policy hwc_write on homework_choices for all using ( exists (select 1 from homework_questions q join homework h on h.id = q.homework_id join lessons l on l.id = h.lesson_id where q.id = homework_choices.question_id and l.teacher_id = auth.uid()) );

create policy hws_select on homework_submissions for select using (
  student_id = auth.uid() or is_parent_of_student(student_id)
  or exists (select 1 from homework h join lessons l on l.id = h.lesson_id where h.id = homework_submissions.homework_id and (l.teacher_id = auth.uid() or user_has_school_role(l.school_id, array['school_admin']::user_role[])))
);
create policy hws_insert on homework_submissions for insert with check ( student_id = auth.uid() );
create policy hws_update on homework_submissions for update using (
  exists (select 1 from homework h join lessons l on l.id = h.lesson_id where h.id = homework_submissions.homework_id and l.teacher_id = auth.uid())
);

create policy hwa_select on homework_answers for select using (
  exists (select 1 from homework_submissions s where s.id = homework_answers.submission_id and (s.student_id = auth.uid() or is_parent_of_student(s.student_id)))
);
create policy hwa_write on homework_answers for all using (
  exists (select 1 from homework_submissions s where s.id = homework_answers.submission_id and s.student_id = auth.uid())
);

-- monthly tests: mirrors homework pattern
create policy mt_select on monthly_tests for select using (
  (deleted_at is null or is_super_admin()) and (
    user_has_school_role(school_id, array['school_admin']::user_role[])
    or teacher_id = auth.uid()
    or exists (select 1 from class_enrollments ce where ce.class_id = monthly_tests.class_id and (ce.student_id = auth.uid() or is_parent_of_student(ce.student_id)))
  )
);
create policy mt_write on monthly_tests for all using ( teacher_id = auth.uid() or user_has_school_role(school_id, array['school_admin']::user_role[]) );

create policy tq_select on test_questions for select using ( exists (select 1 from monthly_tests t where t.id = test_questions.test_id) );
create policy tq_write on test_questions for all using ( exists (select 1 from monthly_tests t where t.id = test_questions.test_id and t.teacher_id = auth.uid()) );
create policy tc_select on test_choices for select using ( exists (select 1 from test_questions q where q.id = test_choices.question_id) );
create policy tc_write on test_choices for all using ( exists (select 1 from test_questions q join monthly_tests t on t.id = q.test_id where q.id = test_choices.question_id and t.teacher_id = auth.uid()) );

create policy tsub_select on test_submissions for select using (
  student_id = auth.uid() or is_parent_of_student(student_id)
  or exists (select 1 from monthly_tests t where t.id = test_submissions.test_id and (t.teacher_id = auth.uid() or user_has_school_role(t.school_id, array['school_admin']::user_role[])))
);
create policy tsub_insert on test_submissions for insert with check ( student_id = auth.uid() );
create policy tsub_update on test_submissions for update using (
  exists (select 1 from monthly_tests t where t.id = test_submissions.test_id and t.teacher_id = auth.uid())
);
create policy tans_select on test_answers for select using (
  exists (select 1 from test_submissions s where s.id = test_answers.submission_id and (s.student_id = auth.uid() or is_parent_of_student(s.student_id)))
);
create policy tans_write on test_answers for all using (
  exists (select 1 from test_submissions s where s.id = test_answers.submission_id and s.student_id = auth.uid())
);

-- final grades: teacher can insert/update while draft/submitted; admin approves & locks
create policy fg_select on final_grades for select using (
  (deleted_at is null or is_super_admin()) and (
    user_has_school_role(school_id, array['school_admin']::user_role[])
    or student_id = auth.uid()
    or is_parent_of_student(student_id)
    or exists (select 1 from teacher_subject_assignments tsa where tsa.subject_id = final_grades.subject_id and tsa.teacher_id = auth.uid())
  )
);
create policy fg_teacher_write on final_grades for all using (
  status <> 'approved'
  and exists (select 1 from teacher_subject_assignments tsa where tsa.subject_id = final_grades.subject_id and tsa.teacher_id = auth.uid())
);
create policy fg_admin_write on final_grades for all using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
) with check (
  user_has_school_role(school_id, array['school_admin']::user_role[])
);

-- announcements: admin (school-wide) + teacher (own class); readable by resolved audience
create policy ann_select on announcements for select using (
  is_published and (deleted_at is null or is_super_admin()) and (
    user_has_school_role(school_id, array['school_admin','teacher','student','parent']::user_role[])
  )
);
create policy ann_write on announcements for all using (
  user_has_school_role(school_id, array['school_admin']::user_role[]) or author_id = auth.uid()
);
create policy at_select on announcement_targets for select using ( exists (select 1 from announcements a where a.id = announcement_targets.announcement_id) );
create policy at_write on announcement_targets for all using (
  exists (select 1 from announcements a where a.id = announcement_targets.announcement_id and (a.author_id = auth.uid() or user_has_school_role(a.school_id, array['school_admin']::user_role[])))
);

create or replace function can_access_message(p_message_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from messages m
    where m.id = p_message_id
      and (
        is_super_admin()
        or user_has_school_role(m.school_id, array['school_admin']::user_role[])
        or m.sender_id = auth.uid()
        or exists (
          select 1
          from message_recipients r
          where r.message_id = m.id
            and r.recipient_id = auth.uid()
        )
      )
  );
$$;

create or replace function can_access_message_recipient(p_message_id uuid, p_recipient_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from messages m
    where m.id = p_message_id
      and (
        is_super_admin()
        or user_has_school_role(m.school_id, array['school_admin']::user_role[])
        or m.sender_id = auth.uid()
        or p_recipient_id = auth.uid()
      )
  );
$$;

create or replace function can_insert_message(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and p_school_id is not null
    and (
      public.is_super_admin()
      or exists (
        select 1
        from public.user_school_roles usr
        where usr.user_id = auth.uid()
          and usr.school_id = p_school_id
          and usr.is_active
          and usr.role = any(array['school_admin','teacher','student','parent']::public.user_role[])
      )
    );
$$;

create or replace function send_private_message(
  p_school_id uuid,
  p_recipient_id uuid,
  p_subject text default null,
  p_body text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_school_id is null then
    raise exception 'school is required';
  end if;

  if p_recipient_id is null then
    raise exception 'recipient is required';
  end if;

  if coalesce(btrim(p_body), '') = '' then
    raise exception 'message body is required';
  end if;

  if not public.can_insert_message(p_school_id) then
    raise exception 'not authorized to send messages in this school';
  end if;

  if not exists (
    select 1
    from public.user_school_roles usr
    where usr.user_id = p_recipient_id
      and usr.school_id = p_school_id
      and usr.is_active
  ) then
    raise exception 'recipient does not belong to this school';
  end if;

  insert into public.messages (school_id, sender_id, subject, body)
  values (
    p_school_id,
    auth.uid(),
    nullif(btrim(p_subject), ''),
    btrim(p_body)
  )
  returning * into v_message;

  insert into public.message_recipients (message_id, recipient_id)
  values (v_message.id, p_recipient_id);

  return v_message;
end;
$$;

revoke all on function public.send_private_message(uuid, uuid, text, text) from public;
grant execute on function public.send_private_message(uuid, uuid, text, text) to authenticated;
grant execute on function public.send_private_message(uuid, uuid, text, text) to service_role;

-- messages: school admins can review all school messages; others see sent or received only
create policy msg_select on messages for select using (
  (deleted_at is null or is_super_admin()) and can_access_message(id)
);
create policy msg_insert on messages for insert with check (
  can_insert_message(school_id)
);
create policy mr_select on message_recipients for select using (
  can_access_message_recipient(message_id, recipient_id)
);
create policy mr_insert on message_recipients for insert with check (
  can_access_message_recipient(message_id, recipient_id)
);
create policy mr_update on message_recipients for update using ( recipient_id = auth.uid() );

-- parent-student links: admin manages; parent/student view own
create policy psl_select on parent_student_links for select using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
  or parent_id = auth.uid() or student_id = auth.uid()
);
create policy psl_write on parent_student_links for all using ( user_has_school_role(school_id, array['school_admin']::user_role[]) );

-- audit logs: super admin only; school admin can see own school's logs
create policy audit_select on audit_logs for select using (
  is_super_admin() or (school_id is not null and user_has_school_role(school_id, array['school_admin']::user_role[]))
);
create policy audit_insert on audit_logs for insert with check ( true ); -- inserted by triggers/edge functions (security definer)

-- notifications: recipient only
create policy notif_select on notifications for select using ( recipient_id = auth.uid() );

-- student documents: admin full; student/parent can read own
create policy sd_select on student_documents for select using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
  or student_id = auth.uid()
  or is_parent_of_student(student_id)
);
create policy sd_write on student_documents for all using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
) with check (
  user_has_school_role(school_id, array['school_admin']::user_role[])
);

-- platform settings: super admin only
create policy ps_select on platform_settings for select using ( is_super_admin() );
create policy ps_write on platform_settings for all using ( is_super_admin() ) with check ( is_super_admin() );

-- teacher attendance: admin full; teacher sees/edits own record only
create policy tar_select on teacher_attendance_records for select using (
  user_has_school_role(school_id, array['school_admin']::user_role[]) or teacher_id = auth.uid()
);
create policy tar_write on teacher_attendance_records for all using (
  user_has_school_role(school_id, array['school_admin']::user_role[])
) with check (
  user_has_school_role(school_id, array['school_admin']::user_role[])
);

-- device tokens: user manages their own only
create policy dt_all on device_tokens for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- public landing-page demo leads: anyone can submit; super admin can review later
create policy school_demo_requests_insert on school_demo_requests for insert with check ( true );
create policy school_demo_requests_select on school_demo_requests for select using ( is_super_admin() );

-- =====================================================================
-- 10. TRIGGERS
-- =====================================================================

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function set_message_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;
  return new;
end $$;

create trigger trg_schools_updated before update on schools for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_lessons_updated before update on lessons for each row execute function set_updated_at();
create trigger trg_school_subs_updated before update on school_subscriptions for each row execute function set_updated_at();
create trigger trg_set_message_sender before insert on messages for each row execute function set_message_sender();

-- Auto-grade MCQ homework answers on insert
create or replace function grade_homework_answer() returns trigger language plpgsql as $$
begin
  new.is_correct := exists (
    select 1 from homework_choices c
    where c.id = new.selected_choice_id and c.question_id = new.question_id and c.is_correct
  );
  return new;
end $$;
create trigger trg_grade_homework_answer before insert or update on homework_answers
  for each row execute function grade_homework_answer();

create or replace function grade_test_answer() returns trigger language plpgsql as $$
begin
  new.is_correct := exists (
    select 1 from test_choices c
    where c.id = new.selected_choice_id and c.question_id = new.question_id and c.is_correct
  );
  return new;
end $$;
create trigger trg_grade_test_answer before insert or update on test_answers
  for each row execute function grade_test_answer();

-- Roll up homework score once all answers are graded/submission finalized
create or replace function compute_homework_score() returns trigger language plpgsql as $$
declare
  total int;
  correct int;
begin
  select count(*) into total from homework_questions where homework_id = (select homework_id from homework_submissions where id = new.submission_id);
  select count(*) into correct from homework_answers where submission_id = new.submission_id and is_correct;
  update homework_submissions
    set score = case when total > 0 then round(100.0 * correct / total, 2) else null end,
        graded_at = now()
    where id = new.submission_id;
  return new;
end $$;
create trigger trg_compute_homework_score after insert or update on homework_answers
  for each row execute function compute_homework_score();

-- Lock final_grades once approved: block any further update
create or replace function lock_final_grade() returns trigger language plpgsql as $$
begin
  if old.status = 'approved' and new.status = 'approved' then
    raise exception 'final grade already approved and locked';
  end if;
  if new.status = 'approved' and old.status <> 'approved' then
    new.approved_at := now();
  end if;
  return new;
end $$;
create trigger trg_lock_final_grade before update on final_grades
  for each row execute function lock_final_grade();

-- Enforce subscription seat limits (max_students) before enrolling a new student
create or replace function check_student_quota() returns trigger language plpgsql as $$
declare
  v_max int;
  v_count int;
begin
  select sp.max_students into v_max
  from school_subscriptions ss join subscription_plans sp on sp.id = ss.plan_id
  where ss.school_id = new.school_id and ss.status in ('trialing','active')
  order by ss.created_at desc limit 1;

  if v_max is not null then
    select count(distinct student_id) into v_count from class_enrollments where school_id = new.school_id;
    if v_count >= v_max then
      raise exception 'student quota (%) reached for this school''s plan', v_max;
    end if;
  end if;
  return new;
end $$;
create trigger trg_check_student_quota before insert on class_enrollments
  for each row execute function check_student_quota();

-- Enforce "students cannot message parents directly" (the one documented
-- restriction on an otherwise open messaging system).
create or replace function check_message_recipient_rule() returns trigger language plpgsql as $$
declare
  v_sender_role user_role;
  v_recipient_role user_role;
  v_school_id uuid;
begin
  select m.school_id into v_school_id from messages m where m.id = new.message_id;

  select role into v_sender_role from user_school_roles usr
    join messages m on m.school_id = usr.school_id
    where m.id = new.message_id and usr.user_id = m.sender_id limit 1;

  select role into v_recipient_role from user_school_roles usr
    where usr.school_id = v_school_id and usr.user_id = new.recipient_id limit 1;

  if v_sender_role = 'student' and v_recipient_role = 'parent' then
    raise exception 'students cannot message parents directly';
  end if;

  return new;
end $$;
create trigger trg_check_message_recipient before insert on message_recipients
  for each row execute function check_message_recipient_rule();

-- Enforce announcement scope by author role: Admin -> school-wide/grade/class/role,
-- Teacher -> class-specific only, and only for classes they actually teach.
create or replace function check_announcement_target_scope() returns trigger language plpgsql as $$
declare
  v_author_id uuid;
  v_school_id uuid;
  v_is_admin boolean;
begin
  select a.author_id, a.school_id into v_author_id, v_school_id
  from announcements a where a.id = new.announcement_id;

  select exists (
    select 1
    from user_school_roles usr
    where usr.user_id = v_author_id
      and usr.is_active
      and (
        (usr.role = 'super_admin' and usr.school_id is null)
        or (usr.role = 'school_admin' and usr.school_id = v_school_id)
      )
  ) into v_is_admin;

  if not v_is_admin then
    if new.target_type <> 'class' then
      raise exception 'teachers may only target announcements at a specific class';
    end if;
    if not exists (
      select 1 from teacher_subject_assignments tsa
      where tsa.teacher_id = v_author_id and tsa.class_id = new.target_id
    ) then
      raise exception 'teachers may only target classes they are assigned to';
    end if;
  end if;

  return new;
end $$;
create trigger trg_check_announcement_scope before insert on announcement_targets
  for each row execute function check_announcement_target_scope();

-- Prevent one teacher from being assigned to two classes in the same slot.
create or replace function check_teacher_timetable_conflict() returns trigger language plpgsql as $$
begin
  if exists (
    select 1
    from timetable_entries existing_entry
    where existing_entry.school_id = new.school_id
      and existing_entry.teacher_id = new.teacher_id
      and existing_entry.working_day_id = new.working_day_id
      and existing_entry.time_slot_id = new.time_slot_id
      and existing_entry.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'teacher already has another timetable entry in this day and time slot';
  end if;

  return new;
end $$;
create trigger trg_check_teacher_timetable_conflict before insert or update on timetable_entries
  for each row execute function check_teacher_timetable_conflict();

-- =====================================================================
-- 11. MATERIALIZED VIEWS (dashboards & Super Admin "Platform Analytics")
-- Refresh these on a schedule via the dispatch/cron Edge Function:
--   refresh materialized view concurrently mv_name;
-- =====================================================================

create materialized view mv_class_attendance_summary as
select
  ar.school_id,
  l.class_id,
  count(*) filter (where ar.status = 'present') as present_count,
  count(*) filter (where ar.status = 'absent')  as absent_count,
  count(*) filter (where ar.status = 'late')    as late_count,
  count(*) filter (where ar.status = 'excused') as excused_count,
  count(*) as total_count,
  round(100.0 * count(*) filter (where ar.status = 'present') / nullif(count(*), 0), 2) as attendance_pct
from attendance_records ar
join lessons l on l.id = ar.lesson_id
group by ar.school_id, l.class_id;
create unique index uq_mv_cas on mv_class_attendance_summary(school_id, class_id);

create materialized view mv_student_grade_summary as
select
  fg.school_id,
  fg.student_id,
  fg.academic_year_id,
  round(avg(fg.grade_value), 2) as average_grade,
  count(*) as subjects_graded
from final_grades fg
where fg.status = 'approved' and fg.deleted_at is null
group by fg.school_id, fg.student_id, fg.academic_year_id;
create unique index uq_mv_sgs on mv_student_grade_summary(school_id, student_id, academic_year_id);

-- Super Admin "Platform Analytics — usage & performance metrics"
create materialized view mv_school_usage_stats as
select
  s.id as school_id,
  s.name as school_name,
  s.is_active,
  count(distinct usr.user_id) filter (where usr.role = 'student') as student_count,
  count(distinct usr.user_id) filter (where usr.role = 'teacher') as teacher_count,
  count(distinct usr.user_id) filter (where usr.role = 'parent')  as parent_count,
  count(distinct c.id) as class_count,
  (select ss.status from school_subscriptions ss where ss.school_id = s.id order by ss.created_at desc limit 1) as subscription_status,
  greatest(
    coalesce((select max(l.created_at) from lessons l where l.school_id = s.id), s.created_at),
    coalesce((select max(m.created_at) from messages m where m.school_id = s.id), s.created_at)
  ) as last_activity_at
from schools s
left join user_school_roles usr on usr.school_id = s.id and usr.is_active
left join classes c on c.school_id = s.id
group by s.id, s.name, s.is_active;
create unique index uq_mv_sus on mv_school_usage_stats(school_id);

-- RLS doesn't apply to materialized views directly; gate access via a
-- security-barrier view or by only exposing them through an Edge Function /
-- RPC that checks is_super_admin() / user_has_school_role() first.
create or replace function get_school_usage_stats(p_school_id uuid default null)
returns setof mv_school_usage_stats
language plpgsql security definer stable as $$
begin
  if p_school_id is not null and not user_has_school_role(p_school_id, array['school_admin']::user_role[]) then
    raise exception 'not authorized for this school';
  end if;
  if p_school_id is null and not is_super_admin() then
    raise exception 'super admin only';
  end if;
  return query select * from mv_school_usage_stats
    where p_school_id is null or school_id = p_school_id;
end $$;

-- =====================================================================
-- 12. GENERIC AUDIT TRIGGER (Export/Delete actions require an audit trail)
-- =====================================================================

create or replace function audit_row_change() returns trigger language plpgsql security definer as $$
declare
  v_school_id uuid;
begin
  begin
    v_school_id := coalesce(NEW.school_id, OLD.school_id);
  exception when undefined_column then
    v_school_id := null;
  end;

  insert into audit_logs (school_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_school_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  return coalesce(NEW, OLD);
end $$;

-- Attach to the tables where deletes/approvals are sensitive enough to need
-- a trail (soft-deletes still fire as UPDATEs, which this also captures).
create trigger trg_audit_schools after update or delete on schools for each row execute function audit_row_change();
create trigger trg_audit_final_grades after update or delete on final_grades for each row execute function audit_row_change();
create trigger trg_audit_user_school_roles after insert or update or delete on user_school_roles for each row execute function audit_row_change();

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
