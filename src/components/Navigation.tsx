"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/friends", label: "친구 관리" },
  { href: "/places", label: "장소 관리" },
  { href: "/decide", label: "장소 정하기" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { email: user.email ?? undefined } : null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? undefined } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Brand + Desktop Nav */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-blue-600">
              <svg width="26" height="26" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
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
              <span className="hidden sm:inline">이동 거리 계산기</span>
              <span className="sm:hidden text-base">거리 계산기</span>
            </Link>
            {/* Desktop Nav */}
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Auth + Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!loading && (
              <div className="hidden sm:flex items-center gap-3">
                {user ? (
                  <>
                    <span className="text-sm text-gray-500 truncate max-w-[160px]">{user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    로그인
                  </Link>
                )}
              </div>
            )}
            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="메뉴"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              ) : (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!loading && (
              <div className="pt-2 mt-2 border-t border-gray-100">
                {user ? (
                  <>
                    <p className="px-4 py-1 text-xs text-gray-400 truncate">{user.email}</p>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="block px-4 py-2.5 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    로그인
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
