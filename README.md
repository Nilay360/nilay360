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
