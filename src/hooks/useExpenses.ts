import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { mapExpense, mapBudget } from "../utils/mapRow";
import type { ExpenseCategory } from "../types";

export function useExpenses(tripId?: string) {
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (!tripId) { setExpenses([]); return; }
    supabase.from("expenses").select("*").eq("trip_id", tripId).order("timestamp", { ascending: true })
      .then(({ data }) => setExpenses((data ?? []).map(mapExpense)));
  }, [tripId]);

  return expenses;
}

export function useBudget(tripId?: string) {
  const [budget, setBudget] = useState<any>(undefined);

  useEffect(() => {
    if (!tripId) { setBudget(undefined); return; }
    supabase.from("budgets").select("*").eq("trip_id", tripId).single()
      .then(({ data }) => setBudget(data ? mapBudget(data) : undefined));
  }, [tripId]);

  return budget;
}

export function useCategoryTotals(tripId?: string) {
  const expenses = useExpenses(tripId);
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
