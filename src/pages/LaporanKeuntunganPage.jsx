import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { rupiah } from "../config";
import { useAuth } from "../context/AuthContext";
import { fetchPengaturan } from "../services/productService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AlertModal from "../components/AlertModal";

// ── Preset options ───────────────────────────────────
const PRESETS = [
  { key: "7",      label: "7 Hari",  icon: "today"        },
  { key: "30",     label: "30 Hari", icon: "date_range"   },
  { key: "90",     label: "90 Hari", icon: "calendar_month" },
  { key: "custom", label: "Custom",  icon: "edit_calendar" },
];

const toDateInput = (d) => d.toISOString().split("T")[0];
const today = toDateInput(new Date());

// Format angka untuk display yang lebih ringkas
function formatCompactNumber(value) {
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

export default function LaporanKeuntunganPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rentang, setRentang] = useState("7");
  const [cabangList, setCabangList] = useState([]);
  const [filterCabang, setFilterCabang] = useState("");
  const [kasirList, setKasirList] = useState([]);
  const [filterKasir, setFilterKasir] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [namaTokoGlobal, setNamaTokoGlobal] = useState("Toko Senin");
  
  // Modal state
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });

  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return toDateInput(d);
  });
  const [customTo, setCustomTo] = useState(today);
  const [customApplied, setCustomApplied] = useState(false);

  // Load cabang dan kasir
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

  // Load transaksi
  useEffect(() => {
    if (rentang === "custom" && !customApplied) return;
    async function load() {
      setLoading(true);
      setError(null);

      // Hanya select kolom yang diperlukan
      let query = supabase
        .from("transaksi")
        .select("id, items, nama_barang, qty, total_harga, created_at, nama_kasir, cabang_id")
        .order("created_at", { ascending: false });

      if (rentang === "custom") {
        const from = new Date(customFrom);
        const to = new Date(customTo); to.setHours(23, 59, 59, 999);
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

  // Load produk untuk mendapatkan harga modal (hanya sekali)
  const [produkMap, setProdukMap] = useState({});
  useEffect(() => {
    async function loadProduk() {
      const { data } = await supabase.from("barang").select("nama_barang, harga, modal");
      if (data) {
        const map = {};
        data.forEach(p => {
          map[p.nama_barang] = { harga: p.harga, modal: p.modal || 0 };
        });
        setProdukMap(map);
      }
    }
    loadProduk();
  }, []); // Hanya load sekali

  // Hitung keuntungan - Memoize untuk menghindari re-compute setiap render
  const hasil = useMemo(() => {
    let totalPendapatan = 0;
    let totalModal = 0;
    const detailProduk = {};

    transaksi.forEach(t => {
      const items = t.items && Array.isArray(t.items) ? t.items : [{ nama: t.nama_barang, qty: t.qty || 1, harga: t.total_harga }];
      
      items.forEach(item => {
        const namaProduk = item.nama || t.nama_barang;
        const qty = item.qty || 1;
        // Gunakan harga dari item transaksi (harga jual saat transaksi)
        const hargaJual = item.harga || item.subtotal / qty || 0;
        // Ambil harga modal dari master produk (hanya untuk admin)
        const hargaModal = produkMap[namaProduk]?.modal || 0;
        
        const subtotalJual = Math.round(hargaJual * qty);
        const subtotalModal = Math.round(hargaModal * qty);
        const keuntungan = subtotalJual - subtotalModal;

        totalPendapatan += subtotalJual;
        totalModal += subtotalModal;

        if (!detailProduk[namaProduk]) {
          detailProduk[namaProduk] = {
            nama: namaProduk,
            qty: 0,
            pendapatan: 0,
            modal: 0,
            keuntungan: 0,
            hargaJual: hargaJual,
            hargaModal: hargaModal
          };
        }
        detailProduk[namaProduk].qty += qty;
        detailProduk[namaProduk].pendapatan += subtotalJual;
        detailProduk[namaProduk].modal += subtotalModal;
        detailProduk[namaProduk].keuntungan += keuntungan;
      });
    });

    const totalKeuntungan = totalPendapatan - totalModal;
    const marginPersen = totalPendapatan > 0 ? (totalKeuntungan / totalPendapatan) * 100 : 0;

    return {
      totalPendapatan,
      totalModal,
      totalKeuntungan,
      marginPersen,
      detailProduk: Object.values(detailProduk).sort((a, b) => b.keuntungan - a.keuntungan)
    };
  }, [transaksi, produkMap]);

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
      doc.text("LAPORAN KEUNTUNGAN", pageWidth / 2, 15, { align: "center" });

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

      if (filterKasir) {
        doc.setFontSize(10);
        doc.text(`Kasir: ${filterKasir}`, pageWidth / 2, currentY, { align: "center" });
        currentY += 6;
      }

      doc.setFontSize(9);
      doc.text(`Periode: ${rentangLabel}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 5;
      doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 10;

      // Ringkasan Keuntungan
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("RINGKASAN KEUNTUNGAN", 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Total Penjualan:`, 14, currentY);
      doc.text(rupiah(hasil.totalPendapatan), pageWidth - 14, currentY, { align: "right" });
      currentY += 6;

      doc.text(`Total Modal:`, 14, currentY);
      doc.text(rupiah(hasil.totalModal), pageWidth - 14, currentY, { align: "right" });
      currentY += 6;

      // Garis pemisah
      doc.setLineWidth(0.5);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 6;

      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text(`Keuntungan Kotor:`, 14, currentY);
      doc.text(rupiah(hasil.totalKeuntungan), pageWidth - 14, currentY, { align: "right" });
      currentY += 6;

      doc.setFontSize(10);
      doc.text(`Margin Keuntungan:`, 14, currentY);
      doc.text(`${hasil.marginPersen.toFixed(2)}%`, pageWidth - 14, currentY, { align: "right" });
      currentY += 10;

      // Detail per Produk
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("DETAIL KEUNTUNGAN PER PRODUK", 14, currentY);
      currentY += 5;

      const tableData = hasil.detailProduk.map(p => [
        p.nama,
        p.qty.toString(),
        rupiah(p.hargaModal),
        rupiah(p.hargaJual),
        rupiah(p.modal),
        rupiah(p.pendapatan),
        rupiah(p.keuntungan)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Produk", "QTY", "Modal/Unit", "Jual/Unit", "Total Modal", "Total Jual", "Keuntungan"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [11, 87, 58], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 15, halign: "center" },
          2: { cellWidth: 22, halign: "right" },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 25, halign: "right", fontStyle: "bold" }
        },
        margin: { left: 14, right: 14 }
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(8);
      doc.setFont(undefined, "italic");
      doc.text("* Keuntungan dihitung dari: (Harga Jual - Modal) × Qty Terjual", 14, finalY);

      // Generate filename
      const cabangName = filterCabang && cabangList.length > 0
        ? cabangList.find(c => c.id === filterCabang)?.nama.replace(/\s/g, "_")
        : "";
      const kasirName = filterKasir ? filterKasir.replace(/\s/g, "_") : "";
      const dateRange = rentang === "custom" ? `${customFrom}_${customTo}` : `${rentang}hari`;
      const fileName = `Laporan_Keuntungan_${dateRange}${cabangName ? `_${cabangName}` : ""}${kasirName ? `_${kasirName}` : ""}.pdf`;

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

  if (!isAdmin) {
    return (
      <main className="pt-20 pb-8 lg:ml-[280px] px-gutter md:px-margin-page min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-error mb-4 block">lock</span>
          <h2 className="text-headline-lg text-on-surface mb-2">Akses Ditolak</h2>
          <p className="text-body-md text-on-surface-variant">Halaman ini hanya dapat diakses oleh Admin.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-gutter md:px-margin-page min-h-[100dvh]">
      {/* Header */}
      <section className="mb-lg">
        <h2 className="text-headline-lg text-on-surface mb-xs">Laporan Keuntungan</h2>
        <div className="bg-secondary-container/20 border-l-4 border-secondary p-md rounded-r-xl mb-md max-w-4xl">
          <p className="text-body-md sm:text-body-lg text-secondary break-words">
            Analisis keuntungan kotor berdasarkan selisih harga jual dan modal produk.
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-gutter">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-sm mb-sm">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">Rentang Waktu</p>
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
                <span className="material-symbols-outlined" style={{ fontSize: "18px", fontVariationSettings: rentang === p.key ? "'FILL' 1" : "'FILL' 0" }}>
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Filter Cabang */}
          {cabangList.length > 0 && (
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

          {/* Filter Kasir */}
          {kasirList.length > 0 && (
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

          {/* Custom date picker */}
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
            <strong className="text-secondary break-words">{rentangLabel}</strong>
            <span>·</span>
            <span className="whitespace-nowrap">{transaksi.length} transaksi</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
            <StatCard icon="payments" label="Total Penjualan" value={rupiah(hasil.totalPendapatan)} color="text-primary" sub={rentangLabel} />
            <StatCard icon="shopping_cart" label="Total Modal" value={rupiah(hasil.totalModal)} color="text-on-surface-variant" sub="biaya produk" />
            <StatCard icon="trending_up" label="Keuntungan Kotor" value={rupiah(hasil.totalKeuntungan)} color="text-secondary" sub="laba kotor" />
            <StatCard icon="percent" label="Margin Keuntungan" value={`${hasil.marginPersen.toFixed(1)}%`} color="text-tertiary" sub="persentase laba" />
          </div>

          {/* Detail per Produk */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="p-md bg-surface-container border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="text-headline-md text-on-surface">Detail Keuntungan per Produk</h3>
              <span className="text-label-sm text-on-surface-variant">{hasil.detailProduk.length} produk</span>
            </div>

            {hasil.detailProduk.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
                <span className="material-symbols-outlined text-5xl mb-2">inventory_2</span>
                <p className="text-body-md">Belum ada data produk terjual</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-outline-variant/10">
                  {hasil.detailProduk.map((p, i) => (
                    <div key={i} className="p-md hover:bg-surface-container-low transition-colors">
                      <div className="flex items-start justify-between mb-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-label-md text-on-surface font-bold truncate">{p.nama}</p>
                          <p className="text-label-sm text-on-surface-variant">Terjual: {p.qty} unit</p>
                        </div>
                        <span className={`material-symbols-outlined text-xl ml-sm ${p.keuntungan > 0 ? 'text-secondary' : 'text-error'}`}>
                          {p.keuntungan > 0 ? 'trending_up' : 'trending_down'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-sm text-label-sm">
                        <div>
                          <p className="text-on-surface-variant">Penjualan</p>
                          <p className="text-primary font-bold">{formatCompactNumber(p.pendapatan)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-on-surface-variant">Keuntungan</p>
                          <p className={`font-bold ${p.keuntungan > 0 ? 'text-secondary' : 'text-error'}`}>
                            {formatCompactNumber(p.keuntungan)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Mobile Total */}
                  <div className="p-md bg-surface-container">
                    <div className="flex items-center justify-between mb-sm">
                      <p className="text-label-lg font-bold text-on-surface">TOTAL</p>
                    </div>
                    <div className="grid grid-cols-2 gap-sm text-label-sm">
                      <div>
                        <p className="text-on-surface-variant">Total Penjualan</p>
                        <p className="text-primary font-bold text-label-md">{formatCompactNumber(hasil.totalPendapatan)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-on-surface-variant">Total Keuntungan</p>
                        <p className="text-secondary font-bold text-label-md">{formatCompactNumber(hasil.totalKeuntungan)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                        <th className="text-label-md text-on-surface-variant text-left px-md py-sm whitespace-nowrap">Produk</th>
                        <th className="text-label-md text-on-surface-variant text-center px-md py-sm whitespace-nowrap">QTY</th>
                        <th className="text-label-md text-on-surface-variant text-right px-md py-sm whitespace-nowrap">Modal/Unit</th>
                        <th className="text-label-md text-on-surface-variant text-right px-md py-sm whitespace-nowrap">Jual/Unit</th>
                        <th className="text-label-md text-on-surface-variant text-right px-md py-sm whitespace-nowrap">Total Modal</th>
                        <th className="text-label-md text-on-surface-variant text-right px-md py-sm whitespace-nowrap">Total Penjualan</th>
                        <th className="text-label-md text-on-surface-variant text-right px-md py-sm whitespace-nowrap">Keuntungan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.detailProduk.map((p, i) => (
                        <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                          <td className="px-md py-sm">
                            <p className="text-label-md text-on-surface font-semibold">{p.nama}</p>
                          </td>
                          <td className="px-md py-sm text-center text-body-md text-on-surface">{p.qty}</td>
                          <td className="px-md py-sm text-right text-label-md text-on-surface-variant">{rupiah(p.hargaModal)}</td>
                          <td className="px-md py-sm text-right text-label-md text-on-surface">{rupiah(p.hargaJual)}</td>
                          <td className="px-md py-sm text-right text-label-md text-on-surface-variant">{rupiah(p.modal)}</td>
                          <td className="px-md py-sm text-right text-label-md text-primary font-bold">{rupiah(p.pendapatan)}</td>
                          <td className="px-md py-sm text-right">
                            <span className={`text-label-md font-bold flex items-center justify-end gap-xs ${p.keuntungan > 0 ? 'text-secondary' : 'text-error'}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                {p.keuntungan > 0 ? 'trending_up' : 'trending_down'}
                              </span>
                              {rupiah(p.keuntungan)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-outline-variant/40 bg-surface-container">
                        <td className="px-md py-sm text-label-md text-on-surface font-bold" colSpan="4">TOTAL</td>
                        <td className="px-md py-sm text-right text-label-md text-on-surface font-bold">{rupiah(hasil.totalModal)}</td>
                        <td className="px-md py-sm text-right text-label-md text-primary font-bold">{rupiah(hasil.totalPendapatan)}</td>
                        <td className="px-md py-sm text-right text-label-md text-secondary font-bold">{rupiah(hasil.totalKeuntungan)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
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
