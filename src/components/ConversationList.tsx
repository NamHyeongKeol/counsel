import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CharacterSelectModal } from "@/components/CharacterSelectModal";
import ReactMarkdown from "react-markdown";

interface Conversation {
    id: string;
    title: string | null;
    updatedAt: Date;
    messages?: { content: string }[];
    character?: {
        id: string;
        name: string;
        images?: { imageUrl: string }[];
    } | null;
}

interface ConversationListProps {
    userId: string;
    currentConversationId?: string | null;
    onSelectConversation?: (id: string) => void;
}

export function ConversationList({
    userId,
    currentConversationId,
    onSelectConversation,
}: ConversationListProps) {
    const router = useRouter();
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [showCharacterSelect, setShowCharacterSelect] = useState(false);

    // useMutation 대신 useQuery 사용
    const getConversations = trpc.getConversations.useQuery(
        { userId: userId || "" },
        { enabled: !!userId }
    );

    // 로컬 state 대신 query data 사용
    const conversations = getConversations.data || [];

    const createConversation = trpc.createConversation.useMutation();
    const deleteConversation = trpc.deleteConversation.useMutation();

    const handleNewConversation = () => {
        setShowCharacterSelect(true);
    };

    const handleCharacterSelect = async (characterId: string) => {
        if (!userId) return;

        setShowCharacterSelect(false);

        const conversation = await createConversation.mutateAsync({
            userId,
            characterId,
        });

        // 목록 새로고침
        await getConversations.refetch();

        if (onSelectConversation) {
            onSelectConversation(conversation.id);
        } else {
            router.push(`/chat/${conversation.id}`);
        }
    };

    const requestDelete = (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        setDeleteTarget(conversationId);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        await deleteConversation.mutateAsync({ conversationId: deleteTarget });

        // 목록 새로고침 및 데이터 가져오기
        const { data: updatedConversations } = await getConversations.refetch();

        // 현재 대화방이 삭제된 경우
        if (currentConversationId === deleteTarget) {
            const remaining = updatedConversations?.filter(c => c.id !== deleteTarget) || [];
            if (remaining.length > 0) {
                if (onSelectConversation) {
                    onSelectConversation(remaining[0].id);
                } else {
                    router.push(`/chat/${remaining[0].id}`);
                }
            } else {
                router.push("/chat");
            }
        }
        setDeleteTarget(null);
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
        });
    };

    const getPreview = (conv: any) => {
        if (conv.messages && conv.messages.length > 0) {
            const content = conv.messages[0].content;
            return content.length > 60 ? content.slice(0, 60) + "..." : content;
        }
        return "대화를 시작해보세요";
    };

    return (
        <div className="flex flex-col h-full bg-black">
            {/* 헤더 */}
            <header className="relative flex items-center justify-center h-14 border-b border-white/10 shrink-0">
                <h1 className="text-lg font-bold text-white">대화 목록</h1>
                <button
                    onClick={handleNewConversation}
                    className="absolute right-4 p-2 text-white/70 hover:text-white"
                    disabled={createConversation.isPending}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </header>

            {/* 대화 목록 */}
            <div className="flex-1 overflow-y-auto pb-20">
                {getConversations.isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                        <p className="mb-4">대화가 없어요</p>
                        <button
                            onClick={handleNewConversation}
                            className="px-4 py-2 bg-black border border-brand text-brand hover:bg-brand/10 rounded-lg text-sm"
                        >
                            + 새 대화 시작
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => onSelectConversation ? onSelectConversation(conv.id) : router.push(`/chat/${conv.id}`)}
                                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${conv.id === currentConversationId
                                    ? "bg-white/10"
                                    : "hover:bg-white/5"
                                    }`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* 캐릭터 아바타 */}
                                    {conv.character?.images?.[0] ? (
                                        <img
                                            src={conv.character.images[0].imageUrl}
                                            alt={conv.character.name}
                                            className="w-11 h-11 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0">
                                            <span className="text-white text-xs font-bold">
                                                {conv.character?.name?.[0] || "언"}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white text-sm font-medium truncate prose prose-invert prose-sm max-w-none prose-strong:text-pink-300 prose-p:inline">
                                            {conv.character?.name || "언니"}
                                            {conv.title && (
                                                <>
                                                    <span className="text-white/50"> · </span>
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => <span>{children}</span>,
                                                        }}
                                                    >
                                                        {conv.title}
                                                    </ReactMarkdown>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-white/50 text-xs line-clamp-2">
                                            {getPreview(conv)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                    <span className="text-white/40 text-[10px] whitespace-nowrap">
                                        {formatDate(conv.updatedAt)}
                                    </span>
                                    <button
                                        onClick={(e) => requestDelete(e, conv.id)}
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

            {/* 삭제 확인 모달 */}
            <ConfirmModal
                isOpen={deleteTarget !== null}
                message="이 대화방을 삭제하시겠습니까?"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmText="삭제"
                danger
            />

            {/* 캐릭터 선택 모달 */}
            <CharacterSelectModal
                isOpen={showCharacterSelect}
                onClose={() => setShowCharacterSelect(false)}
                onSelect={handleCharacterSelect}
                userId={userId}
            />
        </div>
    );
}
