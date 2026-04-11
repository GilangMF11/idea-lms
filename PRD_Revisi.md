# Product Requirements Document (PRD) - Revisi Fitur LMS

## Dokumen Revisi (Berdasarkan Catatan Terbaru)

### 1. Emoji pada Fitur Voice
- **Deskripsi:** Menampilkan ikon emoji bersebelahan dengan tombol/fitur Voice pada input discuss.
- **Rules / Ketentuan:** Penggunaan atau klik pada emoji ini **tidak dimasukkan** sebagai variabel di dalam data atau analitik perhitungan **Heat Map**. Fitur ini murni digunakan sebagai reaksi visual (UI/UX) dan tidak ditracking untuk kebutuhan heat map.

### 2. Penjadwalan (Schedule) pada Fitur Reading Text
- **Deskripsi:** Menambahkan kemampuan **Schedule** (penjadwalan) secara khusus pada modul *Reading Text*.
- **Rules / Ketentuan:** Admin atau Teacher dapat mengatur jadwal (tanggal dan waktu buka/tutup) untuk materi Reading Text, sehingga siswa hanya dapat mengakses dan mengerjakannya sesuai dengan rentang waktu yang telah ditentukan.

### 3. Pembatasan Input Saat Timer Selesai (Reading Text & Exit Ticket)
- **Deskripsi:** Menonaktifkan akses input ketika waktu pengerjaan telah habis.
- **Rules / Ketentuan:** Ketika **Timer** pada halaman *Reading Text* atau *Exit Ticket* telah selesai (waktu menunjukkan angka 0), maka sistem harus otomatis melakukan *lock* (kunci). Siswa **tidak bisa** lagi menginputkan:
  - Anotasi (membuat highlight atau catatan baru).
  - Discuss (mengirim pesan pada kolom diskusi).

### 4. Merapihkan Folder Pertemuan di Dashboard Siswa
- **Deskripsi:** Melakukan perbaikan UI/UX pada struktur *Folder Pertemuan* di Dashboard untuk level pengguna Siswa (Student).
- **Rules / Ketentuan:** Folder-folder materi/sesi dirapikan agar lebih terstruktur dan mudah diakses. Navigasi harus intuitif (misalnya diurutkan berdasarkan Sesi/Pertemuan 1, Pertemuan 2, dst. atau berdasarkan waktu rilis).

### 5. Penyederhanaan Exit Ticket & Batasan Kata
- **Deskripsi:** Menyederhanakan form *Exit Ticket* menjadi lebih ringkas.
- **Rules / Ketentuan:**
  - *Exit Ticket* dimodifikasi sehingga siswa **hanya perlu melakukan submit *Summary* saja**. Pilihan atau inputan lain (jika ada sebelumnya) dihapus/disembunyikan.
  - Menambahkan validasi batasan kata untuk kolom input Summary. Tulisan dibatasi **maksimal 150 hingga 200 kata**. Tampilan perlu menyertakan indikator jumlah kata (word counter) agar siswa dapat memantau panjang tulisannya.

### 6. Export Hasil Pertemuan (Variabel Heat Map)
- **Deskripsi:** Fitur unduh (Export) laporan data hasil interaksi dari Heat Map dalam satu pertemuan.
- **Rules / Ketentuan:**
  - Fitur export laporan ini (misal dalam bentuk CSV, Excel, atau PDF) **hanya dapat diakses/dilihat oleh *Teacher* dan *Admin***. Siswa tidak diberikan hak akses untuk mengunduh summary heat map.
  - Hasil export harus berisi data yang relevan dengan variabel-variabel interaksi dari Heat Map selama pertemuan berlangsung.
