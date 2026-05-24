import { useState, useEffect } from "react";
import { rupiah } from "../config";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AlertModal from "./AlertModal";

export default function TutupShiftModal({ isOpen, onClose, onSuccess, kasir }) {
  const [step, setStep] = useState(1); // 1: Input, 2: Konfirmasi
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankList, setBankList] = useState([]);
  
  // Input saldo fisik
  const [tunaiInput, setTunaiInput] = useState("");
  const [qrisInput, setQrisInput] = useState("");
  const [transferInput, setTransferInput] = useState({}); // per bank
  const [catatan, setCatatan] = useState("");
  
  // Modal state
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  // Data transaksi shift
  const [shiftData, setShiftData] = useState({
    totalTransaksi: 0,
    totalPenjualan: 0,
    tunaiCount: 0,
    tunaiTotal: 0,
    qrCount: 0,
    qrTotal: 0,
    transferCount: 0,
    transferTotal: 0,
    transferPerBank: {}, // total per bank dari sistem
    shiftMulai: null
  });

  useEffect(() => {
    if (isOpen && kasir) {
      loadShiftData();
      loadBankList();
    }
  }, [isOpen, kasir]);

  const loadBankList = async () => {
    const { data } = await supabase
      .from("bank_account")
      .select("*")
      .eq("aktif", true)
      .order("nama_bank");
    if (data) {
      setBankList(data);
      const initialTransfer = {};
      data.forEach(bank => {
        initialTransfer[bank.nama_bank] = "";
      });
      setTransferInput(initialTransfer);
    }
  };

  const loadShiftData = async () => {
    setLoading(true);
    try {
      const shiftMulaiStr = localStorage.getItem(`shift_mulai_${kasir.id}`);
      const shiftMulai = shiftMulaiStr ? new Date(shiftMulaiStr) : new Date();

      let query = supabase
        .from("transaksi")
        .select("*")
        .gte("created_at", shiftMulai.toISOString());

      if (kasir.role === "kasir") {
        query = query.eq("nama_kasir", kasir.nama_lengkap);
      } else if (kasir.role === "admin" && kasir.cabang_id) {
        query = query.eq("cabang_id", kasir.cabang_id);
      }

      const { data: transaksi } = await query;

      if (transaksi) {
        const tunai = transaksi.filter(t => t.metode_pembayaran === "tunai");
        const qr = transaksi.filter(t => t.metode_pembayaran === "qr");
        const transfer = transaksi.filter(t => t.metode_pembayaran === "transfer");

        // Hitung total transfer per bank
        const transferPerBank = {};
        transfer.forEach(t => {
          const bank = t.nama_bank || "Unknown";
          if (!transferPerBank[bank]) {
            transferPerBank[bank] = 0;
          }
          transferPerBank[bank] += Number(t.total_harga || 0);
        });

        setShiftData({
          totalTransaksi: transaksi.length,
          totalPenjualan: transaksi.reduce((sum, t) => sum + Number(t.total_harga || 0), 0),
          tunaiCount: tunai.length,
          tunaiTotal: tunai.reduce((sum, t) => sum + Number(t.total_harga || 0), 0),
          qrCount: qr.length,
          qrTotal: qr.reduce((sum, t) => sum + Number(t.total_harga || 0), 0),
          transferCount: transfer.length,
          transferTotal: transfer.reduce((sum, t) => sum + Number(t.total_harga || 0), 0),
          transferPerBank,
          shiftMulai: shiftMulai
        });
      }
    } catch (err) {
      console.error("Error loading shift data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Format number dengan titik pemisah ribuan
  const formatRupiah = (value) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Handle input dengan format ribuan
  const handleInputChange = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\./g, "");
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setter(rawValue);
    }
  };

  // Hitung selisih
  const selisihTunai = (Number(tunaiInput) || 0) - shiftData.tunaiTotal;
  const selisihQris = (Number(qrisInput) || 0) - shiftData.qrTotal;
  
  const selisihTransfer = {};
  Object.keys(shiftData.transferPerBank).forEach(bank => {
    const input = Number(transferInput[bank]) || 0;
    const sistem = shiftData.transferPerBank[bank] || 0;
    selisihTransfer[bank] = input - sistem;
  });

  const totalSelisih = selisihTunai + selisihQris + Object.values(selisihTransfer).reduce((sum, val) => sum + val, 0);

  const handleNext = () => {
    // Validasi input
    if (shiftData.tunaiTotal > 0 && !tunaiInput) {
      setAlertModal({
        isOpen: true,
        title: "Input Tidak Lengkap",
        message: "Mohon input jumlah tunai fisik!",
        type: "warning"
      });
      return;
    }
    if (shiftData.qrTotal > 0 && !qrisInput) {
      setAlertModal({
        isOpen: true,
        title: "Input Tidak Lengkap",
        message: "Mohon input saldo QRIS!",
        type: "warning"
      });
      return;
    }
    
    // Cek transfer per bank
    for (const bank of Object.keys(shiftData.transferPerBank)) {
      if (shiftData.transferPerBank[bank] > 0 && !transferInput[bank]) {
        setAlertModal({
          isOpen: true,
          title: "Input Tidak Lengkap",
          message: `Mohon input saldo ${bank}!`,
          type: "warning"
        });
        return;
      }
    }

    setStep(2);
  };

  // Helper function untuk format selisih dengan tanda +/-
  const formatSelisih = (nilai) => {
    if (nilai === 0) return rupiah(0);
    if (nilai > 0) return `+${rupiah(nilai)}`;
    return rupiah(nilai); // Sudah ada tanda minus dari rupiah
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("LAPORAN TUTUP SHIFT", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Kasir: ${kasir.nama_lengkap}`, 14, 30);
    doc.text(`Cabang: ${kasir.cabang?.nama || "-"}`, 14, 35);
    doc.text(`Shift: ${shiftData.shiftMulai ? new Date(shiftData.shiftMulai).toLocaleString("id-ID") : "-"} - ${new Date().toLocaleString("id-ID")}`, 14, 40);
    
    // Ringkasan
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("RINGKASAN TRANSAKSI", 14, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [["Metode", "Jumlah", "Total Sistem", "Total Fisik", "Selisih"]],
      body: [
        ["Tunai", `${shiftData.tunaiCount}×`, rupiah(shiftData.tunaiTotal), rupiah(Number(tunaiInput) || 0), formatSelisih(selisihTunai)],
        ["QRIS", `${shiftData.qrCount}×`, rupiah(shiftData.qrTotal), rupiah(Number(qrisInput) || 0), formatSelisih(selisihQris)],
        ...Object.keys(shiftData.transferPerBank).map(bank => [
          `Transfer - ${bank}`,
          "-",
          rupiah(shiftData.transferPerBank[bank]),
          rupiah(Number(transferInput[bank]) || 0),
          formatSelisih(selisihTransfer[bank])
        ]),
        ["TOTAL", `${shiftData.totalTransaksi}×`, rupiah(shiftData.totalPenjualan), rupiah((Number(tunaiInput) || 0) + (Number(qrisInput) || 0) + Object.values(transferInput).reduce((sum, val) => sum + (Number(val) || 0), 0)), formatSelisih(totalSelisih)]
      ],
      theme: "grid",
      headStyles: { fillColor: [11, 87, 58], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" }
      }
    });
    
    // Catatan
    if (catatan) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Catatan:", 14, finalY);
      doc.setFont(undefined, "normal");
      doc.text(catatan, 14, finalY + 5, { maxWidth: 180 });
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, pageHeight - 10);
    
    // Download
    doc.save(`Shift-${kasir.nama_lengkap}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Simpan ke database
      const { error } = await supabase.from("shift_rekap").insert([{
        kasir_id: kasir.id,
        nama_kasir: kasir.nama_lengkap,
        cabang_id: kasir.cabang_id,
        nama_cabang: kasir.cabang?.nama || null,
        shift_mulai: shiftData.shiftMulai,
        shift_selesai: new Date(),
        total_transaksi: shiftData.totalTransaksi,
        total_penjualan: shiftData.totalPenjualan,
        tunai_count: shiftData.tunaiCount,
        tunai_total: shiftData.tunaiTotal,
        tunai_fisik: Number(tunaiInput) || 0,
        tunai_selisih: selisihTunai,
        qr_count: shiftData.qrCount,
        qr_total: shiftData.qrTotal,
        qr_fisik: Number(qrisInput) || 0,
        qr_selisih: selisihQris,
        transfer_count: shiftData.transferCount,
        transfer_total: shiftData.transferTotal,
        transfer_detail: Object.keys(shiftData.transferPerBank).map(bank => ({
          bank,
          sistem: shiftData.transferPerBank[bank],
          fisik: Number(transferInput[bank]) || 0,
          selisih: selisihTransfer[bank]
        })),
        total_selisih: totalSelisih,
        catatan: catatan || null
      }]);

      if (error) throw error;

      // Generate PDF
      generatePDF();

      // Success
      setAlertModal({
        isOpen: true,
        title: "Shift Berhasil Ditutup",
        message: "Shift berhasil ditutup! PDF laporan telah diunduh.",
        type: "success"
      });
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error("Error saving shift rekap:", err);
      setAlertModal({
        isOpen: true,
        title: "Gagal Menyimpan",
        message: `Gagal menyimpan rekap: ${err.message}`,
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-sm sm:max-w-2xl lg:max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary text-on-primary p-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-3xl">summarize</span>
            <div>
              <h2 className="text-headline-md font-bold">
                {step === 1 ? "Tutup Shift - Input Saldo" : "Konfirmasi Tutup Shift"}
              </h2>
              <p className="text-label-sm opacity-90">{kasir?.nama_lengkap}</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-md">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-body-md text-on-surface-variant">Memuat data shift...</p>
            </div>
          ) : step === 1 ? (
            // STEP 1: Input Saldo
            <div className="space-y-md">
              {/* Info Shift */}
              <div className="bg-secondary-container/20 rounded-xl p-md border-l-4 border-secondary">
                <p className="text-label-sm text-on-surface-variant">Durasi Shift</p>
                <p className="text-body-md text-on-surface font-bold">
                  {shiftData.shiftMulai && new Date(shiftData.shiftMulai).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })} - Sekarang
                </p>
                <p className="text-label-sm text-on-surface-variant mt-xs">
                  Total: {shiftData.totalTransaksi} transaksi • {rupiah(shiftData.totalPenjualan)}
                </p>
              </div>

              {/* Input Tunai */}
              {shiftData.tunaiTotal > 0 && (
                <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-sm">
                    <h3 className="text-headline-sm text-on-surface flex items-center gap-xs">
                      <span className="material-symbols-outlined text-primary">payments</span>
                      Tunai
                    </h3>
                    <span className="text-label-md text-on-surface-variant">
                      Sistem: {rupiah(shiftData.tunaiTotal)}
                    </span>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-md text-on-surface-variant block">
                      Jumlah Uang Tunai Fisik *
                    </label>
                    <div className="relative">
                      <span className="absolute left-md top-1/2 -translate-y-1/2 text-body-md text-on-surface-variant">Rp</span>
                      <input
                        type="text"
                        value={formatRupiah(tunaiInput)}
                        onChange={handleInputChange(setTunaiInput)}
                        placeholder="0"
                        className="h-12 w-full pl-12 pr-md rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
                      />
                    </div>
                    {tunaiInput && (
                      <p className={`text-label-sm font-bold ${selisihTunai === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                        Selisih: {formatSelisih(selisihTunai)} {selisihTunai > 0 ? "(Lebih)" : selisihTunai < 0 ? "(Kurang)" : "(Pas)"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Input QRIS */}
              {shiftData.qrTotal > 0 && (
                <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-sm">
                    <h3 className="text-headline-sm text-on-surface flex items-center gap-xs">
                      <span className="material-symbols-outlined text-primary">qr_code_2</span>
                      QRIS
                    </h3>
                    <span className="text-label-md text-on-surface-variant">
                      Sistem: {rupiah(shiftData.qrTotal)}
                    </span>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-md text-on-surface-variant block">
                      Saldo QRIS Saat Ini *
                    </label>
                    <div className="relative">
                      <span className="absolute left-md top-1/2 -translate-y-1/2 text-body-md text-on-surface-variant">Rp</span>
                      <input
                        type="text"
                        value={formatRupiah(qrisInput)}
                        onChange={handleInputChange(setQrisInput)}
                        placeholder="0"
                        className="h-12 w-full pl-12 pr-md rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
                      />
                    </div>
                    {qrisInput && (
                      <p className={`text-label-sm font-bold ${selisihQris === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                        Selisih: {formatSelisih(selisihQris)} {selisihQris > 0 ? "(Lebih)" : selisihQris < 0 ? "(Kurang)" : "(Pas)"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Input Transfer per Bank */}
              {Object.keys(shiftData.transferPerBank).length > 0 && (
                <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20">
                  <h3 className="text-headline-sm text-on-surface mb-sm flex items-center gap-xs">
                    <span className="material-symbols-outlined text-primary">account_balance</span>
                    Transfer Bank
                  </h3>
                  <div className="space-y-sm">
                    {Object.keys(shiftData.transferPerBank).map((bankName) => {
                      const sistemTotal = shiftData.transferPerBank[bankName];
                      const inputVal = transferInput[bankName];
                      const selisih = selisihTransfer[bankName];
                      
                      // Cari info bank lengkap dari bankList
                      const bankInfo = bankList.find(b => b.nama_bank === bankName);
                      const bankLabel = bankInfo 
                        ? `${bankInfo.nama_bank} - ${bankInfo.nomor_rekening} A/N ${bankInfo.atas_nama}`
                        : bankName;
                      
                      return (
                        <div key={bankName} className="bg-surface-container p-sm rounded-lg">
                          <div className="flex flex-col mb-xs">
                            <span className="text-label-md text-on-surface font-bold">{bankLabel}</span>
                            <span className="text-label-sm text-on-surface-variant mt-xs">
                              Sistem: {rupiah(sistemTotal)}
                            </span>
                          </div>
                          <div className="space-y-xs">
                            <div className="relative">
                              <span className="absolute left-sm top-1/2 -translate-y-1/2 text-label-md text-on-surface-variant">Rp</span>
                              <input
                                type="text"
                                value={formatRupiah(inputVal)}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/\./g, "");
                                  if (rawValue === "" || /^\d+$/.test(rawValue)) {
                                    setTransferInput(prev => ({ ...prev, [bankName]: rawValue }));
                                  }
                                }}
                                placeholder="0"
                                className="h-10 w-full pl-10 pr-sm rounded-lg border border-[#bfc9c1] bg-surface-container-lowest text-label-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                              />
                            </div>
                            {inputVal && (
                              <p className={`text-label-sm font-bold ${selisih === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                                Selisih: {formatSelisih(selisih)} {selisih > 0 ? "(Lebih)" : selisih < 0 ? "(Kurang)" : "(Pas)"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Catatan */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant block">Catatan (Opsional)</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan jika ada selisih atau hal penting lainnya..."
                  rows={3}
                  className="w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md p-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-sm pt-md border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-md font-bold hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 h-12 bg-secondary text-on-secondary rounded-xl text-label-md font-bold flex items-center justify-center gap-xs shadow-sm hover:shadow-md hover:opacity-90 transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_forward</span>
                  <span className="hidden sm:inline">Lanjut ke Konfirmasi</span>
                  <span className="sm:hidden">Lanjut</span>
                </button>
              </div>
            </div>
          ) : (
            // STEP 2: Konfirmasi
            <div className="space-y-md">
              {/* Warning */}
              <div className="bg-error-container/20 border-l-4 border-error rounded-r-xl p-md">
                <div className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-error text-2xl">warning</span>
                  <div>
                    <p className="text-headline-sm text-error font-bold mb-xs">Perhatian!</p>
                    <p className="text-body-md text-on-surface">
                      Setelah shift ditutup, Anda tidak bisa mengubah data apapun. 
                      PDF laporan akan otomatis diunduh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Ringkasan */}
              <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20">
                <h3 className="text-headline-sm text-on-surface mb-md font-bold">Ringkasan Tutup Shift</h3>
                
                <div className="space-y-sm">
                  {/* Tunai */}
                  {shiftData.tunaiTotal > 0 && (
                    <div className="flex justify-between items-center p-sm bg-surface-container rounded-lg">
                      <div>
                        <p className="text-label-md text-on-surface font-bold flex items-center gap-xs">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>payments</span>
                          Tunai
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          Sistem: {rupiah(shiftData.tunaiTotal)} • Fisik: {rupiah(Number(tunaiInput) || 0)}
                        </p>
                      </div>
                      <p className={`text-label-md font-bold ${selisihTunai === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                        {formatSelisih(selisihTunai)}
                      </p>
                    </div>
                  )}

                  {/* QRIS */}
                  {shiftData.qrTotal > 0 && (
                    <div className="flex justify-between items-center p-sm bg-surface-container rounded-lg">
                      <div>
                        <p className="text-label-md text-on-surface font-bold flex items-center gap-xs">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>qr_code_2</span>
                          QRIS
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          Sistem: {rupiah(shiftData.qrTotal)} • Fisik: {rupiah(Number(qrisInput) || 0)}
                        </p>
                      </div>
                      <p className={`text-label-md font-bold ${selisihQris === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                        {formatSelisih(selisihQris)}
                      </p>
                    </div>
                  )}

                  {/* Transfer per Bank */}
                  {Object.keys(shiftData.transferPerBank).map((bankName) => {
                    const sistemTotal = shiftData.transferPerBank[bankName];
                    const fisikTotal = Number(transferInput[bankName]) || 0;
                    const selisih = selisihTransfer[bankName];
                    
                    // Cari info bank lengkap dari bankList
                    const bankInfo = bankList.find(b => b.nama_bank === bankName);
                    const bankLabel = bankInfo 
                      ? `${bankInfo.nama_bank} - ${bankInfo.nomor_rekening} A/N ${bankInfo.atas_nama}`
                      : bankName;
                    
                    return (
                      <div key={bankName} className="flex justify-between items-start p-sm bg-surface-container rounded-lg">
                        <div className="flex-1">
                          <p className="text-label-md text-on-surface font-bold flex items-center gap-xs mb-xs">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>account_balance</span>
                            {bankLabel}
                          </p>
                          <p className="text-label-sm text-on-surface-variant">
                            Sistem: {rupiah(sistemTotal)} • Fisik: {rupiah(fisikTotal)}
                          </p>
                        </div>
                        <p className={`text-label-md font-bold ${selisih === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                          {formatSelisih(selisih)}
                        </p>
                      </div>
                    );
                  })}

                  {/* Total Selisih */}
                  <div className="flex justify-between items-center p-md bg-primary-container rounded-lg border-2 border-primary">
                    <p className="text-headline-sm text-on-primary-container font-bold">Total Selisih</p>
                    <p className={`text-headline-md font-bold ${totalSelisih === 0 ? "text-on-surface" : "text-[#FFC107]"}`}>
                      {formatSelisih(totalSelisih)}
                    </p>
                  </div>
                </div>

                {catatan && (
                  <div className="mt-md p-sm bg-surface-container rounded-lg">
                    <p className="text-label-sm text-on-surface-variant mb-xs">Catatan:</p>
                    <p className="text-body-md text-on-surface">{catatan}</p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-sm pt-md border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="flex-1 h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-md font-bold hover:bg-surface-container transition-all disabled:opacity-50 flex items-center justify-center gap-xs"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_back</span>
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 h-12 bg-error text-on-error rounded-xl text-label-md font-bold flex items-center justify-center gap-xs shadow-sm hover:shadow-md hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="w-5 h-5 border-2 border-on-error border-t-transparent rounded-full animate-spin"></span>
                      <span className="hidden sm:inline">Memproses...</span>
                      <span className="sm:hidden">Proses...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>lock</span>
                      <span className="hidden sm:inline">Ya, Tutup Shift</span>
                      <span className="sm:hidden">Tutup</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
