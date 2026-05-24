import { useState, useEffect, useRef } from "react";
import { rupiah } from "../config";

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

export default function ProductFormModal({
  isOpen,
  onClose,
  form,
  setForm,
  editingId,
  saving,
  formMsg,
  onSave,
  onCancelEdit,
  isAdmin,
  cabangList
}) {
  const [satuanOpen, setSatuanOpen] = useState(false);
  const modalRef = useRef(null);
  const dropdownRef = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSatuanOpen(false);
      return;
    }
    
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSatuanOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  const inputCls = "h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md px-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface";

  return (
    <div className="fixed inset-0 z-[100] lg:hidden flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Content - Centered */}
      <div 
        ref={modalRef}
        className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-primary text-on-primary p-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-3xl">{editingId ? "edit" : "add_circle"}</span>
            <div>
              <h2 className="text-headline-md font-bold">
                {editingId ? "Edit Produk" : "Tambah Produk"}
              </h2>
              <p className="text-label-sm opacity-90">Manajemen Stok</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-on-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-md"  style={{ WebkitOverflowScrolling: 'touch' }}>
          <form onSubmit={onSave} className="space-y-md">
            {/* Nama Barang */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block font-semibold">Nama Barang *</label>
              <input 
                type="text" 
                required 
                value={form.nama_barang}
                onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
                placeholder="Contoh: Beras" 
                className={inputCls} 
              />
            </div>

            {/* Harga */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block font-semibold">Harga Jual (Rp) *</label>
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
                <label className="text-label-md text-on-surface-variant block font-semibold flex items-center gap-xs">
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
            <div className="space-y-xs relative z-20" ref={dropdownRef}>
              <label className="text-label-md text-on-surface-variant block font-semibold">Satuan *</label>
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

              {/* Dropdown Menu - Fixed positioning to prevent clipping */}
              {satuanOpen && (
                <>
                  {/* Backdrop untuk close dropdown */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setSatuanOpen(false)}
                  />
                  <div className="absolute top-[100%] left-0 right-0 mt-xs bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[200px] overflow-y-auto p-xs space-y-[2px]">
                      {SATUAN_OPTIONS.map((s) => {
                        const active = form.satuan === s.value;
                        return (
                          <div
                            key={s.value}
                            onClick={(e) => {
                              e.stopPropagation();
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
                </>
              )}
            </div>

            {/* Stok Awal */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block font-semibold">Stok Awal</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.stok}
                onChange={(e) => {
                  const angka = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, stok: angka });
                }}
                placeholder="Isi stok"
                className={inputCls} 
              />
              {form.stok && (
                <p className="text-label-sm text-on-surface-variant">
                  Stok awal: <strong>{form.stok} {form.satuan}</strong>
                </p>
              )}
            </div>

            {/* Pilih Cabang (hanya untuk admin) */}
            {isAdmin && (
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block font-semibold">Cabang Tujuan *</label>
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
              <div className={`p-3 rounded-lg text-label-md text-center animate-in fade-in slide-in-from-bottom-2 ${
                formMsg.type === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"
              }`}>
                {formMsg.msg}
              </div>
            )}
          </form>
        </div>

        {/* Footer - Action Buttons */}
        <div className="p-md bg-surface border-t border-outline-variant/20 space-y-sm shrink-0">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                onCancelEdit();
                onClose();
              }}
              disabled={saving}
              className="w-full h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-md font-bold hover:bg-surface-container transition-all disabled:opacity-50 flex items-center justify-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Batal Edit
            </button>
          )}
          
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.nama_barang.trim() || !form.harga || (isAdmin && !form.cabang_id)}
            className={`w-full h-12 rounded-xl text-label-md font-bold flex items-center justify-center gap-xs shadow-sm transition-all ${
              saving || !form.nama_barang.trim() || !form.harga || (isAdmin && !form.cabang_id)
                ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-70"
                : "bg-secondary text-on-secondary hover:shadow-md hover:opacity-90"
            }`}
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></span>
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
    </div>
  );
}
