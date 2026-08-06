// supabase/functions/export-data/index.ts
//
// Handles the "Export Data" action from the permission matrix, which
// explicitly requires an audit log entry. The client never queries+downloads
// directly for bulk export — it always goes through here, so the log is
// guaranteed rather than optional.
//
// Deploy:  supabase functions deploy export-data
// Call:    POST /functions/v1/export-data
//          Authorization: Bearer <caller's JWT>
//          { "school_id": "...", "entity": "students" | "attendance" | "final_grades" | "waitlist",
//            "academic_year_id": "..." (optional filter) }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Allow-list of exportable entities -> underlying query builder.
// Keeping this explicit (not dynamic SQL) avoids injection entirely.
const EXPORTERS: Record<string, (schoolId: string, filters: Record<string, unknown>) => Promise<any[]>> = {
  platform_analytics: async () => {
    const [{ data: schools }, { data: roleRows }] = await Promise.all([
      admin
        .from("schools")
        .select("id,name,is_active,created_at,school_subscriptions(status,starts_at,ends_at,subscription_plans(name,price_cents,billing_cycle))")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      admin.from("user_school_roles").select("school_id,role,user_id").eq("is_active", true),
    ]);
    return (schools ?? []).map((school: any) => {
      const subscription = school.school_subscriptions?.[0] ?? null;
      return {
        school_id: school.id,
        school_name: school.name,
        school_status: school.is_active ? "active" : "inactive",
        plan: subscription?.subscription_plans?.name ?? "",
        subscription_status: subscription?.status ?? "",
        monthly_price_usd: ((subscription?.subscription_plans?.price_cents ?? 0) / 100).toFixed(2),
        students: (roleRows ?? []).filter((row: any) => row.school_id === school.id && row.role === "student").length,
        teachers: (roleRows ?? []).filter((row: any) => row.school_id === school.id && row.role === "teacher").length,
        created_at: school.created_at,
      };
    });
  },
  students: async (schoolId) => {
    const { data } = await admin
      .from("class_enrollments")
      .select("student_id, status, classes(name), profiles:student_id(first_name,last_name,email)")
      .eq("school_id", schoolId);
    return data ?? [];
  },
  attendance: async (schoolId, filters) => {
    let q = admin
      .from("attendance_records")
      .select("student_id, status, recorded_at, lessons(class_id, subject_id)")
      .eq("school_id", schoolId);
    if (filters.from) q = q.gte("recorded_at", filters.from as string);
    if (filters.to) q = q.lte("recorded_at", filters.to as string);
    const { data } = await q;
    return data ?? [];
  },
  final_grades: async (schoolId, filters) => {
    let q = admin
      .from("final_grades")
      .select("student_id, subject_id, class_id, grade_value, grade_letter, remarks, status, profiles:student_id(first_name,last_name,email),subjects(name),classes(name)")
      .eq("school_id", schoolId)
      .is("deleted_at", null);
    if (filters.academic_year_id) q = q.eq("academic_year_id", filters.academic_year_id as string);
    if (filters.class_id) q = q.eq("class_id", filters.class_id as string);
    if (filters.subject_id) q = q.eq("subject_id", filters.subject_id as string);
    const { data } = await q;
    return data ?? [];
  },
  test_results: async (schoolId, filters) => {
    if (!filters.test_id) return [];
    const { data } = await admin
      .from("test_submissions")
      .select("student_id,submitted_at,score,graded_at,profiles:student_id(first_name,last_name,email),monthly_tests!inner(id,title,class_id,subject_id,school_id)")
      .eq("test_id", filters.test_id as string)
      .eq("monthly_tests.school_id", schoolId);
    return data ?? [];
  },
  waitlist: async () => {
    const { data: schoolDemoRows } = await admin
      .from("school_demo_requests")
      .select("school_name, director_name, phone, email, governorate, student_count, school_type, source, status, contacted_at, created_at")
      .order("created_at", { ascending: false });

    return ((schoolDemoRows ?? []).map((row) => ({
      lead_type: "school_demo",
      full_name: row.school_name,
      school_name: row.school_name,
      director_name: row.director_name,
      email: row.email ?? "",
      phone: row.phone,
      governorate: row.governorate ?? "",
      student_count: row.student_count ?? "",
      school_type: row.school_type ?? "",
      source: row.source,
      status: row.status,
      contacted_at: row.contacted_at,
      created_at: row.created_at,
    }))).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};

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

    const payload = await req.json();
    const school_id = payload.school_id as string | undefined;
    const entity = (payload.entity ?? payload.entity_type) as string | undefined;
    const filters = { ...(payload.filters ?? {}), ...payload } as Record<string, unknown>;
    if (!entity || !EXPORTERS[entity]) {
      return json({ error: `entity must be one of: ${Object.keys(EXPORTERS).join(", ")}` }, 400);
    }
    if (!["waitlist", "platform_analytics"].includes(entity) && !school_id) {
      return json({ error: "school_id is required for this export" }, 400);
    }

    // Authorize:
    // - waitlist export => super_admin only
    // - school exports => school_admin for that school or super_admin
    let allowedRow: { role: string } | null = null;
    if (school_id) {
      const { data } = await admin
        .from("user_school_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("school_id", school_id)
        .eq("role", "school_admin")
        .eq("is_active", true)
        .maybeSingle();
      allowedRow = data;
    }
    const { data: superRow } = await admin
      .from("user_school_roles")
      .select("role")
      .eq("user_id", callerId)
      .is("school_id", null)
      .eq("role", "super_admin")
      .eq("is_active", true)
      .maybeSingle();
    const { data: callerProfile } = await admin.from("profiles").select("id").eq("id", callerId).eq("is_active", true).maybeSingle();
    if (!callerProfile) return json({ error: "account is inactive" }, 403);
    if (school_id && !superRow) {
      const { data: activeSchool } = await admin
        .from("schools")
        .select("id")
        .eq("id", school_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (!activeSchool) return json({ error: "school is inactive" }, 403);
    }
    let effectiveRole = superRow ? "super_admin" : allowedRow ? "school_admin" : "";
    if (!effectiveRole && school_id) {
      const { data: teacherRow } = await admin
        .from("user_school_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("school_id", school_id)
        .eq("role", "teacher")
        .eq("is_active", true)
        .maybeSingle();
      if (teacherRow) effectiveRole = "teacher";
    }

    if (["waitlist", "platform_analytics"].includes(entity)) {
      if (!superRow) return json({ error: "not authorized to export this data" }, 403);
    } else if (!effectiveRole) {
      return json({ error: "not authorized to export this data" }, 403);
    }

    const { data: permissionRows } = await admin
      .from("export_permissions")
      .select("school_id,allowed")
      .eq("role", effectiveRole)
      .eq("entity_type", entity);
    const schoolOverride = (permissionRows ?? []).find((row: any) => row.school_id === school_id);
    const globalDefault = (permissionRows ?? []).find((row: any) => row.school_id === null);
    if (!(schoolOverride?.allowed ?? globalDefault?.allowed ?? false)) {
      return json({ error: "export permission is disabled for this role" }, 403);
    }

    if (effectiveRole === "teacher") {
      if (entity === "test_results") {
        const { data: test } = await admin.from("monthly_tests").select("teacher_id,school_id").eq("id", filters.test_id).eq("school_id", school_id).maybeSingle();
        if (!test || test.teacher_id !== callerId) return json({ error: "teacher is not assigned to this test" }, 403);
      } else if (entity === "final_grades") {
        const { data: assignment } = await admin
          .from("teacher_subject_assignments")
          .select("id")
          .eq("school_id", school_id)
          .eq("teacher_id", callerId)
          .eq("class_id", filters.class_id)
          .eq("subject_id", filters.subject_id)
          .maybeSingle();
        if (!assignment) return json({ error: "teacher is not assigned to this class and subject" }, 403);
      } else {
        return json({ error: "teachers cannot export this entity" }, 403);
      }
    }

    const rows = await EXPORTERS[entity](school_id, filters);
    const workbook = toSpreadsheet(rows, entity);

    // Mandatory audit log, written before the response goes out.
    const { error: auditError } = await admin.from("audit_logs").insert({
      school_id: ["waitlist", "platform_analytics"].includes(entity) ? null : school_id,
      actor_id: callerId,
      action: "export_data",
      entity_type: entity,
      metadata: { row_count: rows.length, filters },
    });
    if (auditError) return json({ error: `audit log failed: ${auditError.message}` }, 500);

    return new Response("\uFEFF" + workbook, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${entity}-export.xls\"`,
        ...corsHeaders,
      },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// ---------------------------------------------------------------------------
// CSV generation
//
// Two bugs used to live here:
//  1. Cells were written with JSON.stringify(), which quotes strings but
//     escapes embedded quotes as `\"` instead of the CSV-standard `""`.
//     Any field containing a comma or quote (a name, address, note, etc.)
//     broke the column count for that row, since spreadsheet apps treat an
//     unescaped internal comma as a new column boundary. That's what made
//     rows look like they had extra/duplicated, numbered-looking columns.
//  2. The header list was built from a Set populated by scanning every row,
//     so column order could differ depending on which row a field first
//     appeared in, compounding the misalignment.
//
// Fixed by: proper RFC4180 escaping (quote a field only when it contains a
// comma/quote/newline, double up internal quotes), a stable first-seen
// header order, and safe handling of Date objects and nested arrays (which
// previously could get silently wiped or dumped as raw, unescaped `[...]`
// text by the old recursive flatten()).
// ---------------------------------------------------------------------------

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function toSpreadsheet(rows: any[], sheetName: string): string {
  const normalizedRows = rows.flatMap((row) => (Array.isArray(row) ? row : [row])).filter(Boolean);
  const safeSheetName = sheetName.replace(/[^a-zA-Z0-9_-]/g, "_") || "Export";
  if (normalizedRows.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(safeSheetName)}">
    <Table />
  </Worksheet>
</Workbook>`;
  }

  const flat = normalizedRows.map((r) => flatten(r));

  const headers: string[] = [];
  const seenHeaders = new Set<string>();
  for (const row of flat) {
    for (const key of Object.keys(row)) {
      if (!seenHeaders.has(key)) {
        seenHeaders.add(key);
        headers.push(key);
      }
    }
  }

  const headerXml = headers
    .map((header) => `        <Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join("\n");

  const rowXml = flat
    .map((row) => {
      const cells = headers
        .map((header) => `        <Cell><Data ss:Type="String">${escapeXml(formatCellValue(row[header]))}</Data></Cell>`)
        .join("\n");
      return `      <Row>\n${cells}\n      </Row>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(safeSheetName)}">
    <Table>
      <Row>
${headerXml}
      </Row>
${rowXml}
    </Table>
  </Worksheet>
</Workbook>`;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => formatCellValue(item)).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
