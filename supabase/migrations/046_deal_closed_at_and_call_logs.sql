-- ═══════════════════════════════════════════════════════════════
-- 046 — deals.closed_at + call_logs — DRAFTED FOR REVIEW, NOT
-- APPLIED. Same review discipline as every migration tonight: this
-- file has not been run against the database. Do not apply until
-- reviewed line by line.
--
-- Re-confirmed live before drafting (this session, fresh PostgREST
-- schema-cache check): deals has no closed_at column today, and no
-- table matching "call"/"call_log" (case-insensitive) exists anywhere
-- in the public schema.
--
-- Both additions exist for one reason: real Performance Analytics
-- metrics that cannot be computed accurately from today's schema.
-- Time-to-close (how long a deal takes from creation to closing) has
-- no data source at all right now — deals.updated_at is overwritten
-- by every subsequent edit (price correction, notes update, stage
-- change to something other than closed), so it cannot be trusted to
-- mean "when this deal closed." Call volume similarly has no data
-- source — no table anywhere records that an agent made or received a
-- call. Without these, any "time-to-close" or "calls per deal" number
-- shown in Performance Analytics would have to be fabricated or
-- silently wrong; this migration exists so those metrics can be real.
-- ═══════════════════════════════════════════════════════════════

-- ── PART A — deals.closed_at ────────────────────────────────────

-- 1. Column. Nullable — most deals are not (yet) closed.
ALTER TABLE deals ADD COLUMN closed_at timestamptz;

-- 2. BEFORE INSERT OR UPDATE trigger — sets/clears closed_at based on
-- stage, at the DB level rather than client-side, so analytics
-- accuracy doesn't depend on every UI path that can set or change
-- deal.stage remembering to also stamp/clear this column. Does NOT
-- touch lost_reason's existing behavior (client-side, in
-- src/app/agent/deals/[id]/page.tsx) at all — separate column,
-- separate concern, not consolidated here.
--
-- One function handling both INSERT and UPDATE (branching on TG_OP),
-- not two separate functions: the two cases share the same underlying
-- rule ("closed_at should reflect whether this row is currently in
-- the 'closed' stage") and the same column they're allowed to touch —
-- splitting them into two functions would mean that rule's definition
-- lives in two places that could silently drift apart if one is
-- edited later and the other forgotten (the exact failure mode a
-- single shared function avoids). The two branches genuinely differ
-- in shape, though, which is why they're not merged into one
-- condition: INSERT has no OLD row to compare against, and — per
-- explicit instruction — INSERT alone respects a caller-supplied
-- closed_at (only defaults it when the caller left it null); UPDATE
-- has no such carve-out, since deliberately overriding a caller's
-- stage-vs-closed_at mismatch on every subsequent edit is the entire
-- point of enforcing this at the DB level rather than trusting the
-- client every time.
--
-- No SECURITY DEFINER: unlike every cross-table trigger tonight
-- (notify_new_message, notify_deal_collaborator_added,
-- notify_task_assigned, enforce_task_update_columns), this trigger
-- only inspects OLD/NEW on the very row deals' own INSERT/UPDATE
-- policy already permitted this statement to touch — it reads no
-- other table and writes no other user's row, so there is no
-- cross-user or cross-table privilege gap to bypass. Plain SECURITY
-- INVOKER (the default) is correct here, not a proactive-but-
-- unnecessary escalation.
CREATE OR REPLACE FUNCTION public.set_deal_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage = 'closed' AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stage != 'closed' AND NEW.stage = 'closed' THEN
      NEW.closed_at := now();
    ELSIF OLD.stage = 'closed' AND NEW.stage != 'closed' THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_deal_insert_or_update_set_closed_at ON deals;
CREATE TRIGGER before_deal_insert_or_update_set_closed_at
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION public.set_deal_closed_at();

-- ── PART B — call_logs ──────────────────────────────────────────

-- 1. call_logs table.
CREATE TABLE call_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id  uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  inquiry_id        uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  deal_id           uuid REFERENCES deals(id) ON DELETE SET NULL,
  direction         text NOT NULL,
  notes             text,
  called_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz DEFAULT now(),

  -- A call must be about something — same pattern as
  -- documents_must_have_an_owner (031), narrower here since call_logs
  -- only ever links to an inquiry or a deal (no property/agent_profile
  -- attachment concept, unlike documents).
  CONSTRAINT call_logs_must_reference_something
    CHECK (inquiry_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_call_logs_agent_profile_id ON call_logs(agent_profile_id);
CREATE INDEX idx_call_logs_inquiry_id       ON call_logs(inquiry_id);
CREATE INDEX idx_call_logs_deal_id          ON call_logs(deal_id);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: the logging agent's own rows, or admin. Plain EXISTS, no
-- SECURITY DEFINER helper needed — this is a single self-ownership
-- check against agent_profiles, not a cross-table policy reference
-- of the shape 036/040/041 had to work around.
DROP POLICY IF EXISTS "Own call logs or admin can view call_logs" ON call_logs;
CREATE POLICY "Own call logs or admin can view call_logs"
  ON call_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = call_logs.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- INSERT: identical structure, WITH CHECK against the row being
-- inserted — an agent may only log a call as themselves.
DROP POLICY IF EXISTS "Own call logs or admin can insert call_logs" ON call_logs;
CREATE POLICY "Own call logs or admin can insert call_logs"
  ON call_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_profiles ap
      WHERE ap.id = call_logs.agent_profile_id
        AND ap.user_id = auth.uid()
        AND ap.status = 'approved'
    )
    OR public.is_admin()
  );

-- No UPDATE/DELETE policy: call_logs is a permanent activity record,
-- same as deals (030) and documents (031) — logged once, never edited
-- or removed.
