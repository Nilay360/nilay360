import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,
  allowedDevOrigins: ['192.168.10.39'],
};

export default nextConfig;
