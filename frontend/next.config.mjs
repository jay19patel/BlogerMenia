import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.unsplash.com' },
      { protocol: 'http',  hostname: '127.0.0.1' },
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },

  reactStrictMode: true,
  output: 'standalone',

  webpack(config, { dev }) {
    // Next dev's persistent webpack cache cannot snapshot some resolved
    // dependencies in this project and repeatedly logs warnings on HMR.
    if (dev) {
      config.cache = false;
    }

    // next-auth v4 resolves uuid via the ESM-node entry (dist/esm-node/index.js)
    // which is missing in some uuid installs. Alias uuid to its CJS build using
    // an absolute path so webpack never hits the broken ESM entry point.
    config.resolve.alias['uuid'] = resolve(
      __dirname,
      'node_modules/uuid/dist/cjs/index.js'
    );
    
    // Ignore optional dependencies that cause build warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'fast-crc32c': false,
      'request': false,
    };
    return config;
  },
};

export default nextConfig;
