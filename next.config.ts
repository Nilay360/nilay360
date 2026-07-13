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
  allowedDevOrigins: ['192.168.10.39'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "nilay360",
  project: "nilay360",
});
