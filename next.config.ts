import type { NextConfig } from "next";
import { execSync } from 'child_process';

// Get git commit SHA (short version)
const getGitCommitSha = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
};

const nextConfig: NextConfig = {
  // Disable source maps in production for security and performance
  productionBrowserSourceMaps: false,

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Inject version info as environment variable
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitCommitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
