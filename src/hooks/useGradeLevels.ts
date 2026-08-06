import { useState, useEffect, useCallback, useRef } from "react";
import supabase from "@/lib/supabase";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { coalesceRequest } from "@/lib/requestCache";

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
  const requestIdRef = useRef(0);

  const fetchGradeLevels = useCallback(async () => {
    if (!schoolId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const { data, error: err } = await coalesceRequest(`grade-levels:${schoolId}`, () => supabase
      .from("grade_levels")
      .select("id, school_id, name, sort_order")
      .eq("school_id", schoolId)
      .order("sort_order", { ascending: true }));
    if (requestId !== requestIdRef.current) return;
    if (err) setError(err.message);
    else setGradeLevels((data as GradeLevel[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchGradeLevels(); }, [fetchGradeLevels]);
  useRealtimeRefresh(fetchGradeLevels, ["grade_levels"]);

  const createGradeLevel = useCallback(async (gl: Omit<GradeLevel, "id">) => {
    const { data, error: err } = await supabase
      .from("grade_levels")
      .insert(gl)
      .select("id, school_id, name, sort_order")
      .single();
    if (err) return { error: err.message, data: null };
    const created = data as GradeLevel;
    setGradeLevels((current) =>
      [...current.filter((item) => item.id !== created.id), created].sort((a, b) => a.sort_order - b.sort_order),
    );
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
