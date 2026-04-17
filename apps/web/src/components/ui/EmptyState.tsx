import { Button } from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <p className="text-4xl mb-3" role="img" aria-label={title}>{icon}</p>
      <h3 className="text-lg font-bold font-serif mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-[260px] leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
