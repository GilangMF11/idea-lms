-- AlterTable: Add schedule fields to reading_texts
ALTER TABLE "reading_texts" ADD COLUMN "openAt" TIMESTAMP(3);
ALTER TABLE "reading_texts" ADD COLUMN "closeAt" TIMESTAMP(3);
