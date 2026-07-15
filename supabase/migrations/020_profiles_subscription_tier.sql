-- ═══════════════════════════════════════════════════════════════
-- 020 — profiles.subscription_tier
--
-- Gates the Kuula 360° tour on the property detail page behind a
-- 'premium' subscription tier. Admin-managed only (no self-service
-- upgrade flow yet) — set from the Users section's UserDetailModal,
-- same pattern as the existing role dropdown.
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium'));
