"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function Home() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuth(!!user);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="flex items-center gap-3">
        <svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="7" fill="#D4E4D4"/>
          <rect x="2" y="6" width="28" height="8" rx="1" fill="#C8D8C8" opacity="0.5"/>
          <rect x="2" y="18" width="28" height="10" rx="1" fill="#C8D8C8" opacity="0.5"/>
          <line x1="0" y1="14" x2="32" y2="14" stroke="white" strokeWidth="1.5"/>
          <line x1="10" y1="0" x2="10" y2="32" stroke="white" strokeWidth="1.2"/>
          <line x1="22" y1="0" x2="22" y2="32" stroke="white" strokeWidth="1.2"/>
          <line x1="0" y1="6" x2="32" y2="6" stroke="white" strokeWidth="0.7" opacity="0.6"/>
          <line x1="0" y1="21" x2="32" y2="21" stroke="white" strokeWidth="0.7" opacity="0.6"/>
          <line x1="16" y1="0" x2="16" y2="32" stroke="white" strokeWidth="0.7" opacity="0.6"/>
          <path d="M7 9 L12 9 Q16 9 16 13 L16 19 Q16 23 20 23 L25 23" fill="none" stroke="#2563EB" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="7" cy="9" r="3.2" fill="#16A34A"/>
          <circle cx="7" cy="9" r="1.3" fill="white"/>
          <circle cx="25" cy="23" r="3.2" fill="#DC2626"/>
          <circle cx="25" cy="23" r="1.3" fill="white"/>
        </svg>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">이동 거리 계산기</h1>
      </div>
      <p className="text-lg text-gray-600 text-center max-w-md">
        주소와 모임 장소를 관리하고, 이동시간을 계산하여
        최적의 모임 장소를 찾아보세요.
      </p>

      {isAuth === false && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            로그인하면 데이터를 저장할 수 있습니다. 지금은 데모 모드로 체험해보세요.
          </p>
          <Link
            href="/login"
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md whitespace-nowrap"
          >
            로그인
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <Link
          href="/friends"
          className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <span className="text-3xl mb-2">👥</span>
          <span className="font-medium text-gray-900">친구 관리</span>
          <span className="text-sm text-gray-500 mt-1">친구 주소 등록</span>
        </Link>
        <Link
          href="/places"
          className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <span className="text-3xl mb-2">📍</span>
          <span className="font-medium text-gray-900">장소 관리</span>
          <span className="text-sm text-gray-500 mt-1">장소 / 카테고리 관리</span>
        </Link>
        <Link
          href="/decide"
          className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <span className="text-3xl mb-2">🕐</span>
          <span className="font-medium text-gray-900">장소 정하기</span>
          <span className="text-sm text-gray-500 mt-1">이동시간 비교</span>
        </Link>
      </div>
    </div>
  );
}
