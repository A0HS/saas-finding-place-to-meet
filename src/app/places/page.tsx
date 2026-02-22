"use client";

import { useState, useEffect } from "react";
import NaverMap from "@/components/NaverMap";
import { geocodeAddress } from "@/lib/geocode";
import { createBrowserClient } from "@/lib/supabase/client";
import { DUMMY_PLACES, DUMMY_CATEGORIES } from "@/lib/dummyData";

interface Category {
  id: string;
  name: string;
  _count?: { places: number };
}

interface Place {
  id: string;
  name: string;
  categoryId: string | null;
  category: Category | null;
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

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [categoryFormName, setCategoryFormName] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [activeTab, setActiveTab] = useState<"places" | "categories">("places");
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [geoError, setGeoError] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isBatchGeocoding, setIsBatchGeocoding] = useState(false);
  const [previewPlace, setPreviewPlace] = useState<Place | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuth(true);
        fetchPlaces();
        fetchCategories();
      } else {
        setIsAuth(false);
        setPlaces([...DUMMY_PLACES]);
        setCategories([...DUMMY_CATEGORIES]);
      }
    });
  }, []);

  async function fetchPlaces() {
    const res = await fetch("/api/places");
    if (res.ok) setPlaces(await res.json());
  }

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }

  // --- Geocoding ---
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

  // --- Place CRUD ---
  function openAddPlaceModal() {
    setEditingPlace(null);
    setFormName("");
    setFormAddress("");
    setFormCategoryId("");
    setGeoResult(null);
    setGeoError("");
    setIsPlaceModalOpen(true);
  }

  function openEditPlaceModal(place: Place) {
    setEditingPlace(place);
    setFormName(place.name);
    setFormAddress(place.addressRaw);
    setFormCategoryId(place.categoryId || "");
    setGeoResult(
      place.latitude && place.longitude
        ? { lat: place.latitude, lng: place.longitude, displayAddress: place.addressDisplay || place.addressRaw }
        : null
    );
    setGeoError("");
    setIsPlaceModalOpen(true);
  }

  async function handlePlaceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim()) return;

    const body: Record<string, unknown> = {
      name: formName,
      addressRaw: formAddress,
      categoryId: formCategoryId || null,
    };

    if (geoResult) {
      body.addressDisplay = geoResult.displayAddress;
      body.latitude = geoResult.lat;
      body.longitude = geoResult.lng;
    }

    if (isAuth) {
      if (editingPlace) {
        await fetch(`/api/places/${editingPlace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      fetchPlaces();
    } else {
      const cat = categories.find((c) => c.id === formCategoryId) || null;
      if (editingPlace) {
        setPlaces((prev) =>
          prev.map((p) =>
            p.id === editingPlace.id
              ? {
                  ...p,
                  name: formName,
                  addressRaw: formAddress,
                  categoryId: formCategoryId || null,
                  category: cat,
                  addressDisplay: geoResult?.displayAddress || p.addressDisplay,
                  latitude: geoResult?.lat ?? p.latitude,
                  longitude: geoResult?.lng ?? p.longitude,
                }
              : p
          )
        );
      } else {
        const newPlace: Place = {
          id: `demo-${Date.now()}`,
          name: formName,
          addressRaw: formAddress,
          categoryId: formCategoryId || null,
          category: cat,
          addressDisplay: geoResult?.displayAddress || null,
          latitude: geoResult?.lat || null,
          longitude: geoResult?.lng || null,
        };
        setPlaces((prev) => [newPlace, ...prev]);
      }
    }

    setIsPlaceModalOpen(false);
  }

  async function handleBatchGeocode() {
    const ungeocoded = places.filter((p) => !p.latitude);
    if (ungeocoded.length === 0) return;
    setIsBatchGeocoding(true);
    for (const place of ungeocoded) {
      try {
        const result = await geocodeAddress(place.addressRaw);
        if (isAuth) {
          await fetch(`/api/places/${place.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              addressDisplay: result.displayAddress,
              latitude: result.lat,
              longitude: result.lng,
            }),
          });
        } else {
          setPlaces((prev) =>
            prev.map((p) =>
              p.id === place.id
                ? { ...p, addressDisplay: result.displayAddress, latitude: result.lat, longitude: result.lng }
                : p
            )
          );
        }
      } catch (err) {
        console.error(`Failed to geocode ${place.name}:`, err);
      }
    }
    setIsBatchGeocoding(false);
    if (isAuth) fetchPlaces();
  }

  async function handleDeletePlace(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (isAuth) {
      await fetch(`/api/places/${id}`, { method: "DELETE" });
      fetchPlaces();
    } else {
      setPlaces((prev) => prev.filter((p) => p.id !== id));
    }
    if (previewPlace?.id === id) setPreviewPlace(null);
  }

  // --- Category CRUD ---
  function openAddCategoryModal() {
    setEditingCategory(null);
    setCategoryFormName("");
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category);
    setCategoryFormName(category.name);
    setIsCategoryModalOpen(true);
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryFormName.trim()) return;

    if (isAuth) {
      if (editingCategory) {
        await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryFormName }),
        });
      } else {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryFormName }),
        });
      }
      fetchCategories();
    } else {
      if (editingCategory) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id ? { ...c, name: categoryFormName } : c
          )
        );
      } else {
        const newCat: Category = {
          id: `demo-cat-${Date.now()}`,
          name: categoryFormName,
          _count: { places: 0 },
        };
        setCategories((prev) => [...prev, newCat]);
      }
    }

    setIsCategoryModalOpen(false);
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (isAuth) {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      fetchCategories();
    } else {
      const placeCount = places.filter((p) => p.categoryId === id).length;
      if (placeCount > 0) {
        alert(`이 카테고리를 사용하는 장소가 ${placeCount}개 있습니다. 먼저 해당 장소의 카테고리를 변경해주세요.`);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }

  const filteredPlaces = filterCategoryId
    ? places.filter((p) => p.categoryId === filterCategoryId)
    : places;

  if (isAuth === null) {
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">장소 관리</h1>
          {!isAuth && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
              데모 모드
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("places")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "places"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          장소 목록
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "categories"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          카테고리 관리
        </button>
      </div>

      {activeTab === "places" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="flex space-x-2">
                {places.some((p) => !p.latitude) && (
                  <button
                    onClick={handleBatchGeocode}
                    disabled={isBatchGeocoding}
                    className="px-3 py-2 text-sm sm:text-base sm:px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                  >
                    {isBatchGeocoding ? "확인 중..." : "일괄 주소 확인"}
                  </button>
                )}
                <button
                  onClick={openAddPlaceModal}
                  className="px-3 py-2 text-sm sm:text-base sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 장소 추가
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">장소명</th>
                      <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">카테고리</th>
                      <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">주소</th>
                      <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">좌표</th>
                      <th className="px-3 py-3 sm:px-6 text-right text-sm font-medium text-gray-500">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPlaces.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-12 sm:px-6 text-center text-gray-400">
                          등록된 장소가 없습니다. 장소를 추가해보세요.
                        </td>
                      </tr>
                    ) : (
                      filteredPlaces.map((place) => (
                        <tr
                          key={place.id}
                          className={`hover:bg-gray-50 cursor-pointer ${previewPlace?.id === place.id ? "bg-blue-50" : ""}`}
                          onClick={() => place.latitude && setPreviewPlace(place)}
                        >
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{place.name}</td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600 whitespace-nowrap">{place.category?.name || "-"}</td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">
                            {place.addressDisplay || place.addressRaw}
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm">
                            {place.latitude ? (
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
                              onClick={(e) => { e.stopPropagation(); openEditPlaceModal(place); }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              수정
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePlace(place.id); }}
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
          </div>

          {/* Map Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">지도 미리보기</h3>
            {previewPlace?.latitude && previewPlace?.longitude ? (
              <>
                <NaverMap lat={previewPlace.latitude} lng={previewPlace.longitude} />
                <p className="mt-2 text-sm text-gray-600">
                  {previewPlace.name} - {previewPlace.addressDisplay || previewPlace.addressRaw}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-400">장소를 클릭하면 지도가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Categories Tab */
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={openAddCategoryModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 카테고리 추가
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">카테고리명</th>
                    <th className="px-3 py-3 sm:px-6 text-left text-sm font-medium text-gray-500">장소 수</th>
                    <th className="px-3 py-3 sm:px-6 text-right text-sm font-medium text-gray-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-12 sm:px-6 text-center text-gray-400">
                        등록된 카테고리가 없습니다. 카테고리를 추가해보세요.
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900">{category.name}</td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">
                          {category._count?.places ?? 0}개
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-right space-x-2">
                          <button
                            onClick={() => openEditCategoryModal(category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
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
        </>
      )}

      {/* Place Modal */}
      {isPlaceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editingPlace ? "장소 수정" : "장소 추가"}
            </h2>
            <form onSubmit={handlePlaceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소명</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="장소 이름"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택 안함</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
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
                {geoError && <p className="mt-1 text-sm text-red-600">{geoError}</p>}
                {geoResult && (
                  <p className="mt-1 text-sm text-green-600">확인됨: {geoResult.displayAddress}</p>
                )}
              </div>

              {geoResult && <NaverMap lat={geoResult.lat} lng={geoResult.lng} />}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlaceModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPlace ? "수정" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editingCategory ? "카테고리 수정" : "카테고리 추가"}
            </h2>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리명</label>
                <input
                  type="text"
                  value={categoryFormName}
                  onChange={(e) => setCategoryFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="카테고리 이름"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCategory ? "수정" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
