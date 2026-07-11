-- ═══════════════════════════════════════════════════════════════
-- 013 — Admin audit log (foundation, precedes any new admin powers)
--
-- admin_audit_log is append-only: RLS is enabled with a SELECT policy
-- for admins only, and there are deliberately NO insert/update/delete
-- policies on the table. The only way a row gets written is through
-- log_admin_action(), a SECURITY DEFINER function that re-checks
-- is_admin() itself and stamps actor_id from auth.uid() server-side
-- (never trusts a client-supplied actor id). Because the table has no
-- INSERT policy, direct inserts are denied for every role, including
-- admins acting outside the function — so even admins cannot quietly
-- edit or backfill history.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_entity  on public.admin_audit_log(entity_type, entity_id);
create index if not exists idx_admin_audit_log_actor   on public.admin_audit_log(actor_id);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_select_audit_log"
  on public.admin_audit_log for select
  using (public.is_admin());

-- No insert/update/delete policies — direct table writes are denied
-- for every role. The function below is the only writer.

create or replace function public.log_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_before jsonb default null,
  p_after jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after);
end;
$$;

revoke all on function public.log_admin_action(text, text, uuid, jsonb, jsonb) from public;
grant execute on function public.log_admin_action(text, text, uuid, jsonb, jsonb) to authenticated;
