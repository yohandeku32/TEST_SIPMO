import React, { useEffect, useMemo, useState } from 'react';
import {
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
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
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
    void loadQueue();
    const timer = window.setInterval(() => void loadQueue(), 30000);
    return () => window.clearInterval(timer);
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
      </div>
    </main>
  );
}
