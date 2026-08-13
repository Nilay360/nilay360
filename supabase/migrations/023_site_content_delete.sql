-- ═══════════════════════════════════════════════════════════════
-- 023 — Allow admins to delete site_content rows
--
-- 021_site_content.sql deliberately omitted a DELETE policy: at the
-- time, site_content was a small fixed set of keys the app read by
-- name, and removing one should have been a deliberate code change.
-- The admin panel now supports full key management (add/edit/delete
-- any key), so this adds an admin-gated DELETE policy consistent
-- with the existing insert/update ones.
-- ═══════════════════════════════════════════════════════════════

create policy "site_content_admin_delete"
  on public.site_content for delete
  using (public.is_admin());
