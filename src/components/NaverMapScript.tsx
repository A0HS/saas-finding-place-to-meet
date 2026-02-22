"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function NaverMapScript() {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    if (typeof window !== "undefined") {
      (window as any).navermap_authFailure = function () {
        console.error("Naver Maps auth failure: ncpKeyId 또는 Web 서비스 URL을 확인하세요.");
      };
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  if (!clientId) return null;

  return (
    <Script
      strategy="afterInteractive"
      src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder,drawing,panorama`}
    />
  );
}
