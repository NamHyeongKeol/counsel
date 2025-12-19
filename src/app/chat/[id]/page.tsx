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
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return <ChatInterface conversationId={conversationId} userId={userId} />;
}
