// supabase/functions/provision-school/index.ts
//
// Super Admin only. Creates a school + its first School Admin account +
// an initial subscription row. Needs the service role to create an
// auth.users row and to bypass RLS for the initial insert (the school
// doesn't have any members yet, so no RLS policy would otherwise allow it).
//
// Deploy:  supabase functions deploy provision-school
// Call:    POST /functions/v1/provision-school
//          Authorization: Bearer <super admin's JWT>
//          { "school_name": "...", "slug": "...", "timezone": "Africa/Cairo",
//            "plan_id": "...", "admin_email": "...",
//            "admin_first_name": "...", "admin_last_name": "..." }

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

    const body = await req.json();
    const {
      school_name, slug, timezone = "UTC", plan_id,
      admin_email, admin_first_name, admin_last_name,
    } = body;
    if (!school_name || !plan_id || !admin_email) {
      return json({ error: "school_name, plan_id, and admin_email are required" }, 400);
    }

    const requestedSlug = typeof slug === "string" ? slug.trim() : "";
    const baseSlug = slugify(requestedSlug || school_name);
    if (!baseSlug) {
      return json({ error: "Provide a valid school name or slug." }, 400);
    }

    let finalSlug = baseSlug;
    if (requestedSlug) {
      const { data: existingSlug } = await admin
        .from("schools")
        .select("id")
        .eq("slug", baseSlug)
        .maybeSingle();
      if (existingSlug) {
        return json({ error: `School slug "${baseSlug}" is already in use. Choose another slug.` }, 400);
      }
    } else {
      finalSlug = await generateUniqueSchoolSlug(baseSlug);
    }

    // 1. Create the school
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .insert({ name: school_name, slug: finalSlug, timezone })
      .select()
      .single();
    if (schoolErr) {
      if (schoolErr.message.includes("schools_slug_key")) {
        return json({ error: "That school slug is already taken. Try another slug." }, 400);
      }
      return json({ error: schoolErr.message }, 400);
    }

    // 2. Attach a subscription
    const { error: subErr } = await admin.from("school_subscriptions").insert({
      school_id: school.id,
      plan_id,
      status: "trialing",
    });
    if (subErr) return json({ error: subErr.message }, 400);

    // 3. Create (or invite) the first School Admin
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      admin_email,
      { data: { first_name: admin_first_name, last_name: admin_last_name } },
    );

    let adminUserId: string;
    if (inviteErr) {
      const { data: existing } = await admin.auth.admin.listUsers({ email: admin_email });
      const found = existing?.users?.find((u) => u.email === admin_email);
      if (!found) return json({ error: inviteErr.message }, 400);
      adminUserId = found.id;
    } else {
      adminUserId = invited.user!.id;
    }

    await admin.from("profiles").upsert({
      id: adminUserId,
      email: admin_email,
      first_name: admin_first_name,
      last_name: admin_last_name,
    });

    const { error: roleErr } = await admin.from("user_school_roles").insert({
      user_id: adminUserId,
      school_id: school.id,
      role: "school_admin",
    });
    if (roleErr) return json({ error: roleErr.message }, 400);

    await admin.from("audit_logs").insert({
      school_id: school.id,
      actor_id: callerId,
      action: "provision_school",
      entity_type: "schools",
      entity_id: school.id,
      metadata: { admin_email, plan_id },
    });

    return json({ school, admin_user_id: adminUserId }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function generateUniqueSchoolSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data: existing, error } = await admin
      .from("schools")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!existing) {
      return candidate;
    }
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
