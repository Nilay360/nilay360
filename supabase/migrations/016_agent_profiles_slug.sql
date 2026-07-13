-- ═══════════════════════════════════════════════════════════════
-- 016 — agent_profiles.slug (fixes /agents/[slug] real-data wiring)
--
-- /agents/[slug] was running entirely on hardcoded demo data with
-- non-UUID ids ("a1", "a2"...), which silently breaks anything that
-- needs a real agent_profiles UUID — including the new Report button
-- (Tier 2). This migration adds a slug column and auto-generates it
-- from profiles.full_name via trigger, so every future agent_profiles
-- row (not just the two live approved agents today) gets a working
-- slug without another migration later.
--
-- Verified against live data before writing this: two approved
-- agent_profiles rows exist. One has full_name "ramana murthy"; the
-- other has full_name = '' (empty string, not null) — the slugify
-- logic below treats empty-after-trim the same as null, falling back
-- to "agent", to avoid producing an empty slug for that row.
-- ═══════════════════════════════════════════════════════════════

alter table public.agent_profiles add column if not exists slug text;

create or replace function public.set_agent_profile_slug()
returns trigger
language plpgsql
as $$
declare
  full_name  text;
  base_slug  text;
  candidate  text;
  n          int := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  select p.full_name into full_name from public.profiles p where p.id = new.user_id;

  base_slug := lower(regexp_replace(
    regexp_replace(coalesce(nullif(trim(full_name), ''), 'agent'), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'agent'; end if;

  candidate := base_slug;
  while exists (
    select 1 from public.agent_profiles
    where slug = candidate and id is distinct from new.id
  ) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists trg_agent_profiles_slug on public.agent_profiles;
create trigger trg_agent_profiles_slug
  before insert or update on public.agent_profiles
  for each row execute function public.set_agent_profile_slug();

-- Backfill existing rows (both today's two approved agents and any
-- pending/rejected ones) by forcing the trigger to run on an update
-- that doesn't touch slug — NEW.slug carries over as null/empty for
-- rows that don't have one yet, so the trigger fills it in.
update public.agent_profiles set updated_at = now() where slug is null or slug = '';

alter table public.agent_profiles alter column slug set not null;

drop index if exists idx_agent_profiles_slug;
create unique index idx_agent_profiles_slug on public.agent_profiles(slug);
