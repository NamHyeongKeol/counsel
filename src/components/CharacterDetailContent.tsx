"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { LoadingSpinner } from "./LoadingSpinner";
import { User, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface CharacterDetailContentProps {
    characterId?: string;
    slug?: string;
    userId?: string;
    isBottomSheet?: boolean;
    onClose?: () => void;
}

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    greeting: string;
    age?: number | null;
    gender?: string | null;
    images: { id: string; imageUrl: string; order: number }[];
}

export function CharacterDetailContent({
    characterId,
    slug,
    userId: initialUserId,
    isBottomSheet = false,
    onClose,
}: CharacterDetailContentProps) {
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [comment, setComment] = useState("");
    const [nickname, setNickname] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [showNicknameInput, setShowNicknameInput] = useState(false);
    const [userId, setUserId] = useState<string | null>(initialUserId || null);

    // localStorage에서 userId 가져오기
    useEffect(() => {
        if (!userId) {
            const storedUserId = localStorage.getItem("userId");
            setUserId(storedUserId);
        }
    }, [userId]);

    const getCharacterQuery = slug
        ? trpc.getPublicCharacter.useQuery({ slug }, { enabled: !!slug })
        : trpc.getCharacter.useQuery({ id: characterId || "" }, { enabled: !!characterId });

    const getComments = trpc.getCharacterComments.useQuery(
        { characterId: getCharacterQuery.data?.id || "", limit: 20 },
        { enabled: !!getCharacterQuery.data?.id }
    );
    const addComment = trpc.addCharacterComment.useMutation();
    const updateNickname = trpc.updateUserNickname.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();

    const character = getCharacterQuery.data as Character | null;
    const comments = getComments.data?.comments || [];

    // 이미지 네비게이션
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

            // 바텀시트면 닫기
            if (isBottomSheet && onClose) {
                onClose();
            }

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

        // 닉네임 업데이트 (입력한 경우)
        if (nickname.trim()) {
            try {
                await updateNickname.mutateAsync({
                    userId,
                    nickname: nickname.trim(),
                });
            } catch (error) {
                console.error("닉네임 업데이트 실패:", error);
            }
        }

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

    // 로딩 상태
    if (getCharacterQuery.isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    // 에러 상태
    if (!character) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-black text-white">
                <p className="text-xl mb-4">캐릭터를 찾을 수 없어요 😢</p>
                {!isBottomSheet && (
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 bg-black border border-brand text-brand hover:bg-brand/10 rounded-lg"
                    >
                        홈으로 돌아가기
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-black">
            {/* 프로필 이미지 섹션 */}
            <div className="relative">
                {/* 이미지 */}
                {character.images.length > 0 ? (
                    <div className="relative aspect-square">
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
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                {/* 이미지 인디케이터 */}
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

                        {/* 오버레이 정보 */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                            <span className="px-2 py-1 bg-black/40 backdrop-blur rounded text-white text-sm font-medium">
                                👤 {character.name}
                                {(character.age || character.gender) && (
                                    <span className="text-white/70 ml-1">
                                        ({[
                                            character.age,
                                            character.gender === "male" ? "남" : character.gender === "female" ? "여" : null
                                        ].filter(Boolean).join(", ")})
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-square bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-6xl font-bold">{character.name[0]}</span>
                    </div>
                )}
            </div>

            {/* 대사 (tagline) */}
            {character.tagline && (
                <div className="px-4 py-4 border-l-2 border-brand bg-white/5 mx-4 mt-4 rounded-r">
                    <div className="text-white italic prose prose-invert max-w-none prose-strong:text-brand prose-strong:font-bold prose-em:text-white/60 prose-em:not-italic prose-p:m-0">
                        <ReactMarkdown>
                            {"\"" + character.tagline + "\""}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {/* 대화 시작 버튼 */}
            <div className="px-4 mt-4">
                <button
                    onClick={handleStartChat}
                    disabled={isStartingChat}
                    className="w-full py-3.5 bg-black border border-brand text-white hover:bg-black active:bg-brand-active disabled:opacity-50 rounded-xl font-medium text-base"
                >
                    {isStartingChat ? "대화방 생성 중..." : "💬 대화 시작하기"}
                </button>
            </div>

            {/* 소개 섹션 - 회색 인용문 스타일 */}
            <div className="px-4 py-4 border-l-2 border-white/30 bg-white/5 mx-4 mt-6 rounded-r">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70 flex items-center gap-1.5">
                        <User className="w-4 h-4" /> 소개
                    </span>
                </div>
                <div className="text-white/90 leading-relaxed prose prose-invert max-w-none prose-strong:text-brand prose-strong:font-bold prose-em:text-white/60 prose-em:not-italic prose-p:my-2">
                    <ReactMarkdown>
                        {character.introduction}
                    </ReactMarkdown>
                </div>
            </div>

            {/* 첫 인사 섹션 - 회색 인용문 스타일 */}
            <div className="px-4 py-4 border-l-2 border-white/30 bg-white/5 mx-4 mt-4 rounded-r">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" /> 첫 인사
                    </span>
                </div>
                <div className="text-white/80 leading-relaxed prose prose-invert max-w-none prose-strong:text-brand prose-strong:font-bold prose-em:text-white/60 prose-em:not-italic prose-p:my-2">
                    <ReactMarkdown>
                        {character.greeting}
                    </ReactMarkdown>
                </div>
            </div>

            {/* 댓글 섹션 */}
            <div className="px-4 pt-6 pb-6 mt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                    <span className="font-bold text-white">댓글</span>
                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-sm text-white/70">
                        {comments.length}
                    </span>
                </div>

                {/* 댓글 목록 */}
                <div className="space-y-4 mb-4">
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
                                        <span className="font-medium text-white text-sm">
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

                {/* 댓글 작성 */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                    {showNicknameInput && (
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="닉네임을 입력하세요"
                            className="input-default"
                        />
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowNicknameInput(!showNicknameInput)}
                            className="px-3 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-sm hover:bg-white/10"
                        >
                            {showNicknameInput ? "닉네임 숨기기" : "닉네임 설정"}
                        </button>
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="댓글 달기"
                            className="input-default flex-1"
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
                            className="px-4 py-2 bg-black border border-brand text-brand hover:bg-brand/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
                        >
                            {isSubmitting ? "..." : "작성"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
