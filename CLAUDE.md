@AGENTS.md

# NILAY360 — Claude Code Guide

Nilay360 (not "Nivila" — the outer folder name `NIVILA_Premium_Homepage` is legacy; Nivila is a
separate sister luxury brand). Mass-market PropTech platform for Indian real estate, launching
from Hyderabad. Live at nilay360.com. Founder / product owner: Vanith Kandre ("Ricky").

This repository is PUBLIC. Internal notes, current state, blockers, security follow-ups and the
full project documents live only on the founder's machine: `CLAUDE.local.md` and `docs/`, both
git-ignored. Never commit them, and never add internal or security-sensitive detail to this file.

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
- Supabase — Postgres, Auth, Storage, RLS everywhere.
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
  `src/lib/contactFormat.ts`. Never hardcode phone numbers. The `general` (main) number is
  **+91 70933 36360**.
- The whole admin panel is one component: `src/app/admin/page.tsx`.
- `SiteChrome.tsx` is the real live footer; `components/layout/Footer.tsx` is unused.
- The `globals.css` reset is inside `@layer base` (fixed 2026-08-29), so Tailwind spacing
  utilities work. Most pages still use inline `style={{}}` objects, not Tailwind classes.
- Colour system is fragmented: `tailwind.config.ts` colours are dead (Tailwind v4, no `@config`);
  ~7,400 raw colour literals in `src/`; "gold" constants (`GOLD`, `G.gold`) and `--blue*` vars are
  actually teal `#10C4C3`. See the colour plan below.

## Colour plan (accepted 2026-09-25)

- Target is a LIGHT theme. Tokens: ink `#020C1C`, teal `#10C4C3`, teal-deep `#087574`,
  gold `#C9A45C`, gold-text `#8A6A2F`, muted `#475467`, bg `#FFFFFF`, bg-soft `#FAFAF7`,
  border (e.g. `rgba(2,12,28,0.08)`), danger `#B42318`, success `#067647`, warning `#B54708`.
- `teal` and `gold` fail as text on white (2.2:1 / 2.4:1): fills, borders and icons only. Text on
  a teal fill is `ink`, never white. Text colours: ink, muted, teal-deep, gold-text.
- Order: Step 0 contrast hotfix on the current dark theme → Phase 1 tokens in `globals.css` +
  shared footer → shared chrome → legal/static pages → marketing → discovery → flows → agent
  workspace → admin last. One commit per phase; `next build` + contrast re-check each time.

## Priorities (the founder picks the order — one at a time)

- `/properties`: remove the dormant legacy `properties` table merge.
- `/search`: remove or repoint the stale fake "Map placeholder".
- Assign Agent dropdown: advanced rebuild (search/filter, pagination or virtual scroll, sort, refetch
  when agents are approved). Diagnosed, not built.
- "Set new password" screen (second half of Forgot Password).
- 1→5 videos per listing (`property_listing_videos`, mirroring `property_floor_plans`). Scoped, not built.
- Post-property wizard: click-to-jump step indicator.
- Homepage "Browse Properties" section below the search box.
- Tech debt: merge the two profile editors; one consistent sign-in results gate; README rewrite.
  (Security follow-ups are tracked in `CLAUDE.local.md`.)
- Unscoped (ask before starting): watermarking, admin bulk media download, Maps Phase 9
  natural-language search.
- A native app is planned separately (Replit, React Native + Expo) on the **same** Supabase backend.
  Web changes must stay backward-compatible with it.
