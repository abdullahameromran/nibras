// supabase/functions/public-school-signup/index.ts
//
// Public self-service school signup.
// Creates the first school admin account, the school record, and the
// first subscription row in one flow so a new school can start from the
// public signup page without waiting for a platform admin to provision it.
//
// Deploy: supabase functions deploy public-school-signup
// Call:   POST /functions/v1/public-school-signup
//         {
//           "school_name": "...",
//           "slug": "...",
//           "timezone": "Africa/Cairo",
//           "admin_email": "...",
//           "admin_password": "...",
//           "admin_first_name": "...",
//           "admin_last_name": "..."
//         }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const school_name = typeof body.school_name === "string" ? body.school_name.trim() : "";
    const requestedSlug = typeof body.slug === "string" ? body.slug.trim() : "";
    const timezone = typeof body.timezone === "string" && body.timezone.trim() ? body.timezone.trim() : "Africa/Cairo";
    const admin_email = typeof body.admin_email === "string" ? body.admin_email.trim().toLowerCase() : "";
    const admin_password = typeof body.admin_password === "string" ? body.admin_password : "";
    const admin_first_name = typeof body.admin_first_name === "string" ? body.admin_first_name.trim() : "";
    const admin_last_name = typeof body.admin_last_name === "string" ? body.admin_last_name.trim() : "";

    if (!school_name || !admin_email || !admin_password || !admin_first_name || !admin_last_name) {
      return json({ error: "school_name, admin_email, admin_password, admin_first_name, and admin_last_name are required" }, 400);
    }

    if (admin_password.length < 6) {
      return json({ error: "Use a password with at least 6 characters." }, 400);
    }

    const emailLookup = await admin.auth.admin.listUsers({ email: admin_email });
    const existingUser = emailLookup.data?.users?.find((user) => user.email?.toLowerCase() === admin_email);
    if (existingUser) {
      return json({ error: "An account with this email already exists. Please sign in instead." }, 400);
    }

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

    const { data: defaultPlan, error: planErr } = await admin
      .from("subscription_plans")
      .select("id,name")
      .eq("is_active", true)
      .order("price_cents", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (planErr) {
      return json({ error: planErr.message }, 400);
    }
    if (!defaultPlan) {
      return json({ error: "No active signup plan is available right now. Please contact support." }, 400);
    }

    const { data: createdUser, error: userErr } = await admin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        first_name: admin_first_name,
        last_name: admin_last_name,
      },
    });

    if (userErr || !createdUser.user) {
      return json({ error: userErr?.message ?? "Could not create the school admin account." }, 400);
    }

    const adminUserId = createdUser.user.id;
    let schoolId: string | null = null;

    try {
      const { data: school, error: schoolErr } = await admin
        .from("schools")
        .insert({
          name: school_name,
          slug: finalSlug,
          timezone,
        })
        .select("id,name,slug,timezone")
        .single();

      if (schoolErr || !school) {
        if (schoolErr?.message?.includes("schools_slug_key")) {
          throw new Error("That school slug is already taken. Try another slug.");
        }
        throw new Error(schoolErr?.message ?? "Could not create the school.");
      }

      schoolId = school.id;

      const { error: subscriptionErr } = await admin.from("school_subscriptions").insert({
        school_id: school.id,
        plan_id: defaultPlan.id,
        status: "trialing",
      });
      if (subscriptionErr) {
        throw new Error(subscriptionErr.message);
      }

      const { error: profileErr } = await admin.from("profiles").upsert({
        id: adminUserId,
        email: admin_email,
        first_name: admin_first_name,
        last_name: admin_last_name,
        is_active: true,
      });
      if (profileErr) {
        throw new Error(profileErr.message);
      }

      const { error: roleErr } = await admin.from("user_school_roles").insert({
        user_id: adminUserId,
        school_id: school.id,
        role: "school_admin",
        is_active: true,
      });
      if (roleErr) {
        throw new Error(roleErr.message);
      }

      const { error: auditErr } = await admin.from("audit_logs").insert({
        school_id: school.id,
        actor_id: adminUserId,
        action: "public_school_signup",
        entity_type: "schools",
        entity_id: school.id,
        metadata: {
          email: admin_email,
          plan_id: defaultPlan.id,
          plan_name: defaultPlan.name,
        },
      });
      if (auditErr) {
        console.error("public-school-signup audit insert failed", auditErr);
      }

      return json(
        {
          status: "ok",
          school_id: school.id,
          school_name: school.name,
          slug: school.slug,
          admin_user_id: adminUserId,
          plan_name: defaultPlan.name,
        },
        200,
      );
    } catch (error) {
      if (schoolId) {
        await admin.from("schools").delete().eq("id", schoolId);
      }
      await admin.auth.admin.deleteUser(adminUserId);
      return json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
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
    if (error) throw error;
    if (!existing) return candidate;
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
