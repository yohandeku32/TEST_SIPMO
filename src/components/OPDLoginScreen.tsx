import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileUp,
  Lock,
  Search,
  Unlock,
} from 'lucide-react';
import { OPDData } from '../types';

const GOOGLE_FORM_UPLOAD_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSe9HHoDTWwMIQZbuA2VWL1612Jfq7VUv-Y9Ct8p9vxIFapOeQ/viewform';

type Props = {
  data: OPDData[];
  searchOPDQuery: string;
  setSearchOPDQuery: (value: string) => void;
  showOPDDropdown: boolean;
  setShowOPDDropdown: (value: boolean) => void;
  selectedOPDToLogin: OPDData | null;
  setSelectedOPDToLogin: (value: OPDData | null) => void;
  password: string;
  setPassword: (value: string) => void;
  loginError: string | null;
  setLoginError: (value: string | null) => void;
  handleLoginSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
};

export default function OPDLoginScreen({
  data,
  searchOPDQuery,
  setSearchOPDQuery,
  showOPDDropdown,
  setShowOPDDropdown,
  selectedOPDToLogin,
  setSelectedOPDToLogin,
  password,
  setPassword,
  loginError,
  setLoginError,
  handleLoginSubmit,
  onCancel,
}: Props) {
  const query = searchOPDQuery.toLowerCase().trim();

  const filteredOPDs = data.filter(opd => {
    if (!query) return true;

    return (
      opd.namaOPD.toLowerCase().includes(query) ||
      opd.namaPendek.toLowerCase().includes(query)
    );
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FAFC] text-slate-800">
      {/* Latar dibuat sama ringan dan bersih seperti halaman utama. */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="pointer-events-none absolute -right-48 -top-48 h-[620px] w-[620px] rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-100/40 blur-3xl" />

      <div className="relative z-10 min-h-screen px-4 py-5 sm:px-6 sm:py-7">
        {/* Header mengikuti gaya navigasi halaman utama. */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-3 shadow-sm backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Coat_of_Arms_of_East_Nusa_Tenggara_NEW.png/500px-Coat_of_Arms_of_East_Nusa_Tenggara_NEW.png"
              alt="Logo Provinsi NTT"
              className="h-10 w-auto"
              referrerPolicy="no-referrer"
            />
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-lg font-black leading-none tracking-tight text-slate-950">
                SIPMODAG
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                DP3AP2KB Provinsi NTT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-800 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
            <span className="sm:hidden">Kembali</span>
          </button>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:py-14">
          {/* Teks dibuat singkat seperti bagian hero halaman utama. */}
          <motion.section
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
              Portal OPD
            </span>
            <h1 className="mt-3 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Masuk ke
              <br />
              <span className="text-[#1E40AF]">Dashboard OPD</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Pilih instansi dan masukkan kata sandi untuk mengunggah dokumen PUG.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full"
          >
            <div className="mx-auto w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/40 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    Login OPD
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Gunakan akun instansi Anda.
                  </p>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="mt-7 space-y-5">
                <div className="relative space-y-2">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Instansi / OPD
                  </label>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchOPDQuery}
                      onChange={event => {
                        setSearchOPDQuery(event.target.value);
                        setShowOPDDropdown(true);
                        setLoginError(null);

                        if (
                          selectedOPDToLogin &&
                          event.target.value !== selectedOPDToLogin.namaOPD
                        ) {
                          setSelectedOPDToLogin(null);
                        }
                      }}
                      onFocus={() => setShowOPDDropdown(true)}
                      placeholder="Cari nama instansi..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    {selectedOPDToLogin && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-emerald-100 p-1 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {showOPDDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                      >
                        {filteredOPDs.length > 0 ? (
                          filteredOPDs.map(opd => (
                            <button
                              key={`${opd.no}-${opd.namaOPD}`}
                              type="button"
                              onClick={() => {
                                setSelectedOPDToLogin(opd);
                                setSearchOPDQuery(opd.namaOPD);
                                setShowOPDDropdown(false);
                                setLoginError(null);
                              }}
                              className="flex w-full items-start justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="block text-xs font-extrabold leading-relaxed text-slate-800">
                                {opd.namaOPD}
                              </span>
                              {selectedOPDToLogin?.namaOPD === opd.namaOPD && (
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-xs font-semibold text-slate-400">
                            Instansi tidak ditemukan.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={event => {
                        setPassword(event.target.value);
                        setLoginError(null);
                      }}
                      placeholder="Masukkan kata sandi..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-relaxed text-red-700"
                    >
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-900 hover:shadow-xl"
                >
                  <Unlock className="h-4 w-4" />
                  Masuk
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Alternatif
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <a
                href={GOOGLE_FORM_UPLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
              >
                <FileUp className="h-4 w-4" />
                Upload lewat Google Form
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
