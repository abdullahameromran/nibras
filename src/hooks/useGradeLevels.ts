import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface GradeLevel {
  id: string;
  school_id: string;
  name: string;
  sort_order: number;
}

export function useGradeLevels(schoolId: string | null) {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGradeLevels = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("grade_levels")
      .select("*")
      .eq("school_id", schoolId)
      .order("sort_order", { ascending: true });
    if (err) setError(err.message);
    else setGradeLevels((data as GradeLevel[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchGradeLevels(); }, [fetchGradeLevels]);

  const createGradeLevel = useCallback(async (gl: Omit<GradeLevel, "id">) => {
    const { data, error: err } = await supabase
      .from("grade_levels")
      .insert(gl)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchGradeLevels();
    return { error: null, data };
  }, [fetchGradeLevels]);

  const updateGradeLevel = useCallback(async (id: string, updates: Partial<GradeLevel>) => {
    const { error: err } = await supabase
      .from("grade_levels")
      .update(updates)
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchGradeLevels();
    return { error: null };
  }, [fetchGradeLevels]);

  const deleteGradeLevel = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("grade_levels")
      .delete()
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchGradeLevels();
    return { error: null };
  }, [fetchGradeLevels]);

  return { gradeLevels, loading, error, fetchGradeLevels, createGradeLevel, updateGradeLevel, deleteGradeLevel };
}
