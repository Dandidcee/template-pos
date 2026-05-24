import { useEffect } from "react";

/**
 * ConfirmModal - Custom confirm modal sesuai tema Material Design
 * @param {boolean} isOpen - Status modal terbuka/tertutup
 * @param {function} onClose - Callback saat modal ditutup (cancel)
 * @param {function} onConfirm - Callback saat user konfirmasi
 * @param {string} title - Judul modal
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - Tipe confirm: 'danger', 'warning', 'info'
 * @param {string} confirmText - Text tombol konfirmasi (default: "Ya")
 * @param {string} cancelText - Text tombol batal (default: "Batal")
 */
export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Konfirmasi", 
  message, 
  type = "warning",
  confirmText = "Ya",
  cancelText = "Batal"
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      bgColor: "bg-error",
      textColor: "text-on-error",
      icon: "warning",
      iconBg: "bg-error-container/30",
      iconColor: "text-error",
      borderColor: "border-error"
    },
    warning: {
      bgColor: "bg-tertiary",
      textColor: "text-on-tertiary",
      icon: "help",
      iconBg: "bg-tertiary-container/30",
      iconColor: "text-tertiary",
      borderColor: "border-tertiary"
    },
    info: {
      bgColor: "bg-primary",
      textColor: "text-on-primary",
      icon: "info",
      iconBg: "bg-primary-container/30",
      iconColor: "text-primary",
      borderColor: "border-primary"
    }
  };

  const config = typeConfig[type] || typeConfig.warning;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`${config.bgColor} ${config.textColor} p-md flex items-center justify-between`}>
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-3xl">{config.icon}</span>
            <h2 className="text-headline-md font-bold">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-md">
          <div className={`${config.iconBg} border-l-4 ${config.borderColor} rounded-r-xl p-md mb-md flex items-start gap-sm`}>
            <span className={`material-symbols-outlined ${config.iconColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {config.icon}
            </span>
            <p className="text-body-md text-on-surface flex-1">{message}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-sm">
            <button
              onClick={onClose}
              className="flex-1 h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-md font-bold hover:bg-surface-container transition-all active:scale-95"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 h-12 ${config.bgColor} ${config.textColor} rounded-xl text-label-md font-bold flex items-center justify-center gap-xs shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>check</span>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
