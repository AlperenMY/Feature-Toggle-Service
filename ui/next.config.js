/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/dashboard/home",
        destination: "/",
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;
