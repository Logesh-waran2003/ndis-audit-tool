-- AlterTable
ALTER TABLE "ChecklistStatus" ADD COLUMN     "concerns" TEXT,
ADD COLUMN     "confidence" TEXT;

-- CreateTable
CREATE TABLE "DocumentAnalysis" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "extractedTitle" TEXT NOT NULL,
    "dates" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "legislationRefs" JSONB NOT NULL,
    "personnel" JSONB NOT NULL,
    "keyFindings" JSONB NOT NULL,
    "concerns" JSONB NOT NULL,
    "qualityScore" INTEGER,
    "checklistMapping" JSONB NOT NULL,
    "analysedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAnalysis_evidenceId_key" ON "DocumentAnalysis"("evidenceId");
