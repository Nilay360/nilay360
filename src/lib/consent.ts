import type { SupabaseClient } from "@supabase/supabase-js";

// Server-only: records consent_events rows for the two mandatory legal
// documents (terms, privacy) a user must agree to. Used by both signup
// paths that hit AuthModal — phone-OTP (verify-otp/route.ts, 'registration'
// context) and Google OAuth (auth/callback/route.ts, 'oauth' context, called
// idempotently on every callback since OAuth doesn't distinguish new vs.
// returning users).
//
// Never throws and never blocks signup: a missing legal_documents version is
// a real gap (nothing has been published yet) that should be loud in server
// logs, not a reason to fail account creation, and not something this
// function papers over by guessing a version number.

const REQUIRED_DOCUMENT_TYPES = ["terms", "privacy"] as const;

export interface RecordConsentParams {
  userId: string;
  context: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function recordConsent(
  supabase: SupabaseClient,
  { userId, context, ipAddress, userAgent }: RecordConsentParams
): Promise<void> {
  for (const documentType of REQUIRED_DOCUMENT_TYPES) {
    try {
      const { data: currentDoc, error: docErr } = await supabase
        .from("legal_documents")
        .select("version")
        .eq("document_type", documentType)
        .eq("is_current", true)
        .maybeSingle();

      if (docErr || !currentDoc) {
        console.error(
          `[consent] No current legal_documents version for '${documentType}' — consent NOT recorded for user ${userId}. ` +
          `Seed a legal_documents row with is_current=true for this document_type before consent capture can work.`
        );
        continue;
      }

      // Idempotent: never record the same (user, document_type) twice. This
      // is what makes it safe to call unconditionally on every OAuth
      // callback, not just the first one.
      const { data: existing, error: existingErr } = await supabase
        .from("consent_events")
        .select("id")
        .eq("user_id", userId)
        .eq("document_type", documentType)
        .maybeSingle();

      if (existingErr) {
        console.error(`[consent] Failed checking existing consent for '${documentType}', user ${userId}:`, existingErr);
        continue;
      }
      if (existing) continue;

      const { error: insertErr } = await supabase.from("consent_events").insert({
        user_id: userId,
        document_type: documentType,
        document_version: currentDoc.version,
        context,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      if (insertErr) {
        console.error(`[consent] Failed to record consent for '${documentType}', user ${userId}:`, insertErr);
      }
    } catch (err) {
      console.error(`[consent] Unexpected error recording consent for '${documentType}', user ${userId}:`, err);
    }
  }
}
