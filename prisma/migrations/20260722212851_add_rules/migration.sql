-- CreateTable
CREATE TABLE "KBDocument" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "lastUpdated" TEXT,
    "reviewDate" TEXT,
    "fileStatus" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "officialRef" TEXT NOT NULL,
    "qualityIndicatorRef" TEXT,
    "severity" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "evidenceRequired" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,
    "appliesTo" TEXT[] DEFAULT ARRAY['PM']::TEXT[],
    "auditPathway" TEXT NOT NULL DEFAULT 'BOTH',
    "trigger" TEXT NOT NULL DEFAULT 'daily_scan',
    "isPassing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KBDocument_docId_key" ON "KBDocument"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_code_key" ON "Rule"("code");
