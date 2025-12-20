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

      // 기존 유저는 /explore 페이지로 이동
      router.replace("/explore");
    }
    init();
  }, []);

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
    router.replace("/explore");
  };

  return (
    <div className="fixed inset-0 bg-black">
      <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
        {showOnboarding ? (
          <OnboardingModal onComplete={handleOnboardingComplete} />
        ) : (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
