"use client";

import { useState, useEffect } from "react";
import NaverMap from "@/components/NaverMap";
import { geocodeAddress } from "@/lib/geocode";
import { createBrowserClient } from "@/lib/supabase/client";
import { DUMMY_FRIENDS } from "@/lib/dummyData";

interface Friend {
  id: string;
  name: string;
  addressRaw: string;
  addressDisplay: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GeoResult {
  lat: number;
  lng: number;
  displayAddress: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [geoError, setGeoError] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isBatchGeocoding, setIsBatchGeocoding] = useState(false);
  const [previewFriend, setPreviewFriend] = useState<Friend | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuth(true);
        fetchFriends();
      } else {
        setIsAuth(false);
        setFriends([...DUMMY_FRIENDS]);
      }
    });
  }, []);

  async function fetchFriends() {
    const res = await fetch("/api/friends");
    if (res.ok) setFriends(await res.json());
  }

  function openAddModal() {
    setEditingFriend(null);
    setFormName("");
    setFormAddress("");
    setGeoResult(null);
    setGeoError("");
    setIsModalOpen(true);
  }

  function openEditModal(friend: Friend) {
    setEditingFriend(friend);
    setFormName(friend.name);
    setFormAddress(friend.addressRaw);
    setGeoResult(
      friend.latitude && friend.longitude
        ? { lat: friend.latitude, lng: friend.longitude, displayAddress: friend.addressDisplay || friend.addressRaw }
        : null
    );
    setGeoError("");
    setIsModalOpen(true);
  }

  async function handleGeocode() {
    if (!formAddress.trim()) return;
    setIsGeocoding(true);
    setGeoError("");
    setGeoResult(null);

    try {
      const result = await geocodeAddress(formAddress);
      setGeoResult(result);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "주소 확인 중 오류가 발생했습니다.");
    } finally {
      setIsGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim()) return;

    const body: Record<string, unknown> = {
      name: formName,
      addressRaw: formAddress,
    };

    if (geoResult) {
      body.addressDisplay = geoResult.displayAddress;
      body.latitude = geoResult.lat;
      body.longitude = geoResult.lng;
    }

    if (isAuth) {
      if (editingFriend) {
        await fetch(`/api/friends/${editingFriend.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/friends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      fetchFriends();
    } else {
      if (editingFriend) {
        setFriends((prev) =>
          prev.map((f) =>
            f.id === editingFriend.id
              ? {
                  ...f,
                  name: formName,
                  addressRaw: formAddress,
                  addressDisplay: geoResult?.displayAddress || f.addressDisplay,
                  latitude: geoResult?.lat ?? f.latitude,
                  longitude: geoResult?.lng ?? f.longitude,
                }
              : f
          )
        );
      } else {
        const newFriend: Friend = {
          id: `demo-${Date.now()}`,
          name: formName,
          addressRaw: formAddress,
          addressDisplay: geoResult?.displayAddress || null,
          latitude: geoResult?.lat || null,
          longitude: geoResult?.lng || null,
        };
        setFriends((prev) => [newFriend, ...prev]);
      }
    }

    setIsModalOpen(false);
  }

  async function handleBatchGeocode() {
    const ungeocoded = friends.filter((f) => !f.latitude);
    if (ungeocoded.length === 0) return;
    setIsBatchGeocoding(true);

    for (const friend of ungeocoded) {
      try {
        const result = await geocodeAddress(friend.addressRaw);
        if (isAuth) {
          await fetch(`/api/friends/${friend.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              addressDisplay: result.displayAddress,
              latitude: result.lat,
              longitude: result.lng,
            }),
          });
        } else {
          setFriends((prev) =>
            prev.map((f) =>
              f.id === friend.id
                ? { ...f, addressDisplay: result.displayAddress, latitude: result.lat, longitude: result.lng }
                : f
            )
          );
        }
      } catch (err) {
        console.error(`Failed to geocode ${friend.name}:`, err);
      }
    }

    setIsBatchGeocoding(false);
    if (isAuth) fetchFriends();
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (isAuth) {
      await fetch(`/api/friends/${id}`, { method: "DELETE" });
      fetchFriends();
    } else {
      setFriends((prev) => prev.filter((f) => f.id !== id));
    }
    if (previewFriend?.id === id) setPreviewFriend(null);
  }

  if (isAuth === null) {
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">친구 관리</h1>
          {!isAuth && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
              데모 모드
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {friends.some((f) => !f.latitude) && (
            <button
              onClick={handleBatchGeocode}
              disabled={isBatchGeocoding}
              className="px-3 py-2 text-sm sm:text-base sm:px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {isBatchGeocoding ? "확인 중..." : "일괄 주소 확인"}
            </button>
          )}
          <button
            onClick={openAddModal}
            className="px-3 py-2 text-sm sm:text-base sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 친구 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">이름</th>
                  <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">주소</th>
                  <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">좌표</th>
                  <th className="px-3 py-3 sm:px-6 text-right text-sm font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {friends.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-12 sm:px-6 text-center text-gray-400">
                      등록된 친구가 없습니다. 친구를 추가해보세요.
                    </td>
                  </tr>
                ) : (
                  friends.map((friend) => (
                    <tr
                      key={friend.id}
                      className={`hover:bg-gray-50 cursor-pointer ${previewFriend?.id === friend.id ? "bg-blue-50" : ""}`}
                      onClick={() => friend.latitude && setPreviewFriend(friend)}
                    >
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{friend.name}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">
                        {friend.addressDisplay || friend.addressRaw}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm">
                        {friend.latitude ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            확인됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            미확인
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(friend); }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(friend.id); }}
                          className="text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Map Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">지도 미리보기</h3>
          {previewFriend?.latitude && previewFriend?.longitude ? (
            <>
              <NaverMap lat={previewFriend.latitude} lng={previewFriend.longitude} />
              <p className="mt-2 text-sm text-gray-600">
                {previewFriend.name} - {previewFriend.addressDisplay || previewFriend.addressRaw}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-400">친구를 클릭하면 지도가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editingFriend ? "친구 수정" : "친구 추가"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="친구 이름"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => {
                      setFormAddress(e.target.value);
                      setGeoResult(null);
                      setGeoError("");
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="주소를 입력하세요"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={isGeocoding || !formAddress.trim()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 whitespace-nowrap"
                  >
                    {isGeocoding ? "확인 중..." : "주소 확인"}
                  </button>
                </div>
                {geoError && (
                  <p className="mt-1 text-sm text-red-600">{geoError}</p>
                )}
                {geoResult && (
                  <p className="mt-1 text-sm text-green-600">
                    확인됨: {geoResult.displayAddress}
                  </p>
                )}
              </div>

              {/* Map in modal */}
              {geoResult && (
                <NaverMap lat={geoResult.lat} lng={geoResult.lng} />
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingFriend ? "수정" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
