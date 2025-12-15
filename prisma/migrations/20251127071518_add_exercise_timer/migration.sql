-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "autoSubmitOnTimeout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timerDuration" INTEGER;
