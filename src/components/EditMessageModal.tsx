"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-semibold">메시지 수정</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-72 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-400 resize-none"
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
                            disabled={!content.trim() || isSubmitting}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                        >
                            {isSubmitting ? "저장 중..." : "저장"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
