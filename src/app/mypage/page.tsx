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
}

export default function MyPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
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

            // name 없으면 온보딩으로 리다이렉트
            if (!fetchedUser.name) {
                router.replace("/");
                return;
            }

            setUser(fetchedUser);
        }
        init();
    }, []);

    const handleProfileUpdate = async (data: {
        name: string;
        gender: "male" | "female";
        age: number;
    }) => {
        if (!user) return;

        await updateUserProfile.mutateAsync({
            userId: user.id,
            ...data,
        });

        // 업데이트된 정보로 상태 갱신
        setUser({
            ...user,
            name: data.name,
            gender: data.gender,
            age: data.age,
        });
        setShowEditModal(false);
    };

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

                            {/* 수정 버튼 */}
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="w-full mt-6 py-3 bg-black border border-[#E30A9E] text-white hover:bg-black active:bg-[#943576] rounded-xl font-medium"
                            >
                                프로필 수정
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </main>
            </div>

            {/* 프로필 수정 모달 (온보딩 모달 재사용) */}
            {showEditModal && (
                <EditProfileModal
                    currentData={{
                        name: user?.name || "",
                        gender: (user?.gender as "male" | "female") || "female",
                        age: user?.age || 20,
                    }}
                    onComplete={handleProfileUpdate}
                    onCancel={() => setShowEditModal(false)}
                />
            )}
        </div>
    );
}

// 프로필 수정 모달 컴포넌트
function EditProfileModal({
    currentData,
    onComplete,
    onCancel,
}: {
    currentData: { name: string; gender: "male" | "female"; age: number };
    onComplete: (data: { name: string; gender: "male" | "female"; age: number }) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState(currentData.name);
    const [gender, setGender] = useState<"male" | "female">(currentData.gender);
    const [age, setAge] = useState(currentData.age.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const ageNum = parseInt(age, 10);
        if (!name.trim() || ageNum <= 0 || ageNum > 120) return;

        setIsSubmitting(true);
        try {
            await onComplete({
                name: name.trim(),
                gender,
                age: ageNum,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm mx-4 bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-2xl p-6 border border-white/10 shadow-2xl">
                <h2 className="text-xl font-bold text-white text-center mb-6">
                    프로필 수정
                </h2>

                <div className="space-y-4">
                    {/* 이름 */}
                    <div>
                        <label className="block text-white/60 text-sm mb-2">이름</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="이름 또는 닉네임"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500"
                            autoFocus
                        />
                    </div>

                    {/* 성별 */}
                    <div>
                        <label className="block text-white/60 text-sm mb-2">성별</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setGender("male")}
                                className={`flex-1 py-3 rounded-xl border transition-all ${gender === "male"
                                    ? "bg-blue-500/30 border-blue-400 text-white"
                                    : "bg-white/10 border-white/20 text-white/60"
                                    }`}
                            >
                                🙋‍♂️ 남자
                            </button>
                            <button
                                type="button"
                                onClick={() => setGender("female")}
                                className={`flex-1 py-3 rounded-xl border transition-all ${gender === "female"
                                    ? "bg-pink-500/30 border-pink-400 text-white"
                                    : "bg-white/10 border-white/20 text-white/60"
                                    }`}
                            >
                                🙋‍♀️ 여자
                            </button>
                        </div>
                    </div>

                    {/* 나이 */}
                    <div>
                        <label className="block text-white/60 text-sm mb-2">만 나이</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="나이"
                            min="1"
                            max="120"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500 text-center"
                        />
                    </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-white/10 text-white/70 rounded-xl hover:bg-white/20"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
                        className="flex-1 py-3 bg-black border border-[#E30A9E] text-white hover:bg-black active:bg-[#943576] font-medium rounded-xl disabled:opacity-50"
                    >
                        {isSubmitting ? "저장 중..." : "저장"}
                    </button>
                </div>
            </div>
        </div>
    );
}
