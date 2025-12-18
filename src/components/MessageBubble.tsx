"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    role: "user" | "assistant";
    content: string;
    createdAt?: Date;
    isLoading?: boolean;
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
    selectMode,
    isSelected,
    onSelect,
    onDelete,
    canDelete
}: MessageBubbleProps) {
    const isUser = role === "user";
    const [showDelete, setShowDelete] = useState(false);

    const handleClick = () => {
        if (selectMode && onSelect) {
            onSelect();
        }
    };

    const handleLongPress = () => {
        if (canDelete && !selectMode) {
            setShowDelete(!showDelete);
        }
    };

    return (
        <div
            className={cn(
                "flex gap-3 max-w-full relative",
                isUser ? "flex-row-reverse" : "flex-row",
                selectMode && "cursor-pointer"
            )}
            onClick={handleClick}
            onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
        >
            {/* 선택 모드 체크박스 */}
            {selectMode && (
                <div className="flex items-center shrink-0">
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

            {!isUser && !selectMode && (
                <Avatar className="h-10 w-10 shrink-0 bg-gradient-to-br from-pink-400 to-purple-500">
                    <AvatarFallback className="bg-transparent text-white text-sm font-bold">
                        언니
                    </AvatarFallback>
                </Avatar>
            )}

            <div className="relative group">
                <div
                    className={cn(
                        "rounded-2xl px-4 py-3 max-w-[80%] break-words",
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
                        <p className={cn(
                            "text-[10px] mt-1",
                            isUser ? "text-white/70 text-right" : "text-white/50"
                        )}>
                            {new Date(createdAt).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    )}
                </div>

                {/* 삭제 버튼 (우클릭 시 표시) */}
                {showDelete && canDelete && !selectMode && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("이 메시지를 삭제하시겠습니까?")) {
                                onDelete?.();
                            }
                            setShowDelete(false);
                        }}
                        className={cn(
                            "absolute top-0 px-2 py-1 bg-red-500 text-white text-xs rounded shadow-lg z-10",
                            isUser ? "left-0 -translate-x-full mr-2" : "right-0 translate-x-full ml-2"
                        )}
                    >
                        삭제
                    </button>
                )}
            </div>
        </div>
    );
}
