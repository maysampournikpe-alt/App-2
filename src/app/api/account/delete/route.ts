import { createSupabaseAdmin } from "@/lib/supabase/admin";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Deletes the signed-in student's account. Every table row they own is removed too
// (the tables reference auth.users with "on delete cascade").
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ status: "error", code: "unauthorized" }, 401);

  const admin = createSupabaseAdmin();
  if (!admin) return json({ status: "error", code: "notConfigured" }, 503);

  // Only ever delete the account the token belongs to, never one named by the request.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ status: "error", code: "unauthorized" }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error("delete account failed", deleteError.message);
    return json({ status: "error", code: "failed" }, 502);
  }
  return json({ status: "ok" });
}
