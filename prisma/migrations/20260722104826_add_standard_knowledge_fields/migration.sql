-- AlterTable
ALTER TABLE "Standard" ADD COLUMN     "commonGaps" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "goldStandard" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "planManagementSpecific" JSONB NOT NULL DEFAULT '[]';
