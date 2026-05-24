import { rupiah } from "../config";
import { useEffect, useRef } from "react";

const QUICK_AMOUNTS = [20000, 50000, 100000];

export default function MobileCartModal({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  metode,
  onChangeMetode,
  jumlahUang,
  onChangeJumlahUang,
  namaBank,
  onChangeNamaBank,
  bankList,
  totalCart,
  bayar,
  kembalian,
  onSubmit,
  toast,
  onUangPas,
  formatRupiah,
  isAdmin,
  adminCabangId,
  adminKasirId,
  pembayaranTunaiAktif,
  pembayaranMidtransAktif,
  pembayaranQrisAktif,
  pembayaranTransferAktif,
  qrisImageUrl,
  modeCabangAktif
}) {
  const modalRef = useRef(null);
  const inputRef = useRef(null);

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

  // Scroll to input when focused (for keyboard visibility)
  const handleInputFocus = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300); // Delay to wait for keyboard animation
  };

  if (!isOpen) return null;

  const handleUangChange = (e) => {
    const rawValue = e.target.value.replace(/\./g, "");
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      onChangeJumlahUang(rawValue);
    }
  };

  const handleQuickAmount = (amount) => {
    onChangeJumlahUang(String(amount));
  };

  return (
    <div className="fixed inset-0 z-[100] xl:hidden flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Content - Centered */}
      <div 
        ref={modalRef}
        className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-primary text-on-primary p-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-3xl">shopping_cart</span>
            <div>
              <h2 className="text-headline-md font-bold">Keranjang Belanja</h2>
              <p className="text-label-sm opacity-90">{cart.length} item</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-on-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-md space-y-md" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Cart Items */}
          <div className="space-y-sm">
            {cart.map((item, idx) => {
              const isWeightOrVolume = ["kg", "gram", "liter", "ml"].includes(item.satuan);
              const displayQty = isWeightOrVolume && item.qty % 1 !== 0 
                ? item.qty.toFixed(3).replace(/\.?0+$/, '') 
                : item.qty;
              return (
                <div key={idx} className="bg-surface-container-low p-sm rounded-xl flex items-start gap-sm border border-outline-variant/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md font-semibold text-on-surface truncate">{item.nama}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {displayQty} {item.satuan} × {rupiah(item.harga)}
                    </p>
                  {item.catatan && (
                    <p className="text-label-sm text-primary mt-xs italic">"{item.catatan}"</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-xs">
                  <p className="text-label-md font-bold text-primary whitespace-nowrap">{rupiah(item.subtotal)}</p>
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-error/10 text-error hover:bg-error hover:text-on-error transition-all active:scale-95 border border-error/20"
                    title="Hapus item"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-sm">
            {(() => {
              const methods = [
                ...(pembayaranTunaiAktif ? [{ id: "tunai", label: "Tunai", icon: "payments" }] : []),
                ...(pembayaranMidtransAktif ? [{ id: "midtrans", label: "Midtrans", icon: "credit_card" }] : []),
                ...(pembayaranQrisAktif ? [{ id: "qris_manual", label: "QRIS", icon: "qr_code_scanner" }] : []),
                ...(pembayaranTransferAktif ? [{ id: "transfer", label: "Transfer", icon: "account_balance" }] : []),
              ];

              if (methods.length === 0) {
                return (
                  <div className="py-md text-center text-error bg-error-container/20 rounded-xl border border-error-container">
                    Metode pembayaran belum dikonfigurasi.
                  </div>
                );
              }

              const gridClass = methods.length === 1 ? "grid-cols-1" :
                                methods.length === 2 ? "grid-cols-2" :
                                methods.length === 3 ? "grid-cols-3" :
                                "grid-cols-2 md:grid-cols-4";

              return (
                <div className={`grid gap-sm ${gridClass}`}>
                  {methods.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onChangeMetode(id)}
                      className={`relative flex flex-col items-center justify-center gap-xs py-sm rounded-xl border-2 font-semibold transition-all duration-200 active:scale-95 ${
                        metode === id
                          ? "bg-primary border-primary text-on-primary shadow-md scale-[1.02]"
                          : "bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[24px]"
                        style={{ fontVariationSettings: metode === id ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {icon}
                      </span>
                      <span className="text-label-sm">{label}</span>
                      {metode === id && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-on-primary rounded-full"></span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Payment Input */}
          {metode === "tunai" && (
            <div className="space-y-sm animate-in fade-in slide-in-from-top-1 duration-200" ref={inputRef}>
              <label className="text-label-md text-on-surface-variant block font-semibold">Uang Dibayar</label>
              <div className="relative">
                <span className="absolute left-md top-1/2 -translate-y-1/2 text-body-md text-on-surface-variant font-medium">Rp</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={formatRupiah(jumlahUang)} 
                  onChange={handleUangChange}
                  onFocus={handleInputFocus}
                  className="h-12 w-full pl-12 pr-20 rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
                  placeholder="0" 
                />
                <button 
                  type="button" 
                  onClick={onUangPas} 
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-sm py-xs bg-primary-container text-on-primary-container text-label-sm rounded-lg font-bold hover:bg-primary hover:text-on-primary transition-colors"
                >
                  Pas
                </button>
              </div>
              {/* Quick Amounts */}
              <div className="flex gap-sm">
                {QUICK_AMOUNTS.map((amt) => (
                  <button 
                    key={amt} 
                    type="button" 
                    onClick={() => handleQuickAmount(amt)} 
                    className="flex-1 py-sm border border-outline-variant/30 bg-surface-container-low text-label-sm rounded-lg hover:bg-primary-container hover:text-on-primary-container hover:border-primary/50 transition-colors font-medium"
                  >
                    {rupiah(amt).replace("Rp ", "")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {metode === "transfer" && (
            <div className="space-y-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-label-md text-on-surface-variant block font-semibold">Bank Tujuan</label>
              <select 
                value={namaBank} 
                onChange={(e) => onChangeNamaBank(e.target.value)} 
                className="h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md px-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
              >
                {bankList.length === 0 ? (
                  <option value="">Loading...</option>
                ) : (
                  bankList.map((bank, idx) => (
                    <option key={idx} value={bank.nama_bank}>
                      {bank.nama_bank} - {bank.nomor_rekening} A/N {bank.atas_nama}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {metode === "qris_manual" && (
            <div className="space-y-sm animate-in fade-in slide-in-from-top-1 duration-200 text-center">
              <p className="text-label-md text-on-surface-variant">Silakan minta pelanggan scan QRIS berikut:</p>
              {qrisImageUrl ? (
                <div className="flex justify-center p-md bg-white rounded-xl mx-auto border border-outline-variant/30 max-w-[200px]">
                  <img src={qrisImageUrl} alt="QRIS" className="max-w-full h-auto" />
                </div>
              ) : (
                <div className="p-md bg-error-container text-on-error-container rounded-xl text-label-md border border-error/20">
                  Admin belum mengunggah gambar QRIS. Hubungi admin.
                </div>
              )}
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className={`p-sm rounded-lg text-label-md text-center animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"
            }`}>
              {toast.msg}
            </div>
          )}
        </div>

        {/* Footer - Total & Checkout */}
        <div className="p-md pb-6 bg-surface border-t-2 border-outline-variant/30 space-y-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
          {/* Totals */}
          <div className="space-y-xs">
            <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
              <span>Subtotal</span>
              <span className="font-semibold">{rupiah(totalCart)}</span>
            </div>
            {metode === "tunai" && (
              <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                <span>Uang Diterima</span>
                <span className={`font-semibold ${bayar < totalCart ? "text-error" : ""}`}>{rupiah(bayar)}</span>
              </div>
            )}
            <div className="border-t border-dashed border-outline-variant/40 pt-xs flex justify-between items-center">
              <span className="text-label-lg font-bold text-on-surface">TOTAL</span>
              <span className="text-headline-sm font-bold text-primary">
                {rupiah(totalCart)}
              </span>
            </div>
            {metode === "tunai" && kembalian !== null && kembalian >= 0 && (
              <div className="flex justify-between items-center bg-secondary-container/20 p-sm rounded-lg">
                <span className="text-label-md font-bold text-secondary">Kembalian</span>
                <span className="text-label-lg font-bold text-secondary">
                  {rupiah(kembalian)}
                </span>
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={() => {
              console.log('Mobile checkout clicked');
              // Close mobile modal first
              onClose();
              // Then trigger submit with synthetic event
              const syntheticEvent = {
                preventDefault: () => {},
              };
              onSubmit(syntheticEvent);
            }}
            disabled={
              cart.length === 0 || 
              (isAdmin && ((modeCabangAktif && !adminCabangId) || !adminKasirId)) ||
              (metode === "tunai" && (!jumlahUang || bayar < totalCart)) ||
              (metode === "transfer" && !namaBank)
            }
            className={`w-full h-12 rounded-xl text-label-md font-bold flex items-center justify-center gap-xs shadow-lg transition-all ${
              cart.length === 0 || 
              (isAdmin && ((modeCabangAktif && !adminCabangId) || !adminKasirId)) ||
              (metode === "tunai" && (!jumlahUang || bayar < totalCart)) ||
              (metode === "transfer" && !namaBank)
                ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-70"
                : "bg-primary text-on-primary hover:shadow-xl hover:opacity-90 active:scale-95"
            }`}
          >
            {(isAdmin && ((modeCabangAktif && !adminCabangId) || !adminKasirId)) ? (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                Pilih {modeCabangAktif ? "Cabang & " : ""}Kasir
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Proses Pembayaran
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
