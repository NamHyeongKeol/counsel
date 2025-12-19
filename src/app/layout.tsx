import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/client";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "sonner";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "언니야 - 연애 전문가가 떠먹여주는 은밀한 상담",
  description: "연애 고민? 언니한테 털어놔! 썸, 고백, 연인 갈등, 이별까지. 24시간 언제든 상담받을 수 있는 AI 연애 상담 서비스",
  keywords: ["연애상담", "연애고민", "AI상담", "썸", "고백", "이별", "연애조언"],
  openGraph: {
    title: "언니야 - 연애 전문가가 떠먹여주는 은밀한 상담",
    description: "연애 고민? 언니한테 털어놔! 24시간 AI 연애 상담 서비스",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#581c87",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} font-sans antialiased flex justify-center bg-gray-900`}>
        <TRPCProvider>
          {children}
          <BottomNav />
          <Toaster position="top-center" richColors />
        </TRPCProvider>
      </body>
    </html>
  );
}
