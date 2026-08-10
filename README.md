# NIVILA — Premium Real Estate Platform

> Your Trust. Our Promise.

India's premium real estate platform for HNI buyers, NRI investors, and luxury developers.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + NIVILA Design Tokens
- **Components**: shadcn/ui + Radix UI
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Search**: Algolia
- **Images**: Cloudinary
- **Maps**: Google Maps Platform
- **Email**: Resend
- **Payments**: Razorpay + Stripe
- **Deployment**: Vercel + Cloudflare

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in your environment variables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
│   ├── ui/           # Base components (shadcn/ui)
│   ├── layout/       # Navbar, Footer, etc.
│   ├── property/     # Property cards, gallery, detail
│   ├── search/       # Search bar, filters, map
│   ├── home/         # Homepage sections
│   └── shared/       # Shared across pages
├── lib/              # Utility functions
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── constants/        # App-wide constants
└── styles/           # Global CSS + design tokens
```

## Phases

- **Phase 1**: Public website (buyer journey)
- **Phase 2**: Seller portal (agent/owner tools)
- **Phase 3**: Admin panel (admin.nivila.com)

## Mobile Testing Guide

Nilay360 supports web, iOS, and Android platforms using a Capacitor-based approach. The web app is the source of truth, and mobile apps wrap it using Capacitor.

### 1. Browser Responsive Testing (Recommended Starting Point)

**Desktop Browser Testing:**

```bash
npm run dev
```

Then open Chrome DevTools responsive mode:

1. Open [http://localhost:3000](http://localhost:3000) in Chrome
2. Press `F12` to open DevTools
3. Press `Ctrl+Shift+M` (Windows) or `Cmd+Shift+M` (Mac) to toggle Device Toolbar
4. Select device presets from dropdown:
   - **iPhone 14 Pro** (375px width) — small mobile
   - **iPad Pro** (1024px width) — tablet
   - **Desktop** (1920px width) — desktop

### 2. Android Emulator Testing

**Prerequisites:**

- Android Studio installed
- Android Virtual Device (AVD) created
- Development server running in separate terminal

**Steps:**

Terminal 1 - Start dev server:

```bash
npm run dev
```

Terminal 2 - Sync and open in Android Studio:

```bash
npx cap sync android
npx cap open android
```

In Android Studio:

1. Select emulator from toolbar
2. Click **Run** button (or press Shift+F10)
3. Wait for app to load
4. Test responsiveness on emulated mobile screen

### 3. iOS Simulator Testing

**Prerequisites:**

- Mac with Xcode installed
- Development server running in separate terminal
- iOS simulator available in Xcode

**Steps:**

Terminal 1 - Start dev server:

```bash
npm run dev
```

Terminal 2 - Sync and open in Xcode:

```bash
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select iPhone simulator from top-left dropdown
2. Click **Run** button (or press Cmd+R)
3. Wait for app to load in simulator
4. Test responsiveness
