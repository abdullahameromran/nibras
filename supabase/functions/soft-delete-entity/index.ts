// supabase/functions/soft-delete-entity/index.ts
//
// The permission matrix requires: "Delete Records — Super Admin only,
// soft delete preferred, audit log required." Client apps never issue a
// raw DELETE — everything routes through here so the audit log and the
// role check can never be bypassed.
//
// Deploy: supabase functions deploy soft-delete-entity
// Call:   POST /functions/v1/soft-delete-entity
//         Authorization: Bearer <super admin's JWT>
//         { "table": "lessons", "id": "...", "hard": false }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Explicit allow-list — only tables that actually have a deleted_at column.
const SOFT_DELETABLE = new Set([
  "schools", "lessons", "homework", "monthly_tests", "final_grades", "announcements", "messages",
]);

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerData?.user) return json({ error: "Not authenticated" }, 401);
    const callerId = callerData.user.id;

    const { data: superRow } = await admin
      .from("user_school_roles")
      .select("role")
      .eq("user_id", callerId)
      .is("school_id", null)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!superRow) return json({ error: "super admin only" }, 403);

    const { table, id, hard = false } = await req.json();
    if (!table || !id) return json({ error: "table and id are required" }, 400);
    if (!SOFT_DELETABLE.has(table)) return json({ error: `table not in delete allow-list: ${table}` }, 400);

    const { data: existing } = await admin.from(table).select("*").eq("id", id).maybeSingle();
    if (!existing) return json({ error: "record not found" }, 404);

    // Audit log BEFORE the delete, capturing a full snapshot for recovery.
    await admin.from("audit_logs").insert({
      school_id: existing.school_id ?? null,
      actor_id: callerId,
      action: hard ? "hard_delete" : "soft_delete",
      entity_type: table,
      entity_id: id,
      metadata: { snapshot: existing },
    });

    if (hard) {
      const { error: delErr } = await admin.from(table).delete().eq("id", id);
      if (delErr) return json({ error: delErr.message }, 400);
    } else {
      const { error: updErr } = await admin
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (updErr) return json({ error: updErr.message }, 400);
    }

    return json({ status: hard ? "hard_deleted" : "soft_deleted", table, id }, 200);
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
