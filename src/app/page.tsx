"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { UNNI_GREETING } from "@/lib/prompts/unni";

export default function Home() {
  const router = useRouter();
  const getOrCreateUser = trpc.getOrCreateUser.useMutation();
  const getConversations = trpc.getConversations.useMutation();
  const createConversation = trpc.createConversation.useMutation();

  useEffect(() => {
    async function init() {
      let visitorId = localStorage.getItem("unni-visitor-id");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("unni-visitor-id", visitorId);
      }

      const user = await getOrCreateUser.mutateAsync({ visitorId });
      const conversations = await getConversations.mutateAsync({ userId: user.id });

      if (conversations.length > 0) {
        // 기존 대화가 있으면 최신 대화로 이동
        router.replace(`/chat/${conversations[0].id}`);
      } else {
        // 대화가 없으면 새로 생성 후 이동
        const conversation = await createConversation.mutateAsync({
          userId: user.id,
          greeting: UNNI_GREETING,
        });
        router.replace(`/chat/${conversation.id}`);
      }
    }
    init();
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

