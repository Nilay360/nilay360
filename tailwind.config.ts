import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NIVILA Brand — Forest Green
        "green": {
          900: "#0D2B1F",
          800: "#1B4332",
          700: "#2D6A4F",
          600: "#40916C",
          200: "#D8F3DC",
          100: "#EEF8F1",
        },
        // NIVILA Brand — Gold
        "gold": {
          700: "#A07C2A",
          600: "#C9A84C",
          400: "#E9C46A",
          100: "#FBF5E6",
        },
        // NIVILA Neutrals
        ivory: "#F5F2EC",
        muted: "#6B7C72",
        // Semantic aliases
        brand: {
          primary: "#1B4332",
          accent: "#C9A84C",
          dark: "#0D2B1F",
          light: "#EEF8F1",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "display-xl": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-lg": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        "display-md": ["2.25rem", { lineHeight: "1.15" }],
        "display-sm": ["1.75rem", { lineHeight: "1.2" }],
      },
      spacing: {
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "2xl": "48px",
        "3xl": "64px",
        "4xl": "96px",
      },
      borderRadius: {
        "sm": "4px",
        "md": "8px",
        "lg": "16px",
        "xl": "24px",
        "pill": "9999px",
      },
      boxShadow: {
        "gold": "0 0 0 3px rgba(201, 168, 76, 0.2)",
        "card": "0 2px 12px rgba(13, 43, 31, 0.08)",
        "card-hover": "0 8px 32px rgba(13, 43, 31, 0.16)",
        "nav": "0 1px 0 rgba(13, 43, 31, 0.08)",
      },
      backgroundImage: {
        "hero-dark": "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.75) 85%, rgba(0,0,0,0.98) 100%)",
        "gold-gradient": "linear-gradient(135deg, #C9A84C 0%, #E9C46A 50%, #C9A84C 100%)",
        "green-gradient": "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      maxWidth: {
        "container": "1280px",
        "content": "720px",
      },
    },
  },
  plugins: [],
};

export default config;
