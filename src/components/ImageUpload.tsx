"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploadProps {
    onUpload: (url: string) => void;
    className?: string;
}

export function ImageUpload({ onUpload, className }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            // 1. Presigned URL 요청
            const presignedFormData = new FormData();
            presignedFormData.append("mode", "presigned");
            presignedFormData.append("filename", file.name);
            presignedFormData.append("contentType", file.type);

            const presignedResponse = await fetch("/api/upload", {
                method: "POST",
                body: presignedFormData,
            });

            if (!presignedResponse.ok) {
                const data = await presignedResponse.json();
                throw new Error(data.error || "Presigned URL 발급 실패");
            }

            const { presignedUrl, publicUrl } = await presignedResponse.json();
            setUploadProgress(30);

            // 2. Presigned URL로 직접 R2에 업로드
            const uploadResponse = await fetch(presignedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error("R2 업로드 실패");
            }

            setUploadProgress(100);
            onUpload(publicUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "업로드 실패");
        } finally {
            setIsUploading(false);
        }
    }, [onUpload]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            uploadFile(file);
        } else {
            setError("이미지 파일만 업로드 가능합니다.");
        }
    }, [uploadFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    }, [uploadFile]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={className}>
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragging
                        ? "border-pink-500 bg-pink-500/10"
                        : "border-gray-600 hover:border-gray-500 bg-gray-800/50"
                    }
                    ${isUploading ? "pointer-events-none opacity-70" : ""}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="space-y-2">
                        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-gray-400">업로드 중...</p>
                        {uploadProgress > 0 && (
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-pink-500 h-2 rounded-full transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <svg
                            className="w-10 h-10 mx-auto text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="text-sm text-gray-400">
                            이미지를 드래그하거나 클릭하여 업로드
                        </p>
                        <p className="text-xs text-gray-500">
                            최대 5MB, JPG/PNG/GIF/WEBP
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
        </div>
    );
}
