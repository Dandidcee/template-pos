import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { rupiah } from "../config";
import { useAuth } from "../context/AuthContext";
import { fetchProducts } from "../services/productService";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import ProductFormModal from "../components/ProductFormModal";

// Satuan options — no emoji, Material Icons only
const SATUAN_OPTIONS = [
  { value: "pcs",   label: "Per Buah",      abbr: "pcs",  icon: "shopping_bag",     group: "umum"   },
  { value: "kg",    label: "Per Kilogram",   abbr: "kg",   icon: "scale",            group: "berat"  },
  { value: "gram",  label: "Per Gram",       abbr: "gr",   icon: "weight",           group: "berat"  },
  { value: "liter", label: "Per Liter",      abbr: "L",    icon: "water_drop",       group: "volume" },
  { value: "ml",    label: "Per Mililiter",  abbr: "ml",   icon: "opacity",          group: "volume" },
  { value: "pack",  label: "Per Pack",       abbr: "pack", icon: "inventory_2",      group: "umum"   },
  { value: "lusin", label: "Per Lusin",      abbr: "lsn",  icon: "grid_view",        group: "umum"   },
  { value: "porsi", label: "Per Porsi",      abbr: "porsi",icon: "restaurant_menu",  group: "umum"   },
];

const GROUP_COLOR = {
  umum   : "text-primary   bg-primary-container/20   border-primary-container/40",
  berat  : "text-secondary bg-secondary-container/30 border-secondary-container/60",
  volume : "text-tertiary  bg-tertiary-fixed/20       border-tertiary-fixed/40",
};

export default function StokPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [filterStok, setFilterStok] = useState("semua"); // semua, habis, menipis, tersedia
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Cabang state
  const [cabangList, setCabangList] = useState([]);
  const [filterCabang, setFilterCabang] = useState(isAdmin ? "" : kasir?.cabang_id);

  // Form add/edit
  const [form, setForm]         = useState({ 
    nama_barang: "", harga: "", stok: "", satuan: "pcs", modal: "",
    cabang_id: isAdmin ? "" : (kasir?.cabang_id || "") 
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [formMsg, setFormMsg]   = useState(null);
  const [satuanOpen, setSatuanOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Alert & Confirm modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "", type: "info", title: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: "", onConfirm: null, productName: "" });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSatuanOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadCabang() {
      if (isAdmin) {
        const { data } = await supabase.from("cabang").select("*").order("nama");
        if (data) setCabangList(data);
      }
    }
    loadCabang();
  }, [isAdmin]);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await fetchProducts(isAdmin ? filterCabang || null : kasir?.cabang_id, isAdmin);
      setProducts(data || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, [filterCabang, kasir]);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.nama_barang?.toLowerCase().includes(search.toLowerCase());
    
    let matchStok = true;
    if (filterStok === "habis") {
      matchStok = p.stok === 0;
    } else if (filterStok === "menipis") {
      matchStok = p.stok > 0 && p.stok < 10;
    } else if (filterStok === "tersedia") {
      matchStok = p.stok === null || p.stok >= 10;
    }
    
    return matchSearch && matchStok;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStok, filterCabang]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage);

  async function handleSave(e) {
    e.preventDefault();
    if (isAdmin && !form.cabang_id) {
      setFormMsg({ type: "error", msg: "Pilih cabang terlebih dahulu!" });
      return;
    }

    setSaving(true);
    setFormMsg(null);

    if (editingId) {
      // Update existing product
      const { error } = await supabase
        .from("barang")
        .update({
          nama_barang : form.nama_barang.trim(),
          harga       : Number(form.harga),
          stok        : form.stok !== "" ? Number(form.stok) : null,
          satuan      : form.satuan || "pcs",
          modal       : form.modal !== "" ? Number(form.modal) : 0,
          cabang_id   : form.cabang_id || kasir?.cabang_id,
        })
        .eq("id", editingId);

      if (error) setFormMsg({ type: "error", msg: error.message });
      else {
        setFormMsg({ type: "success", msg: "Produk berhasil diupdate!" });
        setForm({ nama_barang: "", harga: "", stok: "", satuan: "pcs", modal: "", cabang_id: isAdmin ? "" : (kasir?.cabang_id || "") });
        setEditingId(null);
        await loadProducts();
        // Form tetap terbuka, user bisa tutup manual atau tambah produk lagi
      }
    } else {
      // Insert new product
      const { error } = await supabase.from("barang").insert([{
        nama_barang : form.nama_barang.trim(),
        harga       : Number(form.harga),
        stok        : form.stok !== "" ? Number(form.stok) : null,
        satuan      : form.satuan || "pcs",
        modal       : form.modal !== "" ? Number(form.modal) : 0,
        cabang_id   : form.cabang_id || kasir?.cabang_id,
      }]);
      if (error) setFormMsg({ type: "error", msg: error.message });
      else {
        setFormMsg({ type: "success", msg: "Produk berhasil ditambahkan!" });
        setForm({ nama_barang: "", harga: "", stok: "", satuan: "pcs", modal: "", cabang_id: isAdmin ? "" : (kasir?.cabang_id || "") });
        await loadProducts();
        // Form tetap terbuka, user bisa tutup manual atau tambah produk lagi
      }
    }
    setSaving(false);
  }

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm({
      nama_barang: product.nama_barang || "",
      harga: product.harga || "",
      stok: product.stok !== null ? product.stok : "",
      satuan: product.satuan || "pcs",
      modal: product.modal || "",
      cabang_id: product.cabang_id || ""
    });
    setShowForm(true);
    setFormMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ nama_barang: "", harga: "", stok: "", satuan: "pcs", modal: "", cabang_id: isAdmin ? "" : (kasir?.cabang_id || "") });
    setShowForm(false);
    setFormMsg(null);
  };

  const handleDelete = async (id) => {
    const product = products.find(p => p.id === id);
    setConfirmModal({
      isOpen: true,
      message: `Yakin ingin menghapus produk "${product?.nama_barang || 'ini'}"? Data yang sudah dihapus tidak dapat dikembalikan.`,
      onConfirm: async () => {
        const { error } = await supabase.from("barang").delete().eq("id", id);
        if (error) {
          setAlertModal({
            isOpen: true,
            type: "error",
            title: "Gagal Menghapus",
            message: `Gagal menghapus produk: ${error.message}`
          });
        } else {
          await loadProducts();
          setAlertModal({
            isOpen: true,
            type: "success",
            title: "Berhasil",
            message: "Produk berhasil dihapus!"
          });
        }
      }
    });
  };

  const inputCls = "h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md px-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface";

  const stokStatus = (stok) => {
    if (stok == null) return { label: "N/A", cls: "bg-surface-container text-on-surface-variant" };
    if (stok === 0)   return { label: "Habis",   cls: "bg-error-container text-on-error-container" };
    if (stok <= 10)   return { label: "Menipis", cls: "bg-tertiary-fixed text-on-tertiary-fixed" };
    return { label: "Tersedia",  cls: "bg-secondary-container text-on-secondary-container" };
  };

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-gutter md:px-margin-page min-h-[100dvh]">
      {/* Header */}
      <section className="mb-lg">
        <h2 className="text-headline-lg text-on-surface mb-xs">Manajemen Stok</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl max-w-4xl">
          <p className="text-body-lg text-primary">
            Kelola daftar produk dan stok yang tersedia di Toko Senin.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: "Total Produk",    value: products.length, icon: "inventory_2", color: "text-primary" },
          { label: "Stok Tersedia",   value: products.filter(p => p.stok === null || p.stok >= 10).length, icon: "check_circle", color: "text-secondary" },
          { label: "Stok Menipis",    value: products.filter(p => p.stok != null && p.stok > 0 && p.stok <= 10).length, icon: "warning", color: "text-tertiary" },
          { label: "Stok Habis",      value: products.filter(p => p.stok === 0).length, icon: "cancel", color: "text-error" },
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
            <span className={`material-symbols-outlined text-3xl ${s.color} mb-xs block opacity-70`}>{s.icon}</span>
            <p className="text-headline-md text-on-surface font-bold">{s.value}</p>
            <p className="text-label-sm text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-sm mb-md">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-sm">
          {[
            { id: "semua",     label: "Semua",     icon: "filter_list" },
            { id: "habis",     label: "Habis",     icon: "remove_circle" },
            { id: "menipis",   label: "Menipis",   icon: "warning" },
            { id: "tersedia",  label: "Tersedia",  icon: "check_circle" },
          ].map((f) => {
            const active = filterStok === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilterStok(f.id)}
                className={`flex items-center gap-xs px-md py-sm rounded-xl text-label-md transition-all duration-200 border-2 ${
                  active
                    ? "bg-primary text-on-primary border-primary shadow-md scale-105"
                    : "bg-surface-container-lowest text-on-surface-variant border-transparent hover:bg-surface-container hover:border-outline-variant/30"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {f.icon}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Search, Cabang & Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-sm">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none z-10">search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="h-12 w-full pl-12 pr-md rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface shadow-sm transition-all relative z-0" />
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
          <button onClick={() => setShowForm(!showForm)}
            className={`h-12 px-md rounded-xl text-label-md flex items-center gap-xs transition-all duration-200 active:scale-95 shadow-sm border-2 ${
              showForm
                ? "bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest"
                : "bg-primary text-on-primary border-primary hover:opacity-90 hover:shadow-md"
            }`}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{showForm ? "close" : "add"}</span>
            {showForm ? "Tutup Form" : editingId ? "Edit Produk" : "Tambah Produk"}
          </button>
          <button onClick={loadProducts}
            className="h-12 px-md border-2 border-primary text-primary rounded-xl text-label-md flex items-center gap-xs hover:bg-primary/5 transition-all duration-200 active:scale-95 shadow-sm bg-surface-container-lowest">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span>
          </button>
        </div>
      </div>

      {/* Add Product Form - Desktop Only */}
      {showForm && (
        <div className="hidden lg:block mb-md bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-md shadow-sm field-enter">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-headline-md text-primary flex items-center gap-xs">
              <span className="material-symbols-outlined">{editingId ? "edit" : "add_circle"}</span>
              {editingId ? "Edit Produk" : "Tambah Produk Baru"}
            </h3>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-label-md text-on-surface-variant hover:text-on-surface flex items-center gap-xs"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
                Batal Edit
              </button>
            )}
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            {/* Nama Barang */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Nama Barang *</label>
              <input type="text" required value={form.nama_barang}
                onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
                placeholder="Contoh: Beras" className={inputCls} />
            </div>

            {/* Harga */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Harga Jual (Rp) *</label>
              <input 
                type="text"
                inputMode="numeric"
                required 
                value={form.harga ? Number(form.harga).toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\./g, '');
                  if (rawValue === '' || /^\d+$/.test(rawValue)) {
                    setForm({ ...form, harga: rawValue });
                  }
                }}
                placeholder="0" 
                className={inputCls} 
              />
            </div>

            {/* Modal (Harga Beli) - Hanya untuk Admin */}
            {isAdmin && (
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block flex items-center gap-xs">
                  Modal (Harga Beli)
                  <span className="material-symbols-outlined text-on-surface-variant opacity-50" style={{ fontSize: "16px" }} title="Harga modal tidak tampil di kasir/struk">info</span>
                </label>
                <input 
                  type="text"
                  inputMode="numeric"
                  value={form.modal ? Number(form.modal).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (rawValue === '' || /^\d+$/.test(rawValue)) {
                      setForm({ ...form, modal: rawValue });
                    }
                  }}
                  placeholder="0" 
                  className={inputCls} 
                />
                {form.modal && form.harga && Number(form.harga) > Number(form.modal) && (
                  <p className="text-label-sm text-secondary flex items-center gap-xs">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>trending_up</span>
                    Keuntungan: {rupiah(Number(form.harga) - Number(form.modal))}
                  </p>
                )}
              </div>
            )}

            {/* Satuan — Custom Modern Dropdown */}
            <div className="space-y-xs relative" ref={dropdownRef}>
              <label className="text-label-md text-on-surface-variant block">Satuan *</label>
              <div
                onClick={() => setSatuanOpen(!satuanOpen)}
                className={`h-12 w-full px-md rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  satuanOpen
                    ? "border-primary bg-primary-container/10 ring-2 ring-primary/20"
                    : "border-[#bfc9c1] bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
                }`}
              >
                {(() => {
                  const sel = SATUAN_OPTIONS.find((s) => s.value === form.satuan) || SATUAN_OPTIONS[0];
                  return (
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>{sel.icon}</span>
                      <span className="text-body-md text-on-surface font-medium">{sel.label}</span>
                      <span className="text-label-sm px-xs py-[2px] bg-surface-container rounded-md text-on-surface-variant uppercase">{sel.abbr}</span>
                    </div>
                  );
                })()}
                <span
                  className="material-symbols-outlined text-outline transition-transform duration-200"
                  style={{ transform: satuanOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  expand_more
                </span>
              </div>

              {/* Dropdown Menu */}
              {satuanOpen && (
                <div className="absolute top-[100%] left-0 w-full mt-xs bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-lg z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[240px] overflow-y-auto p-xs space-y-[2px]">
                    {SATUAN_OPTIONS.map((s) => {
                      const active = form.satuan === s.value;
                      return (
                        <div
                          key={s.value}
                          onClick={() => {
                            setForm({ ...form, satuan: s.value });
                            setSatuanOpen(false);
                          }}
                          className={`flex items-center gap-sm px-sm py-sm rounded-lg cursor-pointer transition-colors ${
                            active
                              ? "bg-primary text-on-primary font-bold"
                              : "hover:bg-primary/10"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined ${active ? "text-on-primary" : "text-on-surface"}`}
                            style={{ fontSize: "20px", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            {s.icon}
                          </span>
                          <span className={`text-body-md ${active ? "text-on-primary" : "text-on-surface"}`}>{s.label}</span>
                          <span className={`ml-auto text-label-sm uppercase ${active ? "text-on-primary opacity-90" : "text-on-surface-variant"}`}>{s.abbr}</span>
                          {active && <span className="material-symbols-outlined text-on-primary ml-xs" style={{ fontSize: "18px" }}>check</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Stok Awal */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Stok Awal</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.stok}
                onChange={(e) => {
                  const angka = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, stok: angka });
                }}
                placeholder="Isi stok"
                className={inputCls} />
              {form.stok && (
                <p className="text-label-sm text-on-surface-variant">
                  Stok awal: <strong>{form.stok} {form.satuan}</strong>
                </p>
              )}
            </div>

            {/* Pilih Cabang (hanya untuk admin) */}
            {isAdmin && (
              <div className="space-y-xs md:col-span-2 lg:col-span-4">
                <label className="text-label-md text-on-surface-variant block">Cabang Tujuan *</label>
                <select
                  required
                  value={form.cabang_id}
                  onChange={(e) => setForm({ ...form, cabang_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Pilih Cabang</option>
                  {cabangList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>
            )}

            {formMsg && (
              <div className={`col-span-full p-sm rounded-lg text-label-md text-center ${
                formMsg.type === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}`}>
                {formMsg.msg}
              </div>
            )}
          </form>

          {/* Submit Button — Full Width, outside grid */}
          <div className="mt-md pt-md border-t border-outline-variant/20">
            <button
              form="add-product-form"
              type="submit"
              disabled={saving || !form.nama_barang.trim() || !form.harga || (isAdmin && !form.cabang_id)}
              onClick={handleSave}
              className="w-full h-12 bg-primary text-on-primary rounded-xl text-label-md font-bold flex items-center justify-center gap-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {saving ? (
                <>
                  <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  {editingId ? "Mengupdate..." : "Menyimpan..."}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>
                    {editingId ? "check_circle" : "save"}
                  </span>
                  {editingId ? "Update Produk" : "Simpan Produk"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="p-md bg-surface-container border-b border-outline-variant/20 flex items-center justify-between">
          <h3 className="text-headline-md text-on-surface">Daftar Produk</h3>
          <span className="text-label-sm text-on-surface-variant">{filtered.length} produk</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-body-md">Memuat produk...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-error">
            <span className="material-symbols-outlined text-5xl mb-2">error</span>
            <p className="text-body-md">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Nama Produk</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Satuan</th>
                  {isAdmin && <th className="text-label-md text-on-surface-variant text-right px-md py-sm">Modal</th>}
                  <th className="text-label-md text-on-surface-variant text-right px-md py-sm">Harga Jual</th>
                  {isAdmin && <th className="text-label-md text-on-surface-variant text-right px-md py-sm">Keuntungan</th>}
                  <th className="text-label-md text-on-surface-variant text-right px-md py-sm">Stok</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Status</th>
                  {isAdmin && <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p, i) => {
                  const status = stokStatus(p.stok);
                  const keuntungan = (p.harga && p.modal) ? Number(p.harga) - Number(p.modal) : 0;
                  return (
                    <tr key={p.id || i} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-sm">
                        <p className="text-label-md text-on-surface font-semibold">{p.nama_barang}</p>
                        {isAdmin && p.cabang?.nama && (
                          <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>store</span>
                            {p.cabang.nama}
                          </p>
                        )}
                      </td>
                      <td className="px-md py-sm text-center">
                        <span className="text-label-sm px-sm py-xs bg-surface-container rounded-full text-on-surface-variant font-medium">
                          {p.satuan || "pcs"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-md py-sm text-right">
                          <span className="text-label-md text-on-surface-variant">{p.modal ? rupiah(p.modal) : "—"}</span>
                        </td>
                      )}
                      <td className="px-md py-sm text-right">
                        <span className="text-label-md text-on-surface font-bold">{rupiah(p.harga)}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-md py-sm text-right">
                          {keuntungan > 0 ? (
                            <span className="text-label-md text-secondary font-bold flex items-center justify-end gap-xs">
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>trending_up</span>
                              {rupiah(keuntungan)}
                            </span>
                          ) : (
                            <span className="text-label-md text-on-surface-variant">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-md py-sm text-right text-body-md text-on-surface">
                        {p.stok != null ? `${p.stok} ${p.satuan || "pcs"}` : "—"}
                      </td>
                      <td className="px-md py-sm text-center">
                        <span className={`text-label-sm px-sm py-xs rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-md py-sm text-center">
                          <div className="flex items-center justify-center gap-xs">
                            <button
                              onClick={() => handleEdit(p)}
                              className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary-container rounded-lg transition-all"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="w-8 h-8 flex items-center justify-center text-error hover:bg-error-container rounded-lg transition-all"
                              title="Hapus"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="p-md border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-sm bg-surface-container-lowest">
            <p className="text-label-sm text-on-surface-variant">
              Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filtered.length)} dari {filtered.length} produk
            </p>
            <div className="flex items-center gap-xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="px-sm text-label-md text-on-surface font-medium">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title="Konfirmasi Hapus"
        message={confirmModal.message}
        type="danger"
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />

      {/* Product Form Modal - Mobile Only */}
      <ProductFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        form={form}
        setForm={setForm}
        editingId={editingId}
        saving={saving}
        formMsg={formMsg}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
        isAdmin={isAdmin}
        cabangList={cabangList}
      />
    </main>
  );
}
