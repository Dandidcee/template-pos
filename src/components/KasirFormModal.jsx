import { useEffect, useRef } from "react";

export default function KasirFormModal({
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
  cabangList,
}) {
  const modalRef = useRef(null);

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
            <span className="material-symbols-outlined text-3xl">{editingId ? "edit" : "person_add"}</span>
            <div>
              <h2 className="text-headline-md font-bold">
                {editingId ? "Edit Kasir" : "Tambah Kasir"}
              </h2>
              <p className="text-label-sm opacity-90">Manajemen Kasir</p>
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
        <div className="flex-1 overflow-y-auto p-md" style={{ WebkitOverflowScrolling: 'touch' }}>
          <form onSubmit={onSave} className="space-y-md">
            {/* Nama Lengkap */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block font-semibold">Nama Lengkap *</label>
              <input 
                type="text" 
                required 
                value={form.nama_lengkap}
                onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                placeholder="Contoh: John Doe" 
                className={inputCls} 
              />
            </div>

            {/* Username */}
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block font-semibold">Username *</label>
              <input 
                type="text" 
                required 
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Contoh: johndoe" 
                className={inputCls}
                autoComplete="off"
              />
            </div>

            {/* Password - Only for new kasir */}
            {!editingId && (
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block font-semibold">Password *</label>
                <input 
                  type="password" 
                  required 
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimal 6 karakter" 
                  minLength={6}
                  className={inputCls}
                  autoComplete="new-password"
                />
                <p className="text-label-sm text-on-surface-variant">
                  Password minimal 6 karakter
                </p>
              </div>
            )}

            {/* Pilih Cabang (hanya untuk admin) */}
            {isAdmin && (
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block font-semibold">Cabang *</label>
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
            disabled={saving || !form.nama_lengkap.trim() || !form.username.trim() || (!editingId && !form.password) || (isAdmin && !form.cabang_id)}
            className={`w-full h-12 rounded-xl text-label-md font-bold flex items-center justify-center gap-xs shadow-sm transition-all ${
              saving || !form.nama_lengkap.trim() || !form.username.trim() || (!editingId && !form.password) || (isAdmin && !form.cabang_id)
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
                {editingId ? "Update Kasir" : "Simpan Kasir"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
