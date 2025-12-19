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
