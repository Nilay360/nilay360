import type { Metadata } from "next"
import "@/styles/globals.css"
import { Navbar } from "@/components/layout/Navbar"
import { CompareProvider } from "@/context/CompareContext"
import CompareBar from "@/components/property/CompareBar"
import { AuthProvider } from "@/context/AuthContext"
import AuthModal from "@/components/auth/AuthModal"

export const metadata: Metadata = {
  title: {
    default: "Nilay 360 — Premium Real Estate in India",
    template: "%s | Nilay 360",
  },
  description: "Discover India's finest luxury properties. Verified listings, trusted agents, and concierge service for discerning buyers and investors.",
  keywords: ["luxury real estate India", "premium properties Hyderabad", "buy villa Hyderabad", "NRI property investment India"],
  authors: [{ name: "Nilay 360" }],
  creator: "Nilay 360",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nilay360.com"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://nilay360.com",
    siteName: "Nilay 360",
    title: "Nilay 360 — Premium Real Estate in India",
    description: "India's most trusted luxury real estate platform. Your Trust. Our Promise.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Nilay 360 Premium Real Estate" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nilay 360 — Premium Real Estate in India",
    description: "India's most trusted luxury real estate platform. Your Trust. Our Promise.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
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
        <AuthProvider>
          <CompareProvider>
            <Navbar />
            {children}
            <CompareBar />
          </CompareProvider>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  )
}
