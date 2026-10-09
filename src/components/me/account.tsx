"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useMessages } from "@/i18n/client";
import { authConfigured, getSupabase } from "@/lib/supabase/client";
import { Section } from "@/components/ui";

/** Sign-in. Students under 13 are guests only: no account, no email. */
export function AccountSection({ locked }: { locked: boolean }) {
  const a = useMessages().me.account;
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=/me`;

  async function emailLink(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    setMessage(error ? { text: a.error, bad: true } : { text: a.linkSent, bad: false });
    setBusy(false);
  }

  async function signOut(scope: "local" | "global") {
    await getSupabase()?.auth.signOut({ scope });
  }

  return (
    <Section title={a.heading}>
      <div className="panel space-y-4">
        {session ? (
          <>
            <p className="font-bold">{a.signedInAs(session.user.email ?? "")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => signOut("local")}>
                {a.signOut}
              </button>
              <button type="button" className="btn-secondary" onClick={() => signOut("global")}>
                {a.signOutEverywhere}
              </button>
            </div>
          </>
        ) : !authConfigured ? (
          <p>{a.notReady}</p>
        ) : locked ? (
          <p>{a.under13Locked}</p>
        ) : (
          <>
            <p>{a.guestBody}</p>
            <form onSubmit={emailLink} className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <label htmlFor="acct-email" className="label">
                  {a.emailLabel}
                </label>
                <input id="acct-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <button type="submit" className="btn-primary" disabled={busy}>
                {a.emailLink}
              </button>
            </form>
          </>
        )}
        <p role="status" className={message?.bad ? "font-bold text-danger" : "font-bold text-river"}>
          {message?.text}
        </p>
      </div>
    </Section>
  );
}
