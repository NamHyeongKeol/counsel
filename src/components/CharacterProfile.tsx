"use client";

import { useState, useEffect, useRef } from "react";
import { CharacterDetailContent } from "./CharacterDetailContent";

interface CharacterProfileProps {
    characterId: string;
    userId?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CharacterProfile({ characterId, userId, isOpen, onClose }: CharacterProfileProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    // 열림/닫힘 애니메이션 제어
    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // 다음 프레임에서 애니메이션 시작
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
            // 애니메이션 완료 후 언마운트
            const timer = setTimeout(() => {
                setIsAnimating(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // 스와이프 핸들러
    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        currentY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;
        if (diff > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${diff}px)`;
        }
    };

    const handleTouchEnd = () => {
        const diff = currentY.current - startY.current;
        if (sheetRef.current) {
            sheetRef.current.style.transform = "";
        }
        // 100px 이상 아래로 스와이프하면 닫기
        if (diff > 100) {
            onClose();
        }
    };

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    // 애니메이션 중이거나 열려있지 않으면 렌더링 안함
    if (!isOpen && !isAnimating) return null;

    return (
        <div className="fixed inset-0 z-[60]">
            {/* 백드롭 */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"
                    }`}
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className={`absolute bottom-12 inset-x-0 mx-auto w-full max-w-[390px] h-[calc(90vh-48px)] bg-black border border-white/10 rounded-t-3xl overflow-hidden flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? "translate-y-0" : "translate-y-full"
                    }`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* 닫기 핸들 */}
                <div className="flex justify-center py-3 flex-shrink-0">
                    <div className="w-10 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white z-10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 콘텐츠 - CharacterDetailContent 사용 */}
                <CharacterDetailContent
                    characterId={characterId}
                    userId={userId}
                    isBottomSheet={true}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}
