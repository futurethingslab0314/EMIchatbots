/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // 在構建時跳過 API 路由的預渲染
  experimental: {
    skipTrailingSlashRedirect: true,
  },
  // 避免在構建時預渲染 API 路由
  async rewrites() {
    return []
  },
}

module.exports = nextConfig

