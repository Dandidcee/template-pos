import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { rupiah } from "../config";
import { useAuth } from "../context/AuthContext";

// Format payment type dari Midtrans jadi user-friendly
function formatPaymentType(type) {
  if (!type) return "Midtrans";
  
  const typeMap = {
    'qris': 'QRIS',
    'gopay': 'GoPay',
    'shopeepay': 'ShopeePay',
    'bank_transfer': 'Transfer Bank',
    'bca_va': 'BCA Virtual Account',
    'bni_va': 'BNI Virtual Account',
    'bri_va': 'BRI Virtual Account',
    'permata_va': 'Permata Virtual Account',
    'echannel': 'Mandiri Bill Payment',
    'cstore': 'Convenience Store',
    'akulaku': 'Akulaku',
    'kredivo': 'Kredivo',
  };
  
  return typeMap[type.toLowerCase()] || type.toUpperCase();
}

const METODE_CONFIG = {
  tunai: { 
    label: "Tunai", 
    icon: "payments",
    color: "text-on-surface",
    bgColor: "bg-surface-container"
  },
  qr: { 
    label: "Midtrans", 
    icon: "credit_card",
    color: "text-primary",
    bgColor: "bg-primary-container/20"
  },
  transfer: { 
    label: "Transfer", 
    icon: "account_balance",
    color: "text-on-surface",
    bgColor: "bg-surface-container"
  }
};

export default function RiwayatPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [filterMetode, setFilter] = useState("semua");
  const [filterUrutan, setFilterUrutan] = useState("terbaru"); // terbaru, terlama, terbesar, terkecil
  const [cabangList, setCabangList] = useState([]);
  const [filterCabang, setFilterCabang] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function loadCabang() {
      if (isAdmin) {
        const { data } = await supabase.from("cabang").select("*").order("nama");
        if (data) setCabangList(data);
      }
    }
    loadCabang();
  }, [isAdmin]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("transaksi")
        .select("*, pelanggan:pelanggan_id(*)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!isAdmin && kasir?.cabang_id) {
        query = query.eq("cabang_id", kasir.cabang_id);
      } else if (isAdmin && filterCabang) {
        query = query.eq("cabang_id", filterCabang);
      }

      const { data, error } = await query;
      if (error) setError(error.message);
      else setTransaksi(data || []);
      setLoading(false);
    }
    load();
  }, [filterCabang, isAdmin, kasir?.cabang_id]);

  // Memoize filtered dan sorted data untuk menghindari re-compute setiap render
  const filtered = useMemo(() => {
    return transaksi.filter((t) => {
      const matchSearch = !searchDebounced ||
        t.nama_barang?.toLowerCase().includes(searchDebounced.toLowerCase()) ||
        String(t.order_number).includes(searchDebounced);
      const matchMetode = filterMetode === "semua" || t.metode_pembayaran === filterMetode;
      return matchSearch && matchMetode;
    });
  }, [transaksi, searchDebounced, filterMetode]);

  // Memoize sorted data
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (filterUrutan) {
        case "terbaru":
          return new Date(b.created_at) - new Date(a.created_at);
        case "terlama":
          return new Date(a.created_at) - new Date(b.created_at);
        case "terbesar":
          return Number(b.total_harga) - Number(a.total_harga);
        case "terkecil":
          return Number(a.total_harga) - Number(b.total_harga);
        default:
          return 0;
      }
    });
  }, [filtered, filterUrutan]);

  // Memoize totalHariIni
  const totalHariIni = useMemo(() => {
    return transaksi
      .filter((t) => new Date(t.created_at).toDateString() === new Date().toDateString())
      .reduce((acc, t) => acc + Number(t.total_harga || 0), 0);
  }, [transaksi]);

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-gutter md:px-margin-page min-h-[100dvh]">
      {/* Header */}
      <section className="mb-lg">
        <h2 className="text-headline-lg text-on-surface mb-xs">Riwayat Transaksi</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl max-w-4xl">
          <p className="text-body-lg text-primary">
            Pantau history transaksi secara real-time
          </p>
        </div>
      </section>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: "Total Transaksi", value: transaksi.length, icon: "receipt_long", color: "text-primary" },
          { label: "Pendapatan Hari Ini", value: rupiah(totalHariIni), icon: "payments", color: "text-secondary" },
          { label: "Transaksi Tunai", value: transaksi.filter(t => t.metode_pembayaran === "tunai").length, icon: "money", color: "text-tertiary" },
          { label: "Transfer / QRIS", value: transaksi.filter(t => t.metode_pembayaran !== "tunai").length, icon: "account_balance", color: "text-on-surface-variant" },
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
            <span className={`material-symbols-outlined text-3xl ${s.color} mb-xs block opacity-70`}>{s.icon}</span>
            <p className="text-headline-md text-on-surface font-bold">{s.value}</p>
            <p className="text-label-sm text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-sm mb-md">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-sm">
          {[
            { id: "semua",    label: "Semua",     icon: "filter_list" },
            { id: "tunai",    label: "Tunai",     icon: "payments" },
            { id: "qr",       label: "Midtrans",  icon: "credit_card" },
            { id: "transfer", label: "Transfer",  icon: "account_balance" },
          ].map((m) => {
            const active = filterMetode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setFilter(m.id)}
                className={`flex items-center gap-xs px-md py-sm rounded-xl text-label-md transition-all duration-200 border-2 ${
                  active
                    ? "bg-primary text-on-primary border-primary shadow-md scale-105"
                    : "bg-surface-container-lowest text-on-surface-variant border-transparent hover:bg-surface-container hover:border-outline-variant/30"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {m.icon}
                </span>
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Search, Urutan & Cabang Filter */}
        <div className="flex flex-col sm:flex-row gap-sm">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none z-10">search</span>
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang atau nomor order..."
              className="h-12 w-full pl-12 pr-md rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface shadow-sm transition-all relative z-0"
            />
          </div>
          <div className="relative z-10">
            <select
              value={filterUrutan}
              onChange={(e) => setFilterUrutan(e.target.value)}
              className="h-12 px-md rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface shadow-sm transition-all w-full sm:w-auto min-w-[180px]"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="terbesar">Nilai Terbesar</option>
              <option value="terkecil">Nilai Terkecil</option>
            </select>
          </div>
          {isAdmin && cabangList.length > 0 && (
            <div className="relative z-10">
              <select
                value={filterCabang}
                onChange={(e) => setFilterCabang(e.target.value)}
                className="h-12 px-md rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface shadow-sm transition-all w-full sm:w-auto min-w-[200px]"
              >
                <option value="">Semua Cabang</option>
                {cabangList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="p-md bg-surface-container border-b border-outline-variant/20 flex items-center justify-between">
          <h3 className="text-headline-md text-on-surface">Daftar Transaksi</h3>
          <span className="text-label-sm text-on-surface-variant">{sorted.length} transaksi</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-body-md">Memuat data dari Supabase...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-error">
            <span className="material-symbols-outlined text-5xl mb-2">error</span>
            <p className="text-body-md">{error}</p>
            <p className="text-label-sm text-on-surface-variant mt-1">Periksa konfigurasi Supabase di .env</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <span className="material-symbols-outlined text-5xl mb-2">receipt_long</span>
            <p className="text-body-md">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">#Order</th>
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Barang</th>
                  <th className="text-label-md text-on-surface-variant text-right px-md py-sm">QTY</th>
                  <th className="text-label-md text-on-surface-variant text-right px-md py-sm">Total</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Metode</th>
                  <th className="text-label-md text-on-surface-variant text-right px-md py-sm">Kembalian</th>
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Kasir</th>
                  {isAdmin && <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Cabang</th>}
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <tr key={t.id || i}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-sm">
                      <span className="text-label-md text-primary font-bold">#{t.order_number || "—"}</span>
                    </td>
                    <td className="px-md py-sm">
                      {t.items && t.items.length > 0 ? (
                        <div className="space-y-1">
                          {t.items.map((item, idx) => (
                            <p key={idx} className="text-label-md text-on-surface">
                              • {item.nama} <span className="opacity-70">(x{item.qty})</span>
                              {item.catatan && <span className="block text-label-sm text-primary ml-2">"{item.catatan}"</span>}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="text-label-md text-on-surface">{t.nama_barang}</p>
                          {t.catatan && <p className="text-label-sm text-on-surface-variant">{t.catatan}</p>}
                        </>
                      )}
                    </td>
                    <td className="px-md py-sm text-right text-body-md text-on-surface">
                      {t.items && t.items.length > 0 ? t.items.reduce((sum, item) => sum + item.qty, 0) : t.qty}
                    </td>
                    <td className="px-md py-sm text-right">
                      <span className="text-label-md text-on-surface font-bold">{rupiah(t.total_harga)}</span>
                    </td>
                    <td className="px-md py-sm text-center">
                      <div className="flex items-center justify-center">
                        {(() => {
                          const config = METODE_CONFIG[t.metode_pembayaran] || METODE_CONFIG.tunai;
                          
                          // Untuk Midtrans, tampilkan payment type spesifik
                          let displayLabel = config.label;
                          if (t.metode_pembayaran === 'qr' && t.midtrans_payment_type) {
                            displayLabel = formatPaymentType(t.midtrans_payment_type);
                          }
                          
                          return (
                            <span className={`inline-flex items-center gap-xs text-label-sm px-sm py-xs rounded-full ${config.bgColor} ${config.color}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                {config.icon}
                              </span>
                              {displayLabel}
                              {t.metode_pembayaran === 'transfer' && t.nama_bank && ` - ${t.nama_bank}`}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-md py-sm text-right text-body-md text-secondary">
                      {t.kembalian != null ? rupiah(t.kembalian) : "—"}
                    </td>
                    <td className="px-md py-sm text-label-sm text-on-surface-variant">
                      {t.nama_kasir || "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-md py-sm text-label-sm text-on-surface-variant">
                        {t.nama_cabang || "—"}
                      </td>
                    )}
                    <td className="px-md py-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
