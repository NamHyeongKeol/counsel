"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/MessageBubble";
import { ConversationList } from "@/components/ConversationList";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CharacterProfile } from "@/components/CharacterProfile";
import { FeedbackModal } from "@/components/FeedbackModal";
import { EditMessageModal } from "@/components/EditMessageModal";
import { trpc } from "@/lib/trpc/client";
import { AI_MODELS, type AIModelId } from "@/lib/ai/constants";
import { toast } from "sonner";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    isLoading?: boolean;
    model?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cost?: number | null;
}

interface ModalState {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
}

interface ChatInterfaceProps {
    conversationId: string;
    userId: string;
}

export function ChatInterface({ conversationId: initialConversationId, userId }: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const [conversationId, setConversationId] = useState<string>(initialConversationId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<ModalState>({ isOpen: false, message: "", onConfirm: () => { } });
    const [isStreaming, setIsStreaming] = useState(false);
    const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<string | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);

    // 피드백/수정 모달 상태
    const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; messageId: string | null }>({ isOpen: false, messageId: null });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; messageId: string | null; content: string }>({ isOpen: false, messageId: null, content: "" });

    // 리액션 상태 (messageId -> "like" | "dislike" | null)
    const [reactions, setReactions] = useState<Record<string, string | null>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const hasCreatedGreeting = useRef(false);

    const router = useRouter();

    const createConversation = trpc.createConversation.useMutation();
    const sendMessage = trpc.sendMessage.useMutation();
    const deleteMessage = trpc.deleteMessage.useMutation();
    const deleteSelectedMessages = trpc.deleteSelectedMessages.useMutation();
    const createGreeting = trpc.createGreeting.useMutation();
    const updateConversationModel = trpc.updateConversationModel.useMutation();

    // 새 mutation
    const toggleReaction = trpc.toggleReaction.useMutation();
    const addFeedback = trpc.addFeedback.useMutation();
    const updateMessage = trpc.updateMessage.useMutation();
    const rerollMessage = trpc.rerollMessage.useMutation();

    const utils = trpc.useUtils();

    const getMessages = trpc.getMessages.useQuery(
        { conversationId: conversationId || "" },
        { enabled: !!conversationId }
    );

    const getConversation = trpc.getConversation.useQuery(
        { conversationId: conversationId || "" },
        { enabled: !!conversationId }
    );

    // 현재 캐릭터 정보 (대화방에 연결된 캐릭터)
    const character = getConversation.data?.character;

    const characterImage = character?.images?.[0]?.imageUrl || null;
    const characterName = character?.name || "언니";

    // 캐릭터 ID 설정
    useEffect(() => {
        if (character?.id && !currentCharacterId) {
            setCurrentCharacterId(character.id);
        }
    }, [character?.id, currentCharacterId]);

    // 프로필 열기
    const handleOpenProfile = () => {
        if (currentCharacterId) {
            setShowProfile(true);
        }
    };

    // 햄버거 메뉴 바깥 클릭 시 닫힘 (모바일 터치 포함)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [menuOpen]);

    // conversationId prop이 변경되면 상태 업데이트
    useEffect(() => {
        setConversationId(initialConversationId);
    }, [initialConversationId]);

    // textarea 자동 높이 조절
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [input]);

    // 메시지 로드 시 업데이트
    useEffect(() => {
        if (getMessages.data) {
            if (getMessages.data.length > 0) {
                setMessages(
                    getMessages.data.map((m) => ({
                        id: m.id,
                        role: m.role as "user" | "assistant",
                        content: m.content,
                        createdAt: m.createdAt,
                        model: m.model,
                        inputTokens: m.inputTokens,
                        outputTokens: m.outputTokens,
                        cost: m.cost,
                    }))
                );
            } else if (conversationId && !hasCreatedGreeting.current) {
                // 메시지가 없으면 인트로 메시지 생성 (중복 방지)
                hasCreatedGreeting.current = true;
                createGreeting.mutateAsync({
                    conversationId,
                }).then((greeting) => {
                    setMessages([{
                        id: greeting.id,
                        role: "assistant",
                        content: greeting.content,
                        createdAt: greeting.createdAt,
                    }]);
                });
            }
        }
    }, [getMessages.data, conversationId]);

    // conversationId 변경 시 메시지 초기화 및 리로드
    useEffect(() => {
        if (conversationId) {
            setMessages([]);
            getMessages.refetch();
        }
    }, [conversationId]);

    // 자동 스크롤
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !conversationId || isStreaming) return;

        const userInput = input.trim();
        setInput("");
        setIsStreaming(true);

        // 임시 사용자 메시지 추가
        const tempUserMsgId = `temp-${Date.now()}`;
        setMessages((prev) => [...prev, {
            id: tempUserMsgId,
            role: "user",
            content: userInput,
            createdAt: new Date()
        }]);

        // 스트리밍 assistant 메시지 추가
        const streamingMsgId = "streaming";
        setMessages((prev) => [...prev, {
            id: streamingMsgId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
            isLoading: true
        }]);

        try {
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, content: userInput }),
            });

            if (!response.ok) throw new Error("Stream request failed");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let realUserMsgId = tempUserMsgId;
            let realAssistantMsgId = streamingMsgId;
            let assistantContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n\n").filter(line => line.startsWith("data: "));

                    for (const line of lines) {
                        const jsonStr = line.replace("data: ", "");
                        try {
                            const data = JSON.parse(jsonStr);

                            if (data.type === "userMessage") {
                                realUserMsgId = data.id;
                                setMessages((prev) => prev.map((m) =>
                                    m.id === tempUserMsgId
                                        ? { ...m, id: data.id, createdAt: new Date(data.createdAt) }
                                        : m
                                ));
                            } else if (data.type === "chunk") {
                                assistantContent += data.content;
                                setMessages((prev) => prev.map((m) =>
                                    m.id === streamingMsgId
                                        ? { ...m, content: assistantContent, isLoading: false }
                                        : m
                                ));
                            } else if (data.type === "done") {
                                realAssistantMsgId = data.assistantMessageId;
                                setMessages((prev) => prev.map((m) =>
                                    m.id === streamingMsgId
                                        ? {
                                            ...m,
                                            id: data.assistantMessageId,
                                            createdAt: new Date(data.createdAt),
                                            model: data.model,
                                            inputTokens: data.inputTokens,
                                            outputTokens: data.outputTokens,
                                        }
                                        : m
                                ));
                            } else if (data.type === "error") {
                                setMessages((prev) => prev.map((m) =>
                                    m.id === streamingMsgId
                                        ? { ...m, id: data.assistantMessageId, content: data.content, isLoading: false }
                                        : m
                                ));
                            }
                        } catch (parseError) {
                            // JSON 파싱 에러 무시
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Stream error:", error);
            setMessages((prev) => prev.map((m) =>
                m.id === "streaming"
                    ? { ...m, id: "error", content: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요! 😢", isLoading: false }
                    : m
            ));
        } finally {
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // 모달 닫기
    const closeModal = () => {
        setModal({ isOpen: false, message: "", onConfirm: () => { } });
        setPendingDeleteMessageId(null);
    };

    // 단일 메시지 삭제 요청
    const requestDeleteMessage = (messageId: string) => {
        setPendingDeleteMessageId(messageId);
        setModal({
            isOpen: true,
            message: "이 메시지를 삭제하시겠습니까?",
            onConfirm: async () => {
                await deleteMessage.mutateAsync({ messageId });
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
                closeModal();
            },
        });
    };

    // 전체 선택 모드 진입 (모든 메시지 선택)
    const enterSelectAllMode = () => {
        const allIds = new Set(messages.filter(m => !m.isLoading).map(m => m.id));
        setSelectedIds(allIds);
        setSelectMode(true);
        setMenuOpen(false);
    };

    // 메시지 선택 토글
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // 선택한 메시지 삭제 요청
    const requestDeleteSelected = () => {
        if (!conversationId || selectedIds.size === 0) return;
        setModal({
            isOpen: true,
            message: `선택한 ${selectedIds.size}개 메시지를 삭제하시겠습니까?`,
            onConfirm: async () => {
                await deleteSelectedMessages.mutateAsync({
                    messageIds: Array.from(selectedIds),
                });
                setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
                setSelectMode(false);
                setSelectedIds(new Set());
                closeModal();
            },
        });
    };

    // 새 대화 시작
    const handleNewConversation = async () => {
        if (!userId || !character) return;
        setMenuOpen(false);
        const conversation = await createConversation.mutateAsync({
            userId,
            characterId: character.id,
        });
        router.push(`/chat/${conversation.id}`);
    };

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto bg-black">
                {/* 헤더 - 로딩 중에도 표시 */}
                <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {/* 뒤로가기 (대화방 목록) */}
                        <button
                            onClick={() => router.push("/chat")}
                            className="p-1 text-white/70 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        {getConversation.isLoading ? (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
                                <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleOpenProfile}
                                    className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 overflow-hidden hover:ring-2 hover:ring-white/30 transition-all"
                                >
                                    {characterImage ? (
                                        <img src={characterImage} alt={characterName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white text-sm font-bold">{characterName.slice(0, 2)}</span>
                                    )}
                                </button>
                                <div>
                                    <h1 className="text-white font-semibold">{characterName}</h1>
                                    <p className="text-white/60 text-xs">
                                        {getConversation.data?.model
                                            ? AI_MODELS[getConversation.data.model as AIModelId]?.name || "AI"
                                            : "Gemini 3 Flash"}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 햄버거 메뉴 */}
                    <div ref={menuRef} className="relative">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 text-white/70 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-12 w-48 bg-gray-900 rounded-lg shadow-xl border border-white/10 overflow-hidden z-20">
                                <button
                                    onClick={handleNewConversation}
                                    className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 text-sm"
                                >
                                    ✨ 새 대화 시작
                                </button>
                                <button
                                    onClick={enterSelectAllMode}
                                    className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 text-sm border-t border-white/10"
                                >
                                    ☑ 전체 메시지 선택
                                </button>

                                {/* 모델 선택 섹션 */}
                                <div className="px-4 py-2 border-t border-white/10">
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-2">
                                        AI 모델 선택
                                    </p>
                                    <div className="flex flex-col gap-1">
                                        {(Object.keys(AI_MODELS) as AIModelId[]).map((id) => {
                                            const info = AI_MODELS[id];
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={async () => {
                                                        if (id === getConversation.data?.model) return;
                                                        if (isStreaming) {
                                                            alert("응답 중에는 모델을 변경할 수 없어요!");
                                                            return;
                                                        }
                                                        await updateConversationModel.mutateAsync({
                                                            conversationId,
                                                            model: id,
                                                        });
                                                        await utils.getConversation.refetch();
                                                        setMenuOpen(false);
                                                    }}
                                                    className={`text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center justify-between ${getConversation.data?.model === id
                                                        ? "bg-pink-600 text-white"
                                                        : "text-white/70 hover:bg-white/10"
                                                        }`}
                                                >
                                                    <span>{info.name}</span>
                                                    {getConversation.data?.model === id && (
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* 선택 모드 툴바 */}
                {selectMode && (
                    <div className="sticky top-[60px] z-10 flex items-center justify-between px-4 py-2 bg-pink-600/90 backdrop-blur-md">
                        <span className="text-white text-sm">
                            {selectedIds.size}개 선택됨
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                                className="text-white hover:bg-white/20"
                            >
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={requestDeleteSelected}
                                disabled={selectedIds.size === 0}
                                className="bg-red-500 text-white hover:bg-red-600"
                            >
                                선택 삭제
                            </Button>
                        </div>
                    </div>
                )}

                {/* 채팅 영역 */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="flex flex-col gap-4 pb-4 min-h-full">
                        {(() => {
                            // 마지막 assistant 메시지 ID 찾기
                            const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant" && !m.isLoading);
                            const lastAssistantMessageId = lastAssistantMessage?.id;

                            return messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    role={message.role}
                                    content={message.isLoading ? "" : message.content}
                                    createdAt={message.createdAt}
                                    isLoading={message.isLoading}
                                    model={message.model}
                                    inputTokens={message.inputTokens}
                                    outputTokens={message.outputTokens}
                                    cost={message.cost}
                                    selectMode={selectMode}
                                    isSelected={selectedIds.has(message.id)}
                                    onSelect={() => toggleSelect(message.id)}
                                    onDelete={() => requestDeleteMessage(message.id)}
                                    canDelete={!message.isLoading}
                                    onAvatarClick={handleOpenProfile}
                                    characterImage={characterImage}
                                    characterName={characterName}
                                    // 새 액션 버튼 props
                                    isLastAssistantMessage={message.id === lastAssistantMessageId}
                                    isLiked={reactions[message.id] === "like"}
                                    isDisliked={reactions[message.id] === "dislike"}
                                    onReroll={async () => {
                                        if (isStreaming) return;
                                        setIsStreaming(true);

                                        // Optimistic: 기존 메시지 삭제하고 로딩 메시지 추가
                                        const oldMessageId = message.id;
                                        const streamingMsgId = "reroll-streaming";
                                        setMessages((prev) => prev.filter(m => m.id !== oldMessageId).concat({
                                            id: streamingMsgId,
                                            role: "assistant",
                                            content: "",
                                            createdAt: new Date(),
                                            isLoading: true,
                                        }));

                                        try {
                                            const newMessage = await rerollMessage.mutateAsync({
                                                conversationId,
                                                messageId: oldMessageId,
                                            });
                                            // 로딩 메시지를 실제 메시지로 교체
                                            setMessages((prev) => prev.map(m =>
                                                m.id === streamingMsgId ? {
                                                    id: newMessage.id,
                                                    role: "assistant",
                                                    content: newMessage.content,
                                                    createdAt: newMessage.createdAt,
                                                    model: newMessage.model,
                                                    inputTokens: newMessage.inputTokens,
                                                    outputTokens: newMessage.outputTokens,
                                                    cost: newMessage.cost,
                                                } : m
                                            ));
                                        } catch (error) {
                                            console.error("Reroll failed:", error);
                                            // 에러 시 에러 메시지로 교체
                                            setMessages((prev) => prev.map(m =>
                                                m.id === streamingMsgId ? {
                                                    ...m,
                                                    id: "reroll-error",
                                                    content: "죄송해요, 다시 생성하는 중 문제가 생겼어요. 다시 시도해주세요! 😢",
                                                    isLoading: false,
                                                } : m
                                            ));
                                        } finally {
                                            setIsStreaming(false);
                                        }
                                    }}
                                    onLike={async () => {
                                        const result = await toggleReaction.mutateAsync({
                                            messageId: message.id,
                                            userId,
                                            type: "like",
                                        });
                                        setReactions(prev => ({ ...prev, [message.id]: result.type }));
                                    }}
                                    onDislike={async () => {
                                        const result = await toggleReaction.mutateAsync({
                                            messageId: message.id,
                                            userId,
                                            type: "dislike",
                                        });
                                        setReactions(prev => ({ ...prev, [message.id]: result.type }));
                                    }}
                                    onFeedback={() => {
                                        setFeedbackModal({ isOpen: true, messageId: message.id });
                                    }}
                                    onEdit={() => {
                                        setEditModal({ isOpen: true, messageId: message.id, content: message.content });
                                    }}
                                    onCopy={() => {
                                        navigator.clipboard.writeText(message.content);
                                        toast.success("복사되었습니다");
                                    }}
                                />
                            ));
                        })()}
                    </div>
                </div>

                {/* 입력 영역 */}
                <div className="sticky bottom-0 z-10 p-2 bg-black/30 backdrop-blur-md border-t border-white/10">
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="고민을 이야기해주세요..."
                            rows={1}
                            className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-pink-400 focus:outline-none rounded-lg px-4 py-2.5 resize-none min-h-[42px] max-h-[120px] text-sm leading-relaxed"
                            disabled={isStreaming}
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isStreaming}
                            className="bg-black border border-[#E30A9E] text-white hover:bg-black active:bg-[#943576] rounded-lg px-5 h-[42px] disabled:opacity-50 shrink-0"
                        >
                            {isStreaming ? "..." : "전송"}
                        </Button>
                    </form>
                </div>
            </div>

            {/* 확인 모달 */}
            <ConfirmModal
                isOpen={modal.isOpen}
                message={modal.message}
                title={modal.title}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
                confirmText={modal.title === "다시 생성" ? "확인" : "삭제"}
                danger={modal.title !== "다시 생성"}
            />

            {/* 피드백 모달 */}
            <FeedbackModal
                isOpen={feedbackModal.isOpen}
                onClose={() => setFeedbackModal({ isOpen: false, messageId: null })}
                onSubmit={async (content) => {
                    if (!feedbackModal.messageId) return;
                    await addFeedback.mutateAsync({
                        messageId: feedbackModal.messageId,
                        userId,
                        content,
                    });
                }}
            />

            {/* 수정 모달 */}
            <EditMessageModal
                isOpen={editModal.isOpen}
                currentContent={editModal.content}
                onClose={() => setEditModal({ isOpen: false, messageId: null, content: "" })}
                onSubmit={async (content) => {
                    if (!editModal.messageId) return;
                    await updateMessage.mutateAsync({
                        messageId: editModal.messageId,
                        content,
                    });
                    // 로컬 상태 업데이트
                    setMessages(prev => prev.map(m =>
                        m.id === editModal.messageId ? { ...m, content } : m
                    ));
                }}
            />

            {/* 캐릭터 프로필 Bottom Sheet */}
            {currentCharacterId && (
                <CharacterProfile
                    characterId={currentCharacterId}
                    userId={userId}
                    isOpen={showProfile}
                    onClose={() => setShowProfile(false)}
                />
            )}
        </div>
    );
}
