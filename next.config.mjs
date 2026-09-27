/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["mermaid"],
  output: "standalone",
};

export default nextConfig;
