import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '',
  },
  async rewrites() {
    return [
      // 지도 SDK 프록시 (광고 차단기 우회 — URL에 'kakao' 단어 미포함)
      {
        source: '/map-sdk-proxy/:path*',
        destination: 'https://dapi.kakao.com/:path*',
      },
      {
        source: '/map-cdn-proxy/:path*',
        destination: 'https://t1.daumcdn.net/:path*',
      },
    ];
  },
};

export default nextConfig;
