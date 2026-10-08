"use client";

import { useEffect, useRef, useState } from "react";
import { DISCLAIMER } from "@/lib/ask/disclaimer";
import { AskPurpleMark } from "./AskPurpleMark";

type Checkout = { plan: string; name: string; price: string };
type Msg = { role: "user" | "assistant"; text: string; checkout?: Checkout };

const STORE = "ask-purple";
// A saved chat survives refreshes and link clicks, but not a long break: after 30 minutes
// without a message the next page load starts a fresh chat.
const IDLE_MS = 30 * 60 * 1000;
const GREETING = "Hi, I'm Ask Purple. Ask me about our plans, languages, or how the content engine works.";
const STARTERS = ["Which plan fits my business?", "Do you make videos in Hindi?", "How does it work?"];

// Site paths and email addresses in a reply become links.
const LINKS = /(\/(?:pricing|contact|login|faq|how-it-works|services|legal\/terms|legal\/refunds)\b|[\w.+-]+@[\w-]+\.[\w.]+\w)/g;

function Linked({ text }: { text: string }) {
  return (
    <>
      {text.split(LINKS).map((part, i) =>
        i % 2 === 1 ? <a key={i} href={part.includes("@") ? `mailto:${part}` : part}>{part}</a> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

type Saved = { id?: string; msgs: Msg[]; at?: number };

function load(now = Date.now()): Saved {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || "") as Saved;
    return saved.at && now - saved.at < IDLE_MS ? saved : { msgs: [] };
  } catch {
    return { msgs: [] };
  }
}

export function AskPurple() {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = load();
    setId(saved.id);
    setMsgs(saved.msgs ?? []);
  }, []);

  useEffect(() => {
    try {
      if (msgs.length) sessionStorage.setItem(STORE, JSON.stringify({ id, msgs, at: Date.now() }));
      else sessionStorage.removeItem(STORE);
    } catch {}
    end.current?.scrollIntoView({ block: "end" });
  }, [id, msgs, open]);

  // Starts a new conversation; the old one stays in Admin > Chats.
  function newChat() {
    setId(undefined);
    setMsgs([]);
    setText("");
  }

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setText("");
    setMsgs((x) => [...x, { role: "user", text: m }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id, message: m, page: window.location.pathname }),
      });
      const data = (await res.json()) as { conversationId?: string; reply?: string; checkout?: Checkout; error?: string };
      if (data.conversationId) setId(data.conversationId);
      setMsgs((x) => [...x, { role: "assistant", text: data.reply || data.error || "Something went wrong.", checkout: data.checkout }]);
    } catch {
      setMsgs((x) => [...x, { role: "assistant", text: "I couldn't connect. Please try again, or use the contact form at /contact." }]);
    } finally {
      setBusy(false);
    }
  }

  const [before, after] = DISCLAIMER.split("Terms of Service");

  return (
    <div className="ask">
      {open && (
        <section className="ask-panel" aria-label="Ask Purple chat">
          <header className="ask-head">
            <AskPurpleMark size={34} />
            <div>
              <b>Ask Purple</b>
              <span className="fine">AI assistant for Nirakar Media</span>
            </div>
            {msgs.length > 0 && (
              <button type="button" className="ask-new" onClick={newChat} disabled={busy}>New chat</button>
            )}
            <button type="button" className="ask-close" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="ask-body" aria-live="polite">
            <p className="ask-msg ask-bot"><Linked text={GREETING} /></p>
            {!msgs.length && (
              <div className="ask-starters">
                {STARTERS.map((s) => (
                  <button key={s} type="button" className="ask-chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`ask-msg ${m.role === "user" ? "ask-you" : "ask-bot"}`}>
                <Linked text={m.text} />
                {m.checkout && (
                  <form action="/api/checkout" method="post" className="ask-checkout">
                    <input type="hidden" name="plan" value={m.checkout.plan} />
                    <button type="submit" className="btn btn-primary btn-sm">Start {m.checkout.name}, {m.checkout.price}/mo</button>
                  </form>
                )}
              </div>
            ))}
            {busy && <p className="ask-msg ask-bot ask-typing">Thinking…</p>}
            <div ref={end} />
          </div>
          <form className="ask-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <label htmlFor="ask-input" className="sr-only">Your question</label>
            <input id="ask-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ask about plans, languages, pricing…" autoComplete="off" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>Send</button>
          </form>
          <p className="ask-disclaimer">
            {before}<a href="/legal/terms">Terms of Service</a>{after}
          </p>
        </section>
      )}
      <button type="button" className="ask-launch" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <AskPurpleMark size={30} /> {open ? "Close" : "Ask Purple"}
      </button>
    </div>
  );
}
