import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export interface SubscriptionPlan {
  id: string;
  name: string;
  max_students: number | null;
  max_teachers: number | null;
  price_cents: number;
  billing_cycle: string;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price_cents", { ascending: true });
    if (err) setError(err.message);
    else setPlans((data as SubscriptionPlan[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const createPlan = useCallback(async (plan: Omit<SubscriptionPlan, "id" | "created_at">) => {
    const { data, error: err } = await supabase
      .from("subscription_plans")
      .insert(plan)
      .select()
      .single();
    if (err) return { error: err.message, data: null };
    await fetchPlans();
    return { error: null, data };
  }, [fetchPlans]);

  const updatePlan = useCallback(async (id: string, updates: Partial<Omit<SubscriptionPlan, "id" | "created_at">>) => {
    const { error: err } = await supabase
      .from("subscription_plans")
      .update(updates)
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchPlans();
    return { error: null };
  }, [fetchPlans]);

  const deletePlan = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("subscription_plans")
      .update({ is_active: false })
      .eq("id", id);
    if (err) return { error: err.message };
    await fetchPlans();
    return { error: null };
  }, [fetchPlans]);

  return { plans, loading, error, fetchPlans, createPlan, updatePlan, deletePlan };
}
