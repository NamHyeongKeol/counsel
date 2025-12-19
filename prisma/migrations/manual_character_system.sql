-- ============================================
-- 캐릭터 시스템 마이그레이션 (2024-12-19)
-- ============================================

-- 1. User 테이블에 nickname 컬럼 추가
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;

-- 2. Conversation 테이블에 characterId 컬럼 추가
ALTER TABLE "Conversation" ADD COLUMN "characterId" TEXT;

-- 3. Character 테이블 생성
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "introduction" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- 4. CharacterImage 테이블 생성
CREATE TABLE "CharacterImage" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterImage_pkey" PRIMARY KEY ("id")
);

-- 5. CharacterComment 테이블 생성
CREATE TABLE "CharacterComment" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterComment_pkey" PRIMARY KEY ("id")
);

-- 6. 인덱스 생성
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");
CREATE INDEX "Character_isActive_idx" ON "Character"("isActive");
CREATE INDEX "Character_isPublic_idx" ON "Character"("isPublic");
CREATE INDEX "CharacterImage_characterId_idx" ON "CharacterImage"("characterId");
CREATE INDEX "CharacterComment_characterId_idx" ON "CharacterComment"("characterId");
CREATE INDEX "CharacterComment_userId_idx" ON "CharacterComment"("userId");
CREATE INDEX "Conversation_characterId_idx" ON "Conversation"("characterId");

-- 7. Foreign Key 추가
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CharacterImage" ADD CONSTRAINT "CharacterImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterComment" ADD CONSTRAINT "CharacterComment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterComment" ADD CONSTRAINT "CharacterComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
