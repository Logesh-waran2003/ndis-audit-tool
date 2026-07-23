import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.135', '192.168.1.*', 'localhost'],
  // Silence the Turbopack/webpack config warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    // pdfjs-dist uses canvas/DOMMatrix which aren't available server-side
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('pdfjs-dist', 'pdfjs-dist/legacy/build/pdf.mjs')
    }
    return config
  },
};

export default nextConfig;
