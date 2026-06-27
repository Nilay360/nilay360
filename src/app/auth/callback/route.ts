import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // flow_state_already_used or flow_state_not_found means the first hit
    // already established the session — check if session exists and redirect cleanly
    if (
      error.code === "flow_state_already_used" ||
      error.code === "flow_state_not_found"
    ) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Session not found either — send home, not to error page
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Genuine failure — bad or missing code
  return NextResponse.redirect(`${origin}/auth/error`);
}
