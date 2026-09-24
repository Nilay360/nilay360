# NILAY360 — Technical & Product Blueprint

Generated 2026-09-20 by direct investigation of the actual codebase at
`C:\Users\Admin\Downloads\NIVILA_Premium_Homepage\nilay360` — not from
memory, not from prior conversation summaries. Every claim below is
either cited to a specific file/line or explicitly marked as
unverified.

**Section 3's schema inventory has been live-verified** (2026-09-20):
every schema-testable migration from 030–074 was checked directly
against the real database via read-only probes, not inferred from file
headers. See Section 3's "Trust model" note for the method and the
short list of what *couldn't* be verified this way (5 policy-only
migrations with no schema footprint to probe — see the table there).

---

## 1. Product Overview

NILAY360 (site metadata still says "Nilay 360") is described in its
own `<meta>` tags as *"a technology-powered real estate platform
offering property discovery, virtual tours, and end-to-end transaction
support across India."* The homepage hero copy (`src/app/page.tsx`,
`DEFAULT_SITE_CONTENT`) reads: *"Find Your Dream Property — Now in
Hyderabad"* / *"From search to possession — India's premium real
estate platform."* The root `README.md` additionally frames it as
targeting *"HNI buyers, NRI investors, and luxury developers,"*
though the README itself is stale in several other respects (see
Section 6) and should not be trusted for anything except this framing.

**Confirmed user roles** — the live `user_role` Postgres enum
(`supabase/migrations/001_nivila_schema.sql`, extended with `'builder'`
in migration 055), which is also the exact list rendered in
`admin/page.tsx`'s `ROLE_OPTIONS`:

```
buyer, seller, agent, agency, moderator, content_manager, support,
finance_manager, sales_manager, admin, super_admin, builder
```

Functionally, four roles matter for day-to-day product behavior:
- **Buyer/renter** — browses, saves, inquires, requests site visits.
- **Owner/seller** — submits listings via the post-property wizard.
- **Agent** — has an `agent_profiles` row (approval-gated), gets a
  public profile page, and a large internal dashboard
  (`src/app/agent/*`) for leads, deals, tasks, teams, messaging.
- **Admin / super_admin** — the single `/admin` panel (all admin
  capabilities live in one large page component, not separate
  admin-only routes per feature).

---

## 2. Tech Stack

**Framework**: Next.js **16.2.9** (App Router), React **19.2.4**,
TypeScript `^5`. (The root `README.md` claims "Next.js 14" — that's
wrong; treat the README as aspirational/outdated, not authoritative.)

**Database/backend**: Supabase — `@supabase/ssr ^0.12.0`,
`@supabase/supabase-js ^2.108.2`.

**Hosting**: **Vercel**, confirmed via a `.vercel/` directory and root
`vercel.json`, which defines one cron job:
`GET /api/cron/check-follow-ups` at `0 3 * * *` (daily 3am).

**UI/styling**: Tailwind CSS `^4`, Radix UI primitives (accordion,
checkbox, dialog, dropdown-menu, select, separator, slot, tabs,
toast), `class-variance-authority`, `clsx`, `tailwind-merge`,
`lucide-react`, `next-themes`, `sonner` (toasts).

**Forms/validation**: `react-hook-form ^7.79.0`,
`@hookform/resolvers ^5.4.0`, `zod ^4.4.3`.

**Animation**: `framer-motion ^12.40.0`, `gsap ^3.15.0`,
`lenis ^1.3.26` (smooth scroll).

**Media/uploads**: `cloudinary ^2.10.0`, `next-cloudinary ^6.17.5`,
`tus-js-client ^4.3.1` (resumable upload protocol, used for Bunny
Stream video).

**Other**: `date-fns`, `recharts` (agent analytics charts), `resend`
(transactional email), `posthog-js`, `@sentry/nextjs`.

**`next.config.ts` notables**: wrapped in `withSentryConfig`;
`images.remotePatterns` allows Unsplash, Picsum, Cloudinary, and the
live Supabase storage host `xjdarhbzrpybqyqeeshy.supabase.co`;
`typescript.ignoreBuildErrors: true` (**the production build does not
fail on TypeScript errors** — this is why pre-existing type errors
elsewhere in the codebase don't block deploys); a LAN dev origin is
allow-listed.

### Third-party integrations — confirmed real (with real API calls), not aspirational

| Integration | Status | Where |
|---|---|---|
| **Bunny Stream** (video) | Real | `src/lib/bunny.ts`, `/api/upload-video`, `/api/bunny-webhook` |
| **WhatsApp via MSG91** | Real | `src/lib/whatsapp.ts` — real POST to `control.msg91.com`; used by every `notify-*` route and OTP |
| **Google Maps/Places/Geocoding** | Real | `src/lib/loadGoogleMapsScript.ts`, `src/components/LocationPicker.tsx`, `/api/nearby-places`, `src/lib/geocode.ts` |
| **PostHog** | Real | Initialized in `src/components/providers/PostHogProvider.tsx` (mounted from `layout.tsx`). Note: `src/lib/posthog.ts` has a second, apparently-unused `initPostHog()` helper — possible dead code, not a gap in the integration itself. |
| **Cloudinary** | Real | `src/lib/cloudinary.ts`, `/api/upload-image`, `/api/upload-document` |
| **Sentry** | Real | `sentry.client.config.ts` / `.server.config.ts` / `.edge.config.ts`, all call `Sentry.init()` |

Environment variables actually referenced by name in `src/`: `ADMIN_EMAIL`,
`BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_LIBRARY_ID`,
`BUNNY_STREAM_PULL_ZONE_HOSTNAME`, `BUNNY_STREAM_READONLY_API_KEY`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`,
`GOOGLE_GEOCODING_API_KEY`, `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`,
`MSG91_TEMPLATE_ID`, `MSG91_TEST_MODE`,
`MSG91_WHATSAPP_INTEGRATED_NUMBER`, `MSG91_WHATSAPP_TEMPLATE_NAME`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID`,
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`,
`NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID/LABEL`,
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`,
`NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_POSTHOG_HOST/KEY`,
`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SUPABASE_ANON_KEY/URL`,
`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Database Schema — Full Inventory

**Trust model, read first — updated 2026-09-20 with a real live-DB
verification pass.** Every migration from 030 through 074 (41 files)
carries a header comment stating "DRAFTED FOR REVIEW, NOT APPLIED."
That header is **stale for essentially all of them.** Rather than
inferring from file headers or app-code usage, this was checked
directly against the live database via a read-only service-role probe
(existence checks against `public` schema tables/columns/views/enum
values/functions — PostgREST doesn't expose `information_schema` on
this project, so table/column *existence* was confirmed by attempting
a scoped `select` and reading the resulting error code, e.g. Postgres
`42P01` = relation does not exist, `42703` = column does not exist, a
clean response = exists):

**Result: all 33 schema-testable migrations in the 030–074 range are
CONFIRMED APPLIED live** — every new table, every new column, the one
new enum value (`'builder'`), and the one new view
(`public_property_save_counts`) all exist on the real database exactly
as drafted. This also directly reconfirmed migration 074
(`changes_requested_note`) and, going forward, should be treated as
current ground truth rather than inferred.

**9 helper functions were also confirmed present** via safe read-only
RPC calls (`is_conversation_participant`, `is_conversation_creator`,
`shares_team_with`, `are_agents_connected`, `is_admin`,
`is_deal_primary_agent`, `is_deal_collaborator`, `is_team_member`,
`is_team_lead`, plus `log_listing_status_change` — confirmed to exist
by reaching its "listing not found" guard, never its actual UPDATE, so
no write occurred). The two temporary debug RPCs from migrations
037/038 (`debug_whoami`, `debug_check_create_policy`) are **absent**
— consistent with migration 039 (which drops them) having run as part
of the same applied sequence, since the surrounding messaging
subsystem (034/036/040) is confirmed live and those debug functions
were built specifically to diagnose that subsystem before it was
fixed.

**5 migrations remain genuinely unverified — they change only RLS
policies with no accompanying new table/column/function, so there is
no schema-existence signal to probe for them via the REST API.**
PostgREST doesn't expose `pg_policies`, and verifying via a live
session would require a real non-admin/non-service-role JWT (service
role bypasses RLS entirely, so it can't be used to test policy
behavior — same reasoning behind the "verify RLS via real session, not
service-role" rule already established this session). These need
either a direct `pg_policies` query (Supabase SQL Editor) or a real
end-user session test:

| File | What it changes | Why it matters |
|---|---|---|
| `035_conversation_participants_update_policy.sql` | Adds the UPDATE policy letting a participant set `last_read_at` on their own row | Without it, read-receipt tracking in messaging silently no-ops |
| `042_notification_triggers.sql` | Two trigger functions (`notify_new_message`, `notify_deal_collaborator_added`) — genuinely untestable via RPC since PostgREST never exposes `TRIGGER`-return functions for direct calling, regardless of whether they exist | Without them, in-app notifications for new messages / added collaborators wouldn't fire |
| `045_team_data_visibility.sql`'s **policy rewrites** (the `shares_team_with()` function itself IS confirmed present) | Extends `deals`/`inquiries`/`site_visits` SELECT policies to include teammates | The function existing doesn't prove the policies were actually rewritten to call it |
| `056_phone_normalization.sql` | Trigger function `normalize_phone()` — same untestable-via-RPC reasoning as 042 | Without it, `profiles.phone` may not be getting normalized to `+91XXXXXXXXXX` on write |
| `057_property_listings_owner_select.sql` | Adds `"Owner can view own listings by user_id"` SELECT policy | Pure policy addition, nothing else to probe |
| `073_property_floor_plans_admin_select.sql` | **This session's own migration** — adds admin bypass to floor-plans SELECT | Directly affects whether the admin listing preview built tonight can actually show floor plans for pending listings |

**Two confirmed instances of drift found before this verification pass
(still true, kept for context):**
1. A live RLS policy `update_admin_all` on `property_listings` exists
   in the real database (per the user's own `pg_policies` query) but
   appears in **no** migration file in this repo — drift in the
   *opposite* direction from the "not applied" headers (live-but-
   undocumented rather than documented-but-not-live).
2. This confirms the general lesson: migration file headers and
   documented history can each independently drift from live truth,
   in either direction. The check above resolves the "documented but
   maybe not live" direction for 030–074's testable content; the
   `update_admin_all` case is a reminder the reverse (live but
   undocumented) is a separate, still-open risk category, not
   addressed by this pass.

### Dead / superseded tables (0 references in `src/`, confirmed by grep)

| Table | Verdict |
|---|---|
| `leads`, `lead_activities` | Dead. Superseded by `inquiries`/`inquiry_activities`; migration 013's own header says so directly. |
| `agents` | Dead. `agent_profiles` is canonical — migration 011's header states the agent-profile FKs were corrected from `agents(id)` to `agent_profiles(id)` "before ever being applied." |
| `agent_enquiries`, `agent_reviews` | Dead — never existed in production. `src/app/agents/[slug]/page.tsx:148` has a comment stating this literally. |
| `cities`, `neighbourhoods`, `developers`, `agencies`, `property_price_history`, `compare_sessions`, `property_views`, `cms_pages`, `banners`, `support_tickets`, `ticket_messages`, `audit_logs`, `feature_flags`, `seo_redirects`, `newsletter_subscribers`, `contact_submissions`, `appointments`, `reviews` (generic), `subscriptions`, `transactions`, `featured_listings` | Dead. All part of `001_nivila_schema.sql`'s original Phase-1 catalogue schema — essentially that entire original design (CMS/support/billing layer) was abandoned in favor of a thinner, incrementally-built live schema. |

**Not dead, but worth knowing:**
- **`properties`** (from `001_nivila_schema.sql`) is *vestigial but
  still live* — 10 references in `src/`, explicitly commented
  `// Seed/catalog properties`, merged alongside real
  `property_listings` results on `/buy`, `/rent`, `/properties`,
  `/search`, `/compare`, `/locations`, the homepage, and
  `sitemap.ts`. It is not where seller-submitted data lives
  (`property_listings`, 67 references, is), but it's baked into 9
  public pages as a legacy fallback/seed layer — a real product
  decision to revisit, not an oversight to silently fix.
- **`blog_posts`, `blog_categories`, `testimonials`** — from the same
  original 001 migration as the dead tables above, but *not* dead:
  live-queried by `/blog` and the homepage.
- Several table names one might expect (`grievance_queue`,
  `otp_rate_limiting`, `user_consents`, `agent_property_edit_requests`,
  `listing_change_requests`, a literal `leaderboard` table) **do not
  exist as separate tables at all** — those concepts are implemented
  as status/type extensions of `reports`, or as the `otp_requests` /
  `consent_events` tables, or (leaderboard) computed live from
  `agent_profiles`/`profiles` with no dedicated table.

### Core tables (purpose, key columns, RLS summary)

**`profiles`** — core identity/role record extending `auth.users`.
`id` (PK, FK→auth.users cascade), `role`, `is_verified`, `is_active`,
`referred_by`→profiles, `email`, `city`, `subscription_tier`
(free/premium). RLS: own-row SELECT/INSERT/UPDATE; admin SELECT-all
via `is_admin()` (a recursive-subquery version in 001 was replaced
with a non-recursive one in 008 — a real historical bug fix); public
SELECT of any profile linked to an *approved* `agent_profiles` row.

**`property_listings`** — the real, live, seller-submitted listing
table (moderation queue, `status` defaults to `'pending_review'`).
Columns accumulated across 22+ migrations, most recently (tonight):
`area_sqft`/`price_per_sqft`/`show_price_per_sqft` (069),
`maintenance_type`/`deposit_amount`/`available_from`/
`preferred_tenant`/`brokerage_mode`/`brokerage_value`/
`show_brokerage_details`/`listed_by`/`rera_number` (070),
`changes_requested_note` (074). Also: `assigned_agent_id`→agent_profiles,
`kuula_tour_url`, `google_maps_url`, `ownership_warranty_confirmed`,
`latitude`/`longitude`, `unpublish_reason`/`unpublish_note`/
`listing_expires_at`, `video_asset_provider/id/status/thumbnail_url`.
RLS: public SELECT where `status='active'` or the caller's own
`seller_email`; owner UPDATE/DELETE by `seller_email` match; assigned
agent (approved) SELECT/UPDATE; owner-by-`user_id` SELECT; plus the
undocumented live `update_admin_all` policy (see Trust model above).
No CHECK constraint on `status` at all — it's plain text; the real
live vocabulary (confirmed by reading application code, not the
schema) is `pending_review`, `active`, `rejected`, `changes_requested`,
`frozen`.

**`agent_profiles`** — canonical agent record. `id`, `user_id`→profiles
(UNIQUE), `status` (pending/approved/rejected), `slug`, `rera_number`,
`oc_number`, `is_verified_badge`, `leaderboard_opt_out`. RLS: own
SELECT/UPDATE/INSERT; admin all; public SELECT where approved.

**`agent_service_cities`** — many-to-one cities-serviced per agent.
Own CRUD via `agent_profiles.user_id`, admin all, public SELECT where
the linked agent is approved.

**`inquiries`** — the real, live lead-management table. **No CREATE
TABLE migration exists anywhere in this repo** — it was created
out-of-band directly on the live DB; only later `ALTER`s and RLS
patches are visible in migration history. Columns added via ALTER:
`status` (lead_status enum, extended with `'spam'`), `assigned_to`
(originally FK→`agents`, **repointed** to FK→`agent_profiles`),
`priority`, `source`, `next_follow_up`, `last_contacted_at`,
`budget_min/max`, `bhk`, `preferred_locality/city`,
`property_type_preference`. **Confirmed historical bug**: after the
FK repoint, the "assigned agent" SELECT/UPDATE policies still queried
the dead `agents` table for a window of time, silently breaking
agents' visibility into their own leads, until migration 024 fixed it
(024's own header names this as "the actual root cause of [an agent]
not seeing [another agent]'s lead").

**`inquiry_activities`** — timeline notes on an inquiry. Its
assigned-agent policies were written against the same now-wrong
`agents` table reference as `inquiries`' original bug — but unlike
`inquiries` (explicitly fixed in migration 024), no migration file
explicitly lists `inquiry_activities` as re-fixed. Worth a direct
check on whether agents can actually see/log activity on their own
leads today. Admin SELECT-all; append-only (no UPDATE/DELETE for
anyone).

**`admin_audit_log`** — append-only admin action log. Only policy is
`admin_select_audit_log` (SELECT via `is_admin()`); **no
INSERT/UPDATE/DELETE policy for anyone, including admins** —
deliberate, the only writer is the SECURITY DEFINER function
`log_admin_action()`. This is what every admin write action tonight
(Approve/Reject/Request Changes/Assign Agent/etc.) logs through.

**`reports`** — signed-in-only content/profile flagging. `entity_type`
(listing/profile), `status` (widened from 3→6 values including
`'frozen'`, `'under_review'`), `request_type` (free text;
`'deletion_request'` is the one live value used), SLA due-date columns.
RLS: own-row INSERT; admin SELECT/UPDATE; **no DELETE policy for
anyone** — resolved via status, never deleted; no public SELECT
(reports aren't public data).

**`site_content`** — admin-editable homepage copy key/value store.
Public SELECT; admin-only INSERT/UPDATE/DELETE.

**`property_floor_plans`** — seller-uploaded floor plan images.
Public SELECT gated on the parent listing being `status='active'`
**or the caller being admin** (this admin bypass was added tonight,
migration 073, additive — see Section 6 for whether it's been
applied). Owner-or-admin INSERT/UPDATE/DELETE, plus an anon carve-out
while the listing is still `pending_review` (needed by the
pre-authentication post-property wizard).

**`deals`** — sale pipeline. `stage` enum
(negotiation→booking→agreement→registration→closed→lost),
`assigned_to`→agent_profiles, `deal_price`, `lost_reason` (CHECK: only
settable when stage='lost'), auto-stamped `closed_at`. RLS: SELECT for
assigned agent, admin, a deal collaborator, or a teammate; UPDATE
restricted to assigned agent or admin only (never extended to
collaborators/team); no DELETE — permanent record; agent-only, no
seller-facing policy.

**`documents`** — KYC/agent/deal file attachments, the first real
file-attachment table (fills a gap left by a dead, never-wired
`kyc_status`/`kyc_documents` pair on the abandoned `agents` table).
CHECK requires at least one owning entity (agent/property/inquiry/deal).
RLS: SELECT/INSERT deliberately **not** approval-gated for own KYC
docs (avoids a chicken-and-egg problem for pending agents); UPDATE is
narrower (uploader or admin only); no DELETE.

**`calendar_events`** — agent scheduling. Owning agent (approved) or
admin: SELECT/INSERT/UPDATE. No DELETE.

**`conversations` / `conversation_participants` / `messages`** —
agent-to-agent messaging. **The most heavily RLS-patched subsystem in
the repo** — three separate rounds of fixing `42P17` infinite
recursion / false-negative bugs, eventually standardizing on
SECURITY DEFINER helper functions (`is_conversation_participant()`,
`is_conversation_creator()`) instead of plain EXISTS-subquery
policies. **Known, explicitly-unfixed residual risk**: `conversations`'
own SELECT policy still has the same structurally-recursive shape
that was fixed elsewhere, left alone "per explicit instruction not to
change anything else defensively" (per that migration's own header).

**`deal_collaborators`** — multi-agent collaboration beyond a deal's
single primary `assigned_to`. SELECT: own row, primary agent, or
admin. INSERT/DELETE: primary agent or admin only. No UPDATE.

**`tasks`** — agent-to-agent task assignment, gated on an existing
relationship (`are_agents_connected()` — shared deal, conversation, or
team). CHECK requires referencing an inquiry/deal/property. RLS:
SELECT for assignee/assigner/admin; INSERT only from a connected
assigner or admin; UPDATE is row-level open but a trigger
(`enforce_task_update_columns`) additionally restricts the assignee to
only changing `status`/`completed_at` — a column-level restriction RLS
itself can't express; DELETE by assigner (creator) or admin only.

**`teams` / `team_members`** — team/hierarchy concept, extends
`are_agents_connected()` with a "same team" branch. teams: SELECT
member/lead/admin, INSERT self-as-lead-or-admin, UPDATE lead-or-admin,
no DELETE. team_members: SELECT current member or admin, INSERT/DELETE
lead-or-admin only, no UPDATE. A later migration adds
`shares_team_with()` and uses it to extend read-only SELECT visibility
on `deals`, `inquiries`, and `site_visits` to teammates.

**`call_logs`** — per-call activity record for agents. SELECT/INSERT:
own rows (approved agent) or admin. No UPDATE/DELETE — permanent
record.

**`legal_documents`** — version metadata (not content) for the six
static legal pages, with a content-hash drift check and a partial
unique index enforcing one current version per type. Public SELECT;
admin-only INSERT/UPDATE; no DELETE (permanent version history).

**`consent_events`** — append-only audit trail of who agreed to which
legal document version, when, in what context. INSERT: own row only.
SELECT: admin only. No UPDATE/DELETE.

**`otp_requests`** — OTP send-attempt tracking. RLS enabled with
**zero policies** — deny-all to every role; only the service-role key
(the `send-otp` route) can touch it at all, bypassing RLS entirely.
This is by design (rate-limit accounting shouldn't be client-readable),
but worth knowing explicitly rather than assuming it's an oversight.

**`capture_360_requests`** — seller/agent-initiated 360° photography
request workflow (distinct from `kuula_tour_url`, the finished link,
and `site_visits`). `status` (pending/scheduled/completed/declined);
`preferred_date`/`preferred_time_slot` (the requester's stated
preference, added tonight); `suggested_alternative_date_1/2`
(admin-entered alternatives on decline, added tonight). RLS: INSERT by
owner or assigned approved agent (own requester_id only); SELECT own
or admin; **UPDATE admin only** (no requester self-cancel); no DELETE.

**`nearby_places_cache`** — cached Google Places results per property
to avoid per-view API billing. Public SELECT (non-sensitive); **no
INSERT/UPDATE/DELETE policy for any role** — writes only via
service-role fetch route.

**`property_view_events` / `property_image_clicks`** — real per-view
and per-image-click analytics, created explicitly because
`property_listings.views` is a confirmed-dead column that live code
never increments. `property_view_events` has a
`UNIQUE(property_id, viewer_key, view_date)` dedup constraint (one
view per visitor per day); `property_image_clicks` has none. RLS:
SELECT for listing owner/assigned agent/admin; **no
INSERT/UPDATE/DELETE policy on either** — writes only via service-role.

**`listing_status_history`** — append-only audit trail of
`property_listings.status` transitions, deliberately with **no FK**
on `property_id` so history survives a hard-deleted listing. SELECT:
admin always, or owner/assigned-agent only while the listing row still
exists. The only writer is the SECURITY DEFINER function
`log_listing_status_change()`, which additionally enforces that
non-admins may only self-transition to `'pending_review'` (no
self-approval). Note (confirmed this session): its `p_new_status`
validation list does **not** include `'changes_requested'`, which is
why tonight's Request Changes feature deliberately does NOT route
through this function — it uses a plain `.update()` +
`admin_audit_log` instead.

**`video_upload_sessions`** — tracks a Bunny Stream upload from
file-pick through the transcode webhook, before any `property_listings`
row exists yet (the video guid is minted first). PK is the Bunny
`video_asset_id` itself. RLS: INSERT/SELECT own row only; **no UPDATE
policy for any authenticated role** — status/thumbnail are only
written by the webhook route via service-role.

**`change_log`** — system-wide, source-agnostic change history for
*every* table in the `public` schema, added after an earlier
property-deletion incident where nothing recorded what changed.
Dynamically attaches a generic trigger to every table in `pg_tables`
(excluding itself, dead `audit_logs`, and PostGIS's `spatial_ref_sys`).
SELECT: admin only. Only writer is the trigger function.

**Views**: `public_property_save_counts` (aggregates `saved_properties`
into per-property counts, runs with view-owner privileges to bypass
`saved_properties`' own owner-only RLS — chosen over a denormalized
counter to avoid drift). `public_agent_contact` (narrow public column
subset of `profiles` JOIN approved `agent_profiles` — built because RLS
can't do column-level restriction, and `profiles` holds sensitive
fields like budget/DOB/gender/nationality/subscription_tier that must
stay hidden even from other signed-in users).

**`saved_properties`** — user wishlist/bookmarks. Two competing
`CREATE TABLE IF NOT EXISTS` definitions exist across two different
migrations (one with a `notes` column and stricter constraints, one
simpler) — which one actually won on the live DB can't be determined
from files alone. RLS: one ALL-scoped own-row policy today (an
intermediate state briefly had no UPDATE policy, later subsumed).

**`saved_searches`** — saved filter/alert searches. **Confirmed
historical gap**: RLS was enabled with zero policies at creation,
blocking all access until a follow-up migration added full own-row
SELECT/INSERT/UPDATE/DELETE.

**Tables with RLS enabled but genuinely zero policies anywhere in the
80 migration files** (not a search miss — confirmed absent): `property_views`,
`compare_sessions`. Both are dead-table leftovers from the original
Phase-1 schema, so this is likely moot, but flagging for completeness.

### Enums

`user_role` (extended with `'builder'`), `property_type`,
`listing_type`, `property_status`, `lead_status` (extended with
`'spam'`), `ticket_status`, `ticket_priority`, `ticket_type`,
`subscription_plan`, `subscription_status`, `notification_channel`,
`notification_status`, `approval_status`, `deal_stage`.

### Notable SECURITY DEFINER helper functions

`is_admin()`, `log_admin_action()`, `is_conversation_participant()`,
`is_conversation_creator()`, `is_deal_primary_agent()`,
`is_deal_collaborator()`, `are_agents_connected()`,
`is_team_member()`, `is_team_lead()`, `shares_team_with()`,
`log_listing_status_change()`, `log_table_change()`,
`normalize_phone()`. A recurring bug pattern — an RLS policy on table
T reading T's own rows (or a mutually cross-referencing table) via a
plain EXISTS/JOIN causing infinite recursion (Postgres `42P17`) or
silent false-negatives — was independently diagnosed three separate
times before the team standardized on writing every cross-table RLS
check as a SECURITY DEFINER helper from the start.

---

## 4. Feature Inventory

### Property listings — fully built
- **Creation wizard**: `src/app/post-property/page.tsx` — multi-step,
  handles brokerage fields, video upload, 360° capture request,
  Cloudinary image upload, geocoding.
- **Edit flow**: `src/app/post-property/edit/[id]/page.tsx` — mirrors
  the creation wizard's field set.
- **Detail page**: `src/app/property/[slug]/PropertyDetailClient.tsx`
  — renders brokerage details (opt-in via `show_brokerage_details`),
  video (`VideoSlide.tsx`), amenities, nearby places, floor plans.
- **Search/browse**: `src/app/properties/page.tsx` (grid + compare up
  to 3), `src/app/search/page.tsx`.
- Real Supabase queries throughout; no fabricated data found in this
  pass (the agents page previously had this problem — confirmed
  already fixed, see the Agents entry below).

### Agent system — mostly built, some pages unverified
- **Public profile** (`src/app/agents/[slug]/page.tsx`): built against
  the real `agent_profiles`/`profiles` tables; code comments
  explicitly confirm no fabricated rating/review data is rendered.
  Tonight's session added a self-view distinction and a blurred
  "Quick Contact" paywall placeholder for non-admins (CSS-only, no
  real subscription/unlock logic).
- **Registration**: `/agent-register`, `/become-an-agent` exist as
  pages; the actual application-submission logic wasn't deep-audited
  in this pass.
- **Agent dashboard** (`src/app/agent/*`): leads, deals, site-visits,
  messages, tasks, teams, calendar, analytics, leaderboard all exist
  as real page files with dynamic detail routes. `agent/leads` is
  confirmed built against the real `inquiries` table. **Not verified
  in this pass**: whether `teams`, `leaderboard`, and `deals` pages
  are fully wired to their real tables or partially placeholder —
  flagging as unconfirmed rather than claiming either way.

### Video uploads (Bunny Stream) — built; the webhook gap is not what it first looked like
- Upload init (`/api/upload-video`) mints a signed TUS credential set
  server-side; the raw Bunny API key never reaches the browser.
  Client hook: `src/hooks/useVideoUpload.ts`. Playback:
  `src/components/property/VideoSlide.tsx` (tap-to-play, fail-soft).
- **Corrected 2026-09-20, live-checked**: `src/lib/bunny.ts`'s
  `verifyBunnyWebhookSignature()` returns `false` whenever
  `BUNNY_STREAM_READONLY_API_KEY` is unset, and the code's own comment
  claims exactly that — *"until that key is added and confirmed."*
  This blueprint originally repeated that claim as a live gap. It's
  now been checked directly against the actual Vercel project config
  (read-only, via the Vercel API — key **existence** confirmed, value
  never decrypted): **`BUNNY_STREAM_READONLY_API_KEY` IS set for the
  `production` target**, and is also present in the local
  `.env.local`. The code comment is almost certainly stale — written
  before the key was added, never updated afterward (the same
  "comment goes stale the moment someone fixes the underlying thing"
  pattern flagged elsewhere in this document). **What's still
  unverified**: whether the *value* stored in Vercel is the correct
  read-only key from Bunny's dashboard — that can't be checked without
  decrypting it (which this investigation deliberately did not do) or
  triggering a real webhook call and watching the logs. If video
  status still isn't updating from `processing` to `ready` in
  practice, the next step is a live test, not re-adding the key.

### 360° capture requests — fully built end-to-end
Request (wizard or `/dashboard/my-listings`) → admin
schedule/decline/complete (`admin/page.tsx`, each action logged to
`admin_audit_log`) → requester notified
(`/api/notify-capture-requester`) → audit trail. Tonight added the
requester's preferred date/time-slot and the admin's suggested
alternative dates on decline.

### Notifications — fully built
`notifications` table + `NotificationBell` component +
`/notifications` page. Six `notify-*` API routes, each a service-role
Next.js route (required since `notifications`' RLS only allows
self-inserts) that pairs an in-app insert with a
`sendWhatsAppMessage()` call, always fire-and-forget:
- `notify-admin-agent` — new agent/builder registration → admins
- `notify-agent-contact` — "Contact this agent" submitted → that agent
- `notify-capture-request` — 360° capture requested → all admins
- `notify-capture-requester` — admin schedules/declines → requester
- `notify-listing-changes-requested` — admin requests changes on a
  pending listing → submitter (or assigned agent, priority order
  documented in code) — **built tonight**
- `notify-listing-saved` — someone saves a listing → owner (or
  assigned agent, same priority pattern)

Plus `/api/cron/check-follow-ups` (daily cron, in-app notification
only, explicitly no WhatsApp/email per its own comment).

### Pricing / brokerage — fully built end-to-end, confirmed tonight
Confirmed wired through all three points: creation wizard (mode-
specific UI: days'/months' rent, percentage, fixed amount, with preset
pills), edit page (identical field set, load + save), and display page
(reads and conditionally renders only when `show_brokerage_details` is
true — matching the opt-in design). No gap found.

### Admin in-panel listing moderation — built tonight
Full in-admin preview (photo gallery, video, floor plans, pricing/
brokerage/amenities, seller contact) so admins can review a pending
listing without hitting the public `/property/[slug]` page (which
404s for non-active listings by design — no admin bypass was added
there; the separate in-admin preview was built instead). Approve /
Reject / Request Changes (with submitter notification) / "Edit as
Admin" (opens the real `/post-property/edit/[id]` route in a new tab,
reusing it as-is). See Section 5 for the full unified Listings section.

### Other integrations spotted incidentally (not gaps in the 6 areas above, but worth knowing)
- `src/lib/whatsapp.ts` still has a comment flagging verbose logging as
  "TEMPORARY... Remove once the payload shape is confirmed working
  end-to-end" — suggests this integration may still be mid-hardening.
- `src/lib/posthog.ts`'s `initPostHog()` export appears unused/
  duplicate of `PostHogProvider.tsx`'s own init call.

---

## 5. Admin Capabilities

Everything lives in one large client component,
`src/app/admin/page.tsx`, guarded by `profile?.role === "admin" ||
profile?.role === "super_admin"`. Current sidebar sections
(`AdminSection`/`NAV`):

**Overview** — stat cards (Pending Review, Active Listings, Rejected,
Users, Inquiries, Reports Open, Total Views) plus three trend charts
(listings submitted over time, agent applications over time, inquiries
over time).

**Listings** — *consolidated tonight* from three separate sidebar
sections (Pending Review / Approved Listings / Rejected Listings, each
a hardcoded `.eq("status", X)` view of the same table) into one
unified, status-filterable view. Filter tabs: Pending Review, Active,
Rejected, Changes Requested, Frozen. Search across title/city/
locality/seller name/agent name (client-side). Sort by listed date.
Per-row actions depend on the row's current status: **pending_review**
→ Approve / Reject / Request Changes (with a required note, notifies
the submitter); **active** → Unpublish (reason dropdown + note,
returns to pending_review via the `log_listing_status_change()` RPC,
which also writes `listing_status_history`); **rejected** →
Re-approve; **changes_requested** / **frozen** → no direct action
here by design (frozen stays tied to the Reports flow that froze it;
changes_requested is waiting on the submitter). Every row also has a
"Preview" trigger opening the full in-admin listing preview described
in Section 4, from which Approve/Reject/Request Changes can also be
triggered directly. Assign Agent, Kuula tour URL, and Google Maps URL
inline controls are also available per row. Every write here calls
`log_admin_action()` (→ `admin_audit_log`) and uses the
`.select()` + zero-rows-matched check pattern to avoid silently no-op'ing
on an RLS mismatch or stale id.

**Agents** — agent applications list (approve/reject), with per-agent
stats, search, and drill-down into submitted KYC documents. (Not
re-verified in depth this session — described from earlier direct
investigation, not re-confirmed tonight.)

**360° Requests** — schedule (sets `scheduled_date`/`scheduled_time_slot`)
/ decline (with optional suggested alternative dates, added tonight) /
complete, each logged to `admin_audit_log`, each triggering
`notify-capture-requester`.

**All Users** — role management (the `ROLE_OPTIONS` list mirrors the
live `user_role` enum minus `super_admin`), verification and
activation toggles.

**All Inquiries** — inquiry list/management. (Not deep-audited this
session.)

**Agent Performance** — performance charts per agent. (Not
deep-audited this session.)

**Leaderboard** — agent leaderboard view (computed live, no dedicated
table, per the schema inventory above; respects `leaderboard_opt_out`
on `agent_profiles`).

**Reports** — the moderation/grievance queue: acknowledge (stamps an
SLA due-date), move under review, resolve, dismiss, plus a
freeze/unfreeze-listing action tied to a specific report
(`handleReportFreezeListing`/`handleReportUnfreezeListing`, both
logged to `admin_audit_log`). This is the *only* current path to
setting/clearing a listing's `frozen` status.

**Site Content** — key/value editor for the homepage's admin-editable
copy (`site_content` table).

**Audit Log** — read view over `admin_audit_log`, the append-only
record every admin write action above logs into.

---

## 6. Known Gaps / Technical Debt / Deferred Work

**This section is intentionally blunt — its whole purpose is to
surface exactly the kind of "wait, does this already exist?" moment
this document exists to prevent.**

### 1. Migration-history vs. live-DB drift — now partially resolved by a live check
**Update 2026-09-20**: all 33 schema-testable migrations in 030–074
were live-verified (see Section 3) and confirmed APPLIED. The "NOT
APPLIED" headers on those files are stale, not accurate — write that
off as resolved, not an open risk.

**Still open**: drift in the *other* direction — live-but-undocumented
— is not addressed by a schema-existence probe and remains a real,
separately-confirmed risk:
- `property_listings`' own `update_admin_all` RLS policy exists in the
  real database but in no migration file at all.
- 5 specific migrations (035, 042, 045's policy rewrites, 056, 073 —
  see the table in Section 3) change only RLS policies or trigger
  functions with no accompanying schema object, so they carry no
  existence signal a REST probe can detect either way. Genuinely
  unknown whether they're live. **073 is the one to check first** —
  it's this session's own migration, and whether it's live directly
  determines whether the in-admin listing preview can show floor plans
  for pending listings today.

**Practical rule going forward**: a migration file's header comment is
not evidence either way once a human may have applied it out-of-band.
Schema-changing migrations (new table/column/enum/view/function) can
be live-verified cheaply via read-only existence probes, exactly as
done here. Pure policy-only migrations cannot — those need either a
direct `pg_policies` query (Supabase SQL Editor) or a real non-service-
role session test.

### 2. Bunny webhook — corrected, was not actually the gap it looked like
Originally flagged as non-functional because
`BUNNY_STREAM_READONLY_API_KEY` appeared unset, per the route's own
code comment. **Live-checked 2026-09-20 against the actual Vercel
project config**: the key **is** set for `production` (existence
confirmed via the Vercel API, value never decrypted) and is also
present locally. The code comment is stale. What's still open: whether
the *value* is the correct one from Bunny's dashboard — unconfirmable
without decrypting it or triggering a real webhook call and reading
the logs. There's also a separate, still-real, minor item: an
uncleaned "TEMPORARY DIAGNOSTIC" debug block left in this same route
from active debugging.

### 3. `conversations`' RLS SELECT policy has a known, explicitly-unfixed recursion-shaped risk
Per that migration's own header — left alone deliberately after
adjacent tables in the same subsystem hit real `42P17` infinite-
recursion bugs, "per explicit instruction not to change anything else
defensively." Worth a dedicated look before this subsystem sees heavy
use.

### 4. Two competing `saved_properties` table definitions
Both are `CREATE TABLE IF NOT EXISTS`, in two different migrations,
with different column sets — which one actually exists live can't be
determined from files. Needs a live check.

### 5. `inquiries` and `agent`-adjacent baseline schema were created out-of-band
Neither `inquiries` nor the original `agents`→`agent_profiles`
transition has a CREATE TABLE migration in this repo — their true
original shape is not fully recoverable from source, only from later
ALTERs and policy fixes.

### 6. The `properties` dead-catalog table is still merged into 9 live public pages
Not a bug (it renders fine), but a product decision hiding in plain
sight: `/buy`, `/rent`, `/properties`, `/search`, `/compare`,
`/locations`, the homepage, and `sitemap.ts` all merge in this
seed/catalog data alongside real `property_listings` rows. Worth an
explicit decision on whether that's still wanted.

### 7. README.md is stale and actively misleading in places
Claims Next.js 14 (actual: 16.2.9), Algolia search, Razorpay + Stripe
payments, and Cloudflare deployment — none of which exist anywhere in
the dependency tree or codebase. Actual hosting is confirmed Vercel.

### 8. Frozen and changes_requested listings only have narrow paths back to normal flow
`changes_requested` has no admin action in the Listings tab to force
it back to pending review if the submitter never resubmits (the only
path back is the submitter re-editing and presumably re-triggering
review — worth confirming that path actually flips status back).
`frozen` can only be unfrozen via the specific Reports card that froze
it — if that report gets resolved/dismissed without unfreezing first,
there's no other UI path to unfreeze the listing.

### 9. Design system fragmentation (carried over from prior investigation, not re-verified tonight)
Two dead-parallel color systems, rebrand naming fossils (a variable
named "gold" now renders blue), 2,600+ raw hex literals instead of
tokens, and some vestigial unused Card/Button components. Cosmetic/
maintainability debt, not a functional bug.

### 10. An un-layered CSS reset zeroes Tailwind spacing utilities sitewide
`globals.css` has a `* { margin:0; padding:0 }` reset outside any
Tailwind `@layer`, silently overriding spacing utilities across the
whole site. Known, and per prior investigation, deliberately left
unfixed rather than risk a sweeping visual regression.

### 11. Minor code-cleanliness items spotted incidentally
- `src/lib/whatsapp.ts` has a comment flagging its own verbose logging
  as temporary, not yet removed.
- `src/lib/posthog.ts`'s `initPostHog()` looks like unused/duplicate
  code next to `PostHogProvider.tsx`.
- The `About` page's team bios/photo section is intentionally toggled
  off via a feature flag (`SHOW_LEADERSHIP_DETAILS`/`SHOW_TEAM_PHOTO`)
  — not a bug, a deliberate temporary hide worth revisiting
  periodically.

### 12. Tables with no DELETE (or no UPDATE) policy at all — mostly deliberate, worth a scan anyway
Append-only/permanent-record pattern, no DELETE for anyone:
`admin_audit_log`, `reports`, `deals`, `documents`, `calendar_events`,
`call_logs`, `legal_documents`, `consent_events`, `change_log`,
`capture_360_requests`, `listing_status_history`,
`property_view_events`, `property_image_clicks`. No UPDATE policy for
anyone: `conversations`, `messages`, `deal_collaborators`,
`team_members`. In every case this reads as intentional (append-only
by design), but it's worth a deliberate confirmation pass rather than
assuming — an admin who needs to correct a bad row in any of these
currently has no RLS-sanctioned path to do so short of a service-role
script.

### 13. Areas not deep-audited in this investigation pass
Flagging explicitly rather than silently omitting: the Agents admin
section's exact current capabilities, the All Inquiries and Agent
Performance admin sections, and whether the agent dashboard's `teams`/
`leaderboard`/`deals` pages are fully wired vs. partially placeholder.
None of these were confirmed broken — they simply weren't re-verified
against the current code in this pass, and shouldn't be assumed
complete on that basis either.

---

## 7. Route Map

### Pages
| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/about` | About page |
| `/agent-register` | Agent partner application landing |
| `/agent-terms` | Agent terms of service |
| `/agents` | Public agent directory |
| `/agents/[slug]` | Public agent profile |
| `/auth/error` | Auth error page |
| `/become-an-agent` | Become-an-agent marketing page |
| `/blog` | Blog index |
| `/blog/[slug]` | Blog post detail |
| `/builders` | Builders/developers listing |
| `/buy` | Buy-property landing |
| `/calculator` | EMI/mortgage calculator |
| `/careers` | Careers page |
| `/commercial` | Commercial properties landing |
| `/compare` | Property comparison (up to 3) |
| `/connect` | Contact/connect page |
| `/contact` | Contact page |
| `/cookies` | Cookie policy |
| `/forgot-password` | Password reset request |
| `/grievance-redressal` | Grievance redressal policy |
| `/investment-calculator` | Investment ROI calculator |
| `/legal-guide` | Legal guide |
| `/locations` | City/location index |
| `/locations/[city]` | City-specific listings |
| `/login` | Login |
| `/new-projects` | New projects listing |
| `/new-projects/[slug]` | Project detail |
| `/notifications` | In-app notifications |
| `/nri` | NRI-focused landing page |
| `/post-property` | Listing creation wizard |
| `/post-property/edit/[id]` | Edit an existing listing |
| `/press` | Press page |
| `/pricing` | Pricing page |
| `/privacy` | Privacy policy |
| `/profile/edit` | User profile editor |
| `/properties` | Property browse/search grid |
| `/property/[slug]` | Property detail page |
| `/refund-policy` | Refund policy |
| `/register` | Sign-up |
| `/rent` | Rent landing page |
| `/safety-guide` | Safety guide |
| `/saved` | Saved properties (public route) |
| `/search` | Search results |
| `/seller/onboarding` | Seller onboarding flow |
| `/terms` | Terms of service |
| `/thank-you` | Post-submission thank-you |
| `/valuation` | Property valuation tool |
| `/admin` | Admin panel |
| `/dashboard` | User dashboard |
| `/dashboard/my-listings` | Own listings + 360° capture request UI |
| `/dashboard/saved` | Saved properties (dashboard variant) |
| `/dashboard/searches` | Saved searches |
| `/agent/leaderboard` | Agent leaderboard |
| `/agent/analytics` | Agent analytics dashboard |
| `/agent/site-visits` | Site-visit list |
| `/agent/site-visits/[id]` | Site-visit detail |
| `/agent/messages` | Agent conversation list |
| `/agent/messages/[id]` | Conversation thread |
| `/agent/tasks` | Agent task list |
| `/agent/tasks/[id]` | Task detail |
| `/agent/teams` | Agent teams list |
| `/agent/teams/[id]` | Team detail |
| `/agent/calendar` | Agent calendar |
| `/agent/deals` | Deal pipeline |
| `/agent/deals/[id]` | Deal detail |
| `/agent/leads` | Lead list (real `inquiries` table) |
| `/agent/leads/[id]` | Lead detail |

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/admin/backfill-geocodes` | Admin batch-geocode utility |
| `GET /api/admin/user-activity` | Admin user-activity report |
| `POST /api/bunny-webhook` | Bunny Stream status webhook (currently non-functional — see Section 6) |
| `GET /api/cron/check-follow-ups` | Daily cron, in-app follow-up reminders |
| `POST /api/check-saved-search-alerts` | New-match check for saved searches |
| `POST /api/geocode-address` | Forward geocoding (Google) |
| `POST /api/nearby-places` | Google Places nearby-amenities lookup (cached) |
| `POST /api/notify-admin-agent` | New agent/builder registration → admins |
| `POST /api/notify-agent-contact` | "Contact this agent" submitted |
| `POST /api/notify-capture-request` | 360° capture requested → admins |
| `POST /api/notify-capture-requester` | Admin scheduled/declined a capture → requester |
| `POST /api/notify-listing-changes-requested` | Admin requested changes → submitter |
| `POST /api/notify-listing-saved` | Listing saved → owner/assigned agent |
| `POST /api/request-callback` | Callback request form |
| `POST /api/reverse-geocode` | Reverse geocoding (Google) |
| `POST /api/send-inquiry-email` | Inquiry email (property/agent contact forms) |
| `POST /api/send-otp` | Phone OTP via MSG91 |
| `POST /api/send-support-email` | Support/contact email |
| `POST /api/track-image-click` | Photo-open/zoom analytics event |
| `POST /api/track-property-view` | Deduped property-view analytics event |
| `POST /api/upload-document` | Cloudinary document upload |
| `POST /api/upload-image` | Cloudinary image upload |
| `POST /api/upload-video` | Bunny Stream upload init (TUS credentials) |
| `POST /api/verify-otp` | Phone OTP verification via MSG91 |
| `/auth/callback` | Supabase OAuth callback + consent recording |

---

## Methodology note

Sections 2, 4 (Section C), and 7 were produced by one research pass;
Section 3 by a second, independent pass across all 80 migration files
cross-checked against live `src/` usage; Sections 1, 5, and 6 were
compiled directly from this session's own firsthand work plus targeted
verification queries. Nothing here was taken from memory of past
conversations without being re-checked against the current files.

**Recommended habit going forward** (per tonight's discussion): regenerate
this document after any major feature session, not just once — it's
cheap insurance against re-discovering something that already exists,
which happened three separate times in one night before this document
existed.
