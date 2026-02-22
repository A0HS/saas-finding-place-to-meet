import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { address } = body;

  if (!address?.trim()) {
    return NextResponse.json({ error: "주소는 필수입니다." }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "네이버 지도 API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`,
      {
        headers: {
          "x-ncp-apigw-api-key-id": clientId,
          "x-ncp-apigw-api-key": clientSecret,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Naver Geocode API error:", res.status, JSON.stringify(data));
      return NextResponse.json(
        { error: `지오코딩 API 호출에 실패했습니다. (${res.status})` },
        { status: 502 }
      );
    }

    if (!data.addresses || data.addresses.length === 0) {
      return NextResponse.json(
        { error: "해당 주소를 찾을 수 없습니다.", found: false },
        { status: 404 }
      );
    }

    const addr = data.addresses[0];
    return NextResponse.json({
      found: true,
      lat: parseFloat(addr.y),
      lng: parseFloat(addr.x),
      displayAddress: addr.roadAddress || addr.jibunAddress || address,
    });
  } catch {
    return NextResponse.json(
      { error: "지오코딩 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
