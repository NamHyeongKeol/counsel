-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "intimacyLevel" INTEGER,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prompt_key_locale_idx" ON "Prompt"("key", "locale");

-- CreateIndex
CREATE INDEX "Prompt_isActive_idx" ON "Prompt"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_key_locale_intimacyLevel_key" ON "Prompt"("key", "locale", "intimacyLevel");
