-- Step 1: Create the lessons table
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add foreign key from lessons to classes
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Insert a default lesson for each existing class
INSERT INTO "lessons" ("id", "title", "description", "classId", "order", "isActive", "createdAt", "updatedAt")
SELECT
    CONCAT('default-lesson-', c."id"),
    'Pertemuan 1',
    'Default lesson (auto-created during migration)',
    c."id",
    0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "classes" c;

-- Step 4: Add lessonId column to reading_texts (nullable first for data migration)
ALTER TABLE "reading_texts" ADD COLUMN "lessonId" TEXT;

-- Step 5: Migrate existing reading_texts to default lessons
UPDATE "reading_texts" rt
SET "lessonId" = CONCAT('default-lesson-', rt."classId")
WHERE "lessonId" IS NULL;

-- Step 6: Make lessonId NOT NULL on reading_texts
ALTER TABLE "reading_texts" ALTER COLUMN "lessonId" SET NOT NULL;

-- Step 7: Add foreign key from reading_texts to lessons
ALTER TABLE "reading_texts" ADD CONSTRAINT "reading_texts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Add lessonId column to exercises (nullable first for data migration)
ALTER TABLE "exercises" ADD COLUMN "lessonId" TEXT;

-- Step 9: Migrate existing exercises to default lessons
UPDATE "exercises" e
SET "lessonId" = CONCAT('default-lesson-', e."classId")
WHERE "lessonId" IS NULL;

-- Step 10: Make lessonId NOT NULL on exercises
ALTER TABLE "exercises" ALTER COLUMN "lessonId" SET NOT NULL;

-- Step 11: Add foreign key from exercises to lessons
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 12: Add lessonId column to groups (nullable - groups can be global per class)
ALTER TABLE "groups" ADD COLUMN "lessonId" TEXT;

-- Step 13: Add foreign key from groups to lessons
ALTER TABLE "groups" ADD CONSTRAINT "groups_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
