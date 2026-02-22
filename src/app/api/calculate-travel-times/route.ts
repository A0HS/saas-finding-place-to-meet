import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

interface DirectionsResult {
  distanceKm: number;
  durationMin: number;
  path: [number, number][];
}

async function getNaverDrivingRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<DirectionsResult | null> {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `https://maps.apigw.ntruss.com/map-direction/v1/driving?start=${startLng},${startLat}&goal=${endLng},${endLat}`,
      {
        headers: {
          "x-ncp-apigw-api-key-id": clientId,
          "x-ncp-apigw-api-key": clientSecret,
        },
      }
    );

    if (!res.ok) {
      console.error("Naver Direction API error:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.code !== 0 || !data.route?.traoptimal?.[0]) return null;

    const route = data.route.traoptimal[0];
    const summary = route.summary;
    return {
      distanceKm: summary.distance / 1000,
      durationMin: summary.duration / 60000,
      path: route.path || [],
    };
  } catch {
    return null;
  }
}

async function getOSRMRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<DirectionsResult | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.routes?.[0]) return null;

    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates;

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      path: coords,
    };
  } catch {
    return null;
  }
}

async function getDrivingRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<DirectionsResult | null> {
  const naverResult = await getNaverDrivingRoute(startLng, startLat, endLng, endLat);
  if (naverResult) return naverResult;

  console.log("Naver Direction failed, falling back to OSRM");
  return getOSRMRoute(startLng, startLat, endLng, endLat);
}

interface FriendCoord {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PlaceCoord {
  latitude: number;
  longitude: number;
}

async function calculateRoutes(
  friendsData: FriendCoord[],
  placeData: PlaceCoord
) {
  const items = await Promise.all(
    friendsData.map(async (friend) => {
      if (!friend.latitude || !friend.longitude || !placeData.latitude || !placeData.longitude) {
        return {
          friendId: friend.id,
          friendName: friend.name,
          fromAddress: friend.address,
          distanceKm: null,
          durationMin: null,
          path: [] as [number, number][],
          error: "좌표가 설정되지 않았습니다.",
        };
      }

      const result = await getDrivingRoute(
        friend.longitude,
        friend.latitude,
        placeData.longitude,
        placeData.latitude
      );

      if (!result) {
        return {
          friendId: friend.id,
          friendName: friend.name,
          fromAddress: friend.address,
          distanceKm: null,
          durationMin: null,
          path: [] as [number, number][],
          error: "경로를 계산할 수 없습니다.",
        };
      }

      return {
        friendId: friend.id,
        friendName: friend.name,
        fromAddress: friend.address,
        distanceKm: result.distanceKm,
        durationMin: result.durationMin,
        path: result.path,
      };
    })
  );

  const validItems = items.filter((i) => i.durationMin !== null);
  const totalMinutes = validItems.reduce((s, i) => s + (i.durationMin || 0), 0);
  const averageMinutes = validItems.length > 0 ? totalMinutes / validItems.length : 0;

  return { items, totalMinutes, averageMinutes };
}

export async function POST(request: Request) {
  const body = await request.json();

  // Demo mode: coordinates provided directly (no auth required)
  if (body.demoFriends && body.demoPlace) {
    const result = await calculateRoutes(body.demoFriends, body.demoPlace);
    return NextResponse.json(result);
  }

  // Auth mode: look up from DB
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendIds, placeId } = body;

  if (!friendIds?.length || !placeId) {
    return NextResponse.json(
      { error: "친구와 장소를 선택해주세요." },
      { status: 400 }
    );
  }

  const place = await prisma.place.findFirst({ where: { id: placeId, userId } });
  if (!place) {
    return NextResponse.json({ error: "장소를 찾을 수 없습니다." }, { status: 404 });
  }

  const friends = await prisma.friend.findMany({
    where: { id: { in: friendIds }, userId },
  });

  const friendsData: FriendCoord[] = friends.map((f) => ({
    id: f.id,
    name: f.name,
    address: f.addressDisplay || f.addressRaw,
    latitude: f.latitude || 0,
    longitude: f.longitude || 0,
  }));

  const placeData: PlaceCoord = {
    latitude: place.latitude || 0,
    longitude: place.longitude || 0,
  };

  const result = await calculateRoutes(friendsData, placeData);
  return NextResponse.json(result);
}
