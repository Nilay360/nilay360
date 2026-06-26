-- ============================================================
-- NIVILA — Seed Data
-- Cities + Sample Property Listings
-- ============================================================

-- ============================================================
-- CITIES
-- ============================================================

INSERT INTO cities (id, name, slug, state, country, latitude, longitude, overview, population, avg_sale_price, avg_rent_price, price_growth_yoy, is_featured, listing_count) VALUES
(
  '11111111-0000-0000-0000-000000000001',
  'Hyderabad',
  'hyderabad',
  'Telangana',
  'India',
  17.38500000,
  78.48600000,
  'The City of Pearls, Hyderabad is one of India''s fastest-growing metropolises. Home to a thriving IT corridor, world-class infrastructure, and a rich cultural heritage, it offers unmatched real estate value with some of the finest luxury developments in South India.',
  10500000,
  95000,
  42000,
  14.20,
  TRUE,
  8
),
(
  '11111111-0000-0000-0000-000000000002',
  'Mumbai',
  'mumbai',
  'Maharashtra',
  'India',
  19.07600000,
  72.87760000,
  'India''s financial capital and home to Bollywood, Mumbai commands the country''s most premium real estate. From sea-facing penthouses in Worli to heritage bungalows in Bandra, the city defines aspirational living at its finest.',
  20700000,
  185000,
  95000,
  9.80,
  TRUE,
  0
),
(
  '11111111-0000-0000-0000-000000000003',
  'Bengaluru',
  'bengaluru',
  'Karnataka',
  'India',
  12.97194000,
  77.59369000,
  'The Silicon Valley of India, Bengaluru is the epicentre of the country''s technology boom. With a temperate climate, cosmopolitan culture, and rapidly appreciating property values, it draws investors and homebuyers from across the globe.',
  13200000,
  112000,
  55000,
  11.50,
  TRUE,
  0
);

-- ============================================================
-- NEIGHBOURHOODS (Hyderabad)
-- ============================================================

INSERT INTO neighbourhoods (id, city_id, name, slug, description, avg_price, is_trending) VALUES
(
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'Jubilee Hills',
  'jubilee-hills',
  'Hyderabad''s most prestigious address, home to Bollywood stars, industrialists, and top executives. Wide tree-lined avenues, exclusive clubs, and a vibrant restaurant scene.',
  145000,
  FALSE
),
(
  '22222222-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  'Kokapet',
  'kokapet',
  'The new financial district''s premier residential precinct. Ultra-modern high-rises with panoramic views, walking distance to Hyderabad''s fastest-growing business hub.',
  98000,
  TRUE
),
(
  '22222222-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  'Banjara Hills',
  'banjara-hills',
  'An iconic address synonymous with old money and new luxury. Rolling hills, art galleries, five-star hotels, and the city''s finest dining all within reach.',
  138000,
  FALSE
),
(
  '22222222-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000001',
  'Gachibowli',
  'gachibowli',
  'At the heart of the IT corridor, Gachibowli blends corporate energy with upscale residential living. Superb connectivity, top schools, and modern amenities.',
  88000,
  TRUE
);

-- ============================================================
-- PROPERTIES
-- ============================================================

-- 1. Jubilee Hills — 4BHK Villa — Sale — Featured
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'luxe-villa-jubilee-hills-4bhk',
  'Sovereign Villa — Jubilee Hills',
  'An extraordinary 4-bedroom private villa set within a lush 6,200 sq ft plot in the heart of Jubilee Hills. Designed by a celebrated Mumbai-based architect, the residence features soaring double-height ceilings, imported Italian marble flooring, a private temperature-controlled pool, and a rooftop entertainment deck with panoramic city views. The chef''s kitchen is equipped with Gaggenau appliances, and each bedroom suite opens onto a private terrace.',
  'villa',
  'sale',
  'active',
  'approved',
  85000000,   -- 8.5 Cr
  13709,
  TRUE,
  6200, 4, 5, 3, NULL, 2,
  2021, TRUE,
  '12-A, Road No. 36, Jubilee Hills', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Jubilee Hills',
  '22222222-0000-0000-0000-000000000001',
  'Telangana', '500033',
  17.43120000, 78.40980000,
  ARRAY[
    'https://picsum.photos/seed/prop1a/1200/800',
    'https://picsum.photos/seed/prop1b/1200/800',
    'https://picsum.photos/seed/prop1c/1200/800',
    'https://picsum.photos/seed/prop1d/1200/800'
  ],
  ARRAY['Private Pool','Rooftop Deck','Home Theatre','Smart Home Automation','Modular Kitchen','Gym','Solar Power','3-Car Garage','CCTV Security','Landscaped Garden'],
  'North-East', TRUE,
  'P02040011029374', 'Freehold', TRUE,
  TRUE, 412, 38, 14,
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '2 days'
);

-- 2. Kokapet — 3BHK Apartment — Sale — Featured
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'horizon-sky-residence-kokapet-3bhk',
  'Horizon Sky Residence — Kokapet',
  'A breathtaking 3-bedroom sky residence on the 28th floor of Kokapet''s most coveted tower. The 2,450 sq ft home commands uninterrupted views of the Financial District skyline and the Osman Sagar reservoir beyond. Floor-to-ceiling glazing, a wrap-around balcony, and premium Hafele fittings create an effortlessly sophisticated living experience. The building offers resort-style amenities across five dedicated floors.',
  'apartment',
  'sale',
  'active',
  'approved',
  32000000,   -- 3.2 Cr
  13061,
  FALSE,
  2450, 3, 3, 2, 28, 35,
  2023, TRUE,
  'Prestige Towers, Kokapet Financial District', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Kokapet',
  '22222222-0000-0000-0000-000000000002',
  'Telangana', '500075',
  17.40560000, 78.32140000,
  ARRAY[
    'https://picsum.photos/seed/prop2a/1200/800',
    'https://picsum.photos/seed/prop2b/1200/800',
    'https://picsum.photos/seed/prop2c/1200/800',
    'https://picsum.photos/seed/prop2d/1200/800'
  ],
  ARRAY['Infinity Pool','Sky Lounge','Co-Working Space','Concierge Service','EV Charging','Gymnasium','Steam & Sauna','Clubhouse','Children Play Area','24/7 Security'],
  'East', TRUE,
  'P02040011041892', 'Freehold', TRUE,
  TRUE, 874, 67, 22,
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'
);

-- 3. Banjara Hills — 4BHK Penthouse — Sale — Featured
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000003',
  'celestial-penthouse-banjara-hills',
  'Celestial Penthouse — Banjara Hills',
  'An ultra-rare duplex penthouse occupying the entire top two floors of a landmark Banjara Hills address. Spanning 5,800 sq ft across two levels, this extraordinary residence features a private rooftop pool, a 1,200 sq ft master suite with his-and-her dressing rooms, a dedicated staff quarter, and a private elevator from the basement garage. Finished to the highest international standard, this is genuinely one of the finest homes in South India.',
  'penthouse',
  'sale',
  'active',
  'approved',
  145000000,  -- 14.5 Cr
  25000,
  FALSE,
  5800, 4, 5, 4, 19, 20,
  2022, TRUE,
  'Oberoi Skies, Road No. 12, Banjara Hills', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Banjara Hills',
  '22222222-0000-0000-0000-000000000003',
  'Telangana', '500034',
  17.41750000, 78.44380000,
  ARRAY[
    'https://picsum.photos/seed/prop3a/1200/800',
    'https://picsum.photos/seed/prop3b/1200/800',
    'https://picsum.photos/seed/prop3c/1200/800',
    'https://picsum.photos/seed/prop3d/1200/800',
    'https://picsum.photos/seed/prop3e/1200/800'
  ],
  ARRAY['Private Rooftop Pool','Private Lift','Wine Cellar','Home Automation','4-Car Parking','Staff Quarters','Panic Room','CCTV & Armed Security','Italian Marble Flooring','Designer Kitchen'],
  'North', TRUE,
  'P02040011038561', 'Freehold', TRUE,
  TRUE, 1203, 94, 31,
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 hours'
);

-- 4. Gachibowli — 3BHK Apartment — Sale — Featured
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000004',
  'emerald-heights-gachibowli-3bhk',
  'Emerald Heights — Gachibowli',
  'Perfectly positioned for the discerning IT professional, this 3-bedroom apartment in the heart of Gachibowli places HITEC City, the Financial District, and DLF Cybercity within minutes. The 1,980 sq ft home features an open-plan living area, semi-furnished with premium wardrobes and modular kitchen, a dedicated study, and a large covered balcony overlooking the landscaped podium gardens.',
  'apartment',
  'sale',
  'active',
  'approved',
  19500000,   -- 1.95 Cr
  9848,
  TRUE,
  1980, 3, 3, 2, 14, 28,
  2022, FALSE,
  'Aparna Sarovar Grande, Nallagandla, Gachibowli', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Gachibowli',
  '22222222-0000-0000-0000-000000000004',
  'Telangana', '500019',
  17.44280000, 78.35760000,
  ARRAY[
    'https://picsum.photos/seed/prop4a/1200/800',
    'https://picsum.photos/seed/prop4b/1200/800',
    'https://picsum.photos/seed/prop4c/1200/800'
  ],
  ARRAY['Swimming Pool','Clubhouse','Gym','Jogging Track','Badminton Court','Children Play Area','Power Backup','Intercom','CCTV','Covered Parking'],
  'East', TRUE,
  'P02040011052341', 'Freehold', TRUE,
  TRUE, 538, 41, 17,
  NOW() - INTERVAL '22 days', NOW() - INTERVAL '3 days'
);

-- 5. Jubilee Hills — 3BHK Apartment — Rent
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable, deposit_amount,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000005',
  'park-avenue-jubilee-hills-3bhk-rent',
  'Park Avenue Residences — Jubilee Hills',
  'A fully furnished 3-bedroom apartment available for rent in one of Jubilee Hills'' most sought-after gated communities. The 2,100 sq ft home has been recently refurbished with new furnishings, fresh paintwork, and upgraded appliances. The community features a large swimming pool, fully equipped gym, and round-the-clock security. Ideal for senior executives and families relocating to Hyderabad.',
  'apartment',
  'rent',
  'active',
  'approved',
  110000,     -- ₹1.10 Lakh/month
  52,
  TRUE,
  330000,     -- 3 month deposit
  2100, 3, 3, 2, 7, 14,
  2019, TRUE,
  'Park Avenue, Road No. 45, Jubilee Hills', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Jubilee Hills',
  '22222222-0000-0000-0000-000000000001',
  'Telangana', '500033',
  17.43460000, 78.40530000,
  ARRAY[
    'https://picsum.photos/seed/prop5a/1200/800',
    'https://picsum.photos/seed/prop5b/1200/800',
    'https://picsum.photos/seed/prop5c/1200/800'
  ],
  ARRAY['Swimming Pool','Gym','Club House','24/7 Security','Power Backup','Wi-Fi Ready','Modular Kitchen','Covered Parking','Garden','Intercom'],
  'North-East', FALSE,
  NULL, 'Freehold', TRUE,
  FALSE, 287, 19, 8,
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '4 days'
);

-- 6. Kokapet — 2BHK Apartment — Rent
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable, deposit_amount,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000006',
  'skyline-one-kokapet-2bhk-rent',
  'Skyline One — Kokapet',
  'A modern semi-furnished 2-bedroom apartment on the 18th floor of the premium Skyline One tower in Kokapet. Stunning Financial District views from both bedrooms and the living room. The apartment features an open kitchen with granite countertops, two well-proportioned bedrooms with built-in wardrobes, and a spacious balcony. Walking distance to major IT campuses and the proposed metro station.',
  'apartment',
  'rent',
  'active',
  'approved',
  65000,      -- ₹65,000/month
  43,
  FALSE,
  130000,     -- 2 month deposit
  1510, 2, 2, 1, 18, 32,
  2023, FALSE,
  'Skyline One, Kokapet Financial District', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Kokapet',
  '22222222-0000-0000-0000-000000000002',
  'Telangana', '500075',
  17.40120000, 78.31870000,
  ARRAY[
    'https://picsum.photos/seed/prop6a/1200/800',
    'https://picsum.photos/seed/prop6b/1200/800',
    'https://picsum.photos/seed/prop6c/1200/800'
  ],
  ARRAY['Gym','Swimming Pool','Concierge','EV Charging','CCTV','Power Backup','Covered Parking','Badminton Court','Rooftop Lounge','24/7 Security'],
  'West', TRUE,
  NULL, 'Freehold', TRUE,
  FALSE, 193, 14, 6,
  NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days'
);

-- 7. Banjara Hills — 5BHK Villa — Sale
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000007',
  'heritage-villa-banjara-hills-5bhk',
  'Heritage Grand Villa — Banjara Hills',
  'A stately 5-bedroom villa on a sprawling 8,000 sq ft plot set on one of Banjara Hills'' most coveted lanes. Built in 2018 and meticulously maintained, the home blends colonial architectural elements with contemporary interiors. A grand entrance foyer, formal dining for 14, a private library, dedicated puja room, and an outdoor dining pavilion beside the pool make this an exceptionally complete family home.',
  'villa',
  'sale',
  'active',
  'approved',
  120000000,  -- 12 Cr
  15000,
  FALSE,
  8000, 5, 6, 4, NULL, 3,
  2018, TRUE,
  '7, Road No. 2, Banjara Hills', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Banjara Hills',
  '22222222-0000-0000-0000-000000000003',
  'Telangana', '500034',
  17.41920000, 78.44870000,
  ARRAY[
    'https://picsum.photos/seed/prop7a/1200/800',
    'https://picsum.photos/seed/prop7b/1200/800',
    'https://picsum.photos/seed/prop7c/1200/800',
    'https://picsum.photos/seed/prop7d/1200/800',
    'https://picsum.photos/seed/prop7e/1200/800'
  ],
  ARRAY['Private Pool','Outdoor Dining Pavilion','Library','Puja Room','4-Car Garage','Staff Quarters','CCTV Security','Solar Power','Rainwater Harvesting','Landscaped Garden'],
  'North', TRUE,
  'P02040011029102', 'Freehold', TRUE,
  FALSE, 329, 28, 11,
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '6 days'
);

-- 8. Gachibowli — 4BHK Apartment — Rent
INSERT INTO properties (
  id, slug, title, description, type, listing_type, status, approval_status,
  price, price_per_sqft, is_price_negotiable, deposit_amount,
  area_sqft, bedrooms, bathrooms, parking_spaces, floor_number, total_floors,
  year_built, is_furnished,
  address, city, city_id, neighbourhood, neighbourhood_id, state, pincode,
  latitude, longitude,
  images, amenities, facing, vastu_compliant,
  rera_number, ownership_type, legal_clearance,
  is_featured, views, saves, inquiry_count,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000008',
  'the-wave-gachibowli-4bhk-rent',
  'The Wave — Gachibowli',
  'An expansive fully furnished 4-bedroom apartment for rent in the prestigious Wave complex, one of Gachibowli''s most recognisable landmarks. The 3,100 sq ft home on the 22nd floor features panoramic views of the Hyderabad skyline, a large open-plan kitchen and family room, a separate formal living area, and a wraparound balcony. Equipped with smart home controls, premium audio-visual systems, and a dedicated maid''s room.',
  'apartment',
  'rent',
  'active',
  'approved',
  175000,     -- ₹1.75 Lakh/month
  56,
  TRUE,
  525000,     -- 3 month deposit
  3100, 4, 4, 2, 22, 30,
  2021, TRUE,
  'The Wave, Nanakramguda, Gachibowli', 'Hyderabad',
  '11111111-0000-0000-0000-000000000001',
  'Gachibowli',
  '22222222-0000-0000-0000-000000000004',
  'Telangana', '500032',
  17.44580000, 78.36210000,
  ARRAY[
    'https://picsum.photos/seed/prop8a/1200/800',
    'https://picsum.photos/seed/prop8b/1200/800',
    'https://picsum.photos/seed/prop8c/1200/800',
    'https://picsum.photos/seed/prop8d/1200/800'
  ],
  ARRAY['Smart Home','Home Theatre','Gym','Infinity Pool','Concierge','Valet Parking','EV Charging','CCTV Security','Power Backup','Rooftop Sky Deck'],
  'South-East', FALSE,
  NULL, 'Freehold', TRUE,
  FALSE, 461, 35, 13,
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day'
);

-- ============================================================
-- END OF SEED DATA
-- ============================================================
