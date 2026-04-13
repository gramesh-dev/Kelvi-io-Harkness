"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  ordinal: number;
  role: string;
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  initialMessages: Message[];
  studentName: string;
  mode: string;
}

export function ChatInterface({
  sessionId,
  initialMessages,
  studentName,
  mode,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      ordinal: messages.length + 1,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            ordinal: messages.length + 2,
            role: "assistant",
            content: `Sorry, something went wrong: ${data.error || "Unknown error"}`,
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ordinal: messages.length + 2,
          role: "assistant",
          content: data.content,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ordinal: messages.length + 2,
          role: "assistant",
          content: "Sorry, I couldn't reach the AI. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-kelvi-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤔</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">
              Hi {studentName}! Ready to learn?
            </h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              {mode === "questioning" &&
                "Ask me anything and I'll help you discover the answer through questions!"}
              {mode === "guided" &&
                "Tell me what you'd like to learn and I'll guide you step by step."}
              {mode === "exploration" &&
                "What are you curious about? Let's explore together!"}
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-kelvi-600 text-white"
                    : "bg-surface border border-border"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-surface px-6 py-4 shrink-0">
        <form
          onSubmit={handleSend}
          className="max-w-2xl mx-auto flex gap-3 items-end"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-kelvi-500 focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-kelvi-600 text-white rounded-xl hover:bg-kelvi-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
