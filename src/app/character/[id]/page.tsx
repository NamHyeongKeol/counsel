import { notFound } from "next/navigation";
import { CharacterDetailPage } from "./CharacterDetailPage";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;

    // id가 slug 형태인지 cuid 형태인지 확인
    // cuid는 보통 25자 정도, slug는 짧고 영문/숫자/하이픈만
    const isSlug = !id.match(/^c[a-z0-9]{24}$/i);

    return <CharacterDetailPage id={id} isSlug={isSlug} />;
}

export function generateMetadata() {
    return {
        title: "캐릭터 프로필 | 언니야",
    };
}
