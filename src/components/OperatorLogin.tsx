import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { postReviewAction } from '../reviewApi';
import { OperatorSession } from '../reviewTypes';

type Props = {
  apiUrl: string;
  onAuthenticated: (session: OperatorSession) => void;
  onCancel: () => void;
};

export default function OperatorLogin({ apiUrl, onAuthenticated, onCancel }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Username dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const result = await postReviewAction<OperatorSession>(apiUrl, {
        action: 'login',
        username: username.trim(),
        password,
      });

      if (!['OPERATOR_PUSAT', 'ADMIN'].includes(result.user.role)) {
        throw new Error('Akun ini tidak memiliki akses operator pusat.');
      }

      onAuthenticated({
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login operator gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_30px_100px_rgba(15,23,42,0.16)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#0F172A] p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-700/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-violet-700/25 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6 text-blue-200" />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">SIPMODAG</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200">Operator Pusat</p>
            </div>
          </div>

          <div className="relative z-10 mt-20 max-w-md">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-300">Ruang Kerja Review</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em]">
              Tinjau dokumen OPD secara terpusat dan terukur.
            </h1>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              Berikan catatan, unggah file hasil review, kirim revisi, dan pantau dokumen yang sudah disetujui.
            </p>
          </div>

          <div className="relative z-10 mt-auto space-y-3">
            {[
              'Antrean review berdasarkan tahun dan status',
              'Catatan serta file hasil review untuk OPD',
              'Riwayat versi dokumen tetap tercatat',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-xs font-semibold text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center p-5 sm:p-9 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md"
          >
            <button
              type="button"
              onClick={onCancel}
              className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke halaman utama
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <LockKeyhole className="h-6 w-6" />
            </div>

            <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">Akses Terbatas</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Login Operator</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Gunakan akun operator pusat yang tersimpan pada tab USERS.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Username</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={username}
                    onChange={event => {
                      setUsername(event.target.value);
                      setError(null);
                    }}
                    autoComplete="username"
                    placeholder="Masukkan username operator"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Kata Sandi</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={event => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-relaxed text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Memeriksa akun...' : 'Masuk ke Ruang Review'}
              </button>
            </form>

            <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-400">
              Portal ini khusus operator SIPMODAG dan administrator yang berwenang.
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
