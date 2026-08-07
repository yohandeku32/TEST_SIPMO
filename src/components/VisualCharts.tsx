import React, { useState } from 'react';
import { OPDData, DashboardStats } from '../types';
import { Award, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface VisualChartsProps {
  data: OPDData[];
  stats: DashboardStats;
}

export default function VisualCharts({ data, stats }: VisualChartsProps) {
  const [activeTab, setActiveTab] = useState<'TOP_UPLOAD' | 'BELUM_UPLOAD'>('TOP_UPLOAD');

  // Top 8 OPDs by document upload count
  const topOPDs = React.useMemo(() => {
    return [...data]
      .filter(x => x.jumlahUpload > 0)
      .sort((a, b) => b.jumlahUpload - a.jumlahUpload)
      .slice(0, 8);
  }, [data]);

  // Bottom / Outstanding OPDs that haven't uploaded
  const outstandingOPDs = React.useMemo(() => {
    return [...data]
      .filter(x => x.jumlahUpload === 0)
      .slice(0, 8);
  }, [data]);

  // Doughnut parameters
  const strokeWidth = 14;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percentageSudah / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Chart 1: Horizontal Progress Bars */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
            <h3 className="font-extrabold text-primary text-xl flex items-center gap-2.5">
              <div className="p-2 bg-secondary/10 rounded-xl">
                <Layers className="w-5 h-5 text-secondary" />
              </div>
              Status Distribusi OPD
            </h3>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('TOP_UPLOAD')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'TOP_UPLOAD'
                    ? 'bg-white text-secondary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Dokumen Terbanyak
              </button>
              <button
                onClick={() => setActiveTab('BELUM_UPLOAD')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'BELUM_UPLOAD'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Belum Unggah ({stats.belumCount})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === 'TOP_UPLOAD' ? (
              topOPDs.length > 0 ? (
                topOPDs.map((opd, i) => {
                  const maxDocValue = Math.max(...topOPDs.map(x => x.jumlahUpload), 1);
                  const barWidthPercent = (opd.jumlahUpload / maxDocValue) * 100;
                  return (
                    <div key={opd.namaOPD} className="space-y-1">
                      <div className="flex justify-between text-xs sm:text-sm font-medium text-slate-700">
                        <span className="truncate max-w-[70%]">{opd.namaOPD}</span>
                        <span className="font-mono text-secondary font-bold shrink-0">{opd.jumlahUpload} Dokumen</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidthPercent}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="bg-gradient-to-r from-secondary to-indigo-400 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-slate-400 text-sm">
                  Belum ada OPD yang mengunggah dokumen.
                </div>
              )
            ) : (
              outstandingOPDs.length > 0 ? (
                outstandingOPDs.map((opd, i) => (
                  <motion.div
                    key={opd.namaOPD}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-700 truncate">{opd.namaOPD}</span>
                    </div>
                    <span className="text-[11px] font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded-full shrink-0 font-mono">
                      Belum Upload
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="py-16 text-center text-green-600 font-medium text-sm flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  Luar biasa! Semua OPD sudah mengunggah dokumen.
                </div>
              )
            )}
          </div>
        </div>

        {activeTab === 'TOP_UPLOAD' && topOPDs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2.5 text-xs text-slate-500 font-medium">
            <Award className="w-4 h-4 text-accent" />
            <span>OPD dengan progres dan kualitas data tertinggi dalam penyusunan dokumen.</span>
          </div>
        )}
      </div>

      {/* Chart 2: Circular Doughnut Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-primary text-xl pb-5 border-b border-slate-100 mb-6 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            Persentase Keseluruhan
          </h3>

          <div className="relative flex items-center justify-center my-6">
            {/* SVG circular progress */}
            <svg className="w-44 h-44 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="88"
                cy="88"
                r={radius}
                className="stroke-slate-100"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Foreground circle */}
              <motion.circle
                cx="88"
                cy="88"
                r={radius}
                className="stroke-emerald-500"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner text */}
            <div className="absolute text-center">
              <span className="text-3xl font-extrabold text-primary block leading-none">
                {stats.percentageSudah.toFixed(1)}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1 block">
                Selesai
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3.5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 block" />
              <span className="text-slate-600">Sudah Mengisi</span>
            </div>
            <span className="font-mono text-slate-900 font-bold">{stats.sudahCount} OPD</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-200 block" />
              <span className="text-slate-600">Belum Mengisi</span>
            </div>
            <span className="font-mono text-slate-900 font-bold">{stats.belumCount} OPD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
