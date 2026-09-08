import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { recordConsent } from "@/lib/consent";

// Consent capture here is idempotent (see recordConsent) and fires on every
// successful OAuth callback regardless of whether this is a brand-new
// signup or a returning user logging in again, and regardless of whether
// the "Continue with Google" button was clicked from the Sign In tab or
// the Register tab — both hit this same callback, and OAuth itself never
// distinguishes new vs. returning. First login ever records it once;
// every login after that is a no-op.
async function captureOAuthConsent(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await recordConsent(supabase, {
    userId: user.id,
    context: "oauth",
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: request.headers.get("user-agent"),
  });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await captureOAuthConsent(request, supabase);
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
        await captureOAuthConsent(request, supabase);
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Session not found either — send home, not to error page
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Genuine failure — bad or missing code
  return NextResponse.redirect(`${origin}/auth/error`);
}
