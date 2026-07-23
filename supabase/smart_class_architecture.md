# Smart Class — Supabase Architecture Guide

Companion to:
- `smart_class_schema.sql` — full DB schema, RLS, triggers, materialized views
- `smart_class_storage_policies.sql` — Storage buckets + RLS on `storage.objects`
- `smart_class_seed.sql` — starter subscription plans + platform settings
- `edge-functions/` — working Deno code for every function that genuinely needs server-side privileges

Covers *why* things are shaped this way, which parts need Edge Functions vs. plain Postgres, storage layout, and how to keep this scalable as school count grows.

---

## 1. Multi-tenancy model

- Every tenant-owned row carries `school_id`. There is no schema-per-tenant or database-per-tenant split — one shared schema, isolated purely by RLS. This is the right call at your scale (many small-to-medium schools) because it keeps migrations, backups, and connection pooling simple.
- A user is **global** (`profiles`, backed by `auth.users`) but can hold **different roles in different schools** via `user_school_roles`. A person can be a Teacher at School A and a Parent at School B with the same login.
- `super_admin` rows have `school_id = NULL` — they're platform-level, not scoped to a tenant.
- RLS never uses session/config variables (`set_config`) to track "current school." Instead every policy does a live `EXISTS` check against `user_school_roles` using `auth.uid()`. This matters because Supabase's connection pooler (Supavisor/pgbouncer) runs in **transaction mode**, where session-level state doesn't reliably survive between statements. Stateless RLS checks are the only pattern that's safe there.

## 2. RBAC ↔ your permission matrix

The `user_has_school_role(school_id, roles[])`, `is_teacher_of_class()`, and `is_parent_of_student()` helper functions map directly onto the rows of your permission matrix board:

| Matrix concept | Schema mechanism |
|---|---|
| "Teacher — View Assigned" | `teacher_subject_assignments` + `is_teacher_of_class()` |
| "Parent — Child View only" | `parent_student_links` + `is_parent_of_student()` |
| "Approve Final Grades — School Admin only, cannot modify after approval" | `final_grades.status` enum + `lock_final_grade()` trigger that raises an exception on any update once `status = 'approved'` |
| "Delete Records — Super Admin only, soft delete preferred" | No hard `ON DELETE` cascades from admin actions; add an `is_deleted`/`deleted_at` column where you want soft-delete, and route actual deletes through an Edge Function that writes to `audit_logs` first |
| "Export Data — audit log required" | Never let the client query+download directly for bulk export; route through an Edge Function that logs to `audit_logs` before returning the file |
| "Students cannot message parents directly" | Enforced by `check_message_recipient_rule()`, a `before insert` trigger on `message_recipients` that blocks the specific student→parent case |
| "Teacher → class-specific announcements only" / "Admin → school-wide" | Enforced by `check_announcement_target_scope()`, a `before insert` trigger on `announcement_targets` |
| Settings module (per-role) | `schools.settings` (jsonb) for School Admin config, `platform_settings` table for Super Admin, `profiles.notification_preferences` (jsonb) for personal settings |
| Student academic status (active/graduated/transferred...) | `class_enrollments.status` (`student_academic_status` enum) |
| Student files/documents | `student_documents` table |
| Final exams vs. monthly tests | `monthly_tests.kind` (`exam_type`: `'monthly'` \| `'final'`) — same table, same grading pipeline, distinguished by type |

## 3. What needs an Edge Function vs. a DB trigger

Rule of thumb: **if the logic only touches Postgres data, it's a trigger or a `security definer` SQL function — not an Edge Function.** Edge Functions are for things that need the *service role key* (to bypass RLS deliberately), an *external API call*, or *scheduled/webhook* triggers.

Already handled as pure Postgres (no Edge Function needed):
- MCQ auto-grading (`grade_homework_answer`, `grade_test_answer`, `compute_homework_score`)
- Final grade locking after approval
- Student quota enforcement against the subscription plan
- `updated_at` maintenance

### Edge Functions — all of these are now implemented in `edge-functions/`

| Function | Why it must be an Edge Function | Trigger | Status |
|---|---|---|---|
| `provision-school` | Creates a school + first School Admin auth user + subscription row in one transaction; needs the Admin API (service role) | Called from Super Admin UI | ✅ implemented |
| `invite-user` | Creates/invites an `auth.users` account via the Admin API, then inserts `user_school_roles` | Called from School Admin UI | ✅ implemented |
| `export-data` | Generates a CSV for the "Export Data" permission; writes `audit_logs` *before* returning the file | Called from any "Export" button | ✅ implemented |
| `soft-delete-entity` | Executes Super-Admin-only soft/hard deletes with mandatory audit logging via an explicit table allow-list | Called from Super Admin UI | ✅ implemented |
| `send-announcement` | Resolves `announcement_targets` (school/grade/class/role) into a recipient list and queues `notifications` rows | Call after publish, or wire as a DB Webhook on `announcements` | ✅ implemented |
| `dispatch-notifications` | Drains `notifications` (`status = 'pending'`) and sends push (FCM) / email (Resend) | Supabase Cron, every 1–2 min | ✅ implemented |
| `billing-webhook` | Verifies the Stripe signature and updates `school_subscriptions.status` | Stripe webhook | ✅ implemented (Stripe; swap provider as needed) |
| `bulk-import-students` | CSV import with per-row validation, many auth users at once | Called from School Admin UI | Not yet written — same pattern as `invite-user`, looped |
| `finalize-report-cards` | Renders a PDF per student once grades are approved, uploads to the `report-cards` bucket | On-demand, or DB Webhook when `final_grades.status` → `approved` | Not yet written — needs a PDF rendering library choice (e.g. an external HTML-to-PDF API) before implementing |
| `deactivate-expired-schools` | Nightly sweep: suspends schools whose subscription lapsed | Supabase Cron, daily | Not yet written — few lines, same admin-client pattern as the others |

The last three are the only pieces left as descriptions rather than code — they either need a product decision (which PDF renderer, exact CSV format for bulk import) or are a trivial variation of a function already written. Say the word and I'll write any of them out fully.

Everything else — reading the timetable, submitting homework, viewing grades, posting a message between allowed roles — goes **straight from the client to Postgres through RLS**, no Edge Function in the path.

## 3a. New tables added in this pass

| Table | Covers |
|---|---|
| `teacher_attendance_records` | Teacher attendance (doc 1 flagged this as a possible later phase — included now) |
| `device_tokens` | Push notification tokens, consumed by `dispatch-notifications` |
| `student_documents` | "ملفات الطلاب" — student file/document storage metadata |
| `platform_settings` | Super Admin "Full System Config" |
| `schools.settings` (jsonb) | School Admin "Settings" module |
| `profiles.notification_preferences` (jsonb) | Personal "Settings" for Teacher/Student/Parent |
| `mv_class_attendance_summary`, `mv_student_grade_summary`, `mv_school_usage_stats` | Dashboard stats + Super Admin "Platform Analytics" |
| `audit_row_change()` trigger on `schools`, `final_grades`, `user_school_roles` | Automatic audit trail on top of the manual logging inside Edge Functions |
| `deleted_at` on `schools`, `lessons`, `homework`, `monthly_tests`, `final_grades`, `announcements`, `messages` | Soft-delete, enforced in the corresponding SELECT policies |

## 4. Storage buckets

Use Supabase Storage, not a table, for actual file bytes — the DB tables (`lesson_attachments`, `profiles.avatar_url`, `schools.logo_url`) store just the path/URL.

| Bucket | Contents | RLS mirrors |
|---|---|---|
| `school-logos` | School branding | Public read, School-Admin/Super-Admin write |
| `avatars` | User profile photos | Public read (or school-scoped), owner write |
| `lesson-attachments` | PDFs, videos, slides for lessons | Same visibility as the parent `lessons` row (teacher + enrolled class + admin) |
| `homework-submissions` | If you later allow file-upload homework (not just MCQ) | Student (own) + teacher (assigned) + admin |
| `report-cards` | Generated PDF report cards | Student/parent (own), school admin |

Mirror the Postgres RLS logic in Storage policies (Storage RLS runs against `storage.objects`, keyed by bucket + path prefix — put `school_id` and `student_id` in the object path so policies can pattern-match on it, e.g. `lesson-attachments/{school_id}/{lesson_id}/{filename}`).

## 5. Scalability notes

- **Indexing**: every tenant table already has `school_id` indexed (needed both for RLS performance and for everyday tenant-scoped queries). Foreign keys used heavily in RLS subqueries (`teacher_id`, `student_id`, `class_id`) also have indexes.
- **RLS cost**: the `EXISTS` pattern against `user_school_roles` is cheap because that table is small and indexed on `(user_id)` and `(school_id, role)` — it won't scan large tables.
- **Read-heavy dashboards**: don't compute attendance %, grade averages, etc. live on every dashboard load. Build materialized views (e.g. `mv_class_attendance_summary`) refreshed by a scheduled Edge Function / `pg_cron` job every few minutes, and have the dashboard read from the view.
- **Realtime**: only enable Supabase Realtime on tables that actually need live updates — `messages`, `message_recipients`, `notifications`. Turning it on for every table adds replication overhead you don't need.
- **Connection pooling**: use the pooled connection string (port 6543 / Supavisor transaction mode) from your app backend; use the direct connection only for migrations. This is exactly why RLS here avoids session variables.
- **Partitioning**: not needed at MVP scale. If a single school-chain grows to millions of `attendance_records` or `messages` rows, consider partitioning those two tables by `school_id` range or by month — but don't build this prematurely.
- **Quota enforcement**: `check_student_quota()` stops a school from silently over-enrolling past its plan — enforce the same pattern for `max_teachers` if you add a teacher-quota column.
- **Soft delete over hard delete**: for `lessons`, `announcements`, `final_grades`, etc., prefer adding `deleted_at timestamptz` and filtering it out in RLS/select rather than `ON DELETE CASCADE` chains — matches your matrix's "soft delete preferred" note and keeps audit trails intact.

## 6. What's deliberately *not* in the MVP

Per your own project overview: accounting, school transport, library management, and online proctored exams are explicitly out of scope for v1. The schema doesn't include tables for these — adding them later is additive (new tables + new RLS policies), not a restructure, because the core tenancy/RBAC layer (`schools`, `user_school_roles`, helper functions) doesn't change.
