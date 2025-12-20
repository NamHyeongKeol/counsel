"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationList } from "@/components/ConversationList";
import { trpc } from "@/lib/trpc/client";

export default function ChatListPage() {
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
                    {/* 헤더 */}
                    <header className="flex items-center justify-center h-14 border-b border-white/10 shrink-0">
                        <h1 className="text-lg font-bold text-white">대화 목록</h1>
                    </header>
                    {/* 로딩 */}
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                <ConversationList
                    userId={userId}
                />
            </div>
        </div>
    );
}
