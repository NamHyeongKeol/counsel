-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "isPublic" SET DEFAULT true;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "deleteLocked" BOOLEAN NOT NULL DEFAULT false;
