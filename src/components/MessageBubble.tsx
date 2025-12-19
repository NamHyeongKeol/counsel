"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AI_MODELS, CURRENT_EXCHANGE_RATE } from "@/lib/ai/constants";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MessageBubbleProps {
    role: "user" | "assistant";
    content: string;
    createdAt?: Date;
    isLoading?: boolean;
    model?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cost?: number | null;
    selectMode?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    onDelete?: () => void;
    canDelete?: boolean;
    onAvatarClick?: () => void;
    characterImage?: string | null;
    characterName?: string;
    // 새로운 액션 버튼용 props
    isLastAssistantMessage?: boolean;
    onReroll?: () => void;
    onLike?: () => void;
    onDislike?: () => void;
    onFeedback?: () => void;
    onEdit?: () => void;
    isLiked?: boolean;
    isDisliked?: boolean;
}

// 통통 튀는 로딩 애니메이션 컴포넌트
function LoadingDots() {
    return (
        <span className="inline-flex items-center gap-1">
            언니가 생각하고 있어요
            <span className="inline-flex gap-1 ml-1">
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
            </span>
        </span>
    );
}

export function MessageBubble({
    role,
    content,
    createdAt,
    isLoading,
    model,
    inputTokens,
    outputTokens,
    cost,
    selectMode,
    isSelected,
    onSelect,
    onDelete,
    canDelete,
    onAvatarClick,
    characterImage,
    characterName = "언니",
    isLastAssistantMessage,
    onReroll,
    onLike,
    onDislike,
    onFeedback,
    onEdit,
    isLiked,
    isDisliked,
}: MessageBubbleProps) {
    const isUser = role === "user";

    // 표시용 짧은 모델명 가져오기
    const displayModelName = model && AI_MODELS[model as keyof typeof AI_MODELS]
        ? AI_MODELS[model as keyof typeof AI_MODELS].shortName
        : model;

    const handleClick = () => {
        if (selectMode && onSelect) {
            onSelect();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.();
    };

    return (
        <div
            className={cn(
                "flex gap-2 max-w-full",
                isUser ? "flex-row-reverse" : "flex-row",
                selectMode && "cursor-pointer"
            )}
            onClick={handleClick}
        >
            {/* 선택 모드: 체크박스 (항상 왼쪽) */}
            {selectMode && (
                <div className="flex items-center shrink-0 pt-1">
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                            ? "bg-pink-500 border-pink-500"
                            : "border-white/40 hover:border-white/60"
                    )}>
                        {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </div>
            )}

            {/* 메시지 버블 */}
            <div
                className={cn(
                    "rounded-2xl px-4 py-3 break-words max-w-[85%]",
                    isUser
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-tr-sm"
                        : "bg-white/10 backdrop-blur-sm text-white rounded-tl-sm border border-white/10",
                    isSelected && "ring-2 ring-pink-400"
                )}
            >
                {isLoading ? (
                    <p className="text-sm leading-relaxed">
                        <LoadingDots />
                    </p>
                ) : (
                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-strong:text-pink-300 prose-em:text-purple-300 prose-a:text-blue-400 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-300">
                        <ReactMarkdown
                            remarkPlugins={[remarkBreaks]}
                            components={{
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {children}
                                    </a>
                                ),
                                p: ({ children }) => <p>{children}</p>,
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
                {createdAt && !isLoading && (
                    <>
                        <div className="flex items-center justify-end gap-2 mt-1 flex-wrap">
                            {/* Assistant 메시지만 모델명, 토큰, 비용 표시 */}
                            {!isUser && model && (
                                <span className="text-[10px] text-white/40 flex gap-1 items-center">
                                    <span>{displayModelName}</span>
                                    {inputTokens != null && outputTokens != null && (
                                        <span>· {inputTokens}/{outputTokens}</span>
                                    )}
                                    {cost != null && (
                                        <span className="text-pink-400/60 font-medium">
                                            · ${cost.toFixed(4)}
                                            <span className="ml-1 text-[9px] opacity-70">
                                                (약 {Math.round(cost * CURRENT_EXCHANGE_RATE)}원)
                                            </span>
                                        </span>
                                    )}
                                </span>
                            )}
                            <span className={cn(
                                "text-[10px]",
                                isUser ? "text-white/70" : "text-white/50"
                            )}>
                                {new Date(createdAt).toLocaleTimeString("ko-KR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                        {/* 액션 버튼 줄 */}
                        {!selectMode && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                                {/* 리롤 - assistant 메시지의 마지막 메시지에만 표시 */}
                                {!isUser && isLastAssistantMessage && onReroll && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReroll(); }}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                                        title="다시 생성"
                                    >
                                        <svg className="w-4 h-4 text-white/40 group-hover:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                )}
                                {/* 좋아요 - 따봉 (엄지 올림) */}
                                {onLike && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onLike(); }}
                                        className={cn(
                                            "p-2 rounded-lg hover:bg-white/10 transition-colors group",
                                            isLiked && "bg-green-500/20"
                                        )}
                                        title="좋아요"
                                    >
                                        <svg className={cn(
                                            "w-4 h-4 transition-colors",
                                            isLiked ? "text-green-400" : "text-white/40 group-hover:text-white/70"
                                        )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                    </button>
                                )}
                                {/* 싫어요 */}
                                {onDislike && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDislike(); }}
                                        className={cn(
                                            "p-2 rounded-lg hover:bg-white/10 transition-colors group",
                                            isDisliked && "bg-gray-500/20"
                                        )}
                                        title="싫어요"
                                    >
                                        <svg className={cn(
                                            "w-4 h-4 transition-colors",
                                            isDisliked ? "text-gray-400" : "text-white/40 group-hover:text-white/70"
                                        )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                        </svg>
                                    </button>
                                )}
                                {/* 피드백/신고 - 깃발 아이콘 */}
                                {onFeedback && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onFeedback(); }}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                                        title="피드백"
                                    >
                                        <svg className="w-4 h-4 text-white/40 group-hover:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                        </svg>
                                    </button>
                                )}
                                {/* 수정 - 연필 아이콘 */}
                                {onEdit && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                                        title="수정"
                                    >
                                        <svg className="w-4 h-4 text-white/40 group-hover:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                )}
                                {/* 삭제 */}
                                {canDelete && onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                                        title="삭제"
                                    >
                                        <svg className="w-4 h-4 text-white/40 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
