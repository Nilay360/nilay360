import type { Metadata } from "next"
import { Suspense } from "react"
import "@/styles/globals.css"
import { Navbar } from "@/components/layout/Navbar"
import { CompareProvider } from "@/context/CompareContext"
import CompareBar from "@/components/property/CompareBar"
import { AuthProvider } from "@/context/AuthContext"
import AuthModal from "@/components/auth/AuthModal"
import { PostHogProvider, PostHogPageView } from "@/components/providers/PostHogProvider"

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
    icon: "/icons/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <PostHogProvider>
          <AuthProvider>
            <CompareProvider>
              <Navbar />
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              {children}
              <CompareBar />
            </CompareProvider>
            <AuthModal />
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
