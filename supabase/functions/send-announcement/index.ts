// supabase/functions/send-announcement/index.ts
//
// Triggered after an announcement is published. Resolves announcement_targets
// (school-wide / grade_level / class / role) into an actual list of
// profile ids, then writes one `notifications` row per recipient.
// The actual push/email send is left to dispatch-notifications, which
// drains that queue — keeps this function fast and idempotent.
//
// Deploy:      supabase functions deploy send-announcement
// Recommended: wire as a Database Webhook on `announcements`
//              (UPDATE, when is_published changes to true)
//              or call directly after the admin/teacher publish action.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { announcement_id } = await req.json();
    if (!announcement_id) return json({ error: "announcement_id is required" }, 400);

    const { data: announcement, error: annErr } = await admin
      .from("announcements")
      .select("id, school_id, title, body, is_published")
      .eq("id", announcement_id)
      .maybeSingle();
    if (annErr || !announcement) return json({ error: "announcement not found" }, 404);
    if (!announcement.is_published) return json({ error: "announcement is not published" }, 400);

    const { data: targets } = await admin
      .from("announcement_targets")
      .select("target_type, target_id, target_role")
      .eq("announcement_id", announcement_id);

    const recipientIds = new Set<string>();

    for (const t of targets ?? []) {
      if (t.target_type === "school") {
        const { data: members } = await admin
          .from("user_school_roles")
          .select("user_id")
          .eq("school_id", announcement.school_id)
          .eq("is_active", true);
        members?.forEach((m) => recipientIds.add(m.user_id));
      } else if (t.target_type === "role") {
        const { data: members } = await admin
          .from("user_school_roles")
          .select("user_id")
          .eq("school_id", announcement.school_id)
          .eq("role", t.target_role)
          .eq("is_active", true);
        members?.forEach((m) => recipientIds.add(m.user_id));
      } else if (t.target_type === "grade_level") {
        const { data: students } = await admin
          .from("class_enrollments")
          .select("student_id, classes!inner(grade_level_id)")
          .eq("classes.grade_level_id", t.target_id);
        for (const s of students ?? []) {
          recipientIds.add(s.student_id);
          const { data: parents } = await admin
            .from("parent_student_links")
            .select("parent_id")
            .eq("student_id", s.student_id);
          parents?.forEach((p) => recipientIds.add(p.parent_id));
        }
      } else if (t.target_type === "class") {
        const { data: students } = await admin
          .from("class_enrollments")
          .select("student_id")
          .eq("class_id", t.target_id);
        for (const s of students ?? []) {
          recipientIds.add(s.student_id);
          const { data: parents } = await admin
            .from("parent_student_links")
            .select("parent_id")
            .eq("student_id", s.student_id);
          parents?.forEach((p) => recipientIds.add(p.parent_id));
        }
      }
    }

    if (recipientIds.size === 0) return json({ status: "no recipients resolved" }, 200);

    const rows = Array.from(recipientIds).map((recipient_id) => ({
      school_id: announcement.school_id,
      recipient_id,
      channel: "push",
      title: announcement.title,
      body: announcement.body,
      payload: { announcement_id },
      status: "pending",
    }));

    const { error: insertErr } = await admin.from("notifications").insert(rows);
    if (insertErr) return json({ error: insertErr.message }, 400);

    return json({ status: "queued", recipients: rows.length }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}
