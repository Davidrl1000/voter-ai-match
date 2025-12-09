import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable streaming responses
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable response caching for streaming endpoints
  async headers() {
    return [
      {
        source: '/api/explain',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-transform',
          },
          {
            key: 'X-Accel-Buffering',
            value: 'no',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
