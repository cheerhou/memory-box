import type { Metadata } from "next";
import {
  Ma_Shan_Zheng,
  Dancing_Script,
  Zhi_Mang_Xing,
  Patrick_Hand,
  Caveat
} from "next/font/google";
import "./globals.css";

const maShanZheng = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script-cn",
  display: "swap"
});

const dancingScript = Dancing_Script({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-script-en",
  display: "swap"
});

const zhiMangXing = Zhi_Mang_Xing({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-accent",
  display: "swap"
});

const patrickHand = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-button",
  display: "swap"
});

const caveat = Caveat({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-signature",
  display: "swap"
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
      <body
        className={`${maShanZheng.variable} ${dancingScript.variable} ${zhiMangXing.variable} ${patrickHand.variable} ${caveat.variable} font-script`}
      >
        {children}
      </body>
    </html>
  );
}
