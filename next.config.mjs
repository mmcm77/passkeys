/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
  eslint: {
    // Disable the default ESLint behavior since we're using the new ESLint flat config
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during build while we migrate to Next.js 15
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
