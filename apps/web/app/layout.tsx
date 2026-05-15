import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "醫點通 Med-Link",
  description: "南台灣醫療通路業務診表整合與拜訪備註工具"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
