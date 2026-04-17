interface CategoryItem {
  category: string;
  percentage: number;
}

interface CategoryBreakdownProps {
  categories: CategoryItem[];
}

const COLORS = [
  "#2D6A5A", // primary green
  "#E8A87C", // accent peach
  "#6B9B8A", // soft sage
  "#D4A574", // warm tan
  "#8FBCAD", // light teal
  "#C4956A", // muted gold
];

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (categories.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {categories.map((cat, i) => (
        <div key={cat.category}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text-secondary">{cat.category}</span>
            <span className="text-[10px] text-text-muted">{cat.percentage}%</span>
          </div>
          <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
