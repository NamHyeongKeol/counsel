-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Character_isPublic_idx" ON "Character"("isPublic");
