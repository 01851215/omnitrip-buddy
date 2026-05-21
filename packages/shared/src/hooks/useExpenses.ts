import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { mapExpense, mapBudget } from "../utils/mapRow";
import type { Expense, Budget, ExpenseCategory } from "../types";

export function useExpenses(tripId?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!tripId) { setExpenses([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("expenses").select("*").eq("trip_id", tripId).order("timestamp", { ascending: true })
      .then(({ data }) => { setExpenses((data ?? []).map(mapExpense as any)); setLoading(false); });
  }, [tripId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { expenses, loading, refresh };
}

export function useBudget(tripId?: string) {
  const [budget, setBudget] = useState<Budget | undefined>(undefined);
  const [loading, setBudgetLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!tripId) { setBudget(undefined); setBudgetLoading(false); return; }
    setBudgetLoading(true);
    supabase.from("budgets").select("*").eq("trip_id", tripId).maybeSingle()
      .then(({ data }) => { setBudget(data ? mapBudget(data as any) : undefined); setBudgetLoading(false); });
  }, [tripId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { budget, loading, refresh };
}

export function useCategoryTotals(tripId?: string) {
  const { expenses } = useExpenses(tripId);
  const totals: Record<ExpenseCategory, number> = {
    stays: 0, food: 0, transport: 0, experiences: 0, essentials: 0,
  };
  let total = 0;
  for (const e of expenses) {
    totals[e.category as ExpenseCategory] += e.convertedAmount;
    total += e.convertedAmount;
  }
  return { totals, total };
}

export async function addExpense(tripId: string, params: {
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  location: string;
}): Promise<boolean> {
  const { error } = await supabase.from("expenses").insert({
    trip_id: tripId,
    amount: params.amount,
    currency: params.currency,
    converted_amount: params.amount,
    category: params.category,
    description: params.description,
    location: params.location,
    timestamp: Date.now(),
    buddy_suggested: false,
  });
  return !error;
}
