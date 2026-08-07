/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // async headers() {
  //   return [
  //     {
  //       // matching all API routes
  //       source: "/api/zap-lead",
  //       headers: [
  //         { key: "Access-Control-Allow-Credentials", value: "true" },
  //         {
  //           key: "Access-Control-Allow-Origin",
  //           value: "http://localhost:3001",
  //         }, // replace this your actual origin
  //         {
  //           key: "Access-Control-Allow-Methods",
  //           value: "GET,DELETE,PATCH,POST,PUT",
  //         },
  //         {
  //           key: "Access-Control-Allow-Headers",
  //           value:
  //             "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-TOKEN",
  //         },
  //       ],
  //     },
  //   ];
  // },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  serverExternalPackages: ["pg-boss"],
  reactStrictMode: false,
  productionBrowserSourceMaps: process.env.NODE_ENV === "development",
  allowedDevOrigins: [
    "192.168.0.101",
    "*.ngrok-free.app",
    "localhost:3000",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
