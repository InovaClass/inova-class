import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [
    {
      // pnpm sprites:import puts a hash of the content in each file name, so a changed sheet gets
      // a new URL; Next.js serves public/ with max-age=0 otherwise
      source: '/sprites/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable'
        }
      ]
    }
  ]
}

export default nextConfig
