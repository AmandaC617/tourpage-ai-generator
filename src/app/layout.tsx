import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-tc",
});

export const metadata: Metadata = {
  title: "TourPage AI 文案生成器",
  description: "根據您的「素材需求表」與「行銷參數」自動生成網頁文案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={notoSansTC.variable}>
      <body className="font-sans antialiased">
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
