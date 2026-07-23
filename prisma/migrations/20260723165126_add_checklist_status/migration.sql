-- CreateTable
CREATE TABLE "ChecklistStatus" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "evidenceId" TEXT,
    "satisfiedFrom" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistStatus_checklistId_key" ON "ChecklistStatus"("checklistId");
