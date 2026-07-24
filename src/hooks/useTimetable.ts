import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface TimetableEntry {
  id: string;
  school_id: string;
  academic_year_id: string;
  working_day_id: string;
  time_slot_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  working_days?: { id: string; day_of_week: number; label: string };
  time_slots?: { id: string; label: string; start_time: string; end_time: string; sort_order: number };
  classes?: { id: string; name: string };
  subjects?: { id: string; name: string };
  profiles?: { id: string; first_name: string | null; last_name: string | null };
}

export function useTimetable(schoolId: string | null, filters?: {
  classId?: string;
  teacherId?: string;
  academicYearId?: string;
}) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    let query = supabase
      .from("timetable_entries")
      .select(`
        *,
        working_days ( id, day_of_week, label ),
        time_slots ( id, label, start_time, end_time, sort_order ),
        classes ( id, name ),
        subjects ( id, name ),
        profiles ( id, first_name, last_name )
      `)
      .eq("school_id", schoolId);
    if (filters?.classId) query = query.eq("class_id", filters.classId);
    if (filters?.teacherId) query = query.eq("teacher_id", filters.teacherId);
    if (filters?.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setEntries((data as TimetableEntry[]) ?? []);
    setLoading(false);
  }, [schoolId, filters?.classId, filters?.teacherId, filters?.academicYearId]);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  const createEntry = useCallback(async (entry: Omit<TimetableEntry, "id" | "working_days" | "time_slots" | "classes" | "subjects" | "profiles">) => {
    const { data, error: err } = await supabase
      .from("timetable_entries")
      .insert(entry)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchTimetable();
    return { error: null, data };
  }, [fetchTimetable]);

  const updateEntry = useCallback(async (
    id: string,
    updates: Partial<Omit<TimetableEntry, "id" | "working_days" | "time_slots" | "classes" | "subjects" | "profiles">>,
  ) => {
    const { data, error: err } = await supabase
      .from("timetable_entries")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchTimetable();
    return { error: null, data };
  }, [fetchTimetable]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("timetable_entries")
      .delete()
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchTimetable();
    return { error: null };
  }, [fetchTimetable]);

  return { entries, loading, error, fetchTimetable, createEntry, updateEntry, deleteEntry };
}

// Working days hook
export interface WorkingDay {
  id: string;
  school_id: string;
  day_of_week: number;
  label: string;
}

export function useWorkingDays(schoolId: string | null) {
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkingDays = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("working_days")
      .select("*")
      .eq("school_id", schoolId)
      .order("day_of_week");
    if (err) setError(err.message);
    else setWorkingDays((data as WorkingDay[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchWorkingDays(); }, [fetchWorkingDays]);

  const saveWorkingDays = useCallback(async (days: Omit<WorkingDay, "id">[]) => {
    // Delete existing then insert new
    const { error: deleteError } = await supabase.from("working_days").delete().eq("school_id", schoolId!);
    if (deleteError) return { error: deleteError.message };
    if (days.length === 0) { await fetchWorkingDays(); return { error: null }; }
    const { error: err } = await supabase.from("working_days").insert(days);
    if (err) return { error: err.message };
    await fetchWorkingDays();
    return { error: null };
  }, [schoolId, fetchWorkingDays]);

  return { workingDays, loading, error, fetchWorkingDays, saveWorkingDays };
}

// Time slots hook
export interface TimeSlot {
  id: string;
  school_id: string;
  label: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

export function useTimeSlots(schoolId: string | null) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTimeSlots = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase
      .from("time_slots")
      .select("*")
      .eq("school_id", schoolId)
      .order("sort_order");
    setTimeSlots((data as TimeSlot[]) ?? []);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchTimeSlots(); }, [fetchTimeSlots]);

  const createTimeSlot = useCallback(async (slot: Omit<TimeSlot, "id">) => {
    const { data, error: err } = await supabase.from("time_slots").insert(slot).select().single();
    if (err) return { error: err.message, data: null };
    await fetchTimeSlots();
    return { error: null, data };
  }, [fetchTimeSlots]);

  const updateTimeSlot = useCallback(async (id: string, slot: Partial<Omit<TimeSlot, "id" | "school_id">>) => {
    const { data, error: err } = await supabase
      .from("time_slots")
      .update(slot)
      .eq("id", id)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchTimeSlots();
    return { error: null, data };
  }, [fetchTimeSlots]);

  const deleteTimeSlot = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("time_slots").delete().eq("id", id);
    if (err) return { error: err.message };
    await fetchTimeSlots();
    return { error: null };
  }, [fetchTimeSlots]);

  return { timeSlots, loading, fetchTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot };
}
