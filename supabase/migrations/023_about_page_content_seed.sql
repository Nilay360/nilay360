-- ═══════════════════════════════════════════════════════════════
-- 023 — Seed site_content with About page copy
--
-- Migrates the About page's singular editable text blocks (hero,
-- story, mission/vision, section headings, CTA) into site_content so
-- they're admin-editable, matching the current hardcoded copy exactly
-- so nothing visually changes until an admin edits a value.
--
-- Deliberately NOT migrated here (left as code): the TEAM, FEATURES,
-- AWARDS, and TIMELINE arrays — each item has multiple structured
-- fields (icon/title/desc, name/role/bio, etc.) that don't fit a flat
-- key-value row cleanly; and the page's own inline footer block,
-- which will get its own dedicated pass since the real footer is a
-- shared component used site-wide, not About-page-specific.
-- ═══════════════════════════════════════════════════════════════

insert into public.site_content (key, value) values
  ('about_hero_title',           E'India''s Most Trusted\nPremium Real Estate Platform'),
  ('about_hero_quote',           'Your Trust. Our Promise.'),
  ('about_hero_description',     'Nilay 360 was built on a conviction that India''s premium property buyers deserve more — more transparency, more expertise, and more integrity than the market has historically provided.'),
  ('about_story_heading_line1',  'Born From a'),
  ('about_story_heading_line2',  'Simple Belief'),
  ('about_story_paragraph1',     'Nilay 360 was founded in 2024 with a straightforward conviction: India''s most discerning property buyers deserved a platform that matched their standards. The existing market — fragmented, opaque, riddled with unverified listings and unqualified agents — was failing them.'),
  ('about_story_paragraph2',     'Starting in Hyderabad, we built from first principles. Every listing manually verified. Every agent background-checked and RERA-certified. Every piece of market data sourced from real transactions. Within three months we had 100 listings — and a waitlist of agents who wanted to join a platform that actually cared about quality.'),
  ('about_story_paragraph3',     'Today Nilay 360 operates across 14 cities, has facilitated over ₹18,000 crore in property transactions, and has become the benchmark for what premium real estate looks like in India. We''re just getting started.'),
  ('about_story_quote',          'Premium real estate deserves a premium experience — from first search to final signature.'),
  ('about_mission_heading',      'Why We Exist'),
  ('about_mission_text',         'To simplify India''s premium property market by connecting serious buyers with verified listings, certified agents, and independent legal guidance — removing uncertainty at every step of the transaction.'),
  ('about_vision_text',          'To become the most trusted real estate platform in India — the name every premium buyer, NRI investor, and luxury developer thinks of first when quality, integrity, and expertise matter most.'),
  ('about_why_heading_line1',    'Why Discerning Buyers'),
  ('about_why_heading_line2',    'Choose Nilay 360'),
  ('about_stats_heading_line1',  'The Numbers Behind'),
  ('about_stats_heading_line2',  'Our Promise'),
  ('about_team_heading',         'Leadership Team'),
  ('about_team_subtitle',        'Experienced operators, technologists, and real estate professionals united by a single standard: excellence.'),
  ('about_awards_heading',       'Awards & Certifications'),
  ('about_testimonials_heading', 'Trusted by Thousands'),
  ('about_cta_heading_line1',    'Join Thousands of'),
  ('about_cta_heading_line2',    'Satisfied Clients'),
  ('about_cta_description',      'Whether you''re buying, selling, investing, or renting — Nilay 360 gives you the expertise, the data, and the integrity to make the right decision with complete confidence.'),
  ('about_cta_button_primary',   'Browse Properties'),
  ('about_cta_button_secondary', 'Contact Us')
on conflict (key) do nothing;
