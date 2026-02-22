-- AlterTable
ALTER TABLE "annotations" ADD COLUMN     "pageIndex" INTEGER,
ALTER COLUMN "startPos" SET DEFAULT 0,
ALTER COLUMN "endPos" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "reading_texts" ADD COLUMN     "pdfUrl" TEXT,
ALTER COLUMN "content" SET DEFAULT '';

-- CreateTable
CREATE TABLE "exercise_timers" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "remainingSeconds" INTEGER NOT NULL,
    "endTimestamp" BIGINT NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_text_timers" (
    "id" TEXT NOT NULL,
    "readingTextId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "remainingSeconds" INTEGER NOT NULL,
    "endTimestamp" BIGINT NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_text_timers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_timers_exerciseId_userId_key" ON "exercise_timers"("exerciseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_text_timers_readingTextId_userId_key" ON "reading_text_timers"("readingTextId", "userId");

-- AddForeignKey
ALTER TABLE "exercise_timers" ADD CONSTRAINT "exercise_timers_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_timers" ADD CONSTRAINT "exercise_timers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_text_timers" ADD CONSTRAINT "reading_text_timers_readingTextId_fkey" FOREIGN KEY ("readingTextId") REFERENCES "reading_texts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_text_timers" ADD CONSTRAINT "reading_text_timers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
