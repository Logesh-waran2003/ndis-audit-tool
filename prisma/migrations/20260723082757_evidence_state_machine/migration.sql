-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EvidenceStatus" ADD VALUE 'MISSING';
ALTER TYPE "EvidenceStatus" ADD VALUE 'UPLOADED';
ALTER TYPE "EvidenceStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "EvidenceStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "EvidenceStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;
