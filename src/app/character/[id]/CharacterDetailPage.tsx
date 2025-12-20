"use client";

import { useRouter } from "next/navigation";
import { CharacterDetailContent } from "@/components/CharacterDetailContent";
import { BottomNav } from "@/components/BottomNav";

interface CharacterDetailPageProps {
    id: string;
    isSlug: boolean;
}

export function CharacterDetailPage({ id, isSlug }: CharacterDetailPageProps) {
    const router = useRouter();

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                {/* 헤더 */}
                <header className="sticky top-0 z-10 flex items-center px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10 shrink-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-white/70 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="ml-2 font-semibold text-white">상담사 프로필</h1>
                </header>

                {/* 콘텐츠 - CharacterDetailContent 사용 */}
                <CharacterDetailContent
                    {...(isSlug ? { slug: id } : { characterId: id })}
                    isBottomSheet={false}
                />

                {/* 하단 네비게이션 */}
                <BottomNav />
            </div>
        </div>
    );
}
