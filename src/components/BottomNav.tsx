"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
    {
        name: "상담사",
        href: "/explore",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-pink-400" : "text-white/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        name: "대화",
        href: "/chat",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-pink-400" : "text-white/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        ),
    },
    {
        name: "마이",
        href: "/mypage",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-pink-400" : "text-white/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
            <div className="max-w-[390px] mx-auto flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href === "/chat" && pathname === "/");
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors"
                        >
                            {tab.icon(isActive)}
                            <span className={`text-xs ${isActive ? "text-pink-400 font-medium" : "text-white/50"}`}>
                                {tab.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
            {/* iOS Safe Area */}
            <div className="h-safe-area-inset-bottom bg-black/90" />
        </nav>
    );
}
