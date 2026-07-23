import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface Lead {
  id: string;
  school_name: string;
  director_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  governorate: string | null;
  student_count: string | null;
  school_type: string | null;
  message: string | null;
  agreed_to_contact: boolean;
  source: string;
  status: string; // new | contacted | qualified | closed
  contacted_at: string | null;
  created_at: string;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("school_demo_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLeadStatus = useCallback(async (id: string, status: string) => {
    const updates: Partial<Lead> = { status };
    if (status === "contacted") updates.contacted_at = new Date().toISOString();
    const { error: err } = await supabase
      .from("school_demo_requests")
      .update(updates)
      .eq("id", id);
    if (err) return { error: err.message };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    return { error: null };
  }, []);

  return { leads, loading, error, fetchLeads, updateLeadStatus };
}
