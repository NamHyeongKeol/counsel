"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

interface Prompt {
    id: string;
    key: string;
    locale: string;
    intimacyLevel: number | null;
    content: string;
    description: string | null;
    version: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default function AdminPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPrompt, setNewPrompt] = useState({
        key: "",
        content: "",
        locale: "ko",
        intimacyLevel: null as number | null,
        description: "",
    });

    const getPrompts = trpc.getPrompts.useQuery();
    const createPrompt = trpc.createPrompt.useMutation();
    const updatePrompt = trpc.updatePrompt.useMutation();

    useEffect(() => {
        if (getPrompts.data) {
            setPrompts(getPrompts.data);
        }
    }, [getPrompts.data]);

    const handleEdit = (prompt: Prompt) => {
        setEditingId(prompt.id);
        setEditContent(prompt.content);
        setEditDescription(prompt.description || "");
    };

    const handleSave = async () => {
        if (!editingId) return;
        await updatePrompt.mutateAsync({
            id: editingId,
            content: editContent,
            description: editDescription || null,
        });
        setEditingId(null);
        getPrompts.refetch();
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditContent("");
        setEditDescription("");
    };

    const handleToggleActive = async (prompt: Prompt) => {
        await updatePrompt.mutateAsync({
            id: prompt.id,
            isActive: !prompt.isActive,
        });
        getPrompts.refetch();
    };

    const handleAddPrompt = async () => {
        if (!newPrompt.key || !newPrompt.content) {
            alert("Key와 Content는 필수입니다.");
            return;
        }
        await createPrompt.mutateAsync({
            key: newPrompt.key,
            content: newPrompt.content,
            locale: newPrompt.locale,
            intimacyLevel: newPrompt.intimacyLevel,
            description: newPrompt.description || null,
        });
        setNewPrompt({
            key: "",
            content: "",
            locale: "ko",
            intimacyLevel: null,
            description: "",
        });
        setShowAddForm(false);
        getPrompts.refetch();
    };

    const getPromptLabel = (prompt: Prompt) => {
        let label = prompt.key;
        if (prompt.intimacyLevel !== null) {
            label += ` (Lv.${prompt.intimacyLevel})`;
        }
        if (prompt.locale !== "ko") {
            label += ` [${prompt.locale}]`;
        }
        return label;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">🔧 프롬프트 관리</h1>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium"
                    >
                        {showAddForm ? "취소" : "+ 새 프롬프트"}
                    </button>
                </header>

                {/* 새 프롬프트 추가 폼 */}
                {showAddForm && (
                    <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                        <h2 className="text-lg font-semibold mb-4">새 프롬프트 추가</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Key *</label>
                                    <select
                                        value={newPrompt.key}
                                        onChange={(e) => setNewPrompt({ ...newPrompt, key: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">선택...</option>
                                        <option value="system">system</option>
                                        <option value="greeting">greeting</option>
                                        <option value="intimacy_modifier">intimacy_modifier</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Locale</label>
                                    <input
                                        type="text"
                                        value={newPrompt.locale}
                                        onChange={(e) => setNewPrompt({ ...newPrompt, locale: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Intimacy Level</label>
                                    <select
                                        value={newPrompt.intimacyLevel ?? ""}
                                        onChange={(e) => setNewPrompt({
                                            ...newPrompt,
                                            intimacyLevel: e.target.value ? parseInt(e.target.value) : null
                                        })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">공통</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newPrompt.description}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                                    placeholder="프롬프트 설명 (관리용)"
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Content *</label>
                                <textarea
                                    value={newPrompt.content}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                                    rows={8}
                                    placeholder="프롬프트 내용..."
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none"
                                />
                            </div>
                            <button
                                onClick={handleAddPrompt}
                                disabled={createPrompt.isPending}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
                            >
                                {createPrompt.isPending ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                )}

                {/* 프롬프트 목록 */}
                <div className="space-y-4">
                    {getPrompts.isLoading && (
                        <div className="text-center text-gray-400 py-8">로딩 중...</div>
                    )}

                    {prompts.length === 0 && !getPrompts.isLoading && (
                        <div className="text-center text-gray-400 py-8">
                            등록된 프롬프트가 없습니다.
                        </div>
                    )}

                    {prompts.map((prompt) => (
                        <div
                            key={prompt.id}
                            className={`bg-gray-800 rounded-lg p-4 border ${prompt.isActive ? "border-gray-700" : "border-red-900/50 opacity-60"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-mono text-pink-400 font-medium">
                                        {getPromptLabel(prompt)}
                                    </span>
                                    {prompt.description && (
                                        <span className="ml-2 text-gray-500 text-sm">
                                            - {prompt.description}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>v{prompt.version}</span>
                                    <button
                                        onClick={() => handleToggleActive(prompt)}
                                        className={`px-2 py-1 rounded text-xs ${prompt.isActive
                                                ? "bg-green-900/50 text-green-400"
                                                : "bg-red-900/50 text-red-400"
                                            }`}
                                    >
                                        {prompt.isActive ? "활성" : "비활성"}
                                    </button>
                                </div>
                            </div>

                            {editingId === prompt.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder="설명"
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                    />
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={10}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none font-mono"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={updatePrompt.isPending}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm"
                                        >
                                            {updatePrompt.isPending ? "저장 중..." : "저장"}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900/50 rounded p-3 max-h-40 overflow-y-auto">
                                        {prompt.content}
                                    </pre>
                                    <button
                                        onClick={() => handleEdit(prompt)}
                                        className="mt-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                    >
                                        수정
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
