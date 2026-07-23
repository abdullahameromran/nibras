import supabase from "./supabase";

const EDGE_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

export type UserRole = "super_admin" | "school_admin" | "teacher" | "student" | "parent";

export interface UserRoleRecord {
  id: string;
  user_id: string;
  school_id: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface SchoolSignupPayload {
  school_name: string;
  slug?: string;
  timezone?: string;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
}

/** Sign in with email + password. Returns error string or null. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

/** Create a school and its first school-admin account through the public signup edge function. */
export async function signUpSchool(payload: SchoolSignupPayload): Promise<string | null> {
  try {
    const res = await fetch(`${EDGE_URL}/public-school-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return typeof data?.error === "string" ? data.error : "Could not create your school account right now.";
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Could not connect to the signup service.";
  }
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Send a password-reset email. */
export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset`,
  });
  return error ? error.message : null;
}

/** Update the authenticated user's password (called after reset redirect). */
export async function updatePassword(newPassword: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? error.message : null;
}

/** Fetch all role records for the currently authenticated user. */
export async function fetchUserRoles(): Promise<UserRoleRecord[]> {
  const { data, error } = await supabase
    .from("user_school_roles")
    .select("*")
    .eq("is_active", true);
  if (error) return [];
  return data as UserRoleRecord[];
}

/** Fetch the profile record for the current user. */
export async function fetchCurrentProfile(): Promise<AuthUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) return null;
  const user = sessionData.session.user;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return { id: user.id, email: user.email ?? "" };
  return data as AuthUser;
}
