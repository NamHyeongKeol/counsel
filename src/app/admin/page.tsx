"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { ImageUpload } from "@/components/ImageUpload";

interface Character {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    systemPrompt: string;
    greeting: string;
    age?: number | null;
    gender?: string | null;
    isActive: boolean;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    images: { id: string; imageUrl: string; order: number }[];
    _count?: { conversations: number; comments: number };
}

type EditingCharacter = Partial<Character> & {
    imageUrls?: string[];
};

export default function AdminPage() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<EditingCharacter>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [newCharacter, setNewCharacter] = useState<EditingCharacter>({
        name: "",
        slug: "",
        tagline: "",
        introduction: "",
        systemPrompt: "",
        greeting: "",
        imageUrls: [""],
    });

    const getCharacters = trpc.getCharacters.useQuery();
    const createCharacter = trpc.createCharacter.useMutation();
    const updateCharacter = trpc.updateCharacter.useMutation();
    const deleteCharacter = trpc.deleteCharacter.useMutation();
    const addCharacterImage = trpc.addCharacterImage.useMutation();
    const removeCharacterImage = trpc.removeCharacterImage.useMutation();
    const getOrCreateUser = trpc.getOrCreateUser.useMutation();
    const setAdmin = trpc.setAdmin.useMutation();

    // 어드민 페이지 접속 시 자동으로 어드민 설정
    useEffect(() => {
        async function setUserAsAdmin() {
            let visitorId = localStorage.getItem("unni-visitor-id");
            if (!visitorId) {
                visitorId = crypto.randomUUID();
                localStorage.setItem("unni-visitor-id", visitorId);
            }
            const user = await getOrCreateUser.mutateAsync({ visitorId });
            localStorage.setItem("userId", user.id);

            // 어드민으로 설정
            if (!user.isAdmin) {
                await setAdmin.mutateAsync({ userId: user.id });
                localStorage.setItem("isAdmin", "true");
            } else {
                localStorage.setItem("isAdmin", "true");
            }
        }
        setUserAsAdmin();
    }, []);

    useEffect(() => {
        if (getCharacters.data) {
            setCharacters(getCharacters.data as Character[]);
        }
    }, [getCharacters.data]);

    const handleEdit = (character: Character) => {
        setEditingId(character.id);
        setEditData({
            ...character,
            imageUrls: character.images.map(img => img.imageUrl),
        });
    };

    const handleSave = async () => {
        if (!editingId) return;
        await updateCharacter.mutateAsync({
            id: editingId,
            name: editData.name,
            slug: editData.slug,
            tagline: editData.tagline,
            introduction: editData.introduction,
            systemPrompt: editData.systemPrompt,
            greeting: editData.greeting,
            age: editData.age,
            gender: editData.gender,
            isActive: editData.isActive,
        });
        setEditingId(null);
        getCharacters.refetch();
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleToggleActive = async (character: Character) => {
        await updateCharacter.mutateAsync({
            id: character.id,
            isActive: !character.isActive,
        });
        getCharacters.refetch();
    };

    const handleTogglePublic = async (character: Character) => {
        await updateCharacter.mutateAsync({
            id: character.id,
            isPublic: !character.isPublic,
        });
        getCharacters.refetch();
    };

    const handleAddCharacter = async () => {
        if (!newCharacter.name || !newCharacter.slug || !newCharacter.systemPrompt || !newCharacter.greeting || !newCharacter.introduction) {
            alert("필수 항목을 모두 입력해주세요.");
            return;
        }
        await createCharacter.mutateAsync({
            name: newCharacter.name,
            slug: newCharacter.slug,
            tagline: newCharacter.tagline || undefined,
            introduction: newCharacter.introduction,
            systemPrompt: newCharacter.systemPrompt,
            greeting: newCharacter.greeting,
            age: newCharacter.age || undefined,
            gender: newCharacter.gender || undefined,
            imageUrls: newCharacter.imageUrls?.filter(url => url.trim()) || [],
        });
        setNewCharacter({
            name: "",
            slug: "",
            tagline: "",
            introduction: "",
            systemPrompt: "",
            greeting: "",
            imageUrls: [""],
        });
        setShowAddForm(false);
        getCharacters.refetch();
    };

    const handleDeleteCharacter = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까? 이 캐릭터와 관련된 모든 대화도 연결이 끊어집니다.")) return;
        await deleteCharacter.mutateAsync({ id });
        getCharacters.refetch();
    };

    const handleAddImage = async (characterId: string, url: string) => {
        if (!url.trim()) return;
        await addCharacterImage.mutateAsync({
            characterId,
            imageUrl: url,
        });
        getCharacters.refetch();
    };

    const handleRemoveImage = async (imageId: string) => {
        await removeCharacterImage.mutateAsync({ id: imageId });
        getCharacters.refetch();
    };

    const addImageUrlField = (isNew: boolean) => {
        if (isNew) {
            setNewCharacter(prev => ({
                ...prev,
                imageUrls: [...(prev.imageUrls || []), ""],
            }));
        } else {
            setEditData(prev => ({
                ...prev,
                imageUrls: [...(prev.imageUrls || []), ""],
            }));
        }
    };

    const updateImageUrl = (index: number, value: string, isNew: boolean) => {
        if (isNew) {
            setNewCharacter(prev => ({
                ...prev,
                imageUrls: prev.imageUrls?.map((url, i) => i === index ? value : url) || [],
            }));
        } else {
            setEditData(prev => ({
                ...prev,
                imageUrls: prev.imageUrls?.map((url, i) => i === index ? value : url) || [],
            }));
        }
    };

    const removeImageUrl = (index: number, isNew: boolean) => {
        if (isNew) {
            setNewCharacter(prev => ({
                ...prev,
                imageUrls: prev.imageUrls?.filter((_, i) => i !== index) || [],
            }));
        } else {
            setEditData(prev => ({
                ...prev,
                imageUrls: prev.imageUrls?.filter((_, i) => i !== index) || [],
            }));
        }
    };

    // JSON/JSONL 대량 업로드 핸들러
    const handleBulkUpload = async (jsonText: string) => {
        try {
            let charactersToCreate: any[] = [];

            const trimmed = jsonText.trim();

            if (trimmed.startsWith('[')) {
                // JSON Array (formatted 포함)
                charactersToCreate = JSON.parse(trimmed);
            } else if (trimmed.startsWith('{')) {
                // 단일 JSON 객체 또는 JSONL 구분
                // 먼저 전체를 단일 객체로 파싱 시도
                try {
                    const singleObj = JSON.parse(trimmed);
                    charactersToCreate = [singleObj];
                } catch {
                    // 실패하면 JSONL로 처리 (한 줄에 하나씩 JSON)
                    const lines = trimmed.split('\n').filter(line => line.trim().startsWith('{'));
                    charactersToCreate = lines.map(line => JSON.parse(line.trim()));
                }
            } else {
                throw new Error('JSON 형식이 올바르지 않습니다. [ 또는 { 로 시작해야 합니다.');
            }

            if (!Array.isArray(charactersToCreate)) {
                charactersToCreate = [charactersToCreate];
            }

            let successCount = 0;
            let errorCount = 0;
            const errors: string[] = [];

            for (const char of charactersToCreate) {
                try {
                    // 필수 필드 확인
                    if (!char.name || !char.slug || !char.systemPrompt || !char.greeting || !char.introduction) {
                        errors.push(`${char.name || char.slug || '알 수 없음'}: 필수 항목 누락`);
                        errorCount++;
                        continue;
                    }

                    await createCharacter.mutateAsync({
                        name: char.name,
                        slug: char.slug,
                        tagline: char.tagline || undefined,
                        introduction: char.introduction,
                        systemPrompt: char.systemPrompt,
                        greeting: char.greeting,
                        age: char.age || undefined,
                        gender: char.gender || undefined,
                        imageUrls: char.imageUrls || [],
                    });
                    successCount++;
                } catch (err: any) {
                    errors.push(`${char.name || char.slug}: ${err.message}`);
                    errorCount++;
                }
            }

            getCharacters.refetch();
            setShowBulkUpload(false);

            let message = `${successCount}개 캐릭터 생성 완료`;
            if (errorCount > 0) {
                message += `\n${errorCount}개 실패:\n${errors.join('\n')}`;
            }
            alert(message);
        } catch (err: any) {
            alert(`JSON 파싱 오류: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">🔧 Admin 관리</h1>
                </header>

                {/* 캐릭터 관리 */}
                <div className="flex justify-end gap-2 mb-4">
                    <button
                        onClick={() => setShowBulkUpload(!showBulkUpload)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                    >
                        {showBulkUpload ? "취소" : "📋 JSON 업로드"}
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium"
                    >
                        {showAddForm ? "취소" : "+ 새 캐릭터"}
                    </button>
                </div>

                {/* JSON/JSONL 대량 업로드 폼 */}
                {showBulkUpload && (
                    <BulkUploadForm
                        onUpload={handleBulkUpload}
                        onCancel={() => setShowBulkUpload(false)}
                        isPending={createCharacter.isPending}
                    />
                )}

                {/* 새 캐릭터 추가 폼 */}
                {showAddForm && (
                    <CharacterForm
                        data={newCharacter}
                        onChange={setNewCharacter}
                        onSubmit={handleAddCharacter}
                        onCancel={() => setShowAddForm(false)}
                        isPending={createCharacter.isPending}
                        isNew={true}
                        addImageUrlField={addImageUrlField}
                        updateImageUrl={updateImageUrl}
                        removeImageUrl={removeImageUrl}
                    />
                )}

                {/* 캐릭터 목록 */}
                <div className="space-y-4">
                    {getCharacters.isLoading && (
                        <div className="text-center text-gray-400 py-8">로딩 중...</div>
                    )}

                    {characters.length === 0 && !getCharacters.isLoading && (
                        <div className="text-center text-gray-400 py-8">
                            등록된 캐릭터가 없습니다.
                        </div>
                    )}

                    {characters.map((character) => (
                        <div
                            key={character.id}
                            className={`bg-gray-800 rounded-lg p-4 border ${character.isActive ? "border-gray-700" : "border-red-900/50 opacity-60"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    {/* 프로필 이미지 썸네일 */}
                                    {character.images[0] && (
                                        <img
                                            src={character.images[0].imageUrl}
                                            alt={character.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    )}
                                    <div>
                                        <span className="font-bold text-pink-400 text-lg">
                                            {character.name}
                                        </span>
                                        {character.age && (
                                            <span className="ml-1 text-gray-400 text-sm">
                                                ({character.age}세)
                                            </span>
                                        )}
                                        {character.gender && (
                                            <span className="ml-1 text-gray-400 text-sm">
                                                {character.gender === "male" ? "♂" : "♀"}
                                            </span>
                                        )}
                                        <span className="ml-2 text-gray-500 text-sm">
                                            @{character.slug}
                                        </span>
                                        {character.tagline && (
                                            <p className="text-gray-400 text-sm mt-1">
                                                "{character.tagline}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>💬 {character._count?.conversations || 0}</span>
                                    <span>📝 {character._count?.comments || 0}</span>
                                    <button
                                        onClick={() => handleTogglePublic(character)}
                                        className={`px-2 py-1 rounded text-xs ${(character as any).isPublic
                                            ? "bg-blue-900/50 text-blue-400"
                                            : "bg-gray-700 text-gray-400"
                                            }`}
                                    >
                                        {(character as any).isPublic ? "공개" : "비공개"}
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(character)}
                                        className={`px-2 py-1 rounded text-xs ${character.isActive
                                            ? "bg-green-900/50 text-green-400"
                                            : "bg-red-900/50 text-red-400"
                                            }`}
                                    >
                                        {character.isActive ? "활성" : "비활성"}
                                    </button>
                                </div>
                            </div>

                            {editingId === character.id ? (
                                <CharacterForm
                                    data={editData}
                                    onChange={setEditData}
                                    onSubmit={handleSave}
                                    onCancel={handleCancel}
                                    isPending={updateCharacter.isPending}
                                    isNew={false}
                                    addImageUrlField={addImageUrlField}
                                    updateImageUrl={updateImageUrl}
                                    removeImageUrl={removeImageUrl}
                                    existingImages={character.images}
                                    onRemoveExistingImage={handleRemoveImage}
                                    onAddExistingImage={(url) => handleAddImage(character.id, url)}
                                />
                            ) : (
                                <div>
                                    {/* 이미지 목록 */}
                                    {character.images.length > 0 && (
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                            {character.images.map((img, idx) => (
                                                <img
                                                    key={img.id}
                                                    src={img.imageUrl}
                                                    alt={`${character.name} ${idx + 1}`}
                                                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 mb-1 font-medium">인트로 메시지</p>
                                            <div className="text-gray-300 bg-gray-900/50 rounded p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                {character.greeting}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 mb-1 font-medium">소개</p>
                                            <div className="text-gray-300 bg-gray-900/50 rounded p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                {character.introduction}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 mb-1 font-medium">시스템 프롬프트</p>
                                            <div className="text-gray-300 bg-gray-900/50 rounded p-3 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                                                {character.systemPrompt}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleEdit(character)}
                                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCharacter(character.id)}
                                            className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded text-sm"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 캐릭터 편집/생성 폼 컴포넌트
function CharacterForm({
    data,
    onChange,
    onSubmit,
    onCancel,
    isPending,
    isNew,
    addImageUrlField,
    updateImageUrl,
    removeImageUrl,
    existingImages,
    onRemoveExistingImage,
    onAddExistingImage,
}: {
    data: EditingCharacter;
    onChange: (data: EditingCharacter) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isPending: boolean;
    isNew: boolean;
    addImageUrlField: (isNew: boolean) => void;
    updateImageUrl: (index: number, value: string, isNew: boolean) => void;
    removeImageUrl: (index: number, isNew: boolean) => void;
    existingImages?: { id: string; imageUrl: string; order: number }[];
    onRemoveExistingImage?: (id: string) => void;
    onAddExistingImage?: (url: string) => void;
}) {
    const [newImageUrl, setNewImageUrl] = useState("");

    return (
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
                {isNew ? "새 캐릭터 추가" : "캐릭터 수정"}
            </h2>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">이름 *</label>
                        <input
                            type="text"
                            value={data.name || ""}
                            onChange={(e) => onChange({ ...data, name: e.target.value })}
                            placeholder="언니"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Slug * (URL용)</label>
                        <input
                            type="text"
                            value={data.slug || ""}
                            onChange={(e) => onChange({ ...data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            placeholder="unni"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">한줄 소개/대사</label>
                    <input
                        type="text"
                        value={data.tagline || ""}
                        onChange={(e) => onChange({ ...data, tagline: e.target.value })}
                        placeholder="언니가 다 알려줄게~"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">나이</label>
                    <input
                        type="number"
                        value={data.age || ""}
                        onChange={(e) => onChange({ ...data, age: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="25"
                        className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">성별</label>
                    <select
                        value={data.gender || ""}
                        onChange={(e) => onChange({ ...data, gender: e.target.value || undefined })}
                        className="w-40 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    >
                        <option value="">선택 안함</option>
                        <option value="female">여성</option>
                        <option value="male">남성</option>
                    </select>
                </div>

                {/* 이미지 관리 */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">프로필 이미지</label>

                    {/* 기존 이미지 (편집 모드) */}
                    {!isNew && existingImages && existingImages.length > 0 && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {existingImages.map((img) => (
                                <div key={img.id} className="relative group">
                                    <img
                                        src={img.imageUrl}
                                        alt=""
                                        className="w-20 h-20 rounded-lg object-cover"
                                    />
                                    <button
                                        onClick={() => onRemoveExistingImage?.(img.id)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 새 이미지 뮿록 (생성 모드) */}
                    {isNew && data.imageUrls && data.imageUrls.filter(url => url.trim()).length > 0 && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {data.imageUrls.filter(url => url.trim()).map((url, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={url}
                                        alt=""
                                        className="w-20 h-20 rounded-lg object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%234B5563' width='80' height='80'/%3E%3Ctext fill='%239CA3AF' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='10'%3E에러%3C/text%3E%3C/svg%3E";
                                        }}
                                    />
                                    <button
                                        onClick={() => removeImageUrl(index, isNew)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 드래그앤드롭 업로드 */}
                    <ImageUpload
                        onUpload={(url) => {
                            if (isNew) {
                                // 생성 모드: imageUrls 배열에 추가
                                const newUrls = [...(data.imageUrls || []).filter(u => u.trim()), url];
                                onChange({ ...data, imageUrls: newUrls });
                            } else {
                                // 편집 모드: API로 직접 추가
                                onAddExistingImage?.(url);
                            }
                        }}
                        className="mb-3"
                    />

                    {/* URL 직접 입력 (펼치기) */}
                    <details className="group">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                            → URL 직접 입력
                        </summary>
                        <div className="mt-2 flex gap-2">
                            <input
                                type="text"
                                value={newImageUrl}
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                            />
                            <button
                                onClick={() => {
                                    if (!newImageUrl.trim()) return;
                                    if (isNew) {
                                        const newUrls = [...(data.imageUrls || []).filter(u => u.trim()), newImageUrl];
                                        onChange({ ...data, imageUrls: newUrls });
                                    } else {
                                        onAddExistingImage?.(newImageUrl);
                                    }
                                    setNewImageUrl("");
                                }}
                                className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded text-sm"
                            >
                                추가
                            </button>
                        </div>
                    </details>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">소개 문구 *</label>
                    <textarea
                        value={data.introduction || ""}
                        onChange={(e) => onChange({ ...data, introduction: e.target.value })}
                        rows={4}
                        placeholder="캐릭터 소개 (프로필 페이지에 표시됨)"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">인트로 메시지 *</label>
                    <textarea
                        value={data.greeting || ""}
                        onChange={(e) => onChange({ ...data, greeting: e.target.value })}
                        rows={4}
                        placeholder="대화 시작시 보내는 첫 인사"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">시스템 프롬프트 *</label>
                    <textarea
                        value={data.systemPrompt || ""}
                        onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
                        rows={12}
                        placeholder="AI에게 전달될 시스템 프롬프트"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none font-mono"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onSubmit}
                        disabled={isPending}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
                    >
                        {isPending ? "저장 중..." : "저장"}
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}

// JSON/JSONL 대량 업로드 폼 컴포넌트
function BulkUploadForm({
    onUpload,
    onCancel,
    isPending,
}: {
    onUpload: (jsonText: string) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const [jsonText, setJsonText] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async () => {
        if (!jsonText.trim()) {
            alert("JSON 데이터를 입력해주세요.");
            return;
        }
        setIsUploading(true);
        try {
            await onUpload(jsonText);
        } finally {
            setIsUploading(false);
        }
    };

    const exampleJson = `{
  "name": "캐릭터 이름",
  "slug": "character-slug",
  "tagline": "한줄 소개 (선택)",
  "introduction": "캐릭터 소개",
  "systemPrompt": "시스템 프롬프트",
  "greeting": "인트로 메시지",
  "age": 25,
  "gender": "female"
}`;

    return (
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-blue-700">
            <h2 className="text-lg font-semibold mb-4">📋 JSON/JSONL 대량 업로드</h2>

            <div className="mb-4 text-sm text-gray-400">
                <p className="mb-2">
                    <strong>지원 형식:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>JSON Array: <code className="bg-gray-700 px-1 rounded">[{"{...}"}, {"{...}"}]</code></li>
                    <li>JSONL: 한 줄에 하나씩 JSON 객체</li>
                    <li>단일 JSON 객체</li>
                </ul>
                <p className="mt-2">
                    <strong>필수 항목:</strong> name, slug, introduction, systemPrompt, greeting
                </p>
                <p>
                    <strong>선택 항목:</strong> tagline, age, gender, isActive, isPublic
                </p>
            </div>

            <details className="mb-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                    예시 보기
                </summary>
                <pre className="mt-2 bg-gray-900 p-3 rounded text-xs overflow-x-auto text-gray-300">
                    {exampleJson}
                </pre>
            </details>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">
                        JSON 또는 JSONL 붙여넣기
                    </label>
                    <textarea
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        rows={15}
                        placeholder='[ { "name": "...", ... }, { "name": "...", ... } ]'
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none font-mono"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={isPending || isUploading || !jsonText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium disabled:opacity-50"
                    >
                        {isUploading ? "업로드 중..." : "업로드"}
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
