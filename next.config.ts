import type { NextConfig } from 'next'

// pnpm sprites:import and pnpm sounds:generate put a hash of the content in each file name, so a
// changed file gets a new URL; Next.js serves public/ with max-age=0 otherwise
const immutable = (source: string) => ({
  source,
  headers: [
    {
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable'
    }
  ]
})

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [
    immutable('/sprites/:path*'),
    immutable('/sounds/:path*')
  ]
}

export default nextConfig
