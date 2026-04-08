import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Prevents effects from double-firing in development
  /* config options here */
  output: 'standalone',
  devIndicators: false,  // Полностью отключаем dev индикаторы
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },
};

export default nextConfig;
