"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { syncNow } from "@/lib/sync";

/** Keeps this device and the student's account in step while they are signed in. */
export function SyncRunner() {
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let userId: string | null = null;
    const run = () => {
      if (userId && navigator.onLine) syncNow(supabase, userId).catch(() => undefined);
    };
    void supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user.id ?? null;
      run();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userId = session?.user.id ?? null;
      run();
    });
    const timer = window.setInterval(() => document.visibilityState === "visible" && run(), 30_000);
    window.addEventListener("online", run);
    window.addEventListener("pagehide", run);
    return () => {
      sub.subscription.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("online", run);
      window.removeEventListener("pagehide", run);
    };
  }, []);
  return null;
}
