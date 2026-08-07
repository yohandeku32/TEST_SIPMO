const ROOT_FOLDER_ID = "167MHW_q5CptnCSlBK3W3eowm1Zr4sXN7"; // Ganti dengan ID Folder Drive Anda
const SPREADSHEET_ID = "1C86g24ZfzvFoxM8tcdQuEYr7cjroGRCTNms-MpvVLdo";             // Ganti dengan ID Spreadsheet Google Anda (bukan URL publikasi)
const SHEET_NAME = "Form Responses 1";                   // Ganti dengan nama tab Spreadsheet Anda (misal: "Form Responses 1" atau "Sheet1")

// Zona waktu NTT/WITA
const TIME_ZONE = "Asia/Makassar";

function doPost(e) {
  try {
    // Parsing data dari body request
    const data = JSON.parse(e.postData.contents);
    
    // Pastikan nama dan tahun dibersihkan dari karakter ilegal
    const opdName = bersihkanNama_(data.opdName);
    const tahun = bersihkanNama_(data.tahun);
    const files = data.files || []; // Array dari file yang dikirim

    if (!opdName) throw new Error("NAMA OPD tidak ditemukan.");
    if (!tahun) throw new Error("TAHUN tidak ditemukan.");
    if (files.length === 0) throw new Error("Tidak ada file yang diunggah.");

    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    
    // Membuat atau mengambil Folder OPD di dalam Induk -> Folder Tahun di dalam OPD
    const opdFolder = getOrCreateSubFolder_(rootFolder, opdName);
    const targetFolder = getOrCreateSubFolder_(opdFolder, tahun);

    const submissionDate = new Date();
    const timestamp = formatTanggalIndonesia_(submissionDate);

    // Inisialisasi link file untuk disimpan di Spreadsheet
    const fileLinks = {
      "DOKUMEN GAP": "",
      "DOKUMEN GBS": "",
      "DOKUMEN KAK": "",
      "DOKUMEN SK FOCAL POINT": ""
    };

    files.forEach((fileObj) => {
      // Decode Base64 string ke dalam format Blob
      const byteCharacters = Utilities.base64Decode(fileObj.data);
      const blob = Utilities.newBlob(byteCharacters, fileObj.mimeType, fileObj.filename);
      
      const file = targetFolder.createFile(blob);

      // (Opsional) Berikan izin akses agar siapa saja yang memiliki link bisa melihat file ini
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        console.warn("Gagal mengatur hak akses file (bisa diabaikan): " + shareErr.message);
      }
      
      const ext = getFileExtension_(fileObj.filename);
      const jenisDokumen = fileObj.title; // "DOKUMEN GAP", "DOKUMEN GBS", dll.

      // Penamaan Baru sesuai dengan format yang diminta
      const newBaseName = bersihkanNamaFile_(`${jenisDokumen} ${opdName} ${tahun} ${timestamp}`);
      const finalName = ext ? `${newBaseName}.${ext}` : newBaseName;

      file.setName(finalName);

      // Simpan link file Drive
      if (fileLinks.hasOwnProperty(jenisDokumen)) {
        fileLinks[jenisDokumen] = file.getUrl();
      }
    });

    // MASUKKAN DATA KE GOOGLE SPREADSHEET
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ID_SPREADSHEET_ANDA") {
      try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
        
        // Tambahkan baris baru sesuai urutan kolom pada tabel SIPMODAG:
        // A: Timestamp, B: Nama OPD, C: GAP, D: GBS, E: KAK, F: SK Focal Point, G: Tahun
        sheet.appendRow([
          timestamp,
          data.opdName, // Gunakan nama asli dari frontend agar pencocokan presisi
          fileLinks["DOKUMEN GAP"] || "",
          fileLinks["DOKUMEN GBS"] || "",
          fileLinks["DOKUMEN KAK"] || "",
          fileLinks["DOKUMEN SK FOCAL POINT"] || "",
          data.tahun
        ]);
      } catch (sheetError) {
        console.error("Gagal menulis ke Spreadsheet: " + sheetError.message);
        // Tetap lanjutkan agar file di Drive tidak dianggap gagal diunggah
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: files.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Menambahkan function options untuk CORS (Preflight) jika menggunakan application/json dari fetch
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Mengambil folder berdasarkan nama.
 * Jika belum ada, folder akan dibuat.
 */
function getOrCreateSubFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Mengambil ekstensi file.
 */
function getFileExtension_(filename) {
  const match = String(filename).match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Membersihkan nama folder.
 */
function bersihkanNama_(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "-");
}

/**
 * Membersihkan nama file.
 */
function bersihkanNamaFile_(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "-");
}

/**
 * Mengubah tanggal menjadi Bahasa Indonesia.
 * Contoh: Minggu, 12 Juli 2026 14.30.00
 */
function formatTanggalIndonesia_(date) {
  const hasil = Utilities.formatDate(
    date,
    TIME_ZONE,
    "yyyy-MM-dd-HH.mm.ss"
  );

  const bagian = hasil.split("-");
  const tahun = bagian[0];
  const bulan = bagian[1];
  const tanggal = bagian[2];
  const waktu = bagian[3];

  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const nomorHari = new Date(Date.UTC(Number(tahun), Number(bulan) - 1, Number(tanggal))).getUTCDay();

  return `${namaHari[nomorHari]}, ${tanggal} ${namaBulan[Number(bulan) - 1]} ${tahun} ${waktu}`;
}
