import { useState, useEffect, useCallback, useRef } from "react";
import supabase from "@/lib/supabase";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { coalesceRequest } from "@/lib/requestCache";

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
  const requestIdRef = useRef(0);

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    let query = supabase
      .from("classes")
      .select("id, school_id, academic_year_id, grade_level_id, name, created_at, grade_levels(id, name, sort_order), academic_years(id, name, is_current)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true });
    if (academicYearId) query = query.eq("academic_year_id", academicYearId);
    const { data, error: err } = await coalesceRequest(
      `classes:${schoolId}:${academicYearId ?? "all"}`,
      () => query,
    );
    if (requestId !== requestIdRef.current) return;
    if (err) setError(err.message);
    else setClasses((data as SchoolClass[]) ?? []);
    setLoading(false);
  }, [schoolId, academicYearId]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useRealtimeRefresh(fetchClasses, ["classes"]);

  const createClass = useCallback(async (cls: Omit<SchoolClass, "id" | "created_at" | "grade_levels" | "academic_years">) => {
    if (!cls.school_id || !cls.academic_year_id || !cls.grade_level_id) {
      return { error: "School, current academic year, and grade level are required.", data: null };
    }
    const { data, error: err } = await supabase
      .from("classes")
      .insert(cls)
      .select("id, school_id, academic_year_id, grade_level_id, name, created_at")
      .single();
    if (err) return { error: err.message, data: null };
    const created = data as SchoolClass;
    setClasses((current) => [...current.filter((item) => item.id !== created.id), created]);
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
