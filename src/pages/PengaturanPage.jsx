import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchPengaturan, updatePengaturan, updatePengaturanRahasia } from "../services/productService";

export default function PengaturanPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [biayaLayanan, setBiayaLayanan] = useState(0);
  const [pajakPersen, setPajakPersen] = useState(0);
  const [namaToko, setNamaToko] = useState("Toko Senin");
  const [modeCabangAktif, setModeCabangAktif] = useState(true);
  
  // Member & Discount
  const [modeMemberAktif, setModeMemberAktif] = useState(false);
  const [memberRasioDapatPoin, setMemberRasioDapatPoin] = useState(1000);
  const [memberBisaTukarDiskon, setMemberBisaTukarDiskon] = useState(false);
  const [memberRasioTukarPoin, setMemberRasioTukarPoin] = useState(100);
  const [diskonGlobalAktif, setDiskonGlobalAktif] = useState(false);
  const [diskonGlobalNama, setDiskonGlobalNama] = useState("Diskon Spesial");
  const [diskonGlobalPersen, setDiskonGlobalPersen] = useState(0);
  
  // Midtrans Secrets (Write Only)
  const [midtransServerKey, setMidtransServerKey] = useState("");
  const midtransIsProduction = true; // Hardcoded to true for template
  
  // Payment Method States
  const [pembayaranTunaiAktif, setPembayaranTunaiAktif] = useState(true);
  const [pembayaranMidtransAktif, setPembayaranMidtransAktif] = useState(false);
  const [pembayaranQrisAktif, setPembayaranQrisAktif] = useState(false);
  const [pembayaranTransferAktif, setPembayaranTransferAktif] = useState(false);
  const [qrisImageUrl, setQrisImageUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState({ text: "", type: "" });

  useEffect(() => {
    async function load() {
      const data = await fetchPengaturan();
      setBiayaLayanan(data.biaya_layanan || 0);
      setPajakPersen(data.pajak_persen || 0);
      setPembayaranTunaiAktif(data.pembayaran_tunai_aktif ?? true);
      setPembayaranMidtransAktif(data.pembayaran_midtrans_aktif ?? false);
      setPembayaranQrisAktif(data.pembayaran_qris_aktif ?? false);
      setPembayaranTransferAktif(data.pembayaran_transfer_aktif ?? false);
      setQrisImageUrl(data.qris_image_url || "");
      setNamaToko(data.nama_toko || "Toko Senin");
      setModeCabangAktif(data.mode_cabang_aktif ?? true);
      setModeMemberAktif(data.mode_member_aktif ?? false);
      setMemberRasioDapatPoin(data.member_rasio_dapat_poin ?? 1000);
      setMemberBisaTukarDiskon(data.member_bisa_tukar_diskon ?? false);
      setMemberRasioTukarPoin(data.member_rasio_tukar_poin ?? 100);
      setDiskonGlobalAktif(data.diskon_global_aktif ?? false);
      setDiskonGlobalNama(data.diskon_global_nama || "Diskon Spesial");
      setDiskonGlobalPersen(data.diskon_global_persen ?? 0);
    }
    load();
  }, []);

  const handleSavePengaturan = async () => {
    setSaving(true);
    setPesan({ text: "", type: "" });
    try {
      await updatePengaturan({
        biaya_layanan: Number(biayaLayanan),
        pajak_persen: Number(pajakPersen),
        pembayaran_tunai_aktif: pembayaranTunaiAktif,
        pembayaran_midtrans_aktif: pembayaranMidtransAktif,
        pembayaran_qris_aktif: pembayaranQrisAktif,
        pembayaran_transfer_aktif: pembayaranTransferAktif,
        qris_image_url: qrisImageUrl,
        mode_cabang_aktif: modeCabangAktif,
        nama_toko: namaToko,
        mode_member_aktif: modeMemberAktif,
        member_rasio_dapat_poin: Number(memberRasioDapatPoin),
        member_bisa_tukar_diskon: memberBisaTukarDiskon,
        member_rasio_tukar_poin: Number(memberRasioTukarPoin),
        diskon_global_aktif: diskonGlobalAktif,
        diskon_global_nama: diskonGlobalNama,
        diskon_global_persen: Number(diskonGlobalPersen)
      });
      
      // Simpan Midtrans Server Key hanya jika diisi (Write Only)
      if (midtransServerKey) {
        await updatePengaturanRahasia(midtransServerKey, midtransIsProduction);
        setMidtransServerKey(""); // Kosongkan kembali demi keamanan
      }
      
      setPesan({ text: "Pengaturan berhasil disimpan!", type: "success" });
      setTimeout(() => setPesan({ text: "", type: "" }), 3000);
    } catch (err) {
      setPesan({ text: `Gagal menyimpan: ${err.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleQrisUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setPesan({ text: "Gagal: Ukuran gambar maksimal 2MB.", type: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrisImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const ToggleSwitch = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between p-sm border border-outline-variant/30 rounded-xl hover:bg-surface-container-lowest transition-colors">
      <div>
        <p className="text-label-md text-on-surface font-semibold">{label}</p>
        {description && <p className="text-label-sm text-on-surface-variant">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  );

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-4 md:px-margin-page min-h-screen">
      <section className="mb-lg">
        <h2 className="text-headline-lg text-on-surface mb-xs">Pengaturan</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl mb-lg max-w-4xl">
          <p className="text-body-lg text-primary">Konfigurasi koneksi dan preferensi aplikasi.</p>
        </div>

        <div className="space-y-gutter">

          {/* Form Pengaturan (Hanya Admin) */}
          {isAdmin && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md">
              <h3 className="text-headline-md text-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined">settings</span>
                Pengaturan Global Toko
              </h3>
              <div className="space-y-md text-body-md text-on-surface-variant">
                <p className="text-label-sm text-on-surface-variant">
                  Pengaturan ini akan diterapkan secara otomatis pada semua transaksi di semua cabang.
                </p>

                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant font-medium block">
                    Nama Toko (Akan dicetak di Struk)
                  </label>
                  <input
                    type="text"
                    value={namaToko}
                    onChange={(e) => setNamaToko(e.target.value)}
                    placeholder="Contoh: Toko Senin"
                    className="h-12 w-full px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div className="space-y-xs">
                    <label className="text-label-sm text-on-surface-variant font-medium block">
                      Biaya Layanan (Nominal Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={biayaLayanan}
                        onChange={(e) => setBiayaLayanan(e.target.value)}
                        className="h-12 w-full pl-10 pr-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-xs">
                    <label className="text-label-sm text-on-surface-variant font-medium block">
                      Pajak (Persentase %)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={pajakPersen}
                        onChange={(e) => setPajakPersen(e.target.value)}
                        className="h-12 w-full pl-sm pr-10 rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all"
                      />
                      <span className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant">%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-sm border-t border-outline-variant/20 mt-md">
                  <ToggleSwitch
                    label="Mode Multi-Cabang"
                    description="Aktifkan jika warung/toko Anda memiliki banyak cabang. Jika dimatikan, opsi pilihan cabang di kasir akan disembunyikan."
                    checked={modeCabangAktif}
                    onChange={(e) => setModeCabangAktif(e.target.checked)}
                  />
                </div>

                <div className="flex items-center gap-sm pt-sm">
                  <button
                    onClick={handleSavePengaturan}
                    disabled={saving}
                    className="py-2.5 px-6 bg-primary text-on-primary rounded-xl text-label-md font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    )}
                    {saving ? "Menyimpan..." : "Simpan Pengaturan"}
                  </button>
                  
                  {pesan.text && (
                    <span className={`text-label-md ${pesan.type === 'success' ? 'text-primary' : 'text-error'}`}>
                      {pesan.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PENGATURAN MEMBER & DISKON */}
          {isAdmin && (
            <div className="bg-surface-container-lowest p-md rounded-2xl shadow-sm border border-outline-variant/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
              <div className="flex items-center gap-sm mb-md pb-xs border-b border-outline-variant/20">
                <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">loyalty</span>
                </div>
                <div>
                  <h3 className="text-title-md font-bold text-on-surface">Member & Diskon</h3>
                  <p className="text-label-sm text-on-surface-variant">Atur poin loyalitas dan diskon global</p>
                </div>
              </div>

              <div className="space-y-md">

                {/* Mode Member */}
                <div className="p-sm bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-md">
                  <ToggleSwitch
                    label="Mode Member (Loyalitas)"
                    description="Aktifkan untuk memberikan Poin setiap kali pelanggan berbelanja. Menu Pelanggan akan muncul di sidebar."
                    checked={modeMemberAktif}
                    onChange={(e) => setModeMemberAktif(e.target.checked)}
                  />

                  {modeMemberAktif && (
                    <div className="space-y-sm pt-sm border-t border-outline-variant/20">
                      <div className="space-y-xs">
                        <label className="text-label-sm font-medium text-on-surface-variant">Rasio Dapat Poin</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body-md text-on-surface">Belanja Rp</span>
                          <input
                            type="number"
                            min="1"
                            value={memberRasioDapatPoin}
                            onChange={(e) => setMemberRasioDapatPoin(e.target.value)}
                            className="h-10 w-28 px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center"
                          />
                          <span className="text-body-md text-on-surface">= 1 Poin</span>
                        </div>
                        <p className="text-label-sm text-on-surface-variant">Contoh: Belanja Rp 10.000 = 1 Poin</p>
                      </div>

                      <div className="pt-sm border-t border-outline-variant/20">
                        <ToggleSwitch
                          label="Izinkan Tukar Poin Jadi Diskon"
                          description="Pelanggan dapat memotong harga menggunakan poin mereka saat membayar di kasir."
                          checked={memberBisaTukarDiskon}
                          onChange={(e) => setMemberBisaTukarDiskon(e.target.checked)}
                        />
                      </div>

                      {memberBisaTukarDiskon && (
                        <div className="space-y-xs pt-sm border-t border-outline-variant/20">
                          <label className="text-label-sm font-medium text-on-surface-variant">Nilai Tukar Poin</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-md text-on-surface">1 Poin = Diskon Rp</span>
                            <input
                              type="number"
                              min="1"
                              value={memberRasioTukarPoin}
                              onChange={(e) => setMemberRasioTukarPoin(e.target.value)}
                              className="h-10 w-28 px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center"
                            />
                          </div>
                          <p className="text-label-sm text-on-surface-variant">Contoh: 1 Poin = potongan Rp 100</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Diskon Global */}
                <div className="p-sm bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-md">
                  <ToggleSwitch
                    label="Diskon Global Aktif"
                    description="Potongan harga otomatis berlaku untuk semua transaksi di Kasir saat diaktifkan."
                    checked={diskonGlobalAktif}
                    onChange={(e) => setDiskonGlobalAktif(e.target.checked)}
                  />

                  {diskonGlobalAktif && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm border-t border-outline-variant/20">
                      <div className="space-y-xs">
                        <label className="text-label-sm font-medium text-on-surface-variant">Nama Diskon</label>
                        <input
                          type="text"
                          value={diskonGlobalNama}
                          onChange={(e) => setDiskonGlobalNama(e.target.value)}
                          placeholder="Contoh: Diskon Kemerdekaan"
                          className="w-full h-10 px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                        />
                      </div>
                      <div className="space-y-xs">
                        <label className="text-label-sm font-medium text-on-surface-variant">Persentase Diskon (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={diskonGlobalPersen}
                          onChange={(e) => setDiskonGlobalPersen(e.target.value)}
                          className="w-full h-10 px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-sm pt-sm border-t border-outline-variant/10 mt-xs">
                  <button
                    onClick={handleSavePengaturan}
                    disabled={saving}
                    className="py-2.5 px-6 bg-secondary text-on-secondary rounded-xl text-label-md font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    )}
                    {saving ? "Menyimpan..." : "Simpan Member & Diskon"}
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Pengaturan Pembayaran (Hanya Admin) */}
          {isAdmin && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md">
              <h3 className="text-headline-md text-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined">payments</span>
                Metode Pembayaran
              </h3>
              <div className="space-y-md text-body-md text-on-surface-variant">
                <p className="text-label-sm text-on-surface-variant">
                  Aktifkan atau nonaktifkan metode pembayaran yang tersedia di layar kasir.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <ToggleSwitch
                    label="Tunai"
                    description="Pembayaran menggunakan uang tunai (cash)."
                    checked={pembayaranTunaiAktif}
                    onChange={(e) => setPembayaranTunaiAktif(e.target.checked)}
                  />
                  <ToggleSwitch
                    label="Midtrans (Gateway)"
                    description="Integrasi Midtrans QRIS/VA otomatis."
                    checked={pembayaranMidtransAktif}
                    onChange={(e) => setPembayaranMidtransAktif(e.target.checked)}
                  />
                  <ToggleSwitch
                    label="Transfer Bank"
                    description="Manual transfer ke rekening bank."
                    checked={pembayaranTransferAktif}
                    onChange={(e) => setPembayaranTransferAktif(e.target.checked)}
                  />
                  <ToggleSwitch
                    label="QRIS (Manual)"
                    description="Upload satu QR Code untuk semua cabang."
                    checked={pembayaranQrisAktif}
                    onChange={(e) => setPembayaranQrisAktif(e.target.checked)}
                  />
                </div>

                {/* Upload QRIS Section */}
                {pembayaranQrisAktif && (
                  <div className="mt-md p-md border border-primary/30 bg-primary-container/10 rounded-xl space-y-sm animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-label-md font-bold text-on-surface flex items-center gap-xs">
                      <span className="material-symbols-outlined">qr_code_scanner</span>
                      Gambar QRIS Toko
                    </h4>
                    <p className="text-label-sm text-on-surface-variant">
                      Unggah gambar QRIS. Gambar ini akan ditampilkan di layar kasir ketika memilih metode pembayaran QRIS. (Maks 2MB).
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-start gap-md pt-sm">
                      <div className="w-full sm:w-auto">
                        <label className="cursor-pointer inline-flex items-center gap-xs px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 rounded-lg text-label-md font-medium transition-colors">
                          <span className="material-symbols-outlined text-[18px]">upload</span>
                          Pilih Gambar QRIS
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleQrisUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                      
                      {qrisImageUrl && (
                        <div className="border border-outline-variant/30 p-2 rounded-lg bg-surface-container-lowest shadow-sm max-w-[200px]">
                          <img src={qrisImageUrl} alt="QRIS Preview" className="w-full h-auto rounded" />
                          <button 
                            onClick={() => setQrisImageUrl("")}
                            className="mt-2 w-full py-1 text-error hover:bg-error-container/20 rounded text-label-sm font-medium transition-colors"
                          >
                            Hapus Gambar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Midtrans Secret Configuration */}
                {pembayaranMidtransAktif && (
                  <div className="mt-md p-md border border-primary/30 bg-primary-container/10 rounded-xl space-y-sm animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-label-md font-bold text-on-surface flex items-center gap-xs">
                      <span className="material-symbols-outlined">security</span>
                      Konfigurasi Midtrans
                    </h4>
                    <p className="text-label-sm text-on-surface-variant">
                      Kredensial Midtrans bersifat <strong>sangat rahasia</strong>. Kunci tidak akan ditampilkan kembali setelah disimpan demi keamanan.
                    </p>
                    
                    <div className="bg-surface-container-low p-sm rounded-lg border border-outline-variant/30 flex flex-col gap-1 mt-sm">
                      <span className="text-label-sm font-semibold text-primary">Notification URL (Webhook)</span>
                      <p className="text-label-sm text-on-surface-variant mb-1">Copy URL ini dan paste ke menu Settings &gt; Configuration &gt; Notification URL di Dashboard Midtrans Anda:</p>
                      <code className="text-body-sm bg-surface-container-highest p-2 rounded text-on-surface break-all select-all">
                        {import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook
                      </code>
                    </div>
                    
                    <div className="space-y-md pt-sm">
                      <div className="space-y-xs">
                        <label className="text-label-sm text-on-surface-variant font-medium block">
                          Midtrans Server Key (Ganti jika perlu)
                        </label>
                        <input
                          type="password"
                          value={midtransServerKey}
                          onChange={(e) => setMidtransServerKey(e.target.value)}
                          placeholder="Ketik Server Key baru untuk menyimpan..."
                          className="h-12 w-full px-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-sm pt-sm border-t border-outline-variant/10 mt-md">
                  <button
                    onClick={handleSavePengaturan}
                    disabled={saving}
                    className="py-2.5 px-6 bg-primary text-on-primary rounded-xl text-label-md font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    )}
                    {saving ? "Menyimpan..." : "Simpan Pengaturan"}
                  </button>
                  {pesan.text && (
                    <span className={`text-label-md ${pesan.type === 'success' ? 'text-primary' : 'text-error'}`}>
                      {pesan.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Info Versi */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md">
            <h3 className="text-headline-md text-primary mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined">info</span>
              Informasi Aplikasi
            </h3>
            <div className="space-y-xs text-body-md">
              {[
                ["Nama Aplikasi","Kasir Toko Senin"],
                ["Versi","1.0.0"],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between border-b border-outline-variant/10 py-xs">
                  <span className="text-on-surface-variant">{k}</span>
                  <span className="text-on-surface font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
