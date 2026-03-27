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
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-cream-dark text-text-secondary"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
