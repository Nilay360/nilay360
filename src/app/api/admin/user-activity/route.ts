import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const ACTIVE_WINDOW_DAYS = 30;

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const adminClient = getAdminClient();
  const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const lastSignIns: Record<string, string | null> = {};

  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const u of data.users) lastSignIns[u.id] = u.last_sign_in_at ?? null;
    if (data.users.length < perPage) break;
    page += 1;
  }

  const activeUserIds = Object.entries(lastSignIns)
    .filter(([, lastSignIn]) => lastSignIn != null && new Date(lastSignIn).getTime() >= cutoff)
    .map(([id]) => id);

  return NextResponse.json({
    activeWindowDays: ACTIVE_WINDOW_DAYS,
    activeUserCount: activeUserIds.length,
    lastSignIns,
  });
}
