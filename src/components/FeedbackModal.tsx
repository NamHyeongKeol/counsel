"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback: string) => void;
    existingFeedback?: string | null;
}

export function FeedbackModal({ isOpen, onClose, onSubmit, existingFeedback }: FeedbackModalProps) {
    const [feedback, setFeedback] = useState(existingFeedback || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(feedback.trim());
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-semibold">피드백 보내기</h3>
                    <p className="text-white/50 text-xs mt-1">이 응답에 대한 의견을 남겨주세요</p>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="이 응답이 왜 문제가 있는지 알려주세요..."
                        className="w-full h-64 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-400 resize-none"
                        autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            disabled={!feedback.trim() || isSubmitting}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                        >
                            {isSubmitting ? "전송 중..." : "보내기"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
