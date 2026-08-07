import React, { useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import { postReviewAction } from '../reviewApi';
import { OperatorSession } from '../reviewTypes';

type Props = {
  apiUrl: string;
  onAuthenticated: (session: OperatorSession) => void;
  onCancel: () => void;
};

export default function OperatorLogin({
  apiUrl,
  onAuthenticated,
  onCancel,
}: Props) {
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
        throw new Error(
          'Akun ini tidak memiliki akses operator pusat.'
        );
      }

      onAuthenticated({
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Login operator gagal.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <button
            type="button"
            onClick={onCancel}
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">

            <div className="mb-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                Login Operator
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                SIPMODAG
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Username
                </label>

                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setError(null);
                    }}
                    autoComplete="username"
                    placeholder="Username"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Kata Sandi
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    autoComplete="current-password"
                    placeholder="Kata sandi"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}

                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>
            </form>

          </div>
        </motion.div>
      </div>
    </main>
  );
}
