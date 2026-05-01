# Dokumentasi Cron Job (Sistem Auto-Backup)

Sistem cron job pada aplikasi ini dikhususkan untuk **Otomatisasi Master System Backup** (*Full Database & Uploads Backup*). Skrip utamanya berada pada file `src/lib/cron.ts`.

## 1. Fungsi Utama
Cron job bertugas mencetak salinan cadangan (*backup*) secara berkala. Proses ini memanggil modul `BackupService` yang akan mengekstrak seluruh data di Database menjadi `database.json`, menggabungkannya dengan direktori `uploads/`, dan mengompresnya menjadi arsip `.zip` yang **terenkripsi secara ketat** (AES-256-CBC) berekstensi `.enc`.

## 2. Jadwal & Eksekusi (Schedule)
Secara bawaan (*default*), cron job dijadwalkan berjalan pada format: 
`0 2 * * *`
*(Artinya: Berjalan setiap hari pada tepat **pukul 02:00 Pagi**).*

Anda dapat mengubah jadwal ini kapan saja dengan memodifikasi File Environment (`.env`).

## 3. Retensi Backup otomatis (Retention Policy)
Untuk menghemat kapasitas *Storage/Disk* server, fungsi cron terintegrasi dengan fungsi Pembersihan Otomatis. 
Setiap kali backup baru berhasil dibuat, sistem akan mengecek total file backup di server. Jika total backup melebih batas maksimal retensi (secara `default: 5`), maka file backup yang **paling usang/tua akan otomatis dihapus**.

## 4. Konfigurasi Environment Variables (`.env`)
Untuk mengontrol integrasi cron job ini, Anda bisa mengatur variabel berikut di dalam file `.env` sistem Anda:

| Variabel | Default | Deskripsi |
|---|---|---|
| `ENABLE_AUTO_BACKUP` | `true` | Mengatur parameter hidup/matinya cron backup otomatis. Isi dengan `'false'` jika Anda ingin menonaktifkannya sementara. |
| `BACKUP_CRON_SCHEDULE` | `0 2 * * *` | Penjadwalan cron menggunakan sintaks unix m-h-dom-mon-dow. (Contoh untuk jam 12 malam: `0 0 * * *`). |
| `BACKUP_RETENTION_COUNT` | `5` | Jumlah maksimal file backup terdahulu yang boleh dipertahankan sebelum yang paling tua dihapus. |
| `BACKUP_PASSWORD` | *(wajib diisi)* | Password enkripsi untuk file backup. **Wajib ada**, jika tidak, proses run backup akan dibatalkan/error. |

## 5. Alur Kerja (Workflow)
1. Pada saat Server aplikasi dinyalakan, fungsi `initBackgroundJobs()` akan dipanggil. Sistem akan mencegah panggilan ganda (menghindari duplikasi timer).
2. Sistem memeriksa ketersediaan variabel `ENABLE_AUTO_BACKUP`.
3. Menunggu jadwal eksekusi tiba (`BACKUP_CRON_SCHEDULE`). 
4. Saat waktu tiba, Cron memanggil `backupService.createFullSystemBackup()`.
5. Apabila lancar, ia langsung memanggil `enforceBackupRetentionPolicy()` untuk menghapus sisa file lama yang melewati jumlah `BACKUP_RETENTION_COUNT`.
6. Selama prosesnya, semua log akan dicatat ke dalam modul `logger.js` sehingga Anda bisa memonitor kesuksesan/kegagalannya melalui console atau error log.

## 6. Persyaratan Teknis & Inisialisasi
Pastikan bahwa integrasi `initBackgroundJobs()` sudah dipanggil di *entry point* Server Node.js (atau jika Anda menggunakan SvelteKit, letakkan pemanggilannya di dalam file `src/hooks.server.ts` seperti ini):

```typescript
// Di dalam src/hooks.server.ts
import { initBackgroundJobs } from '$lib/cron.js';

initBackgroundJobs();
```
