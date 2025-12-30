/** @type {import('next').NextConfig} */
const path = require("path");

module.exports = {
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  optimizeFonts: true,
  experimental: {
    appDir: true,
    missingSuspenseWithCSRBailout: false,
  },
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pg.claritazlabs.com",
        port: "3028",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pt-stg.claritazlabs.com",
        port: "3029",
        pathname: "/**",
      },
    ], // Add your external image host domain here
  },
  // webpack: (config) => {
  //   config.resolve.alias.canvas = false;

  //   return config;
  // },
};
