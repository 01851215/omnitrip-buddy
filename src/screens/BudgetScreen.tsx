import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useActiveTrip } from "../hooks/useTrips";
import { useExpenses, useBudget, useCategoryTotals } from "../hooks/useExpenses";
import { Card } from "../components/ui/Card";
import { useBuddyStore } from "../stores/buddyStore";
import { Button } from "../components/ui/Button";
import { supabase } from "../services/supabase";
import type { ExpenseCategory } from "../types";

const categoryEmoji: Record<ExpenseCategory, string> = {
  stays: "🏠", food: "🍜", transport: "🚗", experiences: "✨", essentials: "🧴",
};
const categoryLabel: Record<ExpenseCategory, string> = {
  stays: "Stays & Rest", food: "Local Flavors", transport: "Moving", experiences: "Experiences", essentials: "Essentials",
};
const categoryColor: Record<ExpenseCategory, string> = {
  stays: "#2D6A5A", food: "#E8A87C", transport: "#6B7280", experiences: "#D97706", essentials: "#9CA3AF",
};

export function BudgetScreen() {
  const trip = useActiveTrip();
  const expenses = useExpenses(trip?.id);
  const budget = useBudget(trip?.id);
  const { totals, total } = useCategoryTotals(trip?.id);
  const { showOverlay, setSpeechText } = useBuddyStore();
  const [showQuickLog, setShowQuickLog] = useState(false);

  // Build spend-over-time chart data
  const sorted = [...expenses].sort((a, b) => a.timestamp - b.timestamp);
  let cumulative = 0;
  const chartData = sorted.map((e) => {
    cumulative += e.convertedAmount;
    return { date: new Date(e.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" }), amount: cumulative };
  });

  // Donut data
  const donutData = (Object.keys(totals) as ExpenseCategory[])
    .filter((k) => totals[k] > 0)
    .map((k) => ({ name: categoryLabel[k], value: totals[k], color: categoryColor[k] }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-bold font-serif">Budget Health</h1>
        <p className="text-sm text-text-secondary mt-1">
          Tracking your {trip?.title ?? "journey"}
        </p>
      </div>

      {/* Planned vs Actual */}
      <div className="px-5 flex gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Planned</p>
          <p className="text-2xl font-bold">${budget?.totalPlanned.amount.toLocaleString() ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Actual</p>
          <p className="text-2xl font-bold text-primary">${total.toLocaleString()}</p>
        </div>
      </div>

      {/* Spend Chart */}
      <div className="px-5">
        <Card className="!p-2">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D6A5A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2D6A5A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Area type="monotone" dataKey="amount" stroke="#2D6A5A" strokeWidth={2} fill="url(#tealGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Soul-Fund Allocation */}
      <div className="px-5">
        <Card>
          <h3 className="font-semibold text-sm mb-3">Soul-Fund Allocation</h3>
          <div className="flex items-center">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">${(total / 1000).toFixed(1)}k</span>
                <span className="text-[9px] text-text-muted uppercase">Spent</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 ml-4">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-text-secondary">{d.name}</span>
                  </div>
                  <span className="font-medium">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Flow */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Recent Flow</h3>
          <span className="text-xs text-primary font-medium">View All</span>
        </div>
        <div className="space-y-2">
          {sorted.slice(-5).reverse().map((e) => (
            <Card key={e.id} className="flex items-center gap-3 !py-3">
              <span className="text-lg">{categoryEmoji[e.category as ExpenseCategory]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.description}</p>
                <p className="text-[10px] text-text-muted">
                  {e.location} · {new Date(e.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">-${e.convertedAmount}</p>
                <span className="text-[9px] uppercase text-text-muted">{e.category}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Log FAB */}
      <button
        type="button"
        onClick={() => setShowQuickLog(true)}
        className="fixed bottom-28 right-20 z-30 w-12 h-12 rounded-full bg-accent text-white shadow-lg flex items-center justify-center text-2xl"
        aria-label="Log expense"
      >
        +
      </button>

      {/* Quick Log Modal */}
      {showQuickLog && (
        <QuickLog
          tripId={trip?.id}
          onClose={() => setShowQuickLog(false)}
        />
      )}

      {/* Buddy Reassurance trigger */}
      <div className="px-5 pb-4">
        <Button
          variant="ghost"
          className="w-full !text-xs"
          onClick={() => {
            setSpeechText(
              "You're slightly over on food, but on track for your stays. Consider a quiet picnic for dinner tonight. The riverside in Ubud is perfect for a peaceful meal."
            );
            showOverlay(null);
          }}
        >
          Ask Buddy about your budget
        </Button>
      </div>
    </div>
  );
}

function QuickLog({ tripId, onClose }: { tripId?: string; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [desc, setDesc] = useState("");

  const handleSave = async () => {
    if (!tripId || !amount) return;
    await supabase.from("expenses").insert({
      trip_id: tripId,
      amount: parseFloat(amount),
      currency: "USD",
      converted_amount: parseFloat(amount),
      category,
      description: desc || categoryLabel[category],
      location: "Current location",
      timestamp: Date.now(),
      buddy_suggested: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-6 space-y-4">
        <h3 className="font-semibold text-lg font-serif">Quick Log</h3>
        <input
          type="number"
          placeholder="Amount ($)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(categoryLabel) as ExpenseCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                c === category ? "bg-primary text-white" : "bg-cream-dark text-text-secondary"
              }`}
            >
              {categoryEmoji[c]} {categoryLabel[c]}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
        />
        <div className="flex gap-3">
          <Button onClick={handleSave} className="flex-1">Save</Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
