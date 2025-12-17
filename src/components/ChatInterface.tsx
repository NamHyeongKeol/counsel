"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/MessageBubble";
import { trpc } from "@/lib/trpc/client";
import { UNNI_GREETING } from "@/lib/prompts/unni";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
}

export function ChatInterface() {
    const [input, setInput] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const getOrCreateUser = trpc.getOrCreateUser.useMutation();
    const createConversation = trpc.createConversation.useMutation();
    const sendMessage = trpc.sendMessage.useMutation();
    const getMessages = trpc.getMessages.useQuery(
        { conversationId: conversationId || "" },
        { enabled: !!conversationId }
    );

    // 초기화 - 유저 생성 및 대화 시작
    useEffect(() => {
        async function init() {
            // 로컬스토리지에서 visitorId 가져오기 또는 생성
            let visitorId = localStorage.getItem("unni-visitor-id");
            if (!visitorId) {
                visitorId = crypto.randomUUID();
                localStorage.setItem("unni-visitor-id", visitorId);
            }

            const user = await getOrCreateUser.mutateAsync({ visitorId });
            setUserId(user.id);

            // 새 대화 시작
            const conversation = await createConversation.mutateAsync({
                userId: user.id,
            });
            setConversationId(conversation.id);

            // 인사 메시지 추가
            setMessages([
                {
                    id: "greeting",
                    role: "assistant",
                    content: UNNI_GREETING,
                    createdAt: new Date(),
                },
            ]);
        }

        init();
    }, []);

    // 메시지 로드 시 업데이트
    useEffect(() => {
        if (getMessages.data && getMessages.data.length > 0) {
            setMessages([
                {
                    id: "greeting",
                    role: "assistant",
                    content: UNNI_GREETING,
                    createdAt: new Date(),
                },
                ...getMessages.data.map((m) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    createdAt: m.createdAt,
                })),
            ]);
        }
    }, [getMessages.data]);

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

        // 낙관적 업데이트 - 사용자 메시지 추가
        const tempUserMsg: Message = {
            id: `temp-${Date.now()}`,
            role: "user",
            content: userInput,
            createdAt: new Date(),
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        // 로딩 메시지 추가
        const loadingMsg: Message = {
            id: "loading",
            role: "assistant",
            content: "언니가 생각하고 있어요... 💭",
            createdAt: new Date(),
        };
        setMessages((prev) => [...prev, loadingMsg]);

        try {
            const result = await sendMessage.mutateAsync({
                conversationId,
                content: userInput,
            });

            // 로딩 메시지를 실제 응답으로 교체
            setMessages((prev) =>
                prev
                    .filter((m) => m.id !== "loading" && m.id !== tempUserMsg.id)
                    .concat([
                        {
                            id: result.userMessage.id,
                            role: "user",
                            content: result.userMessage.content,
                            createdAt: result.userMessage.createdAt,
                        },
                        {
                            id: result.assistantMessage.id,
                            role: "assistant",
                            content: result.assistantMessage.content,
                            createdAt: result.assistantMessage.createdAt,
                        },
                    ])
            );
        } catch {
            // 에러 시 로딩 메시지를 에러 메시지로 교체
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === "loading"
                        ? { ...m, id: "error", content: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요! 😢" }
                        : m
                )
            );
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-pink-900">
            {/* 헤더 */}
            <header className="flex items-center gap-3 px-4 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">언니</span>
                </div>
                <div>
                    <h1 className="text-white font-semibold">언니야</h1>
                    <p className="text-white/60 text-xs">연애 전문 상담사</p>
                </div>
            </header>

            {/* 채팅 영역 */}
            <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
                <div className="flex flex-col gap-4 pb-4">
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            role={message.role}
                            content={message.content}
                            createdAt={message.createdAt}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* 입력 영역 */}
            <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="고민을 이야기해주세요..."
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-pink-400 rounded-full px-4"
                        disabled={sendMessage.isPending}
                    />
                    <Button
                        type="submit"
                        disabled={!input.trim() || sendMessage.isPending}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full px-6 disabled:opacity-50"
                    >
                        {sendMessage.isPending ? "..." : "전송"}
                    </Button>
                </form>
                <p className="text-center text-white/40 text-[10px] mt-2">
                    AI 상담은 참고용이며, 전문 상담이 필요하면 전문가를 찾아주세요.
                </p>
            </div>
        </div>
    );
}
