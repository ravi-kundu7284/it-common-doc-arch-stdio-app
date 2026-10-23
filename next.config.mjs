/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["mermaid"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
  },
  async rewrites() {
    return [
      { source: "/studio", destination: "/" },
      { source: "/dashboard", destination: "/" },
      { source: "/home", destination: "/" },
    ];
  },
};

export default nextConfig;
