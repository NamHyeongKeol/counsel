"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/MessageBubble";
import { ConversationList } from "@/components/ConversationList";
import { ConfirmModal } from "@/components/ConfirmModal";
import { trpc } from "@/lib/trpc/client";
import { UNNI_GREETING } from "@/lib/prompts/unni";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    isLoading?: boolean;
}

type ViewMode = "chat" | "list";

interface ModalState {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
}

export function ChatInterface() {
    const [input, setInput] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>("chat");
    const [modal, setModal] = useState<ModalState>({ isOpen: false, message: "", onConfirm: () => { } });
    const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const getOrCreateUser = trpc.getOrCreateUser.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const sendMessage = trpc.sendMessage.useMutation();
    const getConversations = trpc.getConversations.useMutation();
    const deleteMessage = trpc.deleteMessage.useMutation();
    const deleteSelectedMessages = trpc.deleteSelectedMessages.useMutation();
    const createGreeting = trpc.createGreeting.useMutation();
    const getMessages = trpc.getMessages.useQuery(
        { conversationId: conversationId || "" },
        { enabled: !!conversationId }
    );

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

    // 초기화 - 유저 생성 및 대화 불러오기/시작
    useEffect(() => {
        async function init() {
            let visitorId = localStorage.getItem("unni-visitor-id");
            if (!visitorId) {
                visitorId = crypto.randomUUID();
                localStorage.setItem("unni-visitor-id", visitorId);
            }

            const user = await getOrCreateUser.mutateAsync({ visitorId });
            setUserId(user.id);

            const conversations = await getConversations.mutateAsync({ userId: user.id });

            if (conversations.length > 0) {
                const latestConversation = conversations[0];
                setConversationId(latestConversation.id);
            } else {
                // 새 대화 시작 (인트로 메시지 포함)
                const conversation = await createConversation.mutateAsync({
                    userId: user.id,
                    greeting: UNNI_GREETING,
                });
                setConversationId(conversation.id);
            }
        }
        init();
    }, []);

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
                    }))
                );
            } else if (conversationId) {
                // 메시지가 없으면 인트로 메시지 생성
                createGreeting.mutateAsync({
                    conversationId,
                    content: UNNI_GREETING,
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
        if (!input.trim() || !conversationId || sendMessage.isPending) return;

        const userInput = input.trim();
        setInput("");

        const tempUserMsg: Message = { id: `temp-${Date.now()}`, role: "user", content: userInput, createdAt: new Date() };
        setMessages((prev) => [...prev, tempUserMsg]);

        const loadingMsg: Message = { id: "loading", role: "assistant", content: "", createdAt: new Date(), isLoading: true };
        setMessages((prev) => [...prev, loadingMsg]);

        try {
            const result = await sendMessage.mutateAsync({ conversationId, content: userInput });
            setMessages((prev) =>
                prev
                    .filter((m) => m.id !== "loading" && m.id !== tempUserMsg.id)
                    .concat([
                        { id: result.userMessage.id, role: "user", content: result.userMessage.content, createdAt: result.userMessage.createdAt },
                        { id: result.assistantMessage.id, role: "assistant", content: result.assistantMessage.content, createdAt: result.assistantMessage.createdAt },
                    ])
            );
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === "loading" ? { ...m, id: "error", content: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요! 😢", isLoading: false } : m
                )
            );
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
        if (!userId) return;
        setMenuOpen(false);
        const conversation = await createConversation.mutateAsync({
            userId,
            greeting: UNNI_GREETING,
        });
        setConversationId(conversation.id);
    };

    // 대화방 선택
    const handleSelectConversation = (id: string) => {
        setConversationId(id);
        setViewMode("chat");
    };

    // 대화방 목록 뷰
    if (viewMode === "list" && userId) {
        return (
            <div className="fixed inset-0 bg-black">
                <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                    <ConversationList
                        userId={userId}
                        currentConversationId={conversationId}
                        onSelectConversation={handleSelectConversation}
                        onBack={() => setViewMode("chat")}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto bg-gradient-to-b from-purple-900 via-purple-800 to-pink-900">
                {/* 헤더 */}
                <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {/* 뒤로가기 (대화방 목록) */}
                        <button
                            onClick={() => setViewMode("list")}
                            className="p-1 text-white/70 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-sm font-bold">언니</span>
                        </div>
                        <div>
                            <h1 className="text-white font-semibold">언니야</h1>
                            <p className="text-white/60 text-xs">연애 전문 상담사</p>
                        </div>
                    </div>

                    {/* 햄버거 메뉴 */}
                    <div className="relative">
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
                        {messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                role={message.role}
                                content={message.isLoading ? "" : message.content}
                                createdAt={message.createdAt}
                                isLoading={message.isLoading}
                                selectMode={selectMode}
                                isSelected={selectedIds.has(message.id)}
                                onSelect={() => toggleSelect(message.id)}
                                onDelete={() => requestDeleteMessage(message.id)}
                                canDelete={!message.isLoading}
                            />
                        ))}
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
                            className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-pink-400 focus:outline-none rounded-2xl px-4 py-2.5 resize-none min-h-[42px] max-h-[120px] text-sm leading-relaxed"
                            disabled={sendMessage.isPending}
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || sendMessage.isPending}
                            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full px-5 h-[42px] disabled:opacity-50 shrink-0"
                        >
                            {sendMessage.isPending ? "..." : "전송"}
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
                confirmText="삭제"
                danger
            />
        </div>
    );
}
