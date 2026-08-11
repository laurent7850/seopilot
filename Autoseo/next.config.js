/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    // isomorphic-dompurify/jsdom must stay external: bundling it breaks the
    // production build because jsdom loads data files (browser/default-stylesheet.css)
    // relative to its own package directory, which webpack does not emit.
    serverComponentsExternalPackages: [
      'pdfkit',
      'bullmq',
      'ioredis',
      'puppeteer-core',
      'isomorphic-dompurify',
      'jsdom',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
