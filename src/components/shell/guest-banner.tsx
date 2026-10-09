"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { useMessages } from "@/i18n/client";

/** One dismissible line telling guests their data lives on this device. */
export function GuestBanner() {
  const m = useMessages();
  // Hidden until we know: avoids a flash for students who dismissed it or are signed in.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    let dismissedBefore = false;
    try {
      dismissedBefore = window.sessionStorage.getItem("rumbo-guest-banner") === "1";
    } catch {
      // ignore
    }
    if (dismissedBefore) return;
    const supabase = getSupabase();
    const check = supabase ? supabase.auth.getSession().then(({ data }) => Boolean(data.session)) : Promise.resolve(false);
    void check.then(setDismissed);
  }, []);
  if (dismissed) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-river-soft px-4 py-2 text-center text-sm">
      <p>
        {m.me.guestBanner}{" "}
        <Link href="/me" className="font-bold text-river underline">
          {m.me.guestLearn}
        </Link>
      </p>
      <button
        type="button"
        className="icon-btn size-8"
        aria-label={m.me.dismiss}
        onClick={() => {
          setDismissed(true);
          try {
            window.sessionStorage.setItem("rumbo-guest-banner", "1");
          } catch {
            // ignore
          }
        }}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
