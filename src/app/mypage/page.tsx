"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface User {
    id: string;
    name: string | null;
    gender: string | null;
    age: number | null;
}

export default function MyPage() {
    const [user, setUser] = useState<User | null>(null);
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();

    useEffect(() => {
        async function init() {
            let visitorId = localStorage.getItem("unni-visitor-id");
            if (!visitorId) {
                visitorId = crypto.randomUUID();
                localStorage.setItem("unni-visitor-id", visitorId);
            }
            const fetchedUser = await getOrCreateUser.mutateAsync({ visitorId }) as unknown as User;
            setUser(fetchedUser);
        }
        init();
    }, []);

    const getGenderText = (gender: string | null) => {
        if (gender === "male") return "남자";
        if (gender === "female") return "여자";
        return "-";
    };

    return (
        <div className="fixed inset-0 bg-black">
            <div className="flex flex-col h-full w-full max-w-[390px] mx-auto">
                {/* 헤더 */}
                <header className="flex items-center justify-center h-14 border-b border-white/10 shrink-0">
                    <h1 className="text-lg font-bold text-white">마이페이지</h1>
                </header>

                {/* 컨텐츠 */}
                <main className="flex-1 overflow-y-auto pb-20 p-4">
                    {user ? (
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            {/* 프로필 아바타 */}
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mb-3">
                                    <span className="text-3xl">
                                        {user.gender === "male" ? "🙋‍♂️" : "🙋‍♀️"}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-white">
                                    {user.name || "이름 없음"}
                                </h2>
                            </div>

                            {/* 정보 */}
                            <div className="space-y-3">
                                <div className="flex justify-between py-3 border-b border-white/10">
                                    <span className="text-white/60">성별</span>
                                    <span className="text-white">{getGenderText(user.gender)}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-white/10">
                                    <span className="text-white/60">나이</span>
                                    <span className="text-white">
                                        {user.age ? `만 ${user.age}세` : "-"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
