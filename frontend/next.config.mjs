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
    ],
  },

  reactStrictMode: true,

  webpack(config) {
    // next-auth v4 resolves uuid via the ESM-node entry (dist/esm-node/index.js)
    // which is missing in some uuid installs. Alias uuid to its CJS build using
    // an absolute path so webpack never hits the broken ESM entry point.
    config.resolve.alias['uuid'] = resolve(
      __dirname,
      'node_modules/uuid/dist/cjs/index.js'
    );
    return config;
  },
};

export default nextConfig;
