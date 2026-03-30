import type { BookingStatus } from "../../types";

interface BookingBadgeProps {
  status: BookingStatus;
  provider?: string;
  compact?: boolean;
}

const statusConfig: Record<BookingStatus, { icon: string; label: string; className: string }> = {
  confirmed: { icon: "✅", label: "Booked", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  external: { icon: "🔗", label: "Booked externally", className: "bg-blue-100 text-blue-800 border-blue-200" },
  pending: { icon: "⏳", label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  cancelled: { icon: "✖", label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
  refunded: { icon: "↩", label: "Refunded", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function BookingBadge({ status, provider, compact }: BookingBadgeProps) {
  const config = statusConfig[status];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${config.className}`}>
        {config.icon}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.className}`}>
      {config.icon} {config.label}
      {provider && <span className="opacity-70">· {provider}</span>}
    </span>
  );
}
