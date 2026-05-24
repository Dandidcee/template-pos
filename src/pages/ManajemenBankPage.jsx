import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

export default function ManajemenBankPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  
  // Modal states
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  const [form, setForm] = useState({
    nama_bank: "",
    nomor_rekening: "",
    atas_nama: "",
    aktif: true
  });

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_account")
        .select("*")
        .order("nama_bank");
      
      if (error) throw error;
      setBanks(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("bank_account")
          .update({
            nama_bank: form.nama_bank.trim(),
            nomor_rekening: form.nomor_rekening.trim(),
            atas_nama: form.atas_nama.trim(),
            aktif: form.aktif
          })
          .eq("id", editingId);

        if (error) throw error;
        setFormMsg({ type: "success", msg: "Bank berhasil diupdate!" });
      } else {
        // Insert
        const { error } = await supabase
          .from("bank_account")
          .insert([{
            nama_bank: form.nama_bank.trim(),
            nomor_rekening: form.nomor_rekening.trim(),
            atas_nama: form.atas_nama.trim(),
            aktif: form.aktif
          }]);

        if (error) throw error;
        setFormMsg({ type: "success", msg: "Bank berhasil ditambahkan!" });
      }

      setForm({ nama_bank: "", nomor_rekening: "", atas_nama: "", aktif: true });
      setEditingId(null);
      await loadBanks();
      // Form tetap terbuka, user bisa tutup manual atau tambah bank lagi
    } catch (err) {
      setFormMsg({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (bank) => {
    setEditingId(bank.id);
    setForm({
      nama_bank: bank.nama_bank || "",
      nomor_rekening: bank.nomor_rekening || "",
      atas_nama: bank.atas_nama || "",
      aktif: bank.aktif ?? true
    });
    setShowForm(true);
    setFormMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ nama_bank: "", nomor_rekening: "", atas_nama: "", aktif: true });
    setShowForm(false);
    setFormMsg(null);
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Bank Account",
      message: "Yakin ingin menghapus bank ini? Tindakan ini tidak dapat dibatalkan.",
      type: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("bank_account")
            .delete()
            .eq("id", id);

          if (error) throw error;
          await loadBanks();
          setAlertModal({
            isOpen: true,
            title: "Berhasil",
            message: "Bank berhasil dihapus.",
            type: "success"
          });
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: "Gagal Menghapus",
            message: `Gagal menghapus: ${err.message}`,
            type: "error"
          });
        }
      }
    });
  };

  const handleToggleAktif = async (bank) => {
    try {
      const { error } = await supabase
        .from("bank_account")
        .update({ aktif: !bank.aktif })
        .eq("id", bank.id);

      if (error) throw error;
      await loadBanks();
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: "Gagal Mengubah Status",
        message: `Gagal mengubah status: ${err.message}`,
        type: "error"
      });
    }
  };

  const inputCls = "h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md px-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface";

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
        <h2 className="text-headline-lg text-on-surface mb-xs">Manajemen Bank Account</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl max-w-4xl">
          <p className="text-body-md sm:text-body-lg text-primary break-words">
            Kelola daftar rekening bank yang digunakan untuk transaksi transfer.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter mb-lg">
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-primary mb-xs block opacity-70">account_balance</span>
          <p className="text-headline-md text-on-surface font-bold">{banks.length}</p>
          <p className="text-label-sm text-on-surface-variant">Total Bank</p>
        </div>
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-secondary mb-xs block opacity-70">check_circle</span>
          <p className="text-headline-md text-on-surface font-bold">{banks.filter(b => b.aktif).length}</p>
          <p className="text-label-sm text-on-surface-variant">Bank Aktif</p>
        </div>
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-xs block opacity-70">cancel</span>
          <p className="text-headline-md text-on-surface font-bold">{banks.filter(b => !b.aktif).length}</p>
          <p className="text-label-sm text-on-surface-variant">Bank Nonaktif</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-sm mb-md">
        <button
          onClick={() => setShowForm(!showForm)}
          className={`h-12 px-md rounded-xl text-label-md flex items-center justify-center gap-xs transition-all duration-200 active:scale-95 shadow-sm border-2 ${
            showForm
              ? "bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest"
              : "bg-primary text-on-primary border-primary hover:opacity-90 hover:shadow-md"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{showForm ? "close" : "add"}</span>
          {showForm ? "Tutup Form" : editingId ? "Edit Bank" : "Tambah Bank"}
        </button>
        <button
          onClick={loadBanks}
          className="h-12 px-md border-2 border-primary text-primary rounded-xl text-label-md flex items-center justify-center gap-xs hover:bg-primary/5 transition-all duration-200 active:scale-95 shadow-sm bg-surface-container-lowest"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-md bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-md shadow-sm field-enter">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-headline-md text-primary flex items-center gap-xs">
              <span className="material-symbols-outlined">{editingId ? "edit" : "add_circle"}</span>
              {editingId ? "Edit Bank Account" : "Tambah Bank Account Baru"}
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

          <form onSubmit={handleSubmit} className="space-y-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {/* Nama Bank */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block">Nama Bank *</label>
                <input
                  type="text"
                  required
                  value={form.nama_bank}
                  onChange={(e) => setForm({ ...form, nama_bank: e.target.value })}
                  placeholder="Contoh: BCA"
                  className={inputCls}
                />
              </div>

              {/* Nomor Rekening */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block">Nomor Rekening *</label>
                <input
                  type="text"
                  required
                  value={form.nomor_rekening}
                  onChange={(e) => setForm({ ...form, nomor_rekening: e.target.value })}
                  placeholder="1234567890"
                  className={inputCls}
                />
              </div>

              {/* Atas Nama */}
              <div className="space-y-xs md:col-span-2">
                <label className="text-label-md text-on-surface-variant block">Atas Nama *</label>
                <input
                  type="text"
                  required
                  value={form.atas_nama}
                  onChange={(e) => setForm({ ...form, atas_nama: e.target.value })}
                  placeholder="Toko Senin"
                  className={inputCls}
                />
              </div>

              {/* Status Aktif */}
              <div className="space-y-xs md:col-span-2">
                <label className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aktif}
                    onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                    className="w-5 h-5 rounded border-[#bfc9c1] text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-label-md text-on-surface">Bank Aktif (tampil di dropdown kasir)</span>
                </label>
              </div>
            </div>

            {formMsg && (
              <div className={`p-sm rounded-lg text-label-md text-center ${
                formMsg.type === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"
              }`}>
                {formMsg.msg}
              </div>
            )}

            <div className="pt-md border-t border-outline-variant/20">
              <button
                type="submit"
                disabled={saving || !form.nama_bank.trim() || !form.nomor_rekening.trim() || !form.atas_nama.trim()}
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
                    {editingId ? "Update Bank" : "Simpan Bank"}
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
          <h3 className="text-headline-md text-on-surface">Daftar Bank Account</h3>
          <span className="text-label-sm text-on-surface-variant">{banks.length} bank</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-body-md">Memuat data bank...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-error">
            <span className="material-symbols-outlined text-5xl mb-2">error</span>
            <p className="text-body-md">{error}</p>
          </div>
        ) : banks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <span className="material-symbols-outlined text-5xl mb-2">account_balance</span>
            <p className="text-body-md">Belum ada bank account</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Nama Bank</th>
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Nomor Rekening</th>
                  <th className="text-label-md text-on-surface-variant text-left px-md py-sm">Atas Nama</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Status</th>
                  <th className="text-label-md text-on-surface-variant text-center px-md py-sm">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {banks.map((bank) => (
                  <tr key={bank.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>account_balance</span>
                        <span className="text-label-md text-on-surface font-semibold">{bank.nama_bank}</span>
                      </div>
                    </td>
                    <td className="px-md py-sm">
                      <span className="text-label-md text-on-surface font-mono">{bank.nomor_rekening}</span>
                    </td>
                    <td className="px-md py-sm">
                      <span className="text-label-md text-on-surface-variant">{bank.atas_nama}</span>
                    </td>
                    <td className="px-md py-sm text-center">
                      <button
                        onClick={() => handleToggleAktif(bank)}
                        className={`inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-sm transition-all ${
                          bank.aktif
                            ? "bg-secondary-container text-on-secondary-container hover:opacity-80"
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                          {bank.aktif ? "check_circle" : "cancel"}
                        </span>
                        {bank.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-md py-sm text-center">
                      <div className="flex items-center justify-center gap-xs">
                        <button
                          onClick={() => handleEdit(bank)}
                          className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary-container rounded-lg transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(bank.id)}
                          className="w-8 h-8 flex items-center justify-center text-error hover:bg-error-container rounded-lg transition-all"
                          title="Hapus"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                        </button>
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
    </main>
  );
}
