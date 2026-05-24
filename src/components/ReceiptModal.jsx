import { rupiah } from "../config";

export default function ReceiptModal({
  isOpen,
  onClose,
  onConfirm,
  submitting = false,
  transaksi,
}) {
  if (!isOpen || !transaksi) return null;

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-print-area");
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const metodeLabel =
    transaksi.metode === "tunai" ? "Tunai" :
    transaksi.metode === "qr"   ? (transaksi.midtransPaymentType ? formatPaymentType(transaksi.midtransPaymentType) : "Midtrans")  :
    transaksi.metode === "transfer" ? `Transfer — ${transaksi.namaBank || ""}` :
    transaksi.metode;
  
  // Format payment type dari Midtrans
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
    };
    return typeMap[type.toLowerCase()] || type.toUpperCase();
  }

  const namaToko = transaksi.namaToko || "Toko Senin";

  return (
    <>
      {/* ── PRINT AREA (hidden on screen) ── */}
      <div id="receipt-print-area" style={{ display: "none" }}>
        <div style={{ 
          fontFamily: "'Courier New', monospace", 
          fontSize: "12px", 
          color: "#000",
          padding: "20px",
          maxWidth: "300px",
          margin: "0 auto"
        }}>
          <div style={{ 
            textAlign: "center", 
            borderBottom: "2px dashed #000", 
            paddingBottom: "12px", 
            marginBottom: "12px" 
          }}>
            <h1 style={{ 
              fontSize: "18px", 
              fontWeight: "bold", 
              textTransform: "uppercase", 
              letterSpacing: "2px", 
              margin: "0 0 4px" 
            }}>{namaToko.toUpperCase()}</h1>
            {transaksi.namaCabang && <p style={{ fontWeight: "bold", margin: "2px 0" }}>{transaksi.namaCabang}</p>}
            <p style={{ marginTop: "6px", margin: "6px 0 2px" }}>Order: #{transaksi.orderNumber}</p>
          </div>

          {transaksi.items?.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                <span style={{ fontWeight: "bold" }}>{item.nama}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                <span>{item.qty} {item.satuan} × Rp {item.harga?.toLocaleString("id-ID")}</span>
                <span>{rupiah(item.subtotal)}</span>
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
            <span>Subtotal</span>
            <span>{rupiah(transaksi._payload?.subtotal || transaksi.totalHarga)}</span>
          </div>
          {(transaksi._payload?.pajak > 0) && (
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Pajak</span>
              <span>{rupiah(transaksi._payload.pajak)}</span>
            </div>
          )}
          {(transaksi._payload?.biaya_layanan > 0) && (
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Biaya Layanan</span>
              <span>{rupiah(transaksi._payload.biaya_layanan)}</span>
            </div>
          )}
          <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }}></div>
          <div style={{ 
            fontSize: "16px", 
            fontWeight: "bold", 
            display: "flex", 
            justifyContent: "space-between", 
            margin: "8px 0" 
          }}>
            <span>TOTAL</span>
            <span>{rupiah(transaksi.totalHarga)}</span>
          </div>

          <div style={{ 
            fontSize: "11px", 
            borderTop: "1px dashed #000", 
            paddingTop: "10px", 
            marginTop: "10px" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Waktu</span>
              <span>{transaksi.waktu}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Metode</span>
              <span>{metodeLabel}</span>
            </div>
            {transaksi.metode === "tunai" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span>Tunai</span>
                  <span>{rupiah(transaksi.jumlahBayar)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span>Kembalian</span>
                  <span>{rupiah(transaksi.kembalian)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Kasir</span>
              <span>{transaksi.namaKasir}</span>
            </div>
            {transaksi.pelanggan && (
              <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                <span>Pelanggan</span>
                <span>{transaksi.pelanggan.nama}</span>
              </div>
            )}
            {transaksi.namaCabang && (
              <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                <span>Cabang</span>
                <span>{transaksi.namaCabang}</span>
              </div>
            )}
          </div>

          <div style={{ 
            textAlign: "center", 
            marginTop: "16px", 
            fontSize: "11px", 
            opacity: "0.7" 
          }}>
            <p style={{ margin: "4px 0" }}>— Terima kasih sudah berbelanja —</p>
            <p style={{ margin: "4px 0" }}>Barang yang sudah dibeli tidak dapat dikembalikan</p>
          </div>
        </div>
      </div>

      {/* ── MODAL (screen only) ── */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header Hijau */}
          <div className="bg-[#0b573a] text-white px-4 py-4 relative shrink-0">
            <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <h2 className="text-headline-sm font-bold">Detail Transaksi</h2>
            <p className="text-label-sm text-white/80 mt-0.5">#{transaksi.orderNumber} • {transaksi.namaKasir}</p>
          </div>

          {/* Body Scrollable */}
          <div className="overflow-y-auto flex-1 bg-[#f8f9fa]">
            <div className="p-4">

              {/* Info Toko */}
              <div className="text-center mb-4">
                <p className="font-bold text-gray-800 text-body-md">{namaToko.toUpperCase()}</p>
                {transaksi.namaCabang && <p className="text-label-md font-semibold text-[#0b573a]">{transaksi.namaCabang}</p>}
              </div>

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Daftar Barang */}
              <div className="space-y-2 mb-3">
                {transaksi.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-label-md">
                    <div>
                      <p className="font-semibold text-gray-800">{item.nama} <span className="text-gray-500 font-normal">×{item.qty}</span></p>
                      <p className="text-gray-500 text-label-sm mt-0.5">Rp {item.harga?.toLocaleString("id-ID")} / {item.satuan || "pcs"}</p>
                      {item.catatan && <p className="text-[#0b573a] italic text-label-sm mt-0.5">"{item.catatan}"</p>}
                    </div>
                    <p className="font-bold text-gray-800 shrink-0 ml-3">{rupiah(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Subtotal, Pajak & Biaya Layanan */}
              <div className="space-y-1 text-label-md text-gray-600 mb-4">
                <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(transaksi._payload?.subtotal || transaksi.totalHarga)}</span></div>
                {(transaksi._payload?.pajak > 0) && (
                  <div className="flex justify-between"><span>Pajak</span><span>{rupiah(transaksi._payload.pajak)}</span></div>
                )}
                {(transaksi._payload?.biaya_layanan > 0) && (
                  <div className="flex justify-between"><span>Biaya Layanan</span><span>{rupiah(transaksi._payload.biaya_layanan)}</span></div>
                )}
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center mb-4 py-2 border-y border-gray-200">
                <span className="text-title-sm font-bold text-[#0b573a]">TOTAL</span>
                <span className="text-title-lg font-bold text-[#0b573a]">{rupiah(transaksi.totalHarga)}</span>
              </div>

              {/* Info Pembayaran */}
              <div className="bg-gray-100 rounded-xl p-3 text-label-sm text-gray-600 space-y-1.5">
                <div className="flex justify-between"><span>Waktu Pembayaran</span><span>{transaksi.waktu}</span></div>
                <div className="flex justify-between"><span>Metode</span><span className="font-medium">{metodeLabel}</span></div>
                {transaksi.metode === "tunai" && (<>
                  <div className="flex justify-between"><span>Tunai</span><span>{rupiah(transaksi.jumlahBayar)}</span></div>
                  <div className="flex justify-between font-semibold text-[#0b573a]"><span>Kembalian</span><span>{rupiah(transaksi.kembalian)}</span></div>
                </>)}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5"><span>Kasir</span><span>{transaksi.namaKasir}</span></div>
                {transaksi.pelanggan && <div className="flex justify-between"><span>Pelanggan</span><span className="font-medium text-[#0b573a]">{transaksi.pelanggan.nama}</span></div>}
                {transaksi.namaCabang && <div className="flex justify-between"><span>Cabang</span><span className="font-medium">{transaksi.namaCabang}</span></div>}
              </div>
            </div>
          </div>

          {/* Action Buttons - Responsive untuk Mobile */}
          <div className="p-3 bg-white flex flex-col sm:flex-row gap-2 border-t border-gray-100 shrink-0">
            <button onClick={onClose} disabled={submitting}
              className="w-full sm:flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-label-md font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50 order-3 sm:order-1">
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span className="hidden sm:inline">Batal</span>
              <span className="sm:hidden">Tutup</span>
            </button>
            <button onClick={handlePrint} disabled={submitting}
              className="w-full sm:flex-1 py-2.5 border border-[#0b573a] text-[#0b573a] rounded-xl text-label-md font-semibold flex items-center justify-center gap-2 hover:bg-[#0b573a]/5 transition-colors disabled:opacity-50 order-2 sm:order-2">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Cetak
            </button>
            <button onClick={onConfirm} disabled={submitting}
              className="w-full sm:flex-[2] py-2.5 bg-[#0b573a] text-white rounded-xl text-label-md font-bold flex items-center justify-center gap-2 hover:bg-[#08422c] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed order-1 sm:order-3">
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Konfirmasi Transaksi</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
