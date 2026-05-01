# QA Test Form — ADMIN Role

**Project:** IDEA LMS (Light)
**Role:** ADMIN
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

## 1. Authentication & Access

### 1.1 Login

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.1.1 | Login dengan email & password admin yang valid | Redirect ke dashboard admin | | |
| 1.1.2 | Login dengan password salah | Tampilkan error message | | |
| 1.1.3 | Login dengan email yang tidak terdaftar | Tampilkan error message | | |
| 1.1.4 | Login dengan akun teacher | Bisa login, redirect ke dashboard teacher (bukan admin) | | |
| 1.1.5 | Login dengan akun student | Bisa login, redirect ke dashboard student | | |
| 1.1.6 | Akses halaman admin tanpa login | Redirect ke halaman login | | |
| 1.1.7 | Akses halaman admin dengan session student | Redirect/403 Forbidden | | |
| 1.1.8 | Akses halaman admin dengan session teacher | Redirect/403 Forbidden | | |
| 1.1.9 | Logout admin | Session terhapus, redirect ke login | | |
| 1.1.10 | Session expiry setelah idle | Redirect ke login page | | |

### 1.2 Registration & Verification

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.2.1 | Register akun baru dengan role STUDENT | Akun terbuat, email verifikasi terkirim | | |
| 1.2.2 | Register dengan email yang sudah ada | Tampilkan error "email already exists" | | |
| 1.2.3 | Register dengan username yang sudah ada | Tampilkan error "username already exists" | | |
| 1.2.4 | Verifikasi email via link | Akun aktif, bisa login | | |
| 1.2.5 | Reset password via email | Link reset terkirim, password bisa diubah | | |

---

## 2. Dashboard Admin

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.1 | Tampilkan total classes di dashboard | Angka sesuai data database | | |
| 2.2 | Tampilkan total users di dashboard | Angka sesuai data database | | |
| 2.3 | Tampilkan total exit tickets di dashboard | Angka sesuai data database | | |
| 2.4 | Quick access ke halaman user management | Link berfungsi, redirect benar | | |
| 2.5 | Quick access ke halaman class management | Link berfungsi, redirect benar | | |
| 2.6 | Quick access ke halaman analytics | Link berfungsi, redirect benar | | |
| 2.7 | Loading state saat data dimuat | Skeleton/spinner tampil lalu hilang | | |
| 2.8 | Dashboard responsive di mobile | Layout tidak terpotong, bisa di-scroll | | |

---

## 3. User Management (`/admin/users`)

### 3.1 View Users

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.1.1 | Tampilkan daftar semua user | Semua user tercantum dengan data benar | | |
| 3.1.2 | Search user by nama | Hasil filter sesuai keyword | | |
| 3.1.3 | Search user by email | Hasil filter sesuai keyword | | |
| 3.1.4 | Filter user by role (STUDENT/TEACHER/ADMIN) | Hanya user dengan role terpilih tampil | | |
| 3.1.5 | Filter user by status (active/inactive) | Hanya user dengan status terpilih tampil | | |
| 3.1.6 | Pagination/scroll daftar user | Data load bertahap, tidak lag | | |
| 3.1.7 | Sort user by kolom (nama, email, role, tanggal) | Urutan berubah sesuai sort | | |

### 3.2 Create User

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.2.1 | Buat user baru dengan data lengkap | User terbuat, muncul di daftar | | |
| 3.2.2 | Buat user tanpa field wajib | Tampilkan validation error | | |
| 3.2.3 | Buat user dengan email duplikat | Tampilkan error "email already exists" | | |
| 3.2.4 | Buat user dengan username duplikat | Tampilkan error "username already exists" | | |
| 3.2.5 | Buat user dengan format email invalid | Tampilkan validation error | | |
| 3.2.6 | Buat user dengan password lemah | Tampilkan validation error (min length) | | |
| 3.2.7 | Buat user dengan role ADMIN | Apakah diperbolehkan? (cek business rule) | | |
| 3.2.8 | Buat user dengan role TEACHER | User terbuat dengan role TEACHER | | |
| 3.2.9 | Buat user dengan role STUDENT | User terbuat dengan role STUDENT | | |

### 3.3 Edit User

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.3.1 | Edit nama user | Nama berubah di database & UI | | |
| 3.3.2 | Edit email user | Email berubah, session tetap valid | | |
| 3.3.3 | Edit role user (STUDENT → TEACHER) | Role berubah, akses sesuai role baru | | |
| 3.3.4 | Edit role user (TEACHER → STUDENT) | Role berubah, teacher tidak bisa akses fitur teacher | | |
| 3.3.5 | Edit profile fields (phone, institution, dll) | Data berubah tersimpan | | |

### 3.4 Deactivate/Delete User

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.4.1 | Deactivate user aktif | Status user jadi inactive, user tidak bisa login | | |
| 3.4.2 | Reactivate user inactive | Status user jadi active, user bisa login lagi | | |
| 3.4.3 | Deactivate user yang sedang punya class aktif | Apakah ada peringatan? Soft delete bekerja? | | |
| 3.4.4 | Deactivate admin diri sendiri | Apakah dicegah? Atau allowed? | | |

---

## 4. Class Management (`/admin/classes`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.1 | Tampilkan semua class | Daftar class dengan data benar (nama, teacher, jumlah siswa) | | |
| 4.2 | Search class by nama | Hasil filter sesuai keyword | | |
| 4.3 | Filter class by status (active/inactive) | Hanya class dengan status terpilih tampil | | |
| 4.4 | Lihat detail class | Tampilkan info lengkap: siswa, lessons, exercises | | |
| 4.5 | Lihat enrollment statistics | Angka enrollment akurat | | |
| 4.6 | Akses class tanpa enrollment | Data tetap bisa dilihat oleh admin | | |

---

## 5. Backup & Restore (`/admin/backup`)

### 5.1 Backup

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.1.1 | Generate full backup | File backup terbuat, bisa didownload | | |
| 5.1.2 | Download backup file | File terdownload dengan format benar | | |
| 5.1.3 | Backup saat data besar (>1000 records) | Proses selesai tanpa timeout | | |
| 5.1.4 | Multiple backup secara bersamaan | Tidak ada conflict/corrupt | | |

### 5.2 Restore

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.2.1 | Restore dari backup valid | Data restored sesuai backup | | |
| 5.2.2 | Restore dari file invalid/corrupt | Tampilkan error message | | |
| 5.2.3 | Restore saat ada user aktif online | Apakah ada warning? Data consistency? | | |
| 5.2.4 | Cancel restore yang sedang berjalan | Proses berhenti, data tidak corrupt | | |

---

## 6. System Logs (`/admin/logs`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.1 | Tampilkan daftar system logs | Log terbaru tampil di atas | | |
| 6.2 | Filter log by level (info, warning, error) | Hanya log dengan level terpilih tampil | | |
| 6.3 | Search log by keyword | Hasil filter sesuai keyword | | |
| 6.4 | Filter log by date range | Hanya log dalam range tanggal tampil | | |
| 6.5 | Pagination log | Load bertahap tanpa lag | | |
| 6.6 | Log tercatat saat ada action (create user, dll) | Entry baru muncul di log | | |

---

## 7. Analytics (`/analytics`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.1 | Tampilkan analytics dashboard | Grafik dan angka tampil dengan benar | | |
| 7.2 | User engagement metrics akurat | Angka sesuai data real | | |
| 7.3 | Class performance data akurat | Angka sesuai data real | | |
| 7.4 | Filter analytics by date range | Data berubah sesuai range | | |
| 7.5 | Export analytics report | File terdownload dengan data benar | | |
| 7.6 | Heatmap activity tampil | Heatmap render dengan benar | | |
| 7.7 | Plotting/charts interaktif | Chart bisa di-interact (hover, zoom) | | |

---

## 8. Chat Analytics (`/classes/[id]/chat-statistics`)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.1 | Tampilkan statistik chat per class | Data jumlah pesan, partisipan akurat | | |
| 8.2 | Export chat data | File terdownload dengan data lengkap | | |
| 8.3 | Lihat detail pesan per student | Pesan yang dikirim student tercantum | | |
| 8.4 | Filter chat by tanggal | Hanya pesan dalam range tampil | | |

---

## 9. Security & Edge Cases

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 9.1 | SQL injection pada search field | Input di-escape, tidak ada injection | | |
| 9.2 | XSS pada input field user | Input di-sanitize, tidak ada script execution | | |
| 9.3 | CSRF pada form delete/deactivate | Token CSRF valid, request ditolak tanpa token | | |
| 9.4 | Rate limiting pada API endpoint | Request berlebihan ditolak (429) | | |
| 9.5 | Upload file berukuran besar pada backup | Handling error yang sesuai | | |
| 9.6 | Akses API admin langsung tanpa session | Return 401 Unauthorized | | |
| 9.7 | Concurrent edit user oleh 2 admin | Data tidak corrupt, ada handling conflict | | |

---

## Test Summary

| Section | Total Tests | Pass | Fail | Pass Rate |
|---------|-------------|------|------|-----------|
| 1. Auth & Access | 15 | | | |
| 2. Dashboard | 8 | | | |
| 3. User Management | 18 | | | |
| 4. Class Management | 6 | | | |
| 5. Backup & Restore | 8 | | | |
| 6. System Logs | 6 | | | |
| 7. Analytics | 7 | | | |
| 8. Chat Analytics | 4 | | | |
| 9. Security | 7 | | | |
| **TOTAL** | **79** | | | |

**Overall Verdict:** [ ] APPROVED [ ] NEEDS FIX [ ] BLOCKED

**Critical Issues Found:**
1. _______________
2. _______________
3. _______________

**Sign-off:**
- Tester: _______________ Date: _________
- Reviewer: _______________ Date: _________
