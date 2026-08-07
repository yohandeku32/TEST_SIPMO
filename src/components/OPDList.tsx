import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';
import { OPDData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface OPDListProps {
  data: OPDData[];
}

export default function OPDList({ data }: OPDListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'SUDAH' | 'BELUM'>('SEMUA');
  const [sortBy, setSortBy] = useState<'NAMA' | 'UPLOAD'>('NAMA');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and Search logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.namaOPD.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.namaPendek.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'SEMUA' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  // Sorting logic
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'NAMA') {
        comparison = a.namaOPD.localeCompare(b.namaOPD);
      } else if (sortBy === 'UPLOAD') {
        comparison = a.jumlahUpload - b.jumlahUpload;
      }
      return sortOrder === 'ASC' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredData, sortBy, sortOrder]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));

  const toggleSort = (field: 'NAMA' | 'UPLOAD') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setCurrentPage(1);
  };

  return (
    <div id="daftar-opd" className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-primary text-xl flex items-center gap-2.5">
            <div className="p-2 bg-secondary/10 rounded-xl">
              <FileText className="w-5 h-5 text-secondary" />
            </div>
            Daftar Status Pengunggahan OPD
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Menampilkan <span className="text-slate-800 font-bold">{filteredData.length}</span> dari {data.length} OPD yang terdaftar
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari OPD..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary w-full sm:w-60 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setStatusFilter('SEMUA'); setCurrentPage(1); }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'SEMUA'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-primary'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => { setStatusFilter('SUDAH'); setCurrentPage(1); }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'SUDAH'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-slate-500 hover:text-green-600'
              }`}
            >
              Sudah
            </button>
            <button
              onClick={() => { setStatusFilter('BELUM'); setCurrentPage(1); }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'BELUM'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-500 hover:text-red-600'
              }`}
            >
              Belum
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-16">
                No
              </th>
              <th 
                onClick={() => toggleSort('NAMA')}
                className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Organisasi Perangkat Daerah (OPD)
                  {sortBy === 'NAMA' && (
                    sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => toggleSort('UPLOAD')}
                className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-40 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  Jumlah Dokumen
                  {sortBy === 'UPLOAD' && (
                    sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-36 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {paginatedData.length > 0 ? (
                paginatedData.map((opd, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <motion.tr
                      key={opd.namaOPD}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 text-sm font-medium text-slate-400">
                        {globalIndex}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 text-sm leading-tight">
                          {opd.namaOPD}
                        </div>
                        {opd.namaPendek !== opd.namaOPD && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {opd.namaPendek}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold font-mono ${
                          opd.jumlahUpload > 0 
                            ? 'bg-secondary/10 text-secondary' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {opd.jumlahUpload} Dokumen
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {opd.status === 'SUDAH' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold shadow-sm">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            Sudah Upload
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold shadow-sm">
                            <XCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            Belum
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada OPD yang sesuai dengan kata kunci pencarian.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
