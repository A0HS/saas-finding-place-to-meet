"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { DUMMY_FRIENDS, DUMMY_PLACES } from "@/lib/dummyData";

interface Friend {
  id: string;
  name: string;
  address_raw: string;
  address_display: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Place {
  id: string;
  name: string;
  address_raw: string;
  address_display: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TravelResult {
  friendId: string;
  friendName: string;
  fromAddress: string;
  distanceKm: number | null;
  durationMin: number | null;
  path: [number, number][];
  error?: string;
}

const ROUTE_COLORS = [
  "#FF3B30", "#007AFF", "#34C759", "#FF9500", "#AF52DE",
  "#FF2D55", "#5AC8FA", "#FFCC00", "#00C7BE", "#FF6482",
];

export default function DecidePage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [results, setResults] = useState<TravelResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedPlaceId, setCalculatedPlaceId] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const polylinesRef = useRef<unknown[]>([]);
  const infoWindowsRef = useRef<unknown[]>([]);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const markerMetasRef = useRef<{ marker: any; label: string; color: string }[]>([]);
  const zoomListenerRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuth(true);
        Promise.all([
          fetch("/api/friends").then((r) => r.json()),
          fetch("/api/places").then((r) => r.json()),
        ]).then(([friendsData, placesData]) => {
          setFriends(friendsData);
          setPlaces(placesData);
        });
      } else {
        setIsAuth(false);
        setFriends([...DUMMY_FRIENDS]);
        setPlaces([...DUMMY_PLACES]);
      }
    });
  }, []);

  function toggleFriend(id: string) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFriends() {
    if (selectedFriendIds.size === friends.length) {
      setSelectedFriendIds(new Set());
    } else {
      setSelectedFriendIds(new Set(friends.map((f) => f.id)));
    }
  }

  const clearMap = useCallback(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    markersRef.current.forEach((m: any) => m.setMap(null));
    polylinesRef.current.forEach((p: any) => p.setMap(null));
    infoWindowsRef.current.forEach((i: any) => i.close());
    if (zoomListenerRef.current) {
      const naverMaps = (window as any).naver?.maps;
      if (naverMaps) naverMaps.Event.removeListener(zoomListenerRef.current);
      zoomListenerRef.current = null;
    }
    markersRef.current = [];
    polylinesRef.current = [];
    infoWindowsRef.current = [];
    markerMetasRef.current = [];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  const drawRoutes = useCallback(
    (travelResults: TravelResult[], place: Place) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const naverMaps = (window as any).naver?.maps;
      if (!naverMaps || !mapRef.current) return;
      if (!place.latitude || !place.longitude) return;

      clearMap();

      function makeIcon(label: string, color: string, zoom: number) {
        const scale = Math.max(0.35, Math.min(0.75, (zoom - 5) / 10));
        const fontSize = Math.round(13 * scale);
        const padV = Math.round(6 * scale);
        const padH = Math.round(10 * scale);
        const border = Math.max(1, Math.round(2 * scale));
        return {
          content: `<div style="background:${color};color:white;padding:${padV}px ${padH}px;border-radius:6px;font-size:${fontSize}px;font-weight:bold;white-space:nowrap;border:${border}px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);transition:all 0.15s ease;">${label}</div>`,
          anchor: new naverMaps.Point(Math.round(40 * scale), Math.round(20 * scale)),
        };
      }

      const placePos = new naverMaps.LatLng(place.latitude, place.longitude);

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new naverMaps.Map(mapRef.current, {
          center: placePos,
          zoom: 11,
          zoomControl: true,
          zoomControlOptions: { position: naverMaps.Position.TOP_RIGHT },
        });
      } else {
        (mapInstanceRef.current as any).setCenter(placePos);
        (mapInstanceRef.current as any).setZoom(11);
      }

      const map = mapInstanceRef.current as any;
      const initialZoom = map.getZoom();

      // Destination marker
      const destMarker = new naverMaps.Marker({
        position: placePos,
        map,
        icon: makeIcon(place.name, "#DC2626", initialZoom),
      });
      markersRef.current.push(destMarker);
      markerMetasRef.current.push({ marker: destMarker, label: place.name, color: "#DC2626" });

      const bounds = new naverMaps.LatLngBounds(placePos, placePos);

      travelResults.forEach((result, idx) => {
        if (result.error || !result.durationMin) return;
        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        const friend = friends.find((f) => f.id === result.friendId);
        if (!friend?.latitude || !friend?.longitude) return;

        const friendPos = new naverMaps.LatLng(friend.latitude, friend.longitude);
        bounds.extend(friendPos);

        // Friend marker
        const marker = new naverMaps.Marker({
          position: friendPos,
          map,
          icon: makeIcon(result.friendName, color, initialZoom),
        });
        markersRef.current.push(marker);
        markerMetasRef.current.push({ marker, label: result.friendName, color });

        // Route polyline
        if (result.path && result.path.length > 0) {
          const pathCoords = result.path.map(
            ([lng, lat]: [number, number]) => new naverMaps.LatLng(lat, lng)
          );
          pathCoords.forEach((coord: any) => bounds.extend(coord));

          const polyline = new naverMaps.Polyline({
            map,
            path: pathCoords,
            strokeColor: color,
            strokeWeight: 4,
            strokeOpacity: 0.8,
          });
          polylinesRef.current.push(polyline);
        } else {
          // No path data - draw straight line
          const polyline = new naverMaps.Polyline({
            map,
            path: [friendPos, placePos],
            strokeColor: color,
            strokeWeight: 3,
            strokeOpacity: 0.5,
            strokeStyle: "dash",
          });
          polylinesRef.current.push(polyline);
        }

        // Info window
        const infoContent = `
          <div style="padding:10px;font-size:13px;min-width:140px;">
            <b style="font-size:14px;">${result.friendName}</b><br/>
            <span style="color:#666;">거리:</span> ${result.distanceKm?.toFixed(1)} km<br/>
            <span style="color:#666;">시간:</span> <b style="color:#2563EB;">${Math.round(result.durationMin)}분</b>
          </div>
        `;
        const infoWindow = new naverMaps.InfoWindow({ content: infoContent });
        naverMaps.Event.addListener(marker, "click", () => {
          if (infoWindow.getMap()) {
            infoWindow.close();
          } else {
            infoWindow.open(map, marker);
          }
        });
        infoWindowsRef.current.push(infoWindow);
      });

      // Resize labels on zoom change
      zoomListenerRef.current = naverMaps.Event.addListener(map, "zoom_changed", (zoom: number) => {
        markerMetasRef.current.forEach(({ marker, label, color }) => {
          marker.setIcon(makeIcon(label, color, zoom));
        });
      });

      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    [friends, clearMap]
  );

  useEffect(() => {
    if (results.length === 0 || !calculatedPlaceId) return;
    const place = places.find((p) => p.id === calculatedPlaceId);
    if (place) {
      const timer = setTimeout(() => drawRoutes(results, place), 100);
      return () => clearTimeout(timer);
    }
  }, [results, calculatedPlaceId, places, drawRoutes]);

  async function handleCalculate() {
    if (selectedFriendIds.size === 0 || !selectedPlaceId) {
      alert("친구와 장소를 선택해주세요.");
      return;
    }

    setIsCalculating(true);
    setResults([]);
    clearMap();
    mapInstanceRef.current = null;

    try {
      let requestBody: Record<string, unknown>;

      if (isAuth) {
        // Auth mode: send IDs
        requestBody = {
          friendIds: Array.from(selectedFriendIds),
          placeId: selectedPlaceId,
        };
      } else {
        // Demo mode: send coordinates directly
        const selectedFriends = friends.filter((f) => selectedFriendIds.has(f.id));
        const selectedPlace = places.find((p) => p.id === selectedPlaceId);
        requestBody = {
          demoFriends: selectedFriends.map((f) => ({
            id: f.id,
            name: f.name,
            address: f.address_display || f.address_raw,
            latitude: f.latitude || 0,
            longitude: f.longitude || 0,
          })),
          demoPlace: {
            latitude: selectedPlace?.latitude || 0,
            longitude: selectedPlace?.longitude || 0,
          },
        };
      }

      const res = await fetch("/api/calculate-travel-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        alert("계산에 실패했습니다.");
        return;
      }

      const data = await res.json();
      setResults(data.items);
      setCalculatedPlaceId(selectedPlaceId);
    } finally {
      setIsCalculating(false);
    }
  }

  const validResults = results.filter((r) => !r.error && r.durationMin);
  const totalMinutes = validResults.reduce((sum, r) => sum + (r.durationMin || 0), 0);
  const avgMinutes = validResults.length > 0 ? totalMinutes / validResults.length : 0;

  if (isAuth === null) {
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">장소 정하기</h1>
        {!isAuth && (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
            데모 모드
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Friend Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold">참석자 선택</h2>
            <button
              onClick={selectAllFriends}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedFriendIds.size === friends.length ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-gray-400 text-sm">등록된 친구가 없습니다.</p>
            ) : (
              friends.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFriendIds.has(friend.id)}
                    onChange={() => toggleFriend(friend.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{friend.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {friend.address_display || friend.address_raw}
                    </span>
                    {!friend.latitude && (
                      <span className="text-xs text-yellow-600 ml-2">(좌표 미확인)</span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Place Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">장소 선택</h2>
          <select
            value={selectedPlaceId}
            onChange={(e) => setSelectedPlaceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">장소를 선택하세요</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name} - {place.address_display || place.address_raw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleCalculate}
          disabled={isCalculating || selectedFriendIds.size === 0 || !selectedPlaceId}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isCalculating ? "계산 중..." : "이동시간 계산하기"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Dashboard Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">참석자 수</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{validResults.length}명</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">총 이동시간</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-600">{Math.round(totalMinutes)}분</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">평균 이동시간</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">{Math.round(avgMinutes)}분</p>
            </div>
          </div>

          {/* Route Map */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">경로 지도</h3>
            <div ref={mapRef} className="w-full h-[300px] sm:h-[500px] rounded-lg" />
            <div className="flex flex-wrap gap-3 mt-3">
              {results.map((result, idx) =>
                !result.error ? (
                  <div key={result.friendId} className="flex items-center space-x-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] }}
                    />
                    <span className="text-gray-700">
                      {result.friendName} ({result.distanceKm?.toFixed(1)}km, {Math.round(result.durationMin || 0)}분)
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">색상</th>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">이름</th>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">출발 주소</th>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">거리</th>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">소요시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, idx) => (
                    <tr key={result.friendId} className="hover:bg-gray-50">
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span
                          className="w-4 h-4 rounded-full inline-block"
                          style={{ backgroundColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] }}
                        />
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {result.friendName}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">{result.fromAddress}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600 whitespace-nowrap">
                        {result.error ? "-" : `${result.distanceKm?.toFixed(1)} km`}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm whitespace-nowrap">
                        {result.error ? (
                          <span className="text-red-600">{result.error}</span>
                        ) : (
                          <span className="font-medium text-blue-600">
                            {Math.round(result.durationMin || 0)}분
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
