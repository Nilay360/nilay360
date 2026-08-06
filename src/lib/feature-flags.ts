// Shared feature flags for temporary, product-requested experiments.
// Each flag documents who requested it, why, and how it should be turned off —
// check the comment above a flag before flipping it.

// Temporary experiment requested by Vanith to build user base/leads. Started 2026-08-05.
// STAYS ACTIVE UNTIL VANITH EXPLICITLY SAYS TO TURN IT OFF — no automatic expiration.
//
// Gates the /search, /buy, and /rent RESULTS GRIDS: logged-out visitors see the grid of
// property cards rendered blurred behind a "Sign In to View Properties" CTA. Filters and
// the rest of each page (hero, guides, EMI calculator, footer, etc.) stay fully visible
// and usable — only the actual listing cards are gated.
//
// This is intentionally a SEPARATE flag from REQUIRE_SIGNIN_FOR_PROPERTY_VIEW
// (src/app/property/[slug]/PropertyDetailClient.tsx), which gates the single-property
// detail page. The two surfaces are different parts of the funnel (browse vs. detail) and
// may need to be turned on/off independently during the experiment.
export const REQUIRE_SIGNIN_FOR_RESULTS_VIEW = true;
