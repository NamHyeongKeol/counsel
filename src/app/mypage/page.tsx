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
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            {/* 프로필 아바타 */}
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mb-2">
                                    <span className="text-xl">
                                        {user.gender === "male" ? "🙋‍♂️" : "🙋‍♀️"}
                                    </span>
                                </div>
                                <h2 className="text-base font-semibold text-white">
                                    {user.name || "이름 없음"}
                                </h2>
                            </div>

                            {/* 정보 */}
                            <div className="space-y-0">
                                <div className="flex justify-between py-2.5 border-b border-white/5">
                                    <span className="text-white/50 text-sm">성별</span>
                                    <span className="text-white text-sm">{getGenderText(user.gender)}</span>
                                </div>
                                <div className="flex justify-between py-2.5">
                                    <span className="text-white/50 text-sm">나이</span>
                                    <span className="text-white text-sm">
                                        {user.age ? `만 ${user.age}세` : "-"}
                                    </span>
                                </div>
                            </div>

                            {/* 수정 버튼 */}
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="w-full mt-4 py-2.5 bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 rounded-lg"
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-[360px] mx-4 bg-black rounded-2xl border border-white/10 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 닫기 버튼 */}
                <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 text-white/50 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 헤더 */}
                <div className="px-4 pt-4 pb-3">
                    <h2 className="text-base font-semibold text-white">내 계정 수정하기</h2>
                </div>

                <div className="px-4 pb-5 space-y-4">
                    {/* 닉네임 */}
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5">닉네임</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="닉네임"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand"
                            autoFocus
                        />
                    </div>

                    {/* 성별 */}
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5">성별</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setGender("male")}
                                className={`flex-1 py-2.5 rounded-lg border text-sm transition-all ${gender === "male"
                                    ? "bg-white/10 border-white/30 text-white"
                                    : "bg-transparent border-white/10 text-white/50"
                                    }`}
                            >
                                남성
                            </button>
                            <button
                                type="button"
                                onClick={() => setGender("female")}
                                className={`flex-1 py-2.5 rounded-lg border text-sm transition-all ${gender === "female"
                                    ? "bg-white/10 border-white/30 text-white"
                                    : "bg-transparent border-white/10 text-white/50"
                                    }`}
                            >
                                여성
                            </button>
                            <button
                                type="button"
                                disabled
                                className="flex-1 py-2.5 rounded-lg border text-sm bg-transparent border-white/10 text-white/30 cursor-not-allowed"
                            >
                                기타
                            </button>
                        </div>
                    </div>

                    {/* 나이 */}
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5">만 나이</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="나이"
                            min="1"
                            max="120"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand"
                        />
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/70 text-sm rounded-lg hover:bg-white/10"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 py-2.5 bg-black border border-brand text-brand text-sm font-medium rounded-lg hover:bg-brand/10 disabled:opacity-50"
                        >
                            {isSubmitting ? "저장 중..." : "저장하기"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
