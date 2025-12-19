"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    images: { id: string; imageUrl: string }[];
    _count?: { conversations: number; comments: number };
}

export default function ExplorePage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();
    const getPublicCharacters = trpc.getPublicCharacters.useQuery();

    useEffect(() => {
        async function init() {
            let visitorId = localStorage.getItem("unni-visitor-id");
            if (!visitorId) {
                visitorId = crypto.randomUUID();
                localStorage.setItem("unni-visitor-id", visitorId);
            }
            const user = await getOrCreateUser.mutateAsync({ visitorId });

            // name 없으면 온보딩으로 리다이렉트
            if (!user.name) {
                router.replace("/");
                return;
            }

            setUserId(user.id);
        }
        init();
    }, []);

    const characters = getPublicCharacters.data || [];

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                {/* 헤더 */}
                <header className="flex items-center justify-center h-14 border-b border-white/10 shrink-0">
                    <h1 className="text-lg font-bold text-white">상담사 찾기</h1>
                </header>

                {/* 상담사 목록 */}
                <main className="flex-1 overflow-y-auto pb-20">
                    {getPublicCharacters.isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : characters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-white/50">
                            <p>아직 공개된 상담사가 없어요</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {characters.map((character: Character) => (
                                <Link
                                    key={character.id}
                                    href={`/character/${character.slug}`}
                                    className="block bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-pink-500/50 transition-colors"
                                >
                                    <div className="flex gap-4 p-4">
                                        {/* 프로필 이미지 */}
                                        {character.images[0] ? (
                                            <img
                                                src={character.images[0].imageUrl}
                                                alt={character.name}
                                                className="w-20 h-20 rounded-xl object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0">
                                                <span className="text-2xl font-bold text-white">
                                                    {character.name[0]}
                                                </span>
                                            </div>
                                        )}

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-bold text-lg">
                                                {character.name}
                                            </h3>
                                            {character.tagline && (
                                                <p className="text-pink-300 text-sm mt-0.5">
                                                    {character.tagline}
                                                </p>
                                            )}
                                            <p className="text-white/60 text-sm mt-2 line-clamp-2">
                                                {character.introduction}
                                            </p>
                                            {character._count && (
                                                <div className="flex gap-3 mt-2 text-xs text-white/40">
                                                    <span>💬 {character._count.conversations}회 상담</span>
                                                    <span>💝 {character._count.comments}개 댓글</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
