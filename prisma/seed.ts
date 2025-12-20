/**
 * Prisma Seed - 캐릭터 데이터 시딩
 * 
 * 실행: pnpm prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// 환경변수 로드
dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface CharacterData {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    introduction: string;
    systemPrompt: string;
    greeting: string;
    age: number | null;
    gender?: string | null;
    isActive: boolean;
    isPublic: boolean;
}

interface CharacterImageData {
    id: string;
    characterId: string;
    imageUrl: string;
    order: number;
}

async function main() {
    console.log("🌱 캐릭터 시드 데이터 삽입 시작...\n");

    // JSON 파일 로드
    const seedDataPath = path.join(__dirname, "seed-data");

    const charactersPath = path.join(seedDataPath, "characters.json");
    const imagesPath = path.join(seedDataPath, "character_images.json");

    if (!fs.existsSync(charactersPath)) {
        console.log("❌ characters.json 파일이 없습니다.");
        console.log("   prisma/seed-data/characters.json 파일을 생성해주세요.");
        return;
    }

    const characters: CharacterData[] = JSON.parse(
        fs.readFileSync(charactersPath, "utf-8")
    );

    const images: CharacterImageData[] = fs.existsSync(imagesPath)
        ? JSON.parse(fs.readFileSync(imagesPath, "utf-8"))
        : [];

    console.log(`📦 캐릭터 ${characters.length}개, 이미지 ${images.length}개 발견\n`);

    // 캐릭터 upsert
    for (const char of characters) {
        await prisma.character.upsert({
            where: { id: char.id },
            update: {
                name: char.name,
                slug: char.slug,
                tagline: char.tagline,
                introduction: char.introduction,
                systemPrompt: char.systemPrompt,
                greeting: char.greeting,
                age: char.age,
                gender: char.gender || null,
                isActive: char.isActive,
                isPublic: char.isPublic,
            },
            create: {
                id: char.id,
                name: char.name,
                slug: char.slug,
                tagline: char.tagline,
                introduction: char.introduction,
                systemPrompt: char.systemPrompt,
                greeting: char.greeting,
                age: char.age,
                gender: char.gender || null,
                isActive: char.isActive,
                isPublic: char.isPublic,
            },
        });
        console.log(`  ✅ 캐릭터: ${char.name} (${char.slug})`);
    }

    // 이미지 upsert
    for (const img of images) {
        await prisma.characterImage.upsert({
            where: { id: img.id },
            update: {
                characterId: img.characterId,
                imageUrl: img.imageUrl,
                order: img.order,
            },
            create: {
                id: img.id,
                characterId: img.characterId,
                imageUrl: img.imageUrl,
                order: img.order,
            },
        });
    }
    console.log(`  ✅ 이미지 ${images.length}개 삽입 완료`);

    console.log("\n🎉 시드 완료!");
}

main()
    .catch((e) => {
        console.error("❌ 시드 실패:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
