# PRD - Revisi #3: Pembatasan Input Saat Timer Selesai (Reading Text & Exit Ticket)

## Ringkasan
Menonaktifkan akses input (annotation & discuss) ketika timer pengerjaan pada Reading Text telah habis. Siswa tidak bisa lagi membuat highlight, catatan baru, atau mengirim pesan diskusi setelah timer menunjukkan 0.

## Lokasi File yang Terdampak

### Halaman Reading Text (utama)
- `src/routes/reading-texts/[id]/+page.svelte`
  - Timer state sudah ada: `timerDurationSeconds`, `timerRemainingSeconds`, `timerActive`, `timerFinished` (lines 51-55)
  - Reactive guard sudah ada: `$: exitTicketsUnlocked = timerDurationSeconds === 0 || timerFinished;` (line 60)

### Halaman Exit Ticket / Submission
- `src/routes/submissions/[id]/+page.svelte`
  - Timer sudah mengunci form submit saat `timerFinished` via auto-submit (sudah selesai di Revisi #5)

## Current State

### Input yang perlu di-lock saat timer selesai (Reading Text page)

| Input | Lokasi Template | Kondisi `disabled` Saat Ini |
|-------|----------------|---------------------------|
| Text highlight / selection trigger | Text content area | Tidak ada guard |
| Annotation modal textarea | Line 1693-1699 | `disabled={annotationLoading}` saja |
| Annotation modal submit button | Line 1710-1723 | `disabled={annotationLoading \|\| !annotationText.trim()}` |
| PDF annotation modal textarea | Line 1763-1768 | Tidak ada disabled |
| PDF annotation modal submit button | Line 1778 | `disabled={annotationLoading \|\| !pdfAnnotationContent.trim()}` |
| Discuss text input | Line 1568-1575 | `disabled={chatLoading}` saja |
| Discuss send button | Line 1628-1643 | `disabled={chatLoading \|\| !newMessage.trim()}` |
| Discuss voice upload | Line 1609-1627 | `disabled={audioUploading \|\| chatLoading}` |
| Discuss emoji picker | Line 1578-1606 | `disabled={chatLoading}` saja |

## Rencana Implementasi

### Pendekatan: Reusable `timerLocked` Variable

Karena pola `$: exitTicketsUnlocked` sudah ada di reading text page, kita buat satu reactive variable baru yang reusable:

```typescript
$: timerLocked = timerDurationSeconds > 0 && timerFinished;
```

Variable ini bisa dipakai di semua elemen input sebagai kondisi `disabled` tambahan. Ini clean karena:
- Satu sumber truth (single source of truth)
- Konsisten dengan pola `exitTicketsUnlocked` yang sudah ada
- Mudah dibaca: `disabled={timerLocked || chatLoading || !newMessage.trim()}`

### Langkah Kerja

#### Step 1: Tambah `timerLocked` reactive variable
Di `src/routes/reading-texts/[id]/+page.svelte`, tambahkan setelah line 60:

```typescript
$: timerLocked = timerDurationSeconds > 0 && timerFinished;
```

#### Step 2: Guard text selection untuk annotation
Tambahkan guard di handler text selection sehingga modal annotation tidak terbuka saat timerLocked:

- Cari fungsi yang membuka `showAnnotationModal = true`
- Tambahkan early return: `if (timerLocked) return;`

#### Step 3: Disable annotation modal inputs
Pada annotation modal (line 1693):

```svelte
<textarea ... disabled={timerLocked}></textarea>
```

Pada annotation submit button (line 1710):

```svelte
disabled={timerLocked || annotationLoading || !annotationText.trim()}
```

#### Step 4: Disable PDF annotation modal inputs
Pada PDF annotation modal textarea (line 1763):

```svelte
<textarea ... disabled={timerLocked}></textarea>
```

Pada PDF annotation submit button (line 1778):

```svelte
disabled={timerLocked || annotationLoading || !pdfAnnotationContent.trim()}
```

#### Step 5: Disable discuss input elements
Pada discuss text input (line 1568):

```svelte
<input ... disabled={timerLocked || chatLoading} />
```

Pada discuss send button (line 1628):

```svelte
disabled={timerLocked || chatLoading || !newMessage.trim()}
```

Pada discuss voice upload (line 1609):

```svelte
disabled={timerLocked || audioUploading || chatLoading}
```

Pada discuss emoji picker (line 1578):

```svelte
disabled={timerLocked || chatLoading}
```

#### Step 6: Visual feedback saat timer locked
Tambahkan pesan informatif di area discuss dan annotation yang muncul saat `timerLocked`:

```svelte
{#if timerLocked}
  <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700 mb-3">
    Waktu pengerjaan telah habis. Input dikunci.
  </div>
{/if}
```

## Tidak Perlu Diubah

- **Exit Ticket / Submission page** (`src/routes/submissions/[id]/+page.svelte`): Sudah menangani timer lock via auto-submit (Revisi #5 sebelumnya sudah menyelesaikan ini).
- **API endpoints**: Tidak perlu perubahan. Lock hanya di sisi UI/UX. Validasi server-side tidak diperlukan karena timer sudah expired secara natural.
- **Database schema**: Tidak ada perubahan schema.

## Testing Checklist

- [ ] Timer aktif (belum selesai): annotation & discuss bisa digunakan normal
- [ ] Timer selesai: annotation modal tidak bisa dibuka (text selection tidak trigger modal)
- [ ] Timer selesai: annotation modal textarea disabled
- [ ] Timer selesai: PDF annotation textarea disabled
- [ ] Timer selesai: discuss input disabled, pesan "waktu habis" muncul
- [ ] Timer selesai: voice upload & emoji picker disabled
- [ ] Timer = 0 (tidak ada timer): semua input tetap bisa digunakan (`timerLocked` = false)
- [ ] Page refresh saat timer sudah expired: state persist, input tetap locked
