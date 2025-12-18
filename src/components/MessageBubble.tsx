"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
    canDelete
}: MessageBubbleProps) {
    const isUser = role === "user";

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

            {/* 아바타 (AI 메시지만, 선택 모드 아닐 때) */}
            {!isUser && !selectMode && (
                <Avatar className="h-10 w-10 shrink-0 bg-gradient-to-br from-pink-400 to-purple-500">
                    <AvatarFallback className="bg-transparent text-white text-sm font-bold">
                        언니
                    </AvatarFallback>
                </Avatar>
            )}

            {/* 메시지 버블 */}
            <div
                className={cn(
                    "rounded-2xl px-4 py-3 break-words max-w-[80%]",
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                )}
                {createdAt && !isLoading && (
                    <div className="flex items-center justify-end gap-2 mt-1 flex-wrap">
                        {/* Assistant 메시지만 모델명, 토큰, 비용 표시 */}
                        {!isUser && model && (
                            <span className="text-[10px] text-white/40 flex gap-1 items-center">
                                <span>{model}</span>
                                {inputTokens != null && outputTokens != null && (
                                    <span>· {inputTokens}/{outputTokens}</span>
                                )}
                                {cost != null && (
                                    <span className="text-pink-400/60 font-medium">· ${cost.toFixed(4)}</span>
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
                        {!selectMode && canDelete && (
                            <button
                                onClick={handleDelete}
                                className={cn(
                                    "text-[10px] hover:text-red-400 transition-colors",
                                    isUser ? "text-white/50" : "text-white/40"
                                )}
                                title="삭제"
                            >
                                삭제
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
