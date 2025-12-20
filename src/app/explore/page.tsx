"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CharacterProfile } from "@/components/CharacterProfile";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    age: number | null;
    gender?: string | null;
    images: { id: string; imageUrl: string }[];
    _count?: { conversations: number; comments: number };
    createdAt?: Date;
}

export default function ExplorePage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [headerVisible, setHeaderVisible] = useState(true);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const lastScrollY = useRef(0);
    const mainRef = useRef<HTMLDivElement>(null);

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

    // 스크롤 방향 감지
    useEffect(() => {
        const mainElement = mainRef.current;
        if (!mainElement) return;

        const handleScroll = () => {
            const currentScrollY = mainElement.scrollTop;

            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                // 아래로 스크롤 - 헤더 숨김
                setHeaderVisible(false);
            } else {
                // 위로 스크롤 - 헤더 표시
                setHeaderVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        mainElement.addEventListener("scroll", handleScroll, { passive: true });
        return () => mainElement.removeEventListener("scroll", handleScroll);
    }, []);

    const characters = getPublicCharacters.data || [];

    // 인기 상담사 (대화 수 기준)
    const popularCharacters = [...characters].sort((a, b) => {
        const countA = a._count?.conversations || 0;
        const countB = b._count?.conversations || 0;
        return countB - countA;
    });

    // 상담사 카드 컴포넌트
    const CharacterCard = ({ character }: { character: Character }) => (
        <button
            onClick={() => setSelectedCharacterId(character.id)}
            className="w-full group text-left"
        >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-pink-400/20 to-purple-500/20">
                {character.images[0] ? (
                    <img
                        src={character.images[0].imageUrl}
                        alt={character.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/60">
                            {character.name[0]}
                        </span>
                    </div>
                )}
                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {/* 텍스트 정보 */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold text-base truncate">
                            {character.name}
                        </h3>
                        {character.age && (
                            <span className="text-white/60 text-xs">({character.age})</span>
                        )}
                        {character.gender && (
                            <span className="text-white/60 text-xs">{character.gender === "male" ? "♂" : "♀"}</span>
                        )}
                    </div>
                    {character.tagline && (
                        <p className="text-white/70 text-xs mt-1 line-clamp-2">
                            {character.tagline}
                        </p>
                    )}
                </div>
            </div>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto relative">
                {/* 헤더 - 스크롤 시 숨김 */}
                <header
                    className={`absolute top-0 left-0 right-0 flex items-center justify-center h-14 border-b border-white/10 bg-black z-20 transition-transform duration-300 ease-out ${headerVisible ? "translate-y-0" : "-translate-y-full"
                        }`}
                >
                    {/* 로고 이미지 */}
                    <img
                        src="/logo.png"
                        alt="언니"
                        className="h-8 w-auto"
                    />
                </header>

                {/* 메인 콘텐츠 */}
                <main
                    ref={mainRef}
                    className="flex-1 overflow-y-auto pb-16 pt-14"
                >
                    {getPublicCharacters.isLoading ? (
                        <LoadingSpinner />
                    ) : characters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-white/50">
                            <p>아직 공개된 상담사가 없어요</p>
                        </div>
                    ) : (
                        <div className="py-6">
                            {/* 인기 상담사 섹션 */}
                            <section>
                                <div className="flex items-center justify-between px-4 mb-4">
                                    <h2 className="text-white font-bold text-lg">인기 상담사</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-3 px-4">
                                    {popularCharacters.map((character) => (
                                        <CharacterCard key={character.id} character={character} />
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                </main>
            </div>

            {/* 상담사 프로필 바텀시트 */}
            <CharacterProfile
                characterId={selectedCharacterId || ""}
                userId={userId || undefined}
                isOpen={!!selectedCharacterId}
                onClose={() => setSelectedCharacterId(null)}
            />
        </div>
    );
}
