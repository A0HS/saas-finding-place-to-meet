"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { DUMMY_FRIENDS, DUMMY_PLACES, DUMMY_CATEGORIES } from "@/lib/dummyData";
import type { DemoCategory } from "@/lib/dummyData";

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
  category_id: string | null;
  category: { id: string; name: string } | null;
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

interface PlaceResult {
  place: Place;
  items: TravelResult[];
  totalMinutes: number;
  averageMinutes: number;
}

const PLACE_MARKER_COLOR = "#1F2937";
const MARKER_COLORS = [
  "#F87171", "#60A5FA", "#4ADE80", "#FACC15", "#A78BFA",
  "#F472B6", "#22D3EE", "#FBBF24", "#34D399", "#FB7185",
];
const ROUTE_COLORS = [
  "#DC2626", "#2563EB", "#16A34A", "#CA8A04", "#7C3AED",
  "#DB2777", "#0891B2", "#D97706", "#059669", "#E11D48",
];

export default function DecidePage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<DemoCategory[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const mapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mapInstancesRef = useRef<unknown[]>([]);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mapDataRef = useRef<{ markers: any[]; polylines: any[]; infoWindows: any[]; markerMetas: { marker: any; label: string; color: string }[]; zoomListener: any }[]>([]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuth(true);
        Promise.all([
          fetch("/api/friends").then((r) => r.json()),
          fetch("/api/places").then((r) => r.json()),
          fetch("/api/categories").then((r) => r.json()),
        ]).then(([friendsData, placesData, categoriesData]) => {
          setFriends(friendsData);
          setPlaces(placesData);
          setCategories(categoriesData);
        });
      } else {
        setIsAuth(false);
        setFriends([...DUMMY_FRIENDS]);
        setPlaces([...DUMMY_PLACES]);
        setCategories([...DUMMY_CATEGORIES]);
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

  function togglePlace(id: string) {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredPlaces = filterCategoryId === ""
    ? places
    : filterCategoryId === "uncategorized"
      ? places.filter((p) => !p.category_id)
      : places.filter((p) => p.category_id === filterCategoryId);

  function selectAllPlaces() {
    const filteredIds = new Set(filteredPlaces.map((p) => p.id));
    const allFilteredSelected = filteredPlaces.length > 0 && filteredPlaces.every((p) => selectedPlaceIds.has(p.id));
    if (allFilteredSelected) {
      setSelectedPlaceIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedPlaceIds((prev) => new Set([...prev, ...filteredIds]));
    }
  }

  const clearMapAt = useCallback((index: number) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data = mapDataRef.current[index];
    if (!data) return;
    data.markers.forEach((m: any) => m.setMap(null));
    data.polylines.forEach((p: any) => p.setMap(null));
    data.infoWindows.forEach((i: any) => i.close());
    if (data.zoomListener) {
      const naverMaps = (window as any).naver?.maps;
      if (naverMaps) naverMaps.Event.removeListener(data.zoomListener);
    }
    mapDataRef.current[index] = { markers: [], polylines: [], infoWindows: [], markerMetas: [], zoomListener: null };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  const clearAllMaps = useCallback(() => {
    for (let i = 0; i < mapDataRef.current.length; i++) {
      clearMapAt(i);
    }
    mapInstancesRef.current = [];
    mapDataRef.current = [];
  }, [clearMapAt]);

  const drawRoutesAt = useCallback(
    (index: number, travelResults: TravelResult[], place: Place) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const naverMaps = (window as any).naver?.maps;
      const container = mapRefs.current[index];
      if (!naverMaps || !container) return;
      if (!place.latitude || !place.longitude) return;

      clearMapAt(index);

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

      const map = new naverMaps.Map(container, {
        center: placePos,
        zoom: 11,
        zoomControl: true,
        zoomControlOptions: { position: naverMaps.Position.TOP_RIGHT },
      });
      mapInstancesRef.current[index] = map;

      const data: typeof mapDataRef.current[0] = { markers: [], polylines: [], infoWindows: [], markerMetas: [], zoomListener: null };
      mapDataRef.current[index] = data;

      const initialZoom = map.getZoom();

      // Destination marker (dark, on top)
      const destMarker = new naverMaps.Marker({
        position: placePos,
        map,
        zIndex: 200,
        icon: makeIcon(place.name, PLACE_MARKER_COLOR, initialZoom),
      });
      data.markers.push(destMarker);
      data.markerMetas.push({ marker: destMarker, label: place.name, color: PLACE_MARKER_COLOR });

      const bounds = new naverMaps.LatLngBounds(placePos, placePos);

      travelResults.forEach((result, idx) => {
        if (result.error || !result.durationMin) return;
        const markerColor = MARKER_COLORS[idx % MARKER_COLORS.length];
        const routeColor = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        const friend = friends.find((f) => f.id === result.friendId);
        if (!friend?.latitude || !friend?.longitude) return;

        const friendPos = new naverMaps.LatLng(friend.latitude, friend.longitude);
        bounds.extend(friendPos);

        // Friend marker
        const marker = new naverMaps.Marker({
          position: friendPos,
          map,
          zIndex: 100,
          icon: makeIcon(result.friendName, markerColor, initialZoom),
        });
        data.markers.push(marker);
        data.markerMetas.push({ marker, label: result.friendName, color: markerColor });

        // Route polyline
        if (result.path && result.path.length > 0) {
          const pathCoords = result.path.map(
            ([lng, lat]: [number, number]) => new naverMaps.LatLng(lat, lng)
          );
          pathCoords.forEach((coord: any) => bounds.extend(coord));

          const polyline = new naverMaps.Polyline({
            map,
            path: pathCoords,
            strokeColor: routeColor,
            strokeWeight: 4,
            strokeOpacity: 0.8,
          });
          data.polylines.push(polyline);
        } else {
          const polyline = new naverMaps.Polyline({
            map,
            path: [friendPos, placePos],
            strokeColor: routeColor,
            strokeWeight: 3,
            strokeOpacity: 0.5,
            strokeStyle: "dash",
          });
          data.polylines.push(polyline);
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
        data.infoWindows.push(infoWindow);
      });

      // Resize labels on zoom change
      data.zoomListener = naverMaps.Event.addListener(map, "zoom_changed", (zoom: number) => {
        data.markerMetas.forEach(({ marker, label, color }) => {
          marker.setIcon(makeIcon(label, color, zoom));
        });
      });

      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    [friends, clearMapAt]
  );

  useEffect(() => {
    if (placeResults.length === 0) return;
    const timer = setTimeout(() => {
      placeResults.forEach((pr, idx) => {
        drawRoutesAt(idx, pr.items, pr.place);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [placeResults, drawRoutesAt]);

  async function handleCalculate() {
    if (selectedFriendIds.size === 0 || selectedPlaceIds.size === 0) {
      alert("친구와 장소를 선택해주세요.");
      return;
    }

    setIsCalculating(true);
    setPlaceResults([]);
    clearAllMaps();

    try {
      const selectedPlaces = places.filter((p) => selectedPlaceIds.has(p.id));
      const friendIdsArr = Array.from(selectedFriendIds);

      const promises = selectedPlaces.map(async (place) => {
        let requestBody: Record<string, unknown>;

        if (isAuth) {
          requestBody = {
            friendIds: friendIdsArr,
            placeId: place.id,
          };
        } else {
          const selectedFriends = friends.filter((f) => selectedFriendIds.has(f.id));
          requestBody = {
            demoFriends: selectedFriends.map((f) => ({
              id: f.id,
              name: f.name,
              address: f.address_display || f.address_raw,
              latitude: f.latitude || 0,
              longitude: f.longitude || 0,
            })),
            demoPlace: {
              latitude: place.latitude || 0,
              longitude: place.longitude || 0,
            },
          };
        }

        const res = await fetch("/api/calculate-travel-times", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          return { place, items: [], totalMinutes: 0, averageMinutes: 0 } as PlaceResult;
        }

        const data = await res.json();
        const items: TravelResult[] = data.items;
        const valid = items.filter((r) => !r.error && r.durationMin);
        const totalMinutes = valid.reduce((sum, r) => sum + (r.durationMin || 0), 0);
        const averageMinutes = valid.length > 0 ? totalMinutes / valid.length : 0;

        return { place, items, totalMinutes, averageMinutes } as PlaceResult;
      });

      const results = await Promise.all(promises);
      // Sort by average travel time (ascending)
      results.sort((a, b) => a.averageMinutes - b.averageMinutes);
      setPlaceResults(results);
    } finally {
      setIsCalculating(false);
    }
  }

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-semibold">장소 선택</h2>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 카테고리</option>
                <option value="uncategorized">미분류</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={selectAllPlaces}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {filteredPlaces.length > 0 && filteredPlaces.every((p) => selectedPlaceIds.has(p.id)) ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredPlaces.length === 0 ? (
              <p className="text-gray-400 text-sm">등록된 장소가 없습니다.</p>
            ) : (
              filteredPlaces.map((place) => (
                <label
                  key={place.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaceIds.has(place.id)}
                    onChange={() => togglePlace(place.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{place.category?.name ? `[${place.category.name}] ` : ""}{place.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {place.address_display || place.address_raw}
                    </span>
                    {!place.latitude && (
                      <span className="text-xs text-yellow-600 ml-2">(좌표 미확인)</span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleCalculate}
          disabled={isCalculating || selectedFriendIds.size === 0 || selectedPlaceIds.size === 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isCalculating ? "계산 중..." : `이동시간 계산하기${selectedPlaceIds.size > 0 ? ` (${selectedPlaceIds.size}개 장소)` : ""}`}
        </button>
      </div>

      {/* Results — per place */}
      {placeResults.map((pr, placeIdx) => {
        const validItems = pr.items.filter((r) => !r.error && r.durationMin);
        return (
          <section key={pr.place.id} className="mb-10">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">#{placeIdx + 1}</span>
              {pr.place.name}
              <span className="text-sm font-normal text-gray-500">
                {pr.place.address_display || pr.place.address_raw}
              </span>
            </h2>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 text-center">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">참석자 수</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{validItems.length}명</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 text-center">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">총 이동시간</p>
                <p className="text-xl sm:text-3xl font-bold text-blue-600">{Math.round(pr.totalMinutes)}분</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 text-center">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">평균 이동시간</p>
                <p className="text-xl sm:text-3xl font-bold text-green-600">{Math.round(pr.averageMinutes)}분</p>
              </div>
            </div>

            {/* Route Map */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">경로 지도</h3>
              <div
                ref={(el) => { mapRefs.current[placeIdx] = el; }}
                className="w-full h-[300px] sm:h-[500px] rounded-lg"
              />
              <div className="flex flex-wrap gap-3 mt-3">
                {pr.items.map((result, idx) =>
                  !result.error ? (
                    <div key={result.friendId} className="flex items-center space-x-2 text-sm">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: MARKER_COLORS[idx % MARKER_COLORS.length] }}
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
                    {pr.items.map((result, idx) => (
                      <tr key={result.friendId} className="hover:bg-gray-50">
                        <td className="px-3 py-3 sm:px-6 sm:py-4">
                          <span
                            className="w-4 h-4 rounded-full inline-block"
                            style={{ backgroundColor: MARKER_COLORS[idx % MARKER_COLORS.length] }}
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
          </section>
        );
      })}
    </div>
  );
}
