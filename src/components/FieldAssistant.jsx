import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

// Rasa REST channel. Start Rasa with: rasa run --enable-api --cors "*"
const RASA_URL = "http://localhost:5005/webhooks/rest/webhook";

const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

// One conversation id per browser tab.
const getSenderId = () => {
  let id = sessionStorage.getItem("chatSenderId");
  if (!id) {
    id = `user-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    sessionStorage.setItem("chatSenderId", id);
  }
  return id;
};

export default function FieldAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hello! Type 'help' to see what I can do." },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((current) => [...current, { from: "me", text }]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch(RASA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The token lets the bot call your API as the logged-in user.
        body: JSON.stringify({
          sender: getSenderId(),
          message: text,
          metadata: { token: getToken() },
        }),
      });
      const replies = await response.json();
      const botMessages = replies
        .filter((reply) => reply.text)
        .map((reply) => ({ from: "bot", text: reply.text }));
      setMessages((current) => [
        ...current,
        ...(botMessages.length
          ? botMessages
          : [
              {
                from: "bot",
                text: "Rasa answered with no message. Check that a trained model is loaded and that the actions server is running.",
              },
            ]),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { from: "bot", text: "I could not reach the assistant. Is Rasa running?" },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <p className="text-sm font-semibold">Field assistant</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
        {messages.map((message, index) => (
          <div key={`${message.from}-${index}`} className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                message.from === "me" ? "bg-blue-600 text-white" : "bg-white text-slate-800 shadow-sm"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}
        {sending && <p className="text-xs text-slate-400">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about a fault…"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          aria-label="Send"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}