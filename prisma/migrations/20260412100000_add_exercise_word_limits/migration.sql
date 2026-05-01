-- AlterTable: Add word limit fields to exercises
ALTER TABLE "exercises" ADD COLUMN "minWords" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "maxWords" INTEGER;
