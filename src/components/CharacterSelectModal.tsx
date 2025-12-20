"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    images: { id: string; imageUrl: string }[];
}

interface CharacterSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (characterId: string) => void;
    userId: string;
}

export function CharacterSelectModal({ isOpen, onClose, onSelect, userId }: CharacterSelectModalProps) {
    const getPublicCharacters = trpc.getPublicCharacters.useQuery();
    const characters = getPublicCharacters.data || [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-[360px] max-h-[80vh] bg-black rounded-2xl overflow-hidden flex flex-col border border-white/10">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white">채팅방 생성하기</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/70 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 상담사 목록 */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {getPublicCharacters.isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : characters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-white/50">
                                <p>아직 공개된 상담사가 없어요</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {characters.map((character: Character) => (
                                    <button
                                        key={character.id}
                                        onClick={() => onSelect(character.id)}
                                        className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-pink-500/50 transition-colors text-left"
                                    >
                                        {/* 프로필 이미지 */}
                                        {character.images[0] ? (
                                            <div className="aspect-square">
                                                <img
                                                    src={character.images[0].imageUrl}
                                                    alt={character.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-square bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                                                <span className="text-3xl font-bold text-white">
                                                    {character.name[0]}
                                                </span>
                                            </div>
                                        )}

                                        {/* 정보 */}
                                        <div className="p-2">
                                            <h3 className="text-white font-bold text-sm truncate">
                                                {character.name}
                                            </h3>
                                            {character.tagline && (
                                                <p className="text-white/50 text-xs truncate mt-0.5">
                                                    {character.tagline}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
