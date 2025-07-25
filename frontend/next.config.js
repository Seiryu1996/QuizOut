/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  eslint: {
    dirs: ['src'],
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
}

module.exports = nextConfig