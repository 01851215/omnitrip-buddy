import { useState } from "react";

interface PanelInputProps {
  onSend: (text: string) => void;
  onMicToggle: () => void;
  isListening: boolean;
  disabled: boolean;
}

export function PanelInput({ onSend, onMicToggle, isListening, disabled }: PanelInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="px-4 pb-4 pt-2 flex gap-2 items-center">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Ask Buddy anything..."
        aria-label="Message Buddy"
        autoComplete="off"
        disabled={disabled}
        className="flex-1 px-4 py-2.5 rounded-full border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Send"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onMicToggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
          isListening ? "bg-accent text-white animate-pulse" : "bg-cream-dark text-text-muted"
        }`}
        aria-label={isListening ? "Stop listening" : "Start voice"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    </div>
  );
}
