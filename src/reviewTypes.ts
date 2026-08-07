export type ReviewStatus =
  | 'MENUNGGU_REVIEW'
  | 'SEDANG_DIREVIEW'
  | 'PERLU_REVISI'
  | 'DIUNGGAH_ULANG'
  | 'DISETUJUI'
  | 'DITOLAK';

export interface ReviewUpload {
  UPLOAD_ID: string;
  OPD_ID: string;
  NAMA_OPD: string;
  TAHUN: string;
  JENIS_DOKUMEN: string;
  VERSI: number | string;
  FILE_ID: string;
  FILE_NAME: string;
  FILE_URL: string;
  STATUS: ReviewStatus;
  UPLOADED_AT: string;
  UPLOADED_BY: string;
  PARENT_UPLOAD_ID: string;
  SOURCE: string;
  PAGU_ARG?: number | string;
  TANGGAL_PAGU?: string;
  REALISASI_ARG?: number | string;
  TANGGAL_REALISASI?: string;
  UPDATED_ANGGARAN_AT?: string;
}


export interface BudgetRecord {
  ANGGARAN_ID: string;
  OPD_ID: string;
  NAMA_OPD: string;
  TAHUN: string;
  PAGU_ARG: number | string;
  TANGGAL_PAGU: string;
  REALISASI_ARG: number | string;
  TANGGAL_REALISASI: string;
  UPDATED_AT: string;
}

export interface BudgetInput {
  paguAnggaran: number;
  tanggalPagu: string;
  realisasiAnggaran?: number;
  tanggalRealisasi?: string;
}

export interface ReviewRecord {
  REVIEW_ID: string;
  UPLOAD_ID: string;
  OPD_ID: string;
  NAMA_OPD: string;
  JENIS_DOKUMEN: string;
  TAHUN: string;
  OPERATOR_ID: string;
  STATUS_REVIEW: ReviewStatus;
  CATATAN: string;
  REVIEW_FILE_ID: string;
  REVIEW_FILE_NAME: string;
  REVIEW_FILE_URL: string;
  CREATED_AT: string;
}

export interface ReviewNotification {
  NOTIFICATION_ID: string;
  OPD_ID: string;
  NAMA_OPD: string;
  UPLOAD_ID: string;
  REVIEW_ID: string;
  JUDUL: string;
  PESAN: string;
  TIPE: string;
  IS_READ: boolean | string;
  CREATED_AT: string;
  READ_AT: string;
}

export interface OperatorUser {
  userId: string;
  name: string;
  username: string;
  role: 'OPERATOR_PUSAT' | 'ADMIN' | 'OPD';
  opdId: string;
  opdName: string;
}

export interface OperatorSession {
  token: string;
  expiresIn: number;
  user: OperatorUser;
}

export interface RevisionTarget {
  uploadId: string;
  reviewId: string;
  jenisDokumen: string;
  tahun: string;
  catatan: string;
  reviewFileUrl: string;
  reviewFileName: string;
}
