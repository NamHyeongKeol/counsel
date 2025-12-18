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

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                <ConversationList
                    userId={userId}
                    onBack={() => router.push("/")}
                />
            </div>
        </div>
    );
}
