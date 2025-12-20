"use client";

import { useState } from "react";

interface OnboardingModalProps {
    onComplete: (data: { name: string; gender: "male" | "female"; age: number }) => void;
}

type Step = "name" | "gender" | "age";

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const [step, setStep] = useState<Step>("name");
    const [name, setName] = useState("");
    const [gender, setGender] = useState<"male" | "female" | null>(null);
    const [age, setAge] = useState("");
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goToNextStep = (nextStep: Step) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setStep(nextStep);
            setIsTransitioning(false);
        }, 200);
    };

    const handleNameSubmit = () => {
        if (name.trim()) {
            goToNextStep("gender");
        }
    };

    const handleGenderSelect = (selectedGender: "male" | "female") => {
        setGender(selectedGender);
        goToNextStep("age");
    };

    const handleAgeSubmit = () => {
        const ageNum = parseInt(age, 10);
        if (ageNum > 0 && ageNum < 120 && gender) {
            onComplete({
                name: name.trim(),
                gender,
                age: ageNum,
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm mx-4 bg-black/95 rounded-2xl p-6 border border-white/10 shadow-2xl">
                {/* Progress indicator */}
                <div className="flex gap-2 mb-6">
                    {["name", "gender", "age"].map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= ["name", "gender", "age"].indexOf(step)
                                ? "bg-pink-500"
                                : "bg-white/20"
                                }`}
                        />
                    ))}
                </div>

                <div
                    className={`transition-all duration-200 ${isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
                        }`}
                >
                    {/* Step 1: Name */}
                    {step === "name" && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="text-4xl mb-3">👋</div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    반가워요!
                                </h2>
                                <p className="text-white/60 text-sm">
                                    뭐라고 불러드릴까요?
                                </p>
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="이름 또는 닉네임"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500 transition-colors"
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                            />
                            <button
                                onClick={handleNameSubmit}
                                disabled={!name.trim()}
                                className="w-full py-3 bg-brand text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* Step 2: Gender */}
                    {step === "gender" && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="text-4xl mb-3">✨</div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    {name}님, 성별이 어떻게 되세요?
                                </h2>
                                <p className="text-white/60 text-sm">
                                    맞춤 상담을 위해 알려주세요
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleGenderSelect("male")}
                                    className="flex-1 py-6 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-blue-500/30 hover:border-blue-400 transition-all"
                                >
                                    <div className="text-3xl mb-2">🙋‍♂️</div>
                                    <div className="font-medium">남자</div>
                                </button>
                                <button
                                    onClick={() => handleGenderSelect("female")}
                                    className="flex-1 py-6 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-pink-500/30 hover:border-pink-400 transition-all"
                                >
                                    <div className="text-3xl mb-2">🙋‍♀️</div>
                                    <div className="font-medium">여자</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Age */}
                    {step === "age" && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="text-4xl mb-3">🎂</div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    만 나이가 어떻게 되세요?
                                </h2>
                                <p className="text-white/60 text-sm">
                                    연령대에 맞는 상담을 해드릴게요
                                </p>
                            </div>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="나이 입력"
                                min="1"
                                max="120"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500 transition-colors text-center text-2xl"
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && handleAgeSubmit()}
                            />
                            <button
                                onClick={handleAgeSubmit}
                                disabled={!age || parseInt(age, 10) <= 0}
                                className="w-full py-3 bg-brand text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                            >
                                시작하기 🚀
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
