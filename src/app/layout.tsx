import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const ADSENSE_CLIENT_ID = "ca-pub-5055865634735480";

export const metadata: Metadata = {
  title: "로스트아크 공대관리",
  description: "로스트아크 고정 공대의 일정, 출석, 캐릭터, 템플릿을 관리합니다.",
  other: {
    "google-adsense-account": ADSENSE_CLIENT_ID,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
