import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { query } = await request.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "검색어는 필수입니다." }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const headers = {
    "x-ncp-apigw-api-key-id": clientId,
    "x-ncp-apigw-api-key": clientSecret,
  };

  // 1. Try NCP Geocoding (works for addresses like "강남대로 396")
  try {
    const geoRes = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
      { headers }
    );

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.addresses?.length > 0) {
        const addr = geoData.addresses[0];
        return NextResponse.json({
          lat: parseFloat(addr.y),
          lng: parseFloat(addr.x),
          displayAddress: addr.roadAddress || addr.jibunAddress || query,
          exact: true,
        });
      }
    }
  } catch (e) {
    console.error("Geocode attempt failed:", e);
  }

  // 2. Try Naver Developers Local Search (works for keywords like "정자역", "강남역")
  const searchClientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const searchClientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (searchClientId && searchClientSecret) {
    try {
      const searchRes = await fetch(
        `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`,
        {
          headers: {
            "X-Naver-Client-Id": searchClientId,
            "X-Naver-Client-Secret": searchClientSecret,
          },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.items?.length > 0) {
          const item = searchData.items[0];
          const roadAddr = (item.roadAddress || item.address || "").trim();

          // Re-geocode the address to get accurate WGS84 coordinates
          if (roadAddr) {
            try {
              const reGeoRes = await fetch(
                `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(roadAddr)}`,
                { headers }
              );
              if (reGeoRes.ok) {
                const reGeoData = await reGeoRes.json();
                if (reGeoData.addresses?.length > 0) {
                  const addr = reGeoData.addresses[0];
                  return NextResponse.json({
                    lat: parseFloat(addr.y),
                    lng: parseFloat(addr.x),
                    displayAddress: addr.roadAddress || addr.jibunAddress || roadAddr,
                    exact: false,
                  });
                }
              }
            } catch {
              // Fall through
            }
          }
        }
      }
    } catch (e) {
      console.error("Local search attempt failed:", e);
    }
  }

  return NextResponse.json(
    { error: "검색 결과가 없습니다. 도로명주소로 다시 검색해보세요. (예: 강남대로 396)" },
    { status: 404 }
  );
}
