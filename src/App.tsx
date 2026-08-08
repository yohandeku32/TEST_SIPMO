import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  HelpCircle, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Info,
  ChevronRight,
  Database,
  Lock,
  Unlock,
  LogOut,
  UploadCloud,
  User,
  Check,
  Search,
  FileUp,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OPDData, DashboardStats } from './types';
import { FALLBACK_OPDS } from './fallbackData';
import OPDList from './components/OPDList';
import VisualCharts from './components/VisualCharts';
import OPDLoginScreen from './components/OPDLoginScreen';
import OPDDashboard from './components/OPDDashboard';
import OperatorLogin from './components/OperatorLogin';
import OperatorDashboard from './components/OperatorDashboard';
import { BudgetInput, OperatorSession, RevisionTarget } from './reviewTypes';

// Masukkan URL Web App Google Apps Script Anda di bawah ini
const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  String(import.meta.env.VITE_APPS_SCRIPT_URL || '').trim() ||
  "https://script.google.com/macros/s/AKfycbzSq9P2_oE8MfME8HhIXMfK5lp10Kf48q0aCZUlDVwgOkFhHg4vsrtOyb3oeqirjlKbHw/exec";


// DAFTAR RESMI 42 OPD YANG BOLEH MASUK KE DASHBOARD.
// Baris Form Responses di luar daftar ini diabaikan sepenuhnya.
const DASHBOARD_OPD_NAMES = [
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

type DocumentFlags = {
  gap: boolean;
  gbs: boolean;
  kak: boolean;
  sk: boolean;
};

type OPDDocumentGroup = DocumentFlags & {
  namaOPD: string;
};

type PendingUploadFlags = DocumentFlags & {
  expiresAt: number;
};

/**
 * Menormalkan nama OPD agar perbedaan kecil pada Spreadsheet
 * tidak menyebabkan data gagal dicocokkan.
 *
 * Contoh yang dianggap sama:
 * - "&" dan "DAN"
 * - "Provinsi NTT" dan "Nusa Tenggara Timur"
 * - koma, titik, garis miring, serta spasi ganda
 */
const normalizeOPDName = (value: string): string =>
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

const OPD_MATCH_STOP_WORDS = new Set([
  'PROVINSI',
  'NTT',
  'NUSA',
  'TENGGARA',
  'TIMUR',
  'PEMERINTAH',
  'DAERAH',
  'DAN',
  'DINAS',
  'BADAN',
  'BIRO',
  'SEKRETARIAT',
  'SETDA',
  'UNIT',
  'PELAKSANA',
  'TEKNIS',
]);

const getOPDTokens = (value: string): string[] => {
  const normalized = normalizeOPDName(value);
  const tokens = normalized
    .split(' ')
    .filter(token => token.length > 1 && !OPD_MATCH_STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
};

const createOPDMatchKey = (value: string): string => {
  const tokens = getOPDTokens(value);
  return tokens.length > 0
    ? [...tokens].sort().join('|')
    : normalizeOPDName(value).replace(/\s+/g, '');
};

// Kunci identitas konservatif untuk membedakan setiap OPD.
// Tidak menghapus kata DINAS/BADAN/BIRO dan tidak mengurutkan token,
// sehingga dua OPD berbeda tidak akan tergabung hanya karena memiliki
// beberapa kata yang sama.
const createOPDIdentityKey = (value: string): string =>
  normalizeOPDName(value).replace(/\s+/g, '');


const DASHBOARD_OPD_IDENTITY_KEYS = new Set(
  DASHBOARD_OPD_NAMES.map(name => createOPDIdentityKey(name))
);

const isDashboardOPD = (value: string): boolean =>
  DASHBOARD_OPD_IDENTITY_KEYS.has(createOPDIdentityKey(value));

// Membaca tahun secara toleran, misalnya 2026, "Tahun 2026", atau "2026.0".
const extractYear = (value: unknown): string => {
  const match = String(value ?? '').match(/\b(20\d{2})\b/);
  return match ? match[1] : '';
};

const getOPDNameSimilarity = (left: string, right: string): number => {
  const normalizedLeft = normalizeOPDName(left);
  const normalizedRight = normalizeOPDName(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const compactLeft = normalizedLeft.replace(/\s+/g, '');
  const compactRight = normalizedRight.replace(/\s+/g, '');

  if (compactLeft === compactRight) return 0.99;

  const keyLeft = createOPDMatchKey(left);
  const keyRight = createOPDMatchKey(right);

  if (keyLeft && keyLeft === keyRight) return 0.98;

  const leftTokens = new Set(getOPDTokens(left));
  const rightTokens = new Set(getOPDTokens(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return compactLeft.includes(compactRight) || compactRight.includes(compactLeft)
      ? 0.75
      : 0;
  }

  let intersection = 0;
  leftTokens.forEach(token => {
    if (rightTokens.has(token)) intersection += 1;
  });

  const diceScore =
    (2 * intersection) / (leftTokens.size + rightTokens.size);

  const containsBonus =
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
      ? 0.15
      : 0;

  return Math.min(1, diceScore + containsBonus);
};

const findBestOPDMatchIndex = (
  sourceName: string,
  opdList: OPDData[]
): { index: number; score: number } => {
  let bestIndex = -1;
  let bestScore = 0;

  opdList.forEach((opd, index) => {
    const score = Math.max(
      getOPDNameSimilarity(sourceName, opd.namaOPD),
      getOPDNameSimilarity(sourceName, opd.namaPendek)
    );

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return {
    index: bestIndex,
    score: bestScore,
  };
};


// Bentuk daftar utama dari 42 nama resmi. Data tambahan di fallbackData
// tidak pernah ikut tampil. namaPendek lama tetap dipakai bila ditemukan
// agar sandi dan tampilan OPD yang sudah ada tidak berubah.
const OFFICIAL_OPDS: OPDData[] = (() => {
  const usedFallbackIndexes = new Set<number>();

  return DASHBOARD_OPD_NAMES.map((officialName, officialIndex) => {
    let selectedIndex = FALLBACK_OPDS.findIndex((opd, fallbackIndex) => {
      if (usedFallbackIndexes.has(fallbackIndex)) return false;
      return (
        createOPDIdentityKey(opd.namaOPD) === createOPDIdentityKey(officialName) ||
        createOPDIdentityKey(opd.namaPendek) === createOPDIdentityKey(officialName)
      );
    });

    if (selectedIndex < 0) {
      let bestScore = 0;

      FALLBACK_OPDS.forEach((opd, fallbackIndex) => {
        if (usedFallbackIndexes.has(fallbackIndex)) return;

        const score = Math.max(
          getOPDNameSimilarity(officialName, opd.namaOPD),
          getOPDNameSimilarity(officialName, opd.namaPendek)
        );

        if (score > bestScore) {
          bestScore = score;
          selectedIndex = fallbackIndex;
        }
      });
    }

    const source = selectedIndex >= 0 ? FALLBACK_OPDS[selectedIndex] : undefined;
    if (selectedIndex >= 0) usedFallbackIndexes.add(selectedIndex);

    const generatedShortName = officialName
      .replace(/ PROVINSI NTT$/i, '')
      .replace(/ SETDA$/i, '')
      .trim();

    return {
      ...(source || {}),
      no: officialIndex + 1,
      namaOPD: officialName,
      namaPendek: source?.namaPendek ||
        (generatedShortName.length > 35
          ? `${generatedShortName.substring(0, 35)}...`
          : generatedShortName),
      jumlahUpload: 0,
      status: 'BELUM',
      originalRow: [
        '',
        officialName,
        'BELUM',
        'BELUM',
        'BELUM',
        'BELUM',
        '',
      ],
    };
  });
})();

const hasDocumentValue = (value: unknown): boolean => {
  const cleaned = String(value || '').trim();
  const upper = cleaned.toUpperCase();

  return (
    cleaned !== '' &&
    upper !== 'BELUM' &&
    upper !== 'TIDAK' &&
    upper !== 'FALSE' &&
    upper !== '0' &&
    upper !== '-'
  );
};

const mergeDocumentFlags = (
  current: DocumentFlags,
  incoming: DocumentFlags
): DocumentFlags => ({
  gap: current.gap || incoming.gap,
  gbs: current.gbs || incoming.gbs,
  kak: current.kak || incoming.kak,
  sk: current.sk || incoming.sk,
});

const hasAnyDocument = (flags: DocumentFlags): boolean =>
  flags.gap || flags.gbs || flags.kak || flags.sk;


// Membaca status empat dokumen dari satu baris data dashboard.
const getFlagsFromOPDData = (opd: OPDData): DocumentFlags => ({
  gap: hasDocumentValue(opd.originalRow?.[2]),
  gbs: hasDocumentValue(opd.originalRow?.[3]),
  kak: hasDocumentValue(opd.originalRow?.[4]),
  sk: hasDocumentValue(opd.originalRow?.[5]),
});

// Tanda tangan snapshot dipakai untuk memastikan hasil CSV yang menurun
// benar-benar sama pada dua pembacaan berturut-turut sebelum diterapkan.
const createDashboardSnapshotSignature = (opds: OPDData[]): string =>
  opds
    .map(opd => {
      const flags = getFlagsFromOPDData(opd);
      return [
        createOPDIdentityKey(opd.namaOPD),
        flags.gap ? '1' : '0',
        flags.gbs ? '1' : '0',
        flags.kak ? '1' : '0',
        flags.sk ? '1' : '0',
      ].join(':');
    })
    .join('|');

// Penurunan berarti ada dokumen yang sebelumnya SUDAH tetapi pada hasil baru
// berubah menjadi BELUM. Penambahan data tetap diterapkan seketika.
const isDashboardSnapshotRegression = (
  previousData: OPDData[],
  nextData: OPDData[]
): boolean => {
  const nextByIdentity = new Map(
    nextData.map(opd => [createOPDIdentityKey(opd.namaOPD), getFlagsFromOPDData(opd)])
  );

  return previousData.some(previousOPD => {
    const previousFlags = getFlagsFromOPDData(previousOPD);
    const nextFlags = nextByIdentity.get(
      createOPDIdentityKey(previousOPD.namaOPD)
    ) || { gap: false, gbs: false, kak: false, sk: false };

    return (
      (previousFlags.gap && !nextFlags.gap) ||
      (previousFlags.gbs && !nextFlags.gbs) ||
      (previousFlags.kak && !nextFlags.kak) ||
      (previousFlags.sk && !nextFlags.sk)
    );
  });
};


const HERO_TITLE =
  "Sistem Pengelolaan &\nMonitoring Dokumen\nAnalisis Gender";

function HeroTypewriter() {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let index = 0;
    let timer: number;

    const getTypingDelay = () =>
      Math.floor(Math.random() * 55) + 85;

    const typeNextCharacter = () => {
      index += 1;
      setDisplayText(HERO_TITLE.slice(0, index));

      if (index < HERO_TITLE.length) {
        timer = window.setTimeout(
          typeNextCharacter,
          getTypingDelay()
        );
      }
    };

    setDisplayText("");
    timer = window.setTimeout(typeNextCharacter, 350);

    return () => window.clearTimeout(timer);
  }, []);

  const lines = displayText.split("\n");

  return (
    <>
      <style>{`
        @keyframes naturalCaretBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>

      <h2
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary leading-[1.1] tracking-tight"
        aria-label="Sistem Pengelolaan dan Monitoring Dokumen Analisis Gender"
      >
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          <span className={index === 1 ? "text-[#1E40AF]" : undefined}>
            {line}
          </span>

          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}

        <span
          aria-hidden="true"
          className="ml-1 inline-block h-[0.88em] w-[2px] translate-y-[0.08em] bg-black"
          style={{
            animation: "naturalCaretBlink 1.06s steps(1, end) infinite",
          }}
        />
      </h2>
    </>
  );
}

export default function App() {
  const [data, setData] = useState<OPDData[]>(OFFICIAL_OPDS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'LIVE_SHEET' | 'FALLBACK_DEMO'>('FALLBACK_DEMO');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFAQ, setShowFAQ] = useState<boolean>(false);

  // User authentication and document upload states
  const [loggedInOPD, setLoggedInOPD] = useState<OPDData | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showOperatorLogin, setShowOperatorLogin] = useState<boolean>(false);
  const [operatorSession, setOperatorSession] = useState<OperatorSession | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<RevisionTarget | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [allResponseRows, setAllResponseRows] = useState<string[][]>([]);
  const [successPopup, setSuccessPopup] = useState<{ show: boolean } | null>(null);
  
  const [searchOPDQuery, setSearchOPDQuery] = useState<string>('');
  const [selectedOPDToLogin, setSelectedOPDToLogin] = useState<OPDData | null>(null);
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showOPDDropdown, setShowOPDDropdown] = useState<boolean>(false);

  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [dashboardYear, setDashboardYear] = useState<string>('2025');
  const [availableDashboardYears, setAvailableDashboardYears] = useState<string[]>(['2025', '2026', '2027']);
  const [sheetUploadedCount, setSheetUploadedCount] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<{
    file1: { name: string; size: string; fileObj: File | null } | null;
    file2: { name: string; size: string; fileObj: File | null } | null;
    file3: { name: string; size: string; fileObj: File | null } | null;
    file4: { name: string; size: string; fileObj: File | null } | null;
  }>({
    file1: null,
    file2: null,
    file3: null,
    file4: null,
  });
  
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS'>('IDLE');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  /*
   * Penanda upload sementara hanya disimpan di memori sesi aktif.
   * Tidak memakai localStorage, sehingga data yang dihapus dari Spreadsheet
   * tidak akan terus tampil sebagai SUDAH pada kunjungan berikutnya.
   */
  const [pendingUploadedDocs, setPendingUploadedDocs] = useState<
    Record<string, Record<string, PendingUploadFlags>>
  >({});


  /*
   * Pengendali sinkronisasi dashboard:
   * - hanya satu pembacaan CSV berjalan pada satu waktu;
   * - permintaan lain digabung menjadi satu antrean;
   * - hasil untuk tahun lama tidak boleh menimpa tahun yang sedang dipilih;
   * - penurunan data harus muncul sama pada dua refresh berturut-turut.
   */
  const fetchInFlightRef = useRef<boolean>(false);
  const refreshQueuedRef = useRef<boolean>(false);
  const queuedManualRefreshRef = useRef<boolean>(false);
  const dashboardYearRef = useRef<string>(dashboardYear);
  const hasLiveDataRef = useRef<boolean>(false);
  const lastAcceptedSnapshotRef = useRef<{
    year: string;
    signature: string;
    data: OPDData[];
  } | null>(null);
  const pendingRegressionRef = useRef<{
    year: string;
    signature: string;
    confirmations: number;
  } | null>(null);

  // Ref selalu mengikuti tahun terbaru, termasuk ketika request lama belum selesai.
  dashboardYearRef.current = dashboardYear;

  /*
   * PENTING:
   * URL ini harus mengarah ke tab FORM RESPONSES, bukan tab Dashboard.
   * Ganti angka gid=26018163 dengan GID tab Form Responses Anda.
   */
  const formResponsesCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVpRDlbLQsH5ofDlimZX6eoyl1NgNjfUA-aDUbsN0Scjur7lWHeqwPwTZI41AVnefbPZwxq8OJLZEr/pub?gid=1054627461&single=true&output=csv";

  const getPendingFlags = (
    opdName: string,
    year: string
  ): PendingUploadFlags | null => {
    const key = createOPDIdentityKey(opdName);
    const record = pendingUploadedDocs[key]?.[year];

    if (!record || record.expiresAt <= Date.now()) return null;
    return record;
  };

  // Flags dokumen OPD yang sedang login untuk tahun yang dipilih.
  // Data Spreadsheet digabung dengan penanda sementara selama CSV diperbarui.
  const currentOPDFlags = React.useMemo<DocumentFlags>(() => {
    const flags: DocumentFlags = {
      gap: false,
      gbs: false,
      kak: false,
      sk: false,
    };

    if (!loggedInOPD) return flags;

    const matchingRows = allResponseRows.filter(row => {
      const rowYear = extractYear(row[6]);
      if (rowYear !== selectedYear) return false;

      const rowOPDName = String(row[1] || '').trim();
      const rowIdentity = createOPDIdentityKey(rowOPDName);
      const isExactIdentity =
        rowIdentity === createOPDIdentityKey(loggedInOPD.namaOPD) ||
        rowIdentity === createOPDIdentityKey(loggedInOPD.namaPendek);

      if (isExactIdentity) return true;

      const score = Math.max(
        getOPDNameSimilarity(rowOPDName, loggedInOPD.namaOPD),
        getOPDNameSimilarity(rowOPDName, loggedInOPD.namaPendek)
      );

      return score >= 0.60;
    });

    matchingRows.forEach(row => {
      flags.gap = flags.gap || hasDocumentValue(row[2]);
      flags.gbs = flags.gbs || hasDocumentValue(row[3]);
      flags.kak = flags.kak || hasDocumentValue(row[4]);
      flags.sk = flags.sk || hasDocumentValue(row[5]);
    });

    const pending = getPendingFlags(loggedInOPD.namaOPD, selectedYear);
    if (pending) {
      flags.gap = flags.gap || pending.gap;
      flags.gbs = flags.gbs || pending.gbs;
      flags.kak = flags.kak || pending.kak;
      flags.sk = flags.sk || pending.sk;
    }

    return flags;
  }, [loggedInOPD, selectedYear, allResponseRows, pendingUploadedDocs]);

  // Data tampilan menggabungkan data resmi Spreadsheet dengan penanda upload
  // sementara. Penanda ini otomatis hilang setelah Spreadsheet terkonfirmasi
  // atau setelah masa tunggu berakhir.
  const displayData = React.useMemo<OPDData[]>(() => {
    return data.map(opd => {
      const pending = getPendingFlags(opd.namaOPD, dashboardYear);
      if (!pending) return opd;

      const hasGap = opd.originalRow?.[2] === 'SUDAH' || pending.gap;
      const hasGbs = opd.originalRow?.[3] === 'SUDAH' || pending.gbs;
      const hasKak = opd.originalRow?.[4] === 'SUDAH' || pending.kak;
      const hasSk = opd.originalRow?.[5] === 'SUDAH' || pending.sk;
      const jumlahUpload = [hasGap, hasGbs, hasKak, hasSk].filter(Boolean).length;

      return {
        ...opd,
        jumlahUpload,
        status: jumlahUpload > 0 ? 'SUDAH' : 'BELUM',
        originalRow: [
          opd.originalRow?.[0] || '',
          opd.namaOPD,
          hasGap ? 'SUDAH' : 'BELUM',
          hasGbs ? 'SUDAH' : 'BELUM',
          hasKak ? 'SUDAH' : 'BELUM',
          hasSk ? 'SUDAH' : 'BELUM',
          dashboardYear,
        ],
      };
    });
  }, [data, dashboardYear, pendingUploadedDocs]);

  const currentOPDData = React.useMemo<OPDData | null>(() => {
    if (!loggedInOPD) return null;

    const loginIdentity = createOPDIdentityKey(loggedInOPD.namaOPD);

    const exactMatch = displayData.find(opd =>
      createOPDIdentityKey(opd.namaOPD) === loginIdentity
    );

    const match = exactMatch || displayData.find(opd => {
      const score = Math.max(
        getOPDNameSimilarity(opd.namaOPD, loggedInOPD.namaOPD),
        getOPDNameSimilarity(opd.namaPendek, loggedInOPD.namaPendek)
      );
      return score >= 0.60;
    });

    return match
      ? {
          ...loggedInOPD,
          jumlahUpload: match.jumlahUpload,
          status: match.status,
        }
      : loggedInOPD;
  }, [loggedInOPD, displayData]);

  // Statistik memakai jumlah OPD unik langsung dari Form Responses.
  // Hanya 42 OPD resmi yang dihitung; data OPD lain diabaikan.
  const stats = React.useMemo<DashboardStats>(() => {
    const targetOPD = OFFICIAL_OPDS.length;
    const visibleUploadedCount = displayData.filter(
      opd => opd.jumlahUpload > 0
    ).length;

    const sourceCount = dataSource === 'LIVE_SHEET'
      ? Math.max(sheetUploadedCount, visibleUploadedCount)
      : visibleUploadedCount;

    const sudahCount = Math.min(targetOPD, sourceCount);
    const belumCount = Math.max(0, targetOPD - sudahCount);
    const percentageSudah = targetOPD > 0
      ? (sudahCount / targetOPD) * 100
      : 0;

    return {
      targetOPD,
      sudahCount,
      belumCount,
      percentageSudah,
    };
  }, [displayData, dataSource, sheetUploadedCount]);

  /**
   * Membaca CSV mentah dari tab Form Responses.
   * Susunan kolom yang digunakan:
   * A = Timestamp
   * B = Nama OPD
   * C = Dokumen GAP
   * D = Dokumen GBS
   * E = Dokumen KAK
   * F = Dokumen SK Focal Point
   * G = Tahun
   */
  const fetchData = (isManual = false) => {
    // Jangan membuat beberapa request CSV berjalan bersamaan.
    // Permintaan yang datang saat proses masih berjalan cukup diantrikan sekali.
    if (fetchInFlightRef.current) {
      refreshQueuedRef.current = true;
      queuedManualRefreshRef.current =
        queuedManualRefreshRef.current || isManual;

      if (isManual) setIsRefreshing(true);
      return;
    }

    fetchInFlightRef.current = true;
    const requestedYear = dashboardYearRef.current;

    if (isManual) setIsRefreshing(true);
    else setLoading(true);

    setErrorMsg(null);

    const finishFetch = () => {
      setLoading(false);
      setIsRefreshing(false);
      fetchInFlightRef.current = false;

      if (refreshQueuedRef.current) {
        const queuedAsManual = queuedManualRefreshRef.current;
        refreshQueuedRef.current = false;
        queuedManualRefreshRef.current = false;

        window.setTimeout(() => {
          fetchData(queuedAsManual);
        }, 0);
      }
    };

    const noCacheUrl = `${formResponsesCSVUrl}&t=${Date.now()}`;

    Papa.parse(noCacheUrl, {
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as string[][];

          if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error('CSV Form Responses kosong atau tidak dapat dibaca.');
          }

          /*
           * Header otomatis dilewati:
           * - Kolom B harus memiliki nama OPD.
           * - Kolom G harus berisi tahun empat digit.
           */
          const responseRows = rows.filter(row => {
            const opdName = String(row?.[1] || '').trim();
            const year = extractYear(row?.[6]);

            // Hanya 42 OPD resmi yang diizinkan masuk ke dashboard.
            // Nama OPD lain di Form Responses tetap berada di Sheet,
            // tetapi tidak dihitung dan tidak ditampilkan di website.
            return opdName !== '' && year !== '' && isDashboardOPD(opdName);
          });

          const rowsForSelectedYear = responseRows.filter(
            row => extractYear(row[6]) === requestedYear
          );

          /*
           * Gabungkan baris milik OPD yang sama menggunakan identitas nama
           * yang konservatif. Versi sebelumnya membuang kata DINAS/BADAN/BIRO
           * dan memakai skor 0,34, sehingga beberapa OPD berbeda dapat masuk
           * ke satu OPD yang sama dan jumlah tahun 2026/2027 menjadi kurang.
           */
          const documentsByOPD = new Map<string, OPDDocumentGroup>();

          rowsForSelectedYear.forEach(row => {
            const rawName = String(row[1] || '').trim();
            const identityKey = createOPDIdentityKey(rawName);

            if (!rawName || !identityKey) return;

            const incoming: DocumentFlags = {
              gap: hasDocumentValue(row[2]),
              gbs: hasDocumentValue(row[3]),
              kak: hasDocumentValue(row[4]),
              sk: hasDocumentValue(row[5]),
            };

            const existing = documentsByOPD.get(identityKey);

            if (existing) {
              const merged = mergeDocumentFlags(existing, incoming);
              documentsByOPD.set(identityKey, {
                ...merged,
                namaOPD: existing.namaOPD,
              });
            } else {
              documentsByOPD.set(identityKey, {
                ...incoming,
                namaOPD: rawName,
              });
            }
          });

          const uploadedGroups = Array.from(documentsByOPD.entries())
            .filter(([, group]) => hasAnyDocument(group))
            .map(([groupKey, group]) => ({ groupKey, group }));

          const flagsByFallbackIndex = new Map<number, DocumentFlags>();
          const assignedGroupKeys = new Set<string>();
          const usedFallbackIndexes = new Set<number>();

          const assignGroupToFallback = (
            groupKey: string,
            group: OPDDocumentGroup,
            fallbackIndex: number
          ) => {
            const existing = flagsByFallbackIndex.get(fallbackIndex) || {
              gap: false,
              gbs: false,
              kak: false,
              sk: false,
            };

            flagsByFallbackIndex.set(
              fallbackIndex,
              mergeDocumentFlags(existing, group)
            );
            assignedGroupKeys.add(groupKey);
            usedFallbackIndexes.add(fallbackIndex);
          };

          // Tahap 1: cocokkan nama yang identitasnya benar-benar sama.
          uploadedGroups.forEach(({ groupKey, group }) => {
            const sourceIdentity = createOPDIdentityKey(group.namaOPD);
            const exactIndex = OFFICIAL_OPDS.findIndex((opd, index) => {
              if (usedFallbackIndexes.has(index)) return false;
              return (
                createOPDIdentityKey(opd.namaOPD) === sourceIdentity ||
                createOPDIdentityKey(opd.namaPendek) === sourceIdentity
              );
            });

            if (exactIndex >= 0) {
              assignGroupToFallback(groupKey, group, exactIndex);
            }
          });

          // Tahap 2: untuk variasi penulisan, lakukan pencocokan satu-lawan-satu.
          // Satu OPD resmi hanya boleh dipakai oleh satu identitas Form Responses.
          const fuzzyCandidates: Array<{
            groupKey: string;
            group: OPDDocumentGroup;
            fallbackIndex: number;
            score: number;
          }> = [];

          uploadedGroups.forEach(({ groupKey, group }) => {
            if (assignedGroupKeys.has(groupKey)) return;

            OFFICIAL_OPDS.forEach((opd, fallbackIndex) => {
              if (usedFallbackIndexes.has(fallbackIndex)) return;

              const score = Math.max(
                getOPDNameSimilarity(group.namaOPD, opd.namaOPD),
                getOPDNameSimilarity(group.namaOPD, opd.namaPendek)
              );

              fuzzyCandidates.push({
                groupKey,
                group,
                fallbackIndex,
                score,
              });
            });
          });

          fuzzyCandidates
            .sort((left, right) => right.score - left.score)
            .forEach(candidate => {
              if (candidate.score < 0.45) return;
              if (assignedGroupKeys.has(candidate.groupKey)) return;
              if (usedFallbackIndexes.has(candidate.fallbackIndex)) return;

              assignGroupToFallback(
                candidate.groupKey,
                candidate.group,
                candidate.fallbackIndex
              );
            });

          const unmatchedUploadedGroups = uploadedGroups
            .filter(({ groupKey }) => !assignedGroupKeys.has(groupKey))
            .map(({ group }) => group);

          /*
           * Angka kartu dashboard berasal langsung dari jumlah OPD unik yang
           * memiliki minimal satu dokumen pada Form Responses tahun terpilih.
           * Hanya OPD dalam daftar resmi yang dihitung, sehingga data lain di
           * Form Responses tidak dapat menambah jumlah dashboard di atas 42.
           */
          const authoritativeUploadedCount = Math.min(
            OFFICIAL_OPDS.length,
            uploadedGroups.length
          );

          const parsedOPDs: OPDData[] = OFFICIAL_OPDS.map((opd, index) => {
            const flags = flagsByFallbackIndex.get(index) || {
              gap: false,
              gbs: false,
              kak: false,
              sk: false,
            };

            const jumlahUpload = [
              flags.gap,
              flags.gbs,
              flags.kak,
              flags.sk
            ].filter(Boolean).length;

            return {
              ...opd,
              no: index + 1,
              jumlahUpload,
              status: jumlahUpload > 0 ? 'SUDAH' : 'BELUM',
              originalRow: [
                '',
                opd.namaOPD,
                flags.gap ? 'SUDAH' : 'BELUM',
                flags.gbs ? 'SUDAH' : 'BELUM',
                flags.kak ? 'SUDAH' : 'BELUM',
                flags.sk ? 'SUDAH' : 'BELUM',
                requestedYear,
              ],
            };
          });

          /*
           * Jangan menambahkan baris OPD tambahan. Dashboard dan daftar OPD
           * dibatasi hanya pada 42 OPD resmi di atas.
           */

          console.info('Diagnostik dashboard Form Responses', {
            tahun: requestedYear,
            jumlahBarisTahun: rowsForSelectedYear.length,
            jumlahOPDResmiFormResponses: uploadedGroups.length,
            jumlahCocokDaftar: flagsByFallbackIndex.size,
            namaResmiBelumCocok: unmatchedUploadedGroups.map(item => item.namaOPD),
            catatan: 'OPD di luar daftar resmi 42 tidak dihitung dan tidak ditampilkan.',
          });

          // Request untuk tahun lama tidak boleh menimpa tahun yang baru dipilih.
          if (requestedYear !== dashboardYearRef.current) {
            console.info('Hasil CSV diabaikan karena tahun dashboard sudah berubah.', {
              tahunRequest: requestedYear,
              tahunAktif: dashboardYearRef.current,
            });
            return;
          }

          const snapshotSignature = createDashboardSnapshotSignature(parsedOPDs);
          const previousSnapshot = lastAcceptedSnapshotRef.current;
          const isRegression = Boolean(
            previousSnapshot &&
            previousSnapshot.year === requestedYear &&
            isDashboardSnapshotRegression(previousSnapshot.data, parsedOPDs)
          );

          let shouldAcceptSnapshot = true;

          if (isRegression) {
            const previousCandidate = pendingRegressionRef.current;
            const confirmations =
              previousCandidate?.year === requestedYear &&
              previousCandidate.signature === snapshotSignature
                ? previousCandidate.confirmations + 1
                : 1;

            pendingRegressionRef.current = {
              year: requestedYear,
              signature: snapshotSignature,
              confirmations,
            };

            // Satu hasil yang menurun dapat berasal dari cache lama Google.
            // Terapkan penurunan hanya setelah hasil yang sama terbaca dua kali.
            shouldAcceptSnapshot = confirmations >= 2;
          } else {
            pendingRegressionRef.current = null;
          }

          if (!shouldAcceptSnapshot) {
            console.warn('Penurunan sementara diabaikan sampai terkonfirmasi dua kali.', {
              tahun: requestedYear,
              jumlahSebelumnya: previousSnapshot?.data.filter(
                opd => opd.jumlahUpload > 0
              ).length,
              jumlahHasilBaru: parsedOPDs.filter(
                opd => opd.jumlahUpload > 0
              ).length,
            });
            return;
          }

          pendingRegressionRef.current = null;
          lastAcceptedSnapshotRef.current = {
            year: requestedYear,
            signature: snapshotSignature,
            data: parsedOPDs,
          };
          hasLiveDataRef.current = true;

          setAllResponseRows(responseRows);

          const yearsFromSheet = Array.from(
            new Set(responseRows.map(row => extractYear(row[6])).filter(Boolean))
          ).sort((a, b) => Number(a) - Number(b));

          setAvailableDashboardYears(prev =>
            Array.from(
              new Set([...prev, ...yearsFromSheet, '2025', '2026', '2027'])
            ).sort((a, b) => Number(a) - Number(b))
          );

          // Hapus penanda sementara hanya berdasarkan snapshot yang diterima.
          setPendingUploadedDocs(previous => {
            const now = Date.now();
            const next: Record<string, Record<string, PendingUploadFlags>> = {};

            Object.entries(previous).forEach(([opdKey, recordsByYear]) => {
              Object.entries(recordsByYear).forEach(([year, pending]) => {
                if (pending.expiresAt <= now) return;

                const confirmed: DocumentFlags = {
                  gap: false,
                  gbs: false,
                  kak: false,
                  sk: false,
                };

                responseRows.forEach(row => {
                  if (extractYear(row[6]) !== year) return;

                  const rowName = String(row[1] || '').trim();
                  const isExactIdentity =
                    createOPDIdentityKey(rowName) === opdKey;

                  if (!isExactIdentity) {
                    const score = getOPDNameSimilarity(rowName, opdKey);
                    if (score < 0.60) return;
                  }

                  confirmed.gap = confirmed.gap || hasDocumentValue(row[2]);
                  confirmed.gbs = confirmed.gbs || hasDocumentValue(row[3]);
                  confirmed.kak = confirmed.kak || hasDocumentValue(row[4]);
                  confirmed.sk = confirmed.sk || hasDocumentValue(row[5]);
                });

                const remaining: PendingUploadFlags = {
                  gap: pending.gap && !confirmed.gap,
                  gbs: pending.gbs && !confirmed.gbs,
                  kak: pending.kak && !confirmed.kak,
                  sk: pending.sk && !confirmed.sk,
                  expiresAt: pending.expiresAt,
                };

                if (hasAnyDocument(remaining)) {
                  next[opdKey] = {
                    ...(next[opdKey] || {}),
                    [year]: remaining,
                  };
                }
              });
            });

            return next;
          });

          setSheetUploadedCount(authoritativeUploadedCount);
          setData(parsedOPDs);
          setDataSource('LIVE_SHEET');
          setLastUpdated(new Date());
        } catch (error) {
          console.error('Gagal memproses CSV Form Responses:', error);

          const message = error instanceof Error
            ? error.message
            : 'Format CSV Form Responses tidak sesuai.';

          if (hasLiveDataRef.current) {
            // Kesalahan sesaat tidak boleh menghapus data live yang sudah valid.
            setErrorMsg(`${message} Data terakhir yang valid tetap ditampilkan.`);
          } else {
            setErrorMsg(message);
            setData(OFFICIAL_OPDS);
            setSheetUploadedCount(
              OFFICIAL_OPDS.filter(item => item.status === 'SUDAH').length
            );
            setDataSource('FALLBACK_DEMO');
          }
        } finally {
          finishFetch();
        }
      },
      error: (error) => {
        console.error('Gagal mengambil CSV Form Responses:', error);

        if (hasLiveDataRef.current) {
          setErrorMsg(
            'Koneksi ke Form Responses sempat gagal. Data terakhir yang valid tetap ditampilkan.'
          );
        } else {
          setErrorMsg(
            'Gagal terhubung ke CSV Form Responses. Pastikan tab sudah dipublikasikan dan URL/GID benar.'
          );
          setData(OFFICIAL_OPDS);
          setSheetUploadedCount(
            OFFICIAL_OPDS.filter(item => item.status === 'SUDAH').length
          );
          setDataSource('FALLBACK_DEMO');
        }

        finishFetch();
      }
    });
  };

  // Login OPD sekarang menggunakan akun yang tersimpan di TiDB.
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOPDToLogin) {
      setLoginError("Silakan pilih instansi/OPD terlebih dahulu.");
      return;
    }

    if (!password.trim()) {
      setLoginError("Kata sandi wajib diisi.");
      return;
    }

    setLoginError(null);

    try {
      const response = await fetch(
        GOOGLE_APPS_SCRIPT_WEB_APP_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'loginOPD',
            opdName: selectedOPDToLogin.namaOPD,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || 'Login OPD gagal.'
        );
      }

      setLoggedInOPD(selectedOPDToLogin);
      setLoginError(null);
      setPassword('');
      setShowLoginModal(false);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Login OPD gagal. Silakan coba lagi.'
      );
    }
  };

  const handleLogout = () => {
    setLoggedInOPD(null);
    setRevisionTarget(null);
    setShowProfileModal(false);
    setUploadedFiles({
      file1: null,
      file2: null,
      file3: null,
      file4: null,
    });
  };

  const handleLocalFileChange = (slot: 'file1' | 'file2' | 'file3' | 'file4', file: File | null) => {
    if (!file) return;
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setUploadedFiles(prev => ({
      ...prev,
      [slot]: {
        name: file.name,
        size: `${sizeInMB} MB`,
        fileObj: file
      }
    }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Hapus prefix "data:mime/type;base64,"
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const triggerUploadSimulation = async (budget: BudgetInput) => {
    const fileKeys: (keyof typeof uploadedFiles)[] = [
      'file1',
      'file2',
      'file3',
      'file4'
    ];

    const titles = [
      'DOKUMEN GAP',
      'DOKUMEN GBS',
      'DOKUMEN KAK',
      'DOKUMEN SK FOCAL POINT'
    ];

    let activeFiles = fileKeys
      .map((key, index) => ({
        key,
        fileData: uploadedFiles[key],
        title: titles[index]
      }))
      .filter(item => item.fileData !== null);

    if (revisionTarget) {
      const normalizedTarget = revisionTarget.jenisDokumen.trim().toUpperCase();
      activeFiles = activeFiles.filter(item =>
        item.title.replace('DOKUMEN ', '').trim().toUpperCase() === normalizedTarget
      );
    }

    const fileCount = activeFiles.length;

    if (!loggedInOPD) {
      alert('Sesi login OPD tidak ditemukan. Silakan login kembali.');
      return;
    }

    if (fileCount === 0) {
      alert('Silakan pilih minimal satu berkas untuk diunggah.');
      return;
    }

    if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL.trim()) {
      alert('URL Web App Google Apps Script belum diatur.');
      return;
    }

    if (!budget || !Number(budget.paguAnggaran) || !budget.tanggalPagu) {
      alert('Pagu Anggaran Responsif Gender dan tanggal pagu wajib diisi sebelum upload.');
      return;
    }

    if (Number(budget.realisasiAnggaran || 0) > 0 && !budget.tanggalRealisasi) {
      alert('Tanggal realisasi wajib diisi jika realisasi anggaran sudah diisi.');
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    const oversizedFile = activeFiles.find(item => {
      const fileObj = item.fileData?.fileObj;
      return Boolean(fileObj && fileObj.size > maxFileSize);
    });

    if (oversizedFile?.fileData?.fileObj) {
      alert(
        `Ukuran file "${oversizedFile.fileData.fileObj.name}" melebihi batas maksimal 10 MB.`
      );
      return;
    }

    setUploadStatus('UPLOADING');
    setUploadProgress(5);

    try {
      /*
       * File dikirim satu per satu agar ukuran request Base64
       * tidak terlalu besar untuk Google Apps Script.
       */
      for (let index = 0; index < activeFiles.length; index++) {
        const activeFile = activeFiles[index];
        const fileObj = activeFile.fileData?.fileObj;

        if (!fileObj) {
          throw new Error(`Berkas ${activeFile.title} tidak dapat dibaca.`);
        }

        setUploadProgress(
          Math.max(5, Math.round((index / fileCount) * 100))
        );

        const base64Data = await fileToBase64(fileObj);

        const payload = {
          ...(revisionTarget
            ? {
                action: 'uploadRevision',
                parentUploadId: revisionTarget.uploadId,
              }
            : { action: 'uploadOriginal' }),
          opdName: loggedInOPD.namaOPD,
          tahun: selectedYear,
          paguAnggaran: Number(budget.paguAnggaran),
          tanggalPagu: budget.tanggalPagu,
          realisasiAnggaran: Number(budget.realisasiAnggaran || 0),
          tanggalRealisasi: budget.tanggalRealisasi || '',
          files: [
            {
              title: activeFile.title,
              filename: fileObj.name,
              mimeType: fileObj.type || 'application/octet-stream',
              data: base64Data
            }
          ]
        };

        await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        setUploadProgress(
          Math.round(((index + 1) / fileCount) * 100)
        );
      }

      setUploadProgress(100);
      setUploadStatus('SUCCESS');
      updateLocalStateOnSuccess(fileCount);
      if (revisionTarget) {
        setRevisionTarget(null);
      }
      setSuccessPopup({ show: true });
    } catch (error: unknown) {
      console.error('Upload error:', error);

      const message = error instanceof Error
        ? error.message
        : 'Terjadi kesalahan yang tidak diketahui.';

      alert(`Terjadi kesalahan saat mengunggah dokumen:\n${message}`);
      setUploadStatus('IDLE');
      setUploadProgress(0);
    }
  };

  const updateLocalStateOnSuccess = (fileCount: number) => {
    if (loggedInOPD) {
      const opdName = loggedInOPD.namaOPD;
      const opdKey = createOPDIdentityKey(opdName);
      const year = selectedYear;
      const expiresAt = Date.now() + 60000;

      setPendingUploadedDocs(previous => {
        const previousYear = previous[opdKey]?.[year] || {
          gap: false,
          gbs: false,
          kak: false,
          sk: false,
          expiresAt,
        };

        return {
          ...previous,
          [opdKey]: {
            ...(previous[opdKey] || {}),
            [year]: {
              gap: previousYear.gap || Boolean(uploadedFiles.file1),
              gbs: previousYear.gbs || Boolean(uploadedFiles.file2),
              kak: previousYear.kak || Boolean(uploadedFiles.file3),
              sk: previousYear.sk || Boolean(uploadedFiles.file4),
              expiresAt,
            },
          },
        };
      });

      if (selectedYear === dashboardYear) {
        setData(previousData => {
          return previousData.map(opd => {
            const isExactIdentity =
              createOPDIdentityKey(opd.namaOPD) === createOPDIdentityKey(opdName);

            if (!isExactIdentity) {
              const score = Math.max(
                getOPDNameSimilarity(opd.namaOPD, opdName),
                getOPDNameSimilarity(opd.namaPendek, loggedInOPD.namaPendek)
              );

              if (score < 0.60) return opd;
            }

            const newUploadCount = Math.min(4, opd.jumlahUpload + fileCount);
            return {
              ...opd,
              jumlahUpload: newUploadCount,
              status: newUploadCount > 0 ? 'SUDAH' : 'BELUM',
            };
          });
        });
      }

      setLoggedInOPD(previous => previous ? {
        ...previous,
        jumlahUpload: Math.min(4, previous.jumlahUpload + fileCount),
        status: 'SUDAH',
      } : null);
    }

    window.setTimeout(() => {
      setUploadedFiles({
        file1: null,
        file2: null,
        file3: null,
        file4: null,
      });
      setUploadStatus('IDLE');
      setUploadProgress(0);
    }, 1000);

    // Google Sheets Published CSV dapat terlambat beberapa detik.
    [1500, 4000, 8000, 12000].forEach(delay => {
      window.setTimeout(() => fetchData(true), delay);
    });
  };

  // Muat ulang dashboard ketika pilihan tahun berubah.
  useEffect(() => {
    fetchData();

    const interval = window.setInterval(() => {
      fetchData();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [dashboardYear]);

  // Notifikasi sukses ringkas dan otomatis tertutup.
  useEffect(() => {
    if (!successPopup?.show) return;

    const timeout = window.setTimeout(() => {
      setSuccessPopup(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [successPopup]);

  return (
    <div className="bg-[#F8FAFC] text-slate-800 font-sans min-h-screen flex flex-col relative antialiased selection:bg-secondary/15 selection:text-secondary">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 pointer-events-none z-[-1] mask-gradient">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.25]"></div>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 -translate-y-24 translate-x-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-1/2 left-0 -translate-x-1/4 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <AnimatePresence mode="wait">
        {operatorSession ? (
          <motion.div
            key="operator-dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex-grow"
          >
            <OperatorDashboard
              apiUrl={GOOGLE_APPS_SCRIPT_WEB_APP_URL}
              session={operatorSession}
              onLogout={() => setOperatorSession(null)}
            />
          </motion.div>
        ) : showOperatorLogin ? (
          <motion.div
            key="operator-login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-grow"
          >
            <OperatorLogin
              apiUrl={GOOGLE_APPS_SCRIPT_WEB_APP_URL}
              onAuthenticated={(session) => {
                setOperatorSession(session);
                setShowOperatorLogin(false);
              }}
              onCancel={() => setShowOperatorLogin(false)}
            />
          </motion.div>
        ) : showLoginModal ? (
          <motion.div
            key="login-page"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex-grow flex flex-col"
          >
            <OPDLoginScreen
              apiUrl={GOOGLE_APPS_SCRIPT_WEB_APP_URL}
              data={displayData}
              searchOPDQuery={searchOPDQuery}
              setSearchOPDQuery={setSearchOPDQuery}
              showOPDDropdown={showOPDDropdown}
              setShowOPDDropdown={setShowOPDDropdown}
              selectedOPDToLogin={selectedOPDToLogin}
              setSelectedOPDToLogin={setSelectedOPDToLogin}
              password={password}
              setPassword={setPassword}
              loginError={loginError}
              setLoginError={setLoginError}
              handleLoginSubmit={handleLoginSubmit}
              onCancel={() => setShowLoginModal(false)}
            />
          </motion.div>
        ) : loggedInOPD ? (
          <motion.div
            key="dashboard-page"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex-grow flex flex-col"
          >
            <OPDDashboard
              loggedInOPD={currentOPDData || loggedInOPD}
              handleLogout={handleLogout}
              selectedYear={selectedYear}
              setSelectedYear={(value) => {
                setSelectedYear(value);
                setDashboardYear(value);
              }}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              uploadStatus={uploadStatus}
              uploadProgress={uploadProgress}
              uploadedSuccessKeys={
                [
                  currentOPDFlags.gap ? 'file1' : '',
                  currentOPDFlags.gbs ? 'file2' : '',
                  currentOPDFlags.kak ? 'file3' : '',
                  currentOPDFlags.sk ? 'file4' : '',
                ].filter(Boolean)
              }
              handleLocalFileChange={handleLocalFileChange}
              triggerUploadSimulation={triggerUploadSimulation}
              apiUrl={GOOGLE_APPS_SCRIPT_WEB_APP_URL}
              revisionTarget={revisionTarget}
              onStartRevision={(target) => {
                setRevisionTarget(target);
                setSelectedYear(target.tahun);
                setDashboardYear(target.tahun);
                setUploadedFiles({ file1: null, file2: null, file3: null, file4: null });
              }}
              onCancelRevision={() => {
                setRevisionTarget(null);
                setUploadedFiles({ file1: null, file2: null, file3: null, file4: null });
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-grow flex flex-col"
          >
            {/* NAVIGATION BAR */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 sm:py-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Coat_of_Arms_of_East_Nusa_Tenggara_NEW.png/500px-Coat_of_Arms_of_East_Nusa_Tenggara_NEW.png" 
              alt="Logo Provinsi NTT" 
              className="h-10 w-auto hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            <div className="border-l-2 border-slate-200 h-8"></div>
            <div>
              <h1 className="font-bold text-primary tracking-tight leading-none text-lg">SIPMODAG</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-1">DP3AP2KB PROVINSI NTT</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const el = document.getElementById('dashboard');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-slate-600 hover:text-[#1E40AF] transition-colors cursor-pointer"
            >
              Lihat Dashboard
            </button>
            <button
              onClick={() => setShowFAQ(true)}
              className="text-xs font-semibold text-slate-600 hover:text-[#1E40AF] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Panduan</span>
            </button>

            <button
              onClick={() => {
                setShowLoginModal(false);
                setShowOperatorLogin(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:px-4"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">LOGIN OPERATOR</span>
              <span className="sm:hidden">OPERATOR</span>
            </button>
            
            {loggedInOPD ? (
              <button
                onClick={() => setShowProfileModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>{loggedInOPD.namaPendek}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedOPDToLogin(null);
                  setSearchOPDQuery('');
                  setPassword('');
                  setLoginError(null);
                  setShowLoginModal(true);
                }}
                className="bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 shadow-md cursor-pointer"
              >
                LOGIN OPD
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="flex-grow pt-32 pb-16 lg:pt-40 lg:pb-24 px-4 overflow-hidden relative">
        {/* Background dibuat sama seperti halaman login */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
        <div className="pointer-events-none absolute -right-48 -top-48 h-[620px] w-[620px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-100/40 blur-3xl" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8 relative z-10">
            <HeroTypewriter />
            
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Digitalisasi pengumpulan dokumen analisis gender pada Dinas Pemberdayaan Perempuan, Perlindungan Anak, Pengendalian Penduduk & Keluarga Berencana Provinsi Nusa Tenggara Timur.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              {loggedInOPD ? (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                >
                  <User className="w-5 h-5" />
                  <span>Profil & Upload ({loggedInOPD.namaPendek})</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedOPDToLogin(null);
                    setSearchOPDQuery('');
                    setPassword('');
                    setLoginError(null);
                    setShowLoginModal(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-[#1E40AF] hover:bg-blue-900 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                >
                  LOGIN OPD
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </button>
              )}
            </div>

          </div>

          {/* Visual Side Graphics (Matched Exactly to screenshot!) */}
          <div className="relative hidden lg:block z-10 h-[500px] w-full">
            {/* Radial Glow Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/40 to-indigo-50/40 rounded-full scale-90 blur-2xl"></div>
            
            {/* Back Card (Yellow Icon on the left) */}
            <div className="absolute left-[10%] top-[10%] w-[270px] h-[330px] bg-white rounded-2xl shadow-lg border border-slate-100 transform -rotate-[5deg] flex flex-col p-6 z-10">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </div>
              <div className="h-3 w-1/3 bg-slate-100 rounded-full mb-3.5"></div>
              <div className="h-3 w-full bg-slate-100 rounded-full mb-2.5"></div>
              <div className="h-3 w-5/6 bg-slate-100 rounded-full"></div>
            </div>

            {/* Front Card (Blue Icon on the right) */}
            <div className="absolute left-[34%] top-[15%] w-[270px] h-[330px] bg-white rounded-2xl shadow-2xl border border-slate-100/80 transform rotate-[3deg] flex flex-col p-6 z-20">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div className="h-3 w-2/3 bg-slate-100 rounded-full mb-3.5"></div>
              <div className="h-3 w-full bg-slate-100 rounded-full mb-2.5"></div>
              <div className="h-3 w-11/12 bg-slate-100 rounded-full mb-2.5"></div>
              <div className="h-3 w-4/5 bg-slate-100 rounded-full mb-2.5"></div>
              
              <div className="mt-auto h-12 w-full bg-slate-50/50 rounded-xl border border-slate-200/80 border-dashed"></div>
            </div>
          </div>
        </div>
      </main>

      {/* QUICK VALUE PROPOSITIONS */}
      <section className="relative z-10 border-y border-slate-200/70 bg-white py-10 sm:py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-slate-200 px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex items-start gap-4 py-6 md:px-8 md:py-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-1.5 text-base font-extrabold leading-snug text-primary">
                Mendorong Partisipasi
              </h3>
              <p className="text-sm leading-6 text-slate-500">
                Meningkatkan keikutsertaan seluruh OPD NTT dalam integrasi kebijakan berbasis analisis gender.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 py-6 md:px-8 md:py-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-1.5 text-base font-extrabold leading-snug text-primary">
                Data Real-Time & Valid
              </h3>
              <p className="text-sm leading-6 text-slate-500">
                Seluruh berkas dipantau secara transparan dan diverifikasi langsung secara digital.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 py-6 md:px-8 md:py-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-1.5 text-base font-extrabold leading-snug text-primary">
                Efisiensi Administrasi
              </h3>
              <p className="text-sm leading-6 text-slate-500">
                Menghilangkan hambatan manual dalam pengumpulan laporan analisis gender daerah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / GUIDELINES SIDE PANEL */}
      <AnimatePresence>
        {showFAQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/20 backdrop-blur-xs z-50 flex justify-end"
            onClick={() => setShowFAQ(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg h-full p-8 shadow-2xl overflow-y-auto flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-extrabold text-primary text-xl flex items-center gap-2">
                    <HelpCircle className="w-5.5 h-5.5 text-secondary" />
                    Panduan & Informasi
                  </h3>
                  <button 
                    onClick={() => setShowFAQ(false)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold bg-slate-100 px-3 py-1.5 rounded-lg"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-5 text-sm">
                  <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/15">
                    <h4 className="font-bold text-secondary mb-1">Apa itu Analisis Gender?</h4>
                    <p className="text-slate-600 leading-relaxed text-xs">
                      Proses menganalisis data dan informasi untuk mengidentifikasi kesenjangan gender, kebutuhan, serta aspirasi laki-laki dan perempuan dalam pembangunan daerah.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-primary">Dokumen yang Wajib Dikumpulkan:</h4>
                    
                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-md bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">Gender Analysis Pathway (GAP)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Langkah sistematis analisis gender untuk merumuskan kebijakan yang responsif gender.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-md bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">Gender Budget Statement (GBS)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Dokumen anggaran yang menerangkan alokasi dana khusus untuk mengatasi kesenjangan gender.</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="font-bold text-primary">Langkah Pengunggahan:</h4>
                    <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2">
                      <li>Persiapkan berkas Surat Keputusan (SK) atau berkas analisis gender OPD Anda.</li>
                      <li>Klik tombol <strong>LOGIN OPD</strong>.</li>
                      <li>Pilih nama instansi/OPD Anda dan masukkan kata sandi Anda.</li>
                      <li>Pilih tahun anggaran (2025 / 2026 / 2027) lalu unggah 4 berkas SK yang diminta.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 mt-8 space-y-3">
                <button
                  onClick={() => {
                    setShowFAQ(false);
                    const el = document.getElementById('dashboard');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Lihat Dashboard Monitoring
                </button>

                {loggedInOPD ? (
                  <button
                    onClick={() => {
                      setShowFAQ(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    Profil & Upload ({loggedInOPD.namaPendek})
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowFAQ(false);
                      setSelectedOPDToLogin(null);
                      setSearchOPDQuery('');
                      setPassword('');
                      setLoginError(null);
                      setShowLoginModal(true);
                    }}
                    className="w-full bg-[#1E40AF] hover:bg-blue-950 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Login & Isi Dokumen
                  </button>
                )}
                <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">DP3AP2KB Nusa Tenggara Timur &copy; 2026</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* MONITORING DASHBOARD WORKSPACE */}
      <section id="dashboard" className="py-16 bg-slate-50 relative z-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="text-secondary font-extrabold tracking-wider text-xs uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Sistem Monitoring Progress
              </span>
              <h2 className="text-3xl font-black text-primary mt-2">Dashboard Progres OPD Tahun {dashboardYear}</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-xl">
                Memantau progres pengunggahan dokumen analisis gender seluruh OPD berdasarkan tahun yang dipilih.
              </p>
            </div>

            {/* Kontrol Dashboard: Dropdown Tahun, Waktu Update, dan Segarkan */}
            <div className="w-full lg:w-auto bg-white border border-blue-200 rounded-2xl p-4 shadow-sm">
              <label
                htmlFor="dashboard-year-select"
                className="block text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-2"
              >
                Pilih Tahun Dashboard
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-48">
                  <select
                    id="dashboard-year-select"
                    value={dashboardYear}
                    onChange={(e) => setDashboardYear(e.target.value)}
                    className="w-full appearance-none bg-blue-50 border-2 border-blue-300 text-blue-900 text-sm font-extrabold py-3 pl-4 pr-10 rounded-xl hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer transition-all"
                    aria-label="Pilih tahun dashboard"
                  >
                    {availableDashboardYears.map(year => (
                      <option key={year} value={year}>
                        Tahun {year}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-blue-600 pointer-events-none" />
                </div>

                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Update: {lastUpdated.toLocaleTimeString('id-ID')}
                </span>

                <button
                  type="button"
                  onClick={() => fetchData(true)}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-2 bg-[#1E40AF] hover:bg-blue-900 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* CARD METRICS BENTO GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Target Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-bold tracking-wider uppercase">Total Target OPD</p>
                <p className="text-3xl font-black text-primary font-mono">{stats.targetOPD}</p>
                <p className="text-[10px] text-slate-400 font-medium">OPD Terdaftar Provinsi NTT</p>
              </div>
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Sudah Upload Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-green-300 transition-colors">
              <div className="space-y-1">
                <p className="text-xs text-green-600 font-bold tracking-wider uppercase">Sudah Upload</p>
                <p className="text-3xl font-black text-green-700 font-mono">{stats.sudahCount}</p>
                <p className="text-[10px] text-green-600/80 font-bold">Telah mengunggah dokumen</p>
              </div>
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Belum Upload Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-red-300 transition-colors">
              <div className="space-y-1">
                <p className="text-xs text-red-600 font-bold tracking-wider uppercase">Belum Upload</p>
                <p className="text-3xl font-black text-red-600 font-mono">{stats.belumCount}</p>
                <p className="text-[10px] text-red-500 font-bold">Membutuhkan tindak lanjut</p>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Percentage Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-300 transition-colors">
              <div className="space-y-1">
                <p className="text-xs text-secondary font-bold tracking-wider uppercase">Tingkat Partisipasi</p>
                <p className="text-3xl font-black text-secondary font-mono">{stats.percentageSudah.toFixed(1)}%</p>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-secondary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats.percentageSudah}%` }}
                  />
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-secondary rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* VISUAL CHARTS SECTION */}
          <VisualCharts data={displayData} stats={stats} />

          {/* OPD LIST SEARCHABLE TABLE */}
          <OPDList data={displayData} />

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary text-slate-400 py-12 relative z-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Coat_of_Arms_of_East_Nusa_Tenggara_NEW.png/500px-Coat_of_Arms_of_East_Nusa_Tenggara_NEW.png" 
              alt="Logo NTT" 
              className="h-8 w-auto grayscale opacity-80"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-white font-extrabold text-sm tracking-tight">SIPMODAG</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">DP3AP2KB PROVINSI NTT</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 text-xs font-semibold text-slate-500">
            <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
            <a href="#daftar-opd" className="hover:text-white transition-colors">Daftar OPD</a>
            {loggedInOPD ? (
              <button 
                onClick={() => setShowProfileModal(true)} 
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                Upload Dokumen ({loggedInOPD.namaPendek})
              </button>
            ) : (
              <button 
                onClick={() => {
                  setSelectedOPDToLogin(null);
                  setSearchOPDQuery('');
                  setPassword('');
                  setLoginError(null);
                  setShowLoginModal(true);
                }} 
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                Login & Upload <Lock className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-center md:text-right space-y-1">
            <p className="text-xs">&copy; 2026 Dinas Pemberdayaan Perempuan, Perlindungan Anak, Pengendalian Penduduk & KB</p>
            <p className="text-[10px] text-slate-600 font-medium">Pemerintah Provinsi Nusa Tenggara Timur</p>
          </div>
        </div>
      </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUCCESS POPUP OVERLAY */}
      <AnimatePresence>
        {successPopup && successPopup.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[60] bg-white border border-emerald-100 rounded-2xl shadow-2xl p-5 max-w-sm flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 flex items-center justify-between gap-4">
              <h4 className="font-extrabold text-slate-800 text-sm">Berhasil Upload</h4>
              <button
                onClick={() => setSuccessPopup(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
