import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,
  allowedDevOrigins: ['192.168.10.69'],
  async headers() {
    return [
      {
        // Static brand assets (logo, hero background) never change filename
        // on update, so give them long-lived caching instead of the
        // platform's conservative max-age=0 default for /public files.
        source: '/brand/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "nilay360",
  project: "nilay360",
});
