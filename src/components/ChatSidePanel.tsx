"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { AI_MODELS, type AIModelId } from "@/lib/ai/constants";
import { ConfirmModal } from "@/components/ConfirmModal";

interface ChatSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    userId: string;
    currentModel: string;
    characterId?: string | null;
    onSelectModeEnter: () => void;
    onRefresh: () => void;
}

export function ChatSidePanel({
    isOpen,
    onClose,
    conversationId,
    userId,
    currentModel,
    characterId,
    onSelectModeEnter,
    onRefresh,
}: ChatSidePanelProps) {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const currentX = useRef(0);

    // 모달 상태
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTitleEdit, setShowTitleEdit] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

    // API
    const getConversation = trpc.getConversation.useQuery(
        { conversationId },
        { enabled: isOpen }
    );
    const updateConversationModel = trpc.updateConversationModel.useMutation();
    const updateConversationTitle = trpc.updateConversationTitle.useMutation();
    const duplicateConversation = trpc.duplicateConversation.useMutation();
    const toggleDeleteLock = trpc.toggleDeleteLock.useMutation();
    const deleteConversation = trpc.deleteConversation.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const searchMessages = trpc.searchMessages.useQuery(
        { conversationId, query: searchQuery },
        { enabled: showSearch && searchQuery.length > 0 }
    );
    const utils = trpc.useUtils();

    const conversation = getConversation.data;
    const isDeleteLocked = conversation?.deleteLocked ?? false;

    // 열림/닫힘 애니메이션
    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setIsAnimating(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // 스와이프 핸들러
    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        currentX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        currentX.current = e.touches[0].clientX;
        const diff = currentX.current - startX.current;
        if (diff > 0 && panelRef.current) {
            panelRef.current.style.transform = `translateX(${diff}px)`;
            panelRef.current.style.transition = 'none';
        }
    };

    const handleTouchEnd = () => {
        const diff = currentX.current - startX.current;
        if (panelRef.current) {
            panelRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            if (diff > 80) {
                panelRef.current.style.transform = 'translateX(100%)';
                setTimeout(onClose, 300);
            } else {
                panelRef.current.style.transform = '';
            }
        }
    };

    // 모델 변경
    const handleModelChange = async (modelId: string) => {
        await updateConversationModel.mutateAsync({
            conversationId,
            model: modelId,
        });
        await utils.getConversation.refetch();
        setIsModelDropdownOpen(false);
    };

    // 제목 수정
    const handleTitleUpdate = async () => {
        if (!newTitle.trim()) return;
        await updateConversationTitle.mutateAsync({
            conversationId,
            title: newTitle.trim(),
        });
        await utils.getConversation.refetch();
        onRefresh();
        setShowTitleEdit(false);
        setNewTitle("");
    };

    // 새 대화 시작
    const handleNewConversation = async () => {
        if (!characterId) return;
        const conv = await createConversation.mutateAsync({
            userId,
            characterId,
        });
        onClose();
        router.push(`/chat/${conv.id}`);
    };

    // 채팅방 복제
    const handleDuplicate = async () => {
        const newConv = await duplicateConversation.mutateAsync({
            conversationId,
            userId,
        });
        onClose();
        router.push(`/chat/${newConv.id}`);
    };

    // 삭제 잠금 토글
    const handleToggleDeleteLock = async () => {
        await toggleDeleteLock.mutateAsync({ conversationId });
        await getConversation.refetch();
    };

    // 채팅방 삭제
    const handleDelete = async () => {
        if (isDeleteLocked) return;
        await deleteConversation.mutateAsync({ conversationId });
        onClose();
        router.push("/chat");
    };

    if (!isOpen && !isAnimating) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center">
            {/* 백드롭 */}
            <div
                className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
            />

            {/* 사이드 패널 - 390px 컨테이너 기준 */}
            <div
                ref={panelRef}
                className={`absolute top-0 bottom-0 w-[312px] max-w-[80vw] bg-black border-l border-white/10 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? "translate-x-0" : "translate-x-full"}`}
                style={{ right: 'max(0px, calc(50% - 195px))' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                    <h2 className="text-white font-bold">채팅방 메뉴</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/70 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto">
                    {/* MODEL 섹션 */}
                    <div className="px-4 py-4 border-b border-white/10">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-3">MODEL</p>
                        <button
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-transparent border border-brand rounded-lg text-white"
                        >
                            <span className="flex items-center gap-2">
                                <span>✨</span>
                                <span>{AI_MODELS[currentModel as AIModelId]?.name || currentModel}</span>
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {isModelDropdownOpen && (
                            <div className="mt-2 bg-white/5 rounded-lg overflow-hidden">
                                {(Object.keys(AI_MODELS) as AIModelId[]).map((id) => (
                                    <button
                                        key={id}
                                        onClick={() => handleModelChange(id)}
                                        className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-white/10 ${currentModel === id ? "text-brand" : "text-white/80"}`}
                                    >
                                        <span>{AI_MODELS[id].name}</span>
                                        {currentModel === id && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MANAGEMENT 섹션 */}
                    <div className="px-4 py-4">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-3">MANAGEMENT</p>
                        <div className="space-y-1">
                            {/* 채팅방 제목 수정 */}
                            <button
                                onClick={() => {
                                    setNewTitle(conversation?.title || "");
                                    setShowTitleEdit(true);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg text-sm text-left"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                채팅방 제목 수정
                            </button>

                            {/* 메시지 검색 */}
                            <button
                                onClick={() => setShowSearch(!showSearch)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg text-sm text-left"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                메시지 검색
                            </button>

                            {showSearch && (
                                <div className="px-4 py-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="검색어 입력..."
                                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/50"
                                    />
                                    {searchMessages.data && searchMessages.data.length > 0 && (
                                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                            {searchMessages.data.map((msg) => (
                                                <div key={msg.id} className="px-2 py-1 text-white/70 text-xs bg-white/5 rounded">
                                                    {msg.content.slice(0, 50)}...
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 새 대화 시작 */}
                            <button
                                onClick={handleNewConversation}
                                disabled={!characterId}
                                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg text-sm text-left disabled:opacity-50"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                새 대화 시작
                            </button>

                            {/* 채팅방 복제 */}
                            <button
                                onClick={handleDuplicate}
                                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg text-sm text-left"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                채팅방 복제
                            </button>

                            {/* 메시지 선택 삭제 */}
                            <button
                                onClick={() => {
                                    onClose();
                                    onSelectModeEnter();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg text-sm text-left"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                메시지 선택 삭제
                            </button>

                            {/* 채팅방 삭제 잠금 */}
                            <button
                                onClick={handleToggleDeleteLock}
                                className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-lg text-sm text-left"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isDeleteLocked ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    )}
                                </svg>
                                {isDeleteLocked ? "삭제 잠금 해제" : "채팅방 삭제 잠금"}
                            </button>

                            {/* 채팅방 삭제 */}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isDeleteLocked}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                채팅방 삭제
                                {isDeleteLocked && <span className="ml-auto text-xs text-white/40">🔒</span>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 제목 수정 모달 */}
            {showTitleEdit && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowTitleEdit(false)} />
                    <div className="relative w-full max-w-sm mx-4 bg-gray-900 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-4">채팅방 제목 수정</h3>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4"
                            placeholder="새 제목"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowTitleEdit(false)}
                                className="flex-1 py-2 bg-white/10 text-white rounded-lg"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleTitleUpdate}
                                className="flex-1 py-2 bg-pink-600 text-white rounded-lg"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 삭제 확인 모달 */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                message="이 채팅방을 삭제하시겠습니까?"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="삭제"
                danger
            />
        </div>
    );
}
