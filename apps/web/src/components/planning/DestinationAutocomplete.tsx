/**
 * RAG-powered destination search input with dropdown suggestions.
 *
 * - Instant local matches appear as you type (no latency)
 * - For logged-in users, RAG results replace/augment local ones after 350ms
 * - Full keyboard navigation (↑ ↓ Enter Escape)
 * - Clicking outside dismisses the dropdown
 */

import { useRef, useState, useCallback, useEffect, KeyboardEvent } from "react";
import { useDestinationSuggestions, type DestinationSuggestion } from "../../hooks/useDestinationSuggestions";
import { useAuthContext } from "../auth/AuthProvider";

interface DestinationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isValid?: boolean;
}

export function DestinationAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = "Where do you want to go?",
  disabled = false,
  isValid: _isValid = true,
}: DestinationAutocompleteProps) {
  const { user } = useAuthContext();
  const { suggestions, ragLoading } = useDestinationSuggestions(value);
  const [open, setOpen]             = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const listRef                     = useRef<HTMLUListElement>(null);
  const containerRef                = useRef<HTMLDivElement>(null);

  // Open dropdown when there are results
  useEffect(() => {
    setOpen(suggestions.length > 0 && value.trim().length >= 2);
    setActiveIdx(-1);
  }, [suggestions, value]);

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

  const selectSuggestion = useCallback((s: DestinationSuggestion) => {
    onChange(s.title);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "Enter") onSubmit();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        selectSuggestion(suggestions[activeIdx]);
      } else {
        setOpen(false);
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }, [open, activeIdx, suggestions, selectSuggestion, onSubmit]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && value.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          aria-label="Search destinations"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? "destination-suggestions" : undefined}
          aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
          autoComplete="off"
          disabled={disabled}
          className="flex-1 bg-transparent text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 placeholder:text-text-muted"
        />

        {/* RAG loading spinner */}
        {ragLoading && user && (
          <span className="shrink-0 animate-spin text-primary/40" aria-hidden>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          id="destination-suggestions"
          ref={listRef}
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border bg-surface shadow-xl overflow-hidden max-h-72 overflow-y-auto"
        >
          {/* RAG badge header */}
          <li className="px-3 py-1.5 flex items-center gap-1.5 border-b border-border/50">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {user ? "AI Suggestions" : "Suggestions"}
            </span>
            {user && (
              <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                RAG
              </span>
            )}
          </li>

          {suggestions.map((s, idx) => (
            <li
              key={s.id}
              id={`suggestion-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click registers
                selectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`
                px-3 py-2.5 cursor-pointer transition-colors
                ${idx === activeIdx
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-surface-hover text-text-primary"
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* Trip title */}
                  <p className="text-sm font-medium truncate leading-tight">{s.title}</p>

                  {/* Destination pills */}
                  {s.destinations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.destinations.slice(0, 4).map((d) => (
                        <span
                          key={d}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-text-secondary font-medium"
                        >
                          {d}
                        </span>
                      ))}
                      {s.destinations.length > 4 && (
                        <span className="text-[10px] text-text-muted">
                          +{s.destinations.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* RAG similarity badge */}
                {s.source === "rag" && s.similarity != null && (
                  <span className="shrink-0 text-[9px] font-medium text-primary/60 mt-0.5">
                    {Math.round(s.similarity * 100)}%
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
