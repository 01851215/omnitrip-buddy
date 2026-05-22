/**
 * Lightweight city autocomplete for departure / origin city fields.
 * Searches ~200 world cities instantly with prefix-first scoring.
 * No auth required, no external calls — pure local search.
 */

import { useRef, useState, useCallback, useEffect, KeyboardEvent } from "react";
import { searchCities, type WorldCity } from "../../data/worldCities";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  /** Optional icon rendered inside the left side of the input */
  icon?: React.ReactNode;
  ariaLabel?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "City or airport",
  disabled = false,
  hasError = false,
  icon,
  ariaLabel = "City search",
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<WorldCity[]>([]);
  const [open, setOpen]               = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recompute suggestions whenever value changes
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const results = searchCities(trimmed, 8);
    setSuggestions(results);
    setOpen(results.length > 0);
    setActiveIdx(-1);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCity = useCallback((city: WorldCity) => {
    onChange(city.name);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        selectCity(suggestions[activeIdx]);
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }, [open, activeIdx, suggestions, selectCity]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-sm pointer-events-none">{icon}</span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? "city-suggestions" : undefined}
          aria-activedescendant={activeIdx >= 0 ? `city-option-${activeIdx}` : undefined}
          autoComplete="off"
          disabled={disabled}
          className={`w-full ${icon ? "pl-9" : "pl-3"} pr-3 py-1.5 rounded-lg border bg-surface text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary/40 ${
            hasError ? "border-red-400" : "border-cream-dark"
          }`}
        />
      </div>

      {open && (
        <ul
          id="city-suggestions"
          ref={listRef}
          role="listbox"
          aria-label="City suggestions"
          className="absolute left-0 right-0 top-full mt-1 z-[200] rounded-xl border border-cream-dark bg-surface shadow-xl overflow-y-auto max-h-56"
        >
          {suggestions.map((city, idx) => (
            <li
              key={`${city.name}-${city.country}`}
              id={`city-option-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCity(city);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`
                px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2
                ${idx === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-cream text-text-secondary"}
              `}
            >
              <span className="text-xs font-medium truncate">{city.name}</span>
              <span className="text-[10px] text-text-muted shrink-0">{city.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
