export interface OPDData {
  no: number;
  namaOPD: string;
  namaPendek: string;
  jumlahUpload: number;
  status: 'SUDAH' | 'BELUM';
  originalRow: string[];
}

export interface DashboardStats {
  targetOPD: number;
  sudahCount: number;
  belumCount: number;
  percentageSudah: number;
}

export interface RecentUpload {
  opdName: string;
  opdShortName: string;
  time: Date;
  fileCount: number;
}
