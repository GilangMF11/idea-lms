# QA Test Form — SHARED Features (All Roles)

**Project:** IDEA LMS (Light)
**Role:** All (ADMIN, TEACHER, STUDENT)
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

## 1. Registration & Login

### 1.1 Registration

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.1.1 | Register dengan data lengkap (nama, email, username, password) | Akun terbuat, email verifikasi terkirim | | |
| 1.1.2 | Register tanpa field wajib | Tampilkan validation error per field | | |
| 1.1.3 | Register dengan email sudah terdaftar | Error "email already exists" | | |
| 1.1.4 | Register dengan username sudah terdaftar | Error "username already exists" | | |
| 1.1.5 | Register dengan format email invalid | Validation error | | |
| 1.1.6 | Register dengan password < minimum length | Validation error | | |
| 1.1.7 | Register dengan password tidak match (confirm password) | Validation error | | |
| 1.1.8 | Register via Google OAuth | Akun terbuat, data dari Google tersinkron | | |
| 1.1.9 | Register → verifikasi email via link | Akun aktif, bisa login | | |
| 1.1.10 | Verifikasi dengan link expired | Tampilkan pesan "link expired", kirim ulang | | |
| 1.1.11 | Kirim ulang email verifikasi | Email baru terkirim | | |

### 1.2 Login

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.2.1 | Login dengan email & password benar | Redirect ke dashboard sesuai role | | |
| 1.2.2 | Login dengan email benar, password salah | Error "invalid credentials" | | |
| 1.2.3 | Login dengan email tidak terdaftar | Error "invalid credentials" | | |
| 1.2.4 | Login dengan akun belum verifikasi email | Error/Prompt untuk verifikasi | | |
| 1.2.5 | Login via Google OAuth | Berhasil, redirect ke dashboard | | |
| 1.2.6 | Login → redirect sesuai role | ADMIN → admin dashboard, TEACHER → teacher dashboard, STUDENT → student dashboard | | |
| 1.2.7 | "Remember me" / persistent session | Session bertahan setelah browser ditutup | | |
| 1.2.8 | Rate limiting pada login gagal berturut-turut | Account lock / throttling setelah N gagal | | |

### 1.3 Password Reset

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.3.1 | Request reset password dengan email valid | Email reset terkirim | | |
| 1.3.2 | Request reset password dengan email tidak terdaftar | Tidak bocor info (pesan generik) | | |
| 1.3.3 | Klik link reset password | Form password baru tampil | | |
| 1.3.4 | Submit password baru valid | Password berubah, bisa login baru | | |
| 1.3.5 | Reset link sudah expired | Tampilkan pesan "link expired" | | |
| 1.3.6 | Reset link sudah pernah dipakai | Tampilkan pesan "link sudah digunakan" | | |

---

## 2. Navigation & Layout

### 2.1 Sidebar / Navigation Menu

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.1.1 | Menu sesuai role yang login | ADMIN: admin menu, TEACHER: teacher menu, STUDENT: student menu | | |
| 2.1.2 | Klik menu item → redirect ke halaman benar | Halaman sesuai terbuka | | |
| 2.1.3 | Active menu item di-highlight | Menu halaman aktif ter-highlight | | |
| 2.1.4 | Collapse/expand sidebar (jika ada) | Toggle berfungsi | | |
| 2.1.5 | Mobile: hamburger menu | Menu terbuka/tertutup | | |

### 2.2 Layout & Responsive

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.2.1 | Desktop layout (1280px+) | Semua elemen tampil benar | | |
| 2.2.2 | Tablet layout (768px - 1279px) | Layout adapt, tidak ada overflow | | |
| 2.2.3 | Mobile layout (<768px) | Layout adapt, touch-friendly | | |
| 2.2.4 | Scroll pada konten panjang | Smooth scroll, header tetap fixed | | |
| 2.2.5 | Loading state / skeleton | Skeleton tampil saat data loading | | |

### 2.3 Error Pages

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.3.1 | 404 page untuk URL tidak ada | Tampilkan halaman 404 yang user-friendly | | |
| 2.3.2 | 403 page untuk akses dilarang | Tampilkan halaman 403 | | |
| 2.3.3 | 500 page untuk server error | Tampilkan halaman error yang informatif | | |
| 2.3.4 | Network error / offline | Tampilkan pesan "no internet" | | |

---

## 3. Profile Management (`/profile`)

### 3.1 View Profile

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.1.1 | Lihat profil sendiri | Semua data tampil: nama, email, role, avatar, dll | | |
| 3.1.2 | Avatar default untuk user baru | Default avatar tampil | | |

### 3.2 Edit Profile

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.2.1 | Edit nama depan & belakang | Berubah tersimpan | | |
| 3.2.2 | Edit phone number | Berubah tersimpan | | |
| 3.2.3 | Edit institution & program | Berubah tersimpan | | |
| 3.2.4 | Edit semester | Berubah tersimpan | | |
| 3.2.5 | Edit province & city | Berubah tersimpan | | |
| 3.2.6 | Upload avatar baru (format valid) | Avatar berubah | | |
| 3.2.7 | Upload avatar format invalid | Error message | | |
| 3.2.8 | Upload avatar ukuran besar (>2MB) | Error atau compress | | |
| 3.2.9 | Change password (masukkan old + new) | Password berubah | | |
| 3.2.10 | Change password dengan old password salah | Error message | | |

---

## 4. Notifications System

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.1 | Badge jumlah notifikasi unread | Angka sesuai jumlah unread | | |
| 4.2 | Klik icon notifikasi → dropdown list | Daftar notifikasi tampil | | |
| 4.3 | Klik notifikasi → redirect ke konteks terkait | Redirect ke halaman yang benar | | |
| 4.4 | Mark single notifikasi sebagai read | Status berubah, badge berkurang | | |
| 4.5 | Mark all notifikasi sebagai read | Semua berubah, badge = 0 | | |
| 4.6 | Notifikasi by type: info | Icon dan warna sesuai type "info" | | |
| 4.7 | Notifikasi by type: success | Icon dan warna sesuai type "success" | | |
| 4.8 | Notifikasi by type: warning | Icon dan warna sesuai type "warning" | | |
| 4.9 | Notifikasi by type: error | Icon dan warna sesuai type "error" | | |
| 4.10 | Pagination/load more notifikasi | Notifikasi lama bisa di-load | | |
| 4.11 | Notifikasi ter-generate saat event terjadi | Contoh: assignment baru, grade baru, dll | | |

---

## 5. Search & Filtering

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.1 | Search global (jika ada) | Hasil relevan tampil | | |
| 5.2 | Filter daftar by status | Filter berfungsi | | |
| 5.3 | Filter daftar by date range | Filter berfungsi | | |
| 5.4 | Filter daftar by keyword | Filter berfungsi | | |
| 5.5 | Combine multiple filters | Semua filter aktif bersamaan | | |
| 5.6 | Clear filter / reset | Kembali ke tampilan default | | |
| 5.7 | Search dengan special characters | Tidak error, handle dengan benar | | |
| 5.8 | Search dengan input kosong | Tampilkan semua data | | |

---

## 6. Export & Download

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.1 | Export data ke PDF | File PDF terdownload, konten benar | | |
| 6.2 | Export data ke CSV/Excel | File terdownload, data akurat | | |
| 6.3 | Export data ke ZIP (multi-file) | File ZIP terdownload, isi lengkap | | |
| 6.4 | Export dengan data kosong | File tetap ter-generate (empty) | | |
| 6.5 | Export dengan data besar | Tidak timeout, file terdownload | | |
| 6.6 | Cancel export yang sedang berjalan | Proses berhenti | | |

---

## 7. Performance & Load

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 7.1 | Halaman dashboard load time | < 3 detik | | |
| 7.2 | Halaman daftar data (100+ records) load time | < 3 detik | | |
| 7.3 | Upload file (PDF, gambar) response time | < 10 detik | | |
| 7.4 | Submit form response time | < 3 detik | | |
| 7.5 | Search/filter response time | < 2 detik | | |
| 7.6 | Export data response time | < 15 detik | | |
| 7.7 | Memory usage saat browsing lama | Tidak ada memory leak (tab tidak crash) | | |

---

## 8. Accessibility

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 8.1 | Tab navigation (keyboard only) | Semua elemen interaktif bisa diakses via Tab | | |
| 8.2 | Enter/Space pada button/focusable element | Trigger action yang benar | | |
| 8.3 | Focus indicator visible | Outline/focus ring tampil saat Tab | | |
| 8.4 | Alt text pada gambar/avatar | Alt text deskriptif tampil | | |
| 8.5 | Label pada form input | Label terkait ke input via htmlFor/for | | |
| 8.6 | Error message terbaca screen reader | Error announcement saat validation fail | | |
| 8.7 | Color contrast sufficient (WCAG AA) | Contrast ratio >= 4.5:1 untuk teks | | |

---

## 9. Security (Cross-Role)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 9.1 | Role escalation attempt (student → admin via API) | Ditolak oleh server | | |
| 9.2 | IDOR — akses data user lain via API | Ditolak / data tidak tampil | | |
| 9.3 | XSS pada semua input field | Input di-sanitize | | |
| 9.4 | CSRF pada semua form mutation | Token valid, request tanpa token ditolak | | |
| 9.5 | JWT/session hijacking attempt | Token expired/invalid ditolak | | |
| 9.6 | SQL injection pada search & filter | Input di-parameterize, tidak ada injection | | |
| 9.7 | File upload — bypass extension check | File berbahaya ditolak | | |
| 9.8 | Sensitive data exposure pada API response | Password, token tidak tampil di response | | |
| 9.9 | CORS configuration | Hanya origin yang diizinkan bisa akses API | | |
| 9.10 | Rate limiting pada semua API endpoint | Request berlebihan ditolak | | |

---

## Test Summary

| Section | Total Tests | Pass | Fail | Pass Rate |
|---------|-------------|------|------|-----------|
| 1. Registration & Login | 25 | | | |
| 2. Navigation & Layout | 10 | | | |
| 3. Profile Management | 12 | | | |
| 4. Notifications | 11 | | | |
| 5. Search & Filtering | 8 | | | |
| 6. Export & Download | 6 | | | |
| 7. Performance | 7 | | | |
| 8. Accessibility | 7 | | | |
| 9. Security | 10 | | | |
| **TOTAL** | **96** | | | |

**Overall Verdict:** [ ] APPROVED [ ] NEEDS FIX [ ] BLOCKED

**Critical Issues Found:**
1. _______________
2. _______________
3. _______________

**Sign-off:**
- Tester: _______________ Date: _________
- Reviewer: _______________ Date: _________
