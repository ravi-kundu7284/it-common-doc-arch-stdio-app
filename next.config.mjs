/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["mermaid"],
  output: "standalone",
  async rewrites() {
    return [
      { source: "/studio", destination: "/" },
      { source: "/dashboard", destination: "/" },
      { source: "/home", destination: "/" },
    ];
  },
};

export default nextConfig;
