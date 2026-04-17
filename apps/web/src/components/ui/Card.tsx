import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
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
      className={`bg-surface rounded-2xl shadow-sm border border-cream-dark p-4 ${
        onClick ? "cursor-pointer active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
