import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export function useAcademicYears(schoolId: string | null) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchYears = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("academic_years")
      .select("*")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false });
    if (err) setError(err.message);
    else setYears((data as AcademicYear[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const createYear = useCallback(async (year: Omit<AcademicYear, "id" | "created_at">) => {
    const { data, error: err } = await supabase
      .from("academic_years")
      .insert(year)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchYears();
    return { error: null, data };
  }, [fetchYears]);

  const updateYear = useCallback(async (id: string, updates: Partial<AcademicYear>) => {
    const { error: err } = await supabase
      .from("academic_years")
      .update(updates)
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchYears();
    return { error: null };
  }, [fetchYears]);

  const setCurrentYear = useCallback(async (id: string) => {
    // Unset current first then set new
    if (schoolId) {
      await supabase.from("academic_years").update({ is_current: false }).eq("school_id", schoolId).eq("is_current", true);
    }
    return updateYear(id, { is_current: true });
  }, [schoolId, updateYear]);

  const deleteYear = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("academic_years")
      .delete()
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchYears();
    return { error: null };
  }, [fetchYears]);

  const currentYear = years.find(y => y.is_current) ?? years[0] ?? null;

  return { years, currentYear, loading, error, fetchYears, createYear, updateYear, setCurrentYear, deleteYear };
}
