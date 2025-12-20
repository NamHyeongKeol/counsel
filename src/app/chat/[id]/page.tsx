"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/ChatInterface";
import { trpc } from "@/lib/trpc/client";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: conversationId } = use(params);
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();

    useEffect(() => {
        async function init() {
            let visitorId = localStorage.getItem("unni-visitor-id");
            if (!visitorId) {
                visitorId = crypto.randomUUID();
                localStorage.setItem("unni-visitor-id", visitorId);
            }
            const user = await getOrCreateUser.mutateAsync({ visitorId });

            // name 없으면 온보딩으로 리다이렉트
            if (!user.name) {
                router.replace("/");
                return;
            }

            setUserId(user.id);
        }
        init();
    }, []);

    if (!userId) {
        return (
            <div className="fixed inset-0 bg-black">
                <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                    {/* 헤더 스켈레톤 */}
                    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-md border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-1 w-8 h-8" />
                            <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
                        </div>
                    </header>
                    {/* 로딩 */}
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return <ChatInterface conversationId={conversationId} userId={userId} />;
}
