/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rolhack/database'],
  output: 'standalone',
}

module.exports = nextConfig
