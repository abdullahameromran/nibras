import supabase from "./supabase";

const EDGE_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

/** Get the Authorization header for the current user session. */
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Upload a user avatar to the `avatars` bucket. Returns the public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (error) { console.error("uploadAvatar:", error); return null; }
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a lesson attachment. Returns the public URL. */
export async function uploadLessonAttachment(
  schoolId: string,
  lessonId: string,
  file: File
): Promise<string | null> {
  const path = `${schoolId}/${lessonId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from("lesson-attachments")
    .upload(path, file, { upsert: false });
  if (error) { console.error("uploadLessonAttachment:", error); return null; }
  const { data } = supabase.storage.from("lesson-attachments").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a student document. Returns the public URL. */
export async function uploadStudentDocument(
  schoolId: string,
  studentId: string,
  file: File
): Promise<string | null> {
  const path = `${schoolId}/${studentId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from("student-documents")
    .upload(path, file, { upsert: false });
  if (error) { console.error("uploadStudentDocument:", error); return null; }
  const { data } = supabase.storage.from("student-documents").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a school logo. Returns the public URL. */
export async function uploadSchoolLogo(schoolId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${schoolId}/logo.${ext}`;
  const { error } = await supabase.storage
    .from("school-logos")
    .upload(path, file, { upsert: true });
  if (error) { console.error("uploadSchoolLogo:", error); return null; }
  const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
  return data.publicUrl;
}

/** Call the provision-school edge function (Super Admin only). */
export async function callProvisionSchool(payload: {
  school_name: string;
  slug?: string;
  timezone?: string;
  plan_id: string;
  admin_email: string;
  admin_first_name?: string;
  admin_last_name?: string;
}) {
  const headers = await authHeader();
  const res = await fetch(`${EDGE_URL}/provision-school`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** Call the invite-user edge function (School Admin). */
export async function callInviteUser(payload: {
  school_id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}) {
  const headers = await authHeader();
  const res = await fetch(`${EDGE_URL}/invite-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** Call the send-announcement edge function. */
export async function callSendAnnouncement(announcementId: string) {
  const headers = await authHeader();
  const res = await fetch(`${EDGE_URL}/send-announcement`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ announcement_id: announcementId }),
  });
  return res.json();
}

/** Call the export-data edge function. Returns a CSV blob. */
export async function callExportData(payload: {
  entity_type: string;
  school_id?: string;
  filters?: Record<string, unknown>;
}) {
  const headers = await authHeader();
  const res = await fetch(`${EDGE_URL}/export-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  return res;
}

/** Call the soft-delete-entity edge function (Super Admin). */
export async function callSoftDelete(payload: {
  entity_type: string;
  entity_id: string;
  hard_delete?: boolean;
}) {
  const headers = await authHeader();
  const res = await fetch(`${EDGE_URL}/soft-delete-entity`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  return res.json();
}
