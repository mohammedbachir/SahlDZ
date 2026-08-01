import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "bot"; text: string };

const BOT_REPLIES = [
  "مرحباً! أنا المساعد الذكي لـ سهل. كيف يمكنني مساعدتك اليوم؟",
  "يمكنك إدارة المطعم من لوحة التحكم: الطلبات، القائمة، التحليلات، والمزيد.",
  "هل تحتاج مساعدة في إعداد التوصيل أو الطلبات الخارجية؟",
  "جرّب تفعيل وضع المعاينة لتجربة المنصة بدون اتصال بالإنترنت.",
];

export function AdminChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: BOT_REPLIES[0] },
  ]);
  const [input, setInput] = useState("");
  const [replyIdx, setReplyIdx] = useState(1);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: BOT_REPLIES[replyIdx % BOT_REPLIES.length] }]);
      setReplyIdx((i) => i + 1);
    }, 600);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-6 z-50 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-gradient-to-l from-amber-600 to-amber-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-bold">مساعد سهل الذكي</span>
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
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "mr-auto bg-amber-600 text-white"
                    : "ml-auto bg-accent text-foreground"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب رسالتك…"
              className="rounded-xl"
            />
            <Button size="icon" className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={send}>
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
        <Bot className="h-6 w-6" />
      </Button>
    </>
  );
}
