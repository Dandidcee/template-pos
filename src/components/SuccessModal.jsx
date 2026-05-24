import { useEffect, useState } from "react";
import { rupiah } from "../config";

// Format payment type dari Midtrans jadi user-friendly
function formatPaymentType(type) {
  if (!type) return "QRIS";
  
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
    'cstore': 'Convenience Store',
    'akulaku': 'Akulaku',
    'kredivo': 'Kredivo',
  };
  
  return typeMap[type.toLowerCase()] || type.toUpperCase();
}

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  onPrint,
  lastTx,
  message = "Transaksi berhasil disimpan!" 
}) {
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto close setelah 10 detik jika user tidak melakukan apa-apa
      const timer = setTimeout(() => {
        if (!showReceipt) {
          onClose();
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, showReceipt]);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Cek apakah di mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Di mobile, tampilkan struk di modal
      setShowReceipt(true);
    } else {
      // Di desktop, gunakan window.print()
      onPrint();
    }
  };

  const handleShare = async () => {
    // Untuk mobile, gunakan Web Share API jika tersedia
    if (navigator.share && lastTx) {
      try {
        await navigator.share({
          title: `Struk ${lastTx.orderNumber}`,
          text: `Transaksi ${lastTx.orderNumber}\nTotal: ${rupiah(lastTx.totalHarga)}\nKasir: ${lastTx.namaKasir}`,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    }
  };

  if (showReceipt && lastTx) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="bg-primary text-on-primary p-4 flex items-center justify-between shrink-0">
            <h3 className="text-headline-sm font-bold">Struk Transaksi</h3>
            <button
              onClick={() => setShowReceipt(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-on-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Struk Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="bg-white p-6 rounded-lg shadow-sm font-mono text-sm">
              {/* Header Toko */}
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                <h1 className="text-lg font-bold uppercase tracking-wider">{lastTx.namaToko || "Toko Senin"}</h1>
                {lastTx.namaCabang && <p className="text-sm font-semibold mt-1">{lastTx.namaCabang}</p>}
                <p className="text-xs mt-2">Order: #{lastTx.orderNumber}</p>
              </div>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {lastTx.items?.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between font-semibold">
                      <span>{item.nama}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{item.qty} {item.satuan} × {rupiah(item.harga)}</span>
                      <span className="font-semibold text-gray-900">{rupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{rupiah(lastTx._payload?.subtotal || lastTx.totalHarga)}</span>
                </div>
                {(lastTx.diskonGlobalRp > 0) && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>🎉 {lastTx.diskonGlobalNama}</span>
                    <span>- {rupiah(lastTx.diskonGlobalRp)}</span>
                  </div>
                )}
                {(lastTx.diskonPoinRp > 0) && (
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>⭐ Tukar {lastTx.poinDipakai} Poin</span>
                    <span>- {rupiah(lastTx.diskonPoinRp)}</span>
                  </div>
                )}
                {(lastTx._payload?.pajak > 0) && (
                  <div className="flex justify-between">
                    <span>Pajak</span>
                    <span>{rupiah(lastTx._payload.pajak)}</span>
                  </div>
                )}
                {(lastTx._payload?.biaya_layanan > 0) && (
                  <div className="flex justify-between">
                    <span>Biaya Layanan</span>
                    <span>{rupiah(lastTx._payload.biaya_layanan)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-300 mt-3 pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span>{rupiah(lastTx.totalHarga)}</span>
                </div>
              </div>

              {/* Pelanggan & Poin */}
              {lastTx.pelanggan && (
                <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Member</span>
                    <span className="font-semibold">{lastTx.pelanggan.nama}</span>
                  </div>
                  {lastTx.poinDidapat > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>⭐ Poin Didapat</span>
                      <span className="font-bold">+{lastTx.poinDidapat} Poin</span>
                    </div>
                  )}
                  {lastTx.poinDipakai > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Poin Digunakan</span>
                      <span>- {lastTx.poinDipakai} Poin</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Sisa Poin</span>
                    <span className="font-semibold">{Number(lastTx.pelanggan.point) + (lastTx.poinDidapat || 0) - (lastTx.poinDipakai || 0)} Poin</span>
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div className="border-t border-dashed border-gray-300 mt-4 pt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Waktu</span>
                  <span>{lastTx.waktu}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode</span>
                  <span className="font-semibold">
                    {lastTx.metode === "tunai" 
                      ? "Tunai" 
                      : lastTx.midtransPaymentType 
                        ? formatPaymentType(lastTx.midtransPaymentType)
                        : lastTx.metode === "qr" 
                          ? "QRIS" 
                          : `Transfer - ${lastTx.namaBank}`
                    }
                  </span>
                </div>
                {lastTx.metode === "tunai" && (
                  <>
                    <div className="flex justify-between">
                      <span>Tunai</span>
                      <span>{rupiah(lastTx.jumlahBayar)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-secondary">
                      <span>Kembalian</span>
                      <span>{rupiah(lastTx.kembalian)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>Kasir</span>
                  <span>{lastTx.namaKasir}</span>
                </div>
                {lastTx.namaCabang && (
                  <div className="flex justify-between">
                    <span>Cabang</span>
                    <span>{lastTx.namaCabang}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center mt-4 pt-4 border-t border-dashed border-gray-300 text-xs text-gray-500">
                <p>— Terima kasih sudah berbelanja —</p>
                <p className="mt-1">Barang yang sudah dibeli tidak dapat dikembalikan</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 bg-white border-t border-gray-200 flex gap-2 shrink-0">
            <button
              onClick={() => {
                // Print struk dari modal
                onPrint();
              }}
              className="flex-1 py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span className="hidden sm:inline">Print</span>
            </button>
            {navigator.share && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 border-2 border-secondary text-secondary rounded-xl font-semibold hover:bg-secondary/5 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowReceipt(false);
                onClose();
              }}
              className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              Selesai
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
            <span className="material-symbols-outlined text-5xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h3 className="text-headline-md text-on-surface font-bold mb-2">Berhasil!</h3>
          <p className="text-body-md text-on-surface-variant mb-4">{message}</p>
          <p className="text-label-sm text-on-surface-variant/70">
            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
              ? "Lihat struk atau tutup untuk transaksi baru"
              : "Cetak struk atau tutup untuk transaksi baru"
            }
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-outline-variant text-on-surface rounded-xl font-semibold hover:bg-surface-container transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "receipt" : "print"}
            </span>
            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Lihat Struk" : "Cetak Struk"}
          </button>
        </div>
      </div>
    </div>
  );
}
