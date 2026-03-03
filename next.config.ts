import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/revenue',
        destination: '/royalties',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
