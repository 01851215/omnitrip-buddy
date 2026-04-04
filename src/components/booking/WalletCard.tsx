/**
 * WalletCard — compact wallet balance card with top-up button and recent transactions.
 * Designed to appear in PlanningScreen and ProfileScreen.
 */
import { useState } from "react";
import { useWallet, type WalletTransaction } from "../../hooks/useWallet";
import { supabase } from "../../services/supabase";

interface WalletCardProps {
  userId: string;
}

const TOPUP_AMOUNTS = [20, 50, 100, 200];

export function WalletCard({ userId }: WalletCardProps) {
  const { wallet, transactions, loading, refresh } = useWallet(userId);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [showTxns, setShowTxns]         = useState(false);

  const handleTopUp = async (amount: number) => {
    setTopUpLoading(true);
    const { data, error } = await supabase.functions.invoke("wallet-topup", {
      body: { userId, amount, currency: "USD" },
    });
    if (!error && data?.url) {
      window.open(data.url, "_blank");
    }
    setTopUpLoading(false);
  };

  const balance  = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? "USD";

  return (
    <div className="mx-5 mt-4">
      {/* Main balance card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-2 w-16 h-16 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">👛</span>
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">OmniTrip Wallet</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTxns((v) => !v)}
              className="text-[10px] opacity-70 font-medium hover:opacity-100 transition-opacity"
            >
              {showTxns ? "Hide history" : "View history"}
            </button>
          </div>

          {loading ? (
            <div className="h-9 w-24 bg-white/20 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">
              ${balance.toFixed(2)}
              <span className="text-xs font-medium opacity-60 ml-1">{currency}</span>
            </p>
          )}

          <p className="text-[10px] opacity-60 mt-1">Available to spend on bookings</p>
        </div>
      </div>

      {/* Quick top-up row */}
      <div className="flex gap-2 mt-2.5">
        {TOPUP_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleTopUp(amount)}
            disabled={topUpLoading}
            className="flex-1 text-xs font-semibold py-2 rounded-xl border border-cream-dark bg-surface text-text hover:bg-cream transition-colors disabled:opacity-50"
          >
            +${amount}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-text-muted text-center mt-1">Tap to top up via Stripe · Opens checkout</p>

      {/* Transaction history */}
      {showTxns && (
        <div className="mt-3 space-y-1">
          {transactions.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No transactions yet</p>
          ) : (
            transactions.slice(0, 8).map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const isTopup  = tx.type === "topup";
  const isRefund = tx.type === "refund";

  return (
    <div className="flex items-center gap-2.5 py-2 px-3 bg-cream rounded-xl">
      <span className="text-base flex-shrink-0">
        {isTopup ? "💳" : isRefund ? "↩️" : "✈️"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text truncate">{tx.description ?? tx.type}</p>
        <p className="text-[10px] text-text-muted">
          {new Date(tx.created_at).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <span className={`text-xs font-bold flex-shrink-0 ${isTopup || isRefund ? "text-primary" : "text-text"}`}>
        {isTopup || isRefund ? "+" : "-"}${tx.amount.toFixed(2)}
      </span>
    </div>
  );
}
