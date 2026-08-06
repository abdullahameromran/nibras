// supabase/functions/bootstrap-super-admin/index.ts
//
// One-time project bootstrap for the very first platform owner.
//
// Why this exists:
// - A brand-new project may have zero `super_admin` role rows.
// - In that state, the normal admin UI cannot be reached because every
//   privileged path already expects a role assignment.
// - This function safely grants the caller the initial `super_admin`
//   role only when no active super admin exists yet.
//
// Deploy: supabase functions deploy bootstrap-super-admin
// Call:   POST /functions/v1/bootstrap-super-admin
//         Authorization: Bearer <signed-in user's JWT>
//         { "first_name": "...", "last_name": "..." }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return json({ error: "Not authenticated" }, 401);
    }

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const caller = callerData.user;

    const { data: existingSuperAdmins, error: countErr } = await admin
      .from("user_school_roles")
      .select("id,user_id", { count: "exact" })
      .is("school_id", null)
      .eq("role", "super_admin")
      .eq("is_active", true);

    if (countErr) {
      return json({ error: countErr.message }, 400);
    }

    const alreadySuperAdmin = (existingSuperAdmins ?? []).some((row) => row.user_id === caller.id);
    const initialized = (existingSuperAdmins?.length ?? 0) > 0;
    const bootstrapStatus = {
      initialized,
      can_bootstrap: !initialized || alreadySuperAdmin,
      message:
        initialized && !alreadySuperAdmin
          ? "Project already initialized. Ask an existing admin to invite you."
          : "First-time setup is available for this account.",
    };

    if (req.method === "GET") {
      return json(bootstrapStatus, 200);
    }

    if (initialized && !alreadySuperAdmin) {
      return json({ error: bootstrapStatus.message }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const first_name = body?.first_name ?? caller.user_metadata?.first_name ?? null;
    const last_name = body?.last_name ?? caller.user_metadata?.last_name ?? null;

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: caller.id,
      email: caller.email ?? "",
      first_name,
      last_name,
      is_active: true,
    });
    if (profileErr) {
      return json({ error: profileErr.message }, 400);
    }

    const { data: existingRole, error: existingRoleErr } = await admin
      .from("user_school_roles")
      .select("id")
      .eq("user_id", caller.id)
      .is("school_id", null)
      .eq("role", "super_admin")
      .maybeSingle();

    if (existingRoleErr) {
      return json({ error: existingRoleErr.message }, 400);
    }

    const roleErr = existingRole
      ? (
          await admin
            .from("user_school_roles")
            .update({ is_active: true })
            .eq("id", existingRole.id)
        ).error
      : (
          await admin.from("user_school_roles").insert({
            user_id: caller.id,
            school_id: null,
            role: "super_admin",
            is_active: true,
          })
        ).error;

    if (roleErr) {
      return json({ error: roleErr.message }, 400);
    }

    const { error: auditErr } = await admin.from("audit_logs").insert({
      school_id: null,
      actor_id: caller.id,
      action: "bootstrap_super_admin",
      entity_type: "user_school_roles",
      entity_id: null,
      metadata: { email: caller.email },
    });
    if (auditErr) {
      console.error("bootstrap-super-admin audit insert failed", auditErr);
    }

    return json({ status: "ok", role: "super_admin", user_id: caller.id }, 200);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
