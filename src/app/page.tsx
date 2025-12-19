"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { OnboardingModal } from "@/components/OnboardingModal";

interface User {
  id: string;
  name: string | null;
  gender: string | null;
  age: number | null;
  email?: string | null;
  nickname?: string | null;
}

export default function Home() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const getOrCreateUser = trpc.getOrCreateUser.useMutation();
  const updateUserProfile = trpc.updateUserProfile.useMutation();
  const createConversation = trpc.createConversation.useMutation();
  const utils = trpc.useUtils();

  // 첫 번째 활성 캐릭터 가져오기
  const getActiveCharacters = trpc.getActiveCharacters.useQuery();
  const defaultCharacter = getActiveCharacters.data?.[0];

  useEffect(() => {
    async function init() {
      let visitorId = localStorage.getItem("unni-visitor-id");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("unni-visitor-id", visitorId);
      }

      const fetchedUser = await getOrCreateUser.mutateAsync({ visitorId }) as unknown as User;
      setUser(fetchedUser);

      // 신규 유저 (name이 없으면) 온보딩 모달 표시
      if (!fetchedUser.name) {
        setShowOnboarding(true);
        return;
      }

      // 기존 유저는 바로 대화 페이지로 이동
      await navigateToChat(fetchedUser.id);
    }
    init();
  }, []);

  const navigateToChat = async (userId: string) => {
    const conversations = await utils.getConversations.fetch({ userId });

    if (conversations.length > 0) {
      router.replace(`/chat/${conversations[0].id}`);
    } else {
      // 기본 캐릭터 ID 전달
      const conversation = await createConversation.mutateAsync({
        userId,
        characterId: defaultCharacter?.id,
      });
      router.replace(`/chat/${conversation.id}`);
    }
  };

  const handleOnboardingComplete = async (data: {
    name: string;
    gender: "male" | "female";
    age: number;
  }) => {
    if (!user) return;

    await updateUserProfile.mutateAsync({
      userId: user.id,
      ...data,
    });

    setShowOnboarding(false);
    await navigateToChat(user.id);
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {showOnboarding ? (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      ) : (
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  );
}
