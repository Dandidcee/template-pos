import { useState } from "react";
import { createSnapToken, openSnapPayment, cancelTransaction } from "../services/midtransService";
import { rupiah } from "../config";

export default function MidtransPaymentModal({ 
  isOpen, 
  onClose, 
  transactionData,
  onSuccess,
  onPending,
  onError,
  onCancel // Tambah callback untuk cancel
}) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: "all",
      name: "Semua Metode",
      icon: "credit_card",
      description: "Tampilkan semua metode dari Midtrans",
      enabled_payments: null, // Biarkan Midtrans auto-detect
    },
    {
      id: "qris",
      name: "QRIS & E-Wallet",
      icon: "qr_code_scanner",
      description: "Hanya QRIS dan E-Wallet",
      enabled_payments: ["gopay", "shopeepay", "other_qris", "qris"],
    },
    {
      id: "bank_transfer",
      name: "Transfer Bank",
      icon: "account_balance",
      description: "Hanya Transfer Bank",
      enabled_payments: ["echannel", "bca_va", "bni_va", "bri_va", "permata_va", "other_va"],
    },
  ];

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const method = paymentMethods.find(m => m.id === selectedMethod);
      
      // Create Snap token
      const result = await createSnapToken({
        order_id: transactionData.order_number,
        gross_amount: transactionData.total_harga,
        customer_details: {
          first_name: transactionData.nama_kasir || "Customer",
          email: "customer@tokosenin.com",
          phone: "08123456789",
        },
        item_details: transactionData.items.map(item => ({
          id: item.id,
          price: Math.round(item.harga),
          quantity: item.qty,
          name: item.nama,
        })),
        // Jika method.enabled_payments null, backend tidak akan kirim enabled_payments
        // Midtrans akan load default dari dashboard
        enabled_payments: method.enabled_payments,
      });

      if (!result.success) {
        throw new Error(result.error || "Gagal membuat token pembayaran");
      }

      // Update order_number jika backend mengembalikan order_id baru (karena duplicate)
      const finalOrderId = result.order_id || transactionData.order_number;
      
      // Update transactionData dengan order_id yang final
      if (finalOrderId !== transactionData.order_number) {
        transactionData.order_number = finalOrderId;
      }

      // Open Snap payment popup
      let paymentCompleted = false; // Flag untuk track apakah payment selesai
      
      await openSnapPayment(result.token, {
        onSuccess: (result) => {
          console.log("Payment success:", result);
          paymentCompleted = true;
          onClose();
          if (onSuccess) onSuccess(result);
        },
        onPending: (result) => {
          console.log("Payment pending:", result);
          paymentCompleted = true;
          onClose();
          if (onPending) onPending(result);
        },
        onError: (result) => {
          console.error("Payment error:", result);
          paymentCompleted = true;
          setError("Pembayaran gagal. Silakan coba lagi.");
          if (onError) onError(result);
        },
        onClose: async () => {
          console.log("Payment popup closed");
          setLoading(false);
          
          // Jika popup ditutup tanpa payment selesai, berarti user cancel
          if (!paymentCompleted) {
            console.log("Payment cancelled by user, cancelling transaction in Midtrans...");
            
            // Cancel transaksi di Midtrans
            const cancelResult = await cancelTransaction(finalOrderId);
            if (cancelResult.success) {
              console.log("Transaction cancelled successfully in Midtrans");
            } else {
              console.error("Failed to cancel transaction in Midtrans:", cancelResult.error);
            }
            
            onClose(); // Close modal
            // Panggil onCancel untuk notify parent bahwa payment dibatalkan
            if (onCancel) onCancel();
          }
        },
      });
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Terjadi kesalahan saat memproses pembayaran");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-primary text-on-primary p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl sm:text-2xl">payment</span>
            <h2 className="text-title-sm sm:text-title-lg font-bold">Pilih Metode Pembayaran</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-on-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-md">
          
          {/* Transaction Info */}
          <div className="bg-primary-container/20 rounded-xl p-3 sm:p-md mb-3 sm:mb-4 border border-primary/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-label-xs sm:text-label-sm text-on-surface-variant">Order Number</span>
              <span className="text-label-sm sm:text-label-md font-bold text-on-surface">{transactionData.order_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-label-xs sm:text-label-sm text-on-surface-variant">Total Pembayaran</span>
              <span className="text-title-md sm:text-headline-sm font-bold text-primary">{rupiah(transactionData.total_harga)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2 mb-3 sm:mb-4">
            <label className="text-label-sm sm:text-label-md text-on-surface-variant block mb-2">Metode Pembayaran</label>
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={loading}
                className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                  selectedMethod === method.id
                    ? "border-primary bg-primary-container/20 shadow-sm"
                    : "border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 ${
                    selectedMethod === method.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                  }`}>
                    <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: selectedMethod === method.id ? "'FILL' 1" : "'FILL' 0" }}>
                      {method.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-label-md sm:text-title-sm font-bold mb-1 ${
                      selectedMethod === method.id ? "text-primary" : "text-on-surface"
                    }`}>
                      {method.name}
                    </p>
                    <p className="text-[11px] sm:text-label-xs leading-tight text-on-surface-variant line-clamp-2">
                      {method.description}
                    </p>
                  </div>
                  {selectedMethod === method.id && (
                    <span className="material-symbols-outlined text-primary text-xl sm:text-2xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error-container/20 border border-error/30 rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-lg sm:text-xl shrink-0">error</span>
              <p className="text-label-xs sm:text-label-sm text-error flex-1">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-surface-container-lowest rounded-xl p-3 mb-3 sm:mb-4 flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-lg sm:text-xl shrink-0">info</span>
            <p className="text-label-xs sm:text-label-sm leading-snug text-on-surface-variant">
              Anda akan diarahkan ke halaman pembayaran Midtrans. Ikuti instruksi untuk menyelesaikan pembayaran.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 sm:h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-sm sm:text-label-md font-bold hover:bg-surface-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              onClick={handlePayment}
              disabled={loading || !selectedMethod}
              className="flex-[2] h-11 sm:h-12 bg-primary text-on-primary rounded-xl text-label-sm sm:text-label-md font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg sm:text-xl">payment</span>
                  <span>Bayar Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
