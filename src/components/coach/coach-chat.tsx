"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useLocale, useMessages } from "@/i18n/client";
import { useLocalValue } from "@/lib/local-store";
import { coachModes, type ChatMessage, type CoachMode } from "@/lib/coach/coach";
import { ageGroupFor } from "@/lib/profile";
import { useProfile } from "@/lib/use-profile";
import type { SafetyKind } from "@/lib/finder/types";
import { PageHeader } from "@/components/ui";
import { SafetyCard } from "@/components/tools/opportunity-finder";

type Saved = { mode: CoachMode; messages: ChatMessage[] };
const initial: Saved = { mode: "chat", messages: [] };

export function CoachChat() {
  const m = useMessages();
  const c = m.coach;
  const locale = useLocale();
  const { profile } = useProfile();
  const chat = useLocalValue<Saved>("coach", "chat", initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // the reply while it streams in
  const [error, setError] = useState<keyof typeof c.errors | null>(null);
  const [detail, setDetail] = useState("");
  const [safety, setSafety] = useState<SafetyKind | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = chat.value.messages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, draft]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    if (!navigator.onLine) return setError("offline");
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setText("");
    setError(null);
    setDetail("");
    setSafety(null);
    setBusy(true);
    await chat.save({ mode: chat.value.mode, messages: next });
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: chat.value.mode,
          language: locale,
          ageGroup: ageGroupFor(profile.birthMonth, profile.birthYear),
          grade: profile.grade,
          interests: profile.interests,
          messages: next.slice(-20),
        }),
      });
      if ((res.headers.get("content-type") ?? "").includes("application/json")) {
        const data = (await res.json()) as { status: string; kind?: SafetyKind; code?: keyof typeof c.errors; detail?: string };
        if (data.status === "safety" && data.kind) setSafety(data.kind);
        else {
          setError(data.code ?? "failed");
          setDetail(data.detail ?? "");
        }
        return;
      }
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setDraft("");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setDraft(reply);
      }
      if (reply.trim()) await chat.save({ mode: chat.value.mode, messages: [...next, { role: "assistant", content: reply.trim() }] });
      else setError("failed");
    } catch {
      setError(navigator.onLine ? "failed" : "offline");
    } finally {
      setDraft(null);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />

      <fieldset className="mb-4">
        <legend className="label">{c.modeLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {coachModes.map((mode) => (
            <label key={mode} className="cursor-pointer">
              <input
                type="radio"
                name="coach-mode"
                className="peer sr-only"
                checked={chat.value.mode === mode}
                onChange={() => void chat.save({ ...chat.value, mode })}
              />
              <span className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 peer-checked:border-river peer-checked:bg-river-soft peer-checked:font-bold peer-checked:text-river peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {c.modes[mode]}
              </span>
            </label>
          ))}
        </div>
        <p className="help">{c.modeHelp[chat.value.mode]}</p>
      </fieldset>

      <div className="panel min-h-64 space-y-3" role="log" aria-live="polite" aria-label={c.title}>
        {messages.length === 0 && draft === null && <p className="text-ink-soft">{c.empty}</p>}
        {messages.map((msg, i) => (
          <Bubble key={i} who={msg.role} label={msg.role === "user" ? c.you : c.coachName} text={msg.content} />
        ))}
        {draft !== null && <Bubble who="assistant" label={c.coachName} text={draft || "…"} />}
        {busy && draft === "" && (
          <p className="flex items-center gap-2 text-sm text-ink-soft" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {c.thinking}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="mt-3 font-bold text-danger">
          {c.errors[error]}
          {detail && <span className="mt-1 block text-sm font-normal break-words">{detail}</span>}
        </p>
      )}
      {safety && (
        <div className="mt-3">
          <SafetyCard kind={safety} onBack={() => setSafety(null)} />
        </div>
      )}

      <form onSubmit={send} className="mt-4">
        <label htmlFor="coach-input" className="label">
          {c.inputLabel}
        </label>
        <textarea
          id="coach-input"
          className="field min-h-24"
          value={text}
          maxLength={2000}
          placeholder={c.inputPlaceholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <p className="help">{c.privacyNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
            <Send className="size-4" aria-hidden="true" />
            {c.send}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => window.confirm(c.clearConfirm) && void chat.save({ mode: chat.value.mode, messages: [] })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {c.clear}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function Bubble({ who, label, text }: { who: "user" | "assistant"; label: string; text: string }) {
  const mine = who === "user";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <span className="mb-0.5 text-xs font-bold text-ink-soft">{label}</span>
      <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap ${mine ? "bg-river text-on-river" : "bg-surface-2"}`}>{text}</p>
    </div>
  );
}
