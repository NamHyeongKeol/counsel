"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
    {
        href: "/explore",
        icon: (active: boolean) => (
            // 심플한 홈 아이콘
            <svg className={`w-6 h-6 ${active ? "text-pink-400" : "text-white/50"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
            </svg>
        ),
    },
    {
        href: "/chat",
        icon: (active: boolean) => (
            // 심플한 말풍선 아이콘 (빈 말풍선)
            <svg className={`w-6 h-6 ${active ? "text-pink-400" : "text-white/50"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
        ),
    },
    {
        href: "/mypage",
        icon: (active: boolean) => (
            // 심플한 사용자 아이콘
            <svg className={`w-6 h-6 ${active ? "text-pink-400" : "text-white/50"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
        ),
    },
];

export function BottomNav() {
    const pathname = usePathname();

    // 채팅방 안이거나 admin 페이지에서는 숨김
    if (pathname.match(/^\/chat\/[^/]+$/) || pathname.startsWith("/admin")) {
        return null;
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-50">
            <div className="max-w-[390px] mx-auto flex justify-around items-center h-12">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href === "/chat" && pathname === "/");
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className="flex items-center justify-center w-full h-full transition-colors"
                        >
                            {tab.icon(isActive)}
                        </Link>
                    );
                })}
            </div>
            {/* iOS Safe Area */}
            <div className="h-safe-area-inset-bottom bg-black/90" />
        </nav>
    );
}
