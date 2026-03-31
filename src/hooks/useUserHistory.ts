import { useEffect, useState } from "react";
import { useAuthContext } from "../components/auth/AuthProvider";
import { supabase } from "../services/supabase";

export interface UserHistory {
  pastTrips: Array<{
    title: string;
    destinations: string[];
    duration: number;
    status: string;
  }>;
  activityPatterns: {
    completedTypes: Record<string, number>;
    plannedTypes: Record<string, number>;
    skippedTypes: Record<string, number>;
    favoriteType: string;
    avoidedType: string;
  };
  budgetPatterns: {
    avgDailySpend: number;
    budgetAccuracy: number;
    topCategory: string;
  };
  travelProfile: {
    pace: number;
    budgetStyle: string;
    cuisines: string[];
    avoidances: string[];
  };
}

export function useUserHistory(): {
  history: UserHistory | null;
  loading: boolean;
} {
  const { user } = useAuthContext();
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHistory(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);

      const [tripsRes, destsRes, activitiesRes, expensesRes, budgetsRes, travelRes] =
        await Promise.all([
          supabase.from("trips").select("id, title, start_date, end_date, status").eq("user_id", user!.id),
          supabase.from("destinations").select("trip_id, name"),
          supabase.from("activities").select("type, status, trip_id"),
          supabase.from("expenses").select("amount, category, trip_id"),
          supabase.from("budgets").select("trip_id, total_planned"),
          supabase.from("travel_profiles").select("*").eq("user_id", user!.id).single(),
        ]);

      if (cancelled) return;

      const trips = tripsRes.data ?? [];
      const dests = destsRes.data ?? [];
      const activities = activitiesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const budgets = budgetsRes.data ?? [];
      const travel = travelRes.data;

      // Past trips with destinations
      const pastTrips = trips.map((t) => {
        const tripDests = dests
          .filter((d) => d.trip_id === t.id)
          .map((d) => d.name);
        const days = Math.max(
          1,
          Math.ceil(
            (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000,
          ),
        );
        return { title: t.title, destinations: tripDests, duration: days, status: t.status };
      });

      // Activity patterns
      const completedTypes: Record<string, number> = {};
      const plannedTypes: Record<string, number> = {};
      const skippedTypes: Record<string, number> = {};
      for (const a of activities) {
        const t = a.type || "other";
        if (a.status === "completed") completedTypes[t] = (completedTypes[t] || 0) + 1;
        else if (a.status === "planned") plannedTypes[t] = (plannedTypes[t] || 0) + 1;
        if (a.status === "skipped") skippedTypes[t] = (skippedTypes[t] || 0) + 1;
      }
      const favoriteType =
        Object.entries(completedTypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "experience";
      const avoidedType =
        Object.entries(skippedTypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

      // Budget patterns
      const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalPlanned = budgets.reduce((s, b) => s + (b.total_planned || 0), 0);
      const totalDays = pastTrips.reduce((s, t) => s + t.duration, 0) || 1;
      const avgDailySpend = Math.round(totalSpent / totalDays);
      const budgetAccuracy = totalPlanned > 0 ? +(totalSpent / totalPlanned).toFixed(2) : 1;

      const catTotals: Record<string, number> = {};
      for (const e of expenses) {
        const c = e.category || "essentials";
        catTotals[c] = (catTotals[c] || 0) + (e.amount || 0);
      }
      const topCategory =
        Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "food";

      setHistory({
        pastTrips,
        activityPatterns: { completedTypes, plannedTypes, skippedTypes, favoriteType, avoidedType },
        budgetPatterns: { avgDailySpend, budgetAccuracy, topCategory },
        travelProfile: {
          pace: (travel?.pace_preference as number) ?? 3,
          budgetStyle: (travel?.budget_style as string) ?? "moderate",
          cuisines: (travel?.cuisine_preferences as string[]) ?? [],
          avoidances: (travel?.avoidances as string[]) ?? [],
        },
      });
      setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [user]);

  return { history, loading };
}

export function historyToPromptContext(h: UserHistory): string {
  const parts: string[] = [];

  if (h.pastTrips.length > 0) {
    const tripSummaries = h.pastTrips
      .slice(0, 5)
      .map((t) => `${t.title} (${t.destinations.join(", ") || "unknown"}, ${t.duration} days, ${t.status})`)
      .join("; ");
    parts.push(`Past trips: ${tripSummaries}.`);
  }

  const { favoriteType, avoidedType, completedTypes } = h.activityPatterns;
  const totalCompleted = Object.values(completedTypes).reduce((s, n) => s + n, 0);
  if (totalCompleted > 0) {
    parts.push(
      `Activity preferences: loves ${favoriteType} activities (${completedTypes[favoriteType] || 0} completed)${avoidedType ? `, tends to skip ${avoidedType}` : ""}.`,
    );
  }

  const { avgDailySpend, budgetAccuracy, topCategory } = h.budgetPatterns;
  if (avgDailySpend > 0) {
    const overUnder =
      budgetAccuracy > 1.1
        ? `tends to overspend by ~${Math.round((budgetAccuracy - 1) * 100)}%`
        : budgetAccuracy < 0.9
          ? `usually underspends by ~${Math.round((1 - budgetAccuracy) * 100)}%`
          : "stays close to budget";
    parts.push(`Budget: averages $${avgDailySpend}/day, ${overUnder}. Top spending: ${topCategory}.`);
  }

  const { pace, budgetStyle, cuisines, avoidances } = h.travelProfile;
  const paceLabel = ["very slow", "slow", "moderate", "fast", "very fast"][pace - 1] ?? "moderate";
  parts.push(`Travel style: ${paceLabel} pace, ${budgetStyle} budget.`);
  if (cuisines.length > 0) parts.push(`Loves: ${cuisines.join(", ")}.`);
  if (avoidances.length > 0) parts.push(`Avoids: ${avoidances.join(", ")}.`);

  return parts.join(" ");
}
