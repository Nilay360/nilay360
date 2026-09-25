import type { Metadata } from "next"
import { Suspense } from "react"
import { Manrope, Inter, Plus_Jakarta_Sans } from "next/font/google"
import "@/styles/globals.css"

// Manrope (headings), Inter (body/UI), Plus Jakarta Sans (labels/tags/stats) —
// the site-wide font system (replaces the legacy CDN-loaded serif font).
const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading-new" })
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body-new" })
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-support-new" })
import { Navbar } from "@/components/layout/Navbar"
import { CompareProvider } from "@/context/CompareContext"
import CompareBar from "@/components/property/CompareBar"
import { AuthProvider } from "@/context/AuthContext"
import AuthModal from "@/components/auth/AuthModal"
import ProfileCompletionModal from "@/components/auth/ProfileCompletionModal"
import { PostHogProvider, PostHogPageView } from "@/components/providers/PostHogProvider"
import FloatingContactMenu from "@/components/contact/FloatingContactMenu"
import SiteFooter from "@/components/layout/SiteFooter"

export const metadata: Metadata = {
  metadataBase: new URL("https://nilay360.com"),
  title: {
    default: "Nilay 360 | Real Estate Services & Property Solutions",
    template: "%s | Nilay 360",
  },
  description: "Nilay 360 is a technology-powered real estate platform offering property discovery, virtual tours, and end-to-end transaction support across India.",
  keywords: ["real estate India", "property search", "virtual property tours", "buy property India", "Nilay 360", "PropTech India", "Hyderabad real estate"],
  authors: [{ name: "Nilay 360", url: "https://nilay360.com" }],
  creator: "Nilay 360",
  publisher: "Nilay 360",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://nilay360.com",
    siteName: "Nilay 360",
    title: "Nilay 360 | Real Estate Services & Property Solutions",
    description: "Technology-powered real estate platform for property discovery, virtual tours, and transactions across India.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Nilay 360 — Real Estate Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nilay 360 | Real Estate Services & Property Solutions",
    description: "Technology-powered real estate platform for property discovery, virtual tours, and transactions across India.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://nilay360.com",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${manrope.variable} ${inter.variable} ${jakarta.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" style={{ fontFamily: "var(--font-body-new)" }}>
        <PostHogProvider>
          <AuthProvider>
            <CompareProvider>
              <Navbar />
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              {children}
              <SiteFooter />
              <CompareBar />
              <FloatingContactMenu />
            </CompareProvider>
            <AuthModal />
            <ProfileCompletionModal />
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
