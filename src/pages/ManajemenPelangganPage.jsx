import { useState, useEffect } from "react";
import { fetchPelangganList, addPelanggan, updatePelanggan, deletePelanggan, updatePoinPelangganManual } from "../services/productService";

export default function ManajemenPelangganPage() {
  const [pelangganList, setPelangganList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPoinModal, setShowPoinModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ nama: "", no_hp: "", alamat: "", nik: "" });
  const [poinData, setPoinData] = useState({ diff: 0, catatan: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchPelangganList();
      setPelangganList(data);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat data pelanggan");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        nama: item.nama || "",
        no_hp: item.no_hp || "",
        alamat: item.alamat || "",
        nik: item.nik || ""
      });
    } else {
      setSelectedItem(null);
      setFormData({ nama: "", no_hp: "", alamat: "", nik: "" });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nama) return alert("Nama wajib diisi");

    setSaving(true);
    try {
      if (selectedItem) {
        await updatePelanggan(selectedItem.id, formData);
      } else {
        await addPelanggan({ ...formData, point: 0 });
      }
      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data: " + (err.message || "Kesalahan tidak diketahui"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await deletePelanggan(selectedItem.id);
      await loadData();
      setShowDeleteModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePoin = async (e) => {
    e.preventDefault();
    if (!poinData.diff || poinData.diff === 0) return alert("Nominal poin tidak valid");
    setSaving(true);
    try {
      await updatePoinPelangganManual(selectedItem.id, poinData.diff);
      await loadData();
      setShowPoinModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui poin");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-body-md text-on-surface-variant">Memuat pelanggan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-sm font-bold text-on-surface">Data Pelanggan</h1>
          <p className="text-body-md text-on-surface-variant">Kelola database member dan loyalitas</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-xs rounded-full bg-primary px-4 py-2 text-label-lg font-medium text-on-primary shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Pelanggan
        </button>
      </div>

      <div className="rounded-2xl border border-outline-variant/30 bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm text-on-surface">
            <thead className="bg-surface-container-lowest text-label-md text-on-surface-variant">
              <tr>
                <th className="p-4 font-medium">Nama Pelanggan</th>
                <th className="p-4 font-medium">No. HP</th>
                <th className="p-4 font-medium text-center">Poin Loyalitas</th>
                <th className="p-4 font-medium">Alamat</th>
                <th className="p-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {pelangganList.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-surface-container-lowest/50">
                  <td className="p-4 font-medium">{item.nama}</td>
                  <td className="p-4">{item.no_hp || "-"}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-on-primary-container">
                      {Number(item.point).toLocaleString('id-ID')} Poin
                    </span>
                  </td>
                  <td className="p-4">{item.alamat || "-"}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setPoinData({ diff: 0, catatan: "" });
                          setShowPoinModal(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-tertiary-container hover:text-on-tertiary-container"
                        title="Atur Poin"
                      >
                        <span className="material-symbols-outlined text-[18px]">stars</span>
                      </button>
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDeleteModal(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container hover:text-on-error-container"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pelangganList.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-on-surface-variant">
                    Belum ada data pelanggan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="mb-4 text-title-lg font-bold text-on-surface">
              {selectedItem ? "Edit Pelanggan" : "Tambah Pelanggan"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-sm font-medium text-on-surface-variant">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Nama Lengkap"
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-sm font-medium text-on-surface-variant">No. WhatsApp / HP</label>
                <input
                  type="text"
                  value={formData.no_hp}
                  onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="08123456789"
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-sm font-medium text-on-surface-variant">Alamat (Opsional)</label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows="2"
                ></textarea>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full px-4 py-2 text-label-lg font-medium text-on-surface-variant hover:bg-surface-container-highest"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-6 py-2 text-label-lg font-medium text-on-primary shadow hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent"></div>
                  ) : null}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Poin */}
      {showPoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="mb-2 text-title-lg font-bold text-on-surface">
              Atur Poin Loyalitas
            </h2>
            <p className="mb-4 text-body-sm text-on-surface-variant">Pelanggan: <b>{selectedItem?.nama}</b><br/>Poin Saat Ini: <b>{selectedItem?.point}</b></p>
            <form onSubmit={handleSavePoin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-sm font-medium text-on-surface-variant">Tukar / Tambah Poin</label>
                <input
                  type="number"
                  required
                  value={poinData.diff}
                  onChange={(e) => setPoinData({ ...poinData, diff: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Gunakan minus (-) untuk mengurangi"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">Gunakan angka minus (misal: -50) untuk memotong poin saat pelanggan klaim hadiah fisik.</p>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPoinModal(false)}
                  className="rounded-full px-4 py-2 text-label-lg font-medium text-on-surface-variant hover:bg-surface-container-highest"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-6 py-2 text-label-lg font-medium text-on-primary shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Update Poin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="mb-2 text-title-lg font-bold text-on-surface">Hapus Pelanggan?</h2>
            <p className="mb-6 text-body-md text-on-surface-variant">
              Apakah Anda yakin ingin menghapus pelanggan <span className="font-bold text-on-surface">{selectedItem?.nama}</span>? Data tidak dapat dikembalikan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full px-4 py-2 text-label-lg font-medium text-on-surface-variant hover:bg-surface-container-highest"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-full bg-error px-6 py-2 text-label-lg font-medium text-on-error shadow hover:bg-error/90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-error border-t-transparent"></div>
                ) : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
