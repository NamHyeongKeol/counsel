"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CharacterDetailPageProps {
    id: string;
    isSlug: boolean;
}

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    images: { id: string; imageUrl: string; order: number }[];
}

export function CharacterDetailPage({ id, isSlug }: CharacterDetailPageProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    // localStorage에서 userId 가져오기
    useEffect(() => {
        const storedUserId = localStorage.getItem("userId");
        setUserId(storedUserId);
    }, []);

    const getCharacter = trpc.getPublicCharacter.useQuery(
        isSlug ? { slug: id } : { id }
    );
    const getComments = trpc.getCharacterComments.useQuery(
        { characterId: getCharacter.data?.id || "", limit: 50 },
        { enabled: !!getCharacter.data?.id }
    );
    const addComment = trpc.addCharacterComment.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();

    const character = getCharacter.data as Character | null;
    const comments = getComments.data?.comments || [];

    // 대화 시작하기
    const handleStartChat = async () => {
        if (!character || isStartingChat) return;

        setIsStartingChat(true);
        try {
            // userId가 없으면 생성
            let currentUserId = userId;
            if (!currentUserId) {
                let visitorId = localStorage.getItem("unni-visitor-id");
                if (!visitorId) {
                    visitorId = crypto.randomUUID();
                    localStorage.setItem("unni-visitor-id", visitorId);
                }
                const user = await getOrCreateUser.mutateAsync({ visitorId });
                currentUserId = user.id;
                localStorage.setItem("userId", user.id);
                setUserId(user.id);
            }

            // 새 대화방 생성
            const conversation = await createConversation.mutateAsync({
                userId: currentUserId,
                characterId: character.id,
            });

            // 대화방으로 이동
            router.push(`/chat/${conversation.id}`);
        } catch (error) {
            console.error("대화 시작 실패:", error);
        } finally {
            setIsStartingChat(false);
        }
    };

    // 댓글 작성
    const handleSubmitComment = async () => {
        if (!comment.trim() || !userId || !character) return;

        setIsSubmitting(true);
        try {
            await addComment.mutateAsync({
                characterId: character.id,
                userId,
                content: comment.trim(),
                isPrivate: false,
            });
            setComment("");
            getComments.refetch();
        } catch (error) {
            console.error("댓글 작성 실패:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    const nextImage = () => {
        if (character && character.images.length > 1) {
            setCurrentImageIndex((prev) =>
                prev === character.images.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (character && character.images.length > 1) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? character.images.length - 1 : prev - 1
            );
        }
    };

    // 시간 포맷팅
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "오늘";
        if (days === 1) return "어제";
        if (days < 7) return `${days}일 전`;
        if (days < 30) return `약 ${Math.floor(days / 7)}주 전`;
        if (days < 365) return `약 ${Math.floor(days / 30)}개월 전`;
        return `약 ${Math.floor(days / 365)}년 전`;
    };

    if (getCharacter.isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!character) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <p className="text-xl mb-4">캐릭터를 찾을 수 없어요 😢</p>
                <button
                    onClick={() => router.push("/")}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg"
                >
                    홈으로 돌아가기
                </button>
            </div>
        );
    }

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
                    <h1 className="ml-2 font-semibold text-white">{character.name}</h1>
                </header>

                {/* 스크롤 콘텐츠 */}
                <main className="flex-1 overflow-y-auto pb-20">
                    <div className="relative">
                        {character.images.length > 0 ? (
                            <div className="relative aspect-square max-w-lg mx-auto">
                                <img
                                    src={character.images[currentImageIndex]?.imageUrl}
                                    alt={character.name}
                                    className="w-full h-full object-cover"
                                />

                                {/* 이미지 네비게이션 */}
                                {character.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>

                                        {/* 인디케이터 */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {character.images.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentImageIndex(idx)}
                                                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? "bg-white" : "bg-white/40"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-square max-w-lg mx-auto bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-8xl font-bold">{character.name[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* 콘텐츠 */}
                    <div className="max-w-lg mx-auto px-4 py-6">
                        {/* 이름 & 태그라인 */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white">{character.name}</h2>
                            {character.tagline && (
                                <p className="text-pink-300 mt-1 italic">"{character.tagline}"</p>
                            )}
                        </div>

                        {/* 대화 시작 버튼 */}
                        <button
                            onClick={handleStartChat}
                            disabled={isStartingChat}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 rounded-xl font-medium mb-6 text-white"
                        >
                            {isStartingChat ? "대화방 생성 중..." : "💬 대화 시작하기"}
                        </button>

                        {/* 소개 */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                                <span className="px-2 py-0.5 bg-white/10 rounded text-sm">👤 소개</span>
                            </h3>
                            <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                                {character.introduction}
                            </p>
                        </div>

                        {/* 댓글 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                                <span>댓글</span>
                                <span className="px-2 py-0.5 bg-white/10 rounded-full text-sm text-white/70">
                                    {comments.length}
                                </span>
                            </h3>

                            {/* 댓글 작성 */}
                            {userId && (
                                <div className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="댓글을 남겨보세요"
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-pink-500"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSubmitComment();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleSubmitComment}
                                        disabled={isSubmitting || !comment.trim()}
                                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium"
                                    >
                                        {isSubmitting ? "..." : "작성"}
                                    </button>
                                </div>
                            )}

                            {/* 댓글 목록 */}
                            <div className="space-y-4 mb-6">
                                {comments.length === 0 ? (
                                    <p className="text-white/50 text-center py-4">
                                        아직 댓글이 없어요. 첫 댓글을 남겨보세요!
                                    </p>
                                ) : (
                                    comments.map((c) => (
                                        <div key={c.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                                                {c.user.nickname?.[0] || "?"}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-white">
                                                        {c.user.nickname || "익명"}
                                                    </span>
                                                    <span className="text-white/50 text-xs">
                                                        {formatTime(c.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-white/80 text-sm mt-1">{c.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
