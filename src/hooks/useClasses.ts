import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface SchoolClass {
  id: string;
  school_id: string;
  academic_year_id: string;
  grade_level_id: string;
  name: string;
  created_at: string;
  grade_levels?: { id: string; name: string; sort_order: number };
  academic_years?: { id: string; name: string; is_current: boolean };
}

export function useClasses(schoolId: string | null, academicYearId?: string | null) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    let query = supabase
      .from("classes")
      .select("*, grade_levels(id, name, sort_order), academic_years(id, name, is_current)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true });
    if (academicYearId) query = query.eq("academic_year_id", academicYearId);
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setClasses((data as SchoolClass[]) ?? []);
    setLoading(false);
  }, [schoolId, academicYearId]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const createClass = useCallback(async (cls: Omit<SchoolClass, "id" | "created_at" | "grade_levels" | "academic_years">) => {
    const { data, error: err } = await supabase
      .from("classes")
      .insert(cls)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchClasses();
    return { error: null, data };
  }, [fetchClasses]);

  const updateClass = useCallback(async (id: string, updates: Partial<SchoolClass>) => {
    const { error: err } = await supabase
      .from("classes")
      .update(updates)
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchClasses();
    return { error: null };
  }, [fetchClasses]);

  const deleteClass = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchClasses();
    return { error: null };
  }, [fetchClasses]);

  return { classes, loading, error, fetchClasses, createClass, updateClass, deleteClass };
}
