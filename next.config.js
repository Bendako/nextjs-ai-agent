/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["geist"],
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
};

module.exports = nextConfig; 