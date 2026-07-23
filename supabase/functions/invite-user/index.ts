// supabase/functions/invite-user/index.ts
//
// Creates (or invites) a new user and assigns them a role in a school.
// Must run server-side: uses the service role key to call the Admin API,
// which the client can never hold.
//
// Deploy:  supabase functions deploy invite-user
// Call:    POST /functions/v1/invite-user
//          Authorization: Bearer <caller's user JWT>
//          { "school_id": "...", "email": "...", "role": "teacher",
//            "first_name": "...", "last_name": "..." }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerData?.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const callerId = callerData.user.id;

    const body = await req.json();
    const { school_id, email, role, first_name, last_name } = body;
    if (!school_id || !email || !role) {
      return json({ error: "school_id, email, and role are required" }, 400);
    }
    if (!["school_admin", "teacher", "student", "parent"].includes(role)) {
      return json({ error: "invalid role for invite-user (super_admin uses provision-school)" }, 400);
    }

    // Authorize: caller must be school_admin of this school (or super_admin)
    const { data: allowed } = await admin.rpc("user_has_school_role", {
      p_school_id: school_id,
      p_roles: ["school_admin"],
    });
    if (!allowed) {
      // fall back check done inside DB function already accounts for super_admin,
      // but rpc() runs as the service role, so check membership explicitly instead:
      const { data: role_row } = await admin
        .from("user_school_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("school_id", school_id)
        .eq("role", "school_admin")
        .maybeSingle();
      const { data: superRow } = await admin
        .from("user_school_roles")
        .select("role")
        .eq("user_id", callerId)
        .is("school_id", null)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!role_row && !superRow) {
        return json({ error: "not authorized to invite users to this school" }, 403);
      }
    }

    // Create (or fetch existing) auth user and send an invite email
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name },
    });

    let userId: string;
    if (inviteErr) {
      // Most common failure: user already exists — look them up instead of failing.
      const { data: existing } = await admin.auth.admin.listUsers({ email });
      const found = existing?.users?.find((u) => u.email === email);
      if (!found) return json({ error: inviteErr.message }, 400);
      userId = found.id;
    } else {
      userId = invited.user!.id;
    }

    // Ensure a profile row exists
    await admin.from("profiles").upsert({
      id: userId,
      email,
      first_name,
      last_name,
    });

    // Assign the role (idempotent thanks to the unique constraint)
    const { error: roleErr } = await admin
      .from("user_school_roles")
      .upsert(
        { user_id: userId, school_id, role, is_active: true },
        { onConflict: "user_id,school_id,role" },
      );
    if (roleErr) return json({ error: roleErr.message }, 400);

    await admin.from("audit_logs").insert({
      school_id,
      actor_id: callerId,
      action: "invite_user",
      entity_type: "profiles",
      entity_id: userId,
      metadata: { email, role },
    });

    return json({ user_id: userId, status: "invited" }, 200);
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
