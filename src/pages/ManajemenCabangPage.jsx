import { useState, useEffect } from "react";
import { fetchCabangList, addCabang, updateCabang, deleteCabang } from "../services/productService";

export default function ManajemenCabangPage() {
  const [cabangList, setCabangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCabang, setEditingCabang] = useState(null);
  
  // Form State
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadCabang();
  }, []);

  async function loadCabang() {
    setLoading(true);
    try {
      const data = await fetchCabangList();
      setCabangList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (cabang = null) => {
    setErrorMsg("");
    setEditingCabang(cabang);
    if (cabang) {
      setNama(cabang.nama);
      setAlamat(cabang.alamat || "");
      setTelepon(cabang.telepon || "");
    } else {
      setNama("");
      setAlamat("");
      setTelepon("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCabang(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg("Nama cabang wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = { nama, alamat, telepon };

      if (editingCabang) {
        await updateCabang(editingCabang.id, payload);
      } else {
        await addCabang(payload);
      }
      
      handleCloseModal();
      loadCabang();
    } catch (err) {
      setErrorMsg(err.message || "Gagal menyimpan cabang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, namaCabang) => {
    if (window.confirm(`Yakin ingin menghapus cabang "${namaCabang}"? Semua data stok yang terhubung mungkin akan terdampak.`)) {
      try {
        await deleteCabang(id);
        loadCabang();
      } catch (err) {
        alert("Gagal menghapus cabang: " + err.message);
      }
    }
  };

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-4 md:px-margin-page min-h-screen">
      <section className="mb-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm mb-md">
          <div>
            <h2 className="text-headline-lg text-on-surface mb-xs">Manajemen Cabang</h2>
            <p className="text-body-lg text-on-surface-variant">Kelola daftar cabang atau lokasi toko Anda.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="h-12 px-6 bg-primary text-on-primary rounded-xl text-label-md font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md w-full md:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">add_business</span>
            Tambah Cabang
          </button>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30 text-label-md text-on-surface">
                  <th className="p-md font-semibold">Nama Cabang</th>
                  <th className="p-md font-semibold">Alamat</th>
                  <th className="p-md font-semibold">Telepon</th>
                  <th className="p-md font-semibold text-center w-[150px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface-variant">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-xl text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                        <p>Memuat cabang...</p>
                      </div>
                    </td>
                  </tr>
                ) : cabangList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-xl text-center">
                      <div className="flex flex-col items-center gap-2 text-on-surface-variant/50">
                        <span className="material-symbols-outlined text-[48px]">store_off</span>
                        <p>Belum ada data cabang</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cabangList.map((c) => (
                    <tr key={c.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors">
                      <td className="p-md font-medium text-on-surface">{c.nama}</td>
                      <td className="p-md">{c.alamat || "-"}</td>
                      <td className="p-md">{c.telepon || "-"}</td>
                      <td className="p-md">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(c)}
                            className="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-colors"
                            title="Edit Cabang"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.nama)}
                            className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                            title="Hapus Cabang"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal Tambah/Edit Cabang */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
              <h3 className="text-title-lg font-bold text-on-surface">
                {editingCabang ? "Edit Cabang" : "Tambah Cabang"}
              </h3>
              <button onClick={handleCloseModal} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-md space-y-md">
              {errorMsg && (
                <div className="p-sm bg-error-container/20 border border-error/30 rounded-lg flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-[18px]">error</span>
                  <p className="text-label-sm text-error">{errorMsg}</p>
                </div>
              )}

              <div className="space-y-xs">
                <label className="text-label-sm font-medium text-on-surface-variant">Nama Cabang *</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Cabang Jakarta Pusat"
                  className="w-full h-12 px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all"
                />
              </div>

              <div className="space-y-xs">
                <label className="text-label-sm font-medium text-on-surface-variant">Alamat</label>
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Sudirman No. 1"
                  rows={3}
                  className="w-full p-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all resize-none"
                />
              </div>

              <div className="space-y-xs">
                <label className="text-label-sm font-medium text-on-surface-variant">Nomor Telepon</label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full h-12 px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all"
                />
              </div>

              <div className="pt-sm flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 h-12 rounded-xl text-label-md font-bold text-on-surface border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-primary text-on-primary rounded-xl text-label-md font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
