import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Google and email links send the student back here with a one-time code.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Only allow same-site paths, so the link can't bounce a student to another website.
  const next = url.searchParams.get("next");
  const path = next && next.startsWith("/") && !next.startsWith("//") ? next : "/me";
  const supabase = await createSupabaseServer();
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(path, url.origin));
  }
  return NextResponse.redirect(new URL("/me?auth=error", url.origin));
}
