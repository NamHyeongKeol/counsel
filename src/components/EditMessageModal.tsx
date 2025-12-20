"use client";

import { useState, useEffect } from "react";

interface EditMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string) => void;
    currentContent: string;
}

export function EditMessageModal({ isOpen, onClose, onSubmit, currentContent }: EditMessageModalProps) {
    const [content, setContent] = useState(currentContent);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // currentContent가 변경될 때마다 content 동기화
    useEffect(() => {
        setContent(currentContent);
    }, [currentContent]);

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
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(content.trim());
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
                    <h3 className="text-white font-semibold text-sm">메시지 수정</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="input-default h-56 resize-none"
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
                            disabled={!content.trim() || isSubmitting}
                            className="btn-primary flex-1"
                        >
                            {isSubmitting ? "저장 중..." : "저장"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

