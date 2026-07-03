import type { Metadata } from "next";
import "./globals.css";

// 🚀 네이버 & 구글 검색 최적화 (SEO) 및 카톡 공유(OG) 마스터 세팅
export const metadata: Metadata = {
  metadataBase: new URL("https://namanmola.co.kr"),
  title: "나만몰랐어? - 선착순 교육·체험 정보 마감 알리미",
  description: "공공기관, 지자체의 선착순 어린이 교육, 체험, 문화 행사 정보를 실시간으로 확인하고 마감 전 알림을 받아보세요.",
  keywords: ["어린이체험", "선착순교육", "주말아이와가볼만한곳", "어린이행사", "체험학습", "지자체프로그램", "나만몰랐어"],
  authors: [{ name: "나만몰랐어 팀" }],
  
  // 🔍 구글 & 네이버 서치콘솔 소유권 인증 (추후 키값 발급받아 교체)
  verification: {
    google: "구글서치콘솔에서_발급받을_인증키",
    other: {
      "naver-site-verification": "네이버서치어드바이저에서_발급받을_인증키",
    },
  },

  // 💬 카카오톡, 페이스북, 블로그 공유 시 뜨는 썸네일 세팅 (Open Graph)
  openGraph: {
    title: "나만몰랐어? - 선착순 교육·체험 정보 마감 알리미",
    description: "매번 놓치는 선착순 어린이 교육/체험 정보, 이제 마감 전에 실시간 타임라인으로 한눈에 확인하세요!",
    url: "https://namanmola.co.kr",
    siteName: "나만몰랐어?",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png", 
        width: 1200,
        height: 630,
        alt: "나만몰랐어? 서비스 썸네일",
      },
    ],
  },

  // 🐦 트위터 카드 세팅
  twitter: {
    card: "summary_large_image",
    title: "나만몰랐어? - 선착순 교육·체험 정보 마감 알리미",
    description: "선착순 어린이 교육, 체험, 문화 행사 정보 실시간 마감 알리미",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}