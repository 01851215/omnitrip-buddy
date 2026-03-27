interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  labels?: string[];
  onChange: (v: number) => void;
}

export function SliderField({ label, value, min, max, labels, onChange }: SliderFieldProps) {
  const currentLabel = labels ? labels[value - min] : String(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-medium text-primary">{currentLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-cream-dark accent-primary cursor-pointer"
      />
      {labels && (
        <div className="flex justify-between">
          {labels.map((l) => (
            <span key={l} className="text-[9px] text-text-muted">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
