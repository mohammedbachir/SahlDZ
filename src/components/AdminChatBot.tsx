import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Loader2,
  Wrench,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bestMatches,
  confidenceOf,
  greetingReply,
  hasMeaningfulQuery,
  isGreeting,
  isHelp,
  isThanks,
  noAnswerReply,
  suggestionsFor,
  thanksReply,
} from "@/lib/assistant/engine";
import type { AssistantAction } from "@/lib/assistant/knowledge";
import { askAssistantAI } from "@/lib/assistant/assistant-ai";

type BotMessage = {
  role: "user" | "bot";
  text: string;
  source?: "ai" | "kb" | "hint";
  category?: string;
  actions?: AssistantAction[];
};

const AI_TIMEOUT_MS = 15000;

function fallbackReply(query: string): BotMessage {
  const matches = bestMatches(query);
  const confidence = confidenceOf(matches);

  if ((isGreeting(query) || isThanks(query)) && confidence < 0.7) {
    return {
      role: "bot",
      text: isGreeting(query) ? greetingReply() : thanksReply(),
      source: "hint",
    };
  }

  if (hasMeaningfulQuery(query) && confidence >= 0.7) {
    const entry = matches[0].entry;
    return {
      role: "bot",
      text: entry.answer,
      source: "kb",
      category: entry.category,
      actions: entry.actions,
    };
  }

  const fallbackText =
    isHelp(query) || !hasMeaningfulQuery(query)
      ? noAnswerReply([])
      : noAnswerReply(matches);
  return {
    role: "bot",
    text: fallbackText,
    source: "hint",
    category: matches[0]?.entry.category,
    actions: matches[0]?.entry.actions,
  };
}

export function AdminChatBot() {
  const navigate = useNavigate();
  const askAI = useServerFn(askAssistantAI);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<BotMessage[]>([
    { role: "bot", text: greetingReply(), source: "hint" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const suggestions = suggestionsFor(pathname);
  const quickChips = suggestions.slice(0, 4);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  function go(action: AssistantAction) {
    const search = action.search ?? undefined;
    navigate({
      to: action.to as never,
      search: search as never,
    });
    setOpen(false);
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || typing) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setTyping(true);

    let final = fallbackReply(question);

    try {
      const result = await Promise.race([
        askAI({ data: { question } }),
        new Promise<{ usedAI: false; answer: string }>((resolve) =>
          setTimeout(
            () => resolve({ usedAI: false, answer: "" }),
            AI_TIMEOUT_MS,
          ),
        ),
      ]);
      if (result.usedAI && result.answer) {
        final = { role: "bot", text: result.answer, source: "ai" };
      }
    } catch {
      final = fallbackReply(question);
    }

    setTyping(false);
    setMessages((m) => [...m, final]);
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-6 z-50 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-gradient-to-l from-amber-600 to-amber-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div className="leading-tight">
                <span className="block font-bold">مساعد سهل الذكي</span>
                <span className="block text-[10px] text-white/80">
                  يعرف النظام من داخل الكود — يجيب بدقة
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((msg, i) => (
              <div key={i} className="space-y-1">
                <div
                  className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "mr-auto bg-amber-600 text-white"
                      : "ml-auto bg-accent text-foreground"
                  }`}
                >
                  {msg.category && (
                    <span className="mb-1 block text-[10px] font-bold text-[var(--primary)]">
                      {msg.category}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                </div>

                {msg.actions && msg.actions.length > 0 && (
                  <div className="ml-auto flex max-w-[88%] flex-wrap gap-1.5">
                    {msg.actions.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => go(a)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-2 py-1 text-[11px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/15"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}

                {msg.role === "bot" && msg.source && (
                  <div className="ml-auto flex items-center gap-1 pr-1 text-[10px] text-[var(--muted-foreground)]">
                    {msg.source === "ai" ? (
                      <>
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        إجابة بالذكاء الاصطناعي
                      </>
                    ) : msg.source === "kb" ? (
                      <>
                        <Wrench className="h-3 w-3" />
                        من معرفة سهل
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="ml-auto flex w-14 items-center justify-center rounded-xl rounded-br-md bg-accent px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => send(chip.query)}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب سؤالك عن النظام…"
              className="rounded-xl"
            />
            <Button
              size="icon"
              className="rounded-xl bg-amber-600 hover:bg-amber-700"
              onClick={() => send()}
              disabled={typing || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full bg-gradient-to-l from-amber-600 to-amber-500 shadow-lg hover:from-amber-700 hover:to-amber-600"
        aria-label="Chat with assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>
    </>
  );
}
