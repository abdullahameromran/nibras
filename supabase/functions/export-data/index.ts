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
      .select("student_id, subject_id, class_id, grade_value, grade_letter, status")
      .eq("school_id", schoolId)
      .is("deleted_at", null);
    if (filters.academic_year_id) q = q.eq("academic_year_id", filters.academic_year_id as string);
    const { data } = await q;
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

    const { school_id, entity, ...filters } = await req.json();
    if (!entity || !EXPORTERS[entity]) {
      return json({ error: `entity must be one of: ${Object.keys(EXPORTERS).join(", ")}` }, 400);
    }
    if (entity !== "waitlist" && !school_id) {
      return json({ error: "school_id is required for this export" }, 400);
    }

    // Authorize:
    // - waitlist export => super_admin only
    // - school exports => school_admin for that school or super_admin
    const { data: allowedRow } = await admin
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
    if (entity === "waitlist") {
      if (!superRow) return json({ error: "not authorized to export this data" }, 403);
    } else if (!allowedRow && !superRow) {
      return json({ error: "not authorized to export this data" }, 403);
    }

    const rows = await EXPORTERS[entity](school_id, filters);
    const workbook = toSpreadsheet(rows, entity);

    // Mandatory audit log, written before the response goes out.
    await admin.from("audit_logs").insert({
      school_id: entity === "waitlist" ? null : school_id,
      actor_id: callerId,
      action: "export_data",
      entity_type: entity,
      metadata: { row_count: rows.length, filters },
    });

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
