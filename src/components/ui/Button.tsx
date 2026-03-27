import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

const variants = {
  primary: "bg-primary text-white hover:bg-primary-light",
  secondary: "bg-accent text-white hover:bg-accent-light",
  ghost: "bg-transparent text-primary hover:bg-cream-dark",
} as const;

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`px-6 py-3 rounded-full font-medium text-sm transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
