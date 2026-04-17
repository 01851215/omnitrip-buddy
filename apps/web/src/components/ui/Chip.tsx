import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Chip({ children, active, onClick, className = "" }: ChipProps) {
  return (
    <span
      onClick={onClick}
      {...(onClick ? {
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      } : {})}
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-cream-dark text-text-secondary"
      } ${onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
