import type { ChatMessage } from "../../stores/buddyPanelStore";

export function ChatFeed({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-sm text-text-muted text-center">
          Ask me anything about your trip, nearby spots, or budget!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-white rounded-br-md"
                : "bg-cream-dark text-text rounded-bl-md"
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}
