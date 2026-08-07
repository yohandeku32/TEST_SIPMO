import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Save,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  User,
  WalletCards,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getReviewAction, postReviewAction, toBoolean } from '../reviewApi';
import { OPDData } from '../types';
import { BudgetInput, BudgetRecord, ReviewNotification, ReviewRecord, RevisionTarget } from '../reviewTypes';

type UploadSlotKey = 'file1' | 'file2' | 'file3' | 'file4';

type UploadedFile = {
  name: string;
  size: string;
  fileObj: File | null;
} | null;

type UploadedFiles = Record<UploadSlotKey, UploadedFile>;

type Props = {
  apiUrl: string;
  loggedInOPD: OPDData;
  handleLogout: () => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  uploadedFiles: UploadedFiles;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFiles>>;
  uploadStatus: 'IDLE' | 'UPLOADING' | 'SUCCESS';
  uploadProgress: number;
  uploadedSuccessKeys: string[];
  handleLocalFileChange: (slot: UploadSlotKey, file: File | null) => void;
  triggerUploadSimulation: (budget: BudgetInput) => void | Promise<void>;
  revisionTarget: RevisionTarget | null;
  onStartRevision: (target: RevisionTarget) => void;
  onCancelRevision: () => void;
};

const slots: Array<{
  key: UploadSlotKey;
  title: string;
  documentName: string;
  description: string;
  accept: string;
  icon: typeof FileText;
}> = [
  {
    key: 'file1',
    title: 'Dokumen GAP',
    documentName: 'GAP',
    description: 'Gender Analysis Pathway atau analisis kesenjangan gender OPD.',
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    icon: FileText,
  },
  {
    key: 'file2',
    title: 'Dokumen GBS',
    documentName: 'GBS',
    description: 'Gender Budget Statement atau lembar pernyataan anggaran gender.',
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    icon: FileSpreadsheet,
  },
  {
    key: 'file3',
    title: 'Dokumen KAK',
    documentName: 'KAK',
    description: 'Kerangka Acuan Kerja responsif gender untuk tahun anggaran terpilih.',
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    icon: FileText,
  },
  {
    key: 'file4',
    title: 'SK Focal Point',
    documentName: 'SK FOCAL POINT',
    description: 'Surat keputusan penunjukan Focal Point Pengarusutamaan Gender OPD.',
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    icon: ShieldCheck,
  },
];

const statusLabel: Record<string, string> = {
  MENUNGGU_REVIEW: 'Menunggu Review',
  SEDANG_DIREVIEW: 'Sedang Direview',
  PERLU_REVISI: 'Perlu Revisi',
  DIUNGGAH_ULANG: 'Diunggah Ulang',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

const statusClass: Record<string, string> = {
  MENUNGGU_REVIEW: 'border-amber-200 bg-amber-50 text-amber-700',
  SEDANG_DIREVIEW: 'border-blue-200 bg-blue-50 text-blue-700',
  PERLU_REVISI: 'border-rose-200 bg-rose-50 text-rose-700',
  DIUNGGAH_ULANG: 'border-violet-200 bg-violet-50 text-violet-700',
  DISETUJUI: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DITOLAK: 'border-slate-300 bg-slate-100 text-slate-700',
};

const onlyDigits = (value: string) => value.replace(/[^0-9]/g, '');

const formatAmountInput = (value: string | number) => {
  const digits = onlyDigits(String(value ?? ''));
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
};

const parseAmountInput = (value: string) => Number(onlyDigits(value) || 0);

const formatRupiah = (value: string | number | undefined) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function OPDDashboard({
  apiUrl,
  loggedInOPD,
  handleLogout,
  selectedYear,
  setSelectedYear,
  uploadedFiles,
  setUploadedFiles,
  uploadStatus,
  uploadProgress,
  uploadedSuccessKeys,
  handleLocalFileChange,
  triggerUploadSimulation,
  revisionTarget,
  onStartRevision,
  onCancelRevision,
}: Props) {
  const selectedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const [notifications, setNotifications] = useState<ReviewNotification[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [paguAnggaran, setPaguAnggaran] = useState('');
  const [tanggalPagu, setTanggalPagu] = useState('');
  const [realisasiAnggaran, setRealisasiAnggaran] = useState('');
  const [tanggalRealisasi, setTanggalRealisasi] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState<string | null>(null);

  const unreadCount = notifications.filter(item => !toBoolean(item.IS_READ)).length;

  const loadBudgetData = async () => {
    setBudgetLoading(true);
    setBudgetMessage(null);

    try {
      const result = await getReviewAction<{ budget: BudgetRecord | null }>(
        apiUrl,
        'getOPDBudget',
        { opdName: loggedInOPD.namaOPD, tahun: selectedYear },
      );

      const budget = result.budget;
      setPaguAnggaran(budget ? formatAmountInput(budget.PAGU_ARG) : '');
      setTanggalPagu(budget?.TANGGAL_PAGU || '');
      setRealisasiAnggaran(
        budget && Number(budget.REALISASI_ARG || 0) > 0
          ? formatAmountInput(budget.REALISASI_ARG)
          : '',
      );
      setTanggalRealisasi(budget?.TANGGAL_REALISASI || '');
    } catch (error) {
      setPaguAnggaran('');
      setTanggalPagu('');
      setRealisasiAnggaran('');
      setTanggalRealisasi('');
      setBudgetMessage(error instanceof Error ? error.message : 'Data anggaran gagal dimuat.');
    } finally {
      setBudgetLoading(false);
    }
  };

  const getBudgetPayload = (): BudgetInput | null => {
    const pagu = parseAmountInput(paguAnggaran);
    const realisasi = parseAmountInput(realisasiAnggaran);

    if (pagu <= 0 || !tanggalPagu) {
      setBudgetMessage('Pagu Anggaran Responsif Gender dan tanggal pagu wajib diisi sebelum upload.');
      return null;
    }

    if (realisasi > 0 && !tanggalRealisasi) {
      setBudgetMessage('Tanggal realisasi wajib diisi jika realisasi anggaran sudah diisi.');
      return null;
    }

    return {
      paguAnggaran: pagu,
      tanggalPagu,
      realisasiAnggaran: realisasi,
      tanggalRealisasi: realisasi > 0 ? tanggalRealisasi : '',
    };
  };

  const saveBudgetData = async () => {
    const budget = getBudgetPayload();
    if (!budget) return;

    setBudgetSaving(true);
    setBudgetMessage(null);

    try {
      await postReviewAction<{ budget: BudgetRecord }>(apiUrl, {
        action: 'saveOPDBudget',
        opdName: loggedInOPD.namaOPD,
        tahun: selectedYear,
        ...budget,
      });
      setBudgetMessage('Data anggaran berhasil disimpan.');
    } catch (error) {
      setBudgetMessage(error instanceof Error ? error.message : 'Data anggaran gagal disimpan.');
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleUploadWithBudget = () => {
    const budget = getBudgetPayload();
    if (!budget) return;
    void triggerUploadSimulation(budget);
  };

  const loadReviewData = async (silent = false) => {
    if (!silent) setLoadingReviews(true);
    setReviewError(null);

    try {
      const [notificationResult, reviewResult] = await Promise.all([
        getReviewAction<{ unreadCount: number; notifications: ReviewNotification[] }>(
          apiUrl,
          'getOPDNotifications',
          { opdName: loggedInOPD.namaOPD },
        ),
        getReviewAction<{ count: number; reviews: ReviewRecord[] }>(
          apiUrl,
          'getOPDReviews',
          { opdName: loggedInOPD.namaOPD, tahun: selectedYear },
        ),
      ]);

      setNotifications(notificationResult.notifications || []);
      setReviews(reviewResult.reviews || []);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Data review gagal dimuat.');
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    void loadBudgetData();
  }, [loggedInOPD.namaOPD, selectedYear]);

  useEffect(() => {
    void loadReviewData();
    const timer = window.setInterval(() => void loadReviewData(true), 30000);
    return () => window.clearInterval(timer);
  }, [loggedInOPD.namaOPD, selectedYear]);

  const reviewById = useMemo(
    () => new Map(reviews.map(item => [item.REVIEW_ID, item])),
    [reviews],
  );

  const markNotificationRead = async (notification: ReviewNotification) => {
    if (toBoolean(notification.IS_READ)) return;

    setNotifications(current =>
      current.map(item =>
        item.NOTIFICATION_ID === notification.NOTIFICATION_ID
          ? { ...item, IS_READ: true }
          : item,
      ),
    );

    try {
      await postReviewAction(apiUrl, {
        action: 'markNotificationRead',
        notificationId: notification.NOTIFICATION_ID,
      });
    } catch (error) {
      console.error('Gagal menandai notifikasi:', error);
    }
  };

  const startRevisionFromReview = (review: ReviewRecord) => {
    onStartRevision({
      uploadId: review.UPLOAD_ID,
      reviewId: review.REVIEW_ID,
      jenisDokumen: review.JENIS_DOKUMEN,
      tahun: review.TAHUN,
      catatan: review.CATATAN,
      reviewFileUrl: review.REVIEW_FILE_URL,
      reviewFileName: review.REVIEW_FILE_NAME,
    });

    document.getElementById('opd-upload-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const matchingRevisionSlot = revisionTarget
    ? slots.find(slot => slot.documentName === revisionTarget.jenisDokumen.toUpperCase())?.key || null
    : null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black sm:text-base">{loggedInOPD.namaPendek}</p>
              <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Dashboard OPD SIPMODAG</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              aria-label="Buka notifikasi review"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-slate-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 text-xs font-extrabold text-red-300 transition hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Profil Instansi</p>
                <p className="mt-1 truncate text-sm font-black text-slate-900">{loggedInOPD.namaPendek}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Terdata</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{loggedInOPD.jumlahUpload}<span className="ml-1 text-xs text-slate-400">/4</span></p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                className="rounded-2xl bg-blue-50 p-4 text-left transition hover:bg-blue-100"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">Notifikasi</p>
                <p className="mt-1 text-2xl font-black text-blue-800">{unreadCount}</p>
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-950 p-5 text-white shadow-lg">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-300">Tahun Anggaran</p>
            <p className="mt-2 text-xs leading-relaxed text-blue-100/70">Dokumen dan hasil review mengikuti tahun yang dipilih.</p>
            <div className="relative mt-5">
              <select
                value={selectedYear}
                onChange={event => setSelectedYear(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 pr-10 text-sm font-extrabold text-white outline-none"
              >
                <option value="2025" className="text-slate-900">Tahun 2025</option>
                <option value="2026" className="text-slate-900">Tahun 2026</option>
                <option value="2027" className="text-slate-900">Tahun 2027</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200" />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-900">Hasil Review</p>
                <p className="mt-1 text-[10px] text-slate-400">Tahun {selectedYear}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadReviewData()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100"
                aria-label="Segarkan hasil review"
              >
                <RefreshCw className={`h-4 w-4 ${loadingReviews ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {reviewError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] font-semibold leading-relaxed text-red-700">{reviewError}</p>
            ) : loadingReviews ? (
              <div className="mt-5 flex items-center justify-center gap-2 py-6 text-xs font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Memuat review...</div>
            ) : reviews.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[10px] leading-relaxed text-slate-400">Belum ada hasil review untuk tahun ini.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {reviews.slice(0, 5).map(review => (
                  <article key={review.REVIEW_ID} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900">{review.JENIS_DOKUMEN}</p>
                        <p className="mt-1 text-[9px] text-slate-400">{review.CREATED_AT}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-extrabold ${statusClass[review.STATUS_REVIEW] || statusClass.SEDANG_DIREVIEW}`}>
                        {statusLabel[review.STATUS_REVIEW] || review.STATUS_REVIEW}
                      </span>
                    </div>
                    {review.CATATAN && <p className="mt-3 text-[10px] leading-relaxed text-slate-600">{review.CATATAN}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.REVIEW_FILE_URL && (
                        <a href={review.REVIEW_FILE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[9px] font-extrabold text-slate-600 hover:text-blue-700">
                          <Download className="h-3 w-3" /> File Review
                        </a>
                      )}
                      {review.STATUS_REVIEW === 'PERLU_REVISI' && (
                        <button type="button" onClick={() => startRevisionFromReview(review)} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-2 text-[9px] font-extrabold text-white hover:bg-blue-900">
                          <UploadCloud className="h-3 w-3" /> Upload Ulang
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>

        <section id="opd-upload-form" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">Form Pengunggahan Dokumen PUG</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {revisionTarget ? `Upload Ulang ${revisionTarget.jenisDokumen}` : `Dokumen Tahun ${selectedYear}`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                {revisionTarget
                  ? 'Unggah file perbaikan berdasarkan catatan operator. File lama tetap tersimpan sebagai riwayat versi.'
                  : 'Pilih satu atau beberapa dokumen untuk dikirim ke antrean review operator pusat.'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Dipilih</p>
              <p className="mt-1 text-xl font-black text-slate-900">{selectedCount}</p>
            </div>
          </div>

          {revisionTarget && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-rose-800">Dokumen memerlukan revisi</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-rose-700">{revisionTarget.catatan || 'Periksa catatan operator pada bagian hasil review.'}</p>
                  {revisionTarget.reviewFileUrl && (
                    <a href={revisionTarget.reviewFileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-800 underline">
                      <ExternalLink className="h-3 w-3" /> Buka {revisionTarget.reviewFileName || 'file hasil review'}
                    </a>
                  )}
                </div>
                <button type="button" onClick={onCancelRevision} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 shadow-sm" aria-label="Batalkan upload ulang">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Anggaran Responsif Gender</p>
                  <p className="mt-1 text-[10px] text-slate-500">Data khusus OPD untuk Tahun {selectedYear}</p>
                </div>
              </div>
              <span className="self-start rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9px] font-extrabold text-rose-700 sm:self-auto">
                Pagu wajib sebelum upload
              </span>
            </div>

            {budgetLoading ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-white px-4 py-4 text-xs font-semibold text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data anggaran...
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Pagu Anggaran Responsif Gender *</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                      <input
                        value={paguAnggaran}
                        onChange={event => { setPaguAnggaran(formatAmountInput(event.target.value)); setBudgetMessage(null); }}
                        inputMode="numeric"
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-extrabold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Tanggal Pagu *</label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={tanggalPagu}
                        onChange={event => { setTanggalPagu(event.target.value); setBudgetMessage(null); }}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Realisasi Anggaran Responsif Gender</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                      <input
                        value={realisasiAnggaran}
                        onChange={event => { setRealisasiAnggaran(formatAmountInput(event.target.value)); setBudgetMessage(null); }}
                        inputMode="numeric"
                        placeholder="Bisa diisi menyusul"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-extrabold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Tanggal Realisasi</label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={tanggalRealisasi}
                        disabled={!realisasiAnggaran}
                        onChange={event => { setTanggalRealisasi(event.target.value); setBudgetMessage(null); }}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ringkasan Tahun {selectedYear}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Pagu {formatRupiah(parseAmountInput(paguAnggaran))} · Realisasi {formatRupiah(parseAmountInput(realisasiAnggaran))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveBudgetData()}
                    disabled={budgetSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[10px] font-extrabold text-white transition hover:bg-blue-900 disabled:opacity-50"
                  >
                    {budgetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {budgetSaving ? 'Menyimpan...' : 'Simpan / Perbarui Anggaran'}
                  </button>
                </div>
              </>
            )}

            {budgetMessage && (
              <div className={`mt-4 rounded-xl border px-4 py-3 text-[10px] font-semibold ${budgetMessage.includes('berhasil') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {budgetMessage}
              </div>
            )}
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {slots.map(slot => {
              const Icon = slot.icon;
              const file = uploadedFiles[slot.key];
              const isUploaded = uploadedSuccessKeys.includes(slot.key);
              const inputId = `upload-${slot.key}`;
              const disabledByRevision = Boolean(revisionTarget && matchingRevisionSlot !== slot.key);

              return (
                <article
                  key={slot.key}
                  className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${
                    disabledByRevision
                      ? 'border-slate-200 bg-slate-50 opacity-45'
                      : isUploaded
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : file
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{slot.title}</h3>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{slot.description}</p>
                      </div>
                    </div>
                    {isUploaded && !revisionTarget ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[9px] font-extrabold text-emerald-700"><Check className="h-3 w-3" /> Terkirim</span>
                    ) : file ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-[9px] font-extrabold text-blue-700"><Check className="h-3 w-3" /> Terpilih</span>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    {file ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-extrabold text-slate-700">{file.name}</p>
                          <p className="mt-0.5 text-[9px] font-semibold text-slate-400">{file.size}</p>
                        </div>
                        <button type="button" onClick={() => setUploadedFiles(previous => ({ ...previous, [slot.key]: null }))} className="shrink-0 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] font-extrabold text-red-600">Hapus</button>
                      </div>
                    ) : (
                      <>
                        <input
                          id={inputId}
                          type="file"
                          accept={slot.accept}
                          disabled={disabledByRevision}
                          className="hidden"
                          onChange={event => {
                            handleLocalFileChange(slot.key, event.target.files?.[0] || null);
                            event.currentTarget.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={disabledByRevision}
                          onClick={() => document.getElementById(inputId)?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3.5 text-[11px] font-extrabold text-white transition hover:bg-blue-900 disabled:pointer-events-none disabled:bg-slate-300"
                        >
                          <UploadCloud className="h-4 w-4" />
                          {revisionTarget && matchingRevisionSlot === slot.key ? 'Pilih File Revisi' : 'Pilih Dokumen'}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {uploadStatus === 'UPLOADING' && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-4 text-xs font-extrabold text-blue-800">
                <span className="flex items-center gap-2"><UploadCloud className="h-4 w-4 animate-pulse" /> Sedang mengunggah...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                <div className="h-full rounded-full bg-blue-700 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-semibold leading-relaxed text-slate-400">Format PDF, DOC, DOCX, XLS, XLSX. Maksimal 10 MB per file.</p>
            <button
              type="button"
              onClick={handleUploadWithBudget}
              disabled={uploadStatus !== 'IDLE' || selectedCount === 0 || budgetLoading || parseAmountInput(paguAnggaran) <= 0 || !tanggalPagu}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {uploadStatus === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
              {revisionTarget ? 'Kirim File Revisi' : 'Kirim ke Antrean Review'}
            </button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 backdrop-blur-sm"
            onMouseDown={() => setShowNotifications(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
              onMouseDown={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Notifikasi Review</h2>
                  <p className="mt-1 text-[10px] text-slate-400">{unreadCount} notifikasi belum dibaca</p>
                </div>
                <button type="button" onClick={() => setShowNotifications(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center text-center">
                    <Bell className="h-10 w-10 text-slate-300" />
                    <p className="mt-4 font-black text-slate-800">Belum ada notifikasi</p>
                    <p className="mt-1 text-xs text-slate-400">Hasil review operator akan muncul di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notification => {
                      const review = reviewById.get(notification.REVIEW_ID);
                      const unread = !toBoolean(notification.IS_READ);

                      return (
                        <article
                          key={notification.NOTIFICATION_ID}
                          onClick={() => void markNotificationRead(notification)}
                          className={`cursor-pointer rounded-2xl border p-4 transition ${unread ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900">{notification.JUDUL}</p>
                              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{notification.PESAN}</p>
                            </div>
                            {unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}
                          </div>
                          <p className="mt-3 text-[9px] text-slate-400">{notification.CREATED_AT}</p>

                          {review && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {review.REVIEW_FILE_URL && (
                                <a href={review.REVIEW_FILE_URL} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[9px] font-extrabold text-slate-600">
                                  <Download className="h-3 w-3" /> Unduh Review
                                </a>
                              )}
                              {review.STATUS_REVIEW === 'PERLU_REVISI' && (
                                <button type="button" onClick={event => { event.stopPropagation(); void markNotificationRead(notification); startRevisionFromReview(review); setShowNotifications(false); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-2 text-[9px] font-extrabold text-white">
                                  <UploadCloud className="h-3 w-3" /> Upload Ulang
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
