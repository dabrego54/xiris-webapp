import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['@supabase/auth-helpers-nextjs'] = path.resolve(
      __dirname,
      'lib/supabase/auth-helpers-nextjs.ts',
    );

    return config;
  },
};

export default nextConfig;
