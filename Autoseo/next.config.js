/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['pdfkit', 'bullmq', 'ioredis'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
