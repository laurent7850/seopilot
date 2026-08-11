/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['pdfkit', 'bullmq', 'ioredis', 'puppeteer-core'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
