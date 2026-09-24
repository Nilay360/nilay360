@AGENTS.md

# NILAY360 — Claude Code Guide

Nilay360 (not "Nivila" — the outer folder name `NIVILA_Premium_Homepage` is legacy; Nivila is a
separate sister luxury brand). Mass-market PropTech platform for Indian real estate, launching
from Hyderabad. Live at nilay360.com. Founder / product owner: Vanith Kandre ("Ricky").

Full context lives in three documents. Read the relevant one before starting work, and treat all
three as snapshots, not live truth:
- `NILAY360_BLUEPRINT.md` (2026-09-20): schema inventory, features, admin, gaps, route map
- `NILAY360_APP_DESIGN_BRIEF.md` (2026-09-21): screen-by-screen content/flow spec (~60 screens), REAL vs STUB
- `docs/NILAY360_MASTER_DOCUMENT.pdf` (2026-09-24): handoff, blockers, Maps phases, reminder list,
  native-app PRD

## Standing rules (non-negotiable, every session)

1. **Never commit, push, merge, migrate, or deploy without the founder's explicit go-ahead — per
   action, every time.** Earlier approval does not carry over.
2. **Inspect before building.** Grep and read the actual code first; work has been "rebuilt" when it
   already existed. Check whether something is deleted or just hidden. Confirm state, propose a plan,
   wait for approval, then build.
3. **Never break existing features.** Keep changes scoped. Verify with `tsc --noEmit`, `eslint` on
   touched files (compare against HEAD — the baseline already has errors), and a live local test.
   No new lint or type errors.
4. **No direct database writes, ever.** All schema changes, migrations, and data writes are written
   as SQL and handed to the founder to run in the Supabase SQL Editor. Reads only for verification.
5. **Never call Supabase Auth admin endpoints on real accounts** (generate_link, password resets,
   token minting, impersonation). If a real session is needed, ask the founder to test it.
6. **Service-role results don't verify RLS.** For RLS-gated behaviour, reason through the actual
   policy SQL against real data, and label it "reasoned-correct, not click-through-verified". Check
   the full dependency chain when a policy reads another RLS-gated table.
7. **The live database is the source of truth.** Verify table and column shapes with a live
   read-only query before writing code. Migration headers saying "NOT APPLIED" are often stale.
8. **One concept, one table.** Report duplicates as an incident; don't build around them.
9. **No fabricated data.** No fake stats, names, reviews, or placeholder listings. Use honest empty,
   error, or "coming soon" states. Show "--", not a fake "0".
10. **Report problems plainly**, including your own mistakes, without burying them.
11. Every new admin write must call `log_admin_action()` (→ `admin_audit_log`) and use the
    `.select()` + zero-rows-matched check.
12. **Call the founder Ricky. Reply in short points and numbered steps, no long paragraphs.**
13. **Always run `next build` locally before any push. tsc + eslint are not enough.** (They missed a
    server-only import reaching client pages, which broke the Vercel build on 2026-09-25.)

## Stack (verified; README.md is stale — don't trust it)

- Next.js 16.2.9 (App Router, Turbopack), React 19.2.4, TypeScript 5. Read
  `node_modules/next/dist/docs/` for APIs — this is not the Next.js from training data.
- Supabase (project `xjdarhbzrpybqyqeeshy`) — Postgres, Auth, Storage, RLS everywhere.
- Hosting on Vercel; production branch `main`. `typescript.ignoreBuildErrors: true`, so type errors
  do not block deploys.
- Tailwind 4, Radix, framer-motion/gsap/lenis, react-hook-form + zod.
- Integrations: Bunny Stream (video, TUS), Cloudinary, Google Maps/Places/Geocoding, MSG91
  (OTP/WhatsApp), Resend, PostHog, Sentry.
- The git repo is `nilay360/.git`, not the outer folder.

## Key domain facts

- Real listings are in `property_listings` (status: pending_review / active / rejected /
  changes_requested / frozen). The legacy `properties` table is vestigial (0 rows) but still merged
  into some pages.
- Canonical agents are in `agent_profiles` (`agents` is dead). Canonical leads are `inquiries` +
  `inquiry_activities` (`leads`/`lead_activities` are dead).
- Contact numbers come from `site_contacts` (migration 075, live) via `useSiteContact(s)` and
  `src/lib/contactFormat.ts`. Never hardcode phone numbers.
- The whole admin panel is one component: `src/app/admin/page.tsx`.
- `SiteChrome.tsx` is the real live footer; `components/layout/Footer.tsx` is unused.
- Known and deliberately unfixed: the un-layered CSS reset in `globals.css` zeroes Tailwind spacing
  sitewide; design-system colour fragmentation.

## Current state (as of 2026-09-25)

- `main` = `origin/main` = `c41c6d3`.
- Session work (contact system, Maps phases 3–6 and 8, liveStats resilience, locations/compare
  live-data fix, forgot-password email, migration 075) is backed up on branch
  `backup/session-2026-09-24` (`9e9b8d8`). Not merged into `main`.
- Open from the last check: 2 new `react-hooks/set-state-in-effect` lint errors in the Contact
  Numbers admin UI (admin/page.tsx ~L799, ~L853). The `customer_care` row's label reads
  "General Enquiries" (a data fix for the founder to run). 075's header still says "NOT APPLIED".

## Blockers that need the founder (not code)

A. Street View key permission in Google Cloud Console (re-test with
   `node scripts/check-streetview-permission.mjs`).
B. A Map ID + cloud style profile before migrating `google.maps.Marker` → `AdvancedMarkerElement`
   (not urgent).
C. WhatsApp automation is dead in production: `MSG91_WHATSAPP_INTEGRATED_NUMBER` /
   `MSG91_WHATSAPP_TEMPLATE_NAME` are missing in Vercel, and template approval is unconfirmed.
   Keep the "TEMPORARY" logs in `whatsapp.ts` until one real delivery succeeds.
D. Home router/ISP DNS interference. Rule it out before treating a "0 listings" scare as a site bug.

## Priorities (the founder picks the order — one at a time)

- `/properties`: remove the dormant legacy `properties` table merge.
- `/search`: remove or repoint the stale fake "Map placeholder".
- Assign Agent dropdown: advanced rebuild (search/filter, pagination or virtual scroll, sort, refetch
  when agents are approved). Diagnosed, not built.
- "Set new password" screen (second half of Forgot Password).
- 1→5 videos per listing (`property_listing_videos`, mirroring `property_floor_plans`). Scoped, not built.
- Post-property wizard: click-to-jump step indicator.
- Homepage "Browse Properties" section below the search box.
- Needs the founder to check first: `pg_policies` check for RLS-only migrations 035/042/045/056 (and
  073), plus the undocumented `update_admin_all` policy; which `saved_properties` definition is live.
- Tech debt: `conversations` SELECT policy recursion risk; merge the two profile editors; one
  consistent sign-in results gate; README rewrite.
- Unscoped (ask before starting): watermarking, admin bulk media download, Maps Phase 9
  natural-language search.
- A native app is planned separately (Replit, React Native + Expo) on the **same** Supabase backend.
  Web changes must stay backward-compatible with it.
