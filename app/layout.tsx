import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import "./globals.css";

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  weight: ["400", "600"]
});

export const metadata: Metadata = {
  title: "Memory Box",
  description:
    "家庭数字记忆盒：用 AI 将孩子的成长瞬间转化为温暖的日记文字。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body className={josefinSans.className}>{children}</body>
    </html>
  );
}
