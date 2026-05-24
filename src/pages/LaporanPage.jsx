import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { rupiah } from "../config";
import { useAuth } from "../context/AuthContext";
import { fetchPengaturan } from "../services/productService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AlertModal from "../components/AlertModal";

// ── Helpers ─────────────────────────────────────────
// Format angka untuk chart (lebih pendek)
function formatChartNumber(value) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}jt`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}rb`;
  }
  return value.toString();
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
      <span className={`material-symbols-outlined text-3xl ${color} mb-xs block opacity-70`}>{icon}</span>
      <p className="text-headline-md md:text-display-total-mobile text-on-surface font-bold break-words">{value}</p>
      <p className="text-label-sm md:text-label-md text-on-surface-variant">{label}</p>
      {sub && <p className="text-label-xs md:text-label-sm text-on-surface-variant mt-xs opacity-70 truncate" title={sub}>{sub}</p>}
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-xs">
      {data.map((d, i) => {
        const percentage = (d.value / max) * 100;
        const showOutside = percentage < 25; // Show outside if bar is too narrow
        
        return (
          <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-xs sm:gap-sm">
            <span className="text-label-xs sm:text-label-sm text-on-surface-variant w-full sm:w-24 text-left sm:text-right shrink-0 truncate" title={d.label}>{d.label}</span>
            <div className="w-full sm:flex-1 flex items-center gap-xs">
              <div className="flex-1 h-8 bg-surface-container rounded-lg overflow-visible relative group">
                <div
                  className="h-full bg-primary rounded-lg transition-all duration-700 flex items-center justify-end pr-xs sm:pr-sm relative"
                  style={{ width: `${percentage}%` }}
                  title={rupiah(d.value)}
                >
                  {d.value > 0 && !showOutside && (
                    <span className="text-[10px] sm:text-label-xs text-on-primary font-medium whitespace-nowrap">
                      {formatChartNumber(d.value)}
                    </span>
                  )}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute left-0 top-full mt-1 bg-inverse-surface text-inverse-on-surface px-sm py-xs rounded text-label-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {rupiah(d.value)}
                </div>
              </div>
              {d.value > 0 && showOutside && (
                <span className="text-[10px] sm:text-label-xs text-on-surface font-medium whitespace-nowrap">
                  {formatChartNumber(d.value)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Preset options ───────────────────────────────────
const PRESETS = [
  { key: "7",      label: "7 Hari",  icon: "today"        },
  { key: "30",     label: "30 Hari", icon: "date_range"   },
  { key: "90",     label: "90 Hari", icon: "calendar_month" },
  { key: "custom", label: "Custom",  icon: "edit_calendar" },
];

// Format date for input[type=date] (YYYY-MM-DD)
const toDateInput = (d) => d.toISOString().split("T")[0];
const today       = toDateInput(new Date());

export default function LaporanPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [rentang, setRentang]     = useState("7");
  const [cabangList, setCabangList] = useState([]);
  const [filterCabang, setFilterCabang] = useState("");
  const [kasirList, setKasirList] = useState([]);
  const [filterKasir, setFilterKasir] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [namaTokoGlobal, setNamaTokoGlobal] = useState("Toko Senin");
  
  // Modal state
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });

  // Custom date range
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return toDateInput(d);
  });
  const [customTo, setCustomTo] = useState(today);
  const [customApplied, setCustomApplied] = useState(false);

  useEffect(() => {
    async function loadCabang() {
      if (isAdmin) {
        const { data } = await supabase.from("cabang").select("*").order("nama");
        if (data) setCabangList(data);
      }
    }
    async function loadKasir() {
      if (isAdmin) {
        const { data } = await supabase.from("kasir").select("id, nama_lengkap, username, cabang_id, cabang:cabang_id(nama)").order("nama_lengkap");
        if (data) setKasirList(data);
      }
    }
    async function loadPengaturanGlobal() {
      const p = await fetchPengaturan();
      if (p) setNamaTokoGlobal(p.nama_toko || "Toko Senin");
    }
    loadCabang();
    loadKasir();
    loadPengaturanGlobal();

    const handleRefresh = async () => {
      const p = await fetchPengaturan();
      if (p) setNamaTokoGlobal(p.nama_toko || "Toko Senin");
    };

    window.addEventListener('pengaturanUpdated', handleRefresh);
    
    const handleStorage = (e) => {
      if (e.key === 'pengaturan_updated') handleRefresh();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('pengaturanUpdated', handleRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (rentang === "custom" && !customApplied) return;
    async function load() {
      setLoading(true);
      setError(null);

      // Hanya select kolom yang diperlukan untuk mengurangi data transfer
      let query = supabase
        .from("transaksi")
        .select("id, order_number, total_harga, metode_pembayaran, nama_bank, items, nama_barang, qty, created_at, nama_kasir, nama_cabang, cabang_id")
        .order("created_at", { ascending: false });

      if (rentang === "custom") {
        const from = new Date(customFrom);
        const to   = new Date(customTo); to.setHours(23, 59, 59, 999);
        query = query.gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
      } else {
        const since = new Date(); since.setDate(since.getDate() - parseInt(rentang));
        query = query.gte("created_at", since.toISOString());
      }

      if (!isAdmin && kasir?.cabang_id) {
        query = query.eq("cabang_id", kasir.cabang_id);
      } else if (isAdmin && filterCabang) {
        query = query.eq("cabang_id", filterCabang);
      }
      
      if (isAdmin && filterKasir) {
        query = query.eq("nama_kasir", filterKasir);
      }

      const { data, error } = await query;
      if (error) setError(error.message);
      else setTransaksi(data || []);
      setLoading(false);
      setCustomApplied(false);
    }
    load();
  }, [rentang, customApplied, filterCabang, filterKasir, isAdmin, kasir?.cabang_id, customFrom, customTo]);

  // Derived - Memoize untuk menghindari re-compute setiap render
  const totalPendapatan = useMemo(() => {
    return transaksi.reduce((a, t) => a + Number(t.total_harga || 0), 0);
  }, [transaksi]);

  const totalTx = transaksi.length;
  const rataRata = totalTx ? totalPendapatan / totalTx : 0;

  const byMetode = useMemo(() => {
    return ["tunai", "qr", "transfer"].map((m) => ({
      label: { tunai: "Tunai", qr: "Midtrans", transfer: "Transfer" }[m],
      value: transaksi.filter(t => t.metode_pembayaran === m).reduce((a, t) => a + Number(t.total_harga || 0), 0),
      count: transaksi.filter(t => t.metode_pembayaran === m).length,
    }));
  }, [transaksi]);

  const hariCount = rentang === "custom"
    ? Math.max(1, Math.ceil((new Date(customTo) - new Date(customFrom)) / 86400000) + 1)
    : parseInt(rentang);

  const hariData = useMemo(() => {
    const data = [];
    for (let i = hariCount - 1; i >= 0; i--) {
      const d = rentang === "custom" ? new Date(customFrom) : new Date();
      if (rentang === "custom") d.setDate(d.getDate() + (hariCount - 1 - i));
      else d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const sum = transaksi
        .filter(t => new Date(t.created_at).toDateString() === key)
        .reduce((a, t) => a + Number(t.total_harga || 0), 0);
      data.push({
        label: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
        value: sum,
      });
    }
    return data;
  }, [transaksi, hariCount, rentang, customFrom]);

  const topProduk = useMemo(() => {
    return Object.entries(
      transaksi.reduce((acc, t) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach(item => {
            const k = item.nama || "?";
            acc[k] = (acc[k] || 0) + Number(item.subtotal || 0);
          });
        } else {
          const k = t.nama_barang || "?";
          acc[k] = (acc[k] || 0) + Number(t.total_harga || 0);
        }
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
  }, [transaksi]);

  // Subtitle rentang
  const rentangLabel = rentang === "custom"
    ? `${new Date(customFrom).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${new Date(customTo).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
    : `${rentang} hari terakhir`;

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(18);
      doc.text("LAPORAN PENJUALAN", pageWidth / 2, 15, { align: "center" });
      
      doc.setFontSize(11);
      doc.text(namaTokoGlobal, pageWidth / 2, 22, { align: "center" });
      
      let currentY = 28;
      
      if (filterCabang && cabangList.length > 0) {
        const cabang = cabangList.find(c => c.id === filterCabang);
        if (cabang) {
          doc.setFontSize(10);
          doc.text(`Cabang: ${cabang.nama}`, pageWidth / 2, currentY, { align: "center" });
          currentY += 6;
        }
      }
      
      doc.setFontSize(9);
      doc.text(`Periode: ${rentangLabel}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 5;
      doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 10;
      
      // Ringkasan
      doc.setFontSize(12);
      doc.text("Ringkasan", 14, currentY);
      currentY += 6;
      
      doc.setFontSize(10);
      doc.text(`Total Pendapatan: ${rupiah(totalPendapatan)}`, 14, currentY);
      currentY += 5;
      doc.text(`Total Transaksi: ${totalTx}`, 14, currentY);
      currentY += 5;
      doc.text(`Rata-rata per Order: ${rupiah(rataRata)}`, 14, currentY);
      currentY += 10;
      
      // Rincian Transaksi
      doc.setFontSize(12);
      doc.text("Rincian Transaksi", 14, currentY);
      currentY += 5;
      
      const tableData = transaksi.map((t) => {
        const barang = t.items && Array.isArray(t.items) && t.items.length > 0 
          ? t.items.map(item => `${item.nama || 'Item'} (x${item.qty || 0})`).join(", ")
          : (t.nama_barang || "-");
        
        const qty = t.items && Array.isArray(t.items) && t.items.length > 0 
          ? t.items.reduce((sum, item) => sum + (item.qty || 0), 0).toString()
          : (t.qty || "-").toString();
        
        return [
          t.order_number || "-",
          new Date(t.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          barang,
          qty,
          rupiah(t.total_harga || 0),
          t.metode_pembayaran === "tunai" ? "Tunai" : t.metode_pembayaran === "qr" ? "Midtrans" : "Transfer",
          t.nama_kasir || "-",
          t.nama_cabang || "-"
        ];
      });
      
      autoTable(doc, {
        startY: currentY,
        head: [["Order", "Waktu", "Barang", "QTY", "Total", "Metode", "Kasir", "Cabang"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [11, 87, 58], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 12 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 22 },
          7: { cellWidth: 22 }
        },
        margin: { left: 14, right: 14 }
      });
      
      currentY = doc.lastAutoTable.finalY + 10;
      
      // Cek apakah perlu halaman baru
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      // Stok Produk Terjual
      doc.setFontSize(12);
      doc.text("Stok Produk Terjual", 14, currentY);
      currentY += 5;
      
      const stockData = {};
      transaksi.forEach(t => {
        if (t.items && Array.isArray(t.items) && t.items.length > 0) {
          t.items.forEach(item => {
            const key = item.nama || "Unknown";
            if (!stockData[key]) {
              stockData[key] = { qty: 0, satuan: item.satuan || "pcs" };
            }
            stockData[key].qty += item.qty || 0;
          });
        } else if (t.nama_barang) {
          const key = t.nama_barang;
          if (!stockData[key]) {
            stockData[key] = { qty: 0, satuan: "pcs" };
          }
          stockData[key].qty += t.qty || 0;
        }
      });
      
      const stockTableData = Object.entries(stockData).map(([nama, data]) => [
        nama,
        `${data.qty} ${data.satuan}`
      ]);
      
      if (stockTableData.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["Nama Produk", "Total Terjual"]],
          body: stockTableData,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [11, 87, 58], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60 }
          },
          margin: { left: 14, right: 14 }
        });
      }
      
      // Generate filename
      const cabangName = filterCabang && cabangList.length > 0 
        ? cabangList.find(c => c.id === filterCabang)?.nama.replace(/\s/g, "_") 
        : "";
      const dateRange = rentang === "custom" ? `${customFrom}_${customTo}` : `${rentang}hari`;
      const fileName = `Laporan_Penjualan_${dateRange}${cabangName ? `_${cabangName}` : ""}.pdf`;
      
      doc.save(fileName);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setAlertModal({
        isOpen: true,
        title: "Gagal Membuat PDF",
        message: `Gagal membuat PDF: ${err.message || "Unknown error"}`,
        type: "error"
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-gutter md:px-margin-page min-h-[100dvh]">

      {/* Header + Filter */}
      <section className="mb-lg">
        <h2 className="text-headline-lg text-on-surface mb-xs">Laporan Penjualan</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl mb-md max-w-4xl">
          <p className="text-body-md sm:text-body-lg text-primary break-words">Analisis performa penjualan {namaTokoGlobal} secara real-time.</p>
        </div>

        {/* ── Modern Period Selector ── */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-gutter">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-sm mb-sm">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">Rentang Waktu</p>
            {isAdmin && (
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF || loading || transaksi.length === 0}
                className="flex items-center gap-xs px-md py-sm bg-secondary text-on-secondary rounded-xl text-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                {downloadingPDF ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></span>
                    <span className="hidden sm:inline">Membuat PDF...</span>
                    <span className="sm:hidden">Loading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>download</span>
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Pill buttons */}
          <div className="flex flex-wrap gap-sm mb-sm">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setRentang(p.key); setCustomApplied(false); }}
                className={`flex items-center gap-xs px-md py-sm rounded-xl text-label-md transition-all duration-200 border-2 ${
                  rentang === p.key
                    ? "bg-primary text-on-primary border-primary shadow-md scale-105"
                    : "bg-surface-container text-on-surface-variant border-transparent hover:bg-surface-container-high hover:border-outline-variant/30"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px", fontVariationSettings: rentang === p.key ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Filter Cabang untuk Admin */}
          {isAdmin && cabangList.length > 0 && (
            <div className="mb-sm relative z-10">
              <label className="text-label-sm text-on-surface-variant block mb-xs">Filter Cabang</label>
              <select
                value={filterCabang}
                onChange={(e) => setFilterCabang(e.target.value)}
                className="h-11 w-full px-md rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface truncate"
              >
                <option value="">Semua Cabang</option>
                {cabangList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Kasir untuk Admin */}
          {isAdmin && kasirList.length > 0 && (
            <div className="mb-sm relative z-10">
              <label className="text-label-sm text-on-surface-variant block mb-xs">Filter Kasir</label>
              <select
                value={filterKasir}
                onChange={(e) => setFilterKasir(e.target.value)}
                className="h-11 w-full px-md rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface truncate"
              >
                <option value="">Semua Kasir</option>
                {kasirList
                  .filter(k => !filterCabang || k.cabang_id === filterCabang)
                  .map((k) => (
                    <option key={k.id} value={k.nama_lengkap}>
                      {k.nama_lengkap} ({k.username})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Custom date picker — slide down when "custom" selected */}
          {rentang === "custom" && (
            <div className="mt-sm pt-sm border-t border-outline-variant/20 field-enter">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm mb-sm">
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant block">Dari Tanggal</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{fontSize:"18px"}}>calendar_today</span>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-11 w-full pl-10 pr-sm rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant block">Sampai Tanggal</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{fontSize:"18px"}}>event</span>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom}
                      max={today}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-11 w-full pl-10 pr-sm rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCustomApplied(true)}
                className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined" style={{fontSize:"18px"}}>search</span>
                Terapkan Filter
              </button>
            </div>
          )}

          {/* Active period badge */}
          <div className="mt-sm flex flex-wrap items-center gap-xs text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined" style={{fontSize:"16px"}}>schedule</span>
            <span className="break-words">Menampilkan data:</span>
            <strong className="text-primary break-words">{rentangLabel}</strong>
            <span>·</span>
            <span className="whitespace-nowrap">{totalTx} transaksi</span>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant opacity-50">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-body-md">Memuat laporan...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-error">
          <span className="material-symbols-outlined text-5xl mb-2">error</span>
          <p className="text-body-md">{error}</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter mb-lg">
            <StatCard icon="payments"     label="Total Pendapatan"  value={rupiah(totalPendapatan)} color="text-primary"            sub={rentangLabel} />
            <StatCard icon="receipt_long" label="Total Transaksi"   value={totalTx}                 color="text-secondary"          sub="transaksi berhasil" />
            <StatCard icon="calculate"    label="Rata-rata / Order" value={rupiah(rataRata)}         color="text-on-surface-variant" sub="nilai per transaksi" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">

            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md">
              <h3 className="text-headline-md text-on-surface mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">bar_chart</span>
                <span className="break-words">Pendapatan per Hari</span>
              </h3>
              {hariData.every(d => d.value === 0) ? (
                <div className="text-center py-8 text-on-surface-variant opacity-50">
                  <span className="material-symbols-outlined text-4xl block mb-2">bar_chart</span>
                  <p className="text-body-md">Belum ada data di rentang ini</p>
                </div>
              ) : (
                <BarChart data={hariData} />
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md">
              <h3 className="text-headline-md text-on-surface mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">donut_large</span>
                <span className="break-words">Metode Pembayaran</span>
              </h3>
              <div className="space-y-gutter">
                {byMetode.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-sm bg-surface-container rounded-lg gap-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-label-md text-on-surface truncate">{m.label}</p>
                      <p className="text-label-sm text-on-surface-variant">{m.count} transaksi</p>
                    </div>
                    <span className="text-label-md text-primary font-bold whitespace-nowrap">{rupiah(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md xl:col-span-2">
              <h3 className="text-headline-md text-on-surface mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">emoji_events</span>
                <span className="break-words">Top 5 Produk Terlaris</span>
              </h3>
              {topProduk.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant opacity-50">
                  <p className="text-body-md">Belum ada data produk</p>
                </div>
              ) : (
                <BarChart data={topProduk} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </main>
  );
}
