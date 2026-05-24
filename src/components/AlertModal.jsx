import { useEffect } from "react";

/**
 * AlertModal - Custom alert modal sesuai tema Material Design
 * @param {boolean} isOpen - Status modal terbuka/tertutup
 * @param {function} onClose - Callback saat modal ditutup
 * @param {string} title - Judul modal
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - Tipe alert: 'info', 'success', 'warning', 'error'
 * @param {string} confirmText - Text tombol konfirmasi (default: "OK")
 */
export default function AlertModal({ 
  isOpen, 
  onClose, 
  title = "Pemberitahuan", 
  message, 
  type = "info",
  confirmText = "OK"
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
    info: {
      bgColor: "bg-primary",
      textColor: "text-on-primary",
      icon: "info",
      iconBg: "bg-primary-container",
      iconColor: "text-primary"
    },
    success: {
      bgColor: "bg-secondary",
      textColor: "text-on-secondary",
      icon: "check_circle",
      iconBg: "bg-secondary-container",
      iconColor: "text-secondary"
    },
    warning: {
      bgColor: "bg-tertiary",
      textColor: "text-on-tertiary",
      icon: "warning",
      iconBg: "bg-tertiary-container",
      iconColor: "text-tertiary"
    },
    error: {
      bgColor: "bg-error",
      textColor: "text-on-error",
      icon: "error",
      iconBg: "bg-error-container",
      iconColor: "text-error"
    }
  };

  const config = typeConfig[type] || typeConfig.info;

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
          <div className={`${config.iconBg} rounded-xl p-md mb-md flex items-start gap-sm`}>
            <span className={`material-symbols-outlined ${config.iconColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {config.icon}
            </span>
            <p className="text-body-md text-on-surface flex-1">{message}</p>
          </div>

          {/* Button */}
          <button
            onClick={onClose}
            className={`w-full h-12 ${config.bgColor} ${config.textColor} rounded-xl text-label-md font-bold flex items-center justify-center gap-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>check</span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
