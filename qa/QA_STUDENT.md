# QA Test Form — STUDENT Role

**Project:** IDEA LMS (Light)
**Role:** STUDENT
**Tester:** _______________
**Date:** _______________
**Environment:** [ ] Development [ ] Staging [ ] Production
**Browser:** _______________

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Pass |
| ❌ | Fail |
| ⚠️ | Partial / Has Issue |
| N/A | Not Applicable |

---

## 1. Authentication & Access Control

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.1 | Login dengan akun student valid | Redirect ke dashboard student | | |
| 1.2 | Login dengan password salah | Tampilkan error message | | |
| 1.3 | Login dengan akun belum verifikasi email | Tampilkan pesan "verifikasi email dulu" | | |
| 1.4 | Akses halaman admin (/admin/*) | Redirect/403 Forbidden | | |
| 1.5 | Akses fitur teacher (create class, dll) | Redirect/403 Forbidden | | |
| 1.6 | Login via Google OAuth | Berhasil login, data profil tersinkron | | |
| 1.7 | Logout student | Session terhapus, redirect ke login | | |
| 1.8 | Session timeout | Redirect ke login setelah idle | | |
| 1.9 | Login dengan akun yang sudah di-deactivate | Tampilkan error "akun tidak aktif" | | |

---

## 2. Student Dashboard

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.1 | Tampilkan jumlah enrolled classes | Angka sesuai data database | | |
| 2.2 | Tampilkan jumlah reading texts | Angka sesuai data database | | |
| 2.3 | Tampilkan jumlah exit tickets | Angka sesuai data database | | |
| 2.4 | Quick action: Browse Classes | Tombol redirect ke browse classes | | |
| 2.5 | Quick action: My Profile | Tombol redirect ke halaman profil | | |
| 2.6 | Recent exit tickets dengan status | Daftar exit ticket terbaru + status (Not Started / Submitted / Graded / Overdue) | | |
| 2.7 | Notifikasi pesan/message | Badge/icon notifikasi tampil | | |
| 2.8 | Dashboard responsive di mobile | Layout tidak terpotong | | |
| 2.9 | Dashboard saat belum enroll class manapun | Tampilkan empty state dengan CTA | | |

---

## 3. Class Enrollment & Browsing

### 3.1 Browse Classes (`/classes/browse`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.1.1 | Tampilkan daftar class yang tersedia | Class aktif dan bisa di-enroll tampil | | |
| 3.1.2 | Search class by nama | Hasil filter sesuai keyword | | |
| 3.1.3 | Enroll ke class dengan class code | Student masuk ke class, muncul di "My Classes" | | |
| 3.1.4 | Enroll ke class yang sudah di-enroll sebelumnya | Tampilkan pesan "sudah terdaftar" | | |
| 3.1.5 | Enroll ke class yang inactive | Class tidak tampil / error saat enroll | | |
| 3.1.6 | Enroll dengan class code yang salah | Tampilkan error "class tidak ditemukan" | | |
| 3.1.7 | Browse saat tidak ada class tersedia | Tampilkan empty state | | |

### 3.2 My Classes (`/my-classes`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.2.1 | Tampilkan semua class yang di-enroll | Daftar class lengkap | | |
| 3.2.2 | Search class | Filter berfungsi | | |
| 3.2.3 | Klik class → masuk ke detail class | Redirect ke halaman class | | |
| 3.2.4 | Leave/unenroll dari class | Student keluar dari class (jika diizinkan) | | |
| 3.2.5 | Sort class (by nama, tanggal join) | Urutan berubah | | |

---

## 4. Reading Text

### 4.1 View Reading Text (`/reading-texts/[id]`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.1.1 | Baca reading text HTML | Konten render dengan benar (format, gambar, dll) | | |
| 4.1.2 | Baca reading text PDF | PDF viewer tampil, bisa scroll page | | |
| 4.1.3 | Akses reading text yang belum openAt (scheduled) | Tampilkan pesan "belum tersedia" | | |
| 4.1.4 | Akses reading text yang sudah closeAt | Tampilkan pesan "sudah closed" | | |
| 4.1.5 | Akses reading text yang bukan milik class student | Return 403 / redirect | | |
| 4.1.6 | Akses reading text dari group yang bukan member-nya | Tidak tampil / return 403 | | |
| 4.1.7 | Navigasi halaman PDF (prev/next page) | Berpindah halaman dengan benar | | |
| 4.1.8 | Zoom in/out pada PDF | Zoom berfungsi | | |

### 4.2 Reading Timer

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.2.1 | Timer countdown dimulai saat buka reading text | Countdown visible, berjalan | | |
| 4.2.2 | Timer persist saat refresh halaman | Sisa waktu tetap sama | | |
| 4.2.3 | Timer selesai (waktu habis) | Reading text tidak bisa diakses lagi atau warning tampil | | |
| 4.2.4 | Pause timer (jika fitur ada) | Timer berhenti sementara | | |
| 4.2.5 | Resume timer yang di-pause | Timer lanjut dari sisa waktu | | |

---

## 5. Annotation

### 5.1 Create & Manage Annotations

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.1.1 | Select text pada reading text → buat annotation | Highlight tampil, form annotation muncul | | |
| 5.1.2 | Simpan annotation dengan konten | Annotation tersimpan | | |
| 5.1.3 | Buat annotation pada halaman PDF | Annotation pada PDF tersimpan | | |
| 5.1.4 | Buat annotation tanpa konten | Tampilkan validation error | | |
| 5.1.5 | Edit annotation yang sudah dibuat | Konten berubah tersimpan | | |
| 5.1.6 | Hapus annotation milik sendiri | Annotation terhapus | | |
| 5.1.7 | Hapus annotation milik student lain | Tidak bisa (hanya bisa hapus milik sendiri) | | |
| 5.1.8 | Set annotation sebagai private | Hanya pembuat yang bisa lihat | | |
| 5.1.9 | Lihat public annotation dari student lain | Annotation public tampil | | |
| 5.1.10 | Select text dengan highlight warna berbeda | Warna tersimpan dan tampil | | |

---

## 6. Exercise / Exit Ticket

### 6.1 View & Submit Exercises

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.1.1 | Lihat daftar exit tickets yang assigned | Semua exercise tampil dengan status | | |
| 6.1.2 | Lihat detail exercise (instruksi, due date, constraints) | Info lengkap tampil | | |
| 6.1.3 | Submit jawaban exercise INDIVIDUAL | Jawaban tersimpan, status → Submitted | | |
| 6.1.4 | Submit jawaban exercise GROUP | Jawaban tersimpan untuk group | | |
| 6.1.5 | Submit setelah due date | Tampilkan "sudah lewat deadline" / tidak bisa submit | | |
| 6.1.6 | Submit jawaban kosong | Tampilkan validation error | | |
| 6.1.7 | Submit jawaban kurang dari minWords | Tampilkan warning "terlalu pendek" | | |
| 6.1.8 | Submit jawaban lebih dari maxWords | Tampilkan warning "terlalu panjang" | | |
| 6.1.9 | Re-submit setelah sudah submit | Apakah bisa? Jawaban lama ter-overwrite atau tidak? | | |
| 6.1.10 | Lihat exercise yang belum dikerjakan | Status "Not Started" tampil | | |

### 6.2 Exercise Timer

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.2.1 | Timer countdown dimulai saat mulai exercise | Countdown visible, berjalan | | |
| 6.2.2 | Auto-submit saat waktu habis | Jawaban ter-submit otomatis | | |
| 6.2.3 | Timer persist saat refresh | Sisa waktu tetap sama | | |
| 6.2.4 | Timer tidak bisa di-cheat (ubah jam device) | Server-side validation, waktu akurat | | |
| 6.2.5 | Pause timer | Timer berhenti sementara | | |

### 6.3 View Grades & Feedback

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.3.1 | Lihat score setelah dinilai teacher | Score tampil | | |
| 6.3.2 | Lihat feedback teacher | Feedback tampil | | |
| 6.3.3 | Lihat AI feedback | AI feedback tampil dan relevan | | |
| 6.3.4 | Status "Graded" setelah dinilai | Status berubah jadi Graded | | |
| 6.3.5 | Belum dinilai → status tetap "Submitted" | Status tidak berubah sampai dinilai | | |

---

## 7. Writing Activities

### 7.1 Writing Outline (Mind Map)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.1.1 | Buat writing outline baru | Mind map terbuat | | |
| 7.1.2 | Tambah node di mind map | Node baru tampil | | |
| 7.1.3 | Edit node di mind map | Konten berubah | | |
| 7.1.4 | Hapus node di mind map | Node terhapus | | |
| 7.1.5 | Simpan mind map | Data tersimpan, persist setelah refresh | | |

### 7.2 Writing Draft

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.2.1 | Buat writing draft dari outline | Draft terbuat terkait ke outline | | |
| 7.2.2 | Buat writing draft tanpa outline | Draft terbuat (standalone) | | |
| 7.2.3 | Edit konten draft | Konten berubah tersimpan | | |
| 7.2.4 | Auto-save draft | Perubahan tersimpan otomatis | | |

### 7.3 Peer Review

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.3.1 | Lihat draft yang harus di-review | Draft dari peer tampil | | |
| 7.3.2 | Submit peer review (PERSUASIVE type) | Review tersimpan | | |
| 7.3.3 | Submit peer review (INTERACTIVE type) | Review tersimpan | | |
| 7.3.4 | Beri rating (1-5) pada peer review | Rating tersimpan | | |
| 7.3.5 | Beri komentar pada peer review | Komentar tersimpan | | |
| 7.3.6 | Submit review tanpa komentar | Tampilkan validation error | | |
| 7.3.7 | Lihat peer review yang diterima | Review dari peer tampil | | |

### 7.4 Revision

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.4.1 | Submit revisi berdasarkan feedback | Revisi tersimpan, status PENDING | | |
| 7.4.2 | Lihat feedback revisi dari teacher | Feedback tampil | | |
| 7.4.3 | Lihat status revisi (PENDING/APPROVED/REJECTED/FINISHED) | Status akurat | | |
| 7.4.4 | Komentar pada revisi | Komentar tersimpan | | |

### 7.5 Final Product

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.5.1 | Submit final product | Final product tersimpan | | |
| 7.5.2 | Lihat final product yang sudah disubmit | Konten tampil | | |
| 7.5.3 | Edit final product sebelum deadline | Perubahan tersimpan | | |

---

## 8. Chat & Discussion

### 8.1 Class Chat

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.1.1 | Kirim pesan text di chat class | Pesan tampil di chat room | | |
| 8.1.2 | Kirim pesan audio | Audio ter-upload, bisa diputar | | |
| 8.1.3 | Pilih chat type (asking/answering/idea/disputing) | Type tersimpan dan terlihat | | |
| 8.1.4 | Lihat chat history | Pesan lama tampil | | |
| 8.1.5 | Chat pada class yang belum di-enroll | Tidak bisa akses | | |
| 8.1.6 | Kirim pesan kosong | Tampilkan validation error | | |
| 8.1.7 | Emoji pada chat message | Emoji tampil dengan benar | | |

### 8.2 Annotation Discussion

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.2.1 | Reply pada annotation | Reply muncul di thread | | |
| 8.2.2 | Reply pada annotation milik student lain (public) | Bisa reply | | |
| 8.2.3 | Reply pada annotation private milik orang lain | Tidak bisa lihat/reply | | |
| 8.2.4 | Kirim emoji reaction pada annotation | Emoji tersimpan | | |

---

## 9. Submissions Overview (`/submissions`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 9.1 | Lihat semua submission yang sudah dibuat | Daftar submission tampil lengkap | | |
| 9.2 | Filter submission by status (Not Started / Submitted / Graded / Overdue) | Filter berfungsi | | |
| 9.3 | Filter submission by class | Filter berfungsi | | |
| 9.4 | Sort submission by tanggal | Urutan berubah | | |
| 9.5 | Klik submission → lihat detail | Redirect ke detail submission | | |
| 9.6 | Pagination daftar submission | Load bertahap | | |

---

## 10. Profile Management

### 10.1 View Profile (`/profile`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 10.1.1 | Lihat data profil lengkap | Nama, email, role, dll tampil | | |
| 10.1.2 | Lihat avatar/foto profil | Avatar tampil | | |

### 10.2 Edit Profile

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 10.2.1 | Edit nama depan & belakang | Nama berubah tersimpan | | |
| 10.2.2 | Edit phone number | Phone berubah tersimpan | | |
| 10.2.3 | Edit institution, program, semester | Data berubah tersimpan | | |
| 10.2.4 | Edit province & city | Data berubah tersimpan | | |
| 10.2.5 | Upload avatar baru | Avatar berubah | | |
| 10.2.6 | Upload avatar format tidak didukung | Tampilkan error | | |
| 10.2.7 | Edit email | Email berubah, verifikasi ulang? | | |
| 10.2.8 | Change password | Password berubah, re-login berhasil | | |

### 10.3 Complete Profile (`/complete-profile`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 10.3.1 | Lihat form complete-profile untuk user baru | Form tampil dengan field kosong | | |
| 10.3.2 | Isi semua field dan submit | Profil tersimpan lengkap | | |
| 10.3.3 | Skip complete-profile | Apakah wajib? Bisa di-skip? | | |

---

## 11. Analytics (`/analytics`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 11.1 | Tampilkan personal analytics | Grafik dan angka progress tampil | | |
| 11.2 | Progress per class | Data akurat per class | | |
| 11.3 | Submission completion rate | Angka akurat | | |
| 11.4 | Reading progress tracking | Data reading activity tampil | | |
| 11.5 | Filter analytics by date range | Data berubah sesuai range | | |

---

## 12. Notifications

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 12.1 | Terima notifikasi exercise baru | Notifikasi muncul | | |
| 12.2 | Terima notifikasi nilai/feedback baru | Notifikasi muncul | | |
| 12.3 | Terima notifikasi deadline mendekat | Notifikasi muncul sebelum deadline | | |
| 12.4 | Klik notifikasi → redirect ke halaman terkait | Redirect benar | | |
| 12.5 | Mark notifikasi sebagai read | Status berubah | | |
| 12.6 | Mark all as read | Semua berubah | | |
| 12.7 | Badge jumlah notifikasi unread | Angka sesuai | | |

---

## 13. Security & Edge Cases

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 13.1 | Akses API submission student lain | Return 403 | | |
| 13.2 | Submit jawaban untuk student lain | Return 403 | | |
| 13.3 | Akses reading text di class yang belum enroll | Return 403 | | |
| 13.4 | XSS pada input chat | Input di-sanitize | | |
| 13.5 | XSS pada annotation | Input di-sanitize | | |
| 13.6 | XSS pada exercise submission | Input di-sanitize | | |
| 13.7 | Submit jawaban sangat panjang (>10.000 chars) | Tersimpan atau error message jelas | | |
| 13.8 | Upload audio file berukuran besar | Handling error yang sesuai | | |
| 13.9 | Double submit (klik tombol 2x cepat) | Hanya 1 submission terbuat | | |
| 13.10 | Back/forward browser saat timer berjalan | Timer tetap akurat | | |

---

## 14. Responsive & Cross-Browser

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 14.1 | Tampilan di Chrome (latest) | Layout dan fungsi normal | | |
| 14.2 | Tampilan di Firefox (latest) | Layout dan fungsi normal | | |
| 14.3 | Tampilan di Safari (latest) | Layout dan fungsi normal | | |
| 14.4 | Tampilan di mobile Chrome (Android) | Layout responsive, touch berfungsi | | |
| 14.5 | Tampilan di mobile Safari (iOS) | Layout responsive, touch berfungsi | | |
| 14.6 | Reading text PDF di mobile | PDF readable, bisa scroll | | |
| 14.7 | Chat di mobile | Input dan pesan tampil benar | | |
| 14.8 | Timer countdown di mobile | Timer tampil dan berjalan | | |

---

## Test Summary

| Section | Total Tests | Pass | Fail | Pass Rate |
|---------|-------------|------|------|-----------|
| 1. Auth & Access | 9 | | | |
| 2. Dashboard | 9 | | | |
| 3. Class Enrollment | 12 | | | |
| 4. Reading Text | 13 | | | |
| 5. Annotation | 10 | | | |
| 6. Exercise/Exit Ticket | 15 | | | |
| 7. Writing Activities | 18 | | | |
| 8. Chat & Discussion | 11 | | | |
| 9. Submissions Overview | 6 | | | |
| 10. Profile Management | 11 | | | |
| 11. Analytics | 5 | | | |
| 12. Notifications | 7 | | | |
| 13. Security | 10 | | | |
| 14. Responsive | 8 | | | |
| **TOTAL** | **144** | | | |

**Overall Verdict:** [ ] APPROVED [ ] NEEDS FIX [ ] BLOCKED

**Critical Issues Found:**
1. _______________
2. _______________
3. _______________

**Sign-off:**
- Tester: _______________ Date: _________
- Reviewer: _______________ Date: _________
