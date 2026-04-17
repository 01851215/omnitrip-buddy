import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export interface WalletTransaction {
  id: string;
  type: "topup" | "spend" | "refund";
  amount: number;
  currency: string;
  description: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export function useWallet(userId?: string) {
  const [wallet, setWallet]         = useState<Wallet | null>(null);
  const [transactions, setTxns]     = useState<WalletTransaction[]>([]);
  const [loading, setLoading]       = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const [walletRes, txRes] = await Promise.all([
      supabase.from("user_wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setWallet(walletRes.data ?? null);
    setTxns((txRes.data as WalletTransaction[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchWallet();

    if (!userId) return;

    // Realtime: subscribe to wallet balance changes
    const sub = supabase
      .channel(`wallet:${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_wallets",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setWallet(payload.new as Wallet);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wallet_transactions",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setTxns((prev) => [payload.new as WalletTransaction, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [userId, fetchWallet]);

  /** Top up wallet via Stripe Checkout — returns the redirect URL */
  const topUp = useCallback(async (amount: number, currency = "USD"): Promise<string | null> => {
    if (!userId) return null;
    const { data, error } = await supabase.functions.invoke("wallet-topup", {
      body: { userId, amount, currency },
    });
    if (error || !data?.url) return null;
    return data.url as string;
  }, [userId]);

  /** Pay for a booking using wallet balance */
  const walletPay = useCallback(async (params: {
    tripId?: string;
    title: string;
    priceAmount: number;
    currency?: string;
    dealCategory: string;
    provider: string;
    startTime?: string;
    endTime?: string;
  }): Promise<{ success: boolean; bookingId?: string; newBalance?: number; error?: string }> => {
    if (!userId) return { success: false, error: "Not logged in" };
    const { data, error } = await supabase.functions.invoke("wallet-spend", {
      body: { userId, ...params },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };
    return {
      success:    true,
      bookingId:  data.bookingId,
      newBalance: data.newBalance,
    };
  }, [userId]);

  return {
    wallet,
    transactions,
    loading,
    refresh: fetchWallet,
    topUp,
    walletPay,
  };
}
