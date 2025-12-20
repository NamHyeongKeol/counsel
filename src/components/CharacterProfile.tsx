"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CharacterProfileProps {
    characterId: string;
    userId?: string;
    isOpen: boolean;
    onClose: () => void;
}

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    images: { id: string; imageUrl: string; order: number }[];
}

export function CharacterProfile({ characterId, userId, isOpen, onClose }: CharacterProfileProps) {
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [comment, setComment] = useState("");
    const [nickname, setNickname] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [showNicknameInput, setShowNicknameInput] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    const getCharacter = trpc.getCharacter.useQuery(
        { id: characterId },
        { enabled: isOpen && !!characterId }
    );
    const getComments = trpc.getCharacterComments.useQuery(
        { characterId, limit: 20 },
        { enabled: isOpen && !!characterId }
    );
    const addComment = trpc.addCharacterComment.useMutation();
    const updateNickname = trpc.updateUserNickname.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();

    const character = getCharacter.data as Character | null;
    const comments = getComments.data?.comments || [];

    // 열림/닫힘 애니메이션 제어
    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // 다음 프레임에서 애니메이션 시작
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
            // 애니메이션 완료 후 언마운트
            const timer = setTimeout(() => {
                setIsAnimating(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // 스와이프 핸들러
    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        currentY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;
        if (diff > 0 && sheetRef.current) {
            // 스무스한 저항값 적용
            const resistance = 0.4;
            sheetRef.current.style.transform = `translateY(${diff * resistance}px)`;
            sheetRef.current.style.transition = 'none';
        }
    };

    const handleTouchEnd = () => {
        const diff = currentY.current - startY.current;
        if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            if (diff > 100) {
                // 닫기
                sheetRef.current.style.transform = 'translateY(100%)';
                setTimeout(onClose, 300);
            } else {
                // 원위치
                sheetRef.current.style.transform = '';
            }
        }
    };

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
            // userId 가져오기/생성
            let currentUserId = userId;
            if (!currentUserId) {
                let visitorId = localStorage.getItem("unni-visitor-id");
                if (!visitorId) {
                    visitorId = crypto.randomUUID();
                    localStorage.setItem("unni-visitor-id", visitorId);
                }
                const user = await getOrCreateUser.mutateAsync({ visitorId });
                currentUserId = user.id;
            }

            // 새 대화방 생성
            const conversation = await createConversation.mutateAsync({
                userId: currentUserId,
                characterId: character.id,
            });

            onClose();
            router.push(`/chat/${conversation.id}`);
        } catch (error) {
            console.error("대화 시작 실패:", error);
        } finally {
            setIsStartingChat(false);
        }
    };

    // 댓글 작성
    const handleSubmitComment = async () => {
        if (!comment.trim() || !userId) return;

        setIsSubmitting(true);
        try {
            // 닉네임 업데이트가 필요하면
            if (nickname.trim()) {
                await updateNickname.mutateAsync({ userId, nickname: nickname.trim() });
            }

            await addComment.mutateAsync({
                characterId,
                userId,
                content: comment.trim(),
                isPrivate: false,
            });
            setComment("");
            setShowNicknameInput(false);
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

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    // 애니메이션 중이거나 열려있지 않으면 렌더링 안함
    if (!isOpen && !isAnimating) return null;

    return (
        <div className="fixed inset-0 z-[60]">
            {/* 백드롭 */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"
                    }`}
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className={`absolute bottom-12 inset-x-0 mx-auto w-full max-w-[390px] max-h-[calc(90vh-48px)] bg-black border border-white/10 rounded-t-3xl overflow-hidden flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? "translate-y-0" : "translate-y-full"
                    }`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* 닫기 핸들 */}
                <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white z-10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {getCharacter.isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : character ? (
                    <div className="flex-1 overflow-y-auto">
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
                                        </span>
                                    </div>

                                    {/* 좋아요 버튼 */}
                                    <button className="absolute bottom-4 right-4 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="aspect-square bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white text-6xl font-bold">{character.name[0]}</span>
                                </div>
                            )}
                        </div>

                        {/* 대사 (tagline) */}
                        {character.tagline && (
                            <div className="px-4 py-4 border-l-4 border-green-500 bg-gray-800/50 mx-4 mt-4 rounded-r">
                                <p className="text-white italic">"{character.tagline}"</p>
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

                        {/* 소개 섹션 */}
                        <div className="px-4 py-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80">
                                    👤 소개
                                </span>
                            </div>
                            <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
                                {character.introduction}
                            </div>
                        </div>

                        {/* 댓글 섹션 */}
                        <div className="px-4 pb-6">
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
                            <div className="space-y-2 pt-4 border-t border-gray-800">
                                {showNicknameInput && (
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="닉네임을 입력하세요"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-pink-500"
                                    />
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowNicknameInput(!showNicknameInput)}
                                        className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700"
                                    >
                                        {showNicknameInput ? "닉네임 숨기기" : "닉네임 설정"}
                                    </button>
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="댓글 달기"
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
                                        className="px-4 py-2 bg-black border border-brand text-brand hover:bg-brand/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
                                    >
                                        {isSubmitting ? "..." : "작성"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        캐릭터 정보를 불러올 수 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
