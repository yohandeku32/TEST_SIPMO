import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  Loader2,
  LogOut,
  LayoutDashboard,
  RotateCcw,
  RefreshCw,
  Search,
  Send,
  Table2,
  Check,
  Minus,
  ShieldCheck,
  UploadCloud,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { fileToBase64, getReviewAction, postReviewAction } from '../reviewApi';
import { OperatorSession, ReviewStatus, ReviewUpload } from '../reviewTypes';

type Props = {
  apiUrl: string;
  session: OperatorSession;
  onLogout: () => void;
};

type QueueResponse = {
  count: number;
  items: ReviewUpload[];
};

type SubmitReviewResponse = {
  reviewId: string;
  uploadId: string;
  statusReview: ReviewStatus;
};

type OperatorTab = 'review' | 'opd-dashboard';

type OPDOverviewRaw = {
  OPD_ID: string;
  NAMA_OPD: string;
  TAHUN: string;
  HAS_GAP: number | string;
  HAS_GBS: number | string;
  HAS_KAK: number | string;
  HAS_SK: number | string;
  UPLOAD_COUNT: number | string;
  LAST_UPLOADED_AT?: string | null;
};

type OPDOverviewResponse = {
  count: number;
  items: OPDOverviewRaw[];
};

type ResetOPDResponse = {
  message: string;
  tahun: string;
  opdName: string;
  deleted: {
    uploads: number;
    reviews: number;
    notifications: number;
    anggaran: number;
  };
};

type DashboardOPDRow = {
  no: number;
  namaOPD: string;
  opdIds: string[];
  gap: boolean;
  gbs: boolean;
  kak: boolean;
  sk: boolean;
  uploadCount: number;
  lastUploadedAt: string;
};

const OFFICIAL_42_OPDS = [
  'BIRO UMUM SETDA PROVINSI NTT',
  'BIRO PENGADAAN BARANG DAN JASA SETDA PROVINSI NTT',
  'BIRO PEMERINTAHAN SETDA PROVINSI NTT',
  'BIRO ORGANISASI SETDA PROVINSI NTT',
  'BIRO ADMINISTRASI PIMPINAN SETDA PROVINSI NTT',
  'BIRO HUKUM SETDA PROVINSI NTT',
  'BIRO PEREKONOMIAN DAN ADMINISTRASI PEMBANGUNAN SETDA PROVINSI NTT',
  'BADAN PENGELOLAAN BENCANA DAERAH PROVINSI NTT',
  'BADAN SATUAN POLISI PAMONG PRAJA PROVINSI NTT',
  'BADAN KESATUAN BANGSA DAN POLITIK PROVINSI NTT',
  'BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH PROVINSI NTT',
  'BADAN PENGELOLAAN PERBATASAN DAERAH PROVINSI NTT',
  'BADAN PENDAPATAN DAN ASET DAERAH PROVINSI NTT',
  'BADAN PENGEMBANGAN SUMBER DAYA MANUSIA DAERAH PROVINSI NTT',
  'BADAN KEUANGAN DAERAH PROVINSI NTT',
  'BADAN KEPEGAWAIAN DAERAH PROVINSI NTT',
  'BADAN PENGHUBUNG PROVINSI NTT',
  'DINAS SOSIAL PROVINSI NTT',
  'DINAS LINGKUNGAN HIDUP DAN KEHUTANAN PROVINSI NTT',
  'DINAS KETENAGAKERJAAN DAN TRANSMIGRASI PROVINSI NTT',
  'DINAS KELAUTAN DAN PERIKANAN PROVINSI NTT',
  'DINAS PERHUBUNGAN PROVINSI NTT',
  'DINAS PENDIDIKAN DAN KEBUDAYAAN PROVINSI NTT',
  'DINAS PARIWISATA DAN EKONOMI KREATIF PROVINSI NTT',
  'DINAS PENANAMAN MODAL DAN PELAYANAN TERPADU SATU PINTU PROVINSI NTT',
  'DINAS PETERNAKAN PROVINSI NTT',
  'DINAS PERINDUSTRIAN DAN PERDAGANGAN PROVINSI NTT',
  'DINAS PEKERJAAN UMUM DAN PERUMAHAN RAKYAT PROVINSI NTT',
  'DINAS PEMBERDAYAAN MASYARAKAT DESA PROVINSI NTT',
  'DINAS PERTANIAN DAN KETAHANAN PANGAN PROVINSI NTT',
  'DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL PROVINSI NTT',
  'DINAS KOMUNIKASI DAN INFORMASI PROVINSI NTT',
  'DINAS ENERGI DAN SUMBER DAYA MINERAL PROVINSI NTT',
  'DINAS KESEHATAN PROVINSI NTT',
  'DINAS KEARSIPAN DAN PERPUSTAKAAN PROVINSI NTT',
  'DINAS KEPEMUDAAN DAN OLAHRAGA PROVINSI NTT',
  'DINAS KOPERASI DAN USAHA KECIL MENENGAH PROVINSI NTT',
  'DINAS P3AP2KB PROVINSI NTT',
  'INSPEKTORAT DAERAH PROVINSI NTT',
  'SEKRETARIAT DEWAN PROVINSI NTT',
  'RSUD. W. Z. YOHANES KUPANG',
  'RSKD JIWA NAIMATA',
] as const;

const normalizeDashboardOPDName = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, ' DAN ')
    .replace(/\bNUSA\s+TENGGARA\s+TIMUR\b/g, ' NTT ')
    .replace(/\bPROVINSI\s+NTT\b/g, ' NTT ')
    .replace(/\bSEKRETARIAT\s+DAERAH\b/g, ' SETDA ')
    .replace(/\bSATUAN\s+POLISI\s+PAMONG\s+PRAJA\b/g, ' SATPOL PP ')
    .replace(/\bRUMAH\s+SAKIT\s+UMUM\s+DAERAH\b/g, ' RSUD ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const OPD_STOP_WORDS = new Set([
  'PROVINSI', 'NTT', 'NUSA', 'TENGGARA', 'TIMUR', 'PEMERINTAH',
  'DAERAH', 'DAN', 'DINAS', 'BADAN', 'BIRO', 'SEKRETARIAT',
  'SETDA', 'UNIT', 'PELAKSANA', 'TEKNIS',
]);

const getDashboardOPDTokens = (value: string): string[] =>
  Array.from(
    new Set(
      normalizeDashboardOPDName(value)
        .split(' ')
        .filter(token => token.length > 1 && !OPD_STOP_WORDS.has(token)),
    ),
  );

const getDashboardOPDSimilarity = (left: string, right: string): number => {
  const normalizedLeft = normalizeDashboardOPDName(left);
  const normalizedRight = normalizeDashboardOPDName(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const compactLeft = normalizedLeft.replace(/\s+/g, '');
  const compactRight = normalizedRight.replace(/\s+/g, '');
  if (compactLeft === compactRight) return 0.99;

  const leftTokens = new Set(getDashboardOPDTokens(left));
  const rightTokens = new Set(getDashboardOPDTokens(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return compactLeft.includes(compactRight) || compactRight.includes(compactLeft)
      ? 0.75
      : 0;
  }

  let intersection = 0;
  leftTokens.forEach(token => {
    if (rightTokens.has(token)) intersection += 1;
  });

  const dice = (2 * intersection) / (leftTokens.size + rightTokens.size);
  const containsBonus =
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
      ? 0.15
      : 0;

  return Math.min(1, dice + containsBonus);
};

const hasFlag = (value: number | string | undefined) => Number(value || 0) > 0;

const STATUS_OPTIONS: Array<{ value: ReviewStatus | ''; label: string }> = [
  { value: '', label: 'Semua antrean' },
  { value: 'MENUNGGU_REVIEW', label: 'Menunggu review' },
  { value: 'DIUNGGAH_ULANG', label: 'Diunggah ulang' },
  { value: 'SEDANG_DIREVIEW', label: 'Sedang direview' },
  { value: 'PERLU_REVISI', label: 'Perlu revisi' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
];

const statusLabel: Record<ReviewStatus, string> = {
  MENUNGGU_REVIEW: 'Menunggu Review',
  SEDANG_DIREVIEW: 'Sedang Direview',
  PERLU_REVISI: 'Perlu Revisi',
  DIUNGGAH_ULANG: 'Diunggah Ulang',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

const statusClass: Record<ReviewStatus, string> = {
  MENUNGGU_REVIEW: 'border-amber-200 bg-amber-50 text-amber-700',
  SEDANG_DIREVIEW: 'border-blue-200 bg-blue-50 text-blue-700',
  PERLU_REVISI: 'border-rose-200 bg-rose-50 text-rose-700',
  DIUNGGAH_ULANG: 'border-violet-200 bg-violet-50 text-violet-700',
  DISETUJUI: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DITOLAK: 'border-slate-300 bg-slate-100 text-slate-700',
};

const formatRupiah = (value: number | string | undefined) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getRealisasiPercentage = (pagu: number | string | undefined, realisasi: number | string | undefined) => {
  const paguNumber = Number(pagu || 0);
  const realisasiNumber = Number(realisasi || 0);
  if (paguNumber <= 0) return 0;
  return Math.min(100, Math.max(0, (realisasiNumber / paguNumber) * 100));
};

export default function OperatorDashboard({ apiUrl, session, onLogout }: Props) {
  const [queue, setQueue] = useState<ReviewUpload[]>([]);
  const [selected, setSelected] = useState<ReviewUpload | null>(null);
  const [year, setYear] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('PERLU_REVISI');
  const [note, setNote] = useState('');
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<OperatorTab>('review');
  const [overviewYear, setOverviewYear] = useState<string>(
    String(new Date().getFullYear()),
  );
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewRows, setOverviewRows] = useState<OPDOverviewRaw[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRefreshing, setOverviewRefreshing] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const loadQueue = async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setLoadError(null);

    try {
      const result = await getReviewAction<QueueResponse>(apiUrl, 'getReviewQueue', {
        token: session.token,
        tahun: year,
        status: statusFilter,
      });

      setQueue(result.items || []);
      setSelected(current => {
        if (!current) return result.items?.[0] || null;
        return result.items?.find(item => item.UPLOAD_ID === current.UPLOAD_ID) || result.items?.[0] || null;
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Antrean review gagal dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Muat sekali saat halaman/filter berubah.
    // Tidak ada auto-refresh berkala; refresh berikutnya hanya lewat tombol Segarkan.
    void loadQueue();
  }, [year, statusFilter, session.token]);

  useEffect(() => {
    if (!selected) return;
    setReviewStatus(selected.STATUS === 'DIUNGGAH_ULANG' ? 'SEDANG_DIREVIEW' : 'PERLU_REVISI');
    setNote('');
    setReviewFile(null);
    setSubmitMessage(null);
  }, [selected?.UPLOAD_ID]);

  const visibleQueue = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return queue;

    return queue.filter(item =>
      [item.NAMA_OPD, item.JENIS_DOKUMEN, item.FILE_NAME, item.STATUS]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [queue, search]);

  const summary = useMemo(() => ({
    total: queue.length,
    waiting: queue.filter(item => item.STATUS === 'MENUNGGU_REVIEW').length,
    revision: queue.filter(item => item.STATUS === 'DIUNGGAH_ULANG' || item.STATUS === 'PERLU_REVISI').length,
    active: queue.filter(item => item.STATUS === 'SEDANG_DIREVIEW').length,
  }), [queue]);


  const loadOPDOverview = async (manual = false) => {
    manual ? setOverviewRefreshing(true) : setOverviewLoading(true);
    setOverviewError(null);

    try {
      const result = await getReviewAction<OPDOverviewResponse>(
        apiUrl,
        'getOperatorOPDOverview',
        {
          token: session.token,
          tahun: overviewYear,
        },
      );

      setOverviewRows(result.items || []);
    } catch (error) {
      setOverviewError(
        error instanceof Error
          ? error.message
          : 'Dashboard 42 OPD gagal dimuat.',
      );
    } finally {
      setOverviewLoading(false);
      setOverviewRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'opd-dashboard') return;

    // Muat sekali saat membuka Dashboard 42 OPD atau mengganti tahun.
    // Setelah itu data hanya diperbarui saat tombol Segarkan diklik.
    void loadOPDOverview();
  }, [activeTab, overviewYear, session.token]);

  const opdDashboardRows = useMemo<DashboardOPDRow[]>(() => {
    const base = OFFICIAL_42_OPDS.map((namaOPD, index) => ({
      no: index + 1,
      namaOPD,
      opdIds: [] as string[],
      gap: false,
      gbs: false,
      kak: false,
      sk: false,
      uploadCount: 0,
      lastUploadedAt: '',
    }));

    overviewRows.forEach(raw => {
      const exactIndex = base.findIndex(
        item =>
          normalizeDashboardOPDName(item.namaOPD) ===
          normalizeDashboardOPDName(raw.NAMA_OPD),
      );

      let targetIndex = exactIndex;

      if (targetIndex < 0) {
        let bestIndex = -1;
        let bestScore = 0;

        base.forEach((item, index) => {
          const score = getDashboardOPDSimilarity(
            raw.NAMA_OPD,
            item.namaOPD,
          );

          if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
          }
        });

        if (bestScore >= 0.45) {
          targetIndex = bestIndex;
        }
      }

      if (targetIndex < 0) return;

      const target = base[targetIndex];

      if (raw.OPD_ID && !target.opdIds.includes(raw.OPD_ID)) {
        target.opdIds.push(raw.OPD_ID);
      }

      target.gap = target.gap || hasFlag(raw.HAS_GAP);
      target.gbs = target.gbs || hasFlag(raw.HAS_GBS);
      target.kak = target.kak || hasFlag(raw.HAS_KAK);
      target.sk = target.sk || hasFlag(raw.HAS_SK);
      target.uploadCount += Number(raw.UPLOAD_COUNT || 0);

      const uploadedAt = String(raw.LAST_UPLOADED_AT || '');
      if (uploadedAt > target.lastUploadedAt) {
        target.lastUploadedAt = uploadedAt;
      }
    });

    return base;
  }, [overviewRows]);

  const visibleOPDDashboardRows = useMemo(() => {
    const query = overviewSearch.trim().toLowerCase();

    if (!query) return opdDashboardRows;

    return opdDashboardRows.filter(item =>
      item.namaOPD.toLowerCase().includes(query),
    );
  }, [opdDashboardRows, overviewSearch]);

  const overviewSummary = useMemo(() => {
    const uploaded = opdDashboardRows.filter(
      item => item.gap || item.gbs || item.kak || item.sk,
    ).length;

    const complete = opdDashboardRows.filter(
      item => item.gap && item.gbs && item.kak && item.sk,
    ).length;

    return {
      total: OFFICIAL_42_OPDS.length,
      uploaded,
      complete,
      empty: OFFICIAL_42_OPDS.length - uploaded,
    };
  }, [opdDashboardRows]);

  const handleResetOPD = async (item: DashboardOPDRow) => {
    const hasAnyData =
      item.opdIds.length > 0 ||
      item.gap ||
      item.gbs ||
      item.kak ||
      item.sk;

    if (!hasAnyData) {
      setResetMessage(
        `${item.namaOPD} belum memiliki data untuk Tahun ${overviewYear}.`,
      );
      return;
    }

    const firstConfirm = window.confirm(
      `Reset data ${item.namaOPD} Tahun ${overviewYear}?\n\n` +
      `Data upload, review, notifikasi, dan anggaran tahun tersebut akan ` +
      `dihapus dari TiDB.\n\nFile fisik di Google Drive TIDAK dihapus.`,
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      `Konfirmasi terakhir:\n\nHapus data TEST ${item.namaOPD} Tahun ${overviewYear}?`,
    );

    if (!secondConfirm) return;

    const resetKey = `${item.no}-${overviewYear}`;
    setResettingKey(resetKey);
    setResetMessage(null);

    try {
      const result = await postReviewAction<ResetOPDResponse>(
        apiUrl,
        {
          action: 'resetOPDData',
          token: session.token,
          opdName: item.namaOPD,
          opdIds: item.opdIds,
          tahun: overviewYear,
        },
      );

      setResetMessage(
        `${result.message} Upload ${result.deleted.uploads}, review ` +
        `${result.deleted.reviews}, notifikasi ${result.deleted.notifications}, ` +
        `anggaran ${result.deleted.anggaran}.`,
      );

      await Promise.all([
        loadOPDOverview(true),
        loadQueue(true),
      ]);
    } catch (error) {
      setResetMessage(
        error instanceof Error
          ? error.message
          : 'Reset data OPD gagal.',
      );
    } finally {
      setResettingKey(null);
    }
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    if (reviewStatus === 'PERLU_REVISI' && !note.trim()) {
      setSubmitMessage('Catatan wajib diisi untuk status Perlu Revisi.');
      return;
    }

    if (reviewFile && reviewFile.size > 10 * 1024 * 1024) {
      setSubmitMessage('Ukuran file hasil review maksimal 10 MB.');
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const reviewFilePayload = reviewFile
        ? {
            filename: reviewFile.name,
            mimeType: reviewFile.type || 'application/octet-stream',
            data: await fileToBase64(reviewFile),
          }
        : undefined;

      await postReviewAction<SubmitReviewResponse>(apiUrl, {
        action: 'submitReview',
        token: session.token,
        uploadId: selected.UPLOAD_ID,
        operatorId: session.user.userId,
        statusReview: reviewStatus,
        catatan: note.trim(),
        reviewFile: reviewFilePayload,
      });

      setSubmitMessage('Review berhasil dikirim ke OPD.');
      setNote('');
      setReviewFile(null);
      await loadQueue(true);
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Review gagal dikirim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-950">Ruang Review SIPMODAG</h1>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {session.user.name} · Operator Pusat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadQueue(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-extrabold text-white hover:bg-rose-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition ${
                activeTab === 'review'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FileSearch className="h-4 w-4" />
              Antrean Review
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('opd-dashboard')}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition ${
                activeTab === 'opd-dashboard'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard 42 OPD
            </button>
          </div>

          <p className="px-2 text-[10px] font-semibold text-slate-400">
            Sumber data: TiDB · File tetap tersimpan di Google Drive
          </p>
        </section>

        {activeTab === 'opd-dashboard' ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total OPD', value: overviewSummary.total, tone: 'bg-slate-100 text-slate-700' },
                { label: 'Sudah Upload', value: overviewSummary.uploaded, tone: 'bg-blue-50 text-blue-700' },
                { label: 'Lengkap 4 Dokumen', value: overviewSummary.complete, tone: 'bg-emerald-50 text-emerald-700' },
                { label: 'Belum Ada Data', value: overviewSummary.empty, tone: 'bg-amber-50 text-amber-700' },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight text-slate-950">
                      {item.value}
                    </p>
                    <span className={`rounded-lg px-2.5 py-1 text-[9px] font-extrabold ${item.tone}`}>
                      Tahun {overviewYear}
                    </span>
                  </div>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Table2 className="h-5 w-5 text-blue-700" />
                      <h2 className="text-lg font-black tracking-tight text-slate-950">
                        Monitoring Kelengkapan Dokumen OPD
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Centang hijau berarti dokumen sudah tercatat di TiDB.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 sm:w-72">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={overviewSearch}
                        onChange={event => setOverviewSearch(event.target.value)}
                        placeholder="Cari nama OPD..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="relative">
                      <select
                        value={overviewYear}
                        onChange={event => setOverviewYear(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-9 text-xs font-extrabold text-slate-700 outline-none sm:w-32"
                      >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    <button
                      type="button"
                      onClick={() => void loadOPDOverview(true)}
                      disabled={overviewRefreshing}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${overviewRefreshing ? 'animate-spin' : ''}`} />
                      Segarkan
                    </button>
                  </div>
                </div>
              </div>

              {resetMessage && (
                <div className="border-b border-slate-100 bg-blue-50 px-5 py-3 text-xs font-semibold text-blue-800">
                  {resetMessage}
                </div>
              )}

              {overviewError && (
                <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                  {overviewError}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="w-16 px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">No</th>
                      <th className="min-w-[360px] px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Nama OPD</th>
                      {['GAP', 'GBS', 'KAK', 'SK'].map(label => (
                        <th key={label} className="w-20 px-3 py-3 text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          {label}
                        </th>
                      ))}
                      <th className="w-24 px-3 py-3 text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Lengkap</th>
                      <th className="w-36 px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Terakhir Upload</th>
                      <th className="w-28 px-4 py-3 text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {overviewLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center">
                          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Memuat dashboard OPD...
                          </span>
                        </td>
                      </tr>
                    ) : (
                      visibleOPDDashboardRows.map(item => {
                        const completeCount = [
                          item.gap,
                          item.gbs,
                          item.kak,
                          item.sk,
                        ].filter(Boolean).length;

                        const resetKey = `${item.no}-${overviewYear}`;
                        const resetting = resettingKey === resetKey;

                        const renderFlag = (checked: boolean) => (
                          <span
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                              checked
                                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-100 text-slate-300'
                            }`}
                            title={checked ? 'Sudah upload' : 'Belum upload'}
                          >
                            {checked ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                          </span>
                        );

                        return (
                          <tr
                            key={item.namaOPD}
                            className="border-b border-slate-100 transition hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-3 text-xs font-bold text-slate-400">
                              {item.no}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-extrabold text-slate-800">
                                {item.namaOPD}
                              </p>
                              <p className="mt-1 text-[9px] text-slate-400">
                                {item.uploadCount > 0
                                  ? `${item.uploadCount} record upload`
                                  : 'Belum ada data'}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-center">{renderFlag(item.gap)}</td>
                            <td className="px-3 py-3 text-center">{renderFlag(item.gbs)}</td>
                            <td className="px-3 py-3 text-center">{renderFlag(item.kak)}</td>
                            <td className="px-3 py-3 text-center">{renderFlag(item.sk)}</td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-extrabold ${
                                  completeCount === 4
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : completeCount > 0
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {completeCount}/4
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[10px] font-semibold text-slate-400">
                              {item.lastUploadedAt || '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                disabled={
                                  resetting ||
                                  (item.opdIds.length === 0 &&
                                    completeCount === 0)
                                }
                                onClick={() => void handleResetOPD(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[9px] font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
                                title={`Reset data Tahun ${overviewYear}`}
                              >
                                {resetting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                Reset
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Antrean', value: summary.total, icon: FileSearch, className: 'bg-slate-100 text-slate-600' },
            { label: 'Menunggu Review', value: summary.waiting, icon: FileClock, className: 'bg-amber-50 text-amber-600' },
            { label: 'Revisi / Upload Ulang', value: summary.revision, icon: RefreshCw, className: 'bg-violet-50 text-violet-600' },
            { label: 'Sedang Direview', value: summary.active, icon: FileCheck2, className: 'bg-blue-50 text-blue-600' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.className}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid min-h-[650px] gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(440px,1.08fr)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Cari OPD atau dokumen..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="relative">
                  <select
                    value={year}
                    onChange={event => setYear(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-9 text-xs font-extrabold text-slate-700 outline-none sm:w-36"
                  >
                    <option value="">Semua Tahun</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={event => setStatusFilter(event.target.value as ReviewStatus | '')}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-9 text-xs font-extrabold text-slate-700 outline-none sm:w-48"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="max-h-[660px] overflow-y-auto p-3">
              {loading ? (
                <div className="flex min-h-72 items-center justify-center gap-2 text-sm font-bold text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" /> Memuat antrean...
                </div>
              ) : loadError ? (
                <div className="m-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{loadError}</div>
              ) : visibleQueue.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="mt-4 font-black text-slate-800">Tidak ada antrean</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">Belum ada dokumen yang sesuai dengan filter saat ini.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleQueue.map(item => (
                    <button
                      key={item.UPLOAD_ID}
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected?.UPLOAD_ID === item.UPLOAD_ID
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{item.NAMA_OPD}</p>
                          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.JENIS_DOKUMEN} · Tahun {item.TAHUN} · Versi {item.VERSI}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${statusClass[item.STATUS]}`}>
                          {statusLabel[item.STATUS]}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400">
                        <span className="truncate">{item.FILE_NAME}</span>
                        <span className="flex shrink-0 items-center gap-1"><Clock3 className="h-3 w-3" />{item.UPLOADED_AT}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {!selected ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
                <FileSearch className="h-12 w-12 text-slate-300" />
                <p className="mt-4 font-black text-slate-800">Pilih dokumen</p>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">Pilih salah satu antrean untuk melihat file dan mengirim hasil review.</p>
              </div>
            ) : (
              <motion.div key={selected.UPLOAD_ID} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">Detail Dokumen</p>
                    <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">{selected.NAMA_OPD}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{selected.JENIS_DOKUMEN} · Tahun {selected.TAHUN} · Versi {selected.VERSI}</p>
                  </div>
                  <span className={`self-start rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${statusClass[selected.STATUS]}`}>
                    {statusLabel[selected.STATUS]}
                  </span>
                </div>

                <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
                        <WalletCards className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Anggaran Responsif Gender</p>
                        <p className="mt-1 text-[10px] text-slate-500">Tahun {selected.TAHUN}</p>
                      </div>
                    </div>
                    {!Number(selected.PAGU_ARG || 0) && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-extrabold text-amber-700">Belum diisi</span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-blue-100 bg-white p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pagu ARG</p>
                      <p className="mt-2 text-lg font-black text-slate-950">{formatRupiah(selected.PAGU_ARG)}</p>
                      <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                        <CalendarDays className="h-3 w-3" /> {selected.TANGGAL_PAGU || 'Tanggal belum diisi'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-white p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Realisasi ARG</p>
                      <p className="mt-2 text-lg font-black text-slate-950">{formatRupiah(selected.REALISASI_ARG)}</p>
                      <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                        <CalendarDays className="h-3 w-3" /> {selected.TANGGAL_REALISASI || 'Dapat diisi menyusul'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-blue-100">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Realisasi terhadap pagu</span>
                      <span className="text-blue-800">{getRealisasiPercentage(selected.PAGU_ARG, selected.REALISASI_ARG).toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all"
                        style={{ width: `${getRealisasiPercentage(selected.PAGU_ARG, selected.REALISASI_ARG)}%` }}
                      />
                    </div>
                  </div>
                </section>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-900">{selected.FILE_NAME}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Diunggah {selected.UPLOADED_AT} · Sumber {selected.SOURCE || 'WEBSITE'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <a
                      href={selected.FILE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-extrabold text-white hover:bg-blue-900"
                    >
                      <ExternalLink className="h-4 w-4" /> Buka File OPD
                    </a>
                    <a
                      href={selected.FILE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" /> Unduh
                    </a>
                  </div>
                </div>

                <form onSubmit={handleSubmitReview} className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Hasil Review</label>
                    <div className="relative">
                      <select
                        value={reviewStatus}
                        onChange={event => setReviewStatus(event.target.value as ReviewStatus)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-10 text-sm font-extrabold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="PERLU_REVISI">Perlu Revisi</option>
                        <option value="DISETUJUI">Disetujui</option>
                        <option value="DITOLAK">Ditolak</option>
                        <option value="SEDANG_DIREVIEW">Sedang Direview</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Catatan Operator</label>
                    <textarea
                      value={note}
                      onChange={event => {
                        setNote(event.target.value);
                        setSubmitMessage(null);
                      }}
                      rows={5}
                      placeholder="Tuliskan temuan, koreksi, dan arahan perbaikan..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">File Hasil Review (Opsional)</label>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-blue-300 hover:bg-blue-50">
                      <span className="flex min-w-0 items-center gap-3">
                        <UploadCloud className="h-5 w-5 shrink-0 text-blue-600" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-extrabold text-slate-700">{reviewFile?.name || 'Pilih file hasil review'}</span>
                          <span className="mt-1 block text-[10px] text-slate-400">PDF, DOC, DOCX, XLS, XLSX · Maksimal 10 MB</span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-white px-3 py-2 text-[10px] font-extrabold text-slate-600 shadow-sm">Browse</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        onChange={event => {
                          setReviewFile(event.target.files?.[0] || null);
                          setSubmitMessage(null);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {submitMessage && (
                    <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                      submitMessage.includes('berhasil')
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                      {submitMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-900 disabled:pointer-events-none disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? 'Mengirim review...' : 'Kirim Hasil Review ke OPD'}
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        </section>
          </>
        )}
      </div>
    </main>
  );
}
