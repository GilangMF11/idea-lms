# QA Test Form — TEACHER Role

**Project:** IDEA LMS (Light)
**Role:** TEACHER
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
| 1.1 | Login dengan akun teacher valid | Redirect ke dashboard teacher | | |
| 1.2 | Akses halaman admin (/admin/*) | Redirect/403 Forbidden | | |
| 1.3 | Akses fitur teacher tanpa login | Redirect ke login page | | |
| 1.4 | Session timeout | Redirect ke login setelah idle | | |
| 1.5 | Login via Google OAuth (jika tersedia) | Berhasil login, data akun tersinkron | | |
| 1.6 | Logout teacher | Session terhapus, redirect ke login | | |

---

## 2. Teacher Dashboard

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.1 | Tampilkan jumlah classes yang diampu | Angka sesuai data database | | |
| 2.2 | Tampilkan jumlah total students | Angka akurat dari semua class | | |
| 2.3 | Tampilkan jumlah reading texts | Angka sesuai data database | | |
| 2.4 | Tampilkan jumlah exit tickets | Angka sesuai data database | | |
| 2.5 | Quick action: Create Class | Tombol redirect ke form create class | | |
| 2.6 | Quick action: Create Reading Text | Tombol redirect ke form create reading text | | |
| 2.7 | Quick action: Create Exit Ticket | Tombol redirect ke form create exercise | | |
| 2.8 | Recent activity feed | Tampilkan aktivitas terbaru siswa | | |
| 2.9 | Dashboard responsive di mobile | Layout tidak terpotong | | |

---

## 3. Class Management

### 3.1 Create Class (`/classes/create`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.1.1 | Buat class dengan data lengkap | Class terbuat, muncul di daftar | | |
| 3.1.2 | Buat class tanpa nama | Tampilkan validation error | | |
| 3.1.3 | Buat class dengan nama duplikat | Tampilkan error atau generate code unik | | |
| 3.1.4 | Buat class dengan deskripsi panjang (>500 chars) | Tersimpan atau truncation | | |
| 3.1.5 | Class code auto-generate | Code unik ter-generate otomatis | | |
| 3.1.6 | Buat class tanpa deskripsi | Class terbuat (deskripsi optional) | | |

### 3.2 Manage Class (`/classes/[id]/manage`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.2.1 | Lihat detail class | Info class lengkap: nama, deskripsi, code | | |
| 3.2.2 | Edit nama class | Nama berubah tersimpan | | |
| 3.2.3 | Edit deskripsi class | Deskripsi berubah tersimpan | | |
| 3.2.4 | Deactivate class | Class jadi inactive, siswa tidak bisa akses | | |
| 3.2.5 | Reactivate class | Class jadi active lagi | | |
| 3.2.6 | Lihat class code untuk enrollment | Code tampil, bisa di-copy | | |
| 3.2.7 | Akses class milik teacher lain | Tidak bisa akses / 403 | | |

### 3.3 Student Roster (`/classes/[id]/students`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.3.1 | Lihat daftar siswa di class | Semua siswa terdaftar tampil | | |
| 3.3.2 | Search siswa by nama | Filter berfungsi | | |
| 3.3.3 | Remove siswa dari class | Siswa terhapus dari class, data submission tetap ada | | |
| 3.3.4 | Lihat statistik siswa | Informasi partisipasi dan progress siswa | | |

---

## 4. Lesson Management

### 4.1 Create & Manage Lessons

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.1.1 | Buat lesson baru di dalam class | Lesson terbuat dengan urutan benar | | |
| 4.1.2 | Edit judul dan deskripsi lesson | Perubahan tersimpan | | |
| 4.1.3 | Set schedule/tanggal lesson | Tanggal tersimpan, tampil di UI | | |
| 4.1.4 | Reorder lesson (drag & drop) | Urutan berubah | | |
| 4.1.5 | Deactivate lesson | Lesson tidak tampil untuk siswa | | |
| 4.1.6 | Delete lesson | Lesson terhapus, reading texts & exercises terkait juga terhapus (cascade) | | |

---

## 5. Reading Text Management

### 5.1 Create Reading Text (`/reading-texts/create`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.1.1 | Buat reading text dengan konten HTML | Konten tersimpan, render benar | | |
| 5.1.2 | Upload file PDF sebagai reading text | PDF ter-upload, bisa di-view oleh siswa | | |
| 5.1.3 | Buat reading text tanpa konten dan tanpa PDF | Tampilkan validation error | | |
| 5.1.4 | Set timer duration pada reading text | Timer tersimpan | | |
| 5.1.5 | Set openAt/closeAt schedule | Schedule tersimpan, akses sesuai jadwal | | |
| 5.1.6 | Assign reading text ke group tertentu | Hanya group terpilih yang bisa akses | | |
| 5.1.7 | Upload PDF berukuran besar (>10MB) | Upload berhasil atau error message jelas | | |
| 5.1.8 | Upload file bukan PDF | Tampilkan error "format tidak didukung" | | |
| 5.1.9 | Set author dan source | Metadata tersimpan | | |

### 5.2 Edit & Manage Reading Text

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.2.1 | Edit konten reading text | Konten berubah tersimpan | | |
| 5.2.2 | Ganti PDF yang sudah diupload | PDF baru menggantikan yang lama | | |
| 5.2.3 | Ubah timer duration | Timer baru berlaku | | |
| 5.2.4 | Ubah schedule openAt/closeAt | Schedule baru berlaku | | |
| 5.2.5 | Deactivate reading text | Tidak tampil untuk siswa | | |
| 5.2.6 | Hapus reading text yang sudah ada submission | Konfirmasi sebelum hapus atau soft delete | | |

---

## 6. Exercise / Exit Ticket Management

### 6.1 Create Exercise (`/exercises/create`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.1.1 | Buat exercise INDIVIDUAL | Exercise terbuat dengan type INDIVIDUAL | | |
| 6.1.2 | Buat exercise GROUP | Exercise terbuat dengan type GROUP | | |
| 6.1.3 | Set due date pada exercise | Due date tersimpan | | |
| 6.1.4 | Set timer duration | Timer tersimpan, auto-submit aktif | | |
| 6.1.5 | Set minWords dan maxWords | Constraint tersimpan | | |
| 6.1.6 | Buat exercise tanpa judul | Tampilkan validation error | | |
| 6.1.7 | Link exercise ke reading text | Relasi terbentuk | | |
| 6.1.8 | Link exercise ke lesson | Relasi terbentuk | | |
| 6.1.9 | Buat exercise tanpa deskripsi | Tersimpan (deskripsi optional) | | |

### 6.2 Timer & Auto-submit

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.2.1 | Timer countdown berjalan saat siswa mulai | Countdown visible, berkurang tiap detik | | |
| 6.2.2 | Auto-submit saat waktu habis (autoSubmitOnTimeout=true) | Jawaban otomatis disubmit | | |
| 6.2.3 | Siswa bisa pause timer (jika diizinkan) | Timer berhenti, bisa resume | | |
| 6.2.4 | Timer persist saat refresh page | Sisa waktu tetap sama | | |

### 6.3 Submissions & Grading

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.3.1 | Lihat semua submission per exercise | Daftar submission tampil lengkap | | |
| 6.3.2 | Lihat submission yang belum dinilai | Filter "ungraded" berfungsi | | |
| 6.3.3 | Beri score pada submission | Score tersimpan | | |
| 6.3.4 | Beri feedback pada submission | Feedback tersimpan, siswa bisa lihat | | |
| 6.3.5 | AI feedback generation | AI feedback ter-generate dan relevan | | |
| 6.3.6 | Edit score/feedback yang sudah diberikan | Perubahan tersimpan | | |
| 6.3.7 | Export semua submission | File CSV/PDF terdownload | | |

---

## 7. Group Management

### 7.1 Create & Manage Groups

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.1.1 | Buat group baru dalam class | Group terbuat | | |
| 7.1.2 | Tambah siswa ke group | Siswa masuk ke group | | |
| 7.1.3 | Hapus siswa dari group | Siswa keluar dari group | | |
| 7.1.4 | Set role group member (leader/member) | Role tersimpan | | |
| 7.1.5 | Assign group ke lesson tertentu | Group terkait ke lesson | | |
| 7.1.6 | Buat group global (tanpa lesson) | Group terbuat di level class | | |
| 7.1.7 | Hapus group | Group dan membership terhapus | | |
| 7.1.8 | Siswa berada di lebih dari 1 group dalam class yang sama | Apakah diperbolehkan? | | |

---

## 8. Chat & Discussion System

### 8.1 Chat Room

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.1.1 | Kirim pesan text di chat class | Pesan tampil di chat room | | |
| 8.1.2 | Kirim pesan audio di chat | Audio ter-upload dan bisa diputar | | |
| 8.1.3 | Reply/quote pesan lain | Reply terkait ke pesan asli | | |
| 8.1.4 | Chat type (asking/answering/idea/disputing) | Type tersimpan dan terlihat | | |
| 8.1.5 | Lihat chat history | Pesan lama tampil dengan urutan benar | | |
| 8.1.6 | Pagination/load more chat | Pesan lama bisa di-load | | |

### 8.2 Annotation Discussion

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.2.1 | Buat annotation pada reading text (text selection) | Highlight dan annotation tersimpan | | |
| 8.2.2 | Buat annotation pada PDF | Annotation pada PDF tersimpan | | |
| 8.2.3 | Reply pada annotation | Reply muncul di thread annotation | | |
| 8.2.4 | Toggle annotation public/private | Status berubah | | |
| 8.2.5 | Hapus annotation | Annotation terhapus | | |

### 8.3 Chat Statistics (`/classes/[id]/chat-statistics`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.3.1 | Tampilkan statistik chat class | Data akurat: jumlah pesan, aktif user | | |
| 8.3.2 | Export chat data | File terdownload lengkap | | |
| 8.3.3 | Lihat detail pesan per student | History pesan per student tampil | | |
| 8.3.4 | Filter by date range | Data filter sesuai range | | |

---

## 9. Writing & Peer Review

### 9.1 Writing Outlines & Drafts

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 9.1.1 | Lihat writing outline siswa (mind map) | Mind map render dengan benar | | |
| 9.1.2 | Lihat writing draft siswa | Konten draft tampil | | |
| 9.1.3 | Lihat peer review pada draft | Feedback dari peer tampil | | |
| 9.1.4 | Lihat revision history | Semua revision tampil dengan status | | |

### 9.2 Final Products & Revision

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 9.2.1 | Review submission revisi dari siswa | Detail revisi tampil | | |
| 9.2.2 | Approve revisi (status → APPROVED) | Status berubah | | |
| 9.2.3 | Reject revisi dengan feedback (status → REJECTED) | Status berubah, feedback tersimpan | | |
| 9.2.4 | Mark revisi sebagai FINISHED | Status berubah | | |
| 9.2.5 | Lihat final product siswa | Konten final product tampil | | |
| 9.2.6 | Export final products class | File terdownload | | |

---

## 10. Analytics

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 10.1 | Tampilkan analytics personal teacher | Grafik dan angka tampil | | |
| 10.2 | Class performance per student | Data akurat per student | | |
| 10.3 | Filter analytics by class | Data berubah sesuai class | | |
| 10.4 | Filter analytics by date range | Data berubah sesuai range | | |
| 10.5 | Export analytics | File terdownload | | |
| 10.6 | Student activity tracking | Log aktivitas siswa tampil | | |
| 10.7 | Heatmap activity | Heatmap render benar | | |

---

## 11. Export & Reporting

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 11.1 | Export data class (semua data) | File ZIP/PDF terdownload lengkap | | |
| 11.2 | Export student grades | File CSV/PDF terdownload | | |
| 11.3 | Export dengan data kosong (class baru) | File tetap ter-generate tanpa error | | |
| 11.4 | Export class dengan data besar | Tidak timeout, file terdownload | | |

---

## 12. Notifications

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 12.1 | Terima notifikasi saat ada submission baru | Notifikasi muncul | | |
| 12.2 | Klik notifikasi → redirect ke halaman terkait | Redirect benar | | |
| 12.3 | Mark notifikasi sebagai read | Status berubah | | |
| 12.4 | Mark all notifikasi sebagai read | Semua status berubah | | |

---

## 13. Security & Edge Cases

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 13.1 | Akses class milik teacher lain | Return 403 / redirect | | |
| 13.2 | Edit exercise milik teacher lain | Return 403 / redirect | | |
| 13.3 | XSS pada konten reading text (HTML) | Input di-sanitize | | |
| 13.4 | XSS pada chat message | Input di-sanitize | | |
| 13.5 | Upload file berbahaya (executable) | Ditolak oleh system | | |
| 13.6 | Rate limiting pada chat | Spam dicegah | | |
| 13.7 | Input teks sangat panjang pada exercise description | Tersimpan tanpa error | | |

---

## Test Summary

| Section | Total Tests | Pass | Fail | Pass Rate |
|---------|-------------|------|------|-----------|
| 1. Auth & Access | 6 | | | |
| 2. Dashboard | 9 | | | |
| 3. Class Management | 17 | | | |
| 4. Lesson Management | 6 | | | |
| 5. Reading Text | 15 | | | |
| 6. Exercise/Exit Ticket | 16 | | | |
| 7. Group Management | 8 | | | |
| 8. Chat & Discussion | 10 | | | |
| 9. Writing & Peer Review | 10 | | | |
| 10. Analytics | 7 | | | |
| 11. Export | 4 | | | |
| 12. Notifications | 4 | | | |
| 13. Security | 7 | | | |
| **TOTAL** | **119** | | | |

**Overall Verdict:** [ ] APPROVED [ ] NEEDS FIX [ ] BLOCKED

**Critical Issues Found:**
1. _______________
2. _______________
3. _______________

**Sign-off:**
- Tester: _______________ Date: _________
- Reviewer: _______________ Date: _________
