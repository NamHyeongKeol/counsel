"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    role: "user" | "assistant";
    content: string;
    createdAt?: Date;
}

export function MessageBubble({ role, content, createdAt }: MessageBubbleProps) {
    const isUser = role === "user";

    return (
        <div
            className={cn(
                "flex gap-3 max-w-full",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            {!isUser && (
                <Avatar className="h-10 w-10 shrink-0 bg-gradient-to-br from-pink-400 to-purple-500">
                    <AvatarFallback className="bg-transparent text-white text-sm font-bold">
                        언니
                    </AvatarFallback>
                </Avatar>
            )}
            <div
                className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%] break-words",
                    isUser
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-tr-sm"
                        : "bg-white/10 backdrop-blur-sm text-white rounded-tl-sm border border-white/10"
                )}
            >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                {createdAt && (
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
        </div>
    );
}
