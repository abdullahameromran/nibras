-- Phase 3: action-level authorization, privacy, audited exports, billing
-- idempotency, scaling indexes, and post-MVP module groundwork.

-- ---------------------------------------------------------------------------
-- Reusable relationship checks. SECURITY DEFINER avoids recursive RLS while
-- every predicate still anchors access to auth.uid() and active role rows.
-- ---------------------------------------------------------------------------
create or replace function public.teacher_assigned_to(p_teacher_id uuid, p_school_id uuid, p_class_id uuid, p_subject_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from teacher_subject_assignments tsa
    join user_school_roles usr on usr.user_id=tsa.teacher_id and usr.school_id=tsa.school_id and usr.role='teacher' and usr.is_active
    join profiles p on p.id=tsa.teacher_id and p.is_active
    join schools s on s.id=tsa.school_id and s.is_active and s.deleted_at is null
    where tsa.teacher_id=p_teacher_id and tsa.school_id=p_school_id and tsa.subject_id=p_subject_id
      and (tsa.class_id=p_class_id or tsa.class_id is null)
  );
$$;

create or replace function public.can_view_student_record(p_student_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select p_student_id=auth.uid() or is_super_admin() or exists(
    select 1 from class_enrollments ce
    where ce.student_id=p_student_id and ce.status='active' and (
      user_has_school_role(ce.school_id,array['school_admin']::user_role[])
      or is_parent_of_student(p_student_id)
      or exists(select 1 from teacher_subject_assignments tsa where tsa.school_id=ce.school_id and tsa.class_id=ce.class_id and tsa.teacher_id=auth.uid())
    )
  );
$$;

create or replace function public.can_view_profile_phase3(p_profile_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select p_profile_id=auth.uid() or is_super_admin()
  or can_view_student_record(p_profile_id)
  or exists(
    select 1 from user_school_roles target
    where target.user_id=p_profile_id and target.is_active and target.role='teacher' and (
      user_has_school_role(target.school_id,array['school_admin']::user_role[])
      or exists(
        select 1 from teacher_subject_assignments tsa join class_enrollments ce on ce.class_id=tsa.class_id and ce.school_id=tsa.school_id and ce.status='active'
        where tsa.teacher_id=p_profile_id and tsa.school_id=target.school_id
          and (ce.student_id=auth.uid() or is_parent_of_student(ce.student_id))
      )
    )
  )
  or exists(
    select 1 from messages m left join message_recipients mr on mr.message_id=m.id
    where (m.sender_id=auth.uid() and mr.recipient_id=p_profile_id)
       or (m.sender_id=p_profile_id and mr.recipient_id=auth.uid())
  )
  or exists(
    select 1 from parent_student_links psl join class_enrollments ce on ce.student_id=psl.student_id and ce.school_id=psl.school_id and ce.status='active'
    where psl.parent_id=p_profile_id and exists(
      select 1 from teacher_subject_assignments tsa where tsa.school_id=ce.school_id and tsa.class_id=ce.class_id and tsa.teacher_id=auth.uid()
    )
  );
$$;

create or replace function public.can_view_announcement_phase3(p_announcement_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from announcements a where a.id=p_announcement_id and (a.deleted_at is null or is_super_admin()) and (
      is_super_admin() or user_has_school_role(a.school_id,array['school_admin']::user_role[]) or a.author_id=auth.uid()
      or (a.is_published and exists(
        select 1 from announcement_targets at where at.announcement_id=a.id and (
          (at.target_type='school' and user_has_school_role(a.school_id,array['teacher','student','parent']::user_role[]))
          or (at.target_type='role' and at.target_role is not null and user_has_school_role(a.school_id,array[at.target_role]::user_role[]))
          or (at.target_type='class' and at.target_id is not null and can_view_phase1_class(at.target_id))
          or (at.target_type='grade_level' and at.target_id is not null and exists(
            select 1 from classes c where c.school_id=a.school_id and c.grade_level_id=at.target_id and can_view_phase1_class(c.id)
          ))
        )
      ))
    )
  );
$$;

revoke all on function public.teacher_assigned_to(uuid,uuid,uuid,uuid) from public;
revoke all on function public.can_view_student_record(uuid) from public;
revoke all on function public.can_view_profile_phase3(uuid) from public;
revoke all on function public.can_view_announcement_phase3(uuid) from public;
grant execute on function public.teacher_assigned_to(uuid,uuid,uuid,uuid), public.can_view_student_record(uuid), public.can_view_profile_phase3(uuid), public.can_view_announcement_phase3(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Student/profile privacy.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_same_school on profiles;
drop policy if exists profiles_visible_via_enrollments on profiles;
drop policy if exists profiles_phase3_select on profiles;
create policy profiles_phase3_select on profiles for select to authenticated using (can_view_profile_phase3(id));

-- ---------------------------------------------------------------------------
-- Action-level teacher permissions and hard-delete restrictions.
-- ---------------------------------------------------------------------------
drop policy if exists lessons_write on lessons;
create policy lessons_insert on lessons for insert to authenticated with check (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or (teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id))
);
create policy lessons_update on lessons for update to authenticated using (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or (teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id))
) with check (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or (teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id))
);
create policy lessons_delete_super on lessons for delete to authenticated using (is_super_admin());

drop policy if exists hw_write on homework;
create policy hw_insert on homework for insert to authenticated with check (exists(
  select 1 from lessons l where l.id=homework.lesson_id and l.school_id=homework.school_id and (
    user_has_school_role(l.school_id,array['school_admin']::user_role[])
    or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id))
  )
));
create policy hw_update on homework for update to authenticated using (exists(
  select 1 from lessons l where l.id=homework.lesson_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or l.teacher_id=auth.uid())
)) with check (exists(
  select 1 from lessons l where l.id=homework.lesson_id and l.school_id=homework.school_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
));
create policy hw_delete_super on homework for delete to authenticated using (is_super_admin());

drop policy if exists mt_write on monthly_tests;
create policy mt_insert on monthly_tests for insert to authenticated with check (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or (teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id))
);
create policy mt_update on monthly_tests for update to authenticated using (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or (teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id))
) with check (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or (teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id))
);
create policy mt_delete_super on monthly_tests for delete to authenticated using (is_super_admin());

-- Child assessment content must inherit the exact authorization of its parent.
-- The original policies only checked that a parent row existed, which allowed
-- authenticated users to enumerate questions belonging to unrelated schools.
drop policy if exists hwq_select on homework_questions;
drop policy if exists hwq_write on homework_questions;
create policy hwq_select_phase3 on homework_questions for select to authenticated using (exists(
  select 1 from homework h where h.id=homework_questions.homework_id
));
create policy hwq_insert_phase3 on homework_questions for insert to authenticated with check (exists(
  select 1 from homework h join lessons l on l.id=h.lesson_id
  where h.id=homework_questions.homework_id and (
    user_has_school_role(l.school_id,array['school_admin']::user_role[])
    or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id))
  )
));
create policy hwq_update_phase3 on homework_questions for update to authenticated using (exists(
  select 1 from homework h join lessons l on l.id=h.lesson_id where h.id=homework_questions.homework_id
    and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
)) with check (exists(
  select 1 from homework h join lessons l on l.id=h.lesson_id where h.id=homework_questions.homework_id
    and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
));
create policy hwq_delete_super on homework_questions for delete to authenticated using (is_super_admin());

drop policy if exists hwc_select on homework_choices;
drop policy if exists hwc_write on homework_choices;
create policy hwc_select_phase3 on homework_choices for select to authenticated using (exists(
  select 1 from homework_questions q join homework h on h.id=q.homework_id where q.id=homework_choices.question_id
));
create policy hwc_insert_phase3 on homework_choices for insert to authenticated with check (exists(
  select 1 from homework_questions q join homework h on h.id=q.homework_id join lessons l on l.id=h.lesson_id
  where q.id=homework_choices.question_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
));
create policy hwc_update_phase3 on homework_choices for update to authenticated using (exists(
  select 1 from homework_questions q join homework h on h.id=q.homework_id join lessons l on l.id=h.lesson_id
  where q.id=homework_choices.question_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
)) with check (exists(
  select 1 from homework_questions q join homework h on h.id=q.homework_id join lessons l on l.id=h.lesson_id
  where q.id=homework_choices.question_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
));
create policy hwc_delete_super on homework_choices for delete to authenticated using (is_super_admin());

drop policy if exists tq_select on test_questions;
drop policy if exists tq_write on test_questions;
create policy tq_select_phase3 on test_questions for select to authenticated using (exists(select 1 from monthly_tests t where t.id=test_questions.test_id));
create policy tq_insert_phase3 on test_questions for insert to authenticated with check (exists(
  select 1 from monthly_tests t where t.id=test_questions.test_id and (user_has_school_role(t.school_id,array['school_admin']::user_role[]) or (t.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),t.school_id,t.class_id,t.subject_id)))
));
create policy tq_update_phase3 on test_questions for update to authenticated using (exists(
  select 1 from monthly_tests t where t.id=test_questions.test_id and (user_has_school_role(t.school_id,array['school_admin']::user_role[]) or (t.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),t.school_id,t.class_id,t.subject_id)))
)) with check (exists(
  select 1 from monthly_tests t where t.id=test_questions.test_id and (user_has_school_role(t.school_id,array['school_admin']::user_role[]) or (t.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),t.school_id,t.class_id,t.subject_id)))
));
create policy tq_delete_super on test_questions for delete to authenticated using (is_super_admin());

drop policy if exists tc_select on test_choices;
drop policy if exists tc_write on test_choices;
create policy tc_select_phase3 on test_choices for select to authenticated using (exists(select 1 from test_questions q join monthly_tests t on t.id=q.test_id where q.id=test_choices.question_id));
create policy tc_insert_phase3 on test_choices for insert to authenticated with check (exists(
  select 1 from test_questions q join monthly_tests t on t.id=q.test_id where q.id=test_choices.question_id and (user_has_school_role(t.school_id,array['school_admin']::user_role[]) or (t.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),t.school_id,t.class_id,t.subject_id)))
));
create policy tc_update_phase3 on test_choices for update to authenticated using (exists(
  select 1 from test_questions q join monthly_tests t on t.id=q.test_id where q.id=test_choices.question_id and (user_has_school_role(t.school_id,array['school_admin']::user_role[]) or (t.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),t.school_id,t.class_id,t.subject_id)))
)) with check (exists(
  select 1 from test_questions q join monthly_tests t on t.id=q.test_id where q.id=test_choices.question_id and (user_has_school_role(t.school_id,array['school_admin']::user_role[]) or (t.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),t.school_id,t.class_id,t.subject_id)))
));
create policy tc_delete_super on test_choices for delete to authenticated using (is_super_admin());

drop policy if exists la_write on lesson_attachments;
create policy la_insert_phase3 on lesson_attachments for insert to authenticated with check (exists(
  select 1 from lessons l where l.id=lesson_attachments.lesson_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
));
create policy la_update_phase3 on lesson_attachments for update to authenticated using (exists(
  select 1 from lessons l where l.id=lesson_attachments.lesson_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
)) with check (exists(
  select 1 from lessons l where l.id=lesson_attachments.lesson_id and (user_has_school_role(l.school_id,array['school_admin']::user_role[]) or (l.teacher_id=auth.uid() and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id)))
));
create policy la_delete_super on lesson_attachments for delete to authenticated using (is_super_admin());

drop policy if exists attendance_select on attendance_records;
drop policy if exists attendance_write on attendance_records;
create policy attendance_select_phase3 on attendance_records for select to authenticated using (
  is_super_admin() or user_has_school_role(school_id,array['school_admin']::user_role[]) or student_id=auth.uid() or is_parent_of_student(student_id)
  or exists(select 1 from lessons l where l.id=attendance_records.lesson_id and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id))
);
create policy attendance_insert_phase3 on attendance_records for insert to authenticated with check (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or exists(select 1 from lessons l where l.id=attendance_records.lesson_id and l.school_id=attendance_records.school_id and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id))
);
create policy attendance_update_phase3 on attendance_records for update to authenticated using (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or exists(select 1 from lessons l where l.id=attendance_records.lesson_id and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id))
) with check (
  user_has_school_role(school_id,array['school_admin']::user_role[])
  or exists(select 1 from lessons l where l.id=attendance_records.lesson_id and l.school_id=attendance_records.school_id and teacher_assigned_to(auth.uid(),l.school_id,l.class_id,l.subject_id))
);
create policy attendance_delete_super on attendance_records for delete to authenticated using (is_super_admin());

drop policy if exists hws_insert on homework_submissions;
create policy hws_insert_phase3 on homework_submissions for insert to authenticated with check (
  student_id=auth.uid() and exists(
    select 1 from homework h join lessons l on l.id=h.lesson_id join class_enrollments ce on ce.class_id=l.class_id and ce.school_id=l.school_id
    where h.id=homework_submissions.homework_id and ce.student_id=auth.uid() and ce.status='active'
  )
);
drop policy if exists tsub_insert on test_submissions;
create policy tsub_insert_phase3 on test_submissions for insert to authenticated with check (
  student_id=auth.uid() and exists(
    select 1 from monthly_tests t join class_enrollments ce on ce.class_id=t.class_id and ce.school_id=t.school_id
    where t.id=test_submissions.test_id and ce.student_id=auth.uid() and ce.status='active'
  )
);

drop policy if exists fg_teacher_write on final_grades;
drop policy if exists fg_admin_write on final_grades;
create policy fg_teacher_insert on final_grades for insert to authenticated with check (
  status<>'approved' and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id)
);
create policy fg_teacher_update on final_grades for update to authenticated using (
  status<>'approved' and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id)
) with check (status<>'approved' and teacher_assigned_to(auth.uid(),school_id,class_id,subject_id));
create policy fg_admin_insert on final_grades for insert to authenticated with check (user_has_school_role(school_id,array['school_admin']::user_role[]));
create policy fg_admin_update on final_grades for update to authenticated using (user_has_school_role(school_id,array['school_admin']::user_role[])) with check (user_has_school_role(school_id,array['school_admin']::user_role[]));
create policy fg_delete_super on final_grades for delete to authenticated using (is_super_admin());

-- ---------------------------------------------------------------------------
-- Announcement audience enforcement.
-- ---------------------------------------------------------------------------
drop policy if exists ann_select on announcements;
drop policy if exists ann_write on announcements;
create policy ann_select_phase3 on announcements for select to authenticated using (can_view_announcement_phase3(id));
create policy ann_insert_phase3 on announcements for insert to authenticated with check (
  author_id=auth.uid() and (user_has_school_role(school_id,array['school_admin','teacher']::user_role[]))
);
create policy ann_update_phase3 on announcements for update to authenticated using (
  user_has_school_role(school_id,array['school_admin']::user_role[]) or (author_id=auth.uid() and user_has_school_role(school_id,array['teacher']::user_role[]))
) with check (
  user_has_school_role(school_id,array['school_admin']::user_role[]) or (author_id=auth.uid() and user_has_school_role(school_id,array['teacher']::user_role[]))
);
create policy ann_delete_super on announcements for delete to authenticated using (is_super_admin());

drop policy if exists at_select on announcement_targets;
drop policy if exists at_write on announcement_targets;
create policy at_select_phase3 on announcement_targets for select to authenticated using (can_view_announcement_phase3(announcement_id));
create policy at_insert_phase3 on announcement_targets for insert to authenticated with check (exists(
  select 1 from announcements a where a.id=announcement_targets.announcement_id and (
    user_has_school_role(a.school_id,array['school_admin']::user_role[])
    or (a.author_id=auth.uid() and user_has_school_role(a.school_id,array['teacher']::user_role[])
      and announcement_targets.target_type='class' and announcement_targets.target_id is not null
      and is_teacher_of_class(announcement_targets.target_id))
  )
));
create policy at_update_phase3 on announcement_targets for update to authenticated using (exists(
  select 1 from announcements a where a.id=announcement_targets.announcement_id and user_has_school_role(a.school_id,array['school_admin']::user_role[])
)) with check (exists(
  select 1 from announcements a where a.id=announcement_targets.announcement_id and user_has_school_role(a.school_id,array['school_admin']::user_role[])
));
create policy at_delete_phase3 on announcement_targets for delete to authenticated using (exists(
  select 1 from announcements a where a.id=announcement_targets.announcement_id and (
    user_has_school_role(a.school_id,array['school_admin']::user_role[])
    or (a.author_id=auth.uid() and user_has_school_role(a.school_id,array['teacher']::user_role[]))
    or is_super_admin()
  )
));

-- ---------------------------------------------------------------------------
-- Prevent role escalation and forged audit events.
-- ---------------------------------------------------------------------------
drop policy if exists usr_write on user_school_roles;
create policy usr_insert_phase3 on user_school_roles for insert to authenticated with check (
  is_super_admin() or (school_id is not null and role in ('teacher','student','parent') and user_has_school_role(school_id,array['school_admin']::user_role[]))
);
create policy usr_update_phase3 on user_school_roles for update to authenticated using (
  is_super_admin() or (school_id is not null and role in ('teacher','student','parent') and user_has_school_role(school_id,array['school_admin']::user_role[]))
) with check (
  is_super_admin() or (school_id is not null and role in ('teacher','student','parent') and user_has_school_role(school_id,array['school_admin']::user_role[]))
);
create policy usr_delete_super on user_school_roles for delete to authenticated using (is_super_admin());

drop policy if exists audit_insert on audit_logs;
revoke insert,update,delete on audit_logs from anon,authenticated;

-- ---------------------------------------------------------------------------
-- Configurable export authorization. Edge Functions use service-role access,
-- while admins can inspect the effective rules.
-- ---------------------------------------------------------------------------
create table if not exists export_permissions(
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  role user_role not null,
  entity_type varchar(80) not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_export_permissions_scope on export_permissions(coalesce(school_id,'00000000-0000-0000-0000-000000000000'::uuid),role,entity_type);
alter table export_permissions enable row level security;
create policy export_permissions_select on export_permissions for select to authenticated using (
  is_super_admin() or (school_id is not null and user_has_school_role(school_id,array['school_admin']::user_role[]))
);
create policy export_permissions_write on export_permissions for all to authenticated using (is_super_admin()) with check (is_super_admin());
insert into export_permissions(school_id,role,entity_type,allowed) values
 (null,'super_admin','platform_analytics',true),(null,'super_admin','waitlist',true),
 (null,'super_admin','students',true),(null,'super_admin','attendance',true),(null,'super_admin','final_grades',true),
 (null,'school_admin','students',true),(null,'school_admin','attendance',true),(null,'school_admin','final_grades',true),
 (null,'teacher','test_results',true),(null,'teacher','final_grades',true)
on conflict do nothing;
grant select on export_permissions to authenticated;
grant insert,update,delete on export_permissions to authenticated;

-- Stripe webhook idempotency and a durable commercial audit trail.
create table if not exists billing_events(
  id text primary key,
  event_type text not null,
  external_subscription_id text,
  school_id uuid references schools(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  processing_error text
);
alter table billing_events enable row level security;
create policy billing_events_super_select on billing_events for select to authenticated using (is_super_admin());
grant select on billing_events to authenticated;

-- Architecture-only groundwork for future modules; no operational workflows.
create table if not exists roadmap_modules(
  module_key text primary key,
  display_name text not null,
  status text not null default 'planned' check(status in('planned','design','pilot','enabled')),
  schema_version integer not null default 1,
  architecture jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table roadmap_modules enable row level security;
create policy roadmap_modules_select on roadmap_modules for select to authenticated using (is_super_admin());
create policy roadmap_modules_write on roadmap_modules for all to authenticated using (is_super_admin()) with check (is_super_admin());
grant select,insert,update,delete on roadmap_modules to authenticated;
insert into roadmap_modules(module_key,display_name,architecture) values
 ('accounting_fees','Accounting / Fee Management','{"tenant_key":"school_id","planned_entities":["fee_structures","invoices","payments","discounts"],"integration":"billing-provider-neutral"}'),
 ('school_transport','School Transport Management','{"tenant_key":"school_id","planned_entities":["routes","vehicles","stops","student_assignments"]}'),
 ('library','Library Management','{"tenant_key":"school_id","planned_entities":["catalog_items","copies","loans","reservations"]}'),
 ('electronic_exams','Electronic Exams','{"tenant_key":"school_id","planned_entities":["question_banks","exam_versions","attempt_events","proctoring_events"],"extends":"monthly_tests"}')
on conflict(module_key) do update set display_name=excluded.display_name,architecture=excluded.architecture,updated_at=now();

-- High-cardinality query paths used by dashboards and relationship checks.
create index if not exists idx_usr_active_school_role_user on user_school_roles(school_id,role,user_id) where is_active;
create index if not exists idx_ce_active_class_student on class_enrollments(class_id,student_id) where status='active';
create index if not exists idx_tsa_scope_lookup on teacher_subject_assignments(school_id,class_id,subject_id,teacher_id);
create index if not exists idx_lessons_scope_date on lessons(school_id,class_id,subject_id,lesson_date desc) where deleted_at is null;
create index if not exists idx_attendance_student_recorded on attendance_records(student_id,recorded_at desc);
create index if not exists idx_homework_due_active on homework(school_id,due_date desc) where deleted_at is null;
create index if not exists idx_tests_date_active on monthly_tests(school_id,test_date desc) where deleted_at is null;
create index if not exists idx_final_grades_scope_status on final_grades(school_id,academic_year_id,class_id,subject_id,status) where deleted_at is null;
create index if not exists idx_messages_sender_created on messages(sender_id,created_at desc) where deleted_at is null;
create index if not exists idx_message_recipients_unread on message_recipients(recipient_id,message_id) where not is_read;
create index if not exists idx_announcements_published on announcements(school_id,published_at desc) where is_published and deleted_at is null;
create index if not exists idx_audit_actor_created on audit_logs(actor_id,created_at desc);
create index if not exists idx_audit_school_action_created on audit_logs(school_id,action,created_at desc);
create index if not exists idx_school_subscriptions_status on school_subscriptions(status,ends_at);
