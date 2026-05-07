/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Proxy /api/* → backend to avoid CORS issues in browser
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent server-side bundling of browser-only barcode scanner
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@ericblade/quagga2',
      ];
    }

    // Ignore sharp and its native deps — quagga2 pulls these in but
    // they are only needed in Node image-processing contexts, not the browser
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp: false,
    };

    config.plugins = config.plugins || [];

    return config;
  },
};

module.exports = nextConfig;
