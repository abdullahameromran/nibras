import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  notification_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (err) setError(err.message);
    else setProfile(data as Profile);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>) => {
    if (!userId) return { error: "Not authenticated" };
    const { error: err } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (err) return { error: err.message };
    await fetchProfile();
    return { error: null };
  }, [userId, fetchProfile]);

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email
    : "";

  const initials = displayName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return { profile, loading, error, fetchProfile, updateProfile, displayName, initials };
}
