import { useState } from "react";
import { createCheckout } from "../../services/searchApi";
import type { DealCategory } from "../../services/deals";

interface CheckoutButtonProps {
  title: string;
  priceAmount: number;
  currency: string;
  tripId?: string;
  userId: string;
  dealCategory: DealCategory;
  provider: string;
  startTime?: string;
  endTime?: string;
}

export function CheckoutButton({
  title,
  priceAmount,
  currency,
  tripId,
  userId,
  dealCategory,
  provider,
  startTime,
  endTime,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    const result = await createCheckout({
      title,
      priceAmount,
      currency,
      tripId,
      userId,
      dealCategory,
      provider,
      startTime,
      endTime,
    });

    if (result?.url) {
      window.open(result.url, "_blank");
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className="text-[10px] font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
    >
      {loading ? "Opening…" : "Book via OmniTrip"}
    </button>
  );
}
