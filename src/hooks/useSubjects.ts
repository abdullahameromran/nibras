import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export function useSubjects(schoolId: string | null) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("subjects")
      .select("*")
      .eq("school_id", schoolId)
      .order("name", { ascending: true });
    if (err) setError(err.message);
    else setSubjects((data as Subject[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const createSubject = useCallback(async (subject: Omit<Subject, "id" | "created_at">) => {
    const { data, error: err } = await supabase
      .from("subjects")
      .insert(subject)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchSubjects();
    return { error: null, data };
  }, [fetchSubjects]);

  const updateSubject = useCallback(async (id: string, updates: Partial<Subject>) => {
    const { error: err } = await supabase
      .from("subjects")
      .update(updates)
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchSubjects();
    return { error: null };
  }, [fetchSubjects]);

  const deleteSubject = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchSubjects();
    return { error: null };
  }, [fetchSubjects]);

  return { subjects, loading, error, fetchSubjects, createSubject, updateSubject, deleteSubject };
}
