# PRD - Revisi #5: Penyederhanaan Exit Ticket & Batasan Kata

## Ringkasan
Menyederhanakan form Exit Ticket sehingga siswa **hanya perlu submit Summary** saja (menghapus inputan lain). Menambahkan validasi batasan kata **150-200 kata** dengan indikator word counter di UI.

---

## Analisis Current State

### Database (berdasarkan migration & schema)

**Model `Exercise`:**
| Field | Tipe | Keterangan |
|-------|------|------------|
| id | String | Primary key |
| title | String | Judul exit ticket |
| description | String? | Deskripsi opsional |
| content | String | Pertanyaan/instruksi |
| type | ExerciseType | INDIVIDUAL / GROUP |
| readingTextId | String? | Relasi ke ReadingText |
| classId | String | Relasi ke Class |
| lessonId | String | Relasi ke Lesson |
| dueDate | DateTime? | Deadline |
| timerDuration | Int? | Timer dalam detik |
| autoSubmitOnTimeout | Boolean | Auto-submit saat timer habis |

**Model `ExerciseSubmission`:**
| Field | Tipe | Keterangan |
|-------|------|------------|
| id | String | Primary key |
| exerciseId | String | Relasi ke Exercise |
| userId | String | Relasi ke User |
| answer | String | Jawaban + metadata file (JSON) |
| score | Float? | Nilai dari teacher |
| feedback | String? | Feedback dari teacher |

### Flow Saat Ini

**Teacher creates exercise:**
- Form: Title, Description, Content (pertanyaan), Class, Lesson, Reading Text, Due Date, Timer

**Student submits:**
- Form: Answer (textarea bebas) + File upload (PDF/DOC/DOCX/TXT/JPG/PNG/GIF, max 10MB, multiple files)
- Jawaban disimpan di field `answer` sebagai string
- File di-append ke `answer` dengan format: `text_answer + "--- Attached Files ---" + JSON_metadata`

**Problem saat ini:**
- Student bisa input apapun tanpa batasan
- Ada file upload yang kompleks (base64 embedding, drag-drop)
- Tidak ada word counter
- Teacher tidak bisa set batasan kata

---

## Perubahan yang Dibutuhkan

### 1. Tidak Ada Perubahan Database
Database schema **tidak perlu diubah**. Field yang ada sudah cukup:
- `answer` di ExerciseSubmission sudah bisa menampung summary text
- `Exercise.content` tetap untuk pertanyaan/instruksi dari teacher

### 2. Perubahan API

#### `POST /api/exercises` & `PUT /api/exercises`
Tambahkan field opsional:
- `minWords` (Int?, default: 150) - Batasan minimum kata
- `maxWords` (Int?, default: 200) - Batasan maksimum kata

Field ini disimpan di kolom `content` sebagai JSON, atau bisa ditambahkan kolom baru jika perlu. **Rekomendasi: gunakan kolom `content` yang sudah ada** dengan format JSON:

```json
{
  "question": "Tulis summary dari reading text...",
  "minWords": 150,
  "maxWords": 200
}
```

Atau, **rekomendasi lebih baik**: tambahkan 2 field baru di schema:

| Field | Tipe | Default | Deskripsi |
|-------|------|---------|-----------|
| `minWords` | Int? | 150 | Batas minimum kata summary |
| `maxWords` | Int? | 200 | Batas maksimum kata summary |

#### `POST /api/exercise-submissions`
Tambahkan validasi word count:
- Parse jawaban, hitung jumlah kata (`answer.trim().split(/\s+/).filter(w => w).length`)
- Jika kurang dari `exercise.minWords` → return 400 "Summary terlalu pendek, minimal {minWords} kata"
- Jika lebih dari `exercise.maxWords` → return 400 "Summary terlalu panjang, maksimal {maxWords} kata"

### 3. Perubahan UI

#### A. Halaman Create Exercise (`/exercises/create/+page.svelte`)
- Pertahankan field: Title, Class, Lesson, Reading Text, Due Date, Timer
- **Hapus** field Description (tidak perlu lagi karena exit ticket disederhanakan)
- **Ubah** label "Content" menjadi "Question/Prompt" - ini menjadi instruksi untuk summary
- **Tambahkan** section "Batasan Kata":
  - Input `minWords` (number, default 150)
  - Input `maxWords` (number, default 200)
  - Helper text: "Jumlah kata yang diizinkan untuk summary siswa"

#### B. Halaman Edit Exercise (`/exercises/[id]/edit/+page.svelte`)
- Sama seperti create, tambahkan field minWords/maxWords
- Pre-fill dari data exercise yang sudah ada

#### C. Halaman Student Submission (`/submissions/[id]/+page.svelte`)
- **Hapus** file upload functionality (tidak perlu lagi)
- **Ubah** textarea label menjadi "Summary" (bukan "Answer")
- **Tambahkan** Word Counter:
  - Tampilkan di bawah textarea: "X / 200 kata (min. 150)"
  - Warna indikator:
    - **Abu-abu**: di bawah minWords
    - **Hijau**: dalam rentang minWords-maxWords
    - **Merah**: melebihi maxWords
  - Progress bar visual (opsional)
- **Validasi real-time**:
  - Disable tombol Submit jika jumlah kata belum dalam rentang
  - Tampilkan pesan error inline

#### D. Halaman View Submission (Teacher)
- Tampilkan jumlah kata summary siswa
- Bandingkan dengan batasan yang ditentukan

### 4. Aturan Bisnis

1. **Default minWords = 150, maxWords = 200** - Teacher bisa mengubah
2. **Word count mengikuti aturan**: kata = `text.trim().split(/\s+/).filter(w => w.length > 0).length`
3. **File upload dihapus** dari exit ticket - exit ticket = summary text saja
4. **Auto-submit timer tetap berfungsi** - jika timer habis, submit apa adanya (bypass word count)
5. **Edit submission** juga harus memenuhi batasan kata
6. **Backward compatible**: exercise lama tanpa minWords/maxWords tetap bisa diakses (tanpa validasi kata)

---

## File yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah `minWords Int?` dan `maxWords Int?` di model Exercise |
| `prisma/migrations/...` | Migration baru untuk tambah kolom |
| `src/routes/api/exercises/+server.ts` | POST/PUT: simpan minWords/maxWords |
| `src/routes/api/exercise-submissions/+server.ts` | POST: validasi word count saat submit |
| `src/routes/exercises/create/+page.svelte` | Tambah input minWords/maxWords, ubah label |
| `src/routes/exercises/[id]/edit/+page.svelte` | Tambah input minWords/maxWords |
| `src/routes/submissions/[id]/+page.svelte` | Hapus file upload, tambah word counter, ubah label ke "Summary", validasi real-time |

---

## Urutan Implementasi

1. **Database**: Tambah field `minWords` dan `maxWords` di Exercise model + migration
2. **API Exercise**: Update POST/PUT untuk simpan minWords/maxWords
3. **API Submission**: Tambah validasi word count di POST submission
4. **Create/Edit Exercise UI**: Tambah input batasan kata
5. **Student Submission UI**: Word counter + hapus file upload + ubah label ke Summary
6. **Testing**: Verify word count validation, edge cases (timer expired, edit submission)
