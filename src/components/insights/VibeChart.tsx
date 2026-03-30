interface Trait {
  name: string;
  score: number;
}

interface VibeChartProps {
  traits: Trait[];
  size?: number;
}

export function VibeChart({ traits, size = 220 }: VibeChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 30;
  const levels = 5;
  const count = traits.length;
  const angleStep = (2 * Math.PI) / count;

  const getPoint = (index: number, value: number): [number, number] => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / levels) * maxRadius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  // Grid rings
  const rings = Array.from({ length: levels }, (_, i) => {
    const r = ((i + 1) / levels) * maxRadius;
    const points = Array.from({ length: count }, (_, j) => {
      const angle = j * angleStep - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
    return points;
  });

  // Data polygon
  const dataPoints = traits.map((t, i) => getPoint(i, t.score));
  const dataPath = dataPoints.map((p) => `${p[0]},${p[1]}`).join(" ");

  // Axis lines
  const axes = traits.map((_, i) => {
    const [ex, ey] = getPoint(i, levels);
    return { x1: cx, y1: cy, x2: ex, y2: ey };
  });

  // Label positions (pushed slightly outside)
  const labelPositions = traits.map((t, i) => {
    const [lx, ly] = getPoint(i, levels + 1.1);
    return { x: lx, y: ly, name: t.name, score: t.score };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
      {/* Grid rings */}
      {rings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-cream-dark"
        />
      ))}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-cream-dark"
        />
      ))}

      {/* Data area */}
      <polygon
        points={dataPath}
        fill="rgba(45, 106, 90, 0.15)"
        stroke="#2D6A5A"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#2D6A5A" />
      ))}

      {/* Labels */}
      {labelPositions.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-current text-text-secondary"
          style={{ fontSize: "8px", fontFamily: "Inter, sans-serif" }}
        >
          {l.name}
        </text>
      ))}
    </svg>
  );
}
