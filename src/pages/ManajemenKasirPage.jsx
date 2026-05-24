import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import KasirFormModal from "../components/KasirFormModal";

export default function ManajemenKasirPage() {
  const { kasir: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [kasirList, setKasirList] = useState([]);
  const [cabangList, setCabangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  
  // Modal states
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  const [form, setForm] = useState({
    nama_lengkap: "",
    username: "",
    password: "",
    cabang_id: "",
    role: "kasir"
  });

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: cabangData } = await supabase.from("cabang").select("*").order("nama");
      if (cabangData) setCabangList(cabangData);

      const { data: kasirData } = await supabase
        .from("kasir")
        .select("id, nama_lengkap, username, role, cabang_id, cabang:cabang_id(nama)")
        .order("nama_lengkap");
      if (kasirData) setKasirList(kasirData);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);

    try {
      if (editingId) {
        // Update existing kasir
        const updateData = {
          nama_lengkap: form.nama_lengkap.trim(),
          username: form.username.trim(),
          cabang_id: form.cabang_id || null,
          role: form.role
        };
        
        // Only update password if provided
        if (form.password) {
          updateData.password = form.password;
        }

        const { error } = await supabase
          .from("kasir")
          .update(updateData)
          .eq("id", editingId);

        if (error) throw error;
        setFormMsg({ type: "success", msg: "Kasir berhasil diupdate!" });
      } else {
        // Insert new kasir
        if (!form.password) {
          setFormMsg({ type: "error", msg: "Password wajib diisi untuk kasir baru!" });
          setSaving(false);
          return;
        }

        const { error } = await supabase.from("kasir").insert([{
          nama_lengkap: form.nama_lengkap.trim(),
          username: form.username.trim(),
          password: form.password,
          cabang_id: form.cabang_id || null,
          role: form.role
        }]);

        if (error) throw error;
        setFormMsg({ type: "success", msg: "Kasir berhasil ditambahkan!" });
      }

      setForm({ nama_lengkap: "", username: "", password: "", cabang_id: "", role: "kasir" });
      setEditingId(null);
      await loadData();
      // Form tetap terbuka, user bisa tutup manual atau tambah kasir lagi
    } catch (err) {
      setFormMsg({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(kasir) {
    setEditingId(kasir.id);
    setForm({
      nama_lengkap: kasir.nama_lengkap || "",
      username: kasir.username || "",
      password: "",
      cabang_id: kasir.cabang_id || "",
      role: kasir.role || "kasir"
    });
    setShowForm(true);
    setFormMsg(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({ nama_lengkap: "", username: "", password: "", cabang_id: "", role: "kasir" });
    setShowForm(false);
    setFormMsg(null);
  }

  async function handleDelete(id, nama) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Akun Kasir",
      message: `Yakin ingin menghapus akun kasir "${nama}"? Tindakan ini tidak dapat dibatalkan.`,
      type: "danger",
      onConfirm: async () => {
        const { error } = await supabase.from("kasir").delete().eq("id", id);
        if (error) {
          setAlertModal({
            isOpen: true,
            title: "Gagal Menghapus",
            message: `Gagal menghapus: ${error.message}`,
            type: "error"
          });
        } else {
          await loadData();
          setAlertModal({
            isOpen: true,
            title: "Berhasil",
            message: `Akun kasir "${nama}" berhasil dihapus.`,
            type: "success"
          });
        }
      }
    });
  }

  if (!isAdmin) {
    return (
      <main className="pt-20 pb-8 lg:ml-[280px] px-4 md:px-margin-page min-h-[100dvh]">
        <div className="flex flex-col items-center justify-center py-24 text-error">
          <span className="material-symbols-outlined text-5xl mb-2">block</span>
          <p className="text-body-md">Akses ditolak. Halaman ini hanya untuk Admin.</p>
        </div>
      </main>
    );
  }

  const inputCls = "h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md px-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface";

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-4 md:px-margin-page min-h-[100dvh]">
      {/* Header */}
      <section className="mb-lg">
        <h2 className="text-headline-lg text-on-surface mb-xs">Manajemen Akun Kasir</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl max-w-4xl">
          <p className="text-body-lg text-primary">
            Kelola akun kasir dan assign ke cabang.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter mb-lg">
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-primary mb-xs block opacity-70">group</span>
          <p className="text-headline-md text-on-surface font-bold">{kasirList.length}</p>
          <p className="text-label-sm text-on-surface-variant">Total Akun</p>
        </div>
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-secondary mb-xs block opacity-70">badge</span>
          <p className="text-headline-md text-on-surface font-bold">{kasirList.filter(k => k.role === "kasir").length}</p>
          <p className="text-label-sm text-on-surface-variant">Kasir</p>
        </div>
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-tertiary mb-xs block opacity-70">admin_panel_settings</span>
          <p className="text-headline-md text-on-surface font-bold">{kasirList.filter(k => k.role === "admin").length}</p>
          <p className="text-label-sm text-on-surface-variant">Admin</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end gap-sm mb-md">
        <button
          onClick={() => setShowForm(!showForm)}
          className={`h-12 px-md rounded-xl text-label-md flex items-center gap-xs transition-all duration-200 active:scale-95 shadow-sm border-2 ${
            showForm
              ? "bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest"
              : "bg-primary text-on-primary border-primary hover:opacity-90 hover:shadow-md"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{showForm ? "close" : "add"}</span>
          {showForm ? "Tutup Form" : "Tambah Kasir"}
        </button>
      </div>

      {/* Form - Desktop Only */}
      {showForm && (
        <div className="hidden lg:block mb-md bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-md shadow-sm">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-headline-md text-primary flex items-center gap-xs">
              <span className="material-symbols-outlined">{editingId ? "edit" : "person_add"}</span>
              {editingId ? "Edit Akun Kasir" : "Tambah Akun Kasir Baru"}
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

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={form.nama_lengkap}
                onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className={inputCls}
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Username *</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Contoh: budi123"
                className={inputCls}
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">
                Password {editingId ? "(Kosongkan jika tidak diubah)" : "*"}
              </label>
              <input
                type="password"
                required={!editingId}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? "Kosongkan jika tidak diubah" : "Masukkan password"}
                className={inputCls}
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Cabang</label>
              <select
                value={form.cabang_id}
                onChange={(e) => setForm({ ...form, cabang_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Tidak Ada Cabang</option>
                {cabangList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>

            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant block">Role *</label>
              <select
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls}
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {formMsg && (
              <div className={`col-span-full p-sm rounded-lg text-label-md text-center ${
                formMsg.type === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"
              }`}>
                {formMsg.msg}
              </div>
            )}

            <div className="col-span-full pt-md border-t border-outline-variant/20">
              <button
                type="submit"
                disabled={saving || !form.nama_lengkap.trim() || !form.username.trim() || (!editingId && !form.password.trim())}
                className="w-full h-12 bg-primary text-on-primary rounded-xl text-label-md font-bold flex items-center justify-center gap-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {editingId ? "Update Akun" : "Simpan Akun"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="p-md bg-surface-container border-b border-outline-variant/20 flex items-center justify-between">
          <h3 className="text-headline-md text-on-surface">Daftar Akun Kasir</h3>
          <span className="text-label-sm text-on-surface-variant">{kasirList.length} akun</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-body-md">Memuat data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Nama</th>
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Username</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Role</th>
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Cabang</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kasirList.map((k) => (
                  <tr key={k.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-sm">
                      <p className="text-label-md text-on-surface font-semibold">{k.nama_lengkap}</p>
                    </td>
                    <td className="px-md py-sm">
                      <p className="text-label-md text-on-surface">{k.username}</p>
                    </td>
                    <td className="px-md py-sm text-center">
                      <span className={`text-label-sm px-sm py-xs rounded-full ${
                        k.role === "admin" 
                          ? "bg-primary-container text-on-primary-container" 
                          : "bg-surface-container text-on-surface-variant"
                      }`}>
                        {k.role === "admin" ? "Admin" : "Kasir"}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <p className="text-label-md text-on-surface-variant">
                        {k.cabang?.nama || "—"}
                      </p>
                    </td>
                    <td className="px-md py-sm text-center">
                      <div className="flex items-center justify-center gap-xs">
                        <button
                          onClick={() => handleEdit(k)}
                          className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary-container rounded-lg transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        {k.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(k.id, k.nama_lengkap)}
                            className="w-8 h-8 flex items-center justify-center text-error hover:bg-error-container rounded-lg transition-all"
                            title="Hapus"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || "warning"}
      />

      {/* Kasir Form Modal - Mobile Only */}
      <KasirFormModal
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
