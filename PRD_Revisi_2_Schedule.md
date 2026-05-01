# PRD - Revisi #2: Penjadwalan (Schedule) pada Reading Text

## Ringkasan
Menambahkan fitur penjadwalan (schedule) pada modul Reading Text sehingga Teacher/Admin dapat mengatur **tanggal dan waktu buka/tutup** akses materi. Siswa hanya bisa mengakses Reading Text sesuai jadwal yang ditentukan.

---

## Perubahan Database

### 1. Model ReadingText (sudah ada sebagian)
Tambahkan field berikut pada tabel `reading_texts`:

| Field | Tipe | Default | Deskripsi |
|-------|------|---------|-----------|
| `openAt` | `DateTime?` | `null` | Waktu materi mulai bisa diakses siswa. Jika null = langsung tersedia |
| `closeAt` | `DateTime?` | `null` | Waktu materi tidak lagi bisa diakses siswa. Jika null = tidak ada batas tutup |

### 2. Model Lesson (field sudah ada)
Field `scheduledAt` yang sudah ada di model Lesson bisa digunakan sebagai waktu default/jadwal pertemuan, tapi scheduling utama ada di level Reading Text untuk fleksibilitas per-item.

---

## API Changes

### `PUT /api/reading-texts`
Update handler sudah ada. Tambahkan field:
- `openAt` (optional, DateTime string)
- `closeAt` (optional, DateTime string)

### `POST /api/reading-texts`
Tambahkan field saat create:
- `openAt` (optional, DateTime string)
- `closeAt` (optional, DateTime string)

### `GET /api/reading-texts` (access control untuk Student)
Pada query untuk role STUDENT, tambahkan filter:
```
- Jika openAt terisi dan waktu sekarang < openAt → Reading Text TIDAK ditampilkan
- Jika closeAt terisi dan waktu sekarang > closeAt → Reading Text TIDAK ditampilkan
- Jika openAt null dan closeAt null → Reading Text langsung tersedia
```

### `GET /api/reading-texts?id=xxx` (single reading text access)
Untuk role STUDENT, tambahkan pengecekan schedule:
- Jika belum waktunya (openAt > now) → return 403 dengan pesan "Materi belum tersedia"
- Jika sudah lewat waktu (closeAt < now) → return 403 dengan pesan "Materi sudah ditutup"

---

## UI Changes

### 1. Halaman Create Reading Text (`/reading-texts/create`)
- Tambahkan section **"Schedule (Opsional)"** dengan:
  - Toggle/switch: "Atur jadwal akses"
  - Input `openAt`: DateTime picker (tanggal + waktu) - label "Waktu Buka"
  - Input `closeAt`: DateTime picker (tanggal + waktu) - label "Waktu Tutup"
- Validasi: `closeAt` harus lebih besar dari `openAt`
- Default: toggle OFF (null/open access)

### 2. Halaman Edit Reading Text (`/reading-texts/[id]/edit`)
- Sama seperti create, tambahkan section Schedule
- Pre-fill dengan data schedule yang sudah ada

### 3. Halaman Manage Class - Reading Text Tab (`/classes/[id]/manage`)
- Pada card reading text, tampilkan badge status schedule:
  - "Scheduled" (icon clock, warna biru) jika openAt/closeAt terisi
  - Tampilkan tanggal buka & tutup
  - "Open Access" jika tanpa schedule
- Badge warning jika sudah melewati closeAt (expired)

### 4. Halaman View Class Student (`/classes/[id]`)
- Pada Materials tab, reading text yang belum waktunya:
  - Tampilkan card dengan state disabled/grayed out
  - Badge: "Opens at [tanggal]" (warna kuning)
- Reading text yang sudah ditutup:
  - Tampilkan card dengan badge "Closed" (warna merah)
  - Tidak bisa diklik

### 5. Halaman Reading Text View (`/reading-texts/[id]`)
- Untuk Student:
  - Jika belum waktunya → tampilkan halaman "Materi belum tersedia" dengan countdown ke openAt
  - Jika sudah ditutup → tampilkan halaman "Materi sudah ditutup"
  - Countdown timer di header jika sedang berjalan menuju closeAt

---

## Aturan Bisnis

1. **Hanya Teacher dan Admin** yang bisa mengatur schedule
2. **Jika openAt dan closeAt keduanya null** → Reading Text langsung bisa diakses (default behavior, backward compatible)
3. **Jika hanya openAt yang diisi** → materi tersedia mulai openAt, tanpa batas waktu tutup
4. **Jika hanya closeAt yang diisi** → materi langsung tersedia tapi akan ditutup pada closeAt
5. **Jika keduanya diisi** → materi tersedia hanya dalam rentang waktu tersebut
6. **Timer** yang sudah ada di Reading Text (untuk durasi baca) **tetap berjalan** terpisah dari schedule. Schedule = kapan bisa diakses, Timer = berapa lama bisa dibaca
7. Schedule hanya mempengaruhi akses **Student**. Teacher dan Admin tetap bisa melihat semua kapanpun
8. **Annotations dan Discuss** yang sudah ada tetap tersimpan meskipun schedule sudah ditutup. Student hanya tidak bisa akses halaman reading text

---

## File yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah `openAt DateTime?` dan `closeAt DateTime?` di model ReadingText |
| `prisma/migrations/...` | Migration baru untuk tambah kolom |
| `src/routes/api/reading-texts/+server.ts` | POST/PUT: simpan openAt/closeAt. GET: filter by schedule untuk Student |
| `src/routes/reading-texts/create/+page.svelte` | Tambah datetime picker untuk openAt/closeAt |
| `src/routes/reading-texts/[id]/edit/+page.svelte` | Tambah datetime picker (atau buat jika belum ada halaman edit) |
| `src/routes/classes/[id]/manage/+page.svelte` | Badge schedule pada reading text cards |
| `src/routes/classes/[id]/+page.svelte` | Student: disabled state untuk scheduled/closed reading texts |
| `src/routes/reading-texts/[id]/+page.svelte` | Access check + countdown untuk Student |

---

## Urutan Implementasi

1. **Database**: Tambah field `openAt` dan `closeAt` di schema + migration
2. **API**: Update POST/PUT reading-texts untuk simpan schedule, update GET untuk access control
3. **Create/Edit UI**: Tambah datetime picker schedule
4. **Manage Class UI**: Badge schedule pada reading text cards
5. **Student View**: Disabled state + access check + countdown
6. **Testing**: Verify schedule berfungsi untuk berbagai skenario
