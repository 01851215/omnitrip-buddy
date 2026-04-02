import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, ReferenceLine,
  BarChart, Bar, LabelList,
} from "recharts";
import { useActiveTrip } from "../hooks/useTrips";
import { useExpenses, useBudget } from "../hooks/useExpenses";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useBuddyStore } from "../stores/buddyStore";
import { Button } from "../components/ui/Button";
import { supabase } from "../services/supabase";
import { convertToUSD, SUPPORTED_CURRENCIES } from "../utils/currency";
import type { ExpenseCategory } from "../types";

const categoryEmoji: Record<ExpenseCategory, string> = {
  stays: "🏠", food: "🍜", transport: "🚗", experiences: "✨", essentials: "🧴",
};
const categoryLabel: Record<ExpenseCategory, string> = {
  stays: "Stays & Rest", food: "Local Flavors", transport: "Moving",
  experiences: "Experiences", essentials: "Essentials",
};
const categoryColor: Record<ExpenseCategory, string> = {
  stays: "#2D6A5A", food: "#E8A87C", transport: "#6B7280",
  experiences: "#D97706", essentials: "#9CA3AF",
};

function formatAmount(amount: number): string {
  if (amount >= 10000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${Math.round(amount).toLocaleString()}`;
}

// ─── Budget Gauge SVG Ring ───────────────────────────────────────────────────

function BudgetGauge({
  total,
  planned,
  dailyTarget,
  tripEndDate,
}: {
  total: number;
  planned: number;
  dailyTarget: number;
  tripEndDate: string;
}) {
  const R = 80;
  const SIZE = 200;
  const circumference = 2 * Math.PI * R;
  const pct = planned > 0 ? Math.min(total / planned, 1) : 0;
  const strokeColor = pct < 0.7 ? "#2D6A5A" : pct < 0.9 ? "#D97706" : "#DC2626";
  const offset = circumference * (1 - pct);
  const remaining = Math.max(planned - total, 0);
  const daysLeft = tripEndDate
    ? Math.max(Math.ceil((new Date(tripEndDate).getTime() - Date.now()) / 86400000), 0)
    : 0;
  const statusLabel =
    pct > 1 ? "Over budget" : pct > 0.9 ? "Nearly at limit" : pct > 0.7 ? "Watch spending" : "On track";
  const statusColor =
    pct > 0.9 ? "text-red-500" : pct > 0.7 ? "text-amber-500" : "text-primary";

  return (
    <Card className="mx-5">
      <div className="flex flex-col items-center">
        <div className="relative w-[200px] h-[200px]">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label={`Budget used: ${Math.round(pct * 100)}%`}>
            {/* Track */}
            <circle cx={100} cy={100} r={R} fill="none" stroke="var(--color-cream-dark, #E5E1DB)" strokeWidth={16} />
            {/* Progress arc */}
            <circle
              cx={100} cy={100} r={R}
              fill="none"
              stroke={strokeColor}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold leading-tight" style={{ color: strokeColor }}>
              {formatAmount(total)}
            </span>
            <span className="text-[9px] uppercase text-text-muted tracking-wider">spent</span>
            <span className="text-base font-semibold mt-1">{formatAmount(remaining)}</span>
            <span className="text-[9px] uppercase text-text-muted tracking-wider">left</span>
          </div>
        </div>

        <div className="flex gap-3 mt-1 flex-wrap justify-center">
          <span className="px-3 py-1 rounded-full bg-cream-dark text-xs font-medium text-text-secondary">
            Daily target: {formatAmount(dailyTarget)}
          </span>
          {daysLeft > 0 && (
            <span className="px-3 py-1 rounded-full bg-cream-dark text-xs font-medium text-text-secondary">
              {daysLeft} days left
            </span>
          )}
        </div>

        <p className={`text-xs font-semibold mt-2 ${statusColor}`}>{statusLabel}</p>
      </div>
    </Card>
  );
}

// ─── Budget Setup Card ───────────────────────────────────────────────────────

function BudgetSetupCard({ tripId, onCreated }: { tripId: string; onCreated: () => void }) {
  const [total, setTotal] = useState("");
  const [daily, setDaily] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const totalAmount = parseFloat(total);
    if (!totalAmount) return;
    const dailyAmount = parseFloat(daily) || +(totalAmount / 30).toFixed(2);
    setSaving(true);
    await supabase.from("budgets").insert({
      trip_id: tripId,
      total_planned_amount: totalAmount,
      total_planned_currency: currency,
      currency,
      daily_target_amount: dailyAmount,
      daily_target_currency: currency,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Card className="mx-5">
      <h3 className="font-semibold text-sm mb-1 font-serif">Set your budget</h3>
      <p className="text-xs text-text-muted mb-3">
        No budget found for this trip. Set one to unlock health tracking.
      </p>
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          placeholder="Total budget"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-20 px-2 py-2 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
        >
          {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <input
        type="number"
        placeholder="Daily target (optional)"
        value={daily}
        onChange={(e) => setDaily(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary mb-3"
      />
      <Button onClick={handleCreate} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Set Budget"}
      </Button>
    </Card>
  );
}

// ─── Category Bar Chart ──────────────────────────────────────────────────────

function CategoryBarChart({
  totals,
}: {
  totals: Record<ExpenseCategory, number>;
}) {
  const data = (Object.keys(totals) as ExpenseCategory[])
    .filter((k) => totals[k] > 0)
    .map((k) => ({
      name: `${categoryEmoji[k]} ${categoryLabel[k]}`,
      amount: totals[k],
      color: categoryColor[k],
    }));

  if (data.length === 0) return null;

  return (
    <div className="px-5">
      <Card>
        <h3 className="font-semibold text-sm mb-3">By Category</h3>
        <ResponsiveContainer width="100%" height={data.length * 44}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
            barSize={12}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface, #FDFAF7)",
                border: "1px solid var(--color-cream-dark, #E5E1DB)",
                borderRadius: "10px",
                fontSize: "12px",
              }}
              formatter={(value: unknown) => [formatAmount(value as number), "Spent"]}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <LabelList
                dataKey="amount"
                position="right"
                formatter={(v: unknown) => formatAmount(v as number)}
                style={{ fontSize: 10, fill: "var(--color-text-secondary, #6B7280)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function BudgetScreen() {
  const { trip } = useActiveTrip();
  const { expenses, refresh: refreshExpenses } = useExpenses(trip?.id);
  const { budget, loading: budgetLoading, refresh: refreshBudget } = useBudget(trip?.id);
  const { showOverlay, setSpeechText } = useBuddyStore();
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Compute totals inline from the shared expenses array (avoids stale version in useCategoryTotals)
  const totals: Record<ExpenseCategory, number> = {
    stays: 0, food: 0, transport: 0, experiences: 0, essentials: 0,
  };
  let total = 0;
  for (const e of expenses) {
    totals[e.category as ExpenseCategory] += e.convertedAmount;
    total += e.convertedAmount;
  }

  // Chart data
  const sorted = [...expenses].sort((a, b) => a.timestamp - b.timestamp);
  let cumulative = 0;
  const chartData = sorted.map((e) => {
    cumulative += e.convertedAmount;
    return {
      date: new Date(e.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" }),
      amount: cumulative,
    };
  });

  const donutData = (Object.keys(totals) as ExpenseCategory[])
    .filter((k) => totals[k] > 0)
    .map((k) => ({ name: categoryLabel[k], value: totals[k], color: categoryColor[k] }));

  const isOverBudget = budget ? total > budget.totalPlanned.amount : false;
  const areaStroke = isOverBudget ? "#DC2626" : "#2D6A5A";
  const gradientId = isOverBudget ? "redGrad" : "tealGrad";

  // Dynamic Buddy prompt
  const highestCategory = (Object.keys(totals) as ExpenseCategory[])
    .reduce((a, b) => totals[a] >= totals[b] ? a : b, "food" as ExpenseCategory);
  const buddyPrompt = budget
    ? `I've spent ${formatAmount(total)} of my ${formatAmount(budget.totalPlanned.amount)} budget. ` +
      `My biggest spending category is ${categoryLabel[highestCategory]} at ${formatAmount(totals[highestCategory])}. ` +
      `How am I doing and what should I watch?`
    : `I've spent ${formatAmount(total)} so far on this trip with no set budget. ` +
      `My biggest category is ${categoryLabel[highestCategory]}. Any advice?`;

  const displayedExpenses = showAll ? [...sorted].reverse() : [...sorted].slice(-5).reverse();

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-bold font-serif">Budget Health</h1>
        <p className="text-sm text-text-secondary mt-1">
          Tracking your {trip?.title ?? "journey"}
        </p>
      </div>

      {/* Budget Gauge — shown when budget exists */}
      {budget && (
        <BudgetGauge
          total={total}
          planned={budget.totalPlanned.amount}
          dailyTarget={budget.dailyTarget.amount}
          tripEndDate={trip?.endDate ?? ""}
        />
      )}

      {/* Budget Setup — shown when no budget and not loading */}
      {!budgetLoading && !budget && trip?.id && (
        <BudgetSetupCard tripId={trip.id} onCreated={refreshBudget} />
      )}

      {/* Fallback plain total when no budget */}
      {!budget && !budgetLoading && (
        <div className="px-5">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Total Spent</p>
          <p className="text-3xl font-bold text-primary">{formatAmount(total)}</p>
        </div>
      )}

      {/* Spend Over Time */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-muted font-medium">Spend over time</span>
          {budget && (
            <span className={`text-[10px] font-semibold ${isOverBudget ? "text-red-500" : "text-primary"}`}>
              {isOverBudget ? "Over budget" : "On track"}
            </span>
          )}
        </div>
        <Card className="!p-2">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D6A5A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2D6A5A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface, #FDFAF7)",
                  border: "1px solid var(--color-cream-dark, #E5E1DB)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value: unknown) => [formatAmount(value as number), "Cumulative"]}
              />
              {budget && (
                <ReferenceLine
                  y={budget.totalPlanned.amount}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Budget", position: "insideTopRight", fontSize: 10, fill: "#DC2626" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="amount"
                stroke={areaStroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Soul-Fund Allocation donut */}
      {donutData.length > 0 && (
        <div className="px-5">
          <Card>
            <h3 className="font-semibold text-sm mb-3">Soul-Fund Allocation</h3>
            <div className="flex items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", fontSize: "12px" }}
                      formatter={(value: unknown) => [formatAmount(value as number)]}
                    />
                    <Pie data={donutData} innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                      {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-bold leading-tight">{formatAmount(total)}</span>
                  <span className="text-[9px] text-text-muted uppercase">Spent</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 ml-4">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-text-secondary">{d.name}</span>
                    </div>
                    <span className="font-medium">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category Bar Chart */}
      <CategoryBarChart totals={totals} />

      {/* Recent Flow */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Recent Flow</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowQuickLog(true)}
              className="text-xs text-accent font-medium"
            >
              Log New +
            </button>
            {sorted.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs text-primary font-medium"
              >
                {showAll ? "Show Less" : "View All"}
              </button>
            )}
          </div>
        </div>
        {sorted.length === 0 ? (
          <EmptyState
            icon="💰"
            title="No expenses yet"
            description="Tap + to log your first expense."
          />
        ) : (
          <div className="space-y-2">
            {displayedExpenses.map((e) => (
              <Card key={e.id} className="flex items-center gap-3 !py-3">
                <span className="text-lg">{categoryEmoji[e.category as ExpenseCategory]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.description}</p>
                  <p className="text-[10px] text-text-muted">
                    {e.location} · {new Date(e.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right mr-1">
                  <p className="text-sm font-semibold">-{formatAmount(e.convertedAmount)}</p>
                  <span className="text-[9px] uppercase text-text-muted">{e.category}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.from("expenses").delete().eq("id", e.id);
                    refreshExpenses();
                  }}
                  className="text-text-muted hover:text-red-400 transition-colors text-sm flex-shrink-0"
                  aria-label="Delete expense"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Buddy Reassurance */}
      <div className="px-5 pb-4">
        <Button
          variant="ghost"
          className="w-full !text-xs"
          onClick={() => {
            setSpeechText(buddyPrompt);
            showOverlay(null);
          }}
        >
          Ask Buddy about your budget
        </Button>
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
          onSaved={refreshExpenses}
        />
      )}
    </div>
  );
}

// ─── Quick Log Modal ─────────────────────────────────────────────────────────

function QuickLog({
  tripId,
  onClose,
  onSaved,
}: {
  tripId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!tripId || !amount || saving) return;
    setSaving(true);
    const raw = parseFloat(amount);
    const { error } = await supabase.from("expenses").insert({
      trip_id: tripId,
      amount: raw,
      currency,
      converted_amount: convertToUSD(raw, currency),
      category,
      description: desc || categoryLabel[category],
      location: "Current location",
      timestamp: Date.now(),
      buddy_suggested: false,
    });
    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-6 space-y-4">
        <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto -mt-2" />
        <h3 className="font-semibold text-lg font-serif">Quick Log</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
            autoFocus
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-24 px-2 py-3 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
          >
            {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
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
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2 justify-center">
                <Spinner size="sm" /> Saving…
              </span>
            ) : "Save"}
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
