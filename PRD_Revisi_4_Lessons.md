# PRD Revisi #4 - Penambahan Table Lesson (Pertemuan)

## Deskripsi

Menambahkan konsep **Lesson (Pertemuan)** sebagai pengelompokan materi di dalam sebuah Class. Saat ini Reading Text dan Exercise (Exit Ticket) langsung terhubung ke Class tanpa ada struktur pertemuan. Dengan penambahan ini, dashboard siswa akan menampilkan materi yang terstruktur per pertemuan.

## Struktur Saat Ini (Current)

```
Class
 ├── ReadingText (langsung, via classId)
 │     └── (optional) Group (via groupId)
 ├── Exercise / Exit Ticket (langsung, via classId)
 └── Group
```

**Masalah:** Semua Reading Text dan Exit Ticket tampil datar (list) tanpa pengelompokan. Tidak ada konsep "Pertemuan 1, Pertemuan 2, dst."

## Struktur Target (Proposed)

```
Class
 └── Lesson (Pertemuan 1, Pertemuan 2, ...)
       ├── ReadingText (langsung ke lesson)
       ├── ReadingText -> via Group (jika ada group-specific reading)
       └── Exercise / Exit Ticket (langsung ke lesson)
```

Dua skenario yang didukung:

### Skenario A: Lesson -> Reading Text (langsung)
Teacher membuat Lesson, lalu menambahkan Reading Text langsung ke lesson tersebut.
Contoh: Pertemuan 1 -> "Reading: Climate Change"

### Skenario B: Lesson -> Group -> Reading Text (dengan grup)
Teacher membuat Lesson, membuat Group di dalam lesson, lalu menambahkan Reading Text ke group.
Contoh: Pertemuan 2 -> Group A -> "Reading: Biology Chapter 3"

---

## Perubahan Database (Prisma Schema)

### 1. Tabel Baru: `Lesson`

```prisma
model Lesson {
  id          String   @id @default(cuid())
  title       String                        // e.g. "Pertemuan 1 - Introduction"
  description String?                       // deskripsi singkat pertemuan
  classId     String                        // FK ke Class
  order       Int      @default(0)          // urutan pertemuan (0, 1, 2, ...)
  scheduledAt DateTime?                     // jadwal pertemuan (opsional, terkait PRD #2 Schedule)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  class        Class          @relation(fields: [classId], references: [id])
  readingTexts ReadingText[]
  exercises    Exercise[]
  groups       Group[]

  @@map("lessons")
}
```

### 2. Modifikasi: `ReadingText`

Tambahkan field `lessonId` (wajib - setiap reading text harus milik sebuah lesson).

```diff
 model ReadingText {
   id        String   @id @default(cuid())
   title     String
   content   String   @default("")
   pdfUrl    String?
   classId   String
+  lessonId  String                        // FK ke Lesson (BARU - wajib)
   groupId   String?                        // Optional - untuk reading text yang dikelompokkan
   timerDuration Int?
   author    String?
   source    String?
   isActive  Boolean  @default(true)
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt

   // Relations
   class       Class        @relation(fields: [classId], references: [id])
+  lesson      Lesson       @relation(fields: [lessonId], references: [id])   // BARU
   group       Group?       @relation(fields: [groupId], references: [id])
   annotations Annotation[]
   exercises   Exercise[]
   timers      ReadingTextTimer[]

   @@map("reading_texts")
 }
```

### 3. Modifikasi: `Exercise`

Tambahkan field `lessonId` (wajib - setiap exit ticket harus milik sebuah lesson).

```diff
 model Exercise {
   id            String       @id @default(cuid())
   title         String
   description   String?
   content       String
   type          ExerciseType @default(INDIVIDUAL)
   readingTextId String?
   classId       String
+  lessonId      String                          // FK ke Lesson (BARU - wajib)
   dueDate       DateTime?
   isActive      Boolean      @default(true)
   createdAt     DateTime     @default(now())
   updatedAt     DateTime     @updatedAt
   timerDuration Int?
   autoSubmitOnTimeout Boolean @default(true)

   // Relations
   readingText ReadingText?         @relation(fields: [readingTextId], references: [id])
   class       Class                @relation(fields: [classId], references: [id])
+  lesson      Lesson               @relation(fields: [lessonId], references: [id])   // BARU
   submissions ExerciseSubmission[]
   timers      ExerciseTimer[]

   @@map("exercises")
 }
```

### 4. Modifikasi: `Group`

Tambahkan field `lessonId` agar group bisa berada di dalam lesson tertentu.

```diff
 model Group {
   id          String   @id @default(cuid())
   name        String
   description String?
   classId     String
+  lessonId    String?                        // FK ke Lesson (opsional - group bisa global per class atau spesifik per lesson)
   isActive    Boolean  @default(true)
   createdAt   DateTime @default(now())
   updatedAt   DateTime @updatedAt

   // Relations
   class        Class          @relation(fields: [classId], references: [id])
+  lesson       Lesson?        @relation(fields: [lessonId], references: [id])   // BARU
   members      GroupMember[]
   readingTexts ReadingText[]

   @@map("groups")
 }
```

### 5. Modifikasi: `Class`

Tambahkan relation ke Lesson.

```diff
 model Class {
   ...existing fields...

   // Relations
   teacher         User             @relation(...)
   students        ClassStudent[]
+  lessons         Lesson[]
   readingTexts    ReadingText[]
   exercises       Exercise[]
   ...other relations...

   @@map("classes")
 }
```

---

## Ringkasan Migration

| Action | Table | Perubahan |
|--------|-------|-----------|
| **CREATE** | `lessons` | Tabel baru |
| **ALTER** | `reading_texts` | Tambah kolom `lessonId` (not null, FK ke lessons) |
| **ALTER** | `exercises` | Tambah kolom `lessonId` (not null, FK ke lessons) |
| **ALTER** | `groups` | Tambah kolom `lessonId` (nullable, FK ke lessons) |

---

## Data Migration Strategy

Karena `lessonId` pada `reading_texts` dan `exercises` akan menjadi **NOT NULL**, diperlukan data migration untuk data yang sudah ada:

1. Buat satu **default Lesson** per Class yang sudah ada (e.g., "Pertemuan 1 - General")
2. Assign semua ReadingText dan Exercise yang sudah ada ke default Lesson tersebut
3. Setelah migration, baru jalankan `prisma migrate` dengan constraint NOT NULL

---

## API Endpoints Baru

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/lessons?classId=xxx` | List lessons dalam sebuah class |
| POST | `/api/lessons` | Buat lesson baru (Teacher/Admin) |
| PUT | `/api/lessons/:id` | Update lesson (Teacher/Admin) |
| DELETE | `/api/lessons/:id` | Hapus lesson (Teacher/Admin) |
| PATCH | `/api/lessons/:id/reorder` | Ubah urutan lesson |

### Endpoint yang Perlu Diupdate

| Endpoint | Perubahan |
|----------|-----------|
| `POST /api/reading-texts` | Tambah field `lessonId` (required) |
| `GET /api/reading-texts` | Support filter by `lessonId` |
| `POST /api/exercises` | Tambah field `lessonId` (required) |
| `GET /api/exercises` | Support filter by `lessonId` |
| `POST /api/groups` | Tambah field `lessonId` (optional) |
| `GET /api/groups` | Support filter by `lessonId` |

---

## UI Changes (Dashboard Siswa)

### Sebelum (Current)
```
[Materials Tab]
  - Reading: Climate Change
  - Reading: Biology
  - Reading: Physics
  (flat list, tidak terstruktur)
```

### Sesudah (Proposed)
```
[Lessons / Pertemuan Tab]
  📁 Pertemuan 1 - Introduction
     ├── 📄 Reading: Climate Change
     └── 📝 Exit Ticket: Summary

  📁 Pertemuan 2 - Deep Dive
     ├── 📄 Reading: Biology
     ├── 📄 Reading: Physics (Group A)
     └── 📝 Exit Ticket: Reflection

  📁 Pertemuan 3 - ...
```

Folder pertemuan diurutkan berdasarkan field `order` (atau `scheduledAt` jika ada).
Setiap folder bisa di-expand/collapse untuk melihat isinya.

---

## Urutan Pengerjaan (Implementation Order)

1. Update `prisma/schema.prisma` (tambah model Lesson, update ReadingText/Exercise/Group/Class)
2. Buat migration + data migration script
3. Buat API endpoints `/api/lessons`
4. Update API reading-texts, exercises, groups (tambah lessonId)
5. Update halaman manage class (Teacher) - CRUD lesson + assign reading texts/exercises ke lesson
6. Update dashboard siswa - tampilan folder pertemuan
7. Testing

---

## Catatan

- Field `scheduledAt` pada Lesson bisa dimanfaatkan untuk **PRD #2 (Schedule Reading Text)** nantinya
- Group dengan `lessonId = null` berarti group global per class (bisa digunakan lintas pertemuan)
- Group dengan `lessonId` tertentu berarti group hanya relevan untuk pertemuan tersebut
- Backward compatibility: data lama akan di-migrate ke default Lesson "Pertemuan 1"
