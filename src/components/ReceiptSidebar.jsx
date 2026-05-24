import { rupiah } from "../config";

export default function ReceiptSidebar({
  cartItems,
  totalHarga,
  kembalian,
  jumlahBayar,
  submitted,
  orderNumber,
  namaKasir,
  namaToko,
  onPrint,
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-md border border-outline-variant/10 overflow-hidden sticky top-24 print:shadow-none print:border-none print:rounded-none">
      {/* Header */}
      <div className="p-md bg-surface-container border-b border-outline-variant/30 print:bg-transparent print:border-black print:pb-sm print:border-b-2 print:border-dashed">
        {/* Screen View */}
        <div className="flex justify-between items-center print:hidden">
          <h3 className="text-headline-md text-on-surface">Ringkasan</h3>
          <span className="px-sm py-xs bg-primary-container text-on-primary-container rounded-full text-label-sm">
            Order #{orderNumber}
          </span>
        </div>

        {/* Print View */}
        <div className="hidden print:flex flex-col items-center justify-center text-center text-black">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-1">{namaToko || "Toko Senin"}</h2>
          <p className="text-[12px] opacity-80">Jl. Jend. Sudirman No. 123, Jakarta Selatan</p>
          <p className="text-[12px] opacity-80 mb-3">Telp: 0812-3456-7890</p>
          <div className="w-full flex justify-between text-[11px] font-mono mt-2 pt-2 border-t border-dashed border-black">
            <div className="flex flex-col items-start">
              <span>Order: #{orderNumber}</span>
              <span>Kasir: {namaKasir || "Admin"}</span>
            </div>
            <div className="flex flex-col items-end">
              <span>{new Date().toLocaleDateString('id-ID')}</span>
              <span>{new Date().toLocaleTimeString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-md space-y-gutter min-h-[300px] print:min-h-0 print:text-black">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-on-surface-variant opacity-40 select-none print:hidden">
            <span className="material-symbols-outlined text-5xl mb-2">receipt_long</span>
            <p className="text-body-md">Belum ada produk dipilih</p>
          </div>
        ) : (
          <>
            {cartItems.map((item, i) => (
              <div key={i} className="flex justify-between items-start group">
                <div>
                  <p className="text-label-md text-on-surface print:text-black">{item.nama}</p>
                  <p className="text-label-sm text-on-surface-variant print:text-black">
                    Qty: {item.qty} x {rupiah(item.harga)}
                  </p>
                </div>
                <p className="text-label-md print:text-black">{rupiah(item.harga * item.qty)}</p>
              </div>
            ))}

            <div className="pt-gutter border-t border-dashed border-outline-variant/50 space-y-xs print:border-black">
              <div className="flex justify-between">
                <span className="text-body-md text-on-surface-variant print:text-black">Subtotal</span>
                <span className="text-body-md print:text-black">{rupiah(totalHarga)}</span>
              </div>
              <div className="flex justify-between text-secondary print:text-black">
                <span className="text-body-md">Pajak (0%)</span>
                <span className="text-body-md">Rp 0</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Total + Kembalian + Actions */}
      <div className="p-md bg-primary-container/10 border-t border-primary-container/30 print:bg-transparent print:border-black">
        <div className="flex justify-between items-center mb-md flex-wrap gap-2">
          <span className="text-headline-md text-on-surface print:text-black">Total Harga</span>
          <span className="text-display-total-mobile text-primary print:text-black">{rupiah(totalHarga)}</span>
        </div>

        {/* Kembalian — tampil jika sudah submit dan metode tunai */}
        {submitted && kembalian !== null && (
          <div className="p-md bg-surface-container-lowest rounded-xl border-2 border-secondary border-dashed mb-md field-enter print:border-black print:rounded-none">
            <div className="flex justify-between items-center">
              <span className="text-label-md text-on-surface-variant print:text-black">Kembalian</span>
              <span className="text-headline-lg text-secondary print:text-black">{rupiah(kembalian)}</span>
            </div>
            <p className="text-right text-label-sm text-on-surface-variant mt-xs print:text-black">
              Dibayar: {rupiah(jumlahBayar)}
            </p>
          </div>
        )}

        {/* Cetak & E-Receipt — tampil setelah submit */}
        {submitted ? (
          <div className="grid grid-cols-2 gap-sm print:hidden">
            <button
              type="button"
              onClick={onPrint || (() => window.print())}
              className="py-sm border-2 border-primary text-primary rounded-lg text-label-md flex items-center justify-center gap-xs hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined">print</span>
              Cetak Struk
            </button>
            <button
              type="button"
              className="py-sm bg-primary text-on-primary rounded-lg text-label-md flex items-center justify-center gap-xs shadow-sm hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>share</span>
              E-Receipt
            </button>
          </div>
        ) : (
          <p className="text-center text-label-sm text-on-surface-variant py-xs print:hidden">
            Klik <strong>"Proses Transaksi"</strong> untuk menyelesaikan
          </p>
        )}
      </div>
    </div>
  );
}
