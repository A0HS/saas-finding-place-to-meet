import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NaverMapScript from "@/components/NaverMapScript";

export const metadata: Metadata = {
  title: "이동 거리 계산기",
  description: "이동시간을 계산하여 최적의 모임 장소를 찾아보세요",
  viewport: "width=device-width, initial-scale=1",
  openGraph: {
    title: "이동 거리 계산기",
    description: "이동시간을 계산하여 최적의 모임 장소를 찾아보세요",
    type: "website",
    locale: "ko_KR",
    siteName: "이동 거리 계산기",
  },
  twitter: {
    card: "summary",
    title: "이동 거리 계산기",
    description: "이동시간을 계산하여 최적의 모임 장소를 찾아보세요",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 flex flex-col">
        <NaverMapScript />
        <Navigation />
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
