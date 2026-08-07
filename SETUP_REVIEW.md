# SIPMODAG Review — Langkah Pemasangan

## 1. Backend Apps Script

1. Buka Apps Script TEST.
2. Salin `Code_SIPMODAG_Review_Tahap2.gs` ke `Code.gs`.
3. Pertahankan kembali `ROOT_FOLDER_ID` dan `SPREADSHEET_ID` milik Anda pada bagian paling atas.
4. Jalankan `setupReviewSystem()`.
5. Jalankan `buatUserUjiCoba()` bila tab USERS belum berisi akun.
6. Jalankan `buatTriggerGoogleForm()`.
7. Deploy sebagai Web App versi baru:
   - Execute as: Me
   - Who has access: Anyone
8. Salin URL yang berakhir `/exec`.

## 2. Website

Buat file `.env` di folder utama proyek:

```env
VITE_APPS_SCRIPT_URL=URL_EXEC_APPS_SCRIPT_TERBARU
```

Atau ganti URL fallback pada `src/App.tsx`.

## 3. Akun Operator Uji

Bila memakai `buatUserUjiCoba()`:

- Username: `operatorpusat`
- Password: `OperatorTest123!`

## 4. Alur Pengujian

1. Login OPD dan unggah satu dokumen.
2. Klik menu `Operator` pada halaman utama.
3. Login operator dan buka antrean.
4. Pilih status `Perlu Revisi`, isi catatan, lalu kirim.
5. Login kembali sebagai OPD.
6. Buka ikon lonceng notifikasi.
7. Klik `Upload Ulang`, pilih file revisi, lalu kirim.
8. Operator membuka antrean `Diunggah Ulang` dan menyetujui dokumen.
