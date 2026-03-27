const actions = [
  { label: "Food nearby", emoji: "🍜" },
  { label: "Things to do", emoji: "✨" },
  { label: "Hidden gems", emoji: "💎" },
  { label: "Check budget", emoji: "💰" },
  { label: "What's next?", emoji: "📋" },
];

export function QuickActions({ onAction }: { onAction: (prompt: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onAction(a.label)}
          className="flex-shrink-0 px-3 py-1.5 bg-cream-dark rounded-full text-xs font-medium text-text-secondary hover:bg-primary hover:text-white transition-colors"
        >
          {a.emoji} {a.label}
        </button>
      ))}
    </div>
  );
}
