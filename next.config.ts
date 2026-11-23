import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Prevents double mounting in dev with Leaflet maps
  images: {
    domains: [],
  },
};

export default nextConfig;
