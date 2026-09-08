-- ═══════════════════════════════════════════════════════════════
-- 054 — change_log: comprehensive, every-table change history
-- DRAFTED FOR REVIEW, NOT APPLIED. Same review discipline as every
-- prior migration tonight: this file has not been run against the
-- database. Do not apply until reviewed line by line. This touches
-- every table in the public schema via a dynamic DO block — review
-- the exclusion list at the bottom especially carefully.
--
-- WHY THIS EXISTS: this directly addresses the property-deletion
-- incident earlier tonight, which stayed unresolved because nothing
-- in this database recorded what changed, when, or by what path.
-- Two tables already carry "audit" in their name and neither would
-- have helped: `audit_logs` (001_nivila_schema.sql) is schema-only —
-- grepped the entire src/ tree and every migration, nothing anywhere
-- ever inserts into it, so it has never recorded a single row.
-- `admin_audit_log` (013_admin_audit_log.sql) is real and live, but
-- deliberately narrow: it only records a write when application code
-- explicitly calls log_admin_action() — which today only happens from
-- the admin panel's own action handlers. It captures nothing from the
-- overwhelming majority of writes in this app (sellers editing their
-- own listings, agents updating their own profile, become-an-agent's
-- insert/update, etc.), and nothing from service-role scripts or raw
-- SQL. change_log is a different, complementary concern: naming kept
-- deliberately distinct from both existing tables to avoid confusion
-- with either. It does not replace admin_audit_log, which still
-- records deliberate app-level admin actions with the admin's actual
-- intent (an action name, not just a row diff) — change_log is the
-- comprehensive, source-agnostic safety net underneath it.
--
-- WHAT changed_by / changed_by_role CAN AND CANNOT TELL YOU (read
-- this before relying on it during a future incident):
--   changed_by (auth.uid()) is non-NULL only when the write came from
--   a request carrying a specific authenticated end-user's JWT — a
--   real logged-in user's own session. It is NULL for an anonymous
--   visitor's request, a service-role-key request, AND a raw SQL
--   statement run directly against Postgres.
--
--   changed_by_role (auth.role()) is MORE informative than "unknown
--   for anything non-session" — a service-role-key request still
--   travels through PostgREST carrying a JWT with role:'service_role'
--   (Supabase's service key is itself a JWT), so this column CAN and
--   will distinguish 'authenticated' (a real user's session) from
--   'anon' (an anonymous public request — this app does allow
--   anonymous property_listings inserts, e.g. post-property.tsx) from
--   'service_role' (an admin script or server route using the service
--   key). What genuinely cannot be distinguished — the one honest,
--   irreducible gap — is a write made via a raw, direct Postgres
--   connection entirely outside PostgREST (the Supabase SQL Editor, a
--   direct psql/connection-string script): there is no
--   request.jwt.claims setting in that context at all, so
--   changed_by_role is NULL there too, same as changed_by. This is a
--   known, accepted limitation, not a bug — it is still a strictly
--   better position than today's total blindness, since the what/when
--   of a raw-SQL deletion would still be captured in full, even if the
--   who stayed unknown.
--
-- STORAGE / PERFORMANCE TRADEOFF, EXPLICITLY ACCEPTED, NOT A BUG:
-- comprehensive coverage means a full JSONB snapshot of the old and
-- new row on every single insert/update/delete on every table,
-- including high-frequency, low-stakes tables like `notifications`
-- and `messages`. This is unambiguously the right call for the tables
-- that actually matter (property_listings, agent_profiles, deals,
-- reports) and carries real, accepted costs elsewhere: steady storage
-- growth proportional to total write volume across the whole app, and
-- a small per-write overhead (one extra INSERT) on every table, not
-- just the ones anyone will ever query. Given the explicit instruction
-- — every table, no exceptions — this migration does not attempt to
-- selectively exclude high-frequency tables; a future migration could
-- narrow coverage or add retention/pruning if storage growth becomes
-- a real problem, but that is a separate, later decision, not made
-- silently here.
-- ═══════════════════════════════════════════════════════════════

-- 1. change_log table.
create table if not exists public.change_log (
  id               uuid primary key default gen_random_uuid(),
  table_name       text not null,
  operation        text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  -- Cast to text since primary key types vary across tables (uuid
  -- almost everywhere per this codebase's own convention, confirmed
  -- across every CREATE TABLE checked tonight — but text keeps this
  -- generic and never fails regardless). Extracted defensively via
  -- to_jsonb(...)->>'id' in the trigger function below: a future
  -- table whose primary key isn't literally named "id" would simply
  -- log row_id as NULL for that table, not error the whole write.
  row_id           text,
  old_data         jsonb,
  new_data         jsonb,
  changed_by       uuid,
  changed_by_role  text,
  changed_at       timestamptz not null default now()
);

create index if not exists idx_change_log_table_name on public.change_log(table_name);
create index if not exists idx_change_log_changed_at on public.change_log(changed_at desc);
create index if not exists idx_change_log_row_id     on public.change_log(row_id);

-- 2. RLS — admin-only SELECT, no write policy for anyone. Immutable,
--    permanent record, same shape as admin_audit_log (013),
--    deals/documents/call_logs/consent_events: the only writer is the
--    SECURITY DEFINER trigger function below, which bypasses RLS to
--    insert regardless of who/what triggered the underlying DML —
--    exactly like every other cross-user-write trigger tonight (042
--    notify_new_message/notify_deal_collaborator_added, 043
--    notify_task_assigned).
alter table public.change_log enable row level security;

create policy "admin_select_change_log"
  on public.change_log for select
  using (public.is_admin());

-- No insert/update/delete policies — direct table writes are denied
-- for every role, including admins. log_table_change() is the only
-- writer, and it runs via the trigger mechanism, not a callable RPC.

-- 3. Generic trigger function — one function, every table, no
--    per-table customization. TG_TABLE_NAME/TG_OP/to_jsonb(OLD/NEW)
--    are all supplied automatically by Postgres to every trigger
--    invocation, which is what makes a single generic function
--    possible here instead of one function per table.
create or replace function public.log_table_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_id text;
begin
  if TG_OP = 'DELETE' then
    v_row_id := to_jsonb(OLD) ->> 'id';
  else
    v_row_id := to_jsonb(NEW) ->> 'id';
  end if;

  insert into public.change_log (
    table_name, operation, row_id, old_data, new_data, changed_by, changed_by_role
  ) values (
    TG_TABLE_NAME,
    TG_OP,
    v_row_id,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    auth.uid(),
    auth.role()
  );

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- No REVOKE/GRANT here, deliberately unlike log_admin_action (013):
-- that function is called directly by client code via .rpc() and
-- needs its EXECUTE privilege locked down to 'authenticated' only.
-- log_table_change() is never called directly by anyone — it only
-- ever runs as a trigger body, invoked automatically by the DML
-- engine — so there is no direct-call surface to lock down, matching
-- every other trigger function already in this codebase (e.g.
-- set_agent_profile_slug, notify_new_message: no REVOKE/GRANT on any
-- of them either).

-- 4. Attach the trigger to every base table in the public schema,
--    dynamically, at apply time — not a hardcoded list. This is
--    deliberate: no reliable, complete, confirmed-live table list was
--    available while drafting this file (this session has no live-DB
--    query tool; the migration-history-derived list is known to be
--    incomplete — e.g. `inquiries` has no CREATE TABLE migration
--    anywhere in this repo at all). Querying pg_tables at the moment
--    this migration actually runs sidesteps that gap entirely: it
--    will always attach to whatever tables genuinely exist in the
--    live database at apply time, including any this file's author
--    was never able to fully enumerate in advance.
--
--    Three explicit exclusions:
--      'change_log'     — itself; without this the trigger would log
--                          its own inserts into itself, recursing.
--      'audit_logs'      — confirmed dead (see header) — no point
--                          auditing a table nothing ever writes to.
--      'spatial_ref_sys' — a PostGIS system table living in the
--                          public schema, not application data (per
--                          the 58-real-table count this migration was
--                          scoped against, which explicitly excluded
--                          it) — auditing a PostGIS extension's own
--                          internal reference table is out of scope
--                          and could interact unpredictably with
--                          PostGIS-managed writes to it.
--    Every other table — including admin_audit_log itself and every
--    legacy/dead table (agents, properties, leads, lead_activities,
--    appointments, etc.) — gets the trigger, per the explicit "every
--    table, no exceptions" instruction this migration was scoped to.
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('change_log', 'audit_logs', 'spatial_ref_sys')
  loop
    execute format(
      'drop trigger if exists trg_change_log on public.%I;
       create trigger trg_change_log
       after insert or update or delete on public.%I
       for each row execute function public.log_table_change();',
      t.tablename, t.tablename
    );
  end loop;
end;
$$;
