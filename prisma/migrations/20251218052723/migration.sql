-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER;
