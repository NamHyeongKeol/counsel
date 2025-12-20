"use client";

import { useState, useEffect } from "react";

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-black rounded-2xl border border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-semibold text-sm">피드백 보내기</h3>
                    <p className="text-white/50 text-xs mt-0.5">이 응답에 대한 의견을 남겨주세요</p>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="이 응답이 왜 문제가 있는지 알려주세요..."
                        className="input-default h-48 resize-none"
                        autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-cancel flex-1"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={!feedback.trim() || isSubmitting}
                            className="btn-primary flex-1"
                        >
                            {isSubmitting ? "전송 중..." : "보내기"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
