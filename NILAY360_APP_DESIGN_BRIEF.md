# NILAY360 — Native Mobile App Design Brief

Generated 2026-09-21 by direct investigation of the actual codebase at
`C:\Users\Admin\Downloads\NIVILA_Premium_Homepage\nilay360` — not
invented, not assumed. This is a content/flow spec for a designer,
not a developer: no code, no component names, no implementation
detail. Every screen lists what's really shown, every real action,
every real state, and a data-source note for later engineering
reference.

Every screen entry carries a **STATUS** field:
- **REAL (fully wired)** — the UI and its backend both actually work today.
- **STUB (UI exists, backend not implemented — do not design as if functional)**

---

## SCREENS THAT ARE STUBS TODAY

A flat list, so this can be triaged before design work starts. For
each, decide: **(a)** design as fully real from day one (backend work
needed alongside the native build), **(b)** intentionally omit from
the native app for v1, or **(c)** design as an honest "coming soon"
state — not a fake working button.

1. **Forgot Password** — submitting the form does nothing but redirect to Login. No reset email is ever sent.
2. **Dashboard → Settings tab** — every Save/Update/Delete action here (preferences, password change, account deletion) only sets local UI state and shows a fake success message. Nothing is written to the database.
3. **Property Valuation** (`/valuation`) — a static "Coming Soon" page. No calculator, no data binding.
4. **Saved Properties, public route** (`/saved`) — a static placeholder that always shows "No saved properties yet" regardless of who's signed in or what they've saved. It performs no auth check and no data fetch at all. The real, fully-wired version of this feature is `/dashboard/saved` — use that as the reference, not this route.
5. **Agent public profile → "Quick Contact" blur** — the blurred phone/WhatsApp/email panel shown to non-admin viewers reads "Unlock with NILAY360 Pro — coming soon." This is a pure visual teaser: no payment, subscription, or unlock flow exists behind it.
6. **New Project Detail** (`/new-projects/[slug]`) — always shows the same generic "register your interest" placeholder regardless of which project was tapped. No real per-project data (floor plans, real pricing, real RERA info) is fetched.
7. **Agent Partner Landing** (`/agent-register`) — pure marketing copy; its "Apply Now" button just goes to the general sign-up page. The real application form is a separate screen, `/become-an-agent`.
8. **"Connect" link hub** (`/connect`) — the page itself is real (a working links/contact hub), but several tiles inside it are explicitly placeholders: "Book a Consultation" (no real calendar booking, opens WhatsApp), "Raise a Support Ticket" (no ticketing system, opens WhatsApp), four "Quick Resources" downloads (no real files), two app-store badges (no native app exists yet on web), and a newsletter signup (doesn't subscribe anyone anywhere).

**Not stubs, but worth a deliberate decision because they're inconsistent today:**
- The **sign-in results gate** (blurred property grid behind "Sign In to View Properties") is active on `/search`, `/buy`, `/rent`, and the homepage's featured carousel — but **not** on `/properties` or `/commercial`, which always show real results to everyone. Decide once, deliberately, for the native app rather than inheriting this split.
- **Login/Register pages** exist as real, fully-functional standalone pages, but production today actually shows sign-in/sign-up as an overlay modal over the homepage instead of navigating to these pages. Use the page content described below as canonical; the native app will presumably use a dedicated screen either way.
- **`/locations`** (the city index) pulls its counts from the legacy `properties` seed/catalog table rather than the live `property_listings` table used everywhere else — so its numbers may not reflect real current inventory, even though the page itself is fully functional.
- **`/new-projects`** and its launch-alert signup are real and fully wired, but query two tables (`new_projects`, `launch_alerts`) that exist live yet appear nowhere in the platform's documented migration history — same "created out-of-band" pattern as a couple of other core tables. Flag for engineering before building native backend integration against them.

---

## 1. PROPERTY DISCOVERY

### 1.1 Homepage

**STATUS**: REAL (fully wired)

**PURPOSE**: Primary entry point — search launcher, live platform stats, featured listings, and trust-building content.

**KEY CONTENT ELEMENTS**: Admin-editable hero headline/subline and subtitle. Three clickable stat tiles (Listings / Agents / Cities counts, computed live) — destination depends on viewer: admin → relevant admin section, regular/signed-out user → `/buy` (Listings) or `/agents` (Agents); Cities is never clickable. A tabbed search box (Buy / Rent / New Projects / Valuation / List Property / Agents, the latter two badged "FREE") with a city dropdown, free-text field, a voice-search mic button, and Search. A trust bar strip ("Admin-Reviewed Listings", live agent count, live city count). A tabbed services grid (For Buyers / For Tenants / For Agents / For Developers), 6 shortcut tiles per tab. A "Premium Properties" horizontal carousel of real listings filterable by city tab, each card showing photo, tag, a heart/save toggle with a save-count badge (shown only when count > 0), price, city + type, title, beds/baths/sqft. A "Discover Properties" category-tile row (Apartments / Villas / Plots & Land). A "Property Price Insights" market panel per city with a price-trend mini chart, average price/sqft + YoY growth, top localities with demand labels, and a new-listings-this-month count — **this panel is hardcoded illustrative data for 6 major cities, not live-computed.** A 6-tile "Why Choose Us" grid. A testimonials carousel (auto-rotating, real data with a graceful empty fallback). A closing CTA band. Standard footer.

**USER ACTIONS AVAILABLE**: Tap a stat tile. Switch search tabs; pick a city; type or voice-search; submit search. Switch service-grid tabs; tap any shortcut. Switch the carousel's city filter; scroll via arrows; tap a card; tap the heart. Tap a category tile. Switch the market-insights city tab. Tap a testimonial dot. Tap any footer/CTA link.

**STATES**: Loading. Featured carousel empty ("No properties available yet[...]. Check back soon."). The featured carousel is wrapped in the sign-in results gate — see the stub/inconsistency list above. Testimonials empty state.

**DATA SOURCE**: `property_listings` merged with the legacy `properties` seed table (featured carousel); live counts of `property_listings`/`agent_profiles`/distinct cities; `testimonials`; `saved_properties`; `site_content` (editable hero copy).

### 1.2 Property Browse Grid — `/properties`

**STATUS**: REAL (fully wired)

**PURPOSE**: The full, filterable catalog of every property on the platform.

**KEY CONTENT ELEMENTS**: Search bar. Sidebar filter panel (collapses to a mobile drawer with an active-filter-count badge): property type checkboxes, price-range presets + custom min/max, BHK selector, amenities checkboxes, min/max sqft, Clear All. Sort dropdown (Featured, Price Low–High, Price High–Low, etc.) and Grid/List view toggle. Card: photo, For Sale/Rent tag, New/Premium badges, heart/save toggle, a compare toggle (up to 3, disabled once full), price, beds/baths/sqft, title, city, type.

**USER ACTIONS AVAILABLE**: Search, filter, clear filters, sort, switch view, save/unsave, add/remove to Compare, tap a card, open/close the mobile filter drawer.

**STATES**: Loading. Empty (no matches + clear-filters prompt). **Does not use the sign-in results gate** — every visitor sees real results here (inconsistent with `/search`; see the stub-list note above).

**DATA SOURCE**: `property_listings` merged with the legacy `properties` catalog; `saved_properties`; the compare tray is client-side only.

### 1.3 Search Results — `/search`

**STATUS**: REAL (fully wired)

**PURPOSE**: Dedicated results page for a query launched from the homepage search bar or a category/locality link.

**KEY CONTENT ELEMENTS**: Same filter sidebar, sort/view controls, and card grid as the Browse Grid, pre-populated from incoming query/city/tab parameters.

**USER ACTIONS AVAILABLE**: Same as the Browse Grid.

**STATES**: Loading, empty. **Uses the sign-in results gate** — logged-out visitors see the grid blurred behind a "Sign In to View Properties" card; filters stay usable.

**DATA SOURCE**: Same as the Browse Grid.

### 1.4 Property Detail Page — `/property/[slug]`

**STATUS**: REAL (fully wired) for signed-in visitors. Logged-out visitors see a deliberately different, much thinner **locked preview** — a real, designed state, not a stub.

**PURPOSE**: The complete listing page — every detail a buyer needs, plus the seller/agent's own management view when viewing their own listing.

**Locked Preview (logged-out)**: a single centered card over a full-bleed blurred hero photo — For Sale/Rent tag, price, secondary price context, city/locality, bed/bath/sqft counts — then a frosted card: lock icon, "Sign In to View Full Details," explanatory copy, Sign In button, "← Back to Browse." Nothing else renders.

**KEY CONTENT ELEMENTS (signed-in)**: Status/share/save badges, share button, save/heart toggle with live count. A 360° virtual tour embed as the primary hero when set, otherwise a photo gallery (main image + thumbnail strip, image counter, view-all). Price block: large formatted price, secondary context, (rent) deposit/available-from/preferred-tenant each shown only when set, brokerage line shown only when the lister opted in (formatted as days'/months' rent, a percentage, or a flat ₹ amount), RERA badge when present. Full address + "View on Google Maps" link. Key-specs tile grid (Bedrooms/Rooms, Bathrooms/Washrooms, Area, Floor, Parking, Year Built, Facing, Ownership — each shown only when it exists). Video Tour card (tap-to-play), shown only when a video exists. Floor Plans card (zoomable), shown only when any exist. Location map (real interactive map when coordinates exist, else an embedded Maps iframe). Description/About with Furnished/Unfurnished badge and a Vastu-Compliant indicator. Amenities tag list. EMI Calculator (sale only): price, down-payment slider, interest-rate slider, tenure chips, live-computed monthly EMI/loan amount/total interest/total payable. Nearby &amp; Around map (property marker + cached nearby-place markers by category). A "Similar Properties" carousel. Right sidebar: buyer contact form **or** owner/agent management panel (see below), a Download Brochure button, a Quick Facts card. Prev/Next property navigation.

**Buyer contact panel** (any signed-in non-owner viewer): generic "Nilay 360 Expert" header, name/email/phone (phone auto-filled and locked if verified), a message-type quick-select, a message textarea, an optional collapsed preferences section (budget/BHK/locality/city/type), "Request Callback," "WhatsApp Owner," a payment-safety warning linking to the safety guide, and "Schedule Visit" (opens a modal: date, time-slot chips, name, phone).

**Owner/agent management panel** (shown instead, to the listing's own seller/assigned agent): "This is your listing"/"You're the assigned agent" label, title, three real stat tiles (Views, Saves, Photo Clicks), and Edit Listing / View Leads / View Listing action buttons.

**USER ACTIONS AVAILABLE**: Sign in (locked preview). Play video; open/zoom photos and floor plans; view map; adjust EMI inputs; scroll similar properties; save/unsave; share; submit contact form; WhatsApp the owner; schedule a visit; download brochure; navigate prev/next. Owner/agent instead: edit, view leads, or view the public page.

**STATES**: Loading skeleton. Locked preview (logged-out). A distinct sidebar loading skeleton while it resolves owner/agent-vs-buyer identity (never flashes the wrong panel). Contact form: idle → field errors → sending → sent. Schedule-visit modal: idle → error → submitting → success. Video: idle thumbnail → playing. Sections with nothing to show (no video/floor plans/amenities/description) are omitted, not shown empty.

**DATA SOURCE**: `property_listings` (full row incl. brokerage, price-per-sqft, video, Kuula tour, Maps URL, coordinates), `property_floor_plans`, `nearby_places_cache`, `property_view_events`/`property_image_clicks`/`saved_properties` (owner-panel stats), `inquiries` (contact submission), `site_visits` (visit-request submission).

### 1.5 Buy — `/buy`

**STATUS**: REAL (fully wired)

**PURPOSE**: A sale-focused landing/browse page — a pre-filtered, marketing-framed variant of the Browse Grid for "For Sale" listings.

**KEY CONTENT ELEMENTS**: Buyer-framed hero, filters (type, BHK, budget), New/Premium badges, otherwise the same card content as the Browse Grid.

**USER ACTIONS AVAILABLE**: Filter, save, tap through to a listing.

**STATES**: Loading, empty. **Uses the sign-in results gate.**

**DATA SOURCE**: `property_listings` merged with the legacy `properties` catalog, filtered to sale listings.

### 1.6 Rent — `/rent`

**STATUS**: REAL (fully wired)

**PURPOSE**: The rent-focused counterpart to Buy.

**KEY CONTENT ELEMENTS**: Same pattern as Buy, with a "Furnished" badge option and rent-appropriate filters (city, type, BHK, budget).

**USER ACTIONS AVAILABLE**: Same as Buy.

**STATES**: Loading, empty. **Uses the sign-in results gate.**

**DATA SOURCE**: `property_listings` merged with the legacy `properties` catalog, filtered to rent listings.

### 1.7 Commercial — `/commercial`

**STATUS**: REAL (fully wired)

**PURPOSE**: A commercial-property-focused browse page (office/retail/warehouse).

**KEY CONTENT ELEMENTS**: Type and budget filters, same card pattern as the other browse surfaces.

**USER ACTIONS AVAILABLE**: Filter, tap through to a listing.

**STATES**: Loading, empty. **Does not use the sign-in results gate** — always shows real results.

**DATA SOURCE**: `property_listings`, filtered to commercial categories.

### 1.8 New Projects — `/new-projects`

**STATUS**: REAL (list page) — real, live-queried tables, though undocumented in migration history; see stub-list note above.

**PURPOSE**: Browsable list of new-launch developer projects, restricted to Hyderabad only.

**KEY CONTENT ELEMENTS**: Filter pills (All/Apartments/Villas/Commercial/Plots), city/type/budget/possession-year dropdowns, search. Card: image, developer, project name, location, starting price, configuration summary, status badge (New Launch/Under Construction/Ready), units available, possession date, RERA number, "I'm Interested." A "Notify Me" launch-alert signup.

**USER ACTIONS AVAILABLE**: Filter/search, tap a card (opens project detail — see below, currently a stub), submit interest, sign up for alerts.

**STATES**: Loading, silent empty (a failed/empty fetch just leaves the list empty, no error shown).

**DATA SOURCE**: `new_projects` (status='active', Hyderabad-only), `launch_alerts`.

### 1.9 New Project Detail — `/new-projects/[slug]`

**STATUS**: STUB — no real per-project data fetch exists.

**PURPOSE**: Intended as a full project detail page; currently a generic placeholder for every project.

**KEY CONTENT ELEMENTS**: A title generated from the URL slug (not fetched from the database), a fixed "Under Construction" badge, three generic bullets that don't reflect real project data, and a "Register your interest" panel (Request Details → Contact; ← All New Projects).

**USER ACTIONS AVAILABLE**: Go to Contact; go back to the list.

**STATES**: Static, identical regardless of which project was tapped.

**DATA SOURCE**: None — the slug only generates a display title client-side.

### 1.10 Locations — `/locations`

**STATUS**: REAL (fully wired), but sourced from the legacy `properties` catalog rather than live `property_listings` — see stub-list note above.

**PURPOSE**: City index — browse by market.

**KEY CONTENT ELEMENTS**: Hero with total-listings/total-cities stats, a grid of city cards, a stats band.

**USER ACTIONS AVAILABLE**: Tap a city card.

**STATES**: Loading.

**DATA SOURCE**: The legacy `properties` seed/catalog table.

### 1.11 Location Detail — `/locations/[city]`

**STATUS**: REAL (fully wired) — correctly queries the live table, unlike the index page.

**PURPOSE**: City-specific browse page.

**KEY CONTENT ELEMENTS**: City hero, a filtered property grid in the same card pattern as other browse surfaces.

**USER ACTIONS AVAILABLE**: Filter/browse, tap through to a listing.

**STATES**: Loading, empty.

**DATA SOURCE**: `property_listings`, filtered by city.

### 1.12 Property Comparison — `/compare`

**STATUS**: REAL (fully wired)

**PURPOSE**: Line up up to 3 properties side by side across specs, location, financials, and amenities.

**KEY CONTENT ELEMENTS**: 3 selector slots (empty "+ Add Property" placeholders or filled property summaries with a remove control), an in-slot search dropdown, Save and Share actions. A detailed comparison table (once 2+ selected): Basic Information (price, price/sqft, type, listing type, status), Specifications (beds/rooms, baths/washrooms, area, floor, parking, year built, furnished), Location (city, neighbourhood, address), Financial Estimates (monthly EMI, total interest, price/sqft — "N/A" for rentals), Amenities (per-property check/cross), and an Overall Verdict "🏆 Best Value" row. Per-column winner highlighting throughout. A "You Might Also Like" 3-card row. A closing CTA band.

**USER ACTIONS AVAILABLE**: Add/remove a property per slot, search within a slot, Save the selection, Share (copies a link, disabled below 2 properties), tap a "You Might Also Like" card, navigate via the closing CTAs.

**STATES**: Loading (in-slot search). Empty slot placeholder. No-search-matches. Fewer than 2 selected → the comparison table is replaced with a prompt to select at least 2; Share stays disabled. 2–3 selected → full table renders. Selection can restore automatically from a prior local save or from URL query params.

**DATA SOURCE**: The legacy `properties` catalog table (not live `property_listings`) — same table also used by `/buy`, `/rent`, `/properties`, `/search`, `/locations`, and the homepage as a merge-in source. EMI/interest/price-per-sqft are computed client-side. Save/restore uses browser local storage only, not a database table.

### 1.13 Saved Properties — public route, `/saved`

**STATUS**: STUB — static placeholder, performs no auth check and no data fetch.

**PURPOSE**: As currently implemented, functions only as marketing/placeholder copy promoting the saved-properties feature.

**KEY CONTENT ELEMENTS**: Hero framing ("Your Wishlist"), three feature bullets (One-tap Save, Compare Shortlist, Synced Everywhere), and a body block permanently reading "No saved properties yet," with Sign In and Browse Properties buttons.

**USER ACTIONS AVAILABLE**: Sign In → `/login`; Browse Properties → `/properties`.

**STATES**: Exactly one state — always the empty-wishlist message, regardless of sign-in status or actual saved data.

**DATA SOURCE**: None. Use `/dashboard/saved` (below) as the real reference for this feature instead.

### 1.14 Saved Properties — dashboard, `/dashboard/saved`

**STATUS**: REAL (fully wired) — the genuine implementation of this feature.

**PURPOSE**: Let a signed-in user view, revisit, and remove their real bookmarked properties.

**KEY CONTENT ELEMENTS**: Header with a live count, "← Dashboard." Per-property card: thumbnail (or heart-icon placeholder), For Rent/Sale tag, category, title, locality/city, bedroom count (labeled BHK or Rooms for commercial), formatted price, "Saved [date]," View and Unsave actions. A degraded card variant for a saved property whose listing has since been deleted ("Property no longer available," raw ID, Remove-only). Empty state (heart icon + "No saved properties yet." + Browse link). Not-signed-in state (prompt + Sign In link).

**USER ACTIONS AVAILABLE**: View a saved property; remove a bookmark; browse (empty state); sign in (signed-out state).

**STATES**: Loading, not-signed-in, empty, populated, per-item orphaned, per-item removing (disabled "…" state), failed-unsave alert.

**DATA SOURCE**: `saved_properties` (owner's rows), joined to `property_listings` for display fields.

---

## 2. PROPERTY LISTING CREATION &amp; EDITING

### 2.1 Post Property — Step 1 of 8: Listing Type

**STATUS**: REAL (fully wired)

**PURPOSE**: Capture the seller's core intent (sell, rent, commercial) and property category, which drives every downstream field's visibility.

**KEY CONTENT ELEMENTS**: "What would you like to do?" heading. Three listing-type cards (For Sale, For Rent, Commercial), each with icon/label/description. A Property Category chip row whose options depend on the listing type chosen (Sale: Apartment/Villa/Plot-Land/Penthouse/Townhouse; Rent: Apartment/Villa/Townhouse; Commercial: Office Space/Retail Shop/Warehouse).

**USER ACTIONS AVAILABLE**: Select a listing-type card (clears any chosen category); select a category chip.

**STATES**: Selected-state styling on cards/chips. Validation errors on Continue ("Please select a listing type," "Please select a property category").

**DATA SOURCE**: `property_listings.listing_type`, `.property_category`

### 2.2 Post Property — Step 2 of 8: Location

**STATUS**: REAL (fully wired)

**PURPOSE**: Collect the property's full postal address and an optional precise map pin.

**KEY CONTENT ELEMENTS**: Street Address, Locality/Area, City (dropdown, 8 supported cities), State (dropdown, all Indian states/UTs), Pincode, Landmark (optional), an optional interactive map picker (search + drag-to-adjust).

**USER ACTIONS AVAILABLE**: Type fields; select city (auto-fills matching state) or state manually; type pincode (first 3 digits auto-fill city+state for 8 known prefixes); search/drag the map pin, then confirm (only fills fields still blank).

**STATES**: Validation errors per required field on Continue. The map picker has its own independent loading/no-results states and is not itself required.

**DATA SOURCE**: `property_listings.address`, `.locality`, `.city`, `.state`, `.pincode`, `.landmark`, `.latitude`, `.longitude`

### 2.3 Post Property — Step 3 of 8: Property Details

**STATUS**: REAL (fully wired)

**PURPOSE**: Collect physical specifications; fields adapt to property category.

**KEY CONTENT ELEMENTS**: Built-up Area (sq ft, required). Facing Direction (optional). Bedrooms — hidden for Plot/Land; "Rooms/Cabins" free numeric field for commercial categories; 1–5 + "5+" chips for residential. Bathrooms (chips) — hidden for plots. Balconies (chips) — hidden for plots. Floor Number/Total Floors — hidden for plots. Property Age (dropdown). Furnishing Status (chips) — hidden for plots. Covered/Open Parking (numeric fields).

**USER ACTIONS AVAILABLE**: Enter numeric fields; select chips/dropdowns.

**STATES**: Validation errors on Continue for built-up area and bedrooms/rooms (not required for plots).

**DATA SOURCE**: `property_listings.built_up_area`, `.bedrooms`, `.bathrooms`, `.balconies`, `.floor_number`, `.total_floors`, `.facing`, `.property_age`, `.furnishing`, `.parking`

### 2.4 Post Property — Step 4 of 8: Pricing &amp; Possession

**STATUS**: REAL (fully wired) — the most content-dense step, with meaningfully different fields for sale vs. rent.

**PURPOSE**: Capture price and every pricing-related detail.

**KEY CONTENT ELEMENTS (shared)**: Price field (labeled "Expected Monthly Rent" or "Expected Price"), with a live formatted preview (Lakh/Crore notation) and, for sale once area is known, a computed ₹/sq ft figure. "Price Negotiable" toggle. Possession Status (required chips: Ready to Move, Under Construction, New Launch). Maintenance — rent: Included/Additional chip pair, Additional reveals a ₹ amount field; sale: a single optional ₹/month field.

**Rent-only**: Security Deposit (optional ₹), Available From (date), Preferred Tenant (chips: Family/Bachelor/Anyone).

**Sale-only**: Ownership (Owner/Agent/Builder dropdown), RERA Number.

**Brokerage (shared, options differ by type)**: "Brokerage (Optional)" section. Rent: Days'/Months' Rent mode chips, preset pills (15/20/30/45/60 days or 0.5/1/1.5/2 months) plus a Custom entry, a live "Suggested" read-only ₹ preview. Sale: Percentage/Fixed Amount mode chips with a free numeric field. A "Show brokerage details on listing page" opt-in checkbox (independent of whether a value was entered).

**₹/sq.ft calculator (sale only)**: a deliberately separate Area + ₹/sq.ft pair from Step 3's Built-up Area, with a live "Preview total" (reference only) and its own "Show ₹/sq.ft on listing page" opt-in checkbox.

**USER ACTIONS AVAILABLE**: Enter price; toggle negotiability; select possession; toggle/enter maintenance; (rent) enter deposit, pick availability, select tenant preference; (sale) pick ownership, enter RERA; select brokerage mode and a preset or custom value; toggle brokerage visibility; enter ₹/sq.ft area and rate; toggle its visibility.

**STATES**: Validation errors on Continue for price and possession status only — everything else on this step is optional with no validation. The suggested-brokerage and ₹/sq.ft preview totals only render once their inputs are non-zero, and are explicitly labeled read-only/reference-only in copy.

**DATA SOURCE**: `property_listings.price`, `.price_negotiable`, `.possession_status`, `.maintenance_charge`, `.maintenance_type`, `.deposit_amount`, `.available_from`, `.preferred_tenant`, `.listed_by`, `.rera_number`, `.brokerage_mode`, `.brokerage_value`, `.show_brokerage_details`, `.area_sqft`, `.price_per_sqft`, `.show_price_per_sqft`

### 2.5 Post Property — Step 5 of 8: Amenities &amp; Highlights

**STATUS**: REAL (fully wired)

**PURPOSE**: Let the seller flag available amenities and write free-text highlights.

**KEY CONTENT ELEMENTS**: A 20-option amenity toggle grid (Swimming Pool, Gym, Clubhouse, 24/7 Security, Power Backup, Lift, Covered Parking, Garden, Children's Play Area, Jogging Track, Intercom, CCTV, Concierge, Rooftop Terrace, EV Charging, Smart Home, High-Speed Internet, AC, Balcony, Vastu Compliant), a live "N amenities selected" counter, a Highlights/Description textarea.

**USER ACTIONS AVAILABLE**: Toggle any number of amenities; type a description.

**STATES**: No validation — fully optional. Counter only appears once ≥1 is selected.

**DATA SOURCE**: `property_listings.amenities` (array), `.highlights`

### 2.6 Post Property — Step 6 of 8: Photos &amp; Video

**STATUS**: REAL (fully wired)

**PURPOSE**: Collect the primary visual content — required photo gallery, optional walkthrough video.

**KEY CONTENT ELEMENTS (photos)**: Drag-and-drop/browse upload zone (JPG/PNG/WEBP, max 10MB each, minimum 1, recommend 8+). Thumbnail grid once photos exist, drag-to-reorder, click-to-set-cover, a "COVER" badge on the selected cover photo.

**KEY CONTENT ELEMENTS (video, optional, single slot)**: "Add a Walkthrough Video (Optional)" — max 90s, max 100MB, MP4/MOV/WEBM.

**USER ACTIONS AVAILABLE**: Add/reorder/remove photos, set cover; pick one video file.

**STATES (photos)**: Rejected-file notice (wrong type or over size). Validation error on Continue if zero photos.

**STATES (video, distinct phases)**: Idle (empty tile) → Validating ("Checking video…", indeterminate progress) → Uploading (thumbnail + real progress bar) → Processing/Uploaded (gold confirmation panel, "Processing — it'll be ready to view shortly") → Failed (red error panel with the specific failure reason, Try Again). A proactive gold notice appears while validating/uploading ("Please wait for your video to finish uploading before continuing"), and Continue is disabled during that window.

**DATA SOURCE**: `property_listings.photo_urls` (array, cover moved to index 0 at submit), `.video_asset_provider`, `.video_asset_id`, `.video_asset_status`, `.video_asset_thumbnail_url`

### 2.7 Post Property — Step 7 of 8: Floor Plans &amp; 360° Capture

**STATUS**: REAL (fully wired)

**PURPOSE**: Optionally collect floor plan images and let the seller opt into a professional 360° photography visit.

**KEY CONTENT ELEMENTS**: Drag-and-drop floor-plan upload (same file rules as photos), each upload shown with an editable label and a remove control. A "Request a professional 360° capture for this listing?" toggle; when on, an optional preferred-date field and Morning/Afternoon/Evening time-slot chips.

**USER ACTIONS AVAILABLE**: Add/label/remove floor plans; toggle the 360° request; optionally set a preferred date/slot.

**STATES**: Rejected-file notice, same pattern as photos. Nothing on this step blocks progress. The date/time panel only renders while the 360° toggle is on.

**DATA SOURCE**: `property_floor_plans` (property_id, image_url, label, display_order); `capture_360_requests` (property_id, requester_id, status defaults 'pending', preferred_date, preferred_time_slot) — this insert is non-fatal and only fires if the listing itself was created successfully.

### 2.8 Post Property — Step 8 of 8: Review &amp; Submit

**STATUS**: REAL (fully wired)

**PURPOSE**: Final summary review, seller contact capture, legal confirmations, submission.

**KEY CONTENT ELEMENTS**: A read-only summary table covering every prior step (each row shows "—" if blank). "Your Contact Details": Full Name, Email, Mobile Number (required), WhatsApp (optional). A Terms of Service checkbox and a separate Ownership Warranty checkbox (distinct legal confirmations, both required).

**USER ACTIONS AVAILABLE**: Review (no inline edit — must go Back to change a prior step); fill contact fields (pre-filled from the signed-in account where available, still editable); check both boxes; Submit.

**STATES**: Validation errors per required field/checkbox. Submitting state (sequential photo/floor-plan upload progress, then listing-record submission). Submit error (photo failures block submission entirely; floor-plan failures are silently skipped, non-blocking). Success: a full-screen confirmation ("Listing Submitted! ... pending review ... 24–48 hours") with View Dashboard / Back to Home.

**DATA SOURCE**: `property_listings.seller_name`, `.seller_email`, `.seller_phone`, `.seller_whatsapp`, `.status` (set to `pending_review`), `.ownership_warranty_confirmed` + `.ownership_warranty_confirmed_at`, `.user_id`

**Cross-step note**: every field across all 8 steps auto-saves to a local draft as the seller types (a small "Draft auto-saved" indicator), restoring on return including which step they were on — photos/floor plans are not restorable from a draft and must be re-added.

### 2.9 Edit Listing

**STATUS**: REAL (fully wired) — structurally different from the creation flow: a single long-scrolling page with 8 always-visible numbered sections, not a step wizard.

**PURPOSE**: Let an existing listing's owner update any field of an already-submitted or live listing in one pass.

**KEY CONTENT ELEMENTS**: Same underlying fields as creation Steps 1–7, reorganized into 8 sections (Listing Type, Location, Property Details, Pricing, Amenities &amp; Highlights, Photos, Contact Details, Floor Plans — note Contact Details comes before Floor Plans here, the reverse of the creation order). No Review section, no 360° capture request, no legal checkboxes (those are write-once at creation).

**Differences from creation, specifically**: every field pre-loads from the existing record. Removing an *existing* photo prompts a confirmation; removing a newly-added, not-yet-saved photo does not. Saving with zero photos triggers a "that's a real visibility downgrade" confirmation. Video panel further distinguishes Ready ("Video ready — Live on the listing") from Failed, once processing has resolved. Floor plan uploads/labels/deletes save immediately and independently, not batched into one final Save.

**USER ACTIONS AVAILABLE**: Same as creation Steps 1–7, plus Cancel (returns without saving) and Save Changes (submits everything at once).

**STATES**: Page loading ("Loading listing…"), not-found. Photo upload progress. Floor-plan section's own per-upload "Uploading…" state. **Three distinct error kinds** (a deliberate, recent improvement over one generic error): *Validation* (amber, "Check before saving:" — a precondition wasn't met), *Network* (red, "Network error:" — the request never reached the server), *Save* (red, "Save failed:" — reached the server but failed, including a specific zero-rows-matched case worded as "No matching listing was found to update"). Save is disabled while video is validating/uploading. Successful save redirects silently to My Listings (no dedicated success screen).

**DATA SOURCE**: Same `property_listings`/`property_floor_plans` columns as creation; full-row UPDATE keyed on listing id, plus `updated_at`. No `capture_360_requests` write here, and no ownership-warranty write (write-once at creation only).

### 2.10 Seller Onboarding

**STATUS**: STUB — static marketing/explainer page, no form fields, nothing written to the database.

**PURPOSE**: Orient a brand-new seller before they start, funneling to Register or Post a Property.

**KEY CONTENT ELEMENTS**: "List Your First Property in 4 Steps" headline, four descriptive (non-interactive) bullets — Create Account, Add Property Details, RERA Details, Publish &amp; Get Leads. A closing "Begin onboarding" panel.

**USER ACTIONS AVAILABLE**: "Create Account" → Register; "Post a Property" → the creation wizard.

**STATES**: None — fully static.

**DATA SOURCE**: None.

---

## 3. AGENT-FACING SCREENS

### 3.1 Public Agent Profile — `/agents/[slug]`

**STATUS**: REAL (fully wired), with one embedded stub — see the "Quick Contact" note below.

**PURPOSE**: Public profile for a single approved agent — for prospective clients to learn about them and get in touch, and for the agent to preview how they appear publicly.

**KEY CONTENT ELEMENTS**: Breadcrumb, avatar, name, "Verified Agent" badge (always) plus a second badge if the account carries the verified-badge flag, agency name + city, a meta row (city, years of experience, license number, RERA — each shown only if present), a stats row (Active Listings, Deals Closed, Years Experience, Cities Served), an About/bio section, a Cities Served tag list, an Active Listings grid (up to 6 real cards), a "Get in Touch" contact-form card, a "Quick Contact" card (phone/WhatsApp/email), Share Profile, Report.

**Self-view**: the contact-form card, Quick Contact card, and "Send Message" button are all hidden when an agent views their own profile.

**Quick Contact — blur/lock behavior**: shows the agent's real contact details underneath a visual blur for any non-admin, non-self viewer, with a lock icon and **"Unlock with NILAY360 Pro — coming soon."** This is a pure teaser — no real payment/subscription/unlock exists behind it. Admins see the same card fully unblurred and clickable.

**USER ACTIONS AVAILABLE**: Call/WhatsApp Agent (admin viewers only, when contact info exists); Send Message (scrolls to form, hidden on self-view); submit the contact form (creates a lead assigned to this agent, requires sign-in — signed-out visitors see a Sign In prompt instead); tap an active listing card; Share Profile; Report.

**STATES**: Loading, not-found (unapproved/nonexistent slug), no active listings, no bio, contact form idle/sending/sent/error, signed-out prompt in place of the form.

**DATA SOURCE**: `agent_profiles`, `agent_service_cities`, `public_agent_contact` view (narrow public column subset, not raw `profiles`), `property_listings` (active listings, up to 6), `deals` (closed count), new leads insert into `inquiries`.

### 3.2 Public Agent Directory — `/agents`

**STATUS**: REAL (fully wired)

**PURPOSE**: Browsable, searchable directory of every approved agent.

**KEY CONTENT ELEMENTS**: Hero with real computed stats (total agents, distinct cities) once at least one agent exists. Search (name/agency), city filter dropdown (fixed 6-city list), result count, a 4-column agent card grid (avatar, name, agency, city, years experience or "Nilay 360 Agent," View Profile), pagination (8/page), an "Are You a Real Estate Professional?" promo section.

**USER ACTIONS AVAILABLE**: Search, filter by city, clear filters, paginate, tap a card, tap Apply Now/Learn More.

**STATES**: Loading, load error, zero agents at all (invite-to-apply message), filtered-to-zero (Clear all filters).

**DATA SOURCE**: `agent_profiles` (approved, up to 40) joined with `public_agent_contact` and `agent_service_cities`.

### 3.3 Leads (List) — `/agent/leads`

**STATUS**: REAL (fully wired)

**PURPOSE**: Every real inquiry assigned to this agent, filterable.

**KEY CONTENT ELEMENTS**: Title with live count, status filter (New/Contacted/Qualified/Viewing Scheduled/Negotiation/Closed-Won/Lost/Spam), sort (Newest/Priority), active-filter chips with individual/clear-all removal, an optional deep-link banner when filtered to one property. Card: inquirer name, status badge, priority badge, an Overdue/Due Today follow-up badge, linked property title, phone, email, submission date.

**USER ACTIONS AVAILABLE**: Filter, sort, clear filters, clear the property deep-link, tap a card.

**STATES**: Loading, signed-out, not-an-agent, empty (with distinct copy when filtered vs. unfiltered).

**DATA SOURCE**: `inquiries` (assigned_to = this agent).

### 3.4 Lead Detail — `/agent/leads/[id]`

**STATUS**: REAL (fully wired)

**PURPOSE**: Full working view of one lead — contact, pipeline status, matching, calls, notes.

**KEY CONTENT ELEMENTS**: Header (name, status badge, priority badge, editable status dropdown, "Start Deal" or "View Deal →"). Info cards: property, email, phone, message/type, source, created/last-contacted dates. A Follow-up Date card (view or edit mode with Save/Cancel/Clear). A linked Site Visit summary (when one exists). A Property Matching card (search + results, "Send to Customer," with a fallback-to-similarity banner when the lead has no stated preferences). A Calls card (quick-add + chronological log). An Activity/Notes card (add-note + timeline).

**USER ACTIONS AVAILABLE**: Change status; set/clear/edit follow-up; start a deal; search and send matching properties; log a call; add a note.

**STATES**: Loading, signed-out, not-an-agent, not-found, forbidden ("not assigned to you"). Empty sub-states for matches/calls/activity. Save-confirmation flashes.

**DATA SOURCE**: `inquiries`, `inquiry_activities`, `site_visits` (via inquiry_id), `deals` (existing-deal check), `call_logs`, `property_listings` (matching search).

### 3.5 Deals (List) — `/agent/deals`

**STATUS**: REAL (fully wired)

**PURPOSE**: This agent's sale pipeline, plus deals they collaborate on but don't own.

**KEY CONTENT ELEMENTS**: Title with live count, "+ Create Deal" (property picker from own listings, price, notes). Deal cards: thumbnail/placeholder, price, linked property or "No property linked," created date, a compact stage stepper (Negotiation→Booking→Agreement→Registration→Closed, plus a separate Lost state). A "Shared With Me" section, shown only when non-empty.

**USER ACTIONS AVAILABLE**: Create a deal; tap a deal card.

**STATES**: Loading, signed-out, not-an-agent, empty.

**DATA SOURCE**: `deals` (assigned_to = this agent), `deal_collaborators`, `property_listings`.

### 3.6 Deal Detail — `/agent/deals/[id]`

**STATUS**: REAL (fully wired)

**PURPOSE**: Full deal workspace — stage, linked property, documents, co-agents, tasks, calls.

**KEY CONTENT ELEMENTS**: Large price header, interactive 5-stage stepper (+ separate Lost toggle), a property card (when linked), a Deal Details card (price/notes, plus a lost-reason field when Lost — view/edit modes), a Co-Agents card (primary agent only: list + add/remove), a Tasks card (assign, available to the whole deal team), a Documents card (type/filename/uploader/date list + upload form + view/download), a Calls card, a Linked Records card.

**USER ACTIONS AVAILABLE**: Primary agent: change stage, edit price/notes/lost-reason, add/remove co-agents. Whole team: assign tasks, upload/view documents, log calls. Non-primary collaborators see stage read-only and never see Co-Agents/Edit controls.

**STATES**: Loading, signed-out, not-an-agent, not-found. Empty sub-states for co-agents/documents/calls. Save-confirmation flashes on every edit.

**DATA SOURCE**: `deals`, `property_listings`, `documents`, `deal_collaborators`, `tasks`, `call_logs`.

### 3.7 Site Visits (List) — `/agent/site-visits`

**STATUS**: REAL (fully wired)

**PURPOSE**: Visit requests assigned to this agent.

**KEY CONTENT ELEMENTS**: Title with live count, status filter (Pending/Confirmed/Completed/Cancelled — a UI-level vocabulary over a plain unconstrained status column, so an unexpected value renders a generic gray badge rather than breaking), sort. Card: visitor name, status badge, visit date + time slot, linked property, visitor phone.

**USER ACTIONS AVAILABLE**: Filter, sort, clear filters, tap a card.

**STATES**: Loading, signed-out, not-an-agent, empty.

**DATA SOURCE**: `site_visits` (assigned_to = this agent).

### 3.8 Site Visit Detail — `/agent/site-visits/[id]`

**STATUS**: REAL (fully wired)

**PURPOSE**: Single visit record, status update, deal kickoff.

**KEY CONTENT ELEMENTS**: Header (visitor name, status badge, status dropdown, Start Deal/View Deal). Info cards: property, phone, requested/visit date, time slot, linked lead.

**USER ACTIONS AVAILABLE**: Change status; start a deal.

**STATES**: Loading, signed-out, not-an-agent, not-found, forbidden.

**DATA SOURCE**: `site_visits`, `deals` (existing-deal check).

### 3.9 Messages (List) — `/agent/messages`

**STATUS**: REAL (fully wired)

**PURPOSE**: Agent-to-agent conversation list (direct and group).

**KEY CONTENT ELEMENTS**: Title, "+ New Conversation" (Direct/Group toggle, group name, agent picker). Rows: color-coded initial circle, title (other agent's name / group name), last-message preview ("You:" prefix when self-sent), relative timestamp, unread bold styling + dot.

**USER ACTIONS AVAILABLE**: Start a conversation (direct or group); tap a row.

**STATES**: Loading, signed-out, not-an-agent, empty.

**DATA SOURCE**: `conversations`, `conversation_participants`, `messages`, `agent_profiles`/`public_agent_contact`.

### 3.10 Message Thread — `/agent/messages/[id]`

**STATUS**: REAL (fully wired)

**PURPOSE**: One conversation's history, plus task-assignment and participant shortcuts.

**KEY CONTENT ELEMENTS**: Header (title, participant count/"Direct message"), "+ Assign Task" and "Participants" toggles. Assign Task panel: assignee, a *required* deal link (scoped to sender's own deals), title, description, due date. Participants panel: member list ("You" highlighted), "+ Add" (group only). Message list grouped by day, right-aligned self bubbles vs. left-aligned others (sender name shown in groups), timestamps. Composer.

**USER ACTIONS AVAILABLE**: Send a message; assign a task (linked to a deal); add a participant (group).

**STATES**: Loading, signed-out, not-an-agent, not-found ("not a participant"), empty thread. Messages refresh by polling (every 7s + on focus) — not real-time push, so no "typing…"/read-receipt design beyond the existing unread dot.

**DATA SOURCE**: `conversations`, `conversation_participants`, `messages`, `deals` (task-link picker), `tasks` (assign writes here).

### 3.11 Tasks (List) — `/agent/tasks`

**STATUS**: REAL (fully wired)

**PURPOSE**: Two-way task list — assigned to this agent, and assigned by this agent to others.

**KEY CONTENT ELEMENTS**: "Assigned to Me" section (title, status badge, description, linked-entity chips, due date, "Assigned by [name]," an inline status pill control — the only field an assignee may change). "Assigned by Me" section (same info + "Assigned to [name]," Edit/Delete instead of the status control).

**USER ACTIONS AVAILABLE**: Change status (assignee); edit/delete (assigner); tap a title for detail.

**STATES**: Loading, signed-out, not-an-agent, empty per section, inline save/delete errors.

**DATA SOURCE**: `tasks` (both directions, two queries), `deals`/`inquiries`/`property_listings` for linked-entity display.

### 3.12 Task Detail — `/agent/tasks/[id]`

**STATUS**: REAL (fully wired)

**PURPOSE**: Single task record with role-appropriate controls.

**KEY CONTENT ELEMENTS**: Title, Task Details card, an "Update Status" card (assignee only), a "Danger Zone" delete card (assigner or admin only).

**USER ACTIONS AVAILABLE**: Assignee: change status. Assigner/admin: edit title/description/due date/linked deal; delete.

**STATES**: Loading, signed-out, not-an-agent, not-found. Save-confirmation flashes, delete confirmation prompt, inline delete error.

**DATA SOURCE**: `tasks`, `deals`/`inquiries`/`property_listings` (linked-entity display and edit-form picker); `profiles.role` grants admin the same edit rights as the assigner.

### 3.13 Teams (List) — `/agent/teams`

**STATUS**: REAL (fully wired)

**PURPOSE**: Every team this agent belongs to, as lead or member.

**KEY CONTENT ELEMENTS**: Title with count, "+ Create Team" (name only). Cards: name, "Lead" badge if applicable, lead's name, member count.

**USER ACTIONS AVAILABLE**: Create a team (creator becomes lead + first member); tap a card.

**STATES**: Loading, signed-out, not-an-agent, empty.

**DATA SOURCE**: `team_members` (this agent's memberships), `teams`.

### 3.14 Team Detail — `/agent/teams/[id]`

**STATUS**: REAL (fully wired), though one dependency (a specific RLS policy extension enabling cross-member visibility) could not be independently live-verified — see the technical blueprint. Not itself a stub; flagged only because the dashboard stat tiles below depend on that permission grant.

**PURPOSE**: Team roster, name management, and a live aggregate dashboard of the team's combined pipeline.

**KEY CONTENT ELEMENTS**: Team name (lead can rename). A Team Dashboard: three stat tiles (Open Leads, Active Deals, Upcoming Site Visits) aggregated live across every current member. Members list ("You" self-label, "Lead" badge, per-row Remove excluding the lead). "+ Add Member" (lead only).

**USER ACTIONS AVAILABLE**: Lead: rename, add member, remove member.

**STATES**: Loading, signed-out, not-an-agent, not-found. Dashboard stats load, then show real numbers (or "—" per tile on query failure). Save-confirmation flashes.

**DATA SOURCE**: `teams`, `team_members`, plus a cross-member aggregate read of `inquiries`/`deals`/`site_visits`.

### 3.15 Calendar — `/agent/calendar`

**STATUS**: REAL (fully wired)

**PURPOSE**: Unified schedule combining this agent's own calendar entries, assigned site visits, and lead follow-up dates.

**KEY CONTENT ELEMENTS**: Title, "+ Add Event," Month Grid / Agenda List toggle, a color-coded legend (Event/Site Visit/Follow-up). Add Event form: title, type (Call/Meeting/Personal/Other), start/end, location, reminder lead time, optional links to a lead/visit/deal/property. Month Grid: dot indicators per item type, a day-detail panel. Agenda List: grouped by day. An event detail modal for native events (site-visit/follow-up items link straight to their own detail pages instead).

**USER ACTIONS AVAILABLE**: Create an event (optionally linked); switch view; navigate months; select a day; open/edit/save a native event; tap a site-visit/follow-up item to jump to its own record.

**STATES**: Loading, signed-out, not-an-agent, empty agenda, empty day. Save-confirmation flashes.

**DATA SOURCE**: `calendar_events` (own), `site_visits` (assigned), `inquiries` (assigned, with a follow-up date) — three real sources merged into one view.

### 3.16 Analytics — `/agent/analytics`

**STATUS**: REAL (fully wired)

**PURPOSE**: This agent's own performance metrics, by period.

**KEY CONTENT ELEMENTS**: Week/Month/Year toggle. Funnel (Leads Assigned, Leads Contacted, Deals Created, Deals Closed, Conversion Rate). Speed (Avg. Time to First Contact — with an explicit "approximate" caveat since it's based on last-contacted rather than truly first-contacted, Avg. Time to Close). Activity (Site Visits Completed, Messages Sent, Tasks Completed, Calls Logged).

**USER ACTIONS AVAILABLE**: Switch period.

**STATES**: Loading, signed-out, not-an-agent, metrics-computing spinner.

**DATA SOURCE**: Computed live from `inquiries`, `deals`, `site_visits`, `messages`, `tasks`, `call_logs` — shares its calculation logic with the admin panel's Agent Performance section.

### 3.17 Leaderboard — `/agent/leaderboard`

**STATUS**: REAL (fully wired)

**PURPOSE**: Agent-facing ranking view — top 3 plus the viewer's own standing.

**KEY CONTENT ELEMENTS**: Period toggle, metric dropdown (Leads Assigned, Deals Closed, Conversion Rate, Avg. Time to Close, Calls Logged). "Your Standing" card (rank + value, or "not enough data" message). "Top 3" card (medal-style ranked list, viewer's own row highlighted if present).

**USER ACTIONS AVAILABLE**: Switch period/metric.

**STATES**: Loading, signed-out, not-an-agent. **Opted-out** — replaces the whole page with a message and a link back to re-enable participation. Computing state. "No data yet" state.

**DATA SOURCE**: `agent_profiles` (approved, non-opted-out), then the same shared performance-computation logic as Analytics — no dedicated leaderboard table.

### 3.18 Agent Partner Landing — `/agent-register`

**STATUS**: STUB — marketing only, no form; "Apply Now" just links to general sign-up.

**PURPOSE**: Marketing/landing page pitching the agent partnership program.

**KEY CONTENT ELEMENTS**: Eyebrow, heading, subtitle, "Applications Open" badge, three benefit bullets, a short "Start your application" panel.

**USER ACTIONS AVAILABLE**: Apply Now → `/register`; View Agent Network → the public directory.

**STATES**: None — static.

**DATA SOURCE**: None. The real application intake is a separate screen, below.

### 3.19 Become an Agent — `/become-an-agent`

**STATUS**: REAL (fully wired) — the actual application-submission screen.

**PURPOSE**: Let a signed-in user submit their real credentials for admin review.

**KEY CONTENT ELEMENTS**: Heading, subcopy. Fields: License Number, Agency Name, Years of Experience, Bio, Service Cities (multi-select pills from the fixed city list). Submit.

**USER ACTIONS AVAILABLE**: Sign in (if needed); fill and submit.

**STATES**: Loading (auth check), signed-out prompt, submitted confirmation ("Application Received"), inline errors (generic failure, or "you already have an application on file" — handled by updating an existing partial record rather than failing).

**DATA SOURCE**: `agent_profiles` (insert or update, status defaults 'pending'), `agent_service_cities`.

### 3.20 My Listings — `/dashboard/my-listings`

**STATUS**: REAL (fully wired)

**PURPOSE**: Management screen for a signed-in user's own submitted listings — serves any seller/owner and any agent managing listings they personally submitted (matched by seller_email or user_id, not agent-specific).

**KEY CONTENT ELEMENTS**: Header with live count + signed-in email, "← Dashboard," "+ New Listing." Search (title/city/locality/status) and filter pills (Status, Type). Card: photo, status badge (Active/Pending Review/Rejected/Inactive/Sold), category · type, title, city, price ("Price on request" if none), listed date, real view count, an expandable Status History panel. Conditional action buttons: View (active only), Edit, Delete, **Request 360° Capture**.

**360° Capture UI**: each listing shows exactly one of: an active "Request 360° Capture" button, a "360° Request Pending" pill, or a "360° Capture Scheduled" pill — never more than one, to prevent duplicate requests.

**USER ACTIONS AVAILABLE**: Search/filter; view a live listing; edit; delete (confirmation); request 360° capture (once); expand Status History; create a new listing.

**STATES**: Loading, signed-out, zero listings, filtered-to-zero, Status History loading/empty/populated, delete confirmation + optimistic removal or error alert.

**DATA SOURCE**: `property_listings` (owned rows), `capture_360_requests` (per-listing status, batched), `property_view_events` (per-listing real counts, batched), `listing_status_history` (on-demand per listing).

---

## 4. BUYER ACCOUNT, AUTH &amp; UTILITY SCREENS

### 4.1 Login

**STATUS**: REAL (fully wired) — though production shows this content as an overlay modal over the homepage rather than navigating to this page; treat the content below as canonical regardless.

**PURPOSE**: Let a returning user sign in.

**KEY CONTENT ELEMENTS**: A branding panel (logo, headline, value-prop, trust badges) beside the actual form: "Welcome back" heading with a link to Register, Email, Password (show/hide toggle), Remember Me checkbox, Forgot Password link, Sign In button, "or continue with" divider, Continue with Google, Sign in with Phone OTP.

**USER ACTIONS AVAILABLE**: Submit email/password; toggle password visibility; check Remember Me; navigate to Forgot Password or Register; Google sign-in; phone-OTP sign-in.

**STATES**: Default, focused field, loading ("Signing In…"), error (invalid credentials / network / other, distinguished), success (silent redirect, no shown success state).

**DATA SOURCE**: Supabase Auth (email/password). On success, `profiles.role` decides landing destination (buyer/seller → dashboard, agent/builder → agent dashboard, admin → admin panel).

### 4.2 Register / Sign-Up

**STATUS**: REAL (fully wired) — same modal-vs-page production nuance as Login.

**PURPOSE**: Let a new user create an account, choosing buyer, agent, or builder.

**KEY CONTENT ELEMENTS**: Same branding-panel pattern. "Create your account" heading with a Sign In link. "Sign up with Google." Account-type selector — three cards: **Individual** ("Buy, Rent or Sell Property"), **Agent** ("Manage Listings &amp; Clients," badged "RERA Required"), **Builder** ("Manage Development Projects," badged "RERA Required"). Full Name, Email, Mobile (+91 prefix), Password + Confirm Password (show/hide). A conditional "Agent Details" section (Agent/Builder only): RERA Registration No. (required), Agency Name (optional), Cities You Operate In. A Terms/Privacy agreement checkbox (required to submit). Submit button, label changes by account type.

**USER ACTIONS AVAILABLE**: Select account type; fill and submit; toggle password visibility; agree to terms; Google sign-up; navigate to Login.

**STATES**: Default, conditional field reveal, validation errors (password mismatch, terms not agreed), loading ("Creating Account…"), server error (account exists / weak password / network / other), success (silent redirect to dashboard).

**DATA SOURCE**: Supabase Auth `signUp()` — full name, phone, account type, RERA number, agency name, and cities are stored as auth user metadata at signup, not written directly to `profiles`/`agent_profiles` by this screen.

### 4.3 Forgot Password

**STATUS**: STUB — submitting does nothing but redirect to Login. No email is sent.

**PURPOSE**: Intended to let a user request a password-reset email.

**KEY CONTENT ELEMENTS**: "Reset Your Password" heading, Email field, "Send Reset Link" button, "Back to Sign In" link.

**USER ACTIONS AVAILABLE**: Enter an email and submit (currently a no-op beyond navigation).

**STATES**: Default only.

**DATA SOURCE**: None. Design the intended real UX from this content, don't assume a working reset flow exists to reference.

### 4.4 Auth Error Page

**STATUS**: REAL (fully wired) — a simple static fallback that does exactly what it claims, no backend needed.

**PURPOSE**: Fallback screen shown when an auth flow (OAuth callback, magic link) fails.

**KEY CONTENT ELEMENTS**: "Sign-In Failed" heading, reassurance text ("No changes were made to your account"), "Back to Home" button.

**USER ACTIONS AVAILABLE**: Return home.

**STATES**: Single static state.

**DATA SOURCE**: None — no parameters from the failed attempt are surfaced.

### 4.5 Main Dashboard (Buyer/Individual) — `/dashboard`

**STATUS**: REAL (fully wired), except the Settings tab — see below.

**PURPOSE**: The signed-in buyer's home base — activity summary plus tabbed access to listings, saves, searches, profile, inquiries received, appointments, settings.

**Layout**: persistent sidebar with 8 tabs — Overview, My Listings, Saved Properties, Recent Searches, Profile, My Inquiries, Appointments, Settings. (This shell also serves signed-in agents with a different tab set, out of scope here. "My Listings" is its own full screen, described in §3.20.)

**Overview tab**: greeting, 4 stat cards (Total Listings, Active Listings, Saved Properties, Profile Completion %), a completion progress bar with an Edit Profile prompt, a pending-review warning banner when applicable, two charts (Saved Searches Over Time, Inquiries Received), a condensed own-listings table, a Quick Actions card (Browse Properties, List Your Property, Calculate EMI). *Data: `property_listings`, `saved_properties`, `profiles`.*

**Saved Properties tab**: live count heading, per-property cards (thumbnail, type tag, title, city, saved date, price), Remove action, loading, empty (Browse CTA). *Data: `saved_properties` + listing snapshot fields stored at save time.*

**Recent Searches tab**: identical content to the standalone Saved Searches screen (§4.6) — same component reused.

**Profile tab**: avatar + name/email + a completion ring ("N fields remaining"). Personal Information (Full Name, Phone, City, WhatsApp, Bio). Additional Information (Date of Birth, Gender, Nationality, an NRI Status toggle). Read-only Account Details (Email, truncated Account ID). Save Changes with a toast confirmation. *Data: `profiles` — a second, fuller editor for the same table as the standalone Profile Edit screen (§4.8), which only exposes 4 of these 12+ fields; worth a deliberate merge-or-keep-both decision for the native app rather than silently replicating two inconsistent editors.*

**My Inquiries tab**: this is the seller side of inquiries — inquiries this user has *received* on their own listings. Live count, a property filter (deep-linkable), per-inquiry cards (inquirer name, type badge Viewing/Callback, status badge New/Contacted/Closed, date, linked property, tap-to-call/email, message, inline status-change buttons). Loading, empty (View My Listings CTA), filtered-view chip. *Data: `inquiries`, filtered to this user's own listings.*

**Appointments tab**: "My Appointments" — this user's own booked viewings (as a visitor). Per-visit cards (property, status badge Pending/Confirmed/Completed/Cancelled, date, time slot). Read-only — no reschedule/cancel here. Loading, empty (Browse Properties CTA). *Data: `site_visits`, filtered to `visitor_user_id` = this user.*

**Settings tab — STUB**: a "Preferences" card (name, read-only email, phone, preferred cities, budget min/max, Save Changes), a "Change Password" card, a "Danger Zone" delete-account card with a two-step confirm. **Every Save/Update/Delete action here only sets local component state and shows a fake success message — nothing is written to Supabase, no password is changed, no account is deleted.**

**USER ACTIONS AVAILABLE (Overview/Saved/Recent Searches/Profile/Inquiries/Appointments)**: as detailed per tab above.

**DATA SOURCE**: See per-tab notes above.

### 4.6 Saved Searches — `/dashboard/searches`

**STATUS**: REAL (fully wired)

**PURPOSE**: Manage saved property searches and control new-match email alerts.

**KEY CONTENT ELEMENTS**: "Saved Searches" heading, "← Dashboard" and "+ New Search" (→ `/search`). Per-search card: saved name (or "Saved Search"), a human-readable filter summary (e.g. "Sale · Apartment · Hyderabad · 2 BHK · ₹50L–₹1.0Cr"), saved date, an Alerts On/Muted toggle pill, "Search →" (re-runs it), Delete.

**USER ACTIONS AVAILABLE**: Toggle alerts, re-run, delete (confirm), start a new search.

**STATES**: Loading, signed-out, empty (with explanation + Browse &amp; Save CTA), populated.

**DATA SOURCE**: `saved_searches` (name, filters JSON, alert_email flag, created_at).

### 4.7 Notifications

**STATUS**: REAL (fully wired)

**PURPOSE**: Full history of the user's in-app notifications, plus a navbar bell for quick access.

**Full page**: "Notifications" heading, "Mark all read" (when unread exist), All/Unread filter pills, per-notification cards (icon, title, body, relative timestamp; unread items get an accent stripe, bolder title, a Mark Read button), "Load more" pagination (25 at a time), "← Dashboard."

**Bell (navbar dropdown)**: unread-count badge ("9+" beyond 9), a dropdown of the 8 most recent (same per-item content, smaller), a Mark All Read shortcut, "See all notifications →."

**USER ACTIONS AVAILABLE**: Filter read/unread; mark one or all read (clicking a notification also navigates to its linked destination); load more; open/close the bell dropdown.

**STATES**: Loading, signed-out, error, empty ("Nothing unread" / "No notifications yet"), populated + pagination.

**The six real notification types** (each server-generated, pairing an in-app insert with a fire-and-forget WhatsApp message):
1. **Incomplete agent/builder registration → admins** — despite the generic name, this fires *only* when the registration is missing required info; a complete registration only sends an email, no in-app notification.
2. **"Contact this agent" submitted → that agent.**
3. **360° capture requested → all admins.**
4. **360° capture scheduled/declined → the requester** (declined includes any suggested alternative dates and a reason).
5. **Listing changes requested → the submitter or assigned agent** (agent takes priority when one is assigned) — links straight to the listing's edit screen.
6. **Listing saved → the owner or assigned agent** (never fires on your own save, never on unsave).

A seventh source exists outside the six `notify-*` routes: a daily cron posts in-app-only agent-facing follow-up reminders (no WhatsApp) — worth knowing the feed isn't exclusively driven by the six above.

**DATA SOURCE**: `notifications`, scoped to the signed-in user's own rows; `status` drives read/unread, `action_url` drives tap-through, `type` drives the icon.

### 4.8 Profile Edit — `/profile/edit`

**STATUS**: REAL (fully wired) — a lighter, standalone subset of the dashboard's own Profile tab (§4.5), editing the same table with a smaller field set.

**PURPOSE**: A lightweight standalone profile editor.

**KEY CONTENT ELEMENTS**: "Edit Profile" heading with the user's email as subtitle, "← Dashboard," a single form: Full Name, Phone Number, City, Bio — the entire field set. Save Changes with a "✓ Profile saved" confirmation.

**USER ACTIONS AVAILABLE**: Edit and save; navigate back.

**STATES**: Loading, signed-out, saving, success, error.

**DATA SOURCE**: `profiles` — `full_name`, `phone`, `city`, `bio`, `updated_at`. See the §4.5 note on this and the dashboard Profile tab being two inconsistent editors of the same table today.

### 4.9 Property Valuation — `/valuation`

**STATUS**: STUB — "Coming Soon," no working calculator.

**PURPOSE**: Intended as an instant property-value estimator.

**KEY CONTENT ELEMENTS**: "Property Valuation" heading, a "Coming Soon" badge, three feature-preview bullets describing the intended tool (Instant Estimates, Locality Benchmarks, Expert Review).

**USER ACTIONS AVAILABLE**: None — no interactive form exists.

**STATES**: Single static state.

**DATA SOURCE**: None. Either design this as an honest placeholder/waitlist for the native app, or scope the real valuation tool as new work — don't assume a working calculator to reference.

### 4.10 Calculator Suite — `/calculator`

**STATUS**: REAL (fully wired) — a genuinely functional, five-tool financial suite, purely client-side.

**PURPOSE**: Cover every major property-finance calculation a buyer needs, with results updating live as inputs change (no submit button anywhere).

**Layout**: hero header, a sticky 5-tab bar, a two-column inputs/results layout per tab, a disclaimer footer on every tab.

**Tab 1 — EMI**: Loan Amount, Interest Rate, Tenure inputs (sliders + numeric). Results: a hero Monthly EMI figure, a Principal-vs-Interest donut chart, a breakdown list, and an Amortization Summary table (First Year / a mid-point year / Final Year).

**Tab 2 — Affordability**: Monthly Income, Monthly Expenses, Down Payment Available, Interest Rate, Tenure. Results: Max Property Value, Max Loan Eligible (EMI capped at 45% of disposable income), Monthly EMI at Max Loan, a Recommended Budget Range. A guidance message replaces results if expenses ≥ income.

**Tab 3 — Stamp Duty**: Property Value, State (15 states with real rate tables + a default fallback for the rest), Property Type (Residential/Commercial), Buyer/Ownership (Male/Female/Joint — several states give a female-ownership rebate). Results: Stamp Duty + effective rate, Registration Charges (capped at ₹30,000 in some states), Total Charges, Grand Total including the property price.

**Tab 4 — Rent vs Buy**: Monthly Rent, Property Price, Down Payment %, Interest Rate, Tenure/Horizon, Appreciation %/yr, Rent Increase %/yr. Results: a "Buying Wins"/"Renting Wins" verdict banner with the ₹ difference, Total Cost of Renting, Net Cost of Buying, Appreciation Gain, a Break-Even Point year (or "Beyond horizon").

**Tab 5 — Loan Eligibility**: Monthly Income, Age, Existing EMI Obligations, Desired Tenure, Interest Rate. Results: Max Eligible Loan, Max Property Value (80% LTV assumed), Monthly EMI at Max Loan, an Eligibility Factors breakdown (50% FOIR rule, EMI capacity, age-capped tenure assuming retirement at 65). A guidance message replaces results if existing EMIs already exceed 50% of income.

**USER ACTIONS AVAILABLE**: Adjust any input (slider or direct entry); switch tabs; (Stamp Duty) toggle property type/ownership, select state.

**STATES**: All five tabs are purely reactive — no loading/empty/error states, results recompute on every input change. Affordability and Loan Eligibility have a special "not eligible" message state replacing the results panel when the numbers don't work.

**DATA SOURCE**: None for any tab — pure client-side calculation, nothing persisted or sent to the server.

### 4.11 Investment Calculator — `/investment-calculator`

**STATUS**: REAL — but not a distinct screen. It's a redirect stub straight into the Calculator Suite's Affordability tab. Design any "Investment Calculator" entry point as a deep link into §4.10's Affordability tab, not a sixth separate tool.

### 4.12 Contact — `/contact`

**STATUS**: REAL (fully wired)

**PURPOSE**: The real support/business-inquiry page.

**KEY CONTENT ELEMENTS**: Hero with a response-time promise and three quick-contact pills (Call/Email/WhatsApp, real numbers/addresses). Main inquiry form: Full Name, Email, Phone, Subject (dropdown: General/Buy/Sell/Rent/Agent Partnership/NRI Services/Media &amp; Press), Message, optional Property Type and Budget Range. A Contact Details card (address, phone, email, WhatsApp, hours), a clickable map, social links. An Office Locations section (Hyderabad — real, open; Mumbai and Bengaluru — explicitly "Regional Office · Coming Soon," no address/phone yet). A 6-item FAQ accordion. A closing CTA band.

**USER ACTIONS AVAILABLE**: Fill and submit the inquiry form; call/email/WhatsApp via quick pills; open the map; visit social links; expand FAQs; Browse Properties/WhatsApp Us from the closer.

**STATES**: Default, validation error banner, submitting, success (a full "Message Sent Successfully" panel replacing the form, with a Send Another Message reset), submit error banner.

**DATA SOURCE**: Inserts into a `contact_messages` table plus a fire-and-forget support-inbox email; signed-in visitors get Name/Email/Phone pre-filled from `profiles` where blank.

### 4.13 Connect — `/connect`

**STATUS**: REAL (fully wired) as a static link-hub page, but several individual tiles inside it are explicit placeholders — see the stub list at the top.

**PURPOSE**: A single-page "link-in-bio"-style hub of every way to reach or follow the company — not a functional inquiry form (that's Contact, §4.12).

**KEY CONTENT ELEMENTS**: Header/nav, hero, a QR code linking to an external feedback survey, social icon row, a "Book a Consultation" 3-card row (Phone/Video/Office — each opens a pre-filled WhatsApp message, no real booking system), a "Need Help" row (WhatsApp/Call/Email), an "Explore More" 6-tile row, a 4-item FAQ accordion, a "Contact &amp; Support" row including "Raise a Support Ticket" (also just opens WhatsApp), a "Become a Partner" panel (→ Contact), a "Quick Resources" row of 4 disabled "Coming Soon" downloads, two unlinked "Coming Soon" app-store badges, a trust-tile panel, a full footer with a newsletter signup.

**USER ACTIONS AVAILABLE**: Tap through to WhatsApp (multiple pre-filled entry points), call, email, open the QR form, follow social links, navigate to other pages, expand FAQs, submit the newsletter field.

**STATES**: Mostly static/link-based. The newsletter form's only state change on submit: a message saying there's no automated subscription yet, to use WhatsApp or Contact instead.

**DATA SOURCE**: None — entirely static content and external/`wa.me` links.

**For the native app**: `/contact` is the reference for a real "Contact Us"/"Request a Callback" flow; `/connect` is closer to inspiration for a "Quick Actions"/"Get in Touch" hub screen — but almost everything on it that looks like a feature (booking, ticketing, downloads, app badges, newsletter) is an explicit placeholder pointing to WhatsApp or "Coming Soon." Don't design backend behavior around those without new engineering scope.

### 4.14 Site-Visit Request (modal, on the Property Detail page)

**STATUS**: REAL (fully wired)

**PURPOSE**: Let a visitor (signed in or not) request an in-person viewing directly from a property's detail page.

**KEY CONTENT ELEMENTS**: "Schedule a Site Visit" heading with the property title. Preferred Date (no past dates). Time Slot pills (Morning 10am–12pm, Afternoon 12pm–3pm, Evening 3pm–6pm). Your Name, Phone Number. Confirm Visit button.

**USER ACTIONS AVAILABLE**: Pick date/slot; enter name/phone; submit; close (× / backdrop / Done after success).

**STATES**: Default, validation error (missing name/phone/date), submitting ("Scheduling…"), server error, success ("📅 Visit Scheduled! The seller will confirm your appointment").

**DATA SOURCE**: `site_visits` insert (property_id, property_slug, property_title, seller_email, visitor_name, visitor_phone, visit_date, visit_time_slot, status defaults 'pending', visitor_user_id if signed in else null — both signed-in and anonymous bookings are permitted). Also fires a fire-and-forget email to the seller. This is the same table powering the buyer's own Appointments tab (§4.5) and the agent-side site-visit screens (§3.7–3.8) — status values are shared across all three surfaces.

---

## 5. ADMIN PANEL

All admin screens live behind a single sign-in gate: only `admin`/`super_admin` role accounts can enter. Every admin screen is a section within one panel with a persistent sidebar.

### 5.1 Overview

**STATUS**: REAL (fully wired)

**PURPOSE**: At-a-glance health dashboard for the whole platform.

**KEY CONTENT ELEMENTS**: Seven stat cards — Pending Review, Active Listings, Rejected, Total Users, Total Inquiries, Open Reports, Total Views. Three trend charts: listings submitted over time, agent applications over time, inquiries over time.

**USER ACTIONS AVAILABLE**: Navigate to any other admin section.

**STATES**: Loading.

**DATA SOURCE**: Counts from `property_listings` (by status), `profiles`, `inquiries`, `reports` (open), `property_view_events`.

### 5.2 Listings

**STATUS**: REAL (fully wired)

**PURPOSE**: Single moderation queue for every listing regardless of status.

**KEY CONTENT ELEMENTS**: A status filter (Pending Review / Active / Rejected / Changes Requested / Frozen, one at a time), a search box (title/city/locality/seller/assigned-agent name), a sort-by-date toggle, a running count. Card: thumbnail, tag, status badge, submitted date, title, category, locality/city, price, seller contact links, an assign-agent control, a Kuula tour URL field, a Google Maps URL field.

**USER ACTIONS AVAILABLE**: Switch filter, search, sort, open the full Preview (§5.3), assign/unassign an agent, save/clear the Kuula/Maps URLs. Status-dependent primary actions: Pending Review → Approve/Reject/Request Changes (note required, sent to submitter); Active → Unpublish (reason + optional note); Rejected → Re-approve. Changes-Requested and Frozen show no direct action here.

**STATES**: Loading, empty per filter, empty-search-match, per-listing in-flight/busy state.

**DATA SOURCE**: `property_listings`, `agent_profiles`/`profiles` (assign-agent list).

### 5.3 Listing Preview (modal, opened from Listings)

**STATUS**: REAL (fully wired)

**PURPOSE**: Let an admin review a listing's complete real content — including not-yet-public listings — without the public site showing it.

**KEY CONTENT ELEMENTS**: Title, locality/city. A photo gallery, a video player (shown only if processed), a floor-plans strip (shown only if any exist). A specs row (price/rent, category, built-up area or deposit, bedrooms, bathrooms, facing, furnishing, maintenance for rentals). A second row (listed-by, RERA, brokerage terms — "Not disclosed" unless the lister opted to show it). Amenities tags. A highlights/description block. Seller contact details.

**USER ACTIONS AVAILABLE**: Approve, Reject, Request Changes (same as §5.2), and "Edit as Admin" (opens the exact same edit form the owner uses).

**STATES**: Loading (a fresh fetch of the full row + floor plans on open). Sections with nothing to show are omitted.

**DATA SOURCE**: `property_listings` (full row), `property_floor_plans`.

### 5.4 Agents

**STATUS**: REAL (fully wired)

**PURPOSE**: Review and manage agent (and builder) applications.

**KEY CONTENT ELEMENTS**: A status filter (Pending/Approved/Rejected/Incomplete). Per application: name, phone, email, role, license number, agency name, years experience, bio, RERA/OC numbers, a verified-badge indicator, cities served, and a missing-required-field flag for pending applications.

**USER ACTIONS AVAILABLE**: Switch filter, approve/reject, view/download KYC documents.

**STATES**: Loading, empty per filter.

**DATA SOURCE**: `agent_profiles`, `profiles`, `agent_service_cities`, `documents`.

### 5.5 360° Requests

**STATUS**: REAL (fully wired)

**PURPOSE**: Manage seller/agent requests for professional 360° photography capture.

**KEY CONTENT ELEMENTS**: A status filter (Pending/Scheduled/Completed/Declined). Per request: property, requester, the requester's own stated preference, and once actioned, the admin's confirmed date/time or (if declined) up to two suggested alternative dates plus a decline note.

**USER ACTIONS AVAILABLE**: Switch filter; schedule (confirmed date/time); decline (note + up to two alternatives); mark completed.

**STATES**: Loading, empty per filter.

**DATA SOURCE**: `capture_360_requests`.

### 5.6 All Users

**STATUS**: REAL (fully wired)

**PURPOSE**: Manage every registered account.

**KEY CONTENT ELEMENTS**: Per user: full name, city, role, phone, email, join date, verification badge, active/inactive status, NRI flag, WhatsApp, nationality, bio, subscription tier.

**USER ACTIONS AVAILABLE**: Change role (full real list: buyer, seller, agent, agency, moderator, content manager, support, finance manager, sales manager, admin, builder), toggle verified, toggle active/inactive.

**STATES**: Loading; a separate active-users count with its own loading state.

**DATA SOURCE**: `profiles`.

### 5.7 All Inquiries

**STATUS**: REAL (fully wired)

**PURPOSE**: Oversight view of every buyer inquiry platform-wide (the agent-facing Leads screen is scoped to one agent's own assignments).

**KEY CONTENT ELEMENTS**: Per inquiry: property, seller, inquirer name/email/phone, message, type, status, submitted date, assigned agent.

**USER ACTIONS AVAILABLE**: View inquiry detail.

**STATES**: Loading, empty.

**DATA SOURCE**: `inquiries`.

### 5.8 Agent Performance

**STATUS**: REAL (fully wired)

**PURPOSE**: Per-agent performance metrics for internal review.

**KEY CONTENT ELEMENTS**: Charted/tabular figures per agent (listings, activity level).

**USER ACTIONS AVAILABLE**: View a given agent's figures.

**STATES**: Loading.

**DATA SOURCE**: `agent_profiles`, `property_listings`, `inquiries`.

### 5.9 Leaderboard

**STATUS**: REAL (fully wired)

**PURPOSE**: Admin-side view of the same agent leaderboard agents see themselves, for oversight.

**KEY CONTENT ELEMENTS**: Ranked agent list, respecting any agent's opt-out.

**USER ACTIONS AVAILABLE**: View ranking.

**STATES**: Loading.

**DATA SOURCE**: `agent_profiles`, `profiles` — computed live, no dedicated table.

### 5.10 Reports

**STATUS**: REAL (fully wired)

**PURPOSE**: The moderation/grievance queue and compliance-SLA tracking.

**KEY CONTENT ELEMENTS**: A status filter (Open/Acknowledged/Frozen/Under Review/Resolved/Dismissed). Per report: what was reported (a live preview of the listing or profile), who reported it, reason/details, filed date, an SLA "acknowledge by" timestamp once acknowledged, who resolved it and when, and the "deletion request" report type as a distinct sub-case (an agent's own self-service request, not a third-party flag).

**USER ACTIONS AVAILABLE**: Switch filter; acknowledge (starts a 48-hour SLA clock); move under review; resolve/dismiss; freeze the reported listing directly from its report or unfreeze it — the only path anywhere in the admin panel that sets/clears a listing's Frozen status; a direct Reject-listing shortcut for listing reports.

**STATES**: Loading, empty per filter.

**DATA SOURCE**: `reports`, live-joined to `property_listings` or `profiles` depending on entity type.

### 5.11 Site Content

**STATUS**: REAL (fully wired)

**PURPOSE**: Edit the homepage's editable copy without a code deploy.

**KEY CONTENT ELEMENTS**: A list of editable content keys (hero headline, subline, trust-bar note, etc.) with current text values.

**USER ACTIONS AVAILABLE**: Edit and save any key's value.

**STATES**: Loading, per-field unsaved-changes indicator, saved confirmation.

**DATA SOURCE**: `site_content`.

### 5.12 Audit Log

**STATUS**: REAL (fully wired)

**PURPOSE**: Read-only record of every admin write action anywhere in the panel.

**KEY CONTENT ELEMENTS**: Per entry: which admin, what action, what entity, before/after values, when.

**USER ACTIONS AVAILABLE**: Browse/scroll. Read-only — no entry can ever be edited or deleted, including by admins.

**STATES**: Loading, empty (unlikely in practice).

**DATA SOURCE**: `admin_audit_log`.

---

## Methodology note

Property discovery, the property detail page, and the landing/locations
pages (Section 1) were investigated directly by reading the real source
files after an earlier automated research pass on this section failed
silently without producing usable output. Every other section (2–5)
came from independent research passes, each verified against the actual
codebase rather than assumed from names or prior conversation memory.
STATUS was assigned only where the underlying code's real behavior —
a working database write, a no-op that just redirects, a hardcoded
placeholder — could be directly confirmed, not guessed from how
finished a screen looks visually.
