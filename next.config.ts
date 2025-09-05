import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https', // or 'https'
        hostname: '**', // Allows any hostname
        port: '', // Optional: specify port if needed
        pathname: '**', // Allows any path
      },
    ],
  }
};

export default nextConfig;
