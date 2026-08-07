import React from 'react';
import { OPDData, DashboardStats, RecentUpload } from '../types';
import { LogOut, User, RefreshCw, Clock, Layers, CheckCircle, XCircle, TrendingUp, Download, Activity, FileText } from 'lucide-react';
import VisualCharts from './VisualCharts';
import OPDList from './OPDList';

interface AdminDashboardProps {
  data: OPDData[];
  stats: DashboardStats;
  recentUploads: RecentUpload[];
  lastUpdated: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function AdminDashboard({ data, stats, recentUploads, lastUpdated, isRefreshing, onRefresh, onLogout }: AdminDashboardProps) {
  const exportToCSV = () => {
    const headers = ['No', 'Nama Instansi', 'Short Code', 'Jumlah Dokumen', 'Status'];
    const csvData = data.map(opd => [
      opd.no,
      `"${opd.namaOPD}"`,
      `"${opd.namaPendek}"`,
      opd.jumlahUpload,
      opd.status
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_SIPMODAG_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Navbar */}
      <nav className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Admin SIPMODAG</h1>
            <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wider">Superuser Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Unduh Laporan CSV
          </button>
          
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tampilan Lengkap Dashboard</h2>
            <p className="text-slate-500 text-sm leading-relaxed">Pantau seluruh progres Organisasi Perangkat Daerah secara real-time.</p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4" />
              Update: {lastUpdated.toLocaleTimeString('id-ID')}
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold tracking-wider uppercase">Total OPD</p>
              <p className="text-4xl font-black text-slate-800 font-mono tracking-tight">{stats.targetOPD}</p>
            </div>
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
              <Layers className="w-7 h-7" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <p className="text-xs text-green-600 font-bold tracking-wider uppercase">Sudah Upload</p>
              <p className="text-4xl font-black text-green-700 font-mono tracking-tight">{stats.sudahCount}</p>
            </div>
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center border border-green-100">
              <CheckCircle className="w-7 h-7" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-bold tracking-wider uppercase">Belum Upload</p>
              <p className="text-4xl font-black text-red-600 font-mono tracking-tight">{stats.belumCount}</p>
            </div>
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100">
              <XCircle className="w-7 h-7" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <p className="text-xs text-blue-600 font-bold tracking-wider uppercase">Partisipasi</p>
              <p className="text-4xl font-black text-blue-700 font-mono tracking-tight">{stats.percentageSudah.toFixed(1)}%</p>
            </div>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Recent Uploads & Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <VisualCharts data={data} stats={stats} />
          </div>
          
          {/* Recent Uploads */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Aktivitas Terkini</h3>
                <p className="text-[11px] text-slate-500 font-medium">OPD yang baru mengunggah (sesi ini)</p>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-1" style={{ maxHeight: '420px' }}>
              {recentUploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                  <Clock className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Belum ada aktivitas baru</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentUploads.map((upload, idx) => (
                    <div key={idx} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{upload.opdShortName}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{upload.time.toLocaleTimeString('id-ID')} • {upload.fileCount} dokumen</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                        Baru
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <OPDList data={data} />
      </main>
    </div>
  );
}
