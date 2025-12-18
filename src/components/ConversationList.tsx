"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { UNNI_GREETING } from "@/lib/prompts/unni";

interface Conversation {
    id: string;
    title: string | null;
    updatedAt: Date;
    messages?: { content: string }[];
}


interface ConversationListProps {
    userId: string;
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onBack: () => void;
}

export function ConversationList({
    userId,
    currentConversationId,
    onSelectConversation,
    onBack,
}: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    const getConversations = trpc.getConversations.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const deleteConversation = trpc.deleteConversation.useMutation();

    const loadConversations = async () => {
        const data = await getConversations.mutateAsync({ userId });
        setConversations(data);
    };

    useEffect(() => {
        if (userId) {
            loadConversations();
        }
    }, [userId]);

    const handleNewConversation = async () => {
        const conversation = await createConversation.mutateAsync({
            userId,
            greeting: UNNI_GREETING,
        });
        await loadConversations();
        onSelectConversation(conversation.id);
    };

    const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        if (!confirm("이 대화방을 삭제하시겠습니까?")) return;
        await deleteConversation.mutateAsync({ conversationId });
        await loadConversations();

        // 현재 대화방이 삭제된 경우 첫 번째 대화방 선택
        if (currentConversationId === conversationId) {
            const remaining = conversations.filter(c => c.id !== conversationId);
            if (remaining.length > 0) {
                onSelectConversation(remaining[0].id);
            }
        }
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
        });
    };

    const getPreview = (conv: Conversation) => {
        if (conv.messages && conv.messages.length > 0) {
            const content = conv.messages[0].content;
            return content.length > 30 ? content.slice(0, 30) + "..." : content;
        }
        return "대화를 시작해보세요";
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-purple-900 via-purple-800 to-pink-900">
            {/* 헤더 */}
            <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-md border-b border-white/10">
                <button
                    onClick={onBack}
                    className="p-2 text-white/70 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-white font-semibold">대화 목록</h1>
                <button
                    onClick={handleNewConversation}
                    className="p-2 text-white/70 hover:text-white"
                    disabled={createConversation.isPending}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </header>

            {/* 대화 목록 */}
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                        <p className="mb-4">대화가 없어요</p>
                        <button
                            onClick={handleNewConversation}
                            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white text-sm"
                        >
                            + 새 대화 시작
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => onSelectConversation(conv.id)}
                                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${conv.id === currentConversationId
                                    ? "bg-white/10"
                                    : "hover:bg-white/5"
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">
                                        {conv.title || "새 대화"}
                                    </p>
                                    <p className="text-white/50 text-sm truncate">
                                        {getPreview(conv)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <span className="text-white/40 text-xs whitespace-nowrap">
                                        {formatDate(conv.updatedAt)}
                                    </span>
                                    <button
                                        onClick={(e) => handleDelete(e, conv.id)}
                                        className="p-1 text-white/30 hover:text-red-400"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
