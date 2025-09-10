/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensure proper tracing for Docker
  outputFileTracingRoot: require('path').join(__dirname, '../'),
};

module.exports = nextConfig;